// Tests del servidor en memoria: núcleo (core.mjs) y capa HTTP (http.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { compactar, createService, diaKey, erroresItem, tokenDe } from '../netlify/lib/core.mjs';
import { handleRequest } from '../netlify/lib/http.mjs';
import { memoryStore } from '../netlify/lib/stores.mjs';
import { SEED } from '../js/seed.js';

const CODE = 'codigo-del-panel-1234';
const SECRET = 'x'.repeat(40);
const NOW = Date.parse('2026-10-15T12:00:00-03:00');
const EID = 'AbCdEfGhIjKlMnOpQrStUv';

const mk = (o = {}) => {
  const store = o.store || memoryStore();
  let now = o.now ?? NOW;
  const svc = createService({ store, code: CODE, secret: SECRET, now: () => now, ...o });
  return { store, svc, setNow: t => { now = t; } };
};

test('contenido vacío hasta la primera publicación', async () => {
  const { svc } = mk();
  const r = await svc.handle('GET', 'contenidos');
  assert.equal(r.status, 200);
  assert.equal(r.body.items, null);
  assert.equal(r.body.rev, null);
});

test('acceso al panel: código, clave y configuración', async () => {
  const { svc } = mk();
  assert.equal((await svc.handle('POST', 'admin/login', { code: 'otro' })).status, 403);
  const ok = await svc.handle('POST', 'admin/login', { code: CODE });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.token, tokenDe(SECRET));
  assert.equal((await svc.handle('POST', 'admin/publicar', { token: 'A'.repeat(43), items: [] })).status, 401);
  assert.equal((await svc.handle('POST', 'admin/datos', {})).status, 401);
  const sin = createService({ store: memoryStore(), code: 'corto', secret: SECRET });
  assert.equal((await sin.handle('POST', 'admin/login', { code: 'corto' })).status, 503);
  const igual = createService({ store: memoryStore(), code: SECRET, secret: SECRET });
  assert.equal((await igual.handle('POST', 'admin/login', { code: SECRET })).status, 503);
  assert.equal((await sin.handle('GET', 'salud')).body.admin, false);
});

test('publicar: validación, versión y conflicto', async () => {
  const { svc, store } = mk();
  const token = tokenDe(SECRET);
  const malo = await svc.handle('POST', 'admin/publicar', { token, items: [{ ...SEED[0], url: 'http://inseguro' }, SEED[0]], rev: null });
  assert.equal(malo.status, 422);
  assert.ok(malo.body.errores.some(e => e.errores.some(x => /https/.test(x))));
  assert.ok(malo.body.errores.some(e => e.errores.includes('id repetido')));
  const p1 = await svc.handle('POST', 'admin/publicar', { token, items: SEED, rev: null });
  assert.equal(p1.status, 200);
  assert.equal(p1.body.n, SEED.length);
  const g = await svc.handle('GET', 'contenidos');
  assert.equal(g.body.items.length, SEED.length);
  assert.equal(g.body.rev, p1.body.rev);
  // otra pestaña con la versión vieja no pisa lo publicado
  const viejo = await svc.handle('POST', 'admin/publicar', { token, items: SEED.slice(1), rev: null });
  assert.equal(viejo.status, 409);
  assert.equal(viejo.body.rev, p1.body.rev);
  const p2 = await svc.handle('POST', 'admin/publicar', { token, items: SEED.slice(1), rev: p1.body.rev });
  assert.equal(p2.status, 200);
  assert.equal(JSON.parse(store.raw('contenido/actual')).items.length, SEED.length - 1);
});

test('validación de piezas', () => {
  const base = SEED[0];
  assert.deepEqual(erroresItem(base), []);
  assert.ok(erroresItem({ ...base, id: 'Con Espacios' }).length);
  assert.ok(erroresItem({ ...base, fuente: 'otra' }).length);
  assert.ok(erroresItem({ ...base, titulo: '' }).length);
  assert.ok(erroresItem({ ...base, inicio: 'mañana' }).length);
  assert.ok(erroresItem({ ...base, accion: { txt: 'x', url: 'javascript:alert(1)' } }).length);
  assert.ok(erroresItem({ ...base, rubros: [] }).length);
  assert.ok(erroresItem({ ...base, sesiones: 0 }).length);
  assert.ok(erroresItem({ ...base, extra: 1 }).some(e => /desconocidos/.test(e)));
  assert.ok(erroresItem({ ...base, url: 'https://ok.com/"><script>' }).length);
});

test('eventos: un blob por envío, hora corregida y perfil sin datos extra', async () => {
  const { svc, store } = mk();
  const r = await svc.handle('POST', 'eventos', {
    eid: EID,
    perfil: { rubro: 'comercio', tamano: 'micro', sigue: ['ucip', 'ucip', 'otra'], temas: ['red', 'x'], nombre: 'Panadería', email: 'a@b.c' },
    ev: [['ver', 'ucip-excel-ia-2026', NOW - 1000], ['guardar', 'ucip-excel-ia-2026', NOW + 86400e3], ['ir', 'aticma-b2b-2026', 1]]
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.guardado, 3);
  const emp = JSON.parse(store.raw(`emp/${EID}`));
  assert.deepEqual(emp, { eid: EID, rubro: 'comercio', tamano: 'micro', sigue: ['ucip'], temas: ['red'], at: NOW });
  const keys = store.keys().filter(k => k.startsWith('ev/'));
  assert.equal(keys.length, 1);
  assert.ok(keys[0].startsWith(`ev/${diaKey(NOW)}/${NOW}-`));
  const lote = JSON.parse(store.raw(keys[0]));
  assert.deepEqual(lote.ev.map(e => e[2]), [NOW - 1000, NOW, NOW]);   // futuro y muy viejo toman la hora de llegada
  // inválidos
  for (const body of [{}, { eid: 'x' }, { eid: EID, ev: [['ver']] }, { eid: EID, ev: [['hackear', 'a', 1]] }, { eid: EID, ev: Array(61).fill(['ver', 'a', NOW]) }, { eid: EID, perfil: 'x' }])
    assert.equal((await svc.handle('POST', 'eventos', body)).status, 400, JSON.stringify(body).slice(0, 40));
  // borrar el perfil
  assert.equal((await svc.handle('POST', 'eventos', { eid: EID, borrar: true })).status, 200);
  assert.equal(store.raw(`emp/${EID}`), undefined);
});

test('pausado: acepta y no guarda', async () => {
  const { svc, store } = mk({ paused: true });
  const r = await svc.handle('POST', 'eventos', { eid: EID, ev: [['ver', 'a', NOW]] });
  assert.equal(r.status, 202);
  assert.equal(store.keys().length, 0);
});

test('datos del panel y compactación diaria', async () => {
  const { svc, store, setNow } = mk();
  const token = tokenDe(SECRET);
  const ayer = NOW - 86400e3;
  setNow(ayer);
  await svc.handle('POST', 'eventos', { eid: EID, perfil: { rubro: 'pesca' }, ev: [['ver', 'pl-programa', ayer]] });
  await svc.handle('POST', 'eventos', { eid: EID, ev: [['guardar', 'pl-programa', ayer]] });
  setNow(NOW);
  await svc.handle('POST', 'eventos', { eid: 'ZZZZZZZZZZZZZZZZZZZZZZ', ev: [['ver', 'pl-programa', NOW]] });
  const antes = await svc.handle('POST', 'admin/datos', { token, dias: 30 });
  assert.equal(antes.status, 200);
  assert.equal(antes.body.lotes.length, 3);
  assert.equal(antes.body.empresas.length, 1);
  const r = await compactar({ store, now: NOW });
  assert.deepEqual([r.dias, r.borrados], [1, 2]);
  assert.equal(store.keys().filter(k => k.startsWith('ev/')).length, 1);           // el de hoy queda sin compactar
  assert.ok(store.raw(`evd/${diaKey(ayer)}`));
  const despues = await svc.handle('POST', 'admin/datos', { token, dias: 30 });
  assert.deepEqual(despues.body.lotes.map(l => l.ev[0][0]).sort(), antes.body.lotes.map(l => l.ev[0][0]).sort());
  // retención
  await store.put('evd/2024-01-01', JSON.stringify({ lotes: [] }));
  const r2 = await compactar({ store, now: NOW });
  assert.equal(r2.vencidos, 1);
  assert.equal(store.raw('evd/2024-01-01'), undefined);
});

test('HTTP: rutas, tipos de contenido, tamaño y caché', async () => {
  const store = memoryStore();
  const env = { code: CODE, secret: SECRET, store, now: () => NOW };
  const req = (path, init) => handleRequest(new Request('https://x.test/api/' + path, init), env);
  const g = await req('contenidos');
  assert.equal(g.status, 200);
  assert.match(g.headers.get('cache-control'), /max-age=60/);
  assert.match(g.headers.get('netlify-cdn-cache-control'), /s-maxage=60/);
  assert.equal((await req('salud')).status, 200);
  const beacon = await req('eventos', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ eid: EID, ev: [['ver', 'a', NOW]] }) });
  assert.equal(beacon.status, 200);
  const adminTexto = await req('admin/login', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ code: CODE }) });
  assert.equal(adminTexto.status, 415);
  const grande = await req('eventos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(20 * 1024) });
  assert.equal(grande.status, 413);
  assert.equal((await req('eventos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await req('eventos', { method: 'PUT' })).status, 405);
  assert.equal((await req('nada', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 404);
  const pub = await req('admin/publicar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: tokenDe(SECRET), items: SEED, rev: null }) });
  assert.equal(pub.status, 200);
  assert.equal(pub.headers.get('cache-control'), 'no-store');
});
