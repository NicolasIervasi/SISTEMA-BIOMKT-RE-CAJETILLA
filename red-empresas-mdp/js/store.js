// Estado local de la empresa (vive en su celular): perfil, fuentes seguidas, guardados y lo ya visto.
// Al servidor solo viaja lo anónimo: rubro, tamaño, intereses y fuentes, con un identificador al azar (eid). El nombre no sale del celular.
import { FUENTE_IDS, RUBROS, STORE_KEY, TAMANOS, TEMAS } from './config.js';

function nuevoEid() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fresco() {
  return {
    v: 1,
    eid: nuevoEid(),
    listo: false,                     // completó la bienvenida
    perfil: { nombre: '', rubro: '', tamano: '', temas: [] },
    sigue: [...FUENTE_IDS],
    guardados: [],
    vistos: {},                       // itemId -> día en que se abrió (para contar una vista por día)
    usoAnonimo: true,                 // comparte eventos anónimos para las estadísticas de las fuentes
    filtro: '',
    fuenteFiltro: ''
  };
}

// Corrige lo que venga de una versión anterior o de un almacenamiento tocado a mano
export function sanear(s) {
  const f = fresco();
  if (!s || typeof s !== 'object') return f;
  const p = s.perfil && typeof s.perfil === 'object' ? s.perfil : {};
  return {
    ...f,
    eid: typeof s.eid === 'string' && /^[A-Za-z0-9_-]{16,32}$/.test(s.eid) ? s.eid : f.eid,
    listo: s.listo === true,
    perfil: {
      nombre: typeof p.nombre === 'string' ? p.nombre.slice(0, 80) : '',
      rubro: p.rubro in RUBROS ? p.rubro : '',
      tamano: p.tamano in TAMANOS ? p.tamano : '',
      temas: Array.isArray(p.temas) ? p.temas.filter(t => t in TEMAS) : []
    },
    sigue: Array.isArray(s.sigue) ? s.sigue.filter(x => FUENTE_IDS.includes(x)) : f.sigue,
    guardados: Array.isArray(s.guardados) ? s.guardados.filter(x => typeof x === 'string').slice(0, 500) : [],
    vistos: s.vistos && typeof s.vistos === 'object' ? s.vistos : {},
    usoAnonimo: s.usoAnonimo !== false,
    filtro: typeof s.filtro === 'string' ? s.filtro : '',
    fuenteFiltro: FUENTE_IDS.includes(s.fuenteFiltro) ? s.fuenteFiltro : ''
  };
}

export let state = fresco();

// Avisos de cambio en lo guardado (el contador de la agenda escucha esto)
const oyentes = new Set();
export const alCambiar = fn => oyentes.add(fn);
const avisar = () => oyentes.forEach(fn => fn());

export function load() {
  try { state = sanear(JSON.parse(localStorage.getItem(STORE_KEY))); } catch { state = fresco(); }
  return state;
}
export function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* sin almacenamiento: la sesión sigue en memoria */ }
}
export function reset() { state = fresco(); save(); avisar(); return state; }

export function toggleGuardado(id) {
  const i = state.guardados.indexOf(id);
  if (i >= 0) state.guardados.splice(i, 1); else state.guardados.push(id);
  save();
  avisar();
  return i < 0;
}
export const guardado = id => state.guardados.includes(id);

export function toggleSigue(f) {
  const i = state.sigue.indexOf(f);
  if (i >= 0) state.sigue.splice(i, 1); else state.sigue.push(f);
  save();
  return i < 0;
}

// Lo que el servidor conoce de la empresa (sin nombre)
export const perfilAnonimo = () => ({ rubro: state.perfil.rubro, tamano: state.perfil.tamano, temas: state.perfil.temas, sigue: state.sigue });
