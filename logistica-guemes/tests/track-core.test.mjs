import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackService, gc, CFG, bucketOf } from '../netlify/lib/track-core.mjs';
import { memoryStore } from '../netlify/lib/stores.mjs';

const CODE = 'TEST-CODE-0000-1111-2222';
const T0 = Date.UTC(2026, 9, 3, 15, 0, 0);

function setup({ code = CODE, store = memoryStore() } = {}) {
  const clock = { t: T0 };
  let n = 0;
  const rand = len => Buffer.alloc(len, 0).map((_, i) => (i * 31 + ++n * 7) & 255);   // determinista y distinto cada vez
  const svc = createTrackService({ store, code, now: () => clock.t, rand });
  const call = async (route, body) => (await svc.handle(route, body));
  return { svc, store, clock, call };
}
async function workspace(ctx) {
  const r = await ctx.call('ws', { code: CODE });
  assert.equal(r.status, 200);
  return r.body;
}
async function newCourier(ctx, w, cid = 'c1', extra = {}) {
  const r = await ctx.call('courier', { ws: w.ws, admin: w.admin, cid, name: 'Moto 1', color: '#2563eb', ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.ck;
}
const pt = (ctx, i, extra = {}) => ({ t: ctx.clock.t - 1000 * (10 - i), lat: -38.0 + i * 1e-4, lng: -57.55, acc: 10, ...extra });
const ping = (ctx, w, cid, ck, pts, extra = {}) => ctx.call('ping', { ws: w.ws, cid, ck, pts, ...extra });
const read = (ctx, w, extra = {}) => ctx.call('read', { ws: w.ws, admin: w.admin, ...extra });

test('sin código de activación el servicio no responde y no toca el almacenamiento', async () => {
  const c = setup({ code: '' });
  for (const route of ['ws', 'courier', 'ping', 'read', 'revoke', 'clear']) assert.equal((await c.call(route, {})).status, 503, route);
  assert.equal((await c.call('nada', {})).status, 404);
  assert.deepEqual(c.store.ops, { get: 0, put: 0, del: 0, list: 0 });
});

test('crear espacio: pide el código y la clave del despacho no se guarda ni se puede inventar', async () => {
  const c = setup();
  assert.equal((await c.call('ws', { code: 'otro' })).status, 401);
  assert.equal((await c.call('ws', {})).status, 401);
  assert.equal((await c.call('ws', { code: 12345 })).status, 401);
  const w = await workspace(c);
  assert.match(w.ws, /^[A-Za-z0-9_-]{22}$/);
  assert.match(w.admin, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(c.store.ops, { get: 0, put: 0, del: 0, list: 0 }, 'crear el espacio no usa almacenamiento');
  const w2 = await workspace(c);
  assert.notEqual(w.ws, w2.ws);
  assert.notEqual(w.admin, w2.admin);
  // otro código de activación = otras claves para el mismo ws
  const d = setup({ code: 'OTRO-CODIGO-DISTINTO-1234' });
  assert.notEqual(d.svc._adminFor(w.ws), w.admin);
});

test('el espacio ajeno no se puede leer ni administrar con la clave de otro', async () => {
  const c = setup();
  const a = await workspace(c), b = await workspace(c);
  await newCourier(c, a);
  c.store.ops.get = c.store.ops.list = c.store.ops.put = 0;
  for (const [route, body] of [
    ['read', { ws: b.ws, admin: a.admin }], ['read', { ws: a.ws, admin: b.admin }], ['read', { ws: a.ws, admin: 'x'.repeat(43) }],
    ['courier', { ws: b.ws, admin: a.admin, cid: 'c1' }], ['revoke', { ws: b.ws, admin: a.admin }], ['clear', { ws: b.ws, admin: a.admin }],
    ['read', { ws: a.ws }], ['read', { ws: a.ws, admin: 123 }]
  ]) assert.equal((await c.call(route, body)).status, 401, route + JSON.stringify(body).slice(0, 40));
  assert.equal(c.store.ops.get + c.store.ops.list + c.store.ops.put, 0, 'las claves falsas se rechazan sin leer ni escribir');
});

test('repartidor: alta, nombre limpio, repetido, rotación y tope', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w, 'c1', { name: '  <b>Moto</b>\u0007 1 con un nombre larguísimo que se corta ', color: 'rojo' });
  assert.match(ck, /^[A-Za-z0-9_-]{43}$/);
  const doc = JSON.parse(c.store.raw(`ck/${w.ws}/c1`));
  assert.ok(doc.name.length <= CFG.MAX_NAME && !/[<>\u0007]/.test(doc.name), doc.name);
  assert.equal(doc.color, '#2563eb');
  assert.ok(!c.store.raw(`ck/${w.ws}/c1`).includes(ck), 'la clave del repartidor no se guarda');
  // repetido: avisa y no entrega otra clave; el cambio de nombre se sincroniza
  const again = await c.call('courier', { ws: w.ws, admin: w.admin, cid: 'c1', name: 'Moto Uno', color: '#dc2626' });
  assert.deepEqual(again.body, { ok: true, existing: true });
  assert.equal(JSON.parse(c.store.raw(`ck/${w.ws}/c1`)).name, 'Moto Uno');
  // rotar invalida la anterior
  const ck2 = (await c.call('courier', { ws: w.ws, admin: w.admin, cid: 'c1', rotate: true, name: 'Moto Uno', color: '#dc2626' })).body.ck;
  assert.notEqual(ck, ck2);
  assert.equal((await ping(c, w, 'c1', ck, [pt(c, 1)])).status, 401);
  assert.equal((await ping(c, w, 'c1', ck2, [pt(c, 1)])).status, 200);
  // identificadores raros
  for (const cid of ['', 'a/b', 'x'.repeat(33), '..', 'a b', 'ñ']) assert.equal((await c.call('courier', { ws: w.ws, admin: w.admin, cid })).status, 400, JSON.stringify(cid));
  // tope por espacio
  for (let i = 2; i <= CFG.MAX_COURIERS; i++) await newCourier(c, w, `c${i}`);
  assert.equal((await c.call('courier', { ws: w.ws, admin: w.admin, cid: 'extra' })).status, 409);
});

test('ping: guarda los puntos, rechaza claves falsas sin tocar el almacenamiento y no deja usar la clave en otro repartidor', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w, 'c1'), ckB = await newCourier(c, w, 'c2');
  const r = await ping(c, w, 'c1', ck, [pt(c, 1), pt(c, 2), pt(c, 3)], { ev: 'start' });
  assert.equal(r.status, 200);
  assert.equal(r.body.accepted, 3);
  assert.equal(r.body.now, T0);
  const bucket = JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`));
  assert.equal(bucket.p.length, 3);
  assert.ok(bucket.p.every(p => p.a === T0));
  assert.deepEqual(bucket.e, [{ a: T0, k: 'start' }]);

  const before = { ...c.store.ops };
  const flip = ck.slice(0, 40) + (ck[40] === 'A' ? 'B' : 'A') + ck.slice(41);
  const noncanonical = ck.slice(0, 42) + (ck[42] === 'A' ? 'B' : 'A');
  for (const bad of [flip, noncanonical, 'x'.repeat(43), '', ckB, null, 7]) assert.equal((await ping(c, w, 'c1', bad, [pt(c, 1)])).status, 401, String(bad).slice(0, 12));
  assert.equal((await ping(c, w, 'c1', ck, [pt(c, 1)], { ws: 'A'.repeat(22) })).status, 401, 'otro espacio');
  assert.deepEqual({ ...c.store.ops }, before, 'ninguno de esos pedidos llega al almacenamiento');
  assert.equal((await c.call('ping', { ws: w.ws, cid: 'nope', ck, pts: [] })).status, 401);
});

test('ping: validación del cuerpo y aceptación parcial', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  assert.equal((await c.call('ping', { ws: w.ws, cid: 'c1', ck })).status, 400);                         // sin pts
  assert.equal((await ping(c, w, 'c1', ck, 'x')).status, 400);
  assert.equal((await ping(c, w, 'c1', ck, [], { ev: 'otro' })).status, 400);
  assert.equal((await ping(c, w, 'c1', ck, Array.from({ length: CFG.MAX_PING_BODY_PTS + 1 }, (_, i) => pt(c, 1)))).status, 400);
  assert.equal((await c.call('ping', [])).status, 400);
  const mixed = [
    pt(c, 1), { ...pt(c, 2), lat: 91 }, { ...pt(c, 3), lng: NaN }, { ...pt(c, 4), acc: 500 }, { ...pt(c, 5), t: c.clock.t - 7 * 3600e3 },
    { ...pt(c, 6), t: c.clock.t + 5 * 60e3 }, 'basura', null, { ...pt(c, 7), acc: null }, { ...pt(c, 8), spd: -3, hdg: 999 }, pt(c, 9)
  ];
  const r = await ping(c, w, 'c1', ck, mixed);
  assert.equal(r.status, 200);
  assert.equal(r.body.accepted, 3, JSON.stringify(r.body));       // 1, 8 (sin spd ni hdg) y 9
  assert.equal(r.body.dropped, 8);
  const saved = JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p;
  assert.deepEqual(saved.map(p => p.t), [mixed[0].t, mixed[9].t, mixed[10].t]);
  assert.ok(!('spd' in saved[1]) && !('hdg' in saved[1]), 'velocidad y rumbo fuera de rango se omiten, el punto se conserva');
  assert.equal((await ping(c, w, 'c1', ck, [{ ...pt(c, 1), acc: 500 }])).body.accepted, 0, 'si todo se descarta igual responde 200 (el celular no reintenta)');
  const r2 = await ping(c, w, 'c1', ck, [], { ev: 'stop' });
  assert.equal(r2.status, 200);
});

test('ping: el reintento del mismo lote no duplica y el tope por ventana se respeta', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  const batch = [pt(c, 1), pt(c, 2), pt(c, 3)];
  await ping(c, w, 'c1', ck, batch);
  const r = await ping(c, w, 'c1', ck, batch);
  assert.equal(r.body.accepted, 0);
  assert.equal(JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p.length, 3);
  // tope por ventana
  let total = 3;
  for (let k = 0; total < CFG.MAX_PTS_PER_BUCKET + 60; k++) {
    const pts = Array.from({ length: 60 }, (_, i) => ({ t: T0 - 6 * 3600e3 + 1000 + k * 100000 + i * 1000, lat: -38, lng: -57.55 }));
    await ping(c, w, 'c1', ck, pts); total += 60;
  }
  assert.equal(JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p.length, CFG.MAX_PTS_PER_BUCKET);
});

test('ping: corrige un reloj del celular desfasado y respeta el que está bien', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  // reloj 10 min adelantado: todos los puntos parecen del futuro
  const phoneNow = T0 + 10 * 60e3;
  const r = await c.call('ping', { ws: w.ws, cid: 'c1', ck, ct: phoneNow, pts: [{ t: phoneNow - 5000, lat: -38, lng: -57.55 }, { t: phoneNow - 1000, lat: -38.0001, lng: -57.55 }] });
  assert.equal(r.body.accepted, 2);
  const saved = JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p;
  assert.deepEqual(saved.map(p => p.t), [T0 - 5000, T0 - 1000]);
  // reloj correcto con 1 s de diferencia: no se toca
  const r2 = await c.call('ping', { ws: w.ws, cid: 'c1', ck, ct: T0 - 1000, pts: [{ t: T0 - 3000, lat: -38.0002, lng: -57.55 }] });
  assert.equal(r2.body.accepted, 1);
  assert.equal(JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p.at(-1).t, T0 - 3000);
  // ct absurdo se ignora
  assert.equal((await c.call('ping', { ws: w.ws, cid: 'c1', ck, ct: 'x', pts: [pt(c, 1, { lat: -38.5 })] })).status, 200);
});

test('read: devuelve lo nuevo desde el cursor, valida since y no mezcla espacios', async () => {
  const c = setup();
  const w = await workspace(c), other = await workspace(c);
  const ck1 = await newCourier(c, w, 'c1', { name: 'Ana', color: '#16a34a' }), ck2 = await newCourier(c, w, 'c2');
  await newCourier(c, other, 'zz');
  await ping(c, w, 'c1', ck1, [pt(c, 1), pt(c, 2)]);
  c.clock.t += 30e3;
  await ping(c, w, 'c1', ck1, [pt(c, 8), pt(c, 9)], { ev: 'stop' });
  let r = await read(c, w);
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body.couriers).sort(), ['c1', 'c2']);
  assert.equal(r.body.couriers.c1.name, 'Ana');
  assert.equal(r.body.couriers.c1.color, '#16a34a');
  assert.equal(r.body.couriers.c1.pts.length, 4);
  assert.equal(r.body.couriers.c1.last.a, T0 + 30e3);
  assert.equal(r.body.couriers.c1.ev.k, 'stop');
  assert.equal(r.body.couriers.c2.pts.length, 0);
  assert.equal(r.body.couriers.c2.last, undefined);
  assert.equal(r.body.now, T0 + 30e3);
  // cursor: solo lo que llegó después
  r = await read(c, w, { since: T0 + 5e3 });
  assert.deepEqual(r.body.couriers.c1.pts.map(p => p.a), [T0 + 30e3, T0 + 30e3]);
  // since inválido
  for (const since of ['0', 'x', NaN, null, {}, [], Infinity]) assert.equal((await read(c, w, { since })).status, 400, String(since));
  // since muy viejo o futuro se recorta
  assert.equal((await read(c, w, { since: -1e15 })).status, 200);
  assert.equal((await read(c, w, { since: 1e15 })).body.couriers.c1.pts.length, 0);
  // otro espacio no ve a c1
  assert.deepEqual(Object.keys((await read(c, other)).body.couriers), ['zz']);
});

test('read: pedidos largos usan el listado y no piden ventanas inexistentes', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  for (let h = 0; h < 5; h++) { await ping(c, w, 'c1', ck, [pt(c, 5)]); c.clock.t += 3600e3; }
  const g0 = c.store.ops.get;
  const r = await read(c, w, { since: T0 - 6 * 3600e3 });
  assert.equal(r.body.couriers.c1.pts.length, 5);
  assert.ok(c.store.ops.get - g0 <= 1 + 5, `gets: ${c.store.ops.get - g0}`);
  // consulta de rutina (cursor reciente): pocas operaciones
  const before = { ...c.store.ops };
  await read(c, w, { since: c.clock.t - 15e3 });
  const used = { get: c.store.ops.get - before.get, list: c.store.ops.list - before.list, put: c.store.ops.put - before.put };
  assert.deepEqual(used, { get: 1 + 2, list: 1, put: 0 }, JSON.stringify(used));     // 1 repartidor, hasta 2 ventanas
});

test('clear: borrado lógico (lo que llegó antes no vuelve) y cada repartidor borra lo suyo', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck1 = await newCourier(c, w, 'c1'), ck2 = await newCourier(c, w, 'c2');
  await ping(c, w, 'c1', ck1, [pt(c, 1)]); await ping(c, w, 'c2', ck2, [pt(c, 2)]);
  c.clock.t += 5e3;
  // el repartidor c1 borra lo suyo
  assert.equal((await c.call('clear', { ws: w.ws, cid: 'c1', ck: ck2 })).status, 401, 'con la clave de otro no');
  assert.equal((await c.call('clear', { ws: w.ws, cid: 'c1', ck: ck1 })).status, 200);
  let r = await read(c, w);
  assert.equal(r.body.couriers.c1.pts.length, 0);
  assert.equal(r.body.couriers.c2.pts.length, 1);
  assert.ok(!c.store.keys().some(k => k.startsWith(`pts/${w.ws}/c1/`)));
  // un envío que estaba en vuelo con hora de llegada anterior al borrado queda fuera aunque escriba después
  const clr = JSON.parse(c.store.raw(`ck/${w.ws}/c1`)).clr;
  const key = `pts/${w.ws}/c1/${bucketOf(clr)}`;
  await c.store.put(key, JSON.stringify({ p: [{ t: clr - 1000, lat: -38, lng: -57.5, a: clr - 10 }], e: [] }), { ifNew: true });
  assert.equal((await read(c, w)).body.couriers.c1.pts.length, 0);
  // el despacho borra todo
  assert.equal((await c.call('clear', { ws: w.ws, admin: w.admin })).status, 200);
  assert.equal((await read(c, w)).body.couriers.c2.pts.length, 0);
  assert.equal((await c.call('clear', { ws: w.ws })).status, 401);
  assert.equal((await c.call('clear', { ws: w.ws, cid: 'c1' })).status, 401);
  // y después sigue funcionando
  c.clock.t += 5e3;
  assert.equal((await ping(c, w, 'c2', ck2, [pt(c, 5)])).body.accepted, 1);
  assert.equal((await read(c, w)).body.couriers.c2.pts.length, 1);
});

test('revoke: corta la clave, borra recorridos y el repartidor queda fuera', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck1 = await newCourier(c, w, 'c1'), ck2 = await newCourier(c, w, 'c2');
  await ping(c, w, 'c1', ck1, [pt(c, 1)]); await ping(c, w, 'c2', ck2, [pt(c, 2)]);
  assert.equal((await c.call('revoke', { ws: w.ws, admin: w.admin, cid: 'c1' })).body.revoked, 1);
  assert.equal((await ping(c, w, 'c1', ck1, [pt(c, 3)])).status, 401);
  assert.equal((await ping(c, w, 'c2', ck2, [pt(c, 3)])).status, 200);
  assert.deepEqual(Object.keys((await read(c, w)).body.couriers), ['c2']);
  assert.ok(!c.store.keys().some(k => k.includes('/c1')));
  // un alta posterior con el mismo id no hereda nada
  await newCourier(c, w, 'c1');
  assert.equal((await read(c, w)).body.couriers.c1.pts.length, 0);
  // revocar a todos
  assert.equal((await c.call('revoke', { ws: w.ws, admin: w.admin })).body.revoked, 2);
  assert.deepEqual(c.store.keys(), []);
  assert.equal((await ping(c, w, 'c2', ck2, [pt(c, 4)])).status, 401);
});

test('concurrencia: dos envíos a la vez sobre la misma ventana no se pisan', async () => {
  let k = 0;
  const store = memoryStore({ tick: () => new Promise(r => setTimeout(r, (k++ * 7) % 5)) });
  const c = setup({ store });
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  const sends = Array.from({ length: 3 }, (_, i) => ping(c, w, 'c1', ck, [pt(c, i + 1, { lat: -38 + i * 1e-3 })]));
  const rs = await Promise.all(sends);
  const ok = rs.filter(r => r.status === 200);
  const busy = rs.filter(r => r.status === 503);
  assert.equal(ok.length + busy.length, 3);
  assert.ok(ok.length >= 2, 'con 3 intentos por envío al menos dos entran');
  const saved = JSON.parse(c.store.raw(`pts/${w.ws}/c1/${bucketOf(T0)}`)).p;
  assert.equal(saved.length, ok.length, 'cada envío confirmado dejó su punto, y ninguno se perdió ni se duplicó');
});

test('un fallo del almacenamiento devuelve 500 sin detalles', async () => {
  const store = memoryStore();
  const c = setup({ store });
  const w = await workspace(c);
  const ck = await newCourier(c, w);
  store.get = async () => { throw new Error('secreto interno ' + ck); };
  const orig = console.error; console.error = () => {};
  try {
    const r = await ping(c, w, 'c1', ck, [pt(c, 1)]);
    assert.equal(r.status, 500);
    assert.deepEqual(r.body, { error: 'internal' });
  } finally { console.error = orig; }
});

test('limpieza programada: vencen las ventanas viejas y los repartidores vencidos, no lo reciente', async () => {
  const c = setup();
  const w = await workspace(c);
  const ck = await newCourier(c, w, 'c1'); await newCourier(c, w, 'c2');
  await ping(c, w, 'c1', ck, [pt(c, 1)]);
  c.clock.t += 47 * 3600e3;
  await ping(c, w, 'c1', ck, [pt(c, 2)]);
  c.clock.t += 2 * 3600e3;                                   // la primera ventana ya tiene 49 h
  await c.store.put('pts/zzz/x/not-a-number', '{}');
  let r = await gc({ store: c.store, now: () => c.clock.t });
  assert.equal(r.deleted, 2);
  assert.deepEqual(c.store.keys().filter(k => k.startsWith('pts/')), [`pts/${w.ws}/c1/${bucketOf(T0 + 47 * 3600e3)}`]);
  c.clock.t += 91 * 24 * 3600e3;
  r = await gc({ store: c.store, now: () => c.clock.t });
  assert.deepEqual(c.store.keys(), []);
  assert.equal(r.couriers, 2);
  // tope de trabajo por corrida
  for (let i = 0; i < 5; i++) await c.store.put(`pts/${w.ws}/c9/${i}`, '{}');
  assert.equal((await gc({ store: c.store, now: () => c.clock.t, maxDeletes: 3 })).deleted, 3);
});
