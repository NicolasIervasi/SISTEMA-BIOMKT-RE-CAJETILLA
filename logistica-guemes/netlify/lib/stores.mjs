// Almacenes para el núcleo del track: el real (Netlify Blobs) y uno en memoria con la misma semántica de ETag, para las pruebas.
//   get(key)                  -> { data: string, etag } | null
//   put(key, data, cond?)     -> boolean (false si la condición falló). cond: { ifNew: true } | { ifMatch: etag }
//   del(key)                  -> void
//   list(prefix)              -> string[] (todas las claves con ese prefijo)

export function blobStore(store) {
  return {
    async get(key) {
      const r = await store.getWithMetadata(key, { type: 'text' });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async put(key, data, cond = {}) {
      const opts = cond.ifNew ? { onlyIfNew: true } : cond.ifMatch ? { onlyIfMatch: cond.ifMatch } : {};
      const r = await store.set(key, data, opts);
      return r.modified !== false;
    },
    async del(key) { await store.delete(key); },
    async list(prefix) {
      const keys = [];
      for await (const page of store.list({ prefix, paginate: true })) for (const b of page.blobs) keys.push(b.key);
      return keys;
    }
  };
}

// opts.tick: función async que se espera entre pasos, para entrelazar operaciones concurrentes en las pruebas.
export function memoryStore({ tick = () => Promise.resolve() } = {}) {
  const m = new Map();
  let seq = 0;
  const ops = { get: 0, put: 0, del: 0, list: 0 };
  return {
    ops,
    keys: () => [...m.keys()].sort(),
    raw: key => m.get(key)?.data,
    async get(key) { ops.get++; await tick(); const v = m.get(key); return v ? { data: v.data, etag: v.etag } : null; },
    async put(key, data, cond = {}) {
      ops.put++; await tick();
      const cur = m.get(key);
      if (cond.ifNew && cur) return false;
      if (cond.ifMatch && (!cur || cur.etag !== cond.ifMatch)) return false;
      m.set(key, { data, etag: `e${++seq}` });
      return true;
    },
    async del(key) { ops.del++; await tick(); m.delete(key); },
    async list(prefix) { ops.list++; await tick(); return [...m.keys()].filter(k => k.startsWith(prefix)).sort(); }
  };
}
