// Abre el almacén de Blobs. Por defecto el de producción, con consistencia fuerte (la necesitan los ETag del contenido).
// Las vistas previas y los despliegues de rama usan un almacén aparte y descartable, para no mezclar pruebas con datos reales.
import { getStore, getDeployStore } from '@netlify/blobs';
import { blobStore } from './stores.mjs';

export const isIsolated = context => context === 'deploy-preview' || context === 'branch-deploy';

export function openStore(context = globalThis.Netlify?.context?.deploy?.context) {
  return blobStore(isIsolated(context) ? getDeployStore('redmdp') : getStore({ name: 'redmdp', consistency: 'strong' }));
}
