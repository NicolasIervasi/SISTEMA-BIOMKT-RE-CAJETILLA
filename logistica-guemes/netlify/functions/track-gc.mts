import type { Config } from '@netlify/functions';
import { gc } from '../lib/track-core.mjs';
import { openTrackStore } from '../lib/open-store.mjs';

// Cada hora borra los puntos de más de 48 h y los repartidores vencidos (la retención no depende de que alguien siga usando la app).
export default async () => {
  const r = await gc({ store: openTrackStore() });
  console.log(`track-gc: ${r.deleted} borrados`);
};

export const config: Config = { schedule: '@hourly' };
