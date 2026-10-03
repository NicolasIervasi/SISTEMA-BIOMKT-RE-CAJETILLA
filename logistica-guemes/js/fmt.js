// Formatos y helpers puros (sin DOM): se testean en node.
import { BLOCK_M } from './config.js';

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const fmtMoney = n => money.format(Math.round(n || 0));
export const num1 = n => n.toFixed(1).replace('.', ',');

export function fmtBlocks(m) {
  const b = m / BLOCK_M;
  return Math.abs(b - 1) < 0.05 ? '1 cuadra' : `${num1(b)} cuadras`;
}
export function fmtDist(m) { return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${num1(m / 1000)} km`; }
export function fmtDur(s) {
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export const fmtTime = ms => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
export const fmtDay = ms => new Date(ms).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
export const startOfDay = (ms = Date.now()) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function todayAt(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime();
}

// Teléfono argentino -> formato de wa.me (549 + área + número, sin 0 ni 15). '' si no alcanza para armarlo.
export function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^00/, '');
  if (d.startsWith('54')) d = d.slice(2).replace(/^9/, '');
  d = d.replace(/^0/, '');
  if (d.length === 12) {                                  // área + 15 + número: se saca el 15
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') { d = d.slice(0, area) + d.slice(area + 2); break; }
    }
  }
  return d.length === 10 ? '549' + d : '';
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

export const csvCell = v => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// "Nombre, Dirección, Teléfono, Monto" (coma, punto y coma o tab). Una sola columna se toma como dirección.
export const parseAmount = v => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
export function parseOrderLines(text) {
  const rows = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(x => x.trim());
    // "Güemes 2900, Mar del Plata" es una dirección con coma, no nombre + dirección
    if (parts.length === 1 || (sep === ',' && parts.length === 2 && /\d/.test(parts[0]))) { rows.push({ address: line }); continue; }
    const [name, address, phone, amount] = parts;
    if (address) rows.push({ name, address, phone: phone || '', amount: parseAmount(amount) });
  }
  return rows;
}
