// Inicio: lo que cierra pronto, la semana y el feed de las fuentes que sigue la empresa.
import { FUENTES, FUENTE_IDS, TIPOS, TIPO_IDS } from '../config.js';
import { armarFeed, cierranPronto, enLaSemana } from '../content.js';
import { $, el, icon } from '../dom.js';
import { plural } from '../fmt.js';
import { origen } from '../api.js';
import { SEED_VERSION } from '../seed.js';
import * as store from '../store.js';
import { tarjeta, vacio } from './comun.js';

export const title = 'Inicio';
let verPasados = false, q = '';

export function mount(root, ctx) {
  const now = Date.now();
  const { state } = store;
  const items = ctx.items;
  const urgentes = cierranPronto(items, state.sigue, now);
  const semana = enLaSemana(items, state.sigue, now);
  const nombre = state.perfil.nombre.trim();

  const head = el('header', { class: 'inicio-head' },
    el('p', { class: 'saludo', text: nombre ? `Hola, ${nombre}` : 'Hola' }),
    el('h1', { text: 'Lo que pasa para tu empresa' }),
    el('p', { class: 'resumen-semana' },
      semana.length ? `${plural(semana.length, 'cosa', 'cosas')} con fecha en los próximos 7 días` : 'Nada con fecha en los próximos 7 días',
      urgentes.length ? ` · ${plural(urgentes.length, 'plazo cierra', 'plazos cierran')} pronto` : ''),
    aviso());

  const bloques = [head];
  if (!state.sigue.length) {
    bloques.push(vacio('No seguís ninguna fuente', 'Elegí al menos una para ver su contenido.', el('a', { class: 'btn primario', href: '#/fuentes', text: 'Elegir fuentes' })));
    root.replaceChildren(...bloques);
    return;
  }

  if (urgentes.length) {
    bloques.push(el('section', { class: 'urgentes', 'aria-labelledby': 'tUrg' },
      el('h2', { id: 'tUrg', class: 'sec' }, icon('clock'), 'Cierra pronto'),
      el('div', { class: 'urgentes-fila' }, urgentes.map(x =>
        el('a', { class: 'urgente', href: '#/c/' + encodeURIComponent(x.item.id) },
          el('span', { class: 'urgente-dias', text: x.estado.texto }),
          el('span', { class: 'urgente-tit', text: x.item.titulo }),
          el('span', { class: 'urgente-f', text: FUENTES[x.item.fuente].corto }))))));
  }

  // Filtro por fuente (solo si sigue más de una) y por tipo
  const fuentesSeguidas = FUENTE_IDS.filter(f => state.sigue.includes(f));
  if (state.fuenteFiltro && !fuentesSeguidas.includes(state.fuenteFiltro)) state.fuenteFiltro = '';
  const chipsFuente = fuentesSeguidas.length > 1 ? el('div', { class: 'chips chips-fuente', role: 'group', 'aria-label': 'Filtrar por fuente' },
    [['', 'Todas las fuentes'], ...fuentesSeguidas.map(f => [f, FUENTES[f].corto])].map(([f, label]) =>
      el('button', { type: 'button', class: 'chip chip-chico' + (f ? ' fuente-chip' : ''), style: f ? { '--c': FUENTES[f].color } : null, 'aria-pressed': String(state.fuenteFiltro === f), 'data-f': f, text: label,
        onclick: () => { state.fuenteFiltro = f; store.save(); chipsFuente.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === f))); pintarLista(); } }))) : null;
  const tiposPresentes = TIPO_IDS.filter(t => items.some(i => i.tipo === t && state.sigue.includes(i.fuente)));
  if (state.filtro && !tiposPresentes.includes(state.filtro)) state.filtro = '';
  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por tipo' },
    [['', 'Todo'], ...tiposPresentes.map(t => [t, TIPOS[t].plural])].map(([t, label]) =>
      el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.filtro === t), text: label,
        onclick: () => { state.filtro = t; store.save(); pintarLista(); $$chips(); } })));
  const $$chips = () => chips.querySelectorAll('.chip').forEach((c, k) => c.setAttribute('aria-pressed', String((k === 0 ? '' : tiposPresentes[k - 1]) === state.filtro)));

  const buscar = el('label', { class: 'buscar' }, icon('search'),
    el('span', { class: 'sr', text: 'Buscar' }),
    el('input', { id: 'q', type: 'search', placeholder: 'Buscar: IA, crédito, alimentos…', value: q, autocomplete: 'off',
      oninput: e => { q = e.target.value; pintarLista(); } }));

  const lista = el('div', { class: 'lista', 'aria-live': 'polite' });
  bloques.push(el('section', { class: 'feed', 'aria-labelledby': 'tFeed' },
    el('div', { class: 'feed-head' }, el('h2', { id: 'tFeed', class: 'sec', text: 'Para vos' }), buscar), chipsFuente, chips, lista));
  root.replaceChildren(...bloques);

  function pintarLista() {
    const opts = { perfil: state.perfil, sigue: state.sigue, tipo: state.filtro, fuente: state.fuenteFiltro, q, now };
    const feed = armarFeed(items, opts);
    const pasados = armarFeed(items, { ...opts, pasados: true });
    const kids = feed.length
      ? [el('p', { class: 'cuenta-feed', text: plural(feed.length, 'pieza vigente', 'piezas vigentes') }), ...feed.map(x => tarjeta(x, now))]
      : [vacio(q ? 'Sin resultados' : 'Nada por acá', q ? `No hay piezas vigentes que coincidan con "${q}".` : 'No hay piezas vigentes con este filtro en tus fuentes.')];
    if (pasados.length) {
      kids.push(el('button', { type: 'button', class: 'btn fantasma ver-pasados', 'aria-expanded': String(verPasados),
        text: verPasados ? 'Ocultar lo que ya pasó' : `Ver lo que ya pasó (${pasados.length})`,
        onclick: () => { verPasados = !verPasados; pintarLista(); } }));
      if (verPasados) kids.push(...pasados.map(x => tarjeta(x, now, { sinResumen: true })));
    }
    lista.replaceChildren(...kids);
  }
  pintarLista();
}

function aviso() {
  const txt = {
    semilla: `Contenido relevado de las fuentes públicas el ${SEED_VERSION.split('-').reverse().join('/')}.`,
    cache: 'Sin conexión: estás viendo la última versión descargada.',
    local: 'Modo local: contenido editado en este navegador.'
  }[origen];
  return txt ? el('p', { class: 'origen', text: txt }) : null;
}
