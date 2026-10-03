// Métricas del negocio: funciones puras sobre la lista de pedidos.
import { BLOCK_M } from './config.js';
import { startOfDay } from './fmt.js';
import { distM, ringIndex } from './geomath.js';

const DAY = 86400000;
const inRange = (t, from, to) => t != null && t >= from && t < to;

// Rango en ms: days = 1 es "hoy", 7 son los últimos 7 días incluyendo hoy, etc.
export function rangeFor(days, now = Date.now()) {
  const to = startOfDay(now) + DAY;
  return { from: to - days * DAY, to };
}

export function computeMetrics(orders, { from, to }, { center, radiusBlocks, couriers = [] }) {
  const created = orders.filter(o => inRange(o.createdAt, from, to));
  const delivered = orders.filter(o => o.status === 'entregado' && inRange(o.doneAt, from, to));
  const failed = orders.filter(o => o.status === 'fallido' && inRange(o.doneAt, from, to));
  const closed = delivered.length + failed.length;

  const times = delivered.map(o => (o.doneAt - o.createdAt) / 60000);
  const avgDelivery = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const km = delivered.reduce((a, o) => a + (o.legKm || 0), 0);
  const revenueFee = delivered.reduce((a, o) => a + (o.fee || 0), 0);
  const sales = delivered.reduce((a, o) => a + (o.amount || 0), 0);
  const cash = delivered.reduce((a, o) => a + (o.payment === 'efectivo' ? (o.amount || 0) + (o.fee || 0) : 0), 0);

  // entregas por día
  const days = Math.max(1, Math.round((to - from) / DAY));
  const perDay = Array.from({ length: days }, (_, i) => ({ t: from + i * DAY, delivered: 0, failed: 0 }));
  for (const o of delivered) perDay[Math.min(days - 1, Math.floor((o.doneAt - from) / DAY))].delivered++;
  for (const o of failed) perDay[Math.min(days - 1, Math.floor((o.doneAt - from) / DAY))].failed++;

  // pedidos creados por hora del día
  const perHour = Array.from({ length: 24 }, (_, h) => ({ h, n: 0 }));
  for (const o of created) perHour[new Date(o.createdAt).getHours()].n++;

  // entregas por anillo de distancia
  const perRing = [0, 0, 0];
  for (const o of delivered) perRing[ringIndex(distM(center, o), radiusBlocks, BLOCK_M)]++;

  // por repartidor (se agrupa por nombre; los repartidores borrados quedan como "Otros")
  const names = new Map(couriers.map(c => [c.name, c.color]));
  const byCourier = new Map();
  for (const o of delivered.concat(failed)) {
    const name = o.courierName || 'Sin dato';
    const row = byCourier.get(name) || { name, color: names.get(name) || null, delivered: 0, failed: 0, minutes: 0, timed: 0, cash: 0, km: 0 };
    if (o.status === 'entregado') {
      row.delivered++; row.km += o.legKm || 0;
      row.minutes += (o.doneAt - o.createdAt) / 60000; row.timed++;
      if (o.payment === 'efectivo') row.cash += (o.amount || 0) + (o.fee || 0);
    } else row.failed++;
    byCourier.set(name, row);
  }
  const courierRows = [...byCourier.values()].sort((a, b) => b.delivered - a.delivered)
    .map(r => ({ ...r, avg: r.timed ? r.minutes / r.timed : null }));

  return {
    orders: created.length, delivered: delivered.length, failed: failed.length,
    successRate: closed ? delivered.length / closed : null,
    avgDelivery, km, revenueFee, sales, cash,
    avgTicket: delivered.length ? sales / delivered.length : null,
    perDay, perHour, perRing, courierRows
  };
}
