// Capa HTTP del seguimiento GPS sobre Request/Response estándar (la usa la función de Netlify y las pruebas).
// POST /api/track/<ws|courier|ping|read|revoke|clear> con cuerpo JSON.
import { createTrackService } from './track-core.mjs';

export const MAX_BODY = 32 * 1024;
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

export async function handleRequest(req, { code, store, now }) {
  if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return send(415, { error: 'unsupported_media_type' });
  if (!code) return send(503, { error: 'not_configured' });
  const route = new URL(req.url).pathname.replace(/^\/api\/track\/?/, '').replace(/\/+$/, '');
  const text = await readBody(req);
  if (text === null) return send(413, { error: 'too_large' });
  let body;
  try { body = JSON.parse(text); } catch { return send(400, { error: 'bad_request' }); }
  const { status, body: out } = await createTrackService({ store, code, now }).handle(route, body);
  return send(status, out);
}
