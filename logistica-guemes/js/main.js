// Arranque: enrutado por hash, navegación, tema y service worker.
import { THEME_KEY } from './config.js';
import { $, $$, icon } from './dom.js';
import { processPending } from './live.js';
import * as store from './store.js';

const views = {
  despacho: () => import('./views/dispatch.js'),
  metricas: () => import('./views/metrics.js'),
  ajustes: () => import('./views/settings.js')
};
let current = null, token = 0, courier = null;

async function show(name) {
  const mine = ++token;
  const mod = await views[name]();
  if (mine !== token) return;
  current?.unmount?.();
  current = mod;
  $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === name));
  $('#viewTitle').textContent = mod.title;
  $('#viewSub').textContent = mod.subtitle?.() || '';
  $('#kpis').replaceChildren();
  mod.mount($('#main'));
  mod.onShow?.();
  document.title = `${mod.title} · Cuadra`;
}

async function route() {
  const [head, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  if (head === 'r' && rest.length) {                       // link de ruta que llega al celular del repartidor
    courier ||= await import('./views/courier.js');
    const ok = await courier.importLink(rest.join('/'));
    history.replaceState(null, '', location.pathname + (ok ? '#/repartidor/link' : '#/'));
    return route();
  }
  if (head === 'repartidor') {
    courier ||= await import('./views/courier.js');
    if (courier.open(rest[0] || 'link')) {
      $('#app').hidden = true;
      $('#courierRoot').hidden = false;
      return;
    }
    return void location.replace('#/');
  }
  if (courier && !$('#courierRoot').hidden) { courier.close(); $('#courierRoot').hidden = true; $('#app').hidden = false; current?.onShow?.(); }
  await show(views[head] ? head : 'despacho');
}
window.addEventListener('hashchange', route);

/* tema claro / oscuro */
const themeBtn = $('#themeBtn');
const effectiveTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function paintTheme() {
  const dark = effectiveTheme() === 'dark';
  themeBtn.querySelector('svg').replaceWith(icon(dark ? 'sun' : 'moon'));
  themeBtn.querySelector('span').textContent = dark ? 'Claro' : 'Oscuro';
}
themeBtn.addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* sin almacenamiento */ }
  paintTheme();
});
paintTheme();

/* Netlify (plan gratuito) superpone una insignia fija de 194×64 abajo a la derecha. No se oculta: la app la detecta
   (y detecta cuando el visitante la descarta) y se corre para que no tape la barra inferior, el zoom ni la atribución. */
const markBadge = () => document.documentElement.classList.toggle('host-badge', !!document.getElementById('nl-badge-frame'));
for (const root of [document.documentElement, document.body]) new MutationObserver(markBadge).observe(root, { childList: true });
markBadge();

/* Repartidores dados de baja: el servidor corta sus claves en cuanto hay conexión (si no, se reintenta al volver a haber red). */
let sweeping = false;
async function sweepRevokes() {
  if (sweeping || !store.state.settings.live?.pending?.length) return;
  sweeping = true;
  try { await processPending(); } finally { sweeping = false; }
}
store.subscribe(sweepRevokes);
addEventListener('online', sweepRevokes);
sweepRevokes();

route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
