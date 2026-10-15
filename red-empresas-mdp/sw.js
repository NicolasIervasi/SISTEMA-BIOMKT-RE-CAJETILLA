// Service worker mínimo: la app abre sin conexión con la última versión que se vio.
// Red primero para lo propio (así nunca queda una versión vieja), caché como respaldo; fuentes tipográficas desde caché.
// La API nunca pasa por acá: el contenido sin conexión lo resuelve la app con su propia copia.
const CACHE = 'redmdp-v3';
const JS = ['main', 'api', 'config', 'content', 'demo', 'dom', 'fmt', 'ics', 'seed', 'stats', 'store',
  'seed/ucip', 'seed/ucip-cursos', 'seed/aticma', 'seed/pl',
  'views/admin', 'views/agenda', 'views/comun', 'views/detalle', 'views/explorar', 'views/fuentes', 'views/inicio', 'views/perfil'].map(m => `js/${m}.js`);
const SHELL = ['./', 'index.html', 'css/app.css', 'icon.svg', 'manifest.webmanifest', ...JS];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  const sameOrigin = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!sameOrigin && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (fonts) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    const offline = async () => (await cache.match(req)) || (req.mode === 'navigate' ? cache.match('index.html') : null);
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); return res; }
      if (res.status >= 500) return (await offline()) || res;
      return res;
    } catch {
      return (await offline()) || Response.error();
    }
  })());
});
