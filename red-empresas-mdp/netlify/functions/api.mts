import type { Config, Context } from '@netlify/functions';
import { handleRequest } from '../lib/http.mjs';
import { openStore } from '../lib/open-store.mjs';

// Adaptador de Netlify: la lógica vive en ../lib (http.mjs y core.mjs).
// Variables de entorno: ADMIN_CODE (lo teclea quien administra, ≥ 12 caracteres), ADMIN_SECRET (al azar, ≥ 32), PAUSADO=1 (deja de guardar eventos).
export default async (req: Request, _context: Context) =>
  handleRequest(req, {
    code: Netlify.env.get('ADMIN_CODE'),
    secret: Netlify.env.get('ADMIN_SECRET'),
    paused: Netlify.env.get('PAUSADO') === '1',
    store: openStore(),
    log: console.log
  });

export const config: Config = {
  path: '/api/*',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
