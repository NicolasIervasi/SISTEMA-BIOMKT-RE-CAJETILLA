// Geometría pura: sin red ni DOM.
export function distM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Límites de los tres anillos de tarifa, en cuadras: con 11 cuadras da [3, 7, 11].
export function ringBounds(radiusBlocks) {
  const b1 = Math.max(1, Math.floor(radiusBlocks / 3));
  const b2 = Math.max(b1, Math.floor((2 * radiusBlocks) / 3));
  return [b1, b2, Math.max(b2, radiusBlocks)];
}
export function ringIndex(distMeters, radiusBlocks, blockM) {
  const b = distMeters / blockM, [b1, b2] = ringBounds(radiusBlocks);
  return b <= b1 ? 0 : b <= b2 ? 1 : 2;
}
export function ringLabel(i, radiusBlocks) {
  const [b1, b2, b3] = ringBounds(radiusBlocks);
  return [`Hasta ${b1}`, `${b1 + 1}–${b2}`, `${b2 + 1}–${b3}`][i];
}
