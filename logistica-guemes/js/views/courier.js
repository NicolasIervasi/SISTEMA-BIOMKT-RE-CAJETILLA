// Modo repartidor: pantalla de celular con la próxima parada, navegación, aviso al cliente y entrega.
// Dos orígenes de datos con la misma interfaz: la flota del despacho (local) o una ruta recibida por link (link).
import { BRAND, COURIER_KEY, FALLBACK_DETOUR, FALLBACK_SPEED, VEHICLES } from '../config.js';
import { $, el, icon, toast } from '../dom.js';
import { fmtDist, fmtDur, fmtMoney, fmtTime, startOfDay, waLink } from '../fmt.js';
import { getRouteLegs } from '../geo.js';
import { distM } from '../geomath.js';
import { createMap } from '../map.js';
import { computeEtas, etaPlan } from '../plan.js';
import { decodePayload } from '../share.js';
import * as store from '../store.js';
import { failDialog } from './dialogs.js';

const ARRIVED_M = 40;
const pendingStatus = s => s.status === 'asignado' || s.status === 'en_camino';

/* ───────── Origen: flota del despacho ───────── */
function localSource(courierId) {
  const c = store.courierById(courierId);
  if (!c) return null;
  return {
    kind: 'local', courier: c,
    get depot() { return store.state.settings.center; },
    get closed() { return !!(store.state.routes[courierId]?.closed ?? store.state.settings.roundTrip); },
    stops() {
      const r = store.state.routes[courierId], today = startOfDay();
      const at = o => { const i = r ? r.order.indexOf(o.id) : -1; return i < 0 ? 1e6 : i; };
      return store.state.orders
        .filter(o => o.courierId === courierId && (store.isOpen(o) || (store.isDone(o) && (o.doneAt ?? 0) >= today)))
        .sort((a, b) => at(a) - at(b) || a.createdAt - b.createdAt)
        .map(o => ({ id: o.id, code: o.code, name: o.name, address: o.address, phone: o.phone, notes: o.notes, lat: o.lat, lng: o.lng, due: store.totalDue(o), cash: o.payment === 'efectivo', status: o.status, doneAt: o.doneAt, failReason: o.failReason }));
    },
    plan: () => etaPlan(courierId),
    geometry: () => store.state.routes[courierId]?.geometry ?? null,
    departed() { return this.stops().some(s => s.status !== 'asignado'); },
    depart: () => store.departCourier(courierId),
    complete: (id, status, reason) => store.setStatus(id, status, { reason }),
    reopen: id => store.setStatus(id, 'asignado'),
    subscribe: fn => store.subscribe(fn)
  };
}

/* ───────── Origen: ruta recibida por link (vive en el celular del repartidor) ───────── */
let session = null;
const sessionListeners = new Set();
function loadSession() { try { session = JSON.parse(localStorage.getItem(COURIER_KEY) || 'null'); } catch { session = null; } }
function saveSession() {
  try { localStorage.setItem(COURIER_KEY, JSON.stringify(session)); } catch { /* sin almacenamiento */ }
  sessionListeners.forEach(f => f());
}

export async function importLink(str) {
  try {
    const p = await decodePayload(str);
    const stops = p.s.map(a => ({
      id: 'L' + a[0], code: a[0], name: a[1], address: a[2], phone: a[3], notes: a[4], lat: a[5], lng: a[6], due: a[7], cash: !!a[8],
      leg: a[9] != null ? { dur: a[9], dist: a[10] } : null, status: 'asignado'
    }));
    let prev = p.d;
    for (const s of stops) {                                  // tramos que faltan: estimación en línea recta
      if (!s.leg) { const d = distM(prev, s) * FALLBACK_DETOUR; s.leg = { dist: d, dur: d / FALLBACK_SPEED }; }
      prev = s;
    }
    let ret = p.lr ? { dur: p.lr[0], dist: p.lr[1] } : null;
    if (p.rt && !ret) { const d = distM(prev, p.d) * FALLBACK_DETOUR; ret = { dist: d, dur: d / FALLBACK_SPEED }; }
    session = { v: 1, courier: p.c, depot: p.d, closed: !!p.rt, factor: p.f || 1, serviceMin: p.sv ?? 4, stops, ret, departAt: null, geometry: null, importedAt: Date.now() };
    saveSession();
    refreshGeometry();
    return true;
  } catch {
    toast('El link de la ruta no es válido o llegó incompleto.', 'err', 6000);
    return false;
  }
}

async function refreshGeometry() {
  const stamp = session.importedAt;
  const seq = [session.depot, ...session.stops, ...(session.closed ? [session.depot] : [])];
  const real = await getRouteLegs(seq);
  if (!real || !session || session.importedAt !== stamp) return;      // otra ruta se importó mientras tanto
  session.geometry = real.geometry;
  session.stops.forEach((st, i) => { st.leg = real.legs[i]; });
  if (session.closed) session.ret = real.legs[session.stops.length];
  saveSession();
}

function linkSource() {
  if (!session) loadSession();
  if (!session?.stops?.length) return null;
  const find = id => session.stops.find(s => s.id === id);
  return {
    kind: 'link', courier: session.courier, depot: session.depot, closed: !!session.closed,
    stops: () => session.stops,
    plan: () => computeEtas({
      order: session.stops.map(s => s.id), legs: [...session.stops.map(s => s.leg), ...(session.closed && session.ret ? [session.ret] : [])],
      closed: !!(session.closed && session.ret), factor: session.factor, serviceMs: session.serviceMin * 60000,
      start: session.departAt || session.importedAt, departAt: session.departAt,
      stateOf: id => { const s = find(id); return s ? { done: !pendingStatus(s), doneAt: s.doneAt } : null; }
    }),
    geometry: () => session.geometry,
    departed: () => !!session.departAt,
    depart() { session.departAt = Date.now(); session.stops.forEach(s => { if (s.status === 'asignado') s.status = 'en_camino'; }); saveSession(); },
    complete(id, status, reason) { const s = find(id); if (s) { s.status = status; s.doneAt = Date.now(); if (reason) s.failReason = reason; saveSession(); } },
    reopen(id) { const s = find(id); if (s) { s.status = session.departAt ? 'en_camino' : 'asignado'; delete s.doneAt; delete s.failReason; saveSession(); } },
    subscribe: fn => { sessionListeners.add(fn); return () => sessionListeners.delete(fn); }
  };
}

/* ───────── Vista ───────── */
let src = null, mapCtl = null, unsub = null, timer = null, watchId = null, me = null, focusId = null, lastNext = null;
const els = {};

export function open(id) {
  close();
  src = id === 'link' ? linkSource() : localSource(id);
  if (!src) return false;
  build();
  unsub = src.subscribe(render);
  timer = setInterval(render, 30000);
  render();
  setTimeout(() => { mapCtl?.invalidate(); fitNow(false); }, 0);
  return true;
}
export function close() {
  stopGps();
  unsub?.(); clearInterval(timer);
  mapCtl?.destroy(); mapCtl = null; src = null; focusId = null; lastNext = null;
  $('#courierRoot').replaceChildren();
}

function build() {
  const c = src.courier;
  els.title = el('div', { class: 'cv-title' });
  els.gps = el('button', { class: 'btn sm', type: 'button', 'aria-pressed': 'false', onclick: toggleGps }, icon('locate', 'sm'), 'Mi ubicación');
  const head = el('header', { class: 'cv-head', style: { '--c': /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#4f46e5' } },
    src.kind === 'local' ? el('a', { class: 'iconbtn', href: '#/', 'aria-label': 'Volver al despacho' }, icon('back')) : el('img', { src: 'icon.svg', alt: '', width: '30', height: '30', style: { 'border-radius': '8px' } }),
    els.title, els.gps);
  els.map = el('div', { class: 'mapbox' });
  els.sheet = el('div', { class: 'cv-sheet' });
  $('#courierRoot').replaceChildren(el('div', { class: 'cv' }, head, el('div', { class: 'cv-map' }, els.map), els.sheet));
  mapCtl = createMap(els.map, {});
}

function render() {
  if (!src) return;
  const stops = src.stops(), plan = src.plan();
  const pending = stops.filter(pendingStatus), finished = stops.filter(s => !pendingStatus(s));
  const c = src.courier;
  els.title.replaceChildren(el('b', { text: c.name }), el('span', { text: `${VEHICLES[c.vehicle]?.label || ''} · ${finished.length} de ${stops.length} entregas` }));
  renderSheet(stops, pending, finished, plan);
  renderMap(stops, pending);
}

const nextOf = pending => (focusId && pending.find(s => s.id === focusId)) || pending[0];

function renderSheet(stops, pending, finished, plan) {
  const sheet = els.sheet, departed = src.departed();
  const out = [];
  if (!stops.length) {
    out.push(el('div', { class: 'empty' }, el('h3', { text: 'Sin paradas' }), el('p', { text: 'No hay pedidos asignados a este repartidor.' })));
  } else if (!pending.length) {
    out.push(summaryCard(finished));
  } else if (!departed) {
    out.push(startCard(pending, plan));
    out.push(el('h3', { class: 'cv-h', text: 'Paradas en orden' }));
    pending.forEach((s, i) => out.push(stopRow(s, i + 1, plan)));
  } else {
    out.push(progressBar(finished.length, stops.length, plan));
    const next = nextOf(pending);
    out.push(nextCard(next, stops.indexOf(next) + 1, stops.length, plan));
    const rest = pending.filter(s => s !== next);
    if (rest.length) {
      out.push(el('h3', { class: 'cv-h', text: `Después (${rest.length})` }));
      rest.forEach(s => out.push(stopRow(s, stops.indexOf(s) + 1, plan, true)));
    }
  }
  if (finished.length && pending.length) {
    out.push(el('details', { class: 'cv-done' }, el('summary', { text: `Hechas (${finished.length})` }), finished.map(s => doneRow(s))));
  }
  if (src.kind === 'link') out.push(el('p', { class: 'note', text: 'Ruta enviada por el despacho. Lo que marques queda en este celular.' }));
  sheet.replaceChildren(...out);
}

function startCard(pending, plan) {
  const stat = (v, l) => el('div', {}, el('b', { text: v }), el('span', { text: l }));
  return el('div', { class: 'card cv-start' },
    el('h2', { text: `${pending.length} parada${pending.length > 1 ? 's' : ''} para hoy` }),
    el('div', { class: 'summary3' },
      stat(pending.length, 'paradas'), stat(plan ? fmtDist(plan.dist) : '—', 'recorrido'), stat(plan ? fmtDur(plan.total) : '—', 'tiempo total')),
    el('button', { class: 'btn primary lg block', type: 'button', onclick: () => { src.depart(); toast('¡Buen reparto!', 'ok'); fitNow(); } }, icon('play'), 'Salir a repartir'));
}

function progressBar(done, total, plan) {
  return el('div', { class: 'cv-progress' },
    el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) }, el('i', { style: { width: `${total ? (done / total) * 100 : 0}%` } })),
    el('span', { text: plan?.pending ? `${done} de ${total} · ${src.closed ? 'vuelta' : 'fin'} ~${fmtTime(plan.end)}` : `${done} de ${total}` }));
}

function nextCard(s, n, total, plan) {
  const eta = plan?.etas.get(s.id);
  const near = me ? distM(me, s) : null, arrived = near != null && near <= ARRIVED_M;
  const first = (s.name || '').split(' ')[0];
  const mode = VEHICLES[src.courier.vehicle]?.mode || 'driving';
  const link = (href, ico, text, extra = {}) => el('a', { class: 'btn', href, target: '_blank', rel: 'noopener', ...extra }, icon(ico, 'sm'), text);
  const tel = (s.phone || '').replace(/[^\d+]/g, '');
  return el('div', { class: 'card cv-next' + (arrived ? ' arrived' : '') },
    el('div', { class: 'cv-next-top' },
      el('span', { class: 'pill en_camino', text: focusId === s.id ? 'Parada elegida' : 'Siguiente parada' }),
      el('span', { class: 'muted', text: `#${s.code} · ${n} de ${total}` }),
      eta ? el('span', { class: 'tag eta' }, icon('clock', 'sm'), `~${fmtTime(eta)}`) : null),
    el('h2', { class: 'cv-addr', text: s.address }),
    el('div', { class: 'cv-name', text: s.name }),
    s.notes ? el('div', { class: 'cv-notes' }, icon('alert', 'sm'), s.notes) : null,
    el('div', { class: 'cv-pay ' + (s.cash ? 'cash' : 'paid') },
      s.cash ? [icon('wallet'), el('span', {}, 'Cobrar ', el('b', { text: fmtMoney(s.due) }), ' en efectivo')] : [icon('check'), el('span', { text: 'Ya pagado: no cobrar' })]),
    near != null ? el('div', { class: 'cv-near', text: arrived ? '¡Llegaste! Confirmá la entrega.' : `A ${fmtDist(near)} en línea recta` }) : null,
    el('div', { class: 'cv-grid' },
      link(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=${mode}`, 'nav', 'Google Maps'),
      link(`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`, 'nav', 'Waze'),
      tel ? link('tel:' + tel, 'phone', 'Llamar') : el('span', { class: 'btn', 'aria-disabled': 'true' }, icon('phone', 'sm'), 'Sin teléfono'),
      link(waLink(s.phone, `Hola ${first}! Soy ${src.courier.name} de ${BRAND}, estoy llegando con tu pedido #${s.code}.`), 'msg', 'Avisar que llego')),
    el('div', { class: 'cv-actions' },
      el('button', { class: 'btn good lg', type: 'button', onclick: () => finish(s, 'entregado') }, icon('check'), 'Entregado'),
      el('button', { class: 'btn lg danger', type: 'button', onclick: () => finish(s, 'fallido') }, icon('x'), 'No pude entregar')));
}

function stopRow(s, n, plan, canFocus = false) {
  const eta = plan?.etas.get(s.id);
  return el('div', { class: 'cv-row' },
    el('span', { class: 'cv-n', text: n }),
    el('div', { class: 'grow' }, el('b', { text: s.address }), el('div', { class: 'note', text: `${s.name}${s.cash ? ' · cobrar ' + fmtMoney(s.due) : ''}` })),
    eta ? el('span', { class: 'tag eta', text: `~${fmtTime(eta)}` }) : null,
    canFocus ? el('button', { class: 'btn sm', type: 'button', onclick: () => { focusId = s.id; render(); fitNow(); } }, 'Ir primero') : null);
}

function doneRow(s) {
  return el('div', { class: 'cv-row done' },
    el('span', { class: 'pill ' + s.status, text: s.status === 'entregado' ? 'Entregado' : 'No entregado' }),
    el('div', { class: 'grow' }, el('b', { text: s.address }), el('div', { class: 'note', text: `${s.name}${s.failReason ? ' · ' + s.failReason : ''}` })),
    el('button', { class: 'btn sm', type: 'button', onclick: () => src.reopen(s.id) }, icon('undo', 'sm'), 'Reabrir'));
}

function summaryCard(finished) {
  const ok = finished.filter(s => s.status === 'entregado'), bad = finished.filter(s => s.status === 'fallido');
  const cash = ok.filter(s => s.cash).reduce((a, s) => a + s.due, 0);
  const text = [
    `Resumen de ${src.courier.name} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    `Entregados: ${ok.length} · No entregados: ${bad.length}`,
    `Efectivo a rendir: ${fmtMoney(cash)}`,
    ...bad.map(s => `✕ #${s.code} ${s.address}${s.failReason ? ' (' + s.failReason + ')' : ''}`)
  ].join('\n');
  const stat = (v, l) => el('div', {}, el('b', { text: v }), el('span', { text: l }));
  return el('div', { class: 'card cv-start' },
    el('h2', { text: '¡Ruta completa!' }),
    el('div', { class: 'summary3' }, stat(ok.length, 'entregados'), stat(bad.length, 'no entregados'), stat(fmtMoney(cash), 'efectivo a rendir')),
    el('a', { class: 'btn primary lg block', href: 'https://wa.me/?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener' }, icon('msg'), 'Enviar resumen al local'),
    src.kind === 'local' ? el('a', { class: 'btn block', href: '#/' }, 'Volver al despacho') : null,
    finished.length ? el('details', { class: 'cv-done', open: true }, el('summary', { text: `Detalle (${finished.length})` }), finished.map(s => doneRow(s))) : null);
}

async function finish(s, status) {
  if (status === 'fallido') {
    const reason = await failDialog({ code: s.code, name: s.name });
    if (!reason) return;
    src.complete(s.id, 'fallido', reason);
    toast(`#${s.code} marcado como no entregado.`, 'warn');
  } else {
    src.complete(s.id, 'entregado');
    toast(`#${s.code} entregado ✓`, 'ok');
  }
  focusId = null;
  fitNow();
}

/* ───────── Mapa y ubicación ───────── */
function renderMap(stops, pending) {
  const c = src.courier, color = c.color;
  mapCtl.drawZone({ center: src.depot, radiusBlocks: store.state.settings.radiusBlocks });
  const geo = src.geometry();
  mapCtl.drawRoutes(geo?.length ? [{ id: 'r', color, geometry: geo, straight: false }] : pending.length ? [{ id: 'r', color, straight: true, geometry: [[src.depot.lat, src.depot.lng], ...pending.map(s => [s.lat, s.lng]), ...(src.closed ? [[src.depot.lat, src.depot.lng]] : [])] }] : []);
  const next = pending.length ? nextOf(pending) : null;
  mapCtl.drawPins(stops.map((s, i) => ({
    id: s.id, lat: s.lat, lng: s.lng, color,
    kind: s.status === 'entregado' ? 'done' : s.status === 'fallido' ? 'fail' : s.status === 'en_camino' ? 'out' : '',
    label: s.status === 'entregado' ? '✓' : s.status === 'fallido' ? '✕' : String(i + 1),
    selected: next?.id === s.id, title: `#${s.code} · ${s.name}`, sub: s.address
  })), {});
  if (me) mapCtl.setMe(me);
  const key = next?.id ?? null;
  if (key !== lastNext) { lastNext = key; if (key) fitNow(); }
}

function fitNow(animate = true) {
  if (!mapCtl || !src) return;
  const pending = src.stops().filter(pendingStatus);
  const next = pending.length ? nextOf(pending) : null;
  if (src.departed() && next) mapCtl.fitPoints([[next.lat, next.lng], ...(me ? [[me.lat, me.lng]] : [[src.depot.lat, src.depot.lng]])], { animate, maxZoom: 17 });
  else mapCtl.fitPoints([[src.depot.lat, src.depot.lng], ...pending.map(s => [s.lat, s.lng])], { animate });
}

function stopGps() {
  if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null; me = null; mapCtl?.setMe(null);
  els.gps?.setAttribute('aria-pressed', 'false');
}
function toggleGps() {
  if (watchId != null) { stopGps(); render(); return; }
  if (!navigator.geolocation) { toast('Este dispositivo no permite usar la ubicación.', 'err'); return; }
  els.gps.setAttribute('aria-pressed', 'true');
  watchId = navigator.geolocation.watchPosition(p => {
    me = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    mapCtl.setMe(me);
    if (src) { const stops = src.stops(); renderSheet(stops, stops.filter(pendingStatus), stops.filter(s => !pendingStatus(s)), src.plan()); }
  }, err => {
    toast(err.code === 1 ? 'Permiso de ubicación denegado.' : 'No pude obtener tu ubicación.', 'err');
    stopGps();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
