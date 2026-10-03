// Abre el almacén de Blobs del track. Por defecto el de producción, con consistencia fuerte (la necesitan los ETag).
// Solo las vistas previas y los despliegues de rama usan un almacén aparte y descartable: equivocarse hacia ese lado es el error caro.
import { getStore, getDeployStore } from '@netlify/blobs';
import { blobStore } from './stores.mjs';

export const isIsolated = context => context === 'deploy-preview' || context === 'branch-deploy';

export function openTrackStore(context = globalThis.Netlify?.context?.deploy?.context) {
  return blobStore(isIsolated(context) ? getDeployStore('cuadra-track') : getStore({ name: 'cuadra-track', consistency: 'strong' }));
}
