// Capa HTTP sobre Request/Response estándar (la usa la función de Netlify y las pruebas).
//   GET  /api/contenidos      contenido publicado (cacheable un minuto en la CDN)
//   GET  /api/salud           versión y si el panel está configurado
//   POST /api/eventos         eventos anónimos y perfil de la empresa
//   POST /api/admin/<login|publicar|datos>
import { createService } from './core.mjs';

export const MAX_BODY = 512 * 1024;   // publicar manda todo el contenido (300 piezas entran holgadas)
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};
const send = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });

async function readBody(req, max) {
  if (Number(req.headers.get('content-length') || 0) > max) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Una línea por pedido, solo con ruta, estado y duración: nunca cuerpos, claves ni IP.
export async function handleRequest(req, { code, secret, paused = false, store, now, log }) {
  const t0 = Date.now();
  const route = new URL(req.url).pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const done = (status, body, extra) => { log?.(JSON.stringify({ route: route.slice(0, 24), status, ms: Date.now() - t0 })); return send(status, body, extra); };
  const service = createService({ store, code, secret, paused, now });
  if (req.method === 'GET') {
    const { status, body } = await service.handle('GET', route);
    const cache = route === 'contenidos' && status === 200
      ? { 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': 'public, durable, s-maxage=60, stale-while-revalidate=300' }
      : {};
    return done(status, body, cache);
  }
  if (req.method !== 'POST') return done(405, { error: 'method_not_allowed' }, { allow: 'GET, POST' });
  // sendBeacon manda text/plain: se acepta solo en /eventos, donde no hay credenciales en juego
  const ct = req.headers.get('content-type') || '';
  if (!/^application\/json\b/i.test(ct) && !(route === 'eventos' && /^text\/plain\b/i.test(ct))) return done(415, { error: 'unsupported_media_type' });
  const text = await readBody(req, route === 'admin/publicar' ? MAX_BODY : 16 * 1024);
  if (text === null) return done(413, { error: 'too_large' });
  let body;
  try { body = JSON.parse(text); } catch { return done(400, { error: 'bad_request' }); }
  const { status, body: out } = await service.handle('POST', route, body);
  return done(status, out);
}
