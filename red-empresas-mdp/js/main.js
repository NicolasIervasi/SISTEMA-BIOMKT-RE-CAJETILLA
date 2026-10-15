// Arranque: carga del contenido, enrutado por hash, navegación inferior y service worker.
import { APP } from './config.js';
import { armarAgenda } from './content.js';
import { $, $$ } from './dom.js';
import * as api from './api.js';
import * as store from './store.js';

const views = {
  inicio: () => import('./views/inicio.js'),
  detalle: () => import('./views/detalle.js'),
  agenda: () => import('./views/agenda.js'),
  fuentes: () => import('./views/fuentes.js'),
  perfil: () => import('./views/perfil.js'),
  admin: () => import('./views/admin.js')
};

const ctx = {
  items: [],
  navegoDentro: false,
  setItems(items) { ctx.items = items; pintarBadge(); }
};
let token = 0, rutas = 0;
// Al volver de un detalle, el inicio recupera la posición en la que estaba (el resto de las pantallas abre arriba)
const scrolls = new Map();
let prevKey = null, prevView = null;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function parse() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [head, ...rest] = partes;
  if (head === 'c' && rest[0]) return { view: 'detalle', args: [rest[0]], nav: '' };
  if (head === 'admin') return { view: 'admin', args: rest, nav: 'perfil' };
  if (head === 'bienvenida') return { view: 'perfil', args: ['bienvenida'], nav: '' };
  if (['agenda', 'fuentes', 'perfil'].includes(head)) return { view: head, args: [], nav: head };
  return { view: 'inicio', args: [], nav: 'inicio' };
}

async function route() {
  const mine = ++token;
  if (prevKey !== null) scrolls.set(prevKey, window.scrollY);
  let r = parse();
  if (!store.state.listo && !['admin', 'detalle'].includes(r.view)) r = { view: 'perfil', args: ['bienvenida'], nav: '' };
  const mod = await views[r.view]();
  if (mine !== token) return;
  ctx.navegoDentro = rutas++ > 0;
  const main = $('#main');
  const bienvenida = r.view === 'perfil' && r.args[0] === 'bienvenida';
  document.body.classList.toggle('sin-nav', bienvenida);
  document.body.classList.toggle('es-panel', r.view === 'admin');
  $$('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === r.nav ? 'page' : 'false'));
  await mod.mount(main, ctx, ...r.args);
  if (mine !== token) return;
  document.title = r.view === 'inicio' ? APP : `${mod.title} · ${APP}`;
  const key = location.hash || '#/';
  window.scrollTo(0, r.view === 'inicio' && prevView === 'detalle' ? scrolls.get(key) || 0 : 0);
  prevKey = key; prevView = r.view;
  main.focus({ preventScroll: true });
  pintarBadge();
}

// Punto en "Agenda" cuando hay algo guardado en los próximos 7 días
function pintarBadge() {
  const n = armarAgenda(ctx.items, store.state.guardados, Date.now()).find(g => g.clave === 'semana')?.items.length || 0;
  const b = $('#badgeAgenda');
  b.textContent = n ? String(n) : '';
  b.hidden = !n;
  b.setAttribute('aria-label', n ? `${n} en los próximos 7 días` : '');
}

async function start() {
  store.load();
  ctx.items = await api.cargarContenido();
  api.iniciarEnvios();
  window.addEventListener('hashchange', route);
  store.alCambiar(pintarBadge);
  await route();
  if (store.state.listo) api.registrar('abrir', 'app');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
