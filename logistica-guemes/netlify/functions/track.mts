import type { Config, Context } from '@netlify/functions';
import { handleRequest } from '../lib/track-http.mjs';
import { openTrackStore } from '../lib/open-store.mjs';

// Adaptador de Netlify: la lógica vive en ../lib (track-http.mjs y track-core.mjs).
// Variables de entorno: TRACK_SETUP_CODE (lo teclea el dueño), TRACK_SECRET (al azar, ≥ 32 caracteres), TRACK_PAUSED=1 (corta todo).
export default async (req: Request, _context: Context) =>
  handleRequest(req, {
    code: Netlify.env.get('TRACK_SETUP_CODE'),
    secret: Netlify.env.get('TRACK_SECRET'),
    paused: Netlify.env.get('TRACK_PAUSED') === '1',
    store: openTrackStore(),
    log: console.log
  });

export const config: Config = {
  path: '/api/track/*',
  method: 'POST',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
