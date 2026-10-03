// Diálogos compartidos: pedido nuevo / editar, motivo de no entrega, repartidor y link de ruta.
import { BRAND, COURIER_COLORS, FAIL_REASONS, VEHICLES } from '../config.js';
import { closeDialog, confirmDialog, copyText, el, icon, openDialog, toast } from '../dom.js';
import { fmtBlocks, fmtMoney, parseOrderLines, waLink } from '../fmt.js';
import { geocode } from '../geo.js';
import { distM } from '../geomath.js';
import { trackingFor } from '../live.js';
import { courierLink } from '../share.js';
import * as store from '../store.js';

const { state } = store;
const field = (label, input, hint) => el('label', { class: 'field' }, label, input, hint ? el('small', { text: hint }) : null);
const input = (props = {}) => el('input', { class: 'input', type: 'text', ...props });

function paymentSeg(initial, onChange) {
  const buttons = { efectivo: el('button', { type: 'button', text: 'Cobrar en efectivo' }), pagado: el('button', { type: 'button', text: 'Ya pagado' }) };
  const set = v => { for (const [k, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', String(k === v)); onChange(v); };
  for (const [k, b] of Object.entries(buttons)) b.addEventListener('click', () => set(k));
  set(initial);
  return el('div', { class: 'seg', role: 'group', 'aria-label': 'Forma de pago' }, Object.values(buttons));
}

/* ───────── Pedido nuevo ───────── */
// Resuelve { action: 'pick', draft } si se pidió marcar el punto en el mapa; si no, undefined.
export async function orderDialog(draft = {}) {
  let coords = draft.lat != null ? { lat: draft.lat, lng: draft.lng } : null;
  let payment = draft.payment || 'efectivo', closed = false, tab = 'single';
  const f = {
    name: input({ placeholder: 'Nombre del cliente', maxlength: 60, autocomplete: 'off' }),
    phone: input({ type: 'tel', inputmode: 'tel', placeholder: '223 555 1234', maxlength: 24, autocomplete: 'off' }),
    address: input({ placeholder: 'Güemes 2900', maxlength: 100, autocomplete: 'off', enterkeyhint: 'search' }),
    notes: input({ placeholder: 'Timbre, piso, indicaciones', maxlength: 140, autocomplete: 'off' }),
    amount: input({ type: 'number', min: '0', step: '100', inputmode: 'numeric', placeholder: '0' })
  };
  f.name.value = draft.name || ''; f.phone.value = draft.phone || ''; f.address.value = draft.address || '';
  f.notes.value = draft.notes || ''; f.amount.value = draft.amount || '';
  const msg = el('div', { class: 'dlg-msg', role: 'status' });
  const setMsg = (t, k = '') => { msg.textContent = t; msg.className = 'dlg-msg ' + k; };
  if (coords) setMsg(`Punto marcado en el mapa · a ${fmtBlocks(distM(state.settings.center, coords))} del local.`, 'ok');

  const readDraft = () => ({
    name: f.name.value, phone: f.phone.value, address: f.address.value, notes: f.notes.value, amount: f.amount.value, payment, ...(coords || {})
  });
  const btnAdd = el('button', { class: 'btn primary', type: 'submit' }, icon('search', 'sm'), 'Buscar y agregar');
  const btnPick = el('button', { class: 'btn', type: 'button', onclick: () => closeDialogWith('pick') }, icon('pin', 'sm'), 'Marcar en el mapa');
  const closeDialogWith = v => { pickRequested = v === 'pick'; closeDialog(); };
  let pickRequested = false;

  async function submit(ev) {
    ev?.preventDefault();
    const text = f.address.value.trim();
    if (!text && !coords) { setMsg('Escribí la dirección (por ejemplo "Güemes 2900") o marcá el punto en el mapa.', 'warn'); f.address.focus(); return; }
    btnAdd.disabled = true;
    try {
      let place = coords && { ...coords, exact: true, distance: distM(state.settings.center, coords) };
      if (!place) {
        setMsg('Buscando la dirección…');
        const g = await geocode(text);
        if (closed) return;
        if (g.status === 'outside') { setMsg(`Esa dirección queda a ${fmtBlocks(g.distance)} del local: fuera de las ${state.settings.radiusBlocks} cuadras de la zona.`, 'err'); return; }
        if (g.status === 'notfound') { setMsg('No encontré esa dirección. Probá con "Calle 1234" o marcá el punto en el mapa.', 'err'); return; }
        place = g;
      }
      const o = store.addOrder({
        name: f.name.value, phone: f.phone.value, address: text || 'Punto marcado en el mapa', notes: f.notes.value,
        amount: f.amount.value, payment, lat: place.lat, lng: place.lng, approx: !place.exact
      });
      setMsg(`Agregado #${o.code} · a ${fmtBlocks(place.distance)} del local · envío ${fmtMoney(o.fee)}${place.exact ? '' : ' · ubicación aproximada: arrastrá el pin en el mapa para ajustarla'}`, place.exact ? 'ok' : 'warn');
      coords = null;
      for (const k of ['name', 'phone', 'address', 'notes', 'amount']) f[k].value = '';
      f.name.focus();
    } catch {
      setMsg('No pude consultar el buscador de direcciones. Revisá la conexión o marcá el punto en el mapa.', 'err');
    } finally { btnAdd.disabled = false; }
  }

  // pestaña "pegar lista"
  const paste = el('textarea', { class: 'textarea', rows: '6', placeholder: 'Ana Pérez, Güemes 2900, 223 555 1234, 12500\nJuan, Alvarado 345\nRawson 792', 'aria-label': 'Lista de pedidos' });
  const importList = el('div', { class: 'import-list' });
  const importMsg = el('div', { class: 'dlg-msg', role: 'status' });
  const btnImport = el('button', { class: 'btn primary', type: 'button', onclick: runImport }, icon('clipboard', 'sm'), 'Cargar lista');
  async function runImport() {
    const rows = parseOrderLines(paste.value);
    if (!rows.length) { importMsg.textContent = 'Pegá al menos una dirección.'; importMsg.className = 'dlg-msg warn'; return; }
    btnImport.disabled = true; importList.replaceChildren(); importMsg.textContent = ''; importMsg.className = 'dlg-msg';
    const nodes = rows.map(r => {
      const st = el('span', { class: 'st', text: 'en cola' });
      const row = el('div', { class: 'import-row run' }, el('span', { text: r.address }), st);
      importList.append(row);
      return { row, st };
    });
    let added = 0, failed = 0;
    for (let i = 0; i < rows.length && !closed; i++) {
      const r = rows[i], { row, st } = nodes[i];
      st.textContent = 'buscando…';
      let res;
      try { res = await geocode(r.address); } catch { res = { status: 'error' }; }
      if (closed) return;
      if (res.status === 'ok') {
        store.addOrder({ ...r, payment: r.amount ? payment : 'pagado', lat: res.lat, lng: res.lng, approx: !res.exact });
        row.className = 'import-row ok'; st.textContent = `✓ a ${fmtBlocks(res.distance)}${res.exact ? '' : ' (aprox.)'}`; added++;
      } else {
        row.className = 'import-row err'; failed++;
        st.textContent = res.status === 'outside' ? `✕ fuera de zona (${fmtBlocks(res.distance)})` : res.status === 'notfound' ? '✕ no encontrada' : '✕ sin conexión';
      }
    }
    importMsg.textContent = `Agregados ${added} de ${rows.length}.${failed ? ' Las que fallaron no se cargaron: corregí la dirección y probá de nuevo.' : ''}`;
    importMsg.className = 'dlg-msg ' + (failed ? 'warn' : 'ok');
    btnImport.disabled = false;
  }

  const single = el('form', { class: 'stack', onsubmit: submit },
    el('div', { class: 'row2' }, field('Cliente', f.name), field('Teléfono', f.phone)),
    field('Dirección', f.address, 'Mar del Plata, dentro de la zona de reparto'),
    field('Notas', f.notes),
    el('div', { class: 'row2 stack-sm' }, field('Monto del pedido ($)', f.amount), el('div', { class: 'field' }, 'Pago', paymentSeg(payment, v => { payment = v; }))),
    msg,
    el('div', { class: 'actions' }, btnAdd, btnPick));
  const bulk = el('div', { class: 'stack', hidden: true },
    field('Pegá una lista (una por línea)', paste, 'Nombre, Dirección, Teléfono, Monto. Sirve copiar desde una planilla. Con una sola columna se toma como dirección.'),
    importMsg, importList, el('div', {}, btnImport));
  const tabs = {
    single: el('button', { type: 'button', text: 'Una dirección' }),
    bulk: el('button', { type: 'button', text: 'Pegar lista' })
  };
  const showTab = t => {
    tab = t;
    for (const [k, b] of Object.entries(tabs)) b.setAttribute('aria-selected', String(k === t));
    single.hidden = t !== 'single'; bulk.hidden = t !== 'bulk';
    (t === 'single' ? f.address : paste).focus();
  };
  for (const [k, b] of Object.entries(tabs)) b.addEventListener('click', () => showTab(k));
  tabs.single.setAttribute('aria-selected', 'true'); tabs.bulk.setAttribute('aria-selected', 'false');

  const body = el('div', { class: 'stack' }, el('div', { class: 'seg', role: 'tablist' }, Object.values(tabs)), single, bulk);
  const v = openDialog({ title: 'Nuevo pedido', size: 580, body, actions: [{ label: 'Cerrar', value: 'close' }] });
  v.then(() => { closed = true; });          // la promesa termina justo con este diálogo (el evento "close" puede ser de otro anterior)
  await v;
  return pickRequested ? { action: 'pick', draft: readDraft() } : undefined;
}

/* ───────── Editar pedido ───────── */
export async function editOrderDialog(order) {
  let payment = order.payment;
  const f = {
    name: input({ maxlength: 60 }), phone: input({ type: 'tel', maxlength: 24 }), notes: input({ maxlength: 140 }),
    amount: input({ type: 'number', min: '0', step: '100', inputmode: 'numeric' })
  };
  f.name.value = order.name; f.phone.value = order.phone; f.notes.value = order.notes; f.amount.value = order.amount || '';
  const body = el('div', { class: 'stack' },
    el('p', { class: 'muted' }, `#${order.code} · ${order.address}`),
    el('div', { class: 'row2' }, field('Cliente', f.name), field('Teléfono', f.phone)),
    field('Notas', f.notes),
    el('div', { class: 'row2 stack-sm' }, field('Monto del pedido ($)', f.amount), el('div', { class: 'field' }, 'Pago', paymentSeg(payment, v => { payment = v; }))),
    el('p', { class: 'note' }, `Envío ${fmtMoney(order.fee)} · para cambiar la ubicación arrastrá el pin en el mapa.`));
  const v = await openDialog({
    title: 'Editar pedido', size: 520, body,
    actions: [{ label: 'Borrar pedido', kind: 'danger', value: 'delete' }, { label: 'Cancelar', value: '' }, { label: 'Guardar', kind: 'primary', value: 'save' }]
  });
  if (v === 'save') store.updateOrder(order.id, { name: f.name.value || order.name, phone: f.phone.value, notes: f.notes.value, amount: f.amount.value, payment });
  else if (v === 'delete' && await confirmDialog({ title: 'Borrar pedido', message: `¿Borrar el pedido #${order.code} de ${order.name}?`, confirmLabel: 'Borrar', danger: true })) store.removeOrder(order.id);
}

/* ───────── No entregado ───────── */
export async function failDialog(order) {
  const select = el('select', { class: 'select' }, FAIL_REASONS.map(r => el('option', { value: r, text: r })));
  const v = await openDialog({
    title: 'No se pudo entregar', size: 440,
    body: el('div', { class: 'stack' }, el('p', { text: `#${order.code} · ${order.name}` }), field('Motivo', select)),
    actions: [{ label: 'Volver', value: '' }, { label: 'Marcar no entregado', kind: 'primary danger', value: 'fail' }]
  });
  return v === 'fail' ? select.value : undefined;
}

/* ───────── Repartidor ───────── */
export async function courierDialog(courier) {
  let color = courier?.color || COURIER_COLORS[state.couriers.length % COURIER_COLORS.length];
  const name = input({ maxlength: 30, placeholder: 'Moto 3' }); name.value = courier?.name || '';
  const phone = input({ type: 'tel', maxlength: 24, placeholder: '223 555 1234' }); phone.value = courier?.phone || '';
  const vehicle = el('select', { class: 'select' }, Object.entries(VEHICLES).map(([k, v]) => el('option', { value: k, text: v.label })));
  vehicle.value = courier?.vehicle || 'moto';
  const swatches = el('div', { style: { display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }, role: 'radiogroup', 'aria-label': 'Color' });
  const paint = () => [...swatches.children].forEach(b => b.setAttribute('aria-checked', String(b.dataset.color === color)));
  for (const c of COURIER_COLORS) {
    swatches.append(el('button', {
      type: 'button', role: 'radio', 'aria-label': c, 'data-color': c,
      style: { width: '30px', height: '30px', 'border-radius': '50%', background: c, border: '3px solid var(--surface)', 'box-shadow': '0 0 0 2px var(--line)', cursor: 'pointer' },
      onclick: () => { color = c; paint(); }
    }));
  }
  paint();
  const style = el('style', { text: '[role=radio][aria-checked=true]{box-shadow:0 0 0 3px var(--ink)!important}' });
  const actions = [{ label: 'Cancelar', value: '' }];
  if (courier) actions.unshift({ label: 'Eliminar', kind: 'danger', value: 'delete' });
  actions.push({ label: courier ? 'Guardar' : 'Agregar', kind: 'primary', value: 'save' });
  const v = await openDialog({
    title: courier ? 'Editar repartidor' : 'Nuevo repartidor', size: 480,
    body: el('div', { class: 'stack' }, style, field('Nombre', name), el('div', { class: 'row2' }, field('Vehículo', vehicle, 'Define la velocidad para los horarios'), field('Teléfono', phone)), el('div', { class: 'field' }, 'Color en el mapa', swatches)),
    actions
  });
  if (v === 'save') {
    if (courier) store.updateCourier(courier.id, { name: name.value, vehicle: vehicle.value, phone: phone.value, color });
    else { const c = store.addCourier({ name: name.value, vehicle: vehicle.value, phone: phone.value }); store.updateCourier(c.id, { color }); }
  } else if (v === 'delete') {
    if (await confirmDialog({ title: `Eliminar a ${courier.name}`, message: 'Sus pedidos abiertos vuelven a la lista de nuevos. El historial se conserva.', confirmLabel: 'Eliminar', danger: true })) store.removeCourier(courier.id);
  }
  return v;
}

/* ───────── Compartir ubicación (celular del repartidor) ───────── */
export async function consentDialog({ business = '' } = {}) {
  const who = business || 'el despacho';
  const v = await openDialog({
    title: 'Compartir tu ubicación', size: 460,
    body: el('div', { class: 'stack' },
      el('p', {}, 'Vas a compartir tu ubicación con ', el('b', { text: who }), '.'),
      el('ul', { class: 'consent-list' },
        el('li', { text: 'Solo mientras esta pantalla esté abierta y lo tengas activado. Se corta sola a las 12 horas o al terminar la ruta.' }),
        el('li', { text: 'Si abrís Maps o bloqueás el celular, el GPS se pausa hasta que vuelvas a esta pantalla.' }),
        el('li', { text: 'El despacho ve tu posición y tu recorrido en el mapa durante tu turno.' }),
        el('li', { text: 'Lo que se envía se guarda hasta 48 horas en servidores de Netlify (EE. UU.) y se borra solo. Podés borrarlo cuando quieras.' }),
        el('li', { text: 'Podés dejar de compartir en cualquier momento.' }))),
    actions: [{ label: 'Ahora no', value: '' }, { label: 'Aceptar y compartir', kind: 'primary', value: 'ok' }]
  });
  return v === 'ok';
}

/* ───────── Link de ruta ───────── */
export async function shareDialog(courierId) {
  const c = store.courierById(courierId);
  const link = await courierLink(courierId);
  const n = store.state.orders.filter(o => o.courierId === courierId && store.isOpen(o)).length;
  const box = el('input', { class: 'input', type: 'text', readonly: true, value: link, 'aria-label': 'Link de la ruta' });
  const text = `Ruta de ${c.name} · ${n} paradas. Abrila desde el celular: ${link}`;
  const copy = el('button', { class: 'btn', type: 'button', onclick: async () => toast((await copyText(link)) ? 'Link copiado' : 'No se pudo copiar', 'ok') }, icon('link', 'sm'), 'Copiar');
  await openDialog({
    title: `Ruta para ${c.name}`, size: 520,
    body: el('div', { class: 'stack' },
      el('p', { text: `Mandale este link por WhatsApp: abre el modo repartidor en su celular con las ${n} paradas, el orden y los horarios. No necesita instalar nada.` }),
      el('div', { class: 'linkbox' }, box, copy),
      el('p', { class: 'note', text: `${link.length} caracteres. El link lleva la ruta adentro: lo que marque el repartidor queda en su celular.` }),
      store.state.settings.live && !trackingFor(courierId) ? el('p', { class: 'note warn', text: 'Este link no comparte ubicación: no pude conseguir la clave del repartidor (sin conexión con el servidor). Cerralo y abrilo de nuevo para reintentar.' }) : null),
    actions: [{ label: 'Cerrar', value: '' }, { label: 'Enviar por WhatsApp', kind: 'primary', value: 'wa', onClick: () => { window.open(waLink(c.phone, text), '_blank', 'noopener'); return false; } }]
  });
}

export { BRAND };
