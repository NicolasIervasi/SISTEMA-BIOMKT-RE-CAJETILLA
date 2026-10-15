// Conexión con el servidor (funciones de Netlify) y modo local.
// Si /api no responde (la app se sirve como carpeta estática), todo sigue andando en "modo local": el contenido sale de la semilla
// o de lo que se editó en el panel de este navegador, y las estadísticas se arman con los eventos de este mismo navegador.
import { diaAR } from './fmt.js';
import { SEED } from './seed.js';
import { perfilAnonimo, save, state } from './store.js';

const K_CACHE = 'redmdp.contenido';     // última versión que mandó el servidor (para abrir sin conexión)
const K_COLA = 'redmdp.cola';           // eventos sin enviar
const K_LOCAL = 'redmdp.local.contenido';
const K_LOG = 'redmdp.local.eventos';
const K_ADMIN = 'redmdp.admin';
const K_PERFIL = 'redmdp.perfil.enviado';

const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* lleno o bloqueado */ } };
const borrar = k => { try { localStorage.removeItem(k); } catch { /* nada */ } };
const leerTxt = k => { try { return localStorage.getItem(k); } catch { return null; } };
const escribirTxt = (k, v) => { try { localStorage.setItem(k, v); } catch { /* lleno o bloqueado */ } };

export let modo = 'local';               // 'servidor' | 'local'
export let origen = 'semilla';           // de dónde salió el contenido que se ve: servidor | cache | semilla | local
export let rev = null;

async function pedir(path, { method = 'GET', body, timeout = 6000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch('/api/' + path, {
      method, signal: ctl.signal,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { status: 0, body: null };     // servidor estático: no hay API
    return { status: r.status, body: await r.json() };
  } catch {
    return { status: 0, body: null };
  } finally { clearTimeout(t); }
}

export async function cargarContenido() {
  const r = await pedir('contenidos');
  if (r.status === 200 && r.body) {
    modo = 'servidor';
    rev = r.body.rev;
    if (Array.isArray(r.body.items)) {
      escribir(K_CACHE, { items: r.body.items, rev: r.body.rev });
      origen = 'servidor';
      return r.body.items;
    }
    origen = 'semilla';                  // servidor andando pero sin nada publicado todavía
    return SEED;
  }
  const local = leer(K_LOCAL, null);
  if (r.status === 0 && Array.isArray(local)) { modo = 'local'; origen = 'local'; return local; }
  const cache = leer(K_CACHE, null);
  if (cache?.items) { modo = 'servidor'; origen = 'cache'; rev = cache.rev; return cache.items; }   // la copia vino de un servidor
  modo = 'local'; origen = 'semilla';
  return SEED;
}

// ───────────── Eventos anónimos ─────────────
let timer = null;

export function registrar(tipo, id) {
  if (!state.usoAnonimo) return;
  if (tipo === 'ver' || tipo === 'abrir') {                // una vista por pieza (y una apertura de la app) por día
    const hoy = diaAR(Date.now());
    if (state.vistos[id] === hoy) return;
    state.vistos[id] = hoy;
    save();
  }
  const ev = [tipo, id, Date.now()];
  if (modo === 'local') {
    const log = leer(K_LOG, []);
    log.push(ev);
    escribir(K_LOG, log.slice(-3000));
    return;
  }
  const cola = leer(K_COLA, []);
  cola.push(ev);
  escribir(K_COLA, cola.slice(-500));
  programar();
}

function programar() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; enviar(); }, 20e3);
}

const firmaPerfil = () => JSON.stringify(perfilAnonimo());

// Manda la cola (hasta 60 eventos) y el perfil si cambió. beacon: al cerrar u ocultar la app.
export async function enviar({ beacon = false } = {}) {
  if (modo !== 'servidor' || !state.listo) return;
  const cola = leer(K_COLA, []);
  const firma = firmaPerfil();
  const cambioPerfil = state.usoAnonimo && leerTxt(K_PERFIL) !== firma;
  if (!cola.length && !cambioPerfil) return;
  const lote = cola.slice(0, 60);
  const body = { eid: state.eid, ev: lote, ...(cambioPerfil ? { perfil: perfilAnonimo() } : {}) };
  if (beacon && navigator.sendBeacon) {
    if (navigator.sendBeacon('/api/eventos', new Blob([JSON.stringify(body)], { type: 'text/plain' }))) {
      escribir(K_COLA, cola.slice(lote.length));
      if (cambioPerfil) escribirTxt(K_PERFIL, firma);
    }
    return;
  }
  const r = await pedir('eventos', { method: 'POST', body });
  if (r.status === 200) {
    escribir(K_COLA, leer(K_COLA, []).slice(lote.length));
    if (cambioPerfil) escribirTxt(K_PERFIL, firma);
    if (cola.length > lote.length) programar();
  } else if (r.status === 400) {
    escribir(K_COLA, []);                                   // un lote que el servidor rechaza no se reintenta para siempre
  } else programar();
}

export const perfilCambiado = () => { if (modo === 'servidor') enviar(); };

// Borra el perfil anónimo del servidor, la cola y los datos locales de uso
export async function borrarMisDatos() {
  borrar(K_COLA); borrar(K_PERFIL); borrar(K_LOG);
  if (modo !== 'servidor') return true;
  const r = await pedir('eventos', { method: 'POST', body: { eid: state.eid, borrar: true } });
  return r.status === 200;
}

// ───────────── Panel ─────────────
export const tokenAdmin = () => leer(K_ADMIN, null);
export const salirAdmin = () => borrar(K_ADMIN);

export async function salud() {
  const r = await pedir('salud', { timeout: 4000 });
  return r.status === 200 ? r.body : null;
}

export async function login(code) {
  const r = await pedir('admin/login', { method: 'POST', body: { code } });
  if (r.status === 200) { escribir(K_ADMIN, r.body.token); return { ok: true }; }
  return { ok: false, error: r.body?.error || 'sin_conexion' };
}

export async function publicar(items) {
  if (modo === 'local') { escribir(K_LOCAL, items); origen = 'local'; return { ok: true, local: true }; }
  const r = await pedir('admin/publicar', { method: 'POST', body: { token: tokenAdmin(), items, rev }, timeout: 15000 });
  if (r.status === 200) { rev = r.body.rev; escribir(K_CACHE, { items, rev }); origen = 'servidor'; return { ok: true }; }
  return { ok: false, status: r.status, error: r.body?.error || 'sin_conexion', errores: r.body?.errores, rev: r.body?.rev };
}

export const descartarLocal = () => borrar(K_LOCAL);

export async function datos(dias) {
  if (modo === 'local') {
    const ev = leer(K_LOG, []);
    return {
      ok: true, local: true,
      lotes: ev.length ? [{ eid: state.eid, ev }] : [],
      empresas: state.listo ? [{ eid: state.eid, ...perfilAnonimo() }] : []
    };
  }
  const r = await pedir('admin/datos', { method: 'POST', body: { token: tokenAdmin(), dias }, timeout: 20000 });
  if (r.status === 200) return { ok: true, ...r.body };
  return { ok: false, status: r.status, error: r.body?.error || 'sin_conexion' };
}

// Al ocultar la app se manda lo pendiente; al volver, se reintenta
export function iniciarEnvios() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviar({ beacon: true });
  });
  if (leer(K_COLA, []).length) programar();
}
