// Consola de despacho: pedidos y flota a la izquierda, mapa a la derecha.
import { BRAND, STATUS, VEHICLES } from '../config.js';
import { $, el, icon, toast } from '../dom.js';
import { fmtBlocks, fmtDist, fmtDur, fmtMoney, fmtTime, startOfDay, waLink } from '../fmt.js';
import { loadDemo } from '../demo.js';
import { DispatchError, autoDispatch, replanCourier } from '../dispatch.js';
import { distM, ringLabel } from '../geomath.js';
import { createMap } from '../map.js';
import { etaPlan } from '../plan.js';
import * as store from '../store.js';
import { courierDialog, editOrderDialog, failDialog, orderDialog, shareDialog } from './dialogs.js';

const { state } = store;
export const title = 'Despacho';

const ui = { tab: 'pedidos', filter: 'todos', courierFilter: null, selectedId: null, pick: null, busy: false };
let root, mapCtl, unsub, timer, pendingPick = null;
const parts = {};

// Settings pide mover el centro desde el mapa: la vista lo toma al montarse
export function requestCenterPick() { pendingPick = 'center'; location.hash = '#/'; }

export function subtitle() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase());
}

/* ───────── Montaje ───────── */
export function mount(container) {
  parts.tabPedidos = el('button', { role: 'tab', type: 'button', onclick: () => setTab('pedidos') });
  parts.tabFlota = el('button', { role: 'tab', type: 'button', onclick: () => setTab('flota') });
  parts.cta = el('div', { class: 'cta-row' });
  parts.chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar pedidos' });
  parts.head = el('div', { class: 'panel-head' }, el('div', { class: 'tabs', role: 'tablist' }, parts.tabPedidos, parts.tabFlota), parts.cta, parts.chips);
  parts.body = el('div', { class: 'panel-body' });
  parts.mapbox = el('div', { class: 'mapbox' });
  parts.legend = el('div', { class: 'maplegend', 'aria-label': 'Tarifas por distancia' });
  parts.hintText = el('span');
  parts.hint = el('div', { class: 'maphint', hidden: true, role: 'status' }, parts.hintText, el('button', { class: 'btn sm', type: 'button', text: 'Cancelar', onclick: endPick }));
  parts.tools = el('div', { class: 'maptools' },
    el('button', { class: 'btn sm', type: 'button', onclick: () => mapCtl.fitZone() }, icon('map', 'sm'), 'Toda la zona'),
    el('button', { class: 'btn sm', type: 'button', onclick: fitRoutes }, icon('truck', 'sm'), 'Rutas'));

  root = el('section', { class: 'view dispatch' },
    el('aside', { class: 'panel', 'aria-label': 'Pedidos y flota' }, parts.head, parts.body),
    el('div', { class: 'mapwrap' }, parts.mapbox, parts.legend, parts.tools, parts.hint));
  container.replaceChildren(root);

  mapCtl = createMap(parts.mapbox, { onClick: onMapClick });
  unsub = store.subscribe(render);
  timer = setInterval(() => { if (!document.activeElement?.closest?.('select, input, textarea')) render(); }, 60000);
  document.addEventListener('keydown', onKey);
  render();
  mapCtl.fitZone(false);
  if (pendingPick === 'center') { pendingPick = null; startPick('Tocá el mapa donde queda el local', pickCenter); }
}
export function unmount() {
  unsub?.(); clearInterval(timer); document.removeEventListener('keydown', onKey);
  mapCtl?.destroy(); mapCtl = null;
}
export function onShow() { mapCtl?.invalidate(); }

function onKey(e) {
  if (e.key === 'Escape' && ui.pick) endPick();
  else if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !document.querySelector('dialog[open]') && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); newOrder(); }
}

/* ───────── Datos derivados ───────── */
function context() {
  const plans = new Map(state.couriers.map(c => [c.id, etaPlan(c.id)]));
  const pos = o => { const r = state.routes[o.courierId]; const i = r ? r.order.indexOf(o.id) : -1; return i >= 0 ? i + 1 : 0; };
  return { plans, pos };
}
const rank = { nuevo: 0, asignado: 1, en_camino: 2, entregado: 3, fallido: 3 };
function baseOrders() {
  const today = startOfDay();
  return state.orders.filter(o => store.isOpen(o) || (o.doneAt ?? 0) >= today);
}
function shownOrders(ctx) {
  let list = baseOrders();
  if (ui.courierFilter) list = list.filter(o => o.courierId === ui.courierFilter);
  const counts = { todos: list.length };
  for (const s of Object.keys(STATUS)) counts[s] = list.filter(o => o.status === s).length;
  if (ui.filter !== 'todos') list = list.filter(o => o.status === ui.filter);
  const ci = id => state.couriers.findIndex(c => c.id === id);
  list.sort((a, b) =>
    rank[a.status] - rank[b.status]
    || (store.isDone(a) ? (b.doneAt - a.doneAt) : (ci(a.courierId) - ci(b.courierId)) || (ctx.pos(a) - ctx.pos(b)) || (a.createdAt - b.createdAt)));
  return { list, counts };
}
const plannableCount = () => {
  const busy = new Set(state.couriers.filter(c => store.courierStatus(c.id) === 'en_ruta').map(c => c.id));
  return state.orders.filter(o => store.inZone(o) && (o.status === 'nuevo' || (o.status === 'asignado' && !busy.has(o.courierId)))).length;
};

/* ───────── Render ───────── */
function render() {
  if (!root) return;
  const ctx = context();
  renderKpis();
  renderHead(ctx);
  if (ui.tab === 'pedidos') renderOrders(ctx); else renderFleet(ctx);
  renderMap(ctx);
  renderLegend();
}

function renderKpis() {
  const today = startOfDay();
  const done = state.orders.filter(o => o.status === 'entregado' && (o.doneAt ?? 0) >= today);
  const k = (value, label) => el('div', { class: 'kpi' }, el('b', { text: value }), el('span', { text: label }));
  $('#kpis').replaceChildren(
    k(state.orders.filter(store.isOpen).length, 'Activos'),
    k(state.orders.filter(o => o.status === 'en_camino').length, 'En camino'),
    k(done.length, 'Entregados hoy'),
    k(fmtMoney(done.reduce((a, o) => a + o.fee, 0)), 'Envíos hoy'));
}

function renderHead(ctx) {
  const open = state.orders.filter(store.isOpen).length;
  parts.tabPedidos.replaceChildren('Pedidos ', el('span', { class: 'count', text: open }));
  parts.tabFlota.replaceChildren('Flota ', el('span', { class: 'count', text: state.couriers.filter(c => c.active).length }));
  parts.tabPedidos.setAttribute('aria-selected', String(ui.tab === 'pedidos'));
  parts.tabFlota.setAttribute('aria-selected', String(ui.tab === 'flota'));
  const onOrders = ui.tab === 'pedidos' && state.orders.length > 0;
  parts.cta.hidden = !onOrders; parts.chips.hidden = !onOrders;
  if (!onOrders) return;
  const n = plannableCount();
  const repartir = el('button', { class: 'btn soft', type: 'button', disabled: ui.busy || !n, onclick: dispatchAll },
    icon('zap', 'sm'), ui.busy ? 'Calculando…' : n ? `Repartir ${n}` : 'Repartir');
  parts.cta.replaceChildren(el('button', { class: 'btn primary', type: 'button', onclick: newOrder }, icon('plus', 'sm'), 'Nuevo pedido'), repartir);
  const { counts } = shownOrders(ctx);
  const chip = (key, label) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(ui.filter === key), onclick: () => { ui.filter = key; render(); } }, label, ' ', el('b', { text: counts[key] }));
  const chips = [chip('todos', 'Todos'), chip('nuevo', 'Nuevos'), chip('asignado', 'Asignados'), chip('en_camino', 'En camino'), chip('entregado', 'Entregados'), chip('fallido', 'No entregados')];
  if (ui.courierFilter) {
    const c = store.courierById(ui.courierFilter);
    if (c) chips.unshift(el('button', { class: 'chip', type: 'button', 'aria-pressed': 'true', 'aria-label': `Quitar filtro ${c.name}`, onclick: () => { ui.courierFilter = null; render(); } }, el('span', { class: 'dot', style: { '--c': c.color } }), c.name, icon('x', 'sm')));
  }
  parts.chips.replaceChildren(...chips);
}

/* ───────── Pedidos ───────── */
function renderOrders(ctx) {
  const body = parts.body;
  if (!state.orders.length) { body.replaceChildren(emptyState()); return; }
  const { list } = shownOrders(ctx);
  if (!list.length) { body.replaceChildren(el('div', { class: 'empty' }, el('h3', { text: 'Nada por acá' }), el('p', { text: 'No hay pedidos con este filtro.' }))); return; }
  body.replaceChildren(...list.map(o => orderCard(o, ctx)));
  const sel = body.querySelector('.is-sel');
  if (sel && ui.scrollToSel) { sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); ui.scrollToSel = false; }
}

function emptyState() {
  const svg = `<svg class="hero" viewBox="0 0 120 90" fill="none" aria-hidden="true"><circle cx="60" cy="48" r="38" stroke="#4f46e5" stroke-opacity=".25" stroke-width="2" stroke-dasharray="3 6"/><circle cx="60" cy="48" r="22" stroke="#4f46e5" stroke-opacity=".35" stroke-width="2"/><path d="M28 62 C42 50 50 66 62 52 S86 40 94 30" stroke="#4f46e5" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="62" r="5" fill="#4f46e5"/><circle cx="94" cy="30" r="5" fill="#ea580c"/><circle cx="62" cy="52" r="5" fill="#16a34a"/></svg>`;
  const wrap = el('div', { class: 'empty' });
  wrap.insertAdjacentHTML('afterbegin', svg);
  wrap.append(
    el('h3', { text: `Tu reparto de ${state.settings.radiusBlocks} cuadras, listo para arrancar` }),
    el('p', { text: 'Cargá pedidos, repartilos entre tus repartidores y mandales la ruta al celular.' }),
    el('div', { class: 'btns' },
      el('button', { class: 'btn primary', type: 'button', onclick: newOrder }, icon('plus', 'sm'), 'Nuevo pedido'),
      el('button', { class: 'btn', type: 'button', onclick: () => { const n = loadDemo(); toast(`Cargué ${n} pedidos de ejemplo con 14 días de historia.`, 'ok'); } }, icon('package', 'sm'), 'Cargar datos de ejemplo')));
  return wrap;
}

function orderCard(o, ctx) {
  const c = store.courierById(o.courierId);
  const plan = ctx.plans.get(o.courierId), eta = plan?.etas.get(o.id), pos = ctx.pos(o);
  const out = !store.isDone(o) && !store.inZone(o);
  const canMove = o.status === 'nuevo' || o.status === 'asignado';
  const select = canMove ? el('select', { class: 'select', 'aria-label': `Repartidor para ${o.name}`, onchange: ev => { store.assignOrder(o.id, ev.target.value || null); }, onclick: ev => ev.stopPropagation() },
    el('option', { value: '', text: 'Sin asignar' }),
    state.couriers.map(k => el('option', { value: k.id, text: k.name, selected: k.id === o.courierId }))) : null;

  const meta = [
    el('span', { class: 'tag', text: fmtBlocks(distM(state.settings.center, o)) }),
    el('span', { class: 'tag', text: `Envío ${fmtMoney(o.fee)}` }),
    o.payment === 'efectivo' ? el('span', { class: 'tag cash' }, icon('wallet', 'sm'), `Cobrar ${fmtMoney(store.totalDue(o))}`) : el('span', { class: 'tag paid', text: 'Pagado' })
  ];
  if (eta) meta.push(el('span', { class: 'tag eta' }, icon('clock', 'sm'), `~${fmtTime(eta)}`));
  if (out) meta.push(el('span', { class: 'tag bad', text: 'Fuera de zona' }));
  if (o.approx && !store.isDone(o)) meta.push(el('span', { class: 'tag bad', text: 'Ubicación aproximada' }));

  const wa = el('a', { class: 'iconbtn', href: waLink(o.phone, customerMessage(o, eta)), target: '_blank', rel: 'noopener', 'aria-label': `WhatsApp a ${o.name}`, title: o.phone ? 'Avisar por WhatsApp' : 'Sin teléfono: elegís el contacto en WhatsApp', onclick: ev => ev.stopPropagation() }, icon('msg'));
  const actions = [];
  if (store.isDone(o)) {
    actions.push(el('button', { class: 'btn sm', type: 'button', onclick: ev => { ev.stopPropagation(); store.setStatus(o.id, o.courierId ? 'asignado' : 'nuevo'); } }, icon('undo', 'sm'), 'Reabrir'));
  } else {
    if (select) actions.push(select);
    actions.push(el('button', { class: 'btn sm', type: 'button', onclick: ev => { ev.stopPropagation(); store.setStatus(o.id, 'entregado'); } }, icon('check', 'sm'), 'Entregado'));
    actions.push(el('button', { class: 'iconbtn danger', type: 'button', 'aria-label': `Marcar no entregado a ${o.name}`, title: 'No entregado', onclick: async ev => { ev.stopPropagation(); const r = await failDialog(o); if (r) store.setStatus(o.id, 'fallido', { reason: r }); } }, icon('x')));
  }
  actions.push(el('span', { class: 'sp' }), wa);
  actions.push(el('button', { class: 'iconbtn', type: 'button', 'aria-label': `Editar ${o.name}`, title: 'Editar', onclick: ev => { ev.stopPropagation(); editOrderDialog(o); } }, icon('edit')));

  const when = o.status === 'entregado' || o.status === 'fallido' ? `${fmtTime(o.doneAt)}` : `${fmtTime(o.createdAt)}`;
  return el('article', {
    class: 'ocard' + (ui.selectedId === o.id ? ' is-sel' : '') + (store.isDone(o) ? ' is-done' : ''),
    style: { '--c': c?.color || 'var(--line)' }, 'data-id': o.id, tabindex: '0',
    onclick: () => selectOrder(o.id, true),
    onkeydown: ev => { if (ev.key === 'Enter' && ev.target === ev.currentTarget) selectOrder(o.id, true); }
  },
    el('div', { class: 'ocard-top' },
      el('span', { class: 'code', text: `#${o.code}` }),
      el('span', { class: 'pill ' + o.status, text: STATUS[o.status].label + (pos && !store.isDone(o) ? ` · parada ${pos}` : '') }),
      c ? el('span', { class: 'tag' }, el('span', { class: 'dot', style: { '--c': c.color } }), c.name) : null,
      el('span', { class: 'when' }, icon('clock', 'sm'), when)),
    el('div', { class: 'name', text: o.name }),
    el('div', { class: 'addr' }, icon('pin', 'sm'), o.address),
    el('div', { class: 'meta' }, meta),
    o.notes ? el('div', { class: 'nt', text: o.notes }) : null,
    o.status === 'fallido' ? el('div', { class: 'nt', text: `Motivo: ${o.failReason}` }) : null,
    el('div', { class: 'ocard-actions' }, actions));
}

function customerMessage(o, eta) {
  const first = o.name.split(' ')[0];
  return eta
    ? `Hola ${first}! Tu pedido #${o.code} de ${BRAND} llega aproximadamente a las ${fmtTime(eta)}.`
    : `Hola ${first}! Te escribimos de ${BRAND} por tu pedido #${o.code}.`;
}

function selectOrder(id, fromList = false) {
  ui.selectedId = ui.selectedId === id && fromList ? null : id;
  ui.scrollToSel = !fromList;
  render();
  const o = store.orderById(id);
  if (o && ui.selectedId === id) { if (fromList) mapCtl.focus(o.lat, o.lng, 17); mapCtl.openTooltip(id); }
}

/* ───────── Flota ───────── */
function renderFleet(ctx) {
  const cards = state.couriers.map(c => fleetCard(c, ctx));
  parts.body.replaceChildren(...cards,
    el('button', { class: 'btn', type: 'button', onclick: () => courierDialog(null) }, icon('plus', 'sm'), 'Agregar repartidor'),
    state.couriers.length ? null : el('div', { class: 'empty' }, el('h3', { text: 'Sin repartidores' }), el('p', { text: 'Agregá al menos uno para poder repartir pedidos.' })));
}

function fleetCard(c, ctx) {
  const st = store.courierStatus(c.id), r = state.routes[c.id], plan = ctx.plans.get(c.id);
  const mine = state.orders.filter(o => o.courierId === c.id && store.isOpen(o));
  const stat = (v, l, onclick) => el(onclick ? 'button' : 'div', { class: onclick ? 'iconbtn' : '', type: onclick ? 'button' : null, onclick, style: onclick ? { width: 'auto', height: 'auto', 'text-align': 'left', display: 'block', background: 'var(--surface-2)', 'border-radius': '10px', padding: '7px 10px' } : null }, el('b', { text: v }), el('span', { text: l }));
  const needsRoute = st === 'asignado' && (!r || r.stale);
  let line;
  if (!c.active) line = 'Fuera de turno';
  else if (st === 'libre') line = 'Libre · esperando pedidos';
  else if (st === 'en_ruta') line = `En ruta · ${mine.length} por entregar${plan ? ` · vuelta ~${fmtTime(plan.end)}` : ''}`;
  else line = needsRoute ? `${mine.length} pedidos asignados · falta armar la ruta` : `${mine.length} pedidos asignados · salida ${plan ? fmtTime(plan.start) : '—'}`;

  const actions = [];
  if (st === 'asignado') {
    actions.push(needsRoute
      ? el('button', { class: 'btn primary sm', type: 'button', onclick: () => replan(c.id) }, icon('refresh', 'sm'), 'Armar ruta')
      : el('button', { class: 'btn primary sm', type: 'button', onclick: () => { store.departCourier(c.id); toast(`${c.name} salió a repartir.`, 'ok'); } }, icon('play', 'sm'), 'Despachar'));
    if (!needsRoute) actions.push(el('button', { class: 'btn sm', type: 'button', onclick: () => replan(c.id) }, icon('refresh', 'sm'), 'Recalcular'));
  }
  if (mine.length) {
    actions.push(el('button', { class: 'btn sm', type: 'button', onclick: () => location.hash = '#/repartidor/' + c.id }, icon('nav', 'sm'), 'Modo repartidor'));
    actions.push(el('button', { class: 'btn sm', type: 'button', onclick: () => shareDialog(c.id) }, icon('share', 'sm'), 'Enviar ruta'));
  }
  actions.push(el('button', { class: 'iconbtn', type: 'button', 'aria-label': `Editar ${c.name}`, title: 'Editar', onclick: () => courierDialog(c) }, icon('edit')));

  return el('article', { class: 'ccard' + (c.active ? '' : ' off'), style: { '--c': c.color } },
    el('div', { class: 'ccard-top' },
      el('div', { class: 'grow' }, el('h3', { text: c.name }), el('div', { class: 'sub', text: `${VEHICLES[c.vehicle].label}${c.phone ? ' · ' + c.phone : ''}` })),
      el('label', { class: 'switch', title: c.active ? 'En turno' : 'Fuera de turno' },
        el('input', { type: 'checkbox', checked: c.active, 'aria-label': `${c.name} en turno`, onchange: ev => store.updateCourier(c.id, { active: ev.target.checked }) }), el('i'))),
    el('div', { class: 'status-line' }, el('span', { class: 'pill ' + (st === 'en_ruta' ? 'en_camino' : st === 'asignado' ? 'asignado' : ''), text: st === 'en_ruta' ? 'En ruta' : st === 'asignado' ? 'Asignado' : 'Libre' }), line),
    el('div', { class: 'stats' },
      stat(mine.length, 'paradas', mine.length ? () => { ui.courierFilter = c.id; ui.filter = 'todos'; setTab('pedidos'); } : null),
      stat(plan ? fmtDist(plan.dist) : '—', 'recorrido'),
      stat(plan ? fmtDur(plan.total) : '—', 'tiempo total')),
    el('div', { class: 'ccard-actions' }, actions));
}

async function replan(id) {
  try {
    const r = await replanCourier(id);
    if (r) toast(r.estimated ? 'Ruta armada con estimación en línea recta (sin conexión al servicio de calles).' : 'Ruta recalculada.', r.estimated ? 'warn' : 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

/* ───────── Repartir ───────── */
async function dispatchAll() {
  ui.busy = true; render();
  try {
    const r = await autoDispatch();
    toast(`Repartí ${r.orders} pedidos entre ${r.couriers} repartidor${r.couriers > 1 ? 'es' : ''}.${r.estimated ? ' Sin conexión al servicio de calles: tiempos estimados.' : ''}`, r.estimated ? 'warn' : 'ok', 5000);
    ui.tab = 'flota'; ui.filter = 'todos'; ui.courierFilter = null;
    setTimeout(fitRoutes, 50);
  } catch (e) {
    toast(e instanceof DispatchError ? e.message : 'No pude calcular el reparto. Probá de nuevo.', 'err');
  } finally { ui.busy = false; render(); }
}

function fitRoutes() {
  const pts = Object.values(state.routes).flatMap(r => r.geometry || []);
  mapCtl.fitPoints(pts.length ? pts : []);
}

/* ───────── Mapa ───────── */
function renderMap(ctx) {
  mapCtl.drawZone({ center: state.settings.center, radiusBlocks: state.settings.radiusBlocks });
  mapCtl.drawRoutes(state.couriers.filter(c => state.routes[c.id]).map(c => ({ id: c.id, color: c.color, geometry: state.routes[c.id].geometry, stale: state.routes[c.id].stale, straight: state.routes[c.id].straight })));
  const pins = baseOrders().map(o => {
    const c = store.courierById(o.courierId), pos = ctx.pos(o), out = !store.isDone(o) && !store.inZone(o);
    let kind = '', label = pos ? String(pos) : '';
    if (o.status === 'entregado') { kind = 'done'; label = '✓'; }
    else if (o.status === 'fallido') { kind = 'fail'; label = '✕'; }
    else if (out) { kind = 'fail'; label = '!'; }
    else if (!o.courierId) { kind = 'new'; label = ''; }
    else if (o.status === 'en_camino') kind = pos ? 'out' : 'dotted out';
    else if (!pos) kind = 'dotted';
    return {
      id: o.id, lat: o.lat, lng: o.lng, kind, label, color: c?.color, selected: ui.selectedId === o.id,
      title: `#${o.code} · ${o.name}`, sub: `${o.address} · ${STATUS[o.status].label}${c ? ' · ' + c.name : ''}`,
      draggable: o.status === 'nuevo' || o.status === 'asignado'
    };
  });
  mapCtl.drawPins(pins, { onSelect: id => selectOrder(id), onMove: movePin });
}

function movePin(id, latlng) {
  const p = { lat: latlng.lat, lng: latlng.lng };
  if (!store.inZone(p)) { toast(`Ese punto queda fuera de las ${state.settings.radiusBlocks} cuadras. Lo dejé donde estaba.`, 'err'); render(); return; }
  store.updateOrder(id, p);
  const o = store.orderById(id);
  toast(`#${o.code} movido · a ${fmtBlocks(distM(state.settings.center, p))} del local · envío ${fmtMoney(o.fee)}`, 'ok');
}

function renderLegend() {
  const R = state.settings.radiusBlocks;
  parts.legend.replaceChildren(el('b', { text: 'Tarifa de envío' }),
    ...[0, 1, 2].map(i => el('div', {}, el('i', { style: { opacity: String(0.45 + i * 0.275) } }), el('span', { text: `${ringLabel(i, R)} cuadras` }), el('span', { text: fmtMoney(state.settings.fees[i]) }))));
}

/* ───────── Marcar en el mapa ───────── */
function startPick(text, cb) {
  ui.pick = cb;
  parts.hintText.textContent = text; parts.hint.hidden = false;
  mapCtl.setPicking(true);
  if (matchMedia('(max-width: 899px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function endPick() {
  ui.pick = null; parts.hint.hidden = true; mapCtl?.setPicking(false);
}
function onMapClick(latlng) {
  if (ui.pick) { const cb = ui.pick; endPick(); cb(latlng); return; }
  if (ui.selectedId) { ui.selectedId = null; render(); }
}

async function newOrder(draft = {}) {
  setTab('pedidos', false);
  const res = await orderDialog(draft);
  if (res?.action === 'pick') {
    startPick('Tocá el mapa donde va el pedido', latlng => {
      if (!store.inZone(latlng)) { toast(`Ese punto queda a ${fmtBlocks(distM(state.settings.center, latlng))} del local: fuera de la zona.`, 'err'); newOrder(res.draft); return; }
      newOrder({ ...res.draft, lat: latlng.lat, lng: latlng.lng });
    });
  }
}

function pickCenter(latlng) {
  store.updateSettings({ center: { lat: latlng.lat, lng: latlng.lng, label: 'Centro elegido en el mapa' } });
  store.invalidateAllRoutes(); store.commit();
  mapCtl.fitZone();
  const out = state.orders.filter(o => store.isOpen(o) && !store.inZone(o)).length;
  toast(out ? `Centro movido. ${out} pedido${out > 1 ? 's quedaron' : ' quedó'} fuera de la zona.` : 'Centro movido.', out ? 'warn' : 'ok');
}

function setTab(tab, rerender = true) { ui.tab = tab; if (rerender) render(); }
