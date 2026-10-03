// Horarios y resúmenes de la ruta de cada repartidor, derivados del estado (no se guardan).
import { VEHICLES } from './config.js';
import { todayAt } from './fmt.js';
import { courierById, isDone, orderById, state } from './store.js';

export function vehicleFactor(courierId) {
  const c = courierById(courierId);
  return VEHICLES[c?.vehicle]?.factor ?? 1;
}

// Núcleo puro. legs[i] es el tramo que termina en order[i]; con vuelta hay un tramo más.
// stateOf(id) -> { done, doneAt } | null. Si el repartidor ya salió, parte de lo realmente entregado y nunca de una hora pasada.
export function computeEtas({ order, legs, closed, factor = 1, serviceMs = 0, start, departAt = null, stateOf, now = Date.now() }) {
  if (legs.length !== order.length + (closed ? 1 : 0)) return null;
  const etas = new Map();
  let t = start, prevPending = false, first = true, pending = 0;
  order.forEach((id, i) => {
    const s = stateOf(id);
    if (!s) return;
    if (s.done) { if (s.doneAt) t = Math.max(t, s.doneAt); prevPending = false; return; }
    if (prevPending) t += serviceMs;
    t += legs[i].dur * factor * 1000;
    if (departAt && first) t = Math.max(t, now);
    first = false; prevPending = true; pending++;
    etas.set(id, t);
  });
  if (prevPending) t += serviceMs;
  const end = closed && pending ? t + legs[order.length].dur * factor * 1000 : t;
  const dist = legs.reduce((a, l) => a + l.dist, 0);
  return { etas, start, end, dist, stops: order.length, pending, total: (end - start) / 1000 };
}

// null cuando la ruta no existe o quedó desactualizada.
export function etaPlan(courierId, now = Date.now()) {
  const r = state.routes[courierId];
  if (!r || r.stale) return null;
  return computeEtas({
    order: r.order, legs: r.legs, closed: r.closed, factor: vehicleFactor(courierId), serviceMs: state.settings.serviceMin * 60000,
    start: r.departAt || (state.settings.startTime ? todayAt(state.settings.startTime) : r.createdAt), departAt: r.departAt, now,
    stateOf: id => { const o = orderById(id); return o ? { done: isDone(o), doneAt: o.doneAt } : null; }
  });
}
