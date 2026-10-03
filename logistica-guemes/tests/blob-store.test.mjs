// El adaptador a Netlify Blobs, contra un doble que sigue lo documentado de @netlify/blobs v10
// (getWithMetadata -> null si no existe; set condicional -> { modified: false } sin lanzar; list paginado).
// El contrato contra Blobs real se verifica con scripts/smoke.mjs sobre el sitio publicado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { blobStore } from '../netlify/lib/stores.mjs';
import { isIsolated } from '../netlify/lib/open-store.mjs';

function fakeBlobs() {
  const m = new Map();
  let n = 0;
  return {
    calls: [],
    async getWithMetadata(key, opts) { this.calls.push(['gwm', key, opts]); const v = m.get(key); return v ? { data: v.data, etag: v.etag, metadata: {} } : null; },
    async set(key, data, opts = {}) {
      this.calls.push(['set', key, opts]);
      const cur = m.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch !== undefined && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = `"e${++n}"`; m.set(key, { data, etag });
      return { modified: true, etag };
    },
    async delete(key) { m.delete(key); },
    list({ prefix, paginate }) {
      const keys = [...m.keys()].filter(k => k.startsWith(prefix)).sort();
      assert.equal(paginate, true);
      return (async function* () { for (let i = 0; i < keys.length; i += 2) yield { blobs: keys.slice(i, i + 2).map(key => ({ key, etag: 'x' })), directories: [] }; })();
    }
  };
}

test('blobStore: get, put condicional y borrado siguen el contrato', async () => {
  const raw = fakeBlobs(), s = blobStore(raw);
  assert.equal(await s.get('a'), null);
  assert.equal(await s.put('a', '1', { ifNew: true }), true);
  assert.equal(await s.put('a', '2', { ifNew: true }), false, 'ifNew sobre una clave existente no escribe y no lanza');
  const cur = await s.get('a');
  assert.equal(cur.data, '1');
  assert.equal(raw.calls.find(c => c[0] === 'gwm')[2].type, 'text');
  assert.equal(await s.put('a', '3', { ifMatch: 'etag-viejo' }), false);
  assert.equal(await s.put('a', '3', { ifMatch: cur.etag }), true);
  assert.equal((await s.get('a')).data, '3');
  assert.equal(await s.put('a', '4'), true, 'sin condición pisa');
  assert.equal(await s.put('nueva', 'x', { ifMatch: 'e1' }), false, 'ifMatch sobre una clave que no existe no crea');
  await s.del('a'); await s.del('a');
  assert.equal(await s.get('a'), null, 'borrar dos veces no falla');
});

test('blobStore: list junta todas las páginas y respeta el prefijo con barra final', async () => {
  const raw = fakeBlobs(), s = blobStore(raw);
  for (const k of ['pts/w/c1/1', 'pts/w/c1/2', 'pts/w/c1/3', 'pts/w/c10/1', 'ck/w/c1']) await s.put(k, '{}');
  assert.deepEqual(await s.list('pts/w/c1/'), ['pts/w/c1/1', 'pts/w/c1/2', 'pts/w/c1/3']);
  assert.deepEqual(await s.list('nada/'), []);
});

test('almacén: solo las vistas previas y las ramas usan uno aparte; cualquier otro caso (incluso desconocido) usa el de producción', () => {
  assert.equal(isIsolated('deploy-preview'), true);
  assert.equal(isIsolated('branch-deploy'), true);
  for (const ctx of ['production', 'dev', undefined, null, '', 'raro']) assert.equal(isIsolated(ctx), false, String(ctx));
});
