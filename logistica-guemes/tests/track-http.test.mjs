import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, MAX_BODY } from '../netlify/lib/track-http.mjs';
import { memoryStore } from '../netlify/lib/stores.mjs';

const CODE = 'TEST-CODE-0000-1111-2222';
const SECRET = 'secreto-de-prueba-'.padEnd(48, 'x');
const URL_BASE = 'https://cuadra.example/api/track/';
const T0 = Date.UTC(2026, 9, 3, 15, 0, 0);

const mk = (route, body, { method = 'POST', type = 'application/json', raw } = {}) => new Request(URL_BASE + route, {
  method, headers: type ? { 'content-type': type } : {}, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body))
});
function ctx(code = CODE, extra = {}) {
  const store = memoryStore(), lines = [];
  const run = async (route, body, opts) => {
    const r = await handleRequest(mk(route, body, opts), { code, secret: SECRET, store, now: () => T0, log: l => lines.push(l), ...extra });
    return { r, json: await r.json() };
  };
  return { store, run, lines };
}

test('flujo completo por HTTP: espacio, repartidor, ping y lectura', async () => {
  const { run } = ctx();
  const { json: w } = await run('ws', { code: CODE });
  assert.ok(w.ws && w.admin);
  const { json: c } = await run('courier', { ws: w.ws, admin: w.admin, cid: 'm1', name: 'Moto', color: '#2563eb' });
  const p = await run('ping', { ws: w.ws, cid: 'm1', ck: c.ck, pts: [{ t: T0 - 2000, lat: -38.0, lng: -57.55, acc: 8 }] });
  assert.equal(p.r.status, 200);
  assert.equal(p.json.accepted, 1);
  const rd = await run('read', { ws: w.ws, admin: w.admin });
  assert.equal(rd.json.couriers.m1.pts.length, 1);
});

test('toda respuesta es JSON sin caché ni sniffing, incluidos los errores', async () => {
  const { run } = ctx();
  for (const [route, body, opts] of [['ws', { code: 'mal' }], ['nada', {}], ['ping', {}], ['ws', null, { raw: 'no es json' }], ['ws', {}, { method: 'GET' }], ['ws', {}, { type: 'text/plain' }]]) {
    const { r } = await run(route, body, opts);
    assert.match(r.headers.get('content-type'), /^application\/json/, route);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(r.headers.get('access-control-allow-origin'), null, 'sin CORS: solo mismo origen');
  }
});

test('método, tipo de contenido y cuerpo inválidos se rechazan antes de leer nada', async () => {
  const { run, store } = ctx();
  assert.equal((await run('ws', {}, { method: 'GET' })).r.status, 405);
  assert.equal((await run('ws', {}, { method: 'GET' })).r.headers.get('allow'), 'POST');
  assert.equal((await run('ws', { code: CODE }, { type: 'text/plain' })).r.status, 415);
  assert.equal((await run('ws', { code: CODE }, { type: 'application/x-www-form-urlencoded' })).r.status, 415);
  assert.equal((await run('ws', { code: CODE }, { type: null })).r.status, 415);
  assert.equal((await run('ws', null, { raw: '{' })).r.status, 400);
  assert.equal((await run('ws', null, { raw: '' })).r.status, 400);
  assert.equal((await run('ws', null, { raw: '[1,2]' })).r.status, 400);
  assert.equal((await run('ws', null, { raw: '"texto"' })).r.status, 400);
  assert.equal((await run('ws', { code: CODE }, { type: 'application/json; charset=utf-8' })).r.status, 200);
  const big = await run('ping', null, { raw: JSON.stringify({ pad: 'x'.repeat(MAX_BODY + 10) }) });
  assert.equal(big.r.status, 413);
  assert.deepEqual(store.ops, { get: 0, put: 0, del: 0, list: 0 });
});

test('cuerpo grande sin content-length (streaming) también se corta', async () => {
  const { store } = ctx();
  const chunk = new TextEncoder().encode('x'.repeat(4096));
  const stream = new ReadableStream({ start(c) { for (let i = 0; i < 20; i++) c.enqueue(chunk); c.close(); } });
  const req = new Request(URL_BASE + 'ping', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' });
  const r = await handleRequest(req, { code: CODE, secret: SECRET, store, now: () => T0 });
  assert.equal(r.status, 413);
});

test('sin código configurado: 503 en todas las rutas', async () => {
  const { run } = ctx('');
  assert.equal((await run('ws', { code: '' })).r.status, 503);
  assert.equal((await run('read', {})).r.status, 503);
});

test('rutas con barra final, mayúsculas o recorrido de directorios no abren nada', async () => {
  const { run } = ctx();
  assert.equal((await run('ws/', { code: CODE })).r.status, 200);
  for (const route of ['WS', 'ws/extra', '../ws', '%2e%2e/ws', 'ping/..', '', '__proto__', 'constructor', 'toString']) assert.equal((await run(route, { code: CODE })).r.status, 404, JSON.stringify(route));
});

test('el registro de cada pedido no lleva cuerpos, claves, coordenadas ni IP', async () => {
  const { run, lines } = ctx();
  const { json: w } = await run('ws', { code: CODE });
  const { json: c } = await run('courier', { ws: w.ws, admin: w.admin, cid: 'm1', name: 'Moto privada', color: '#2563eb' });
  await run('ping', { ws: w.ws, cid: 'm1', ck: c.ck, pts: [{ t: T0 - 1000, lat: -38.123456, lng: -57.654321 }] });
  await run('read', { ws: w.ws, admin: w.admin });
  assert.equal(lines.length, 4);
  const all = lines.join('\n');
  for (const secret of [CODE, w.ws, w.admin, c.ck, '38.1234', '57.6543', 'Moto privada']) assert.ok(!all.includes(secret), `el registro filtró ${secret}`);
  for (const l of lines) assert.deepEqual(Object.keys(JSON.parse(l)).sort(), ['ms', 'route', 'status']);
});

test('TRACK_PAUSED y secreto corto se reflejan en HTTP', async () => {
  const p = ctx(CODE, { paused: true });
  assert.equal((await p.run('read', {})).r.status, 503);
  assert.equal((await p.run('health', {})).r.status, 200);
  const n = ctx(CODE, { secret: 'corto' });
  assert.deepEqual((await n.run('ws', { code: CODE })).json, { error: 'not_configured' });
});
