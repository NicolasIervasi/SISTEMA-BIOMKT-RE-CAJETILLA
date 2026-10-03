// Núcleo del seguimiento GPS (servidor). Sin Netlify ni red: recibe un `store` con cuatro operaciones y devuelve { status, body }.
// Así se prueba entero en memoria y la función de Netlify queda como un adaptador finito.
//
// Dos secretos del servidor, con usos distintos:
//   TRACK_SETUP_CODE  lo teclea el dueño en Ajustes para obtener las claves del despacho. Solo se compara.
//   TRACK_SECRET      al azar (≥ 32 caracteres), nunca se teclea: de él se derivan el espacio de trabajo, la clave del despacho y las de los repartidores.
// Las claves son HMAC de TRACK_SECRET, así un pedido con una clave inventada se rechaza SIN tocar el almacenamiento (un curl en bucle solo
// gasta invocaciones, no lecturas) y cambiar TRACK_SECRET corta de golpe todas las claves emitidas. Hay un único espacio por servidor:
// pedir las claves de nuevo con el código devuelve siempre las mismas (así se recupera o se vincula un segundo dispositivo).
//
// Almacenamiento (todas las claves tienen la forma <tipo>/<espacio>/...):
//   ck/<ws>/<cid>                      documento del repartidor: { n: nonce vigente, name, color, exp, clr } (se escribe rara vez)
//   pts/<ws>/<cid>/<bucket>/<a>-<r>    UN BLOB POR ENVÍO: { a, p: [puntos], e: [eventos] }, <bucket> = ventana de 10 min de hora de LLEGADA
//   pts/<ws>/<cid>/<bucket>/_c         la ventana ya compactada (se juntan los blobs chicos de una ventana cerrada)
//   meta/gc                            la última limpieza: { at, deleted, left }
// Cada envío escribe su propio blob y no lee antes: Blobs en producción NO serializa las escrituras condicionales (la prueba de humo
// perdió un punto con 5 envíos en paralelo usando If-Match), así que no se actualiza nunca un documento compartido. Los duplicados
// (reintentos) se resuelven al leer, por hora del punto. Los puntos y eventos llevan `a` (hora de llegada al servidor): el despacho
// pide "lo que llegó después de X", sin depender del reloj del celular.
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const API_VERSION = 1;
export const CFG = {
  BUCKET_MS: 10 * 60e3,
  RETENTION_MS: 48 * 3600e3,         // los puntos viven 48 h y se borran
  COURIER_TTL_MS: 90 * 24 * 3600e3,  // el documento de un repartidor (nombre y color) vence a los 90 días
  MAX_PTS_PER_PING: 60,
  MAX_PING_BODY_PTS: 100,            // más que esto es un pedido mal armado
  MAX_PINGS_PER_BUCKET: 120,         // envíos por ventana y repartidor (lo normal son ~30)
  MAX_PTS_PER_COMPACT: 800,
  MAX_READ_BLOBS: 400,               // blobs que se leen por repartidor en una consulta
  COMPACT_INLINE_MS: 4000,           // tiempo máximo que un envío dedica a compactar la ventana anterior (las funciones tienen 10 s)
  COMPACT_AFTER_BUCKETS: 2,          // el GC compacta ventanas más viejas que esto
  MAX_COURIERS: 12,
  MAX_NAME: 30,
  MAX_ACC_M: 100,
  MAX_PT_AGE_MS: 6 * 3600e3,
  MAX_FUTURE_MS: 60e3,
  MAX_READ_BUCKETS: 150,             // 25 h
  DEFAULT_READ_MS: 6 * 3600e3,
  MAX_RESP_PTS: 4000,                // por repartidor
  MAX_EVENTS: 20,
  CAS_TRIES: 3,
  SKEW_IGNORE_MS: 60e3,              // un reloj desfasado menos que esto se toma como bueno
  SKEW_MAX_MS: 24 * 3600e3,
  IO_PARALLEL: 8,
  GC_BUDGET_MS: 20e3,                // las funciones programadas tienen 30 s
  MIN_SECRET_CHARS: 32
};
export const EVENTS = ['start', 'stop', 'hb', 'hide', 'show'];   // hb = latido: sigue ahí aunque no haya posiciones nuevas

const RE_WS = /^[A-Za-z0-9_-]{22}$/;
const RE_CID = /^[A-Za-z0-9_-]{1,32}$/;
const RE_KEY = /^[A-Za-z0-9_-]{43}$/;
const RE_COLOR = /^#[0-9a-fA-F]{6}$/;

const b64u = buf => Buffer.from(buf).toString('base64url');
const finite = n => typeof n === 'number' && Number.isFinite(n);
const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const sha = s => createHash('sha256').update(s).digest();

export const bucketOf = ms => Math.floor(ms / CFG.BUCKET_MS);
const ckKey = (ws, cid) => `ck/${ws}/${cid}`;
const ptsPrefix = (ws, cid) => `pts/${ws}/${cid}/`;
const bucketPrefix = (ws, cid, b) => `pts/${ws}/${cid}/${b}/`;
const COMPACT = '_c';
const isCompact = key => key.endsWith(`/${COMPACT}`);
const keyBucket = key => Number(key.split('/')[3]);                                  // pts/<ws>/<cid>/<bucket>/<nombre>
const keyArrival = key => Number(key.slice(key.lastIndexOf('/') + 1).split('-')[0]);  // NaN en el compactado
const META_GC = 'meta/gc';

const res = (status, body = {}) => ({ status, body });
const fail = (status, error) => res(status, { error });

async function inChunks(items, fn, size = CFG.IO_PARALLEL) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  return out;
}

// Lee, transforma y escribe con control de concurrencia (ETag). fn recibe el documento actual (o null) y devuelve el nuevo.
async function mutate(store, key, fn, tries = CFG.CAS_TRIES) {
  for (let i = 0; i < tries; i++) {
    const cur = await store.get(key);
    let doc = null;
    if (cur) { try { doc = JSON.parse(cur.data); } catch { doc = null; } }
    const next = fn(doc);
    if (next === undefined) return { ok: true, value: doc };
    if (await store.put(key, JSON.stringify(next), cur ? { ifMatch: cur.etag } : { ifNew: true })) return { ok: true, value: next };
  }
  return { ok: false };
}

async function readJSON(store, key) {
  const cur = await store.get(key);
  if (!cur) return null;
  try { const d = JSON.parse(cur.data); return isObj(d) ? d : null; } catch { return null; }
}

async function deleteAll(store, keys) { await inChunks(keys, k => store.del(k), 10); return keys.length; }

// Junta en un solo blob todo lo de una ventana ya cerrada. Es seguro aunque haya envíos tardíos o dos compactaciones a la vez:
// lo compactado es siempre un superconjunto de lo que se borra, y un blob que llegue después queda aparte y se junta la próxima vez.
// deadline (ms de reloj): si la lectura se pasa de ese momento no se escribe nada y queda para la limpieza horaria.
export async function compactBucket(store, ws, cid, b, { deadline = Infinity } = {}) {
  const prefix = bucketPrefix(ws, cid, b);
  const keys = await store.list(prefix);
  const smalls = keys.filter(k => !isCompact(k));
  if (!smalls.length) return 0;
  const docs = await inChunks(keys, k => readJSON(store, k));
  if (Date.now() > deadline) return 0;
  const seen = new Set(), p = [], e = [];
  for (const d of docs) {
    if (!d) continue;
    for (const pt of Array.isArray(d.p) ? d.p : []) if (!seen.has(pt.t)) { seen.add(pt.t); p.push(pt); }
    for (const ev of Array.isArray(d.e) ? d.e : []) e.push(ev);
  }
  p.sort((x, y) => x.t - y.t); e.sort((x, y) => x.a - y.a);
  await store.put(prefix + COMPACT, JSON.stringify({ p: p.slice(0, CFG.MAX_PTS_PER_COMPACT), e: e.slice(-CFG.MAX_EVENTS) }));
  await deleteAll(store, smalls);
  return smalls.length;
}

const cleanName = v => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, CFG.MAX_NAME) : '') || 'Repartidor';
const cleanColor = v => (typeof v === 'string' && RE_COLOR.test(v) ? v.toLowerCase() : '#2563eb');

// ¿Está bien configurado el servidor? El secreto tiene que ser largo y distinto del código que se teclea.
export const configured = ({ code, secret }) => typeof code === 'string' && code.length > 0 && typeof secret === 'string' && secret.length >= CFG.MIN_SECRET_CHARS && secret !== code;

export function createTrackService({ store, code, secret, paused = false, now = Date.now, rand = randomBytes }) {
  const ready = configured({ code, secret });
  const root = ready ? createHmac('sha256', 'cuadra-track-v2').update(secret).digest() : null;
  const mac = (...parts) => createHmac('sha256', root).update(parts.join('\0')).digest();

  const WS = ready ? b64u(mac('ws').subarray(0, 16)) : null;               // el único espacio de este servidor
  const adminFor = ws => b64u(mac('adm', ws));
  const adminOk = (ws, admin) => ws === WS && typeof admin === 'string' && RE_KEY.test(admin) && same(admin, adminFor(ws));

  // ck = nonce (12 bytes) + etiqueta HMAC (20 bytes). Devuelve el nonce si la etiqueta es válida (sin tocar el almacenamiento).
  const makeCk = (ws, cid, nonce) => b64u(Buffer.concat([nonce, mac('ck', ws, cid, b64u(nonce)).subarray(0, 20)]));
  function ckNonce(ws, cid, ck) {
    if (ws !== WS || typeof ck !== 'string' || !RE_KEY.test(ck)) return null;
    const raw = Buffer.from(ck, 'base64url');
    if (raw.length !== 32 || b64u(raw) !== ck) return null;          // codificación no canónica
    const nonce = raw.subarray(0, 12);
    return same(raw.subarray(12), mac('ck', ws, cid, b64u(nonce)).subarray(0, 20)) ? b64u(nonce) : null;
  }

  // Autentica al repartidor: etiqueta válida (sin I/O) y nonce vigente en su documento. Devuelve { doc, etag } o null.
  async function courierAuth(ws, cid, ck) {
    const n = ckNonce(ws, cid, ck);
    if (!n) return null;
    const cur = await store.get(ckKey(ws, cid));
    if (!cur) return null;
    let doc; try { doc = JSON.parse(cur.data); } catch { return null; }
    if (!isObj(doc) || doc.n !== n || !(doc.exp > now())) return null;
    return { doc, etag: cur.etag };
  }

  const idsOk = (ws, cid) => RE_WS.test(ws) && (cid === undefined || RE_CID.test(cid));
  const wsBody = b => isObj(b) && typeof b.ws === 'string' && RE_WS.test(b.ws) && (b.cid === undefined || (typeof b.cid === 'string' && RE_CID.test(b.cid)));

  /* ───────── Despacho ───────── */
  // Siempre devuelve las mismas claves para este servidor: teclear el código otra vez recupera o vincula otro dispositivo.
  async function createWorkspace(b) {
    if (typeof b.code !== 'string' || b.code.length > 200 || !same(sha(b.code.trim()), sha(code))) return fail(401, 'bad_code');
    return res(200, { ok: true, ws: WS, admin: adminFor(WS) });
  }

  // Alta de un repartidor. Devuelve siempre su clave (se vuelve a derivar del nonce guardado, así el link ya enviado sigue valiendo);
  // con rotate se genera una nueva y la anterior deja de servir.
  async function courier(b) {
    if (!isObj(b) || typeof b.ws !== 'string' || typeof b.cid !== 'string' || !idsOk(b.ws, b.cid)) return fail(400, 'bad_request');
    if (!adminOk(b.ws, b.admin)) return fail(401, 'unauthorized');
    const name = cleanName(b.name), color = cleanColor(b.color), key = ckKey(b.ws, b.cid);
    const cur = await store.get(key);
    let doc = null;
    if (cur) { try { doc = JSON.parse(cur.data); } catch { doc = null; } }
    const alive = isObj(doc) && doc.exp > now() && typeof doc.n === 'string' && Buffer.from(doc.n, 'base64url').length === 12;
    if (alive && !b.rotate) {
      if (doc.name !== name || doc.color !== color) await mutate(store, key, d => (isObj(d) ? { ...d, name, color } : undefined));
      return res(200, { ok: true, ck: makeCk(b.ws, b.cid, Buffer.from(doc.n, 'base64url')) });
    }
    if (!cur && (await store.list(`ck/${b.ws}/`)).length >= CFG.MAX_COURIERS) return fail(409, 'too_many_couriers');
    const nonce = rand(12), t = now();
    const next = { n: b64u(nonce), name, color, exp: t + CFG.COURIER_TTL_MS, clr: alive ? doc.clr || t : t };
    const ok = await store.put(key, JSON.stringify(next), cur ? { ifMatch: cur.etag } : { ifNew: true });
    return ok ? res(200, { ok: true, ck: makeCk(b.ws, b.cid, nonce) }) : fail(503, 'busy');
  }

  async function purge(ws, cids) {
    let n = 0;
    for (const cid of cids) {
      await store.del(ckKey(ws, cid));
      n += await deleteAll(store, await store.list(ptsPrefix(ws, cid)));
    }
    return n;
  }
  const courierIds = async ws => (await store.list(`ck/${ws}/`)).map(k => k.slice(`ck/${ws}/`.length)).filter(c => RE_CID.test(c));

  async function revoke(b) {
    if (!wsBody(b)) return fail(400, 'bad_request');
    if (!adminOk(b.ws, b.admin)) return fail(401, 'unauthorized');
    const cids = b.cid ? [b.cid] : await courierIds(b.ws);
    await purge(b.ws, cids);
    return res(200, { ok: true, revoked: cids.length });
  }

  // Borra posiciones. Despacho: todas las del espacio o las de un repartidor. Repartidor: solo las suyas.
  async function clear(b) {
    if (!wsBody(b)) return fail(400, 'bad_request');
    let cids;
    if (b.admin !== undefined) {
      if (!adminOk(b.ws, b.admin)) return fail(401, 'unauthorized');
      cids = b.cid ? [b.cid] : await courierIds(b.ws);
    } else {
      if (!b.cid || !(await courierAuth(b.ws, b.cid, b.ck))) return fail(401, 'unauthorized');
      cids = [b.cid];
    }
    let n = 0;
    for (const cid of cids) {
      const t = now();
      await mutate(store, ckKey(b.ws, cid), d => (isObj(d) ? { ...d, clr: t } : undefined));   // borrado lógico: lo que llegó antes de t ya no se devuelve
      n += await deleteAll(store, await store.list(ptsPrefix(b.ws, cid)));
    }
    return res(200, { ok: true, cleared: n });
  }

  /* ───────── Repartidor ───────── */
  function cleanPoint(p, skew, t0) {
    if (!isObj(p) || !finite(p.t) || !finite(p.lat) || !finite(p.lng)) return null;
    if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return null;
    const t = Math.round(p.t + skew);
    if (t < t0 - CFG.MAX_PT_AGE_MS || t > t0 + CFG.MAX_FUTURE_MS) return null;
    const o = { t, lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 };
    if (p.acc !== undefined) { if (!finite(p.acc) || p.acc < 0 || p.acc > CFG.MAX_ACC_M) return null; o.acc = Math.round(p.acc); }
    if (finite(p.spd) && p.spd >= 0 && p.spd <= 100) o.spd = Math.round(p.spd * 10) / 10;
    if (finite(p.hdg) && p.hdg >= 0 && p.hdg <= 360) o.hdg = Math.round(p.hdg);
    return o;
  }

  async function ping(b) {
    if (!isObj(b) || typeof b.ws !== 'string' || typeof b.cid !== 'string' || !idsOk(b.ws, b.cid)) return fail(400, 'bad_request');
    if (!Array.isArray(b.pts) || b.pts.length > CFG.MAX_PING_BODY_PTS || (b.ev !== undefined && !EVENTS.includes(b.ev))) return fail(400, 'bad_request');
    const auth = await courierAuth(b.ws, b.cid, b.ck);                           // la etiqueta se valida antes de tocar el almacenamiento
    if (!auth) return fail(401, 'unauthorized');

    const t0 = now();
    let skew = 0;
    if (finite(b.ct) && Math.abs(t0 - b.ct) <= CFG.SKEW_MAX_MS && Math.abs(t0 - b.ct) >= CFG.SKEW_IGNORE_MS) skew = Math.round((t0 - b.ct) / 60e3) * 60e3;
    const cand = b.pts.slice(0, CFG.MAX_PTS_PER_PING).map(p => cleanPoint(p, skew, t0)).filter(Boolean).sort((x, y) => x.t - y.t);
    const discarded = b.pts.length - cand.length;
    if (!cand.length && !b.ev) return res(200, { ok: true, accepted: 0, dropped: discarded, now: t0 });

    const a = t0, bucket = bucketOf(a), prefix = bucketPrefix(b.ws, b.cid, bucket);
    const existing = await store.list(prefix);
    if (existing.length >= CFG.MAX_PINGS_PER_BUCKET) return fail(429, 'rate_limited');
    const key = `${prefix}${String(a).padStart(13, '0')}-${b64u(rand(3))}`;
    await store.put(key, JSON.stringify({ a, p: cand.map(p => ({ ...p, a })), ...(b.ev ? { e: [{ a, k: b.ev }] } : {}) }));
    if (!existing.length) { try { await compactBucket(store, b.ws, b.cid, bucket - 1, { deadline: Date.now() + CFG.COMPACT_INLINE_MS }); } catch { /* se compacta en la limpieza horaria */ } }   // primer envío de la ventana: se junta la anterior
    return res(200, { ok: true, accepted: cand.length, dropped: discarded, now: t0 });
  }

  /* ───────── Lectura del despacho ───────── */
  async function read(b) {
    if (!isObj(b) || typeof b.ws !== 'string' || !RE_WS.test(b.ws)) return fail(400, 'bad_request');
    if (!adminOk(b.ws, b.admin)) return fail(401, 'unauthorized');
    const t0 = now();
    let since = t0 - CFG.DEFAULT_READ_MS;
    if (b.since !== undefined) {
      if (!finite(b.since)) return fail(400, 'bad_request');
      since = Math.min(Math.max(b.since, t0 - CFG.RETENTION_MS), t0);
    }
    const b1 = bucketOf(t0);
    const b0 = Math.max(bucketOf(since), b1 - CFG.MAX_READ_BUCKETS + 1);

    const cids = await courierIds(b.ws);
    const out = {};
    await inChunks(cids, async cid => {
      const doc = await readJSON(store, ckKey(b.ws, cid));
      if (!doc || !(doc.exp > t0)) return;
      const prefix = ptsPrefix(b.ws, cid);
      let keys;
      if (b1 - b0 < 6) keys = (await inChunks(Array.from({ length: b1 - b0 + 1 }, (_, i) => b0 + i), n => store.list(bucketPrefix(b.ws, cid, n)))).flat();   // rango corto: solo esas ventanas
      else keys = (await store.list(prefix)).filter(k => keyBucket(k) >= b0 && keyBucket(k) <= b1);
      let want = keys.filter(k => isCompact(k) || keyArrival(k) > since);                  // por el nombre se descarta lo ya visto sin leerlo
      const truncated = want.length > CFG.MAX_READ_BLOBS;
      if (truncated) want = want.slice(-CFG.MAX_READ_BLOBS);
      const docs = await inChunks(want, k => readJSON(store, k));
      const clr = doc.clr || 0;                       // lo que llegó antes del último borrado no se devuelve
      const byT = new Map();
      let lastEv = null;
      for (const d of docs) {
        if (!d) continue;
        if (Array.isArray(d.p)) for (const p of d.p) if (p.a > since && p.a >= clr && (!byT.has(p.t) || p.a < byT.get(p.t).a)) byT.set(p.t, p);   // un reintento repite puntos: queda el primero
        if (Array.isArray(d.e)) for (const e of d.e) if (e.a >= clr && (!lastEv || e.a >= lastEv.a)) lastEv = e;
      }
      let pts = [...byT.values()];
      pts.sort((x, y) => x.t - y.t);
      const tooMany = pts.length > CFG.MAX_RESP_PTS;
      if (tooMany) pts = pts.slice(-CFG.MAX_RESP_PTS);
      const entry = { name: doc.name, color: doc.color, clr, pts };      // clr: el despacho descarta lo que tenga guardado de antes de un borrado
      if (pts.length) entry.last = pts.reduce((m, p) => (p.a >= m.a ? p : m), pts[0]);
      if (lastEv) entry.ev = lastEv;
      if (entry.last || lastEv) entry.seen = Math.max(entry.last?.a ?? 0, lastEv?.a ?? 0);   // última señal de vida: un punto o un latido
      if (truncated || tooMany) entry.truncated = true;
      out[cid] = entry;
    });
    return res(200, { ok: true, now: t0, couriers: out });
  }

  // Estado del servicio (sin credenciales): para verificar el despliegue y que la limpieza esté corriendo.
  async function health() {
    const g = await readJSON(store, META_GC);
    return res(200, { ok: true, v: API_VERSION, gcAt: g?.at ?? null });
  }

  const ROUTES = { ws: createWorkspace, courier, ping, read, revoke, clear, health };

  // route: "ws" | "courier" | "ping" | "read" | "revoke" | "clear" | "health"; body: objeto ya parseado
  async function handle(route, body) {
    const fn = Object.hasOwn(ROUTES, route) ? ROUTES[route] : null;
    if (!fn) return fail(404, 'not_found');
    if (!ready) return fail(503, 'not_configured');
    if (paused && route !== 'health') return fail(503, 'paused');           // palanca de emergencia: TRACK_PAUSED=1 corta todo antes de tocar el almacenamiento
    if (!isObj(body)) return fail(400, 'bad_request');
    try { return await fn(body); } catch (e) { console.error('track: error interno', e?.name); return fail(500, 'internal'); }
  }

  return { handle, workspace: WS, _adminFor: adminFor };
}

// Limpieza programada, dentro de un presupuesto de tiempo: borra ventanas vencidas y repartidores vencidos, y compacta las ventanas cerradas
// que quedaron con blobs sueltos.
export async function gc({ store, now = Date.now, budgetMs = CFG.GC_BUDGET_MS, maxDeletes = 5000 }) {
  const t = now(), limit = bucketOf(t - CFG.RETENTION_MS), deadline = Date.now() + budgetMs, cur = bucketOf(t);
  const all = await store.list('pts/');
  const bucketNum = k => (k.split('/').length >= 5 ? keyBucket(k) : Number(k.slice(k.lastIndexOf('/') + 1)));    // las claves raras (sin ventana numérica) cuentan como vencidas
  const old = all.filter(k => { const n = bucketNum(k); return !Number.isInteger(n) || n < limit; }).sort((x, y) => (bucketNum(x) || 0) - (bucketNum(y) || 0));
  let deleted = 0, couriers = 0, compacted = 0, left = 0;
  for (let i = 0; i < old.length; i += 10) {
    if (deleted >= maxDeletes || Date.now() > deadline) { left = old.length - i; break; }
    const chunk = old.slice(i, i + 10);
    await Promise.all(chunk.map(k => store.del(k)));
    deleted += chunk.length;
  }
  if (!left) {
    const groups = new Map();                                                      // ventanas cerradas con blobs sueltos
    for (const k of all) {
      const parts = k.split('/');
      if (parts.length === 5 && !isCompact(k) && Number.isInteger(keyBucket(k)) && keyBucket(k) >= limit && keyBucket(k) <= cur - CFG.COMPACT_AFTER_BUCKETS) groups.set(parts.slice(1, 4).join('/'), true);
    }
    for (const g of groups.keys()) {
      if (Date.now() > deadline) { left++; continue; }
      const [ws, cid, b] = g.split('/');
      compacted += await compactBucket(store, ws, cid, Number(b)).catch(() => 0);
    }
  }
  if (!left) {
    const cks = await store.list('ck/');
    for (let i = 0; i < cks.length; i += CFG.IO_PARALLEL) {
      if (deleted >= maxDeletes || Date.now() > deadline) { left += cks.length - i; break; }
      const chunk = cks.slice(i, i + CFG.IO_PARALLEL);
      const docs = await Promise.all(chunk.map(k => readJSON(store, k)));
      const dead = chunk.filter((_, j) => !docs[j] || !(docs[j].exp > t));
      await Promise.all(dead.map(k => store.del(k)));
      deleted += dead.length; couriers += dead.length;
    }
  }
  await store.put(META_GC, JSON.stringify({ at: t, deleted, compacted, left }));
  return { deleted, couriers, compacted, left };
}
