// Núcleo del servidor (sin Netlify ni red): recibe un `store` con cuatro operaciones (stores.mjs) y devuelve { status, body }.
// Así se prueba entero en memoria y la función de Netlify queda como un adaptador finito.
//
// Qué guarda:
//   contenido/actual          { items, rev, at }   lo publica el panel; un solo escritor (quien tiene el código)
//   emp/<eid>                 { eid, rubro, tamano, sigue, temas, at }   perfil anónimo de cada empresa; lo escribe solo su celular
//   ev/<día>/<llegada>-<azar> { eid, ev: [[tipo, itemId, at]] }   UN BLOB POR ENVÍO, sin leer antes (Blobs no serializa If-Match,
//                             lección de Cuadra): nunca se actualiza un documento compartido desde el celular.
//   evd/<día>                 { lotes: [...] }     los envíos de un día ya cerrado, juntos (lo arma la compactación diaria)
//   meta/compactar            { at, dias, borrados }
// <día> es la fecha de LLEGADA al servidor en hora de Mar del Plata (AAAA-MM-DD): un día cerrado ya no recibe envíos nuevos.
//
// Acceso al panel: ADMIN_CODE lo teclea quien administra; ADMIN_SECRET (al azar, ≥ 32 caracteres) nunca se teclea y de él sale la
// clave del panel (HMAC). Cambiar ADMIN_SECRET corta todas las sesiones abiertas.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const API_VERSION = 1;

// Tienen que coincidir con js/config.js (lo controla una prueba)
export const FUENTES = ['ucip', 'aticma', 'pl'];
export const TIPOS = ['evento', 'capacitacion', 'convocatoria', 'beneficio', 'programa', 'novedad', 'dato'];
export const RUBROS = ['comercio', 'gastronomia', 'alimentos', 'industria', 'pesca', 'construccion', 'tecnologia', 'turismo', 'textil', 'servicios', 'salud', 'logistica', 'agro', 'otro'];
export const TAMANOS = ['uni', 'micro', 'mini', 'pyme', 'grande'];
export const TEMAS = ['capacitacion', 'clientes', 'tecnologia', 'financiamiento', 'normativa', 'visibilidad', 'datos', 'red'];
export const EV_TIPOS = ['abrir', 'ver', 'guardar', 'quitar', 'ir', 'agendar', 'compartir'];

export const CFG = {
  MAX_ITEMS: 300,
  MAX_EV_POR_ENVIO: 60,
  MAX_DIAS_LECTURA: 120,
  MAX_BLOBS_LECTURA: 4000,
  RETENCION_DIAS: 400,              // los eventos se guardan algo más de un año y se borran
  EV_PASADO_MS: 7 * 864e5,          // un evento con hora más vieja que esto (celular sin conexión mucho tiempo) toma la hora de llegada
  IO_PARALLEL: 8,
  BUDGET_MS: 20e3,                  // las funciones programadas tienen 30 s
  MIN_SECRET_CHARS: 32,
  MIN_CODE_CHARS: 12
};

const RE_EID = /^[A-Za-z0-9_-]{16,32}$/;
const RE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const RE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET = -3 * 3600e3;

const res = (status, body = {}) => ({ status, body });
const fail = (status, error, extra = {}) => res(status, { error, ...extra });
const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

export const diaKey = ms => new Date(ms + OFFSET).toISOString().slice(0, 10);

async function inChunks(items, fn, size = CFG.IO_PARALLEL) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  return out;
}
const readJson = async (store, key) => {
  const r = await store.get(key);
  if (!r) return null;
  try { return { data: JSON.parse(r.data), etag: r.etag }; } catch { return null; }
};

// ───────────── Validación del contenido ─────────────
const LIM = { titulo: 140, resumen: 400, parrafo: 1500, parrafos: 8, dato: 200, datos: 12, url: 500, lugar: 160, via: 60, accion: 60 };
const str = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const optStr = (v, max) => v == null || v === '' || (typeof v === 'string' && v.length <= max);
const https = v => typeof v === 'string' && v.length <= LIM.url && /^https:\/\/[^\s"<>]+$/.test(v);
const fecha = v => v == null || v === '' || (typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v)));
const diaOk = v => v == null || v === '' || (typeof v === 'string' && RE_DIA.test(v));

// Devuelve la lista de errores de una pieza ([] si está bien). Mensajes en castellano: los ve quien administra.
export function erroresItem(it) {
  if (!isObj(it)) return ['no es una pieza'];
  const e = [];
  if (typeof it.id !== 'string' || !RE_ID.test(it.id)) e.push('id inválido (minúsculas, números y guiones)');
  if (!FUENTES.includes(it.fuente)) e.push('fuente desconocida');
  if (!TIPOS.includes(it.tipo)) e.push('tipo desconocido');
  if (!str(it.titulo, LIM.titulo)) e.push(`título vacío o de más de ${LIM.titulo} caracteres`);
  if (!str(it.resumen, LIM.resumen)) e.push(`resumen vacío o de más de ${LIM.resumen} caracteres`);
  if (it.cuerpo != null && (!Array.isArray(it.cuerpo) || it.cuerpo.length > LIM.parrafos || !it.cuerpo.every(p => str(p, LIM.parrafo)))) e.push('cuerpo inválido');
  if (it.datos != null && (!Array.isArray(it.datos) || it.datos.length > LIM.datos || !it.datos.every(d => Array.isArray(d) && d.length === 2 && str(d[0], LIM.dato) && str(d[1], LIM.dato)))) e.push('datos inválidos');
  if (!https(it.url)) e.push('el link al original tiene que empezar con https://');
  if (!optStr(it.via, LIM.via)) e.push('"vía" demasiado largo');
  if (!optStr(it.lugar, LIM.lugar)) e.push('lugar demasiado largo');
  for (const k of ['inicio', 'fin', 'cierre']) if (!fecha(it[k])) e.push(`fecha "${k}" inválida`);
  for (const k of ['publicado', 'verificado']) if (!diaOk(it[k])) e.push(`"${k}" tiene que ser AAAA-MM-DD`);
  if (it.duracionMin != null && !(Number.isInteger(it.duracionMin) && it.duracionMin > 0 && it.duracionMin <= 24 * 60)) e.push('duración inválida');
  if (it.sesiones != null && !(Number.isInteger(it.sesiones) && it.sesiones >= 1 && it.sesiones <= 52)) e.push('cantidad de clases inválida (1 a 52)');
  if (it.todoElDia != null && typeof it.todoElDia !== 'boolean') e.push('todoElDia inválido');
  if (it.accion != null && !(isObj(it.accion) && str(it.accion.txt, LIM.accion) && https(it.accion.url))) e.push('el botón de acción necesita texto y un link https://');
  if (!Array.isArray(it.rubros) || !it.rubros.length || !it.rubros.every(r => r === 'todos' || RUBROS.includes(r))) e.push('rubros inválidos');
  if (!Array.isArray(it.temas) || !it.temas.every(t => TEMAS.includes(t))) e.push('temas inválidos');
  if (it.serie != null && !(isObj(it.serie) && str(it.serie.titulo, LIM.titulo) && Array.isArray(it.serie.puntos) && it.serie.puntos.length <= 24 &&
    it.serie.puntos.every(p => Array.isArray(p) && p.length === 2 && str(p[0], 12) && Number.isFinite(p[1])))) e.push('serie inválida');
  const permitidos = new Set(['id', 'fuente', 'tipo', 'titulo', 'resumen', 'cuerpo', 'datos', 'inicio', 'fin', 'cierre', 'duracionMin', 'sesiones', 'todoElDia', 'lugar', 'url', 'via', 'accion', 'rubros', 'temas', 'serie', 'publicado', 'verificado']);
  const extra = Object.keys(it).filter(k => !permitidos.has(k));
  if (extra.length) e.push(`campos desconocidos: ${extra.join(', ')}`);
  return e;
}

export function erroresContenido(items) {
  if (!Array.isArray(items)) return [{ i: -1, errores: ['falta la lista de piezas'] }];
  if (items.length > CFG.MAX_ITEMS) return [{ i: -1, errores: [`máximo ${CFG.MAX_ITEMS} piezas`] }];
  const out = [];
  const ids = new Set();
  items.forEach((it, i) => {
    const errores = erroresItem(it);
    if (it?.id && ids.has(it.id)) errores.push('id repetido');
    ids.add(it?.id);
    if (errores.length) out.push({ i, id: it?.id, errores });
  });
  return out;
}

// ───────────── Credenciales del panel ─────────────
export const tokenDe = secret => createHmac('sha256', secret).update('redmdp-admin-v1').digest('base64url');
export const adminConfigurado = ({ code, secret }) =>
  typeof code === 'string' && code.length >= CFG.MIN_CODE_CHARS && typeof secret === 'string' && secret.length >= CFG.MIN_SECRET_CHARS && code !== secret;
const tokenOk = (token, secret) => typeof token === 'string' && RE_TOKEN.test(token) && same(token, tokenDe(secret));

// ───────────── Servicio ─────────────
export function createService({ store, code, secret, paused = false, now = () => Date.now() }) {
  const admin = adminConfigurado({ code, secret });

  async function contenido() {
    const r = await readJson(store, 'contenido/actual');
    return res(200, { v: API_VERSION, items: r?.data.items ?? null, rev: r?.data.rev ?? null, at: r?.data.at ?? null });
  }

  async function eventos(body) {
    if (!isObj(body) || typeof body.eid !== 'string' || !RE_EID.test(body.eid)) return fail(400, 'bad_request');
    if (paused) return res(202, { ok: true, guardado: false });
    const t = now();
    const eid = body.eid;
    if (body.borrar === true) { await store.del(`emp/${eid}`); return res(200, { ok: true, borrado: true }); }
    if (body.perfil != null) {
      if (!isObj(body.perfil)) return fail(400, 'bad_request');
      const p = body.perfil;
      const doc = {
        eid,
        rubro: RUBROS.includes(p.rubro) ? p.rubro : '',
        tamano: TAMANOS.includes(p.tamano) ? p.tamano : '',
        sigue: Array.isArray(p.sigue) ? [...new Set(p.sigue.filter(f => FUENTES.includes(f)))] : [],
        temas: Array.isArray(p.temas) ? [...new Set(p.temas.filter(x => TEMAS.includes(x)))] : [],
        at: t
      };
      await store.put(`emp/${eid}`, JSON.stringify(doc));
    }
    const ev = body.ev ?? [];
    if (!Array.isArray(ev) || ev.length > CFG.MAX_EV_POR_ENVIO) return fail(400, 'bad_request');
    const limpios = [];
    for (const e of ev) {
      if (!Array.isArray(e) || e.length !== 3) return fail(400, 'bad_request');
      const [tipo, id, at] = e;
      if (!EV_TIPOS.includes(tipo) || typeof id !== 'string' || !RE_ID.test(id) || typeof at !== 'number') return fail(400, 'bad_request');
      limpios.push([tipo, id, at > t + 60e3 || at < t - CFG.EV_PASADO_MS ? t : Math.round(at)]);
    }
    if (limpios.length) {
      const key = `ev/${diaKey(t)}/${t}-${randomBytes(6).toString('base64url')}`;
      await store.put(key, JSON.stringify({ eid, ev: limpios }), { ifNew: true });
    }
    return res(200, { ok: true, guardado: limpios.length });
  }

  async function login(body) {
    if (!admin) return fail(503, 'admin_no_configurado');
    if (!isObj(body) || typeof body.code !== 'string' || !same(body.code, code)) return fail(403, 'codigo_incorrecto');
    return res(200, { token: tokenDe(secret) });
  }

  const guard = body => {
    if (!admin) return fail(503, 'admin_no_configurado');
    if (!isObj(body) || !tokenOk(body.token, secret)) return fail(401, 'sin_permiso');
    return null;
  };

  async function publicar(body) {
    const g = guard(body); if (g) return g;
    const errores = erroresContenido(body.items);
    if (errores.length) return fail(422, 'contenido_invalido', { errores });
    const cur = await readJson(store, 'contenido/actual');
    const revActual = cur?.data.rev ?? null;
    if ((body.rev ?? null) !== revActual) return fail(409, 'conflicto', { rev: revActual });
    const t = now();
    const rev = `${t.toString(36)}-${randomBytes(4).toString('hex')}`;
    const doc = { items: body.items, rev, at: t };
    const okPut = await store.put('contenido/actual', JSON.stringify(doc), cur ? { ifMatch: cur.etag } : { ifNew: true });
    if (!okPut) return fail(409, 'conflicto', { rev: revActual });
    return res(200, { rev, at: t, n: body.items.length });
  }

  async function datos(body) {
    const g = guard(body); if (g) return g;
    const dias = Math.max(1, Math.min(CFG.MAX_DIAS_LECTURA, Number(body.dias) | 0 || 30));
    const t = now();
    const desde = diaKey(t - dias * 864e5);
    const [crudos, compactos, emps] = await Promise.all([store.list('ev/'), store.list('evd/'), store.list('emp/')]);
    const enRango = k => k.split('/')[1] >= desde;
    const keysEvd = compactos.filter(enRango);
    const keysEv = crudos.filter(enRango).sort().slice(-CFG.MAX_BLOBS_LECTURA);
    const lotes = [];
    for (const r of await inChunks(keysEvd, k => readJson(store, k))) if (Array.isArray(r?.data.lotes)) lotes.push(...r.data.lotes);
    for (const r of await inChunks(keysEv, k => readJson(store, k))) if (r?.data) lotes.push(r.data);
    const empresas = (await inChunks(emps.slice(0, CFG.MAX_BLOBS_LECTURA), k => readJson(store, k))).filter(Boolean).map(r => r.data);
    return res(200, { dias, lotes, empresas, recortado: crudos.filter(enRango).length > keysEv.length });
  }

  async function handle(method, route, body) {
    if (method === 'GET' && route === 'contenidos') return contenido();
    if (method === 'GET' && route === 'salud') return res(200, { ok: true, v: API_VERSION, admin, pausado: paused });
    if (method !== 'POST') return fail(405, 'method_not_allowed');
    if (route === 'eventos') return eventos(body);
    if (route === 'admin/login') return login(body);
    if (route === 'admin/publicar') return publicar(body);
    if (route === 'admin/datos') return datos(body);
    return fail(404, 'not_found');
  }

  return { handle };
}

// Junta los envíos de cada día ya cerrado en un solo documento y borra lo vencido. La corre la función programada (un solo escritor).
export async function compactar({ store, now = Date.now(), budgetMs = CFG.BUDGET_MS }) {
  const t0 = Date.now();
  const hoy = diaKey(now);
  const crudos = await store.list('ev/');
  const porDia = new Map();
  for (const k of crudos) {
    const d = k.split('/')[1];
    if (d >= hoy) continue;
    if (!porDia.has(d)) porDia.set(d, []);
    porDia.get(d).push(k);
  }
  let dias = 0, borrados = 0;
  for (const [d, keys] of [...porDia].sort()) {
    if (Date.now() - t0 > budgetMs) break;
    const prev = await readJson(store, `evd/${d}`);
    const lotes = Array.isArray(prev?.data.lotes) ? prev.data.lotes : [];
    for (const r of await inChunks(keys, k => readJson(store, k))) if (r?.data) lotes.push(r.data);
    await store.put(`evd/${d}`, JSON.stringify({ lotes }));
    await inChunks(keys, k => store.del(k));
    dias++; borrados += keys.length;
  }
  // Retención
  const limite = diaKey(now - CFG.RETENCION_DIAS * 864e5);
  const viejos = (await store.list('evd/')).filter(k => k.split('/')[1] < limite);
  await inChunks(viejos, k => store.del(k));
  const meta = { at: now, dias, borrados, vencidos: viejos.length };
  await store.put('meta/compactar', JSON.stringify(meta));
  return meta;
}
