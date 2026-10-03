// Service worker mínimo: la app abre sin conexión con la última versión que se vio.
// Red primero para lo propio (así nunca queda una versión vieja), caché como respaldo; librerías y fuentes desde caché.
const CACHE = 'cuadra-v3';
const SHELL = ['./', 'index.html', 'css/app.css', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;                 // el seguimiento nunca pasa por la caché
  // mapas, direcciones y rutas: siempre red (no se guardan)
  if (/tile\.openstreetmap\.org|nominatim|osrm/.test(url.host)) return;
  const sameOrigin = url.origin === location.origin;
  const library = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!sameOrigin && !library) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (library) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    const offline = async () => (await cache.match(req)) || (req.mode === 'navigate' ? cache.match('index.html') : null);
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); return res; }
      if (res.status >= 500) return (await offline()) || res;          // sitio caído o pausado: se abre la última versión que se vio
      return res;
    } catch {
      return (await offline()) || Response.error();
    }
  })());
});
