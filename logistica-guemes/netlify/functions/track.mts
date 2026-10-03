import type { Config, Context } from '@netlify/functions';
import { handleRequest } from '../lib/track-http.mjs';
import { openTrackStore } from '../lib/open-store.mjs';

// Adaptador de Netlify: la lógica vive en ../lib (track-http.mjs y track-core.mjs).
export default async (req: Request, _context: Context) =>
  handleRequest(req, { code: Netlify.env.get('TRACK_SETUP_CODE'), store: openTrackStore() });

export const config: Config = {
  path: '/api/track/*',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
