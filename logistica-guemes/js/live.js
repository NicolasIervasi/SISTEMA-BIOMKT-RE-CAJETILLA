// Seguimiento GPS en vivo (cliente). Habla con /api/track/* (función de Netlify + Blobs).
// Dos lados: el despacho (consulta cada pocos segundos) y el celular del repartidor (transmite).
// El costo del servidor crece con la cantidad de pedidos: por eso los ritmos son parejos y lentos, y se frenan solos cuando no hay nadie.
import { LIMITS, acceptPoint, mergePoints, trackKm } from './track-math.js';
import { startOfDay } from './fmt.js';
import * as store from './store.js';

const API = '/api/track';
export const FLUSH_MS = 20000;          // el celular manda lo acumulado cada 20 s
export const FLUSH_COUNT = 60;          // o antes, si junta un lote entero
export const POLL_MS = 12000;           // el despacho consulta cada 12 s si hay alguien en línea
export const POLL_IDLE_MS = 45000;      // cada 45 s si no hay nadie transmitiendo
export const POLL_HIDDEN_MS = 60000;    // y cada 60 s si la pestaña está oculta
export const ONLINE_MS = 120000;        // sin señal (ni posiciones ni latidos) pasado este tiempo
export const HEARTBEAT_MS = 45000;      // si no hay posiciones nuevas (celular quieto), igual avisa que sigue ahí
export const MAX_QUEUE = 600;           // puntos que el celular guarda sin conexión (~40 min)
export const MAX_TRACK = 5000;          // puntos por repartidor que el despacho mantiene en memoria
export const SHARE_MAX_MS = 12 * 3600e3;// la transmisión se corta sola a las 12 h
const OVERLAP_MS = 10000;               // el despacho pide desde un poco antes de la última lectura; mergePoints deduplica
const BACKOFF_MAX_MS = 5 * 60e3;
const STALE_PT_MS = 5 * 3600e3;         // el servidor rechaza puntos de más de 6 h
const CONSENT_KEY = 'cuadra.consent.v2';

// Espera creciente con variación al azar (muchos celulares no deben reintentar todos a la vez)
export const backoff = (base, fails, rand = Math.random) => Math.min(BACKOFF_MAX_MS, base * 2 ** Math.min(fails, 6)) * (0.75 + rand() * 0.5);

// Cada cuánto consulta el despacho: lento si la pestaña está oculta o nadie transmite, más seguido si hay alguien en línea
export const pollDelay = ({ hidden = false, online = false, fails = 0, rand = Math.random } = {}) =>
  fails ? backoff(POLL_MS, fails, rand) : hidden ? POLL_HIDDEN_MS : online ? POLL_MS : POLL_IDLE_MS;

export async function api(path, body, { keepalive = false, timeout = 10000, fetchFn = globalThis.fetch } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetchFn(`${API}/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      signal: ctl.signal, keepalive, cache: 'no-store'
    });
    let data = null;
    try { data = await r.json(); } catch { /* sin cuerpo */ }
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: null }; }
  finally { clearTimeout(timer); }
}

export class LiveError extends Error {}
// Solo un 401 con el cuerpo JSON de la función significa "tu clave no sirve". Un 404 o un 5xx de HTML (sitio pausado, función ausente,
// despliegue en curso) son fallas pasajeras: no se pierde la clave ni se frena el GPS.
export const unauthorized = r => r.status === 401 && r.data?.error === 'unauthorized';
const explain = r =>
  r.status === 0 ? 'No hay conexión con el servidor.'
    : r.status === 429 ? 'Demasiados intentos: probá de nuevo en un rato.'
      : r.data?.error === 'not_configured' ? 'El seguimiento todavía no está activado en el servidor.'
        : r.data?.error === 'paused' ? 'El seguimiento está en pausa en el servidor.'
          : r.status >= 500 || r.status === 404 ? 'El servicio de seguimiento no responde ahora.' : 'El servidor no aceptó el pedido.';

/* ───────── Despacho: activar y claves ───────── */
export const isEnabled = () => !!store.state.settings.live;

// code: código de activación del servidor (lo define quien publica la app)
export async function enableLive(code) {
  const r = await api('ws', { code: String(code || '').trim() });
  if (r.status === 401) throw new LiveError('El código de activación no es correcto.');
  if (!r.ok || !r.data?.ws || !r.data?.admin) throw new LiveError(explain(r));
  store.setLive({ ws: r.data.ws, admin: r.data.admin });
}

// Borra del servidor todo lo del espacio (recorridos y claves de repartidores) y deja de usarlo.
// Si el servidor no responde y force es falso, avisa para que el usuario decida (lo guardado se borra solo a las 48 h).
export async function disableLive({ force = false } = {}) {
  const live = store.state.settings.live;
  if (live) {
    const r = await api('revoke', { ws: live.ws, admin: live.admin });
    if (!r.ok && !force) throw new LiveError(explain(r));
  }
  store.setLive(null);
}

// Borra las posiciones guardadas (de un repartidor o de todos) sin desactivar el seguimiento.
export async function clearTracks(courierId) {
  const live = store.state.settings.live;
  if (!live) return;
  const r = await api('clear', { ws: live.ws, admin: live.admin, ...(courierId ? { cid: courierId } : {}) });
  if (!r.ok) throw new LiveError(explain(r));
}

// Devuelve la clave de escritura del repartidor (el servidor la devuelve siempre la misma hasta que se rote). null si no se pudo.
export async function ensureCourierKey(courierId) {
  const live = store.state.settings.live, c = store.courierById(courierId);
  if (!live || !c) return null;
  const r = await api('courier', { ws: live.ws, admin: live.admin, cid: c.id, name: c.name, color: c.color });
  if (r.ok && r.data?.ck) { if (c.ck !== r.data.ck) store.setCourierKey(c.id, r.data.ck); return r.data.ck; }
  return c.ck || null;                        // sin conexión: el link sale con la clave que ya se tenía
}

// Corta la clave de un repartidor (por ejemplo un celular perdido) y le borra el recorrido. Genera una nueva al volver a enviarle el link.
export async function revokeCourier(courierId) {
  const live = store.state.settings.live;
  if (!live) return false;
  const r = await api('revoke', { ws: live.ws, admin: live.admin, cid: courierId });
  if (r.ok) store.setCourierKey(courierId, null);
  return r.ok;
}

// Repartidores eliminados: el servidor corta sus claves en cuanto hay conexión.
export async function processPending() {
  const live = store.state.settings.live;
  for (const id of live ? [...live.pending] : []) {
    const r = await api('revoke', { ws: live.ws, admin: live.admin, cid: id });
    if (r.ok || unauthorized(r)) store.clearPendingRevoke(id); else break;
  }
}

// Credenciales que viajan en el link del repartidor (null si el seguimiento no está activo)
export const trackingFor = courierId => {
  const live = store.state.settings.live, c = store.courierById(courierId);
  return live && c?.ck ? { w: live.ws, c: c.id, k: c.ck } : null;
};

/* ───────── Despacho: consulta periódica ───────── */
// tracks: Map(cid -> { name, color, pts, last, ev, online, stopped, ageMs, km })
export function createTracker({ getLive = () => store.state.settings.live, call = api, now = Date.now, doc = globalThis.document, rand = Math.random } = {}) {
  const tracks = new Map(), listeners = new Set();
  let cursor = null, timer = null, running = false, inFlight = false, offset = 0, status = 'idle', fails = 0, wsId = null;

  const snapshot = () => {
    for (const t of tracks.values()) {
      const seen = Math.max(t.seen ?? 0, t.last?.a ?? 0);
      t.ageMs = seen ? Math.max(0, now() - offset - seen) : null;
      t.stopped = !!(t.ev && t.ev.k === 'stop' && (!t.last || t.ev.a >= t.last.a));
      t.background = !!(t.ev && t.ev.k === 'hide');                // el celular pasó a segundo plano: no manda GPS hasta que vuelva
      t.online = t.ageMs != null && t.ageMs < ONLINE_MS && !t.stopped;
    }
    return { tracks, status };
  };
  const emit = () => { const s = snapshot(); listeners.forEach(fn => fn(s)); };
  const delay = () => pollDelay({ hidden: !!doc?.hidden, online: [...tracks.values()].some(t => t.online), fails, rand });
  const schedule = ms => { clearTimeout(timer); if (running) timer = setTimeout(tick, ms ?? delay()); };

  async function tick() {
    clearTimeout(timer);
    const live = getLive();
    if (!live) { status = 'off'; emit(); return schedule(POLL_IDLE_MS); }
    if (live.ws !== wsId) { tracks.clear(); cursor = null; wsId = live.ws; }       // otro espacio: se empieza de cero
    if (inFlight) return schedule();
    inFlight = true;
    const r = await call('read', { ws: live.ws, admin: live.admin, since: cursor ?? Math.max(startOfDay(), now() - 24 * 3600e3) });
    inFlight = false;
    if (!running) return;
    if (r.ok && r.data?.couriers) {
      status = 'ok'; fails = 0;
      offset = now() - r.data.now;
      const seen = new Set(Object.keys(r.data.couriers));
      for (const cid of [...tracks.keys()]) if (!seen.has(cid)) tracks.delete(cid);   // repartidor dado de baja
      for (const [cid, d] of Object.entries(r.data.couriers)) {
        const t = tracks.get(cid) || { pts: [] };
        t.name = d.name; t.color = d.color;
        if (d.clr > (t.clr || 0)) {                                  // se borraron recorridos en el servidor: lo viejo que se tenía en pantalla también se va
          t.clr = d.clr;
          t.pts = t.pts.filter(p => p.a >= d.clr); t.km = trackKm(t.pts);
          if (t.last && t.last.a < d.clr) t.last = null;
          if (t.ev && t.ev.a < d.clr) t.ev = null;
          if (t.seen && t.seen < d.clr) t.seen = 0;
        }
        if (d.pts?.length) { t.pts = mergePoints(t.pts, d.pts); if (t.pts.length > MAX_TRACK) t.pts = t.pts.slice(-MAX_TRACK); t.km = trackKm(t.pts); }
        t.km ??= 0;
        if (d.last && (!t.last || d.last.a >= t.last.a)) t.last = d.last;
        if (d.ev && (!t.ev || d.ev.a >= t.ev.a)) t.ev = d.ev;
        if (d.seen > (t.seen || 0)) t.seen = d.seen;
        tracks.set(cid, t);
      }
      cursor = r.data.now - OVERLAP_MS;
    } else if (unauthorized(r)) {
      status = 'denied'; emit(); return;                           // credenciales que el servidor no reconoce: no se insiste
    } else {
      fails++;
      status = r.status === 0 ? 'offline' : r.status === 429 ? 'limited' : r.data?.error === 'paused' ? 'paused'
        : r.data?.error === 'not_configured' || r.status === 404 ? 'unavailable' : 'error';
    }
    emit();
    schedule();
  }

  const onVisible = () => { if (running && !doc.hidden && !inFlight) tick(); };

  return {
    start() { if (running) return; running = true; doc?.addEventListener?.('visibilitychange', onVisible); tick(); },
    stop() { running = false; clearTimeout(timer); doc?.removeEventListener?.('visibilitychange', onVisible); },
    reset() { tracks.clear(); cursor = null; fails = 0; wsId = null; },
    refresh() { if (running && !inFlight) tick(); },
    retry() { running = true; fails = 0; tick(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    snapshot, tick
  };
}

let shared = null;
export const getTracker = () => (shared ||= createTracker());

/* ───────── Celular del repartidor: consentimiento y transmisión ───────── */
const readConsent = storage => { try { const o = JSON.parse(storage.getItem(CONSENT_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
// El consentimiento vale para un espacio de trabajo (un despacho): un link de otro despacho vuelve a preguntar.
export const hasConsent = (ws, storage = globalThis.localStorage) => !!readConsent(storage)[ws];
export function giveConsent(ws, storage = globalThis.localStorage, now = Date.now) {
  try { storage.setItem(CONSENT_KEY, JSON.stringify({ ...readConsent(storage), [ws]: now() })); } catch { /* sin almacenamiento: se vuelve a preguntar */ }
}

const loadQueue = (storage, key) => { try { const q = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(q) ? q : []; } catch { return []; } };
const saveQueue = (storage, key, q) => { try { storage.setItem(key, JSON.stringify(q)); } catch { /* sin almacenamiento */ } };

// tk: { w, c, k } (espacio, repartidor y clave del link).
// status: 'idle' | 'live' | 'offline' | 'denied' | 'revoked' | 'expired' | 'error'
export function createSharer({
  tk, onChange, geo = globalThis.navigator?.geolocation, call = api, storage = globalThis.localStorage,
  now = Date.now, doc = globalThis.document, nav = globalThis.navigator, rand = Math.random
}) {
  const qKey = `cuadra.q.${tk.c}`;
  let queue = loadQueue(storage, qKey), last = null, watchId = null, timer = null, sending = false, wake = null;
  const evs = [];                                        // eventos por enviar (start, stop, hide, show, hb), en orden
  let startedAt = 0, fails = 0, nextTry = 0;
  const s = { status: 'idle', sent: 0, km: 0, trail: [], lastAt: null, fixAt: null, error: '', geoError: '', fix: null };
  const emit = () => onChange?.({ ...s, queued: queue.length });
  const set = (status, error = '') => { s.status = status; s.error = error; emit(); };

  function onPos(pos) {
    const c = pos.coords;
    s.fix = { lat: c.latitude, lng: c.longitude, acc: c.accuracy };
    s.fixAt = now();
    s.geoError = '';
    const p = { t: pos.timestamp || now(), lat: c.latitude, lng: c.longitude };
    if (Number.isFinite(c.accuracy)) p.acc = Math.round(c.accuracy);
    if (Number.isFinite(c.speed) && c.speed >= 0) p.spd = Math.round(c.speed * 10) / 10;
    if (Number.isFinite(c.heading) && c.heading >= 0) p.hdg = Math.round(c.heading);
    if (!acceptPoint(last, p)) { emit(); return; }
    last = p;
    s.trail.push(p); if (s.trail.length > 3000) s.trail.shift();
    s.km = trackKm(s.trail);
    queue.push(p);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    saveQueue(storage, qKey, queue);
    emit();
    if (queue.length >= FLUSH_COUNT) flush();
  }
  function onErr(err) {
    if (err?.code === 1) { stop({ final: false }); set('denied', 'Permiso de ubicación denegado.'); }
    else { s.geoError = err?.code === 3 ? 'Buscando señal GPS…' : 'No pude obtener tu ubicación todavía.'; emit(); }
  }

  async function flush({ keepalive = false, force = false } = {}) {
    if (sending || (!force && now() < nextTry)) return;
    if (watchId != null && now() - startedAt > SHARE_MAX_MS) { stop({ final: true, status: 'expired', error: 'Pasaron 12 horas: dejé de compartir tu ubicación. Volvé a activarla si seguís repartiendo.' }); return; }
    if (watchId != null && !queue.length && !evs.length && now() - (s.lastAt ?? startedAt) >= HEARTBEAT_MS) evs.push('hb');   // quieto: sigue ahí
    sending = true;
    try {
      queue = queue.filter(p => now() - p.t < STALE_PT_MS);
      while (queue.length || evs.length) {
        const batch = queue.slice(0, 60);
        const ev = evs[0];
        const r = await call('ping', { ws: tk.w, cid: tk.c, ck: tk.k, ct: now(), pts: batch, ...(ev ? { ev } : {}) }, { keepalive });
        if (r.ok || r.status === 400 || r.status === 413) {          // 400/413: lote mal armado; reintentarlo no lo arregla
          queue = queue.slice(batch.length);
          if (ev && evs[0] === ev) evs.shift();
          if (r.ok) { s.sent += r.data?.accepted ?? batch.length; s.lastAt = now(); }
          fails = 0; nextTry = 0;
          saveQueue(storage, qKey, queue);
          if (s.status !== 'denied' && s.status !== 'expired') set(watchId != null ? 'live' : 'idle');
          if (!queue.length && !evs.length) break;
        } else {
          if (unauthorized(r)) { stop({ final: false }); set('revoked', 'El despacho dejó de aceptar tu ubicación. Pedile un link nuevo.'); }
          else {
            fails++; nextTry = now() + backoff(FLUSH_MS, fails - 1, rand);
            if ((ev === 'hb' || ev === 'show' || ev === 'hide') && evs[0] === ev) evs.shift();      // estos no valen la pena si no llegaron a tiempo
            set('offline', r.status === 429 ? 'Enviando muy seguido; reintento en un momento.' : r.data?.error === 'paused' ? 'El seguimiento está en pausa en el servidor.' : 'Sin conexión: guardo tu recorrido y lo envío cuando vuelva.');
          }
          break;
        }
      }
    } finally { sending = false; }
  }

  async function lockScreen() {
    try { if (nav?.wakeLock && !wake) { wake = await nav.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { wake = null; }
  }
  // Con la pantalla bloqueada o en otra app el navegador deja de entregar posiciones: se avisa al despacho para que no lo tome por una falla.
  const onVisibility = () => {
    if (!doc || watchId == null) return;
    if (doc.hidden) { evs.push('hide'); flush({ keepalive: true, force: true }); }
    else { evs.push('show'); lockScreen(); flush({ force: true }); }
  };

  function start() {
    if (watchId != null) return true;
    if (!geo) { set('error', 'Este dispositivo no permite usar la ubicación.'); return false; }
    evs.length = 0; evs.push('start'); startedAt = now(); fails = 0; nextTry = 0; last = null; s.lastAt = null;
    watchId = geo.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    timer = setInterval(() => flush(), FLUSH_MS);
    doc?.addEventListener?.('visibilitychange', onVisibility);
    lockScreen();
    set('live');
    flush({ force: true });
    return true;
  }

  async function stop({ final = true, status = 'idle', error = '' } = {}) {
    if (watchId != null) { geo?.clearWatch?.(watchId); watchId = null; }
    clearInterval(timer); timer = null;
    doc?.removeEventListener?.('visibilitychange', onVisibility);
    try { wake?.release?.(); } catch { /* ya liberado */ }
    wake = null; s.fix = null;
    if (final) { evs.length = 0; evs.push('stop'); await flush({ keepalive: true, force: true }); if (s.status !== 'revoked') set(status, error); }
  }

  // "Borrar mi recorrido": lo que el servidor guardó de este repartidor y lo que falta enviar
  async function clearMine() {
    queue = []; saveQueue(storage, qKey, queue);
    s.trail = []; s.km = 0; last = null;
    const r = await call('clear', { ws: tk.w, cid: tk.c, ck: tk.k });
    emit();
    return r.ok;
  }

  return { start, stop, flush, clearMine, state: () => ({ ...s, queued: queue.length }), isActive: () => watchId != null, _onPos: onPos };
}

export { LIMITS };
