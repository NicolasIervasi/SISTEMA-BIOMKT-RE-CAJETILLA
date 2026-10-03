// Tests del cliente de seguimiento en vivo: GPS falso, servidor falso y almacenamiento en memoria.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../js/store.js';
import {
  FLUSH_MS, MAX_QUEUE, ONLINE_MS, POLL_HIDDEN_MS, POLL_IDLE_MS, POLL_MS, SHARE_MAX_MS, backoff, clearTracks, createSharer, createTracker, disableLive, enableLive,
  ensureCourierKey, giveConsent, hasConsent, pollDelay, processPending, revokeCourier, trackingFor
} from '../js/live.js';

const M = 1 / 111320;
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };
const pos = (t, dy = 0, extra = {}) => ({ timestamp: t, coords: { latitude: -38.0148 + dy * M, longitude: -57.54085, accuracy: 10, speed: 3, heading: 90, ...extra } });
const fakeGeo = () => { const g = { cb: null, err: null, cleared: 0, watchPosition(cb, err) { g.cb = cb; g.err = err; return 7; }, clearWatch() { g.cleared++; } }; return g; };
const KEY = 'k'.repeat(43), W = 'W'.repeat(22), tick = (ms = 5) => new Promise(r => setTimeout(r, ms));
const ok = data => ({ ok: true, status: 200, data: data ?? { ok: true } });
const mk = (id, extra = {}) => createSharer({ tk: { w: W, c: id, k: KEY }, geo: fakeGeo(), call: async () => ok(), storage: mem(), now: () => 100000, doc: undefined, nav: {}, rand: () => 0.5, ...extra });

test('consentimiento: se recuerda por despacho, no en general', () => {
  const st = mem();
  assert.equal(hasConsent(W, st), false);
  giveConsent(W, st, () => 123);
  assert.equal(hasConsent(W, st), true);
  assert.equal(hasConsent('X'.repeat(22), st), false, 'otro despacho vuelve a preguntar');
  assert.equal(hasConsent(W, { getItem() { throw new Error('bloqueado'); } }), false);
  st.setItem('cuadra.consent.v2', 'no es json');
  assert.equal(hasConsent(W, st), false);
});

test('ritmos: lento cuando no hay nadie o la pestaña está oculta, con espera creciente si falla', () => {
  assert.equal(pollDelay({ online: true }), POLL_MS);
  assert.equal(pollDelay({ online: false }), POLL_IDLE_MS);
  assert.equal(pollDelay({ online: true, hidden: true }), POLL_HIDDEN_MS);
  assert.ok(POLL_MS >= 10000 && POLL_IDLE_MS >= 30000 && FLUSH_MS >= 15000, 'el costo del servidor depende de que sean parejos y lentos');
  const rand = () => 0.5;
  assert.equal(pollDelay({ fails: 1, rand }), backoff(POLL_MS, 1, rand));
  assert.ok(backoff(12000, 3, rand) > backoff(12000, 1, rand));
  assert.ok(backoff(12000, 20, () => 1) <= 5 * 60e3 * 1.25, 'tope de 5 min (más la variación)');
  const lo = backoff(12000, 2, () => 0), hi = backoff(12000, 2, () => 0.999);
  assert.ok(hi > lo * 1.5, 'varía al azar para que no reintenten todos juntos');
});

test('sharer: filtra, manda ev start con la hora del celular, vacía la cola y cierra con ev stop', async () => {
  const calls = [], geo = fakeGeo(), st = mem();
  const call = async (path, body) => { calls.push({ path, body }); return ok({ accepted: body.pts.length }); };
  const sh = createSharer({ tk: { w: W, c: 'c1', k: KEY }, geo, call, storage: st, now: () => 100000, doc: undefined, nav: {} });
  try {
    assert.ok(sh.start());
    await tick();
    assert.equal(calls[0].path, 'ping');
    assert.equal(calls[0].body.ev, 'start');
    assert.equal(calls[0].body.ct, 100000, 'manda su hora para que el servidor corrija relojes desfasados');
    assert.deepEqual(calls[0].body.pts, []);
    assert.equal(calls[0].body.ck, KEY);
    // 12 posiciones cada 5 s con 30 m de avance + una imprecisa + una repetida + una demasiado pronto
    for (let i = 0; i < 12; i++) geo.cb(pos(1000 + i * 5000, i * 30));
    geo.cb(pos(70000, 400, { accuracy: 300 }));
    geo.cb(pos(1000, 0));
    geo.cb(pos(1000 + 11 * 5000 + 1500, 400));
    assert.equal(sh.state().queued, 12, 'se encolaron los 12 buenos');
    assert.ok(sh.state().fix, 'la posición cruda sirve para dibujar el marcador aunque no se mande');
    await sh.flush({ force: true });
    const withPts = calls.filter(c => c.body.pts.length);
    assert.equal(withPts.reduce((a, c) => a + c.body.pts.length, 0), 12);
    assert.ok(withPts.every(c => c.body.pts.every(p => p.acc <= 80)));
    assert.equal(sh.state().queued, 0);
    assert.equal(JSON.parse(st.getItem('cuadra.q.c1')).length, 0);
    assert.ok(sh.state().km > 0.3 && sh.state().km < 0.4, 'km: ' + sh.state().km);
    assert.equal(sh.state().sent, 12);
    await sh.stop();
    assert.equal(calls[calls.length - 1].body.ev, 'stop');
    assert.equal(geo.cleared, 1);
    assert.equal(sh.state().status, 'idle');
    assert.equal(sh.state().fix, null);
  } finally { await sh.stop({ final: false }); }
});

test('sharer: sin conexión espera con backoff, conserva los puntos y los envía al volver', async () => {
  const geo = fakeGeo(), clock = { t: 100000 };
  let online = false, n = 0;
  const call = async () => { n++; return online ? ok() : { ok: false, status: 0, data: null }; };
  const sh = createSharer({ tk: { w: W, c: 'c2', k: KEY }, geo, call, storage: mem(), now: () => clock.t, doc: undefined, nav: {}, rand: () => 0.5 });
  try {
    sh.start();
    await tick();
    for (let i = 0; i < 4; i++) geo.cb(pos(1000 + i * 5000, i * 30));
    const before = n;
    await sh.flush({ force: true });
    assert.equal(sh.state().status, 'offline');
    assert.equal(sh.state().queued, 4);
    const after = n;
    await sh.flush();                                                  // todavía no toca reintentar
    assert.equal(n, after, 'respeta la espera: no insiste de inmediato');
    clock.t += 5 * 60e3;
    online = true;
    await sh.flush();
    assert.equal(sh.state().status, 'live');
    assert.equal(sh.state().queued, 0);
    assert.equal(sh.state().sent, 4);
    assert.ok(after > before);
  } finally { await sh.stop({ final: false }); }
});

test('sharer: la cola offline tiene tope y sobrevive a una recarga; los puntos viejos se descartan', async () => {
  const geo = fakeGeo(), st = mem(), clock = { t: 100000 };
  const call = async () => ({ ok: false, status: 0, data: null });
  const sh = createSharer({ tk: { w: W, c: 'c3', k: KEY }, geo, call, storage: st, now: () => clock.t, doc: undefined, nav: {} });
  sh.start();
  for (let i = 0; i < MAX_QUEUE + 50; i++) geo.cb(pos(1000 + i * 5000, i * 30));
  assert.equal(sh.state().queued, MAX_QUEUE);
  await sh.stop({ final: false });
  const again = createSharer({ tk: { w: W, c: 'c3', k: KEY }, geo: fakeGeo(), call, storage: st, now: () => clock.t, doc: undefined, nav: {} });
  assert.equal(again.state().queued, MAX_QUEUE, 'la cola persistida se recupera');
  clock.t += 6 * 3600e3;                                               // pasaron 6 h: el servidor ya no aceptaría esos puntos
  await again.flush({ force: true });
  assert.equal(again.state().queued, 0, 'se descartan los puntos vencidos en vez de reintentarlos para siempre');
});

test('sharer: un lote que el servidor rechaza por formato (400) no se reintenta para siempre', async () => {
  const geo = fakeGeo();
  let n = 0;
  const sh = createSharer({ tk: { w: W, c: 'c7', k: KEY }, geo, call: async () => { n++; return { ok: false, status: 400, data: { error: 'bad_request' } }; }, storage: mem(), now: () => 100000, doc: undefined, nav: {} });
  try {
    sh.start(); await tick();
    for (let i = 0; i < 3; i++) geo.cb(pos(1000 + i * 5000, i * 30));
    await sh.flush({ force: true });
    assert.equal(sh.state().queued, 0);
    assert.ok(n <= 3);
  } finally { await sh.stop({ final: false }); }
});

test('sharer: se corta solo a las 12 horas y avisa', async () => {
  const geo = fakeGeo(), clock = { t: 100000 }, calls = [];
  const sh = createSharer({ tk: { w: W, c: 'c8', k: KEY }, geo, call: async (p, b) => { calls.push(b); return ok(); }, storage: mem(), now: () => clock.t, doc: undefined, nav: {} });
  try {
    sh.start(); await tick();
    assert.ok(sh.isActive());
    clock.t += SHARE_MAX_MS - 1000;
    await sh.flush({ force: true });
    assert.ok(sh.isActive(), 'antes de las 12 h sigue');
    clock.t += 2000;
    await sh.flush({ force: true });
    await tick();
    assert.ok(!sh.isActive());
    assert.equal(sh.state().status, 'expired');
    assert.match(sh.state().error, /12 horas/);
    assert.equal(calls.at(-1).ev, 'stop', 'avisa al despacho que dejó de compartir');
    assert.equal(geo.cleared, 1);
  } finally { await sh.stop({ final: false }); }
});

test('sharer: clave revocada detiene la transmisión; permiso denegado avisa; sin GPS avisa', async () => {
  const geo = fakeGeo();
  const sh = createSharer({ tk: { w: W, c: 'c4', k: KEY }, geo, call: async () => ({ ok: false, status: 401, data: null }), storage: mem(), now: () => 100000, doc: undefined, nav: {} });
  sh.start(); await tick();
  assert.equal(sh.state().status, 'revoked');
  assert.ok(!sh.isActive());
  const geo2 = fakeGeo(), sh2 = mk('c5', { geo: geo2 });
  sh2.start(); geo2.err({ code: 1 });
  assert.equal(sh2.state().status, 'denied');
  assert.ok(!sh2.isActive());
  assert.equal(mk('c6', { geo: null }).start(), false);
});

test('sharer: "borrar mi recorrido" vacía la cola local y pide el borrado al servidor con la clave del repartidor', async () => {
  const calls = [], geo = fakeGeo(), st = mem();
  const sh = createSharer({ tk: { w: W, c: 'c9', k: KEY }, geo, call: async (p, b) => { calls.push({ p, b }); return { ok: false, status: p === 'clear' ? 200 : 0, data: null, ...(p === 'clear' ? { ok: true } : {}) }; }, storage: st, now: () => 100000, doc: undefined, nav: {} });
  try {
    sh.start(); await tick();
    for (let i = 0; i < 3; i++) geo.cb(pos(1000 + i * 5000, i * 30));
    assert.equal(sh.state().queued, 3);
    assert.equal(await sh.clearMine(), true);
    assert.equal(sh.state().queued, 0);
    assert.equal(sh.state().km, 0);
    assert.equal(JSON.parse(st.getItem('cuadra.q.c9')).length, 0);
    assert.deepEqual(calls.at(-1), { p: 'clear', b: { ws: W, cid: 'c9', ck: KEY } });
  } finally { await sh.stop({ final: false }); }
});

test('tracker del despacho: fusiona sin duplicar, calcula online, km y "dejó de compartir", detecta credenciales inválidas', async () => {
  const live = { ws: W, admin: 'a'.repeat(43), pending: [] };
  let serverNow = 1_000_000, n = 0, mode = 'ok';
  const calls = [];
  const P = (t, dy, a) => ({ t, lat: -38.0148 + dy * M, lng: -57.54085, a });
  const call = async (path, body) => {
    calls.push(body); n++;
    if (mode === 'denied') return { ok: false, status: 401, data: null };
    if (mode === 'down') return { ok: false, status: 503, data: { error: 'busy' } };
    if (n === 1) return ok({ now: serverNow, couriers: { c1: { name: 'Moto 1', color: '#2a78d6', pts: [P(1, 0, 930_000), P(11_000, 60, 940_000), P(21_000, 120, 950_000)], last: P(21_000, 120, 950_000) }, c2: { name: 'Moto 2', color: '#e11d48', pts: [] } } });
    if (mode === 'stop') return ok({ now: serverNow, couriers: { c1: { name: 'Moto 1', color: '#2a78d6', pts: [], ev: { a: serverNow - 1000, k: 'stop' } }, c2: { name: 'Moto 2', color: '#e11d48', pts: [] } } });
    return ok({ now: serverNow, couriers: { c1: { name: 'Moto 1', color: '#2a78d6', pts: [P(21_000, 120, 950_000), P(31_000, 180, 1_000_000)], last: P(31_000, 180, 1_000_000) }, c2: { name: 'Moto 2', color: '#e11d48', pts: [] } } });
  };
  const snaps = [], clock = { t: 1_000_000 };
  const tr = createTracker({ getLive: () => live, call, now: () => clock.t, doc: { hidden: false }, rand: () => 0.5 });
  tr.subscribe(s => snaps.push(s));
  tr.start();
  await tick();
  let t = snaps.at(-1).tracks.get('c1');
  assert.equal(t.pts.length, 3);
  assert.ok(t.online, 'último ping hace 50 s');
  assert.ok(calls[0].since >= 1_000_000 - 24 * 3600e3, 'la primera consulta pide el día (el servidor recorta lo demás)');
  assert.ok(Math.abs(t.km - 0.12) < 0.01, 'km ' + t.km);
  assert.equal(snaps.at(-1).tracks.get('c2').online, false, 'sin puntos todavía: figura pero sin señal');
  serverNow += 10_000; clock.t += 10_000;
  await tr.tick();
  assert.equal(calls[1].since, 1_000_000 - 10_000, 'cursor con solapamiento de 10 s');
  t = snaps.at(-1).tracks.get('c1');
  assert.equal(t.pts.length, 4, 'el punto repetido no se duplica');
  assert.equal(snaps.at(-1).status, 'ok');
  mode = 'stop';
  serverNow += 5000; clock.t += 5000;
  await tr.tick();
  assert.equal(snaps.at(-1).tracks.get('c1').stopped, true);
  assert.equal(snaps.at(-1).tracks.get('c1').online, false, 'dejó de compartir: no figura en línea aunque el último punto sea reciente');
  mode = 'ok';
  serverNow += ONLINE_MS + 20_000; clock.t += ONLINE_MS + 20_000;      // pasa más de un minuto sin pings nuevos
  await tr.tick();
  assert.equal(snaps.at(-1).tracks.get('c1').online, false, 'sin señal pasado el minuto');
  mode = 'down';
  await tr.tick();
  assert.equal(snaps.at(-1).status, 'error');
  assert.ok(snaps.at(-1).tracks.get('c1').pts.length >= 4, 'si el servidor falla se conserva lo que ya se vio');
  mode = 'denied';
  const calls0 = calls.length;
  await tr.tick();
  assert.equal(snaps.at(-1).status, 'denied');
  await tick(20);
  assert.equal(calls.length, calls0 + 1, 'con credenciales inválidas no insiste');
  tr.stop();
});

test('claves: activar con código, pedir la del repartidor, link, respaldo sin secretos, baja y desactivación', async () => {
  store.resetAll();
  const seen = [];
  let existing = false, revokeOk = true, enableCode = 'BUENO';
  const fake = async (url, init) => {
    const path = url.split('/api/track/')[1], body = JSON.parse(init.body);
    seen.push({ path, body });
    const res = (status, data) => ({ ok: status < 300, status, json: async () => data });
    if (path === 'ws') return body.code === enableCode ? res(200, { ws: W, admin: 'A'.repeat(43) }) : res(401, { error: 'bad_code' });
    if (path === 'courier') return body.rotate || !existing ? res(200, { ck: 'C'.repeat(43) }) : res(200, { existing: true });
    if (path === 'revoke') return revokeOk ? res(200, { ok: true }) : res(503, { error: 'busy' });
    if (path === 'clear') return res(200, { ok: true });
    return res(404, {});
  };
  const real = globalThis.fetch; globalThis.fetch = fake;
  try {
    const [c1, c2] = store.state.couriers;
    assert.equal(await ensureCourierKey(c1.id), null, 'sin seguimiento activo no hay clave');
    await assert.rejects(() => enableLive('MALO'), /código/);
    assert.equal(store.state.settings.live, null);
    await enableLive(' BUENO ');
    assert.deepEqual(store.state.settings.live, { ws: W, admin: 'A'.repeat(43), pending: [] });
    assert.equal(trackingFor(c1.id), null, 'todavía sin clave del repartidor');
    assert.equal(await ensureCourierKey(c1.id), 'C'.repeat(43));
    assert.deepEqual(trackingFor(c1.id), { w: W, c: c1.id, k: 'C'.repeat(43) });
    existing = true;
    assert.equal(await ensureCourierKey(c2.id), 'C'.repeat(43), 'si el servidor ya lo tenía, se rota y se obtiene una clave nueva');
    const backup = store.exportJSON();
    assert.ok(!backup.includes('A'.repeat(43)) && !backup.includes('C'.repeat(43)), 'el respaldo no lleva claves');
    assert.equal(JSON.parse(backup).settings.live, null);
    // restaurar un respaldo (sin claves) no pierde las de este navegador; un archivo con claves ajenas no las impone
    const evil = JSON.parse(backup); evil.settings.live = { ws: 'Z'.repeat(22), admin: 'Z'.repeat(43) }; evil.couriers[0].ck = 'Z'.repeat(43);
    store.importJSON(JSON.stringify(evil));
    assert.equal(store.state.settings.live.ws, W);
    assert.equal(store.courierById(c1.id).ck, 'C'.repeat(43));
    assert.ok(!JSON.stringify(store.state).includes('Z'.repeat(22)));
    // dar de baja a un repartidor deja su revocación pendiente y se procesa cuando hay conexión
    store.removeCourier(c2.id);
    assert.deepEqual(store.state.settings.live.pending, [c2.id]);
    revokeOk = false;
    await processPending();
    assert.deepEqual(store.state.settings.live.pending, [c2.id], 'sin conexión queda pendiente');
    revokeOk = true;
    await processPending();
    assert.deepEqual(store.state.settings.live.pending, []);
    assert.equal(seen.filter(x => x.path === 'revoke' && x.body.cid === c2.id).length, 2);
    // revocar uno (celular perdido) y borrar recorridos
    assert.equal(await revokeCourier(c1.id), true);
    assert.equal(store.courierById(c1.id).ck, undefined);
    await clearTracks();
    assert.deepEqual(seen.at(-1).body, { ws: W, admin: 'A'.repeat(43) });
    // desactivar: si el servidor no responde avisa, y con force se desactiva igual
    await ensureCourierKey(c1.id);
    revokeOk = false;
    await assert.rejects(() => disableLive(), /servidor/);
    assert.ok(store.state.settings.live, 'sigue activo si no se pudo borrar');
    await disableLive({ force: true });
    assert.equal(store.state.settings.live, null);
    assert.ok(store.state.couriers.every(x => !x.ck), 'al desactivar se olvidan las claves');
    revokeOk = true;
  } finally { globalThis.fetch = real; }
});
