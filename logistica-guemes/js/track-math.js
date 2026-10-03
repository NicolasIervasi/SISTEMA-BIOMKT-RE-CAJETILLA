// Matemática del track GPS: la usan el celular del repartidor, el despacho y el servidor (por eso es pura, sin DOM).
// Un punto: { t: ms, lat, lng, acc?: metros, spd?: m/s, hdg?: grados }
import { distM } from './geomath.js';

export const LIMITS = {
  maxAccuracyM: 80,        // peor precisión que se acepta para dibujar y transmitir
  minStepM: 15,            // se transmite un punto nuevo si se movió al menos esto...
  minStepMs: 8000,         // ...o si pasó al menos este tiempo
  maxSpeedMs: 45,          // 162 km/h: más que eso en la zona es un salto de GPS, no movimiento real
  kmMaxAccuracyM: 50,      // para sumar km se exige mejor precisión
  kmMinStepM: 4            // por debajo de esto es temblor del GPS parado
};

const finite = n => typeof n === 'number' && Number.isFinite(n);
export const validCoords = p => !!p && finite(p.lat) && finite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

// ¿Vale la pena guardar/transmitir este punto, dado el último que se aceptó?
export function acceptPoint(prev, p, L = LIMITS) {
  if (!validCoords(p) || !finite(p.t)) return false;
  if (finite(p.acc) && p.acc > L.maxAccuracyM) return false;
  if (!prev) return true;
  const dt = p.t - prev.t;
  if (dt <= 0) return false;                                  // fuera de orden o repetido
  const d = distM(prev, p);
  if (d / (dt / 1000) > L.maxSpeedMs && d > 100) return false;  // salto imposible
  return d >= L.minStepM || dt >= L.minStepMs;
}

// Km recorridos con filtro de ruido (no suma temblor ni saltos).
export function trackKm(points, L = LIMITS) {
  let m = 0, prev = null;
  for (const p of points) {
    if (!validCoords(p) || !finite(p.t) || (finite(p.acc) && p.acc > L.kmMaxAccuracyM)) continue;
    if (!prev) { prev = p; continue; }
    const d = distM(prev, p), dt = (p.t - prev.t) / 1000;
    if (!(dt > 0)) continue;                      // repetido o fuera de orden
    if (d / dt > L.maxSpeedMs) continue;          // salto de GPS: se descarta y se sigue comparando con el último bueno
    if (d < L.kmMinStepM) continue;               // temblor: la referencia no avanza, así un movimiento lento sí termina sumando
    m += d; prev = p;
  }
  return m / 1000;
}

// Adelgaza una estela: conserva puntos separados por al menos minM metros y, si aun así hay más de max, muestrea parejo.
// Siempre conserva el primero y el último.
export function thin(points, minM = 10, max = 2500) {
  if (points.length <= 2) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) if (distM(out[out.length - 1], points[i]) >= minM) out.push(points[i]);
  out.push(points[points.length - 1]);
  if (out.length <= max) return out;
  const step = (out.length - 1) / (max - 1), res = [];
  for (let i = 0; i < max; i++) res.push(out[Math.round(i * step)]);
  return res;
}

// Une dos listas de puntos sin duplicar por 't' y las deja en orden de tiempo.
export function mergePoints(a, b) {
  const seen = new Set(), out = [];
  for (const p of [...a, ...b]) { if (!seen.has(p.t)) { seen.add(p.t); out.push(p); } }
  return out.sort((x, y) => x.t - y.t);
}
