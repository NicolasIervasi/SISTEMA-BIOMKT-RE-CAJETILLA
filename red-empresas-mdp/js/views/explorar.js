// Explorar: todo el contenido separado por categoría, con búsqueda y filtro por fuente.
//   #/explorar            categorías (o resultados, si hay una búsqueda)
//   #/explorar/<cat>      una categoría, separada en secciones (cursos: empiezan pronto, ciclo 2027, en curso, terminaron)
import { FUENTES, FUENTE_IDS } from '../config.js';
import { CATEGORIAS, buscar, cuentaVigentes, secciones } from '../content.js';
import { el, icon } from '../dom.js';
import { plural } from '../fmt.js';
import * as store from '../store.js';
import { tarjeta, vacio } from './comun.js';

export const title = 'Explorar';

let q = '';                      // búsqueda en curso (se conserva al ir y volver de un detalle)
const seccionElegida = {};       // categoría -> sección elegida en sus chips

// La búsqueda puede venir del inicio
export const buscarDesdeAfuera = texto => { q = texto; };

export function mount(root, ctx, catId) {
  const { state } = store;
  const now = Date.now();
  const cat = CATEGORIAS.find(c => c.id === catId);
  const opts = () => ({ perfil: state.perfil, sigue: state.sigue, fuente: state.fuenteFiltro, now });

  const fuentesSeguidas = FUENTE_IDS.filter(f => state.sigue.includes(f));
  if (state.fuenteFiltro && !fuentesSeguidas.includes(state.fuenteFiltro)) state.fuenteFiltro = '';

  const cuerpo = el('div', { class: 'explorar-cuerpo', 'aria-live': 'polite' });

  const input = el('input', { id: 'qExplorar', type: 'search', value: q, autocomplete: 'off', enterkeyhint: 'search',
    placeholder: cat ? `Buscar en ${cat.label.toLowerCase()}…` : 'Buscar: Excel, crédito, exportar, proveedores…',
    oninput: e => { q = e.target.value; pintar(); } });
  const buscador = el('label', { class: 'buscar grande' }, icon('search'), el('span', { class: 'sr', text: 'Buscar' }), input,
    el('button', { type: 'button', class: 'iconbtn limpiar', 'aria-label': 'Borrar búsqueda', hidden: !q, onclick: () => { q = ''; input.value = ''; pintar(); input.focus(); } }, icon('x')));

  const chipsFuente = fuentesSeguidas.length > 1 ? el('div', { class: 'chips chips-fuente', role: 'group', 'aria-label': 'Filtrar por fuente' },
    [['', 'Todas las fuentes'], ...fuentesSeguidas.map(f => [f, FUENTES[f].corto])].map(([f, label]) =>
      el('button', { type: 'button', class: 'chip chip-chico' + (f ? ' fuente-chip' : ''), style: f ? { '--c': FUENTES[f].color } : null,
        'aria-pressed': String(state.fuenteFiltro === f), 'data-f': f, text: label,
        onclick: () => { state.fuenteFiltro = f; store.save(); chipsFuente.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === f))); pintar(); } }))) : null;

  const head = el('header', { class: 'pag-head' },
    cat ? el('a', { class: 'volver', href: '#/explorar' }, icon('arrow-left'), 'Todas las categorías') : null,
    el('h1', { text: cat ? cat.label : 'Explorar' }),
    el('p', { text: cat ? cat.desc : 'Todo lo que publican UCIP, ATICMA y Producto Local, separado por tipo. Buscá con tus palabras: entiende plurales, tildes y sinónimos.' }));

  root.replaceChildren(head, el('div', { class: 'explorar-filtros' }, buscador, chipsFuente), cuerpo);

  function pintar() {
    buscador.querySelector('.limpiar').hidden = !q;
    if (q.trim()) return pintarBusqueda();
    if (cat) return pintarCategoria();
    pintarCategorias();
  }

  function pintarCategorias() {
    const tarjetas = CATEGORIAS.map(c => {
      const n = cuentaVigentes(ctx.items, c.id, opts());
      return el('a', { class: 'cat', href: '#/explorar/' + c.id },
        el('span', { class: 'cat-n', text: String(n) }),
        el('span', { class: 'cat-l', text: c.label }),
        el('span', { class: 'cat-d', text: c.desc }));
    });
    cuerpo.replaceChildren(el('nav', { class: 'cats', 'aria-label': 'Categorías' }, tarjetas));
  }

  function pintarCategoria() {
    const secs = secciones(ctx.items, cat.id, opts());
    if (!secs.length) { cuerpo.replaceChildren(vacio('Nada por acá', 'No hay piezas de esta categoría en las fuentes que seguís.')); return; }
    const elegida = secs.some(s => s.clave === seccionElegida[cat.id]) ? seccionElegida[cat.id] : '';
    const chips = secs.length > 1 ? el('div', { class: 'chips', role: 'group', 'aria-label': 'Secciones' },
      [['', 'Todo'], ...secs.map(s => [s.clave, `${s.titulo} (${s.items.length})`])].map(([k, label]) =>
        el('button', { type: 'button', class: 'chip', 'aria-pressed': String(elegida === k), text: label,
          onclick: () => { seccionElegida[cat.id] = k; pintarCategoria(); } }))) : null;
    const visibles = secs.filter(s => !elegida || s.clave === elegida);
    const now2 = Date.now();
    cuerpo.replaceChildren(...[chips, ...visibles.map(s => el('section', { class: 'grupo grupo-' + s.clave, 'aria-label': s.titulo },
      el('h2', { class: 'sec', text: `${s.titulo} · ${s.items.length}` }),
      el('div', { class: 'lista' }, s.items.map(x => tarjeta(x, now2, { sinResumen: s.clave === 'pasados' })))))].filter(Boolean));
  }

  function pintarBusqueda() {
    const r = buscar(ctx.items, q, opts());
    const enCat = x => !cat || cat.tipos.includes(x.item.tipo);
    const principales = r.principales.filter(enCat), menciones = r.menciones.filter(enCat), pasados = r.pasados.filter(enCat);
    const now2 = Date.now();
    if (!principales.length && !menciones.length && !pasados.length) {
      cuerpo.replaceChildren(vacio('Sin resultados', `No encontramos "${q.trim()}"${cat ? ` en ${cat.label.toLowerCase()}` : ''}. Probá con otra palabra o sacá el filtro de fuente.`));
      return;
    }
    const bloques = [el('p', { class: 'cuenta-feed', text: plural(principales.length + menciones.length, 'resultado vigente', 'resultados vigentes') })];
    if (principales.length) bloques.push(el('div', { class: 'lista' }, principales.map(x => tarjeta(x, now2))));
    if (menciones.length) bloques.push(el('section', { class: 'grupo' },
      el('h2', { class: 'sec', text: `También lo mencionan · ${menciones.length}` }),
      el('div', { class: 'lista' }, menciones.map(x => tarjeta(x, now2, { sinResumen: true })))));
    if (pasados.length) bloques.push(el('section', { class: 'grupo grupo-pasados' },
      el('h2', { class: 'sec', text: `Ya pasaron · ${pasados.length}` }),
      el('div', { class: 'lista' }, pasados.map(x => tarjeta(x, now2, { sinResumen: true })))));
    cuerpo.replaceChildren(...bloques);
  }

  pintar();
  if (q) input.focus({ preventScroll: true });
}
