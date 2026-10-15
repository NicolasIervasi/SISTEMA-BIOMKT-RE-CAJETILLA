// Piezas de interfaz compartidas: tarjeta de contenido, etiqueta de fuente, botón de guardar, gráfico de serie.
import { FUENTES, TIPOS } from '../config.js';
import { esNuevo, proximaFecha } from '../content.js';
import { el, icon, toast } from '../dom.js';
import { hora, mesCorto, numDia, ok, ts } from '../fmt.js';
import { registrar } from '../api.js';
import * as store from '../store.js';

const CODIGO = { evento: 'EVT', capacitacion: 'CURSO', convocatoria: 'CONV', beneficio: 'BENEF', servicio: 'SERV', programa: 'PROG', directorio: 'DIR', novedad: 'NOV', dato: 'DATO' };

export const chipFuente = f => el('span', { class: 'fuente', style: { '--c': FUENTES[f]?.color || 'var(--ink-2)' } }, FUENTES[f]?.corto || f);

// Talón de la tarjeta: la fecha que importa (cierre si está abierto, si no la próxima clase o el evento)
function talon(item, estado, now) {
  const f = proximaFecha(item, now);
  if (!ok(f)) return el('div', { class: 'talon sin' }, el('span', { class: 'talon-cod', text: CODIGO[item.tipo] || '' }));
  const esCierre = ok(ts(item.cierre)) && f === ts(item.cierre);
  return el('div', { class: 'talon' + (estado.urgente ? ' urgente' : '') },
    el('span', { class: 'talon-mes', text: mesCorto(f) }),
    el('span', { class: 'talon-dia', text: String(numDia(f)) }),
    el('span', { class: 'talon-pie', text: esCierre ? 'cierre' : item.todoElDia ? '' : hora(f) }));
}

export function botonGuardar(item, { grande = false, alCambiar } = {}) {
  const b = el('button', { type: 'button', class: grande ? 'btn' : 'iconbtn guardar' });
  const pintar = () => {
    const on = store.guardado(item.id);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Quitar de mi agenda' : 'Guardar en mi agenda');
    b.replaceChildren(icon(on ? 'star-fill' : 'star'), grande ? (on ? 'Guardado' : 'Guardar') : '');
  };
  b.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const on = store.toggleGuardado(item.id);
    registrar(on ? 'guardar' : 'quitar', item.id);
    toast(on ? 'Guardado en tu agenda' : 'Quitado de tu agenda');
    pintar();
    alCambiar?.(on);
  });
  pintar();
  return b;
}

export function tarjeta({ item, estado }, now, opts = {}) {
  const a = el('a', { class: 'card estado-' + estado.clave, href: '#/c/' + encodeURIComponent(item.id) },
    talon(item, estado, now),
    el('div', { class: 'card-main' },
      el('div', { class: 'card-meta' }, chipFuente(item.fuente), el('span', { class: 'tipo', text: TIPOS[item.tipo]?.label || '' }),
        esNuevo(item, now) ? el('span', { class: 'nuevo', text: 'Nuevo' }) : null),
      el('h3', { text: item.titulo }),
      opts.sinResumen ? null : el('p', { class: 'card-res', text: item.resumen }),
      el('span', { class: 'estado ' + estado.clave, text: estado.texto })),
    botonGuardar(item, opts));
  return a;
}

export function vacio(titulo, texto, ...acciones) {
  return el('div', { class: 'vacio' }, el('h3', { text: titulo }), el('p', { text: texto }), ...acciones);
}

// Barras con línea de cero (los valores negativos van hacia abajo). Escala única para barras y etiquetas.
export function graficoSerie(serie) {
  const vals = serie.puntos.map(p => p[1]);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const W = 320, H = 168, padT = 22, padB = min < 0 ? 42 : 26, n = serie.puntos.length;   // lugar para la etiqueta bajo una barra negativa
  const span = max - min || 1;
  const y = v => padT + ((max - v) / span) * (H - padT - padB);
  const bw = Math.min(36, (W - 16) / n - 10);
  const step = (W - 16) / n;
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'serie', role: 'img', 'aria-label': `${serie.titulo}: ` + serie.puntos.map(p => `${p[0]} ${fmtV(p[1], serie.unidad)}`).join(', ') });
  svg.append(s('line', { x1: 8, x2: W - 8, y1: y(0), y2: y(0), class: 'serie-cero' }));
  serie.puntos.forEach(([lab, v], i) => {
    const cx = 8 + step * i + step / 2;
    const y0 = y(0), yv = y(v);
    const ultimo = i === n - 1;
    svg.append(s('rect', { x: cx - bw / 2, y: Math.min(y0, yv), width: bw, height: Math.max(1, Math.abs(yv - y0)), rx: 3, class: 'serie-bar ' + (v < 0 ? 'neg' : 'pos') + (ultimo ? ' ultimo' : '') }));
    const ty = v < 0 ? yv + 13 : yv - 6;
    svg.append(s('text', { x: cx, y: Math.min(H - padB + 13, Math.max(12, ty)), class: 'serie-val' + (ultimo ? ' ultimo' : ''), 'text-anchor': 'middle' }, fmtV(v, serie.unidad)));
    svg.append(s('text', { x: cx, y: H - 6, class: 'serie-lab', 'text-anchor': 'middle' }, lab));
  });
  return el('figure', { class: 'serie-fig' }, svg, el('figcaption', { text: serie.titulo }));
}
const fmtV = (v, u) => `${String(v).replace('.', ',').replace('-', '−')}${u || ''}`;
