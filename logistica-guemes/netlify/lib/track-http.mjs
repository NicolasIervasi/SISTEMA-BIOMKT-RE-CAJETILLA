// Capa HTTP del seguimiento GPS sobre Request/Response estándar (la usa la función de Netlify y las pruebas).
// POST /api/track/<ws|courier|ping|read|revoke|clear> con cuerpo JSON.
import { createTrackService } from './track-core.mjs';

export const MAX_BODY = 24 * 1024;
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};
const send = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });

async function readBody(req) {
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Una línea por pedido, solo con ruta, estado y duración: nunca cuerpos, claves, coordenadas ni IP.
export async function handleRequest(req, { code, secret, paused = false, store, now, log }) {
  const t0 = Date.now();
  const route = new URL(req.url).pathname.replace(/^\/api\/track\/?/, '').replace(/\/+$/, '');
  const done = (status, body, extra) => { log?.(JSON.stringify({ route: route.slice(0, 16), status, ms: Date.now() - t0 })); return send(status, body, extra); };
  if (req.method !== 'POST') return done(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return done(415, { error: 'unsupported_media_type' });
  const text = await readBody(req);
  if (text === null) return done(413, { error: 'too_large' });
  let body;
  try { body = JSON.parse(text); } catch { return done(400, { error: 'bad_request' }); }
  const { status, body: out } = await createTrackService({ store, code, secret, paused, now }).handle(route, body);
  return done(status, out);
}
