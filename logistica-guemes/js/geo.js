// Servicios externos: Nominatim (direcciones) y OSRM (tiempos y trazado por calles).
import { FALLBACK_DETOUR, FALLBACK_SPEED, NOMINATIM, OSRM } from './config.js';
import { sleep } from './fmt.js';
import { distM } from './geomath.js';
import { inZone, radiusM, state } from './store.js';

export async function fetchJSON(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

// Las consultas se hacen de a una y con 1,1 s de separación (política de uso de Nominatim)
let chain = Promise.resolve(), lastCall = 0;
function queued(task) {
  const run = async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    return task();
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

async function searchOnce(text) {
  const { lat, lng } = state.settings.center;
  const span = radiusM() * 2;
  const dLat = span / 111320, dLng = span / (111320 * Math.cos(lat * Math.PI / 180));
  const q = /mar del plata/i.test(text) ? text : `${text}, Mar del Plata, Argentina`;
  const params = new URLSearchParams({
    format: 'jsonv2', q, limit: '6', countrycodes: 'ar', addressdetails: '1', 'accept-language': 'es',
    viewbox: [lng - dLng, lat + dLat, lng + dLng, lat - dLat].join(',')
  });
  const rows = await fetchJSON(`${NOMINATIM}?${params}`, 10000);
  return rows.map(r => ({ lat: Number(r.lat), lng: Number(r.lon), exact: !!r.address?.house_number }));
}

// { status: 'ok' | 'outside' | 'notfound', lat, lng, exact, distance }
export async function geocode(text) {
  const found = await queued(() => searchOnce(text));
  const inside = found.filter(inZone);
  if (inside.length) {
    const best = inside.find(r => r.exact) || inside[0];
    return { status: 'ok', ...best, distance: distM(state.settings.center, best) };
  }
  if (found.length) return { status: 'outside', distance: Math.min(...found.map(r => distM(state.settings.center, r))) };
  return { status: 'notfound' };
}

function fallbackMatrix(pts) {
  const dist = pts.map(a => pts.map(b => distM(a, b) * FALLBACK_DETOUR));
  return { dur: dist.map(row => row.map(d => d / FALLBACK_SPEED)), dist, estimated: true };
}
const coordStr = pts => pts.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');

export async function getMatrix(pts) {
  try {
    const j = await fetchJSON(`${OSRM}/table/v1/driving/${coordStr(pts)}?annotations=duration,distance`);
    const ok = j.code === 'Ok' && j.durations && j.distances && j.durations.every(r => r.every(v => v != null));
    if (!ok) throw new Error(j.code || 'matriz incompleta');
    return { dur: j.durations, dist: j.distances, estimated: false };
  } catch { return fallbackMatrix(pts); }
}

export async function getRouteLegs(seq) {
  try {
    const j = await fetchJSON(`${OSRM}/route/v1/driving/${coordStr(seq)}?overview=full&geometries=geojson&steps=false`);
    if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error(j.code);
    const r = j.routes[0];
    return { geometry: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), legs: r.legs.map(l => ({ dist: l.distance, dur: l.duration })) };
  } catch { return null; }
}

