// Ajustes: zona, tarifas, operación, flota y datos.
import { BLOCK_M, STATUS, VEHICLES } from '../config.js';
import { clearDemo, loadDemo } from '../demo.js';
import { confirmDialog, download, el, icon, toast } from '../dom.js';
import { csvCell, fmtDist } from '../fmt.js';
import { distM, ringLabel } from '../geomath.js';
import { LiveError, clearTracks, disableLive, enableLive } from '../live.js';
import * as store from '../store.js';
import { courierDialog } from './dialogs.js';
import { requestCenterPick } from './dispatch.js';

const { state } = store;
export const title = 'Ajustes';
export const subtitle = () => 'Zona, tarifas, flota y datos';

let root, unsub, selfEdit = false, radiusHint = null;

// Las ediciones de campos no redibujan la pantalla: el "change" llega en pleno mousedown de otro botón
// y reemplazarlo antes del mouseup haría perder ese primer clic.
const silent = fn => { selfEdit = true; fn(); queueMicrotask(() => { selfEdit = false; }); };

export function mount(container) {
  root = el('section', { class: 'view settings' });
  container.replaceChildren(root);
  unsub = store.subscribe(() => { if (!selfEdit) render(); });
  render();
}
export function unmount() { unsub?.(); root = null; }

const field = (label, input, hint) => el('label', { class: 'field' }, label, input, hint ? (typeof hint === 'string' ? el('small', { text: hint }) : hint) : null);
const num = (value, min, max, step, onChange, attrs = {}) => {
  const i = el('input', { class: 'input', type: 'number', min: String(min), max: String(max), step: String(step), inputmode: 'numeric', ...attrs });
  i.value = value;
  i.addEventListener('change', () => onChange(i.value));
  return i;
};
const section = (title, desc, ...kids) => el('section', { class: 'card set-card' }, el('div', {}, el('h2', { text: title }), desc ? el('p', { class: 'note', text: desc }) : null), ...kids);

function render() {
  if (!root) return;
  const s = state.settings, R = s.radiusBlocks;

  const zone = section('Zona de reparto', `Los pedidos solo se aceptan dentro del radio. Cada cuadra mide ${BLOCK_M} m.`,
    el('div', { class: 'row2' },
      field('Radio (cuadras)', num(R, 1, 30, 1, v => silent(() => {
        const r = Math.min(30, Math.max(1, Math.round(Number(v)) || 11));
        store.updateSettings({ radiusBlocks: r }); store.invalidateAllRoutes(); store.commit();
        radiusHint.textContent = `${fmtDist(r * BLOCK_M)} a la redonda`;
      })), (radiusHint = el('small', { text: `${fmtDist(R * BLOCK_M)} a la redonda` }))),
      field('Local (centro)', el('input', { class: 'input', type: 'text', readonly: true, value: s.center.label }), `${s.center.lat.toFixed(5)}, ${s.center.lng.toFixed(5)}`)),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: requestCenterPick }, icon('pin', 'sm'), 'Mover el local en el mapa'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => { store.updateSettings({ center: { ...store.DEFAULT_CENTER }, radiusBlocks: 11 }); store.invalidateAllRoutes(); store.commit(); toast('Volvió a Güemes 2800, 11 cuadras.', 'ok'); } }, icon('undo', 'sm'), 'Volver a Güemes 2800')));

  const fees = section('Tarifas de envío', 'Tres anillos según la distancia al local. Los pedidos ya cargados conservan la tarifa con la que entraron.',
    el('div', { class: 'row3' }, [0, 1, 2].map(i => field(`${ringLabel(i, R)} cuadras ($)`, num(s.fees[i], 0, 100000, 100, v => silent(() => {
      const fees = [...state.settings.fees]; fees[i] = Math.max(0, Math.round(Number(v)) || 0); store.updateSettings({ fees });
    }))))));

  const ops = section('Operación', 'Para calcular los horarios de llegada.',
    el('div', { class: 'row2' },
      field('Hora de salida', el('input', { class: 'input', type: 'time', value: s.startTime, onchange: e => silent(() => store.updateSettings({ startTime: e.target.value })) }), 'Vacío: sale al armar la ruta'),
      field('Minutos por entrega', num(s.serviceMin, 0, 30, 1, v => silent(() => store.updateSettings({ serviceMin: Math.min(30, Math.max(0, Math.round(Number(v)) || 0)) }))), 'Tiempo en la puerta')),
    el('label', { class: 'toggle-row' },
      el('span', { class: 'switch' }, el('input', { type: 'checkbox', checked: s.roundTrip, onchange: e => silent(() => { store.updateSettings({ roundTrip: e.target.checked }); store.invalidateAllRoutes(); store.commit(); }) }), el('i')),
      el('span', {}, el('b', { text: 'Volver al local al terminar' }), el('br'), el('small', { class: 'muted', text: 'Cuenta el regreso en el recorrido y el horario final.' }))));

  const fleet = section('Flota', 'La velocidad de cada vehículo ajusta los horarios.',
    el('div', { class: 'fleet-list' }, state.couriers.map(c => el('div', { class: 'fleet-row' },
      el('span', { class: 'dot', style: { '--c': c.color } }),
      el('div', { class: 'grow' }, el('b', { text: c.name }), el('div', { class: 'note', text: `${VEHICLES[c.vehicle].label}${c.phone ? ' · ' + c.phone : ''}${c.active ? '' : ' · fuera de turno'}` })),
      el('button', { class: 'btn sm', type: 'button', onclick: () => courierDialog(c) }, icon('edit', 'sm'), 'Editar')))),
    el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', onclick: () => courierDialog(null) }, icon('plus', 'sm'), 'Agregar repartidor')));

  const live = liveSection();

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: onImportFile });
  const data = section('Datos', `${state.orders.length} pedidos guardados en este navegador (se conservan 90 días).`,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: exportCsv }, icon('download', 'sm'), 'Exportar pedidos (CSV)'),
      el('button', { class: 'btn', type: 'button', onclick: () => { download(`cuadra-respaldo-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON(), 'application/json'); } }, icon('download', 'sm'), 'Respaldo (JSON)'),
      el('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, icon('upload', 'sm'), 'Restaurar respaldo'), fileInput),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: () => toast(`Cargué ${loadDemo()} pedidos de ejemplo.`, 'ok') }, icon('package', 'sm'), 'Cargar datos de ejemplo'),
      el('button', { class: 'btn', type: 'button', disabled: !state.orders.some(o => o.demo), onclick: () => { clearDemo(); toast('Borré los datos de ejemplo.', 'ok'); } }, 'Borrar datos de ejemplo'),
      el('button', { class: 'btn', type: 'button', disabled: !state.orders.some(store.isDone), onclick: async () => { if (await confirmDialog({ title: 'Limpiar entregados', message: 'Se borran los pedidos entregados y no entregados. Las métricas dejan de contarlos.', confirmLabel: 'Limpiar', danger: true })) store.clearOrders({ onlyDone: true }); } }, 'Limpiar entregados'),
      el('button', { class: 'btn danger', type: 'button', onclick: async () => { if (await confirmDialog({ title: 'Vaciar todo', message: 'Se borran pedidos, rutas y ajustes de este navegador. No se puede deshacer: hacé un respaldo antes si lo necesitás.', confirmLabel: 'Vaciar todo', danger: true })) { if (state.settings.live) await disableLive({ force: true }); store.resetAll(); toast('Todo vacío.', 'ok'); } } }, icon('trash', 'sm'), 'Vaciar todo')));

  root.replaceChildren(el('div', { class: 'settings-in' }, zone, fees, ops, fleet, live, data));
}

/* ───────── Seguimiento en vivo ───────── */
function liveSection() {
  const s = state.settings, on = !!s.live;
  const business = field('Nombre del local', el('input', { class: 'input', type: 'text', maxlength: '40', placeholder: 'Ej.: Panadería Güemes', value: s.business, onchange: e => silent(() => store.updateSettings({ business: e.target.value })) }), 'Lo ve cada repartidor cuando acepta compartir su ubicación.');
  const privacy = el('p', { class: 'note', text: 'Cada repartidor lo acepta en su celular y puede dejar de compartir cuando quiera. Los recorridos se guardan 48 horas en el servidor y se borran solos. Los respaldos no incluyen las claves.' });
  if (!on) {
    const code = el('input', { class: 'input', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'Código de activación', 'aria-label': 'Código de activación' });
    const btn = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (!code.value.trim()) { toast('Ingresá el código de activación.', 'err'); return; }
      btn.disabled = true;
      try { await enableLive(code.value); toast('Seguimiento activado. Mandá la ruta a cada repartidor para que pueda compartir su ubicación.', 'ok', 6000); }
      catch (e) { toast(e instanceof LiveError ? e.message : 'No pude activar el seguimiento.', 'err', 6000); }
      finally { btn.disabled = false; }
    } }, icon('locate', 'sm'), 'Activar seguimiento');
    return section('Seguimiento en vivo', 'Mirá en el mapa dónde está cada repartidor y por dónde fue. Es opcional.',
      business, el('div', { class: 'field' }, 'Código de activación', el('div', { class: 'code-row' }, code, btn),
        el('small', { text: 'Lo define quien publicó la app en el servidor (variable TRACK_SETUP_CODE).' })), privacy);
  }
  const withKey = state.couriers.filter(c => c.ck).length;
  return section('Seguimiento en vivo', `Activo · ${withKey} de ${state.couriers.length} repartidores con link de seguimiento.`,
    business, privacy,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        if (!(await confirmDialog({ title: 'Borrar recorridos', message: 'Se borran del servidor las posiciones guardadas de todos los repartidores. El seguimiento sigue activo.', confirmLabel: 'Borrar', danger: true }))) return;
        try { await clearTracks(); toast('Recorridos borrados.', 'ok'); } catch (e) { toast(e instanceof LiveError ? e.message : 'No pude borrar los recorridos.', 'err', 6000); }
      } }, icon('trash', 'sm'), 'Borrar recorridos guardados'),
      el('button', { class: 'btn danger', type: 'button', onclick: deactivateLive }, 'Desactivar y borrar todo')));
}

async function deactivateLive() {
  if (!(await confirmDialog({ title: 'Desactivar seguimiento', message: 'Se borran del servidor los recorridos y las claves de todos los repartidores: los links que ya enviaste dejan de transmitir.', confirmLabel: 'Desactivar', danger: true }))) return;
  try { await disableLive(); toast('Seguimiento desactivado y datos borrados.', 'ok'); }
  catch (e) {
    if (!(e instanceof LiveError)) { toast('No pude desactivarlo.', 'err'); return; }
    if (await confirmDialog({ title: 'No pude borrar del servidor', message: `${e.message} Si lo desactivás igual, los recorridos guardados se borran solos a las 48 horas y los links viejos dejan de servir cuando se cambie el código del servidor.`, confirmLabel: 'Desactivar igual', danger: true })) {
      await disableLive({ force: true }); toast('Seguimiento desactivado.', 'ok');
    }
  }
}

function exportCsv() {
  const head = ['Código', 'Fecha', 'Hora', 'Cliente', 'Teléfono', 'Dirección', 'Cuadras', 'Estado', 'Repartidor', 'Envío', 'Monto', 'Pago', 'Cerrado a las', 'Motivo'];
  const rows = [...state.orders].sort((a, b) => a.createdAt - b.createdAt).map(o => {
    const d = new Date(o.createdAt), done = o.doneAt ? new Date(o.doneAt) : null;
    const who = store.courierById(o.courierId)?.name || o.courierName || '';
    return [o.code, d.toLocaleDateString('es-AR'), d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }), o.name, o.phone, o.address,
      (distM(state.settings.center, o) / BLOCK_M).toFixed(1).replace('.', ','), STATUS[o.status].label, who, o.fee, o.amount, o.payment === 'efectivo' ? 'Efectivo' : 'Pagado',
      done ? done.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '', o.failReason || ''];
  });
  download(`cuadra-pedidos-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv');
  toast(`Exporté ${rows.length} pedidos.`, 'ok');
}

async function onImportFile(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  try {
    const raw = JSON.parse(await f.text());
    if (!(await confirmDialog({ title: 'Restaurar respaldo', message: `El respaldo tiene ${raw.orders?.length ?? 0} pedidos. Reemplaza todo lo que hay ahora en este navegador.`, confirmLabel: 'Restaurar', danger: true }))) return;
    store.importJSON(JSON.stringify(raw));
    toast('Respaldo restaurado.', 'ok');
  } catch { toast('Ese archivo no es un respaldo válido.', 'err'); }
  ev.target.value = '';
}
