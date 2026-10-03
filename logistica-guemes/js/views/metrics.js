// Métricas: entregas, tiempos, ingresos por envío y rendimiento por repartidor.
import { barRows, chartCard, columnChart, dataTable } from '../charts.js';
import { loadDemo } from '../demo.js';
import { el, icon, toast } from '../dom.js';
import { fmtDay, fmtDur, fmtMoney, num1 } from '../fmt.js';
import { ringLabel } from '../geomath.js';
import { computeMetrics, rangeFor } from '../metrics.js';
import * as store from '../store.js';

const { state } = store;
const DAY = 86400000;
export const title = 'Métricas';
export const subtitle = () => 'Rendimiento de tu reparto';

let root, unsub, days = 7;
const RANGES = [[1, 'Hoy'], [7, '7 días'], [14, '14 días'], [30, '30 días']];
const pct = n => `${Math.round(n * 100)}%`;
const rangeText = d => d === 1 ? 'hoy' : `en los últimos ${d} días`;

export function mount(container) {
  root = el('section', { class: 'view metrics' });
  container.replaceChildren(root);
  unsub = store.subscribe(render);
  render();
}
export function unmount() { unsub?.(); root = null; }

// variación contra el período anterior: flecha + signo + color (nunca solo color)
function delta(cur, prev, { goodWhenUp = true, pp = false } = {}) {
  if (cur == null || prev == null || (!pp && prev === 0)) return null;
  const d = pp ? (cur - prev) * 100 : ((cur - prev) / prev) * 100;
  if (Math.abs(d) < 0.5) return el('span', { class: 'delta flat', text: 'Sin cambios' });
  const up = d > 0, good = up === goodWhenUp;
  return el('span', { class: 'delta ' + (good ? 'good' : 'bad') }, up ? '▲ +' : '▼ −', `${Math.abs(d).toFixed(0)}${pp ? ' pp' : '%'}`, el('span', { class: 'sr', text: ' contra el período anterior' }));
}

const tile = (label, value, d) => el('div', { class: 'tile' }, el('span', { class: 'tl', text: label }), el('b', { text: value }), d);

function render() {
  if (!root) return;
  if (!state.orders.length) {
    root.replaceChildren(el('div', { class: 'metrics-in' }, el('div', { class: 'empty' },
      el('h3', { text: 'Todavía no hay datos' }),
      el('p', { text: 'Las métricas se arman con tus pedidos. Probalas con datos de ejemplo: 14 días de historia.' }),
      el('div', { class: 'btns' }, el('button', { class: 'btn primary', type: 'button', onclick: () => { toast(`Cargué ${loadDemo()} pedidos de ejemplo.`, 'ok'); } }, icon('package', 'sm'), 'Cargar datos de ejemplo')))));
    return;
  }
  const R = state.settings.radiusBlocks;
  const cfg = { center: state.settings.center, radiusBlocks: R, couriers: state.couriers };
  const r = rangeFor(days), prevR = { from: r.from - days * DAY, to: r.from };
  const m = computeMetrics(state.orders, r, cfg), p = computeMetrics(state.orders, prevR, cfg);

  const filters = el('div', { class: 'mt-filters' },
    el('div', { class: 'seg', role: 'group', 'aria-label': 'Período' }, RANGES.map(([d, l]) =>
      el('button', { type: 'button', text: l, 'aria-pressed': String(days === d), onclick: () => { days = d; render(); } }))),
    el('span', { class: 'note', text: `Comparado con ${days === 1 ? 'ayer' : `los ${days} días anteriores`}` }));

  /* Entregas por día */
  const dayData = m.perDay.map(d => {
    const lbl = fmtDay(d.t), dt = new Date(d.t);
    return {
      value: d.delivered, label: lbl, tipLabel: lbl,
      tip: `${lbl}: ${d.delivered} entregas${d.failed ? `, ${d.failed} no entregadas` : ''}`,
      axis: days <= 7 ? dt.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '') : (days <= 14 || dt.getDate() % 5 === 0 || dt.getDate() === 1 ? String(dt.getDate()) : '')
    };
  });
  const maxDay = Math.max(...dayData.map(d => d.value));
  const perDayChart = columnChart({
    data: dayData, ariaLabel: 'Entregas por día',
    capLabel: (d, i) => d.value === maxDay && maxDay > 0 ? String(d.value) : (i === dayData.length - 1 && d.value ? String(d.value) : '')
  });
  const perDayTable = dataTable({ caption: 'Entregas por día', columns: ['Día', 'Entregas', 'No entregadas'], rows: m.perDay.map(d => [fmtDay(d.t), d.delivered, d.failed]) });

  const hero = el('section', { class: 'card hero' },
    el('p', { class: 'tl', text: `Entregas ${rangeText(days)}` }),
    el('div', { class: 'hero-row' }, el('div', { class: 'hero-fig', text: m.delivered.toLocaleString('es-AR') }), delta(m.delivered, p.delivered), el('span', { class: 'note', text: `${days === 1 ? 'vs. ayer' : `vs. los ${days} días anteriores`}: ${p.delivered.toLocaleString('es-AR')}` })),
    days > 1 ? chartCard({ title: 'Entregas por día', chart: perDayChart, table: perDayTable }) : el('p', { class: 'note', text: 'Elegí 7 días o más para ver la evolución por día.' }));

  const tiles = el('div', { class: 'tiles' },
    tile('Pedidos recibidos', m.orders.toLocaleString('es-AR'), delta(m.orders, p.orders)),
    tile('Entregados sin problemas', m.successRate == null ? '—' : pct(m.successRate), delta(m.successRate, p.successRate, { pp: true })),
    tile('Tiempo medio de entrega', m.avgDelivery == null ? '—' : fmtDur(m.avgDelivery * 60), delta(m.avgDelivery, p.avgDelivery, { goodWhenUp: false })),
    tile('Ingresos por envío', fmtMoney(m.revenueFee), delta(m.revenueFee, p.revenueFee)),
    tile('Ticket promedio', m.avgTicket == null ? '—' : fmtMoney(m.avgTicket), delta(m.avgTicket, p.avgTicket)),
    tile('Efectivo a rendir', fmtMoney(m.cash)),
    tile('Km recorridos', `${num1(m.km)} km`),
    tile('No entregados', String(m.failed), delta(m.failed, p.failed, { goodWhenUp: false })));

  /* Pedidos por hora (énfasis en la hora pico) */
  const maxH = Math.max(...m.perHour.map(h => h.n));
  const peak = m.perHour.find(h => h.n === maxH && maxH > 0);
  const hourData = m.perHour.map(h => ({
    value: h.n, label: `${h.h} h`, tipLabel: `${String(h.h).padStart(2, '0')}:00 a ${String(h.h).padStart(2, '0')}:59`,
    tip: `${String(h.h).padStart(2, '0')}:00: ${h.n} pedidos`, axis: h.h % 3 === 0 ? String(h.h) : '', valueText: `${h.n} pedidos`
  }));
  const hourChart = columnChart({ data: hourData, ariaLabel: 'Pedidos por hora del día', highlight: d => d.value === maxH && maxH > 0, capLabel: d => d.value === maxH && maxH > 0 ? String(d.value) : '' });
  const hourTable = dataTable({ caption: 'Pedidos por hora', columns: ['Hora', 'Pedidos'], rows: m.perHour.filter(h => h.n).map(h => [`${String(h.h).padStart(2, '0')}:00`, h.n]) });

  /* Entregas por distancia */
  const total = m.perRing.reduce((a, b) => a + b, 0);
  const ringRows = m.perRing.map((n, i) => ({
    label: `${ringLabel(i, R)} cuadras`, sub: `envío ${fmtMoney(state.settings.fees[i])}`, value: n, text: `${n} · ${total ? Math.round((n / total) * 100) : 0}%`
  }));
  const ringChart = barRows({ rows: ringRows, ariaLabel: 'Entregas por distancia al local' });
  const ringTable = dataTable({ caption: 'Entregas por distancia', columns: ['Distancia', 'Envío', 'Entregas'], rows: ringRows.map(r => [r.label, r.sub.replace('envío ', ''), r.value]) });

  /* Repartidores */
  const maxC = Math.max(1, ...m.courierRows.map(c => c.delivered));
  const courierTable = m.courierRows.length ? el('div', { class: 'viz-table full' }, el('table', {},
    el('caption', { class: 'sr', text: 'Rendimiento por repartidor' }),
    el('thead', {}, el('tr', {}, ['Repartidor', 'Entregas', 'Éxito', 'Tiempo medio', 'Km', 'Efectivo a rendir'].map(c => el('th', { scope: 'col', text: c })))),
    el('tbody', {}, m.courierRows.map(c => el('tr', {},
      el('th', { scope: 'row' }, el('span', { class: 'dot', style: { '--c': c.color || 'var(--muted)' } }), c.name),
      el('td', {}, el('div', { class: 'inbar' }, el('i', { style: { width: `${(c.delivered / maxC) * 100}%` } }), el('span', { text: c.delivered }))),
      el('td', { text: c.delivered + c.failed ? pct(c.delivered / (c.delivered + c.failed)) : '—' }),
      el('td', { text: c.avg == null ? '—' : fmtDur(c.avg * 60) }),
      el('td', { text: `${num1(c.km)} km` }),
      el('td', { text: fmtMoney(c.cash) })))))) : el('p', { class: 'note', text: 'Sin entregas en este período.' });

  root.replaceChildren(el('div', { class: 'metrics-in' },
    filters,
    el('div', { class: 'mt-top' }, hero, tiles),
    el('div', { class: 'mt-grid' },
      chartCard({ title: 'Pedidos por hora', subtitle: peak ? `Pico a las ${peak.h} h con ${peak.n} pedidos` : 'Sin pedidos en el período', chart: hourChart, table: hourTable }),
      chartCard({ title: 'Entregas por distancia', subtitle: 'Cuántas entregas cae en cada anillo de tarifa', chart: ringChart, table: ringTable }),
      el('section', { class: 'card viz-card wide' }, el('div', { class: 'viz-head' }, el('div', {}, el('h3', { text: 'Rendimiento por repartidor' }), el('p', { text: `Entregas y efectivo ${rangeText(days)}` }))), courierTable))));
}
