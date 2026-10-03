// Abre el almacén de Blobs del track. Producción: consistencia fuerte (la necesitan los ETag). Otros despliegues: un almacén aparte, descartable.
import { getStore, getDeployStore } from '@netlify/blobs';
import { blobStore } from './stores.mjs';

export function openTrackStore() {
  const prod = globalThis.Netlify?.context?.deploy?.context === 'production';
  return blobStore(prod ? getStore({ name: 'cuadra-track', consistency: 'strong' }) : getDeployStore('cuadra-track'));
}
