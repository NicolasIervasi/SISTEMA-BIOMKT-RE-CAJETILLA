// Gráficos en HTML/CSS: el texto conserva su tamaño en el celular. Todo texto entra con textContent.
import { el, icon } from './dom.js';

export function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const fmtInt = n => Math.round(n).toLocaleString('es-AR');

// Columnas desde una sola línea base. data: [{ label, value, tip, axis? }]; highlight(d, i) activa el énfasis (resto en gris).
export function columnChart({ data, ariaLabel, highlight, capLabel }) {
  const top = niceMax(Math.max(0, ...data.map(d => d.value)));
  const n = data.length;
  const tip = el('div', { class: 'viz-tip', role: 'tooltip', hidden: true });
  const plot = el('div', { class: 'viz-plot', style: { '--n': String(n) } });
  for (const frac of [1, 0.5, 0]) {
    plot.append(el('div', { class: 'viz-grid', style: { bottom: `${frac * 100}%` } }, el('span', { text: fmtInt(top * frac) })));
  }
  const cols = el('div', { class: 'viz-cols', role: 'list', 'aria-label': ariaLabel });
  data.forEach((d, i) => {
    const hi = !highlight || highlight(d, i);
    const col = el('button', {
      class: 'viz-col' + (hi ? ' hi' : ''), type: 'button', role: 'listitem', 'aria-label': d.tip,
      onpointerenter: () => show(col, d), onfocus: () => show(col, d), onpointerleave: hide, onblur: hide
    }, el('i', { style: { height: `${(d.value / top) * 100}%` } }), capLabel && capLabel(d, i) ? el('em', { class: 'viz-cap', text: capLabel(d, i), style: { bottom: `calc(${(d.value / top) * 100}% + 3px)` } }) : null);
    cols.append(col);
  });
  plot.append(cols, tip);
  function show(col, d) {
    tip.replaceChildren(el('b', { text: d.valueText ?? fmtInt(d.value) }), el('span', { text: d.tipLabel ?? d.label }));
    tip.hidden = false;
    const pr = plot.getBoundingClientRect(), cr = col.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.min(pr.width - half - 2, Math.max(half + 2, cr.left - pr.left + cr.width / 2));
    tip.style.left = x + 'px';
    tip.style.bottom = `calc(${(d.value / top) * 100}% + 10px)`;
  }
  function hide() { tip.hidden = true; }
  const axis = el('div', { class: 'viz-x', style: { '--n': String(n) } }, data.map(d => el('span', { text: d.axis ?? '' })));
  return el('div', { class: 'viz' }, plot, axis);
}

// Barras horizontales con el valor en la punta. rows: [{ label, sub?, value, text }]
export function barRows({ rows, ariaLabel }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return el('div', { class: 'viz-hbars', role: 'list', 'aria-label': ariaLabel }, rows.map(r =>
    el('div', { class: 'viz-hrow', role: 'listitem' },
      el('div', { class: 'hl' }, el('b', { text: r.label }), r.sub ? el('small', { text: r.sub }) : null),
      el('div', { class: 'ht' }, el('i', { style: { width: `${(r.value / max) * 100}%` } })),
      el('span', { class: 'hv', text: r.text }))));
}

export function dataTable({ columns, rows, caption }) {
  return el('div', { class: 'viz-table' }, el('table', {},
    el('caption', { text: caption }),
    el('thead', {}, el('tr', {}, columns.map(c => el('th', { scope: 'col', text: c })))),
    el('tbody', {}, rows.map(r => el('tr', {}, r.map((v, i) => el(i ? 'td' : 'th', { scope: i ? null : 'row', text: String(v) })))))));
}

// Tarjeta con título, vista gráfica y vista de tabla (los valores nunca dependen del hover)
export function chartCard({ title, subtitle, chart, table, wide }) {
  let asTable = false;
  const body = el('div', { class: 'viz-body' }, chart);
  const toggle = el('button', { class: 'btn ghost sm', type: 'button', 'aria-pressed': 'false', onclick: () => {
    asTable = !asTable;
    toggle.setAttribute('aria-pressed', String(asTable));
    toggle.lastChild.textContent = asTable ? 'Ver gráfico' : 'Ver tabla';
    body.replaceChildren(asTable ? table : chart);
  } }, icon('list', 'sm'), el('span', { text: 'Ver tabla' }));
  return el('section', { class: 'card viz-card' + (wide ? ' wide' : '') },
    el('div', { class: 'viz-head' }, el('div', {}, el('h3', { text: title }), subtitle ? el('p', { text: subtitle }) : null), toggle),
    body);
}
