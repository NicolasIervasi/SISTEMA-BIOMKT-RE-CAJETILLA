// Estado de la app: pedidos, flota, rutas y ajustes. Se guarda en localStorage y avisa a las vistas.
import { BLOCK_M, COURIER_COLORS, DEFAULT_CENTER, DEFAULT_FEES, OPEN_STATUSES, STATUS, STORE_KEY, VEHICLES } from './config.js';
import { clamp, uid } from './fmt.js';
import { distM, ringIndex } from './geomath.js';

export const state = {};
const listeners = new Set();
const DAY = 86400000;

export function freshState() {
  return {
    v: 2,
    settings: {
      center: { ...DEFAULT_CENTER }, radiusBlocks: 11, serviceMin: 4, roundTrip: true, startTime: '', fees: [...DEFAULT_FEES]
    },
    couriers: [
      { id: uid(), name: 'Moto 1', vehicle: 'moto', color: COURIER_COLORS[0], active: true, phone: '' },
      { id: uid(), name: 'Moto 2', vehicle: 'moto', color: COURIER_COLORS[1], active: true, phone: '' }
    ],
    orders: [], routes: {}, seq: 1000
  };
}

function sanitize(raw) {
  const base = freshState();
  if (!raw || typeof raw !== 'object' || raw.v !== 2) return base;
  const s = { ...base, ...raw, settings: { ...base.settings, ...(raw.settings || {}) } };
  const c = s.settings.center;
  if (!Number.isFinite(c?.lat) || !Number.isFinite(c?.lng)) s.settings.center = base.settings.center;
  s.settings.radiusBlocks = clamp(Math.round(Number(s.settings.radiusBlocks)) || 11, 1, 30);
  s.settings.serviceMin = Number.isFinite(Number(s.settings.serviceMin)) ? clamp(Math.round(Number(s.settings.serviceMin)), 0, 30) : 4;
  s.settings.fees = Array.isArray(s.settings.fees) && s.settings.fees.length === 3
    ? s.settings.fees.map(n => Math.max(0, Math.round(Number(n)) || 0)) : base.settings.fees;
  s.couriers = (Array.isArray(s.couriers) ? s.couriers : []).filter(x => x && x.id && x.name)
    .map(x => ({ phone: '', active: true, color: COURIER_COLORS[0], ...x, vehicle: VEHICLES[x.vehicle] ? x.vehicle : 'moto' }));
  const cutoff = Date.now() - 90 * DAY;
  s.orders = (Array.isArray(s.orders) ? s.orders : []).filter(o =>
    o && o.id && Number.isFinite(o.lat) && Number.isFinite(o.lng) && STATUS[o.status] && (o.createdAt || 0) > cutoff)
    .map(o => ({ history: [], amount: 0, fee: 0, payment: 'pagado', courierId: null, ...o }));
  s.routes = s.routes && typeof s.routes === 'object' ? s.routes : {};
  const ids = new Set(s.couriers.map(x => x.id));
  for (const id of Object.keys(s.routes)) if (!ids.has(id)) delete s.routes[id];
  s.seq = Number.isFinite(s.seq) ? s.seq : 1000;
  return s;
}

export function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, sanitize(next));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* sin almacenamiento: sigue andando en memoria */ }
}

let pending = false;
export function commit() {
  save();
  if (pending) return;
  pending = true;
  queueMicrotask(() => { pending = false; listeners.forEach(fn => fn(state)); });
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

replaceState(typeof localStorage === 'undefined' ? null : load());

/* ───────── Selectores ───────── */
export const radiusM = () => state.settings.radiusBlocks * BLOCK_M;
export const inZone = p => distM(state.settings.center, p) <= radiusM() + 1;
export const isOpen = o => OPEN_STATUSES.includes(o.status);
export const isDone = o => o.status === 'entregado' || o.status === 'fallido';
export const orderById = id => state.orders.find(o => o.id === id);
export const courierById = id => state.couriers.find(c => c.id === id);
export const courierOrders = id => state.orders.filter(o => o.courierId === id);
export const ringOf = o => ringIndex(distM(state.settings.center, o), state.settings.radiusBlocks, BLOCK_M);
export const feeFor = p => state.settings.fees[ringIndex(distM(state.settings.center, p), state.settings.radiusBlocks, BLOCK_M)];
export const totalDue = o => (o.amount || 0) + (o.fee || 0);
export const cashDue = o => (o.payment === 'efectivo' ? totalDue(o) : 0);

// libre: sin pedidos abiertos · asignado: tiene pedidos pero no salió · en_ruta: ya salió
export function courierStatus(id) {
  const mine = courierOrders(id).filter(isOpen);
  if (!mine.length) return 'libre';
  return mine.some(o => o.status === 'en_camino') ? 'en_ruta' : 'asignado';
}

/* ───────── Pedidos ───────── */
export function buildOrder(d) {
  const now = d.createdAt || Date.now();
  const code = ++state.seq;
  return {
    id: uid(), code,
    name: (d.name || '').trim() || `Pedido ${code}`,
    phone: (d.phone || '').trim(), address: d.address, notes: (d.notes || '').trim(),
    lat: d.lat, lng: d.lng, approx: !!d.approx,
    amount: Math.max(0, Math.round(Number(d.amount)) || 0),
    payment: d.payment === 'efectivo' ? 'efectivo' : 'pagado',
    fee: d.fee ?? feeFor(d),
    status: 'nuevo', courierId: null, createdAt: now, history: [{ s: 'nuevo', t: now }],
    ...(d.demo ? { demo: true } : {})
  };
}
export function addOrder(d) {
  const o = buildOrder(d);
  state.orders.push(o);
  commit();
  return o;
}
// Carga varios pedidos ya armados (datos de demo, importaciones) con un solo guardado
export function importOrders(list) {
  state.orders.push(...list);
  commit();
}

export function updateOrder(id, patch) {
  const o = orderById(id);
  if (!o) return;
  const keep = ['name', 'phone', 'notes', 'address'];
  for (const k of keep) if (patch[k] !== undefined) o[k] = String(patch[k]).trim();
  if (patch.amount !== undefined) o.amount = Math.max(0, Math.round(Number(patch.amount)) || 0);
  if (patch.payment !== undefined) o.payment = patch.payment === 'efectivo' ? 'efectivo' : 'pagado';
  if (patch.lat !== undefined && patch.lng !== undefined) {
    o.lat = patch.lat; o.lng = patch.lng; o.approx = false;
    if (o.status === 'nuevo' || o.status === 'asignado') o.fee = feeFor(o);
    if (o.courierId) invalidateRoute(o.courierId);
  }
  commit();
}

function pushHistory(o, s, t = Date.now()) { o.status = s; o.history.push({ s, t }); }

export function invalidateRoute(courierId, removeOrderId) {
  const r = state.routes[courierId];
  if (!r) return;
  if (removeOrderId) r.order = r.order.filter(x => x !== removeOrderId);
  r.stale = true;
}
function dropRouteIfIdle(courierId) {
  if (courierId && !courierOrders(courierId).some(isOpen)) delete state.routes[courierId];
}

export function assignOrder(id, courierId) {
  const o = orderById(id);
  if (!o || !(o.status === 'nuevo' || o.status === 'asignado')) return false;
  const prev = o.courierId;
  if (prev && prev !== courierId) { invalidateRoute(prev, id); }
  if (courierId) {
    o.courierId = courierId;
    if (o.status !== 'asignado') pushHistory(o, 'asignado');
    invalidateRoute(courierId);
  } else {
    o.courierId = null;
    if (o.status !== 'nuevo') pushHistory(o, 'nuevo');
  }
  dropRouteIfIdle(prev);
  commit();
  return true;
}

export function setStatus(id, status, extra = {}) {
  const o = orderById(id);
  if (!o || !STATUS[status] || o.status === status) return;
  const now = Date.now(), prevCourier = o.courierId;
  if (status === 'entregado' || status === 'fallido') {
    const c = courierById(o.courierId);
    pushHistory(o, status, now);
    o.doneAt = now;
    if (c) o.courierName = c.name;
    if (status === 'fallido') o.failReason = extra.reason || 'Otro';
    dropRouteIfIdle(prevCourier);
  } else if (status === 'nuevo') {
    if (prevCourier) invalidateRoute(prevCourier, id);
    o.courierId = null;
    delete o.doneAt; delete o.failReason;
    pushHistory(o, 'nuevo', now);
    dropRouteIfIdle(prevCourier);
  } else {                                   // reabrir (asignado / en_camino)
    delete o.doneAt; delete o.failReason;
    pushHistory(o, o.courierId ? 'asignado' : 'nuevo', now);
    const r = state.routes[o.courierId];
    if (o.courierId && !(r && r.order.includes(id))) invalidateRoute(o.courierId);   // si sigue en su ruta, el orden no cambia
  }
  commit();
}

export function removeOrder(id) {
  const o = orderById(id);
  if (!o) return;
  state.orders = state.orders.filter(x => x.id !== id);
  if (o.courierId) { invalidateRoute(o.courierId, id); dropRouteIfIdle(o.courierId); }
  commit();
}

/* ───────── Flota ───────── */
export function addCourier({ name, vehicle = 'moto', phone = '' }) {
  const used = new Set(state.couriers.map(c => c.color));
  const color = COURIER_COLORS.find(c => !used.has(c)) || COURIER_COLORS[state.couriers.length % COURIER_COLORS.length];
  const c = { id: uid(), name: name.trim() || `Repartidor ${state.couriers.length + 1}`, vehicle: VEHICLES[vehicle] ? vehicle : 'moto', color, active: true, phone: phone.trim() };
  state.couriers.push(c);
  commit();
  return c;
}
export function updateCourier(id, patch) {
  const c = courierById(id);
  if (!c) return;
  if (patch.name !== undefined) c.name = String(patch.name).trim() || c.name;
  if (patch.vehicle !== undefined && VEHICLES[patch.vehicle]) c.vehicle = patch.vehicle;
  if (patch.phone !== undefined) c.phone = String(patch.phone).trim();
  if (patch.color !== undefined) c.color = patch.color;
  if (patch.active !== undefined) c.active = !!patch.active;
  if (patch.vehicle !== undefined) invalidateRoute(id);    // cambia la velocidad: los horarios ya no valen
  commit();
}
export function removeCourier(id) {
  for (const o of courierOrders(id)) {
    if (o.status === 'asignado' || o.status === 'en_camino') { o.courierId = null; pushHistory(o, 'nuevo'); }
  }
  state.couriers = state.couriers.filter(c => c.id !== id);
  delete state.routes[id];
  commit();
}

/* ───────── Rutas ───────── */
export function setRoute(courierId, route, orderedIds) {
  state.routes[courierId] = route;
  route.legs.forEach((leg, i) => {
    const o = orderById(orderedIds[i]);
    if (o) o.legKm = leg.dist / 1000;
  });
}

export function departCourier(courierId) {
  const mine = state.orders.filter(o => o.courierId === courierId && o.status === 'asignado');
  if (!mine.length) return false;
  const now = Date.now(), r = state.routes[courierId];
  if (r) {
    const known = new Set(r.order);
    const extra = mine.filter(o => !known.has(o.id));
    if (extra.length) { r.order.push(...extra.map(o => o.id)); r.stale = true; }
    r.departAt = now;
  }
  for (const o of mine) { pushHistory(o, 'en_camino', now); o.departedAt = now; }
  commit();
  return true;
}

/* ───────── Ajustes y datos ───────── */
export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  commit();
}
export function invalidateAllRoutes() {
  for (const id of Object.keys(state.routes)) state.routes[id].stale = true;
}
export function clearOrders({ onlyDemo = false, onlyDone = false } = {}) {
  state.orders = state.orders.filter(o => {
    if (onlyDemo) return !o.demo;
    if (onlyDone) return !isDone(o);
    return false;
  });
  for (const id of Object.keys(state.routes)) {
    const ids = new Set(state.orders.map(o => o.id));
    state.routes[id].order = state.routes[id].order.filter(x => ids.has(x));
    if (!courierOrders(id).some(isOpen)) delete state.routes[id];
    else state.routes[id].stale = true;
  }
  commit();
}
export function exportJSON() { return JSON.stringify(state, null, 1); }
export function importJSON(text) {
  const raw = JSON.parse(text);
  if (!raw || raw.v !== 2 || !Array.isArray(raw.orders)) throw new Error('Archivo de respaldo inválido.');
  replaceState(raw);
  commit();
}
export function resetAll() {
  replaceState(null);
  commit();
}
export { DEFAULT_CENTER };
