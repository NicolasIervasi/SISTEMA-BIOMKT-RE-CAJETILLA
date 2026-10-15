import type { Config } from '@netlify/functions';
import { compactar } from '../lib/core.mjs';
import { openStore } from '../lib/open-store.mjs';

// Una vez por día junta los envíos de los días cerrados (menos lecturas para el panel) y borra lo que pasó la retención.
export default async () => {
  const r = await compactar({ store: openStore() });
  console.log(JSON.stringify({ job: 'compactar', ...r }));
};

export const config: Config = { schedule: '@daily' };
