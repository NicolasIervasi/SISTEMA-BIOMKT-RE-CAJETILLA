// Tests del núcleo (sin navegador): node --test logistica-guemes/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { waNumber, fmtBlocks, fmtDur, csvCell, parseOrderLines, parseAmount } from '../js/fmt.js';
import { distM, ringBounds, ringIndex, ringLabel } from '../js/geomath.js';
import { assignRoutes, bruteForce, full, improve, nearestNeighbor, pathCost, solve } from '../js/solver.js';
import * as store from '../js/store.js';
import { etaPlan } from '../js/plan.js';
import { computeMetrics, rangeFor } from '../js/metrics.js';
import { decodePayload, encodePayload, buildCourierPayload } from '../js/share.js';
import { loadDemo } from '../js/demo.js';
import { acceptPoint, trackKm, thin, mergePoints, splitTrail, validCoords, LIMITS } from '../js/track-math.js';

const { state } = store;
const rand = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const randomMatrix = (n, r) => {
  const pts = Array.from({ length: n + 1 }, () => [r() * 1000, r() * 1000]);
  // asimétrica a propósito (manos únicas)
  return pts.map((a, i) => pts.map((b, j) => i === j ? 0 : Math.hypot(a[0] - b[0], a[1] - b[1]) * (1 + ((i * 7 + j * 3) % 5) / 10)));
};

test('teléfonos argentinos para WhatsApp', () => {
  const cases = { '223 555 1234': '5492235551234', '0223 15 555 1234': '5492235551234', '+54 9 223 555 1234': '5492235551234', '+54 223 555 1234': '5492235551234', '011 15 5555 1234': '5491155551234', '555 1234': '', '': '' };
  for (const [i, o] of Object.entries(cases)) assert.equal(waNumber(i), o, i);
});

test('formatos', () => {
  assert.equal(fmtBlocks(100), '1 cuadra');
  assert.equal(fmtBlocks(420), '4,2 cuadras');
  assert.equal(fmtDur(30), '1 min');
  assert.equal(fmtDur(3900), '1 h 05');
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});

test('anillos de tarifa: 11 cuadras -> 3 / 7 / 11', () => {
  assert.deepEqual(ringBounds(11), [3, 7, 11]);
  assert.deepEqual([0, 3, 3.1, 7, 7.1, 11].map(b => ringIndex(b * 100, 11, 100)), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual([0, 1, 2].map(i => ringLabel(i, 11)), ['Hasta 3', '4–7', '8–11']);
  assert.deepEqual(ringBounds(2), [1, 1, 2]);
});

test('distancia: 1 cuadra de latitud ≈ 100 m', () => {
  const d = distM({ lat: -38, lng: -57.5 }, { lat: -38 - 100 / 111320, lng: -57.5 });
  assert.ok(Math.abs(d - 100) < 0.5, String(d));
});

test('solve es exacto hasta 8 paradas y la heurística no empeora el vecino más cercano', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const r = rand(seed * 97), n = 4 + (seed % 4);
    const D = randomMatrix(n, r);
    for (const closed of [true, false]) {
      const exact = bruteForce(D, closed), got = solve(D, closed, r);
      assert.equal(pathCost(full(got, closed), D), pathCost(full(exact, closed), D));
    }
  }
  const r = rand(5), D = randomMatrix(14, r);
  const nn = nearestNeighbor(D), s = solve(D, true, r);
  assert.equal(new Set(s).size, 14);
  assert.ok(pathCost(full(s, true), D) <= pathCost(full(nn, true), D) + 1e-9);
  assert.ok(pathCost(full(improve(nn, D, true), true), D) <= pathCost(full(nn, true), D) + 1e-9);
});

test('assignRoutes: partición completa, balanceada y por sectores', () => {
  const c = { lat: -38.0148, lng: -57.54085 };
  const mk = (dx, dy) => ({ lat: c.lat + dy / 111320, lng: c.lng + dx / (111320 * Math.cos(c.lat * Math.PI / 180)) });
  // dos grupos bien separados: 4 al este y 4 al oeste
  const pts = [c, ...[1, 2, 3, 4].map(i => mk(300 + i * 40, i * 15)), ...[1, 2, 3, 4].map(i => mk(-300 - i * 40, -i * 15))];
  const D = pts.map(a => pts.map(b => distM(a, b) / 5));
  const groups = assignRoutes({ pts, D, k: 2, closed: true, serviceS: 240 });
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.flat().sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(groups.map(g => g.length), [4, 4]);
  for (const g of groups) assert.ok(g.every(i => i <= 4) || g.every(i => i >= 5), 'cada repartidor se queda con un lado: ' + g);

  // más repartidores que pedidos: uno por pedido
  const g3 = assignRoutes({ pts: pts.slice(0, 3), D: D.slice(0, 3).map(r => r.slice(0, 3)), k: 5, closed: true });
  assert.equal(g3.length, 2);
  assert.deepEqual(assignRoutes({ pts: [c], D: [[0]], k: 2, closed: true }), []);
});

function seedOrders(n) {
  store.resetAll();
  const out = [];
  for (let i = 0; i < n; i++) out.push(store.addOrder({ name: 'C' + i, address: 'Calle ' + i, lat: -38.0148 + i * 0.0005, lng: -57.54085 + i * 0.0003, amount: 10000, payment: 'efectivo' }));
  return out;
}

test('pedidos: código, tarifa por anillo y total a cobrar', () => {
  seedOrders(0);
  const near = store.addOrder({ name: 'Cerca', address: 'x', lat: -38.0148 - 150 / 111320, lng: -57.54085, amount: 5000, payment: 'efectivo' });
  const far = store.addOrder({ name: 'Lejos', address: 'y', lat: -38.0148 - 1000 / 111320, lng: -57.54085, amount: 5000, payment: 'pagado' });
  assert.equal(near.code + 1, far.code);
  assert.equal(near.fee, 1500);
  assert.equal(far.fee, 3000);
  assert.equal(store.totalDue(near), 6500);
  assert.equal(store.cashDue(near), 6500);
  assert.equal(store.cashDue(far), 0);
  assert.ok(store.inZone(near));
  assert.ok(!store.inZone({ lat: -38.0148 - 1300 / 111320, lng: -57.54085 }));
});

test('ciclo de vida: asignar, salir, entregar, fallar y reabrir', () => {
  const [a, b, c] = seedOrders(3);
  const m1 = state.couriers[0].id;
  assert.equal(store.courierStatus(m1), 'libre');
  assert.ok(store.assignOrder(a.id, m1));
  store.assignOrder(b.id, m1);
  assert.equal(a.status, 'asignado');
  assert.equal(store.courierStatus(m1), 'asignado');
  // ruta de mentira con las dos paradas
  state.routes[m1] = { order: [a.id, b.id], legs: [{ dist: 300, dur: 60 }, { dist: 200, dur: 40 }, { dist: 400, dur: 70 }], geometry: [], closed: true, stale: false, createdAt: Date.now(), departAt: null };
  assert.ok(store.departCourier(m1));
  assert.equal(store.courierStatus(m1), 'en_ruta');
  assert.equal(a.status, 'en_camino');
  assert.ok(!store.assignOrder(a.id, state.couriers[1].id), 'no se reasigna uno que ya salió');
  store.setStatus(a.id, 'entregado');
  assert.equal(a.status, 'entregado');
  assert.ok(a.doneAt && a.courierName === state.couriers[0].name);
  assert.ok(state.routes[m1], 'la ruta sigue mientras haya paradas abiertas');
  store.setStatus(b.id, 'fallido', { reason: 'No estaba' });
  assert.equal(b.failReason, 'No estaba');
  assert.equal(store.courierStatus(m1), 'libre');
  assert.ok(!state.routes[m1], 'sin paradas abiertas se descarta la ruta');
  store.setStatus(b.id, 'nuevo');
  assert.equal(b.status, 'nuevo');
  assert.equal(b.courierId, null);
  assert.deepEqual(b.history.map(h => h.s), ['nuevo', 'asignado', 'en_camino', 'fallido', 'nuevo']);
  assert.equal(c.status, 'nuevo');
});

test('borrar o reasignar un pedido invalida la ruta del repartidor', () => {
  const [a, b] = seedOrders(2);
  const [m1, m2] = state.couriers.map(c => c.id);
  store.assignOrder(a.id, m1); store.assignOrder(b.id, m1);
  state.routes[m1] = { order: [a.id, b.id], legs: [{ dist: 1, dur: 1 }, { dist: 1, dur: 1 }, { dist: 1, dur: 1 }], geometry: [], closed: true, stale: false, createdAt: 1, departAt: null };
  store.assignOrder(b.id, m2);
  assert.ok(state.routes[m1].stale);
  assert.deepEqual(state.routes[m1].order, [a.id]);
  store.removeOrder(a.id);
  assert.ok(!state.routes[m1], 'sin pedidos se descarta');
  store.removeCourier(m2);
  assert.equal(b.status, 'nuevo');
  assert.equal(b.courierId, null);
});

test('etaPlan: horarios con servicio, velocidad del vehículo y retorno', () => {
  const [a, b] = seedOrders(2);
  const m1 = state.couriers[0].id;                       // moto: factor 0.85
  store.assignOrder(a.id, m1); store.assignOrder(b.id, m1);
  const t0 = Date.UTC(2026, 9, 3, 21, 0);                // 18:00 en Argentina
  state.routes[m1] = { order: [a.id, b.id], legs: [{ dist: 500, dur: 600 }, { dist: 300, dur: 300 }, { dist: 600, dur: 600 }], geometry: [], closed: true, stale: false, createdAt: t0, departAt: null };
  state.settings.serviceMin = 4;
  const p = etaPlan(m1);
  const f = 0.85;
  assert.equal(p.etas.get(a.id), t0 + 600 * f * 1000);
  assert.equal(p.etas.get(b.id), t0 + 600 * f * 1000 + 4 * 60000 + 300 * f * 1000);
  assert.equal(p.end, p.etas.get(b.id) + 4 * 60000 + 600 * f * 1000);
  assert.equal(p.dist, 1400);
  assert.equal(p.pending, 2);
  state.routes[m1].stale = true;
  assert.equal(etaPlan(m1), null);
  state.routes[m1].stale = false;
  state.routes[m1].legs.pop();                           // largo inconsistente
  assert.equal(etaPlan(m1), null);
});

test('etaPlan en curso: parte de lo entregado y nunca de una hora pasada', () => {
  const [a, b] = seedOrders(2);
  const m1 = state.couriers[0].id;
  store.assignOrder(a.id, m1); store.assignOrder(b.id, m1);
  const t0 = Date.now() - 3600000;
  state.routes[m1] = { order: [a.id, b.id], legs: [{ dist: 500, dur: 300 }, { dist: 300, dur: 300 }], geometry: [], closed: false, stale: false, createdAt: t0, departAt: null };
  store.departCourier(m1);
  store.setStatus(a.id, 'entregado');
  const now = Date.now();
  const p = etaPlan(m1, now);
  assert.ok(p.etas.get(b.id) >= now, 'la próxima parada no puede estar en el pasado');
  assert.equal(p.pending, 1);
});

test('métricas sobre datos de demo', () => {
  store.resetAll();
  const n = loadDemo();
  assert.ok(n > 150, 'historia de 14 días + hoy: ' + n);
  assert.equal(state.couriers.length, 3);
  assert.ok(state.orders.every(o => o.demo));
  const cfg = { center: state.settings.center, radiusBlocks: 11, couriers: state.couriers };
  const week = computeMetrics(state.orders, rangeFor(7), cfg);
  assert.ok(week.delivered > 40 && week.delivered + week.failed <= n);
  assert.ok(week.successRate > 0.8 && week.successRate <= 1);
  assert.equal(week.perDay.length, 7);
  assert.equal(week.perDay.reduce((a, d) => a + d.delivered, 0), week.delivered);
  assert.equal(week.perRing.reduce((a, b) => a + b, 0), week.delivered);
  assert.equal(week.courierRows.reduce((a, r) => a + r.delivered, 0), week.delivered);
  assert.ok(week.avgDelivery > 15 && week.avgDelivery < 60);
  assert.ok(week.cash <= week.sales + week.revenueFee);
  const today = computeMetrics(state.orders, rangeFor(1), cfg);
  assert.ok(today.orders >= 12, 'los nuevos de hoy cuentan como pedidos');
  assert.ok(today.delivered >= 3);
  // determinista
  store.resetAll(); loadDemo();
  assert.equal(computeMetrics(state.orders, rangeFor(7), cfg).delivered, week.delivered);
});

test('link del repartidor: ida y vuelta con compresión', async () => {
  const [a, b, c] = seedOrders(3);
  const m1 = state.couriers[0].id;
  for (const o of [a, b, c]) store.assignOrder(o.id, m1);
  state.routes[m1] = { order: [c.id, a.id, b.id], legs: [{ dist: 400, dur: 90 }, { dist: 200, dur: 50 }, { dist: 300, dur: 60 }, { dist: 500, dur: 100 }], geometry: [], closed: true, stale: false, createdAt: 1, departAt: null };
  const payload = buildCourierPayload(m1);
  assert.deepEqual(payload.s.map(s => s[1]), ['C2', 'C0', 'C1'], 'respeta el orden de la ruta');
  assert.equal(payload.s[0][7], 10000 + c.fee);
  assert.deepEqual(payload.lr, [100, 500]);
  const enc = await encodePayload(payload);
  assert.match(enc, /^z[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodePayload(enc), payload);
  assert.deepEqual(await decodePayload('j' + Buffer.from(JSON.stringify(payload)).toString('base64url')), payload);
  await assert.rejects(decodePayload('zAAAA'));
  // tamaño razonable para un link de WhatsApp
  loadDemo();
  const m = state.couriers[0].id;
  state.orders.filter(o => o.status === 'nuevo').slice(0, 12).forEach(o => store.assignOrder(o.id, m));
  const big = await encodePayload(buildCourierPayload(m));
  assert.ok(big.length < 2500, 'link de 12 paradas: ' + big.length + ' caracteres');
});

test('backup: exportar e importar conserva todo', () => {
  seedOrders(4);
  const json = store.exportJSON();
  store.resetAll();
  assert.equal(state.orders.length, 0);
  store.importJSON(json);
  assert.equal(state.orders.length, 4);
  assert.throws(() => store.importJSON('{"v":1}'));
});

test('lista pegada: formatos de planilla y direcciones con coma', () => {
  const rows = parseOrderLines('Ana Pérez, Güemes 2900, 223 555 1234, $12.500\nGüemes 2800\nJuan; Alvarado 345; ; 8000\nGüemes 2900, Mar del Plata\n\nLu\tRawson 792\t2235550000');
  assert.deepEqual(rows, [
    { name: 'Ana Pérez', address: 'Güemes 2900', phone: '223 555 1234', amount: 12500 },
    { address: 'Güemes 2800' },
    { name: 'Juan', address: 'Alvarado 345', phone: '', amount: 8000 },
    { address: 'Güemes 2900, Mar del Plata' },
    { name: 'Lu', address: 'Rawson 792', phone: '2235550000', amount: 0 }
  ]);
  assert.equal(parseAmount('$ 1.234,00'), 123400);
  assert.deepEqual(parseOrderLines('  \n\n'), []);
});

// ───────── Track GPS ─────────
const M = 1 / 111320;                                   // 1 metro en grados de latitud
const pt = (t, dy = 0, dx = 0, extra = {}) => ({ t, lat: -38.0148 + dy * M, lng: -57.54085 + dx * M / Math.cos(38.0148 * Math.PI / 180), ...extra });

test('track: acceptPoint filtra precisión mala, saltos imposibles y repetidos', () => {
  assert.ok(acceptPoint(null, pt(1000)), 'el primero se acepta');
  assert.ok(!acceptPoint(null, pt(1000, 0, 0, { acc: 200 })), 'precisión mala');
  assert.ok(!acceptPoint(null, { t: 1, lat: 95, lng: 0 }), 'coordenadas inválidas');
  const a = pt(0);
  assert.ok(!acceptPoint(a, pt(2000, 20)), '2 s: muy pronto aunque se haya movido (acota lo que se transmite)');
  assert.ok(!acceptPoint(a, pt(5000, 5)), '5 m en 5 s: ni se movió ni pasó el tiempo');
  assert.ok(acceptPoint(a, pt(5000, 20)), '20 m en 5 s: se movió');
  assert.ok(acceptPoint(a, pt(9000, 2)), '9 s parado: se manda igual (señal de vida)');
  assert.ok(!acceptPoint(a, pt(0, 30)), 'mismo instante');
  assert.ok(!acceptPoint(a, pt(-500, 30)), 'fuera de orden');
  assert.ok(!acceptPoint(a, pt(5000, 5000)), 'salto de 5 km en 5 s');
  assert.ok(validCoords(pt(1)) && !validCoords({ lat: NaN, lng: 0 }));
});

test('track: trackKm suma el recorrido real y descarta el ruido', () => {
  // 10 tramos de 50 m hacia el norte, un punto por 10 s
  const clean = Array.from({ length: 11 }, (_, i) => pt(i * 10000, i * 50));
  assert.ok(Math.abs(trackKm(clean) - 0.5) < 0.005, String(trackKm(clean)));
  // parado con temblor de 2 m durante una hora: no suma
  const still = Array.from({ length: 360 }, (_, i) => pt(i * 10000, (i % 2) * 2, (i % 3) * 1.5));
  assert.ok(trackKm(still) < 0.01, 'temblor: ' + trackKm(still));
  // un salto de GPS de 3 km y vuelta no infla los km
  const jumpy = [pt(0, 0), pt(10000, 50), pt(20000, 3000), pt(30000, 100), pt(40000, 150)];
  assert.ok(Math.abs(trackKm(jumpy) - 0.15) < 0.01, 'con salto: ' + trackKm(jumpy));
  // precisión mala no cuenta
  assert.ok(trackKm([pt(0, 0), pt(10000, 100, 0, { acc: 120 })]) === 0);
  // un hueco de más de 10 min no suma (no se sabe por dónde fue) y se sigue desde el punto nuevo
  const gap = [pt(0, 0), pt(10000, 50), pt(20 * 60e3, 1050), pt(20 * 60e3 + 10000, 1100)];
  assert.ok(Math.abs(trackKm(gap) - 0.1) < 0.005, 'con hueco: ' + trackKm(gap));
  // caminando despacio (2 m cada 2 s) termina sumando: la referencia no avanza con el temblor
  const slow = Array.from({ length: 31 }, (_, i) => pt(i * 2000, i * 2));
  assert.ok(Math.abs(trackKm(slow) - 0.06) < 0.006, 'lento: ' + trackKm(slow));
});

test('track: thin conserva extremos, respeta el máximo y mergePoints no duplica', () => {
  const line = Array.from({ length: 1000 }, (_, i) => pt(i * 1000, i * 2));       // 2 m entre puntos
  const t10 = thin(line, 10, 2500);
  assert.equal(t10[0].t, 0); assert.equal(t10[t10.length - 1].t, 999000);
  assert.ok(t10.length < 300, 'adelgaza: ' + t10.length);
  const capped = thin(Array.from({ length: 5000 }, (_, i) => pt(i * 1000, i * 20)), 10, 500);
  assert.equal(capped.length, 500);
  assert.equal(capped[0].t, 0); assert.equal(capped[499].t, 4999000);
  assert.deepEqual(thin([pt(1)], 10, 5).length, 1);
  const merged = mergePoints([pt(3000), pt(1000)], [pt(1000), pt(2000)]);
  assert.deepEqual(merged.map(p => p.t), [1000, 2000, 3000]);
  assert.ok(LIMITS.maxSpeedMs > 30);
});

test('track: splitTrail corta la estela donde hubo un silencio largo', () => {
  const pts = [pt(0), pt(10000), pt(20000), pt(10 * 60e3), pt(10 * 60e3 + 5000)];
  const parts = splitTrail(pts);
  assert.deepEqual(parts.map(p => p.length), [3, 2]);
  assert.deepEqual(splitTrail([]), []);
  assert.deepEqual(splitTrail([pt(1)]).map(p => p.length), [1]);
});
