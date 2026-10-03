// Datos de demo: direcciones reales de la zona y 14 días de historia para que las métricas se vean pobladas.
import { DEMO_ADDRESSES } from './demo-seed.js';
import { startOfDay } from './fmt.js';
import { addCourier, buildOrder, clearOrders, feeFor, importOrders, state } from './store.js';

const DAY = 86400000, MIN = 60000;
const FIRST = ['Camila', 'Joaquín', 'Lucía', 'Mateo', 'Sofía', 'Tomás', 'Valentina', 'Bruno', 'Martina', 'Franco', 'Julieta', 'Nicolás', 'Agustina', 'Lautaro', 'Florencia', 'Santiago'];
const LAST = ['R.', 'M.', 'G.', 'F.', 'S.', 'P.', 'L.', 'D.', 'B.', 'C.', 'A.', 'V.'];
const NOTES = ['', '', '', 'Timbre 2B', 'Dejar con el encargado', 'Llamar al llegar', 'Casa de rejas negras', 'Piso 3 B', 'Sin cambio, por favor'];
const AMOUNTS = [6500, 8000, 9500, 11000, 12500, 14000, 16500, 18000, 21000, 24500];
// pesos por hora del día: picos de almuerzo y cena
const HOUR_W = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 6, 9, 8, 5, 2, 2, 3, 5, 9, 11, 8, 3, 0];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadDemo() {
  const rand = rng(2800);
  const pick = a => a[Math.floor(rand() * a.length)];
  const between = (a, b) => a + rand() * (b - a);

  // flota de demo: 3 repartidores
  const wanted = [['Moto 1', 'moto'], ['Moto 2', 'moto'], ['Bici 1', 'bici']];
  for (const [name, vehicle] of wanted) if (!state.couriers.some(c => c.name === name)) addCourier({ name, vehicle });
  const crew = state.couriers.filter(c => wanted.some(([n]) => n === c.name)).map(c => c.name);

  const now = Date.now();
  const make = (extra, t) => {
    const place = pick(DEMO_ADDRESSES);
    const o = buildOrder({
      name: `${pick(FIRST)} ${pick(LAST)}`,
      phone: `223 555 0${String(Math.floor(rand() * 900) + 100)}`,
      address: place.address, lat: place.lat, lng: place.lng,
      notes: pick(NOTES), amount: pick(AMOUNTS), payment: rand() < 0.55 ? 'efectivo' : 'pagado',
      createdAt: t, demo: true
    });
    o.fee = feeFor(o);
    return Object.assign(o, extra);
  };
  const closed = (t, ok) => {
    const wait = Math.round(between(18, 55)) * MIN;
    const done = Math.min(t + wait, now);
    const o = make({}, t);
    const dep = t + Math.round(wait * 0.35);
    o.history.push({ s: 'asignado', t: t + 2 * MIN }, { s: 'en_camino', t: dep }, { s: ok ? 'entregado' : 'fallido', t: done });
    return Object.assign(o, {
      status: ok ? 'entregado' : 'fallido', doneAt: done, departedAt: dep, courierName: pick(crew),
      legKm: +between(0.3, 1.6).toFixed(2), ...(ok ? {} : { failReason: pick(['No estaba', 'Dirección incorrecta', 'No respondió']) })
    });
  };

  const list = [];
  // últimos 14 días
  for (let d = 14; d >= 1; d--) {
    const base = startOfDay(now - d * DAY);
    const weekend = [0, 5, 6].includes(new Date(base).getDay());
    const n = Math.round(between(9, 17) * (weekend ? 1.4 : 1));
    for (let i = 0; i < n; i++) {
      let r = rand() * HOUR_W.reduce((a, b) => a + b, 0), h = 0;
      for (; h < 24; h++) { r -= HOUR_W[h]; if (r <= 0) break; }
      list.push(closed(base + h * 60 * MIN + Math.floor(rand() * 60) * MIN, rand() > 0.07));
    }
  }
  // hoy: algunos ya entregados y varios nuevos para probar el reparto
  const day0 = startOfDay(now);
  for (let i = 0; i < 5; i++) {
    const t = Math.max(day0, now - (150 - i * 22) * MIN);
    list.push(closed(t, i !== 3));
  }
  for (let i = 0; i < 12; i++) list.push(make({}, now - Math.round(between(1, 40)) * MIN));

  importOrders(list);
  return list.length;
}

export function clearDemo() { clearOrders({ onlyDemo: true }); }
