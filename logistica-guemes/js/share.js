// Link para el repartidor: la ruta viaja dentro de la URL (#/r/...), así llega al celular sin servidor.
import { VEHICLES } from './config.js';
import { courierById, isOpen, orderById, state } from './store.js';

const toB64u = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  const w = stream.writable.getWriter();
  w.write(bytes).catch(() => {}); w.close().catch(() => {});      // si los datos están rotos, el error sale por la lectura
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodePayload(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') return 'z' + toB64u(await pipe(raw, new CompressionStream('deflate-raw')));
  return 'j' + toB64u(raw);
}
export async function decodePayload(str) {
  const kind = str[0], bytes = fromB64u(str.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  const obj = JSON.parse(new TextDecoder().decode(raw));
  if (!obj || obj.v !== 1 || !Array.isArray(obj.s) || !obj.d) throw new Error('Link de ruta inválido.');
  return obj;
}

// Paradas pendientes de un repartidor, en el orden de su ruta
export function pendingStopsOf(courierId) {
  const r = state.routes[courierId];
  const mine = state.orders.filter(o => o.courierId === courierId && isOpen(o));
  const ordered = r ? r.order.map(orderById).filter(o => o && o.courierId === courierId && isOpen(o)) : [];
  const seen = new Set(ordered.map(o => o.id));
  return { r, list: [...ordered, ...mine.filter(o => !seen.has(o.id))] };
}

export function buildCourierPayload(courierId) {
  const c = courierById(courierId);
  const { r, list } = pendingStopsOf(courierId);
  const legAt = o => r && !r.stale ? r.legs[r.order.indexOf(o.id)] : null;
  return {
    v: 1,
    c: { name: c.name, vehicle: c.vehicle, color: c.color },
    d: state.settings.center,
    sv: state.settings.serviceMin,
    rt: state.settings.roundTrip ? 1 : 0,
    f: VEHICLES[c.vehicle].factor,
    s: list.map(o => {
      const leg = legAt(o);
      return [o.code, o.name, o.address, o.phone, o.notes, +o.lat.toFixed(6), +o.lng.toFixed(6), o.amount + o.fee, o.payment === 'efectivo' ? 1 : 0,
        leg ? Math.round(leg.dur) : null, leg ? Math.round(leg.dist) : null];
    }),
    lr: r && !r.stale && r.closed ? [Math.round(r.legs[r.order.length].dur), Math.round(r.legs[r.order.length].dist)] : null
  };
}

export async function courierLink(courierId) {
  const data = await encodePayload(buildCourierPayload(courierId));
  return `${location.origin}${location.pathname}#/r/${data}`;
}
