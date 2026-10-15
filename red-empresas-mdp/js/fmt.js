// Fechas y textos en es-AR. Todo se muestra en hora de Mar del Plata (UTC−3 todo el año, sin horario de verano),
// aunque el celular esté configurado en otra zona.
import { DIA } from './config.js';

export const TZ = 'America/Argentina/Buenos_Aires';
const OFFSET = -3 * 3600e3;

export const ts = iso => (iso ? Date.parse(iso) : NaN);
// Una fecha sola (AAAA-MM-DD) es ese día en Mar del Plata, no la medianoche UTC (que acá es el día anterior)
export const tsDia = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(`${s}T12:00:00-03:00`) : ts(s));
export const ok = n => Number.isFinite(n);

// Número de día calendario en Mar del Plata (sirve para comparar "hoy", "mañana", "en 3 días")
export const diaAR = ms => Math.floor((ms + OFFSET) / DIA);
export const diasHasta = (ms, now) => diaAR(ms) - diaAR(now);

const f = opts => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...opts });
const fDiaSem = f({ weekday: 'short' });
const fDiaSemLargo = f({ weekday: 'long' });
const fDM = f({ day: 'numeric', month: 'numeric' });
const fDMes = f({ day: 'numeric', month: 'long' });
const fMesCorto = f({ month: 'short' });
const fHora = f({ hour: '2-digit', minute: '2-digit', hour12: false });

const limpio = s => s.replace(/\.$/, '');
export const diaSemana = ms => limpio(fDiaSem.format(ms));                 // "jue"
export const diaSemanaLargo = ms => fDiaSemLargo.format(ms);              // "jueves"
export const fechaCorta = ms => `${diaSemana(ms)} ${fDM.format(ms)}`;      // "jue 22/10"
export const fechaLarga = ms => `${diaSemanaLargo(ms)} ${fDMes.format(ms)}`; // "jueves 22 de octubre"
export const diaMes = ms => fDM.format(ms);                               // "22/10"
export const mesCorto = ms => limpio(fMesCorto.format(ms)).toUpperCase();  // "OCT"
export const numDia = ms => Number(f({ day: 'numeric' }).format(ms));
export const hora = ms => fHora.format(ms).replace(/^24/, '00');           // "18:00"

// "hoy", "mañana", "el jueves", "el 22/10", "ayer", "hace 3 días"
export function cuando(ms, now) {
  const d = diasHasta(ms, now);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 1 && d < 7) return `el ${diaSemanaLargo(ms)}`;
  if (d < 0 && d > -30) return `hace ${-d} días`;
  return `el ${diaMes(ms)}`;
}

export function plural(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }
export const num = n => new Intl.NumberFormat('es-AR').format(n);
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Búsqueda sin tildes ni mayúsculas
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Fecha ISO del día en Mar del Plata (para inputs y campos "verificado")
export function isoDia(ms) {
  const d = new Date(ms + OFFSET);
  return d.toISOString().slice(0, 10);
}
// Valor para <input type="datetime-local"> en hora de Mar del Plata, y vuelta a ISO con zona
export const aInputLocal = iso => (iso ? new Date(ts(iso) + OFFSET).toISOString().slice(0, 16) : '');
export const deInputLocal = v => (v ? `${v.length === 16 ? v + ':00' : v}-03:00` : '');
