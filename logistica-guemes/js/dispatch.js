// Lógica de despacho: repartir pedidos entre la flota y armar la ruta de cada repartidor.
import { MAX_PLAN, VEHICLES } from './config.js';
import { getMatrix, getRouteLegs } from './geo.js';
import { assignRoutes, solve } from './solver.js';
import {
  commit, courierById, courierStatus, inZone, invalidateRoute, orderById, setRoute, state
} from './store.js';

export class DispatchError extends Error {}

async function buildRoute(ordered, legs, estimated) {
  const { center } = state.settings, closed = state.settings.roundTrip;
  const seq = [center, ...ordered, ...(closed ? [center] : [])];
  let geometry = seq.map(p => [p.lat, p.lng]), straight = true;
  if (!estimated) {
    const real = await getRouteLegs(seq);
    if (real) { geometry = real.geometry; legs = real.legs; straight = false; }
  }
  return { order: ordered.map(o => o.id), legs, geometry, closed, estimated, straight, stale: false, createdAt: Date.now(), departAt: null };
}

const legsFromMatrix = (matrix, idx, closed) => {
  const path = [0, ...idx, ...(closed ? [0] : [])], legs = [];
  for (let i = 0; i < path.length - 1; i++) legs.push({ dist: matrix.dist[path[i]][path[i + 1]], dur: matrix.dur[path[i]][path[i + 1]] });
  return legs;
};
const subMatrix = (matrix, idx) => {
  const sub = [0, ...idx];
  return sub.map(a => sub.map(b => matrix.dur[a][b]));
};

// Reparte todo lo que todavía no salió entre los repartidores libres y en turno, y arma sus rutas.
export async function autoDispatch() {
  const free = state.couriers.filter(c => c.active && courierStatus(c.id) !== 'en_ruta');
  if (!free.length) throw new DispatchError('No hay repartidores libres en turno. Activá uno en Flota.');
  const freeIds = new Set(free.map(c => c.id));
  const plannable = state.orders.filter(o => inZone(o) && (o.status === 'nuevo' || (o.status === 'asignado' && freeIds.has(o.courierId)))).slice(0, MAX_PLAN);
  if (!plannable.length) throw new DispatchError('No hay pedidos para repartir.');

  const closed = state.settings.roundTrip;
  const pts = [state.settings.center, ...plannable];
  const matrix = await getMatrix(pts);
  const k = Math.min(free.length, plannable.length);
  const groups = assignRoutes({ pts, D: matrix.dur, k, closed, serviceS: state.settings.serviceMin * 60 });
  const crew = [...free].sort((a, b) => VEHICLES[a.vehicle].factor - VEHICLES[b.vehicle].factor).slice(0, k);

  const plans = [];
  for (let g = 0; g < groups.length; g++) {
    const idx = groups[g];
    const perm = solve(subMatrix(matrix, idx), closed);
    const ordered = perm.map(p => idx[p - 1]);
    const orders = ordered.map(i => plannable[i - 1]);
    const route = await buildRoute(orders, legsFromMatrix(matrix, ordered, closed), matrix.estimated);
    plans.push({ courier: crew[g], orders, route });
  }

  // Se aplica todo junto, después de la red, sobre lo que siga existiendo
  const alive = new Set(state.orders.map(o => o.id));
  for (const c of free) delete state.routes[c.id];
  for (const o of plannable) if (alive.has(o.id)) { o.courierId = null; if (o.status !== 'nuevo') { o.status = 'nuevo'; o.history.push({ s: 'nuevo', t: Date.now() }); } }
  let assigned = 0;
  for (const { courier, orders, route } of plans) {
    const ids = orders.filter(o => alive.has(o.id)).map(o => o.id);
    if (ids.length !== orders.length) { route.order = ids; route.stale = true; }
    setRoute(courier.id, route, orders.map(o => o.id));
    for (const id of ids) {
      const o = orderById(id);
      o.courierId = courier.id; o.status = 'asignado'; o.history.push({ s: 'asignado', t: Date.now() });
      assigned++;
    }
  }
  commit();
  return { couriers: plans.length, orders: assigned, estimated: matrix.estimated, straight: plans.some(p => p.route.straight) };
}

// Vuelve a ordenar las paradas de un solo repartidor (después de cambios manuales)
export async function replanCourier(courierId) {
  const c = courierById(courierId);
  if (!c) return null;
  if (courierStatus(courierId) === 'en_ruta') throw new DispatchError(`${c.name} ya salió a repartir.`);
  const mine = state.orders.filter(o => o.courierId === courierId && o.status === 'asignado' && inZone(o));
  if (!mine.length) { delete state.routes[courierId]; commit(); return null; }
  const closed = state.settings.roundTrip;
  const matrix = await getMatrix([state.settings.center, ...mine]);
  const idx = mine.map((_, i) => i + 1);
  const perm = solve(subMatrix(matrix, idx), closed);
  const ordered = perm.map(p => idx[p - 1]);
  const orders = ordered.map(i => mine[i - 1]);
  const route = await buildRoute(orders, legsFromMatrix(matrix, ordered, closed), matrix.estimated);
  setRoute(courierId, route, orders.map(o => o.id));
  commit();
  return { orders: orders.length, estimated: matrix.estimated, straight: route.straight };
}

export { invalidateRoute };
