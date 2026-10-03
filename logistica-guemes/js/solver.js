// Orden de paradas (viajante) y reparto entre repartidores. Funciones puras sobre matrices de tiempo.
// D[i][j] = tiempo de i a j (puede ser asimétrico por las manos únicas); el nodo 0 es el local.
export const full = (perm, closed) => closed ? [0, ...perm, 0] : [0, ...perm];

export function pathCost(path, D) {
  let c = 0;
  for (let i = 0; i < path.length - 1; i++) c += D[path[i]][path[i + 1]];
  return c;
}

export function nearestNeighbor(D) {
  const left = new Set(D.map((_, i) => i).slice(1)), perm = [];
  let cur = 0;
  while (left.size) {
    let best = null;
    for (const j of left) if (best === null || D[cur][j] < D[cur][best]) best = j;
    perm.push(best); left.delete(best); cur = best;
  }
  return perm;
}

// 2-opt + mover una parada, hasta que ninguna mejora baje el costo
export function improve(perm, D, closed) {
  let cost = pathCost(full(perm, closed), D), better = true;
  while (better) {
    better = false;
    for (let i = 0; i < perm.length - 1; i++) {
      for (let j = i + 1; j < perm.length; j++) {
        const cand = [...perm.slice(0, i), ...perm.slice(i, j + 1).reverse(), ...perm.slice(j + 1)];
        const c = pathCost(full(cand, closed), D);
        if (c < cost - 1e-9) { perm = cand; cost = c; better = true; }
      }
    }
    for (let i = 0; i < perm.length; i++) {
      const rest = [...perm.slice(0, i), ...perm.slice(i + 1)];
      for (let k = 0; k <= rest.length; k++) {
        if (k === i) continue;
        const cand = [...rest.slice(0, k), perm[i], ...rest.slice(k)];
        const c = pathCost(full(cand, closed), D);
        if (c < cost - 1e-9) { perm = cand; cost = c; better = true; break; }
      }
    }
  }
  return perm;
}

export function bruteForce(D, closed) {
  const n = D.length - 1;
  let best = [], bestC = Infinity;
  const perm = Array.from({ length: n }, (_, i) => i + 1);
  (function walk(k) {
    if (k === n) {
      const c = pathCost(full(perm, closed), D);
      if (c < bestC) { bestC = c; best = perm.slice(); }
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i], perm[k]];
      walk(k + 1);
      [perm[k], perm[i]] = [perm[i], perm[k]];
    }
  })(0);
  return best;
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hasta 8 paradas el resultado es exacto; con más, vecino más cercano + mejoras + reinicios aleatorios.
export function solve(D, closed, rand = Math.random) {
  const n = D.length - 1;
  if (n <= 1) return n === 1 ? [1] : [];
  if (n <= 8) return bruteForce(D, closed);
  let best = improve(nearestNeighbor(D), D, closed), bestC = pathCost(full(best, closed), D);
  for (let r = 0; r < 10; r++) {
    const cand = improve(shuffle(Array.from({ length: n }, (_, i) => i + 1), rand), D, closed);
    const c = pathCost(full(cand, closed), D);
    if (c < bestC) { best = cand; bestC = c; }
  }
  return best;
}

// Reparte las paradas entre k repartidores. El local queda en el centro y los clientes alrededor,
// así que se ordenan por ángulo y se cortan en k sectores; se prueban todas las rotaciones del corte
// y después se mueven paradas sueltas entre sectores si baja el puntaje (tiempo del más cargado + 25% del total).
// Devuelve k grupos de índices (1..n sobre pts), el más pesado primero.
export function assignRoutes({ pts, D, k, closed, serviceS = 0 }) {
  const n = pts.length - 1;
  if (n <= 0) return [];
  k = Math.max(1, Math.min(k, n));
  const c0 = pts[0], cosLat = Math.cos(c0.lat * Math.PI / 180);
  const angle = i => Math.atan2(pts[i].lat - c0.lat, (pts[i].lng - c0.lng) * cosLat);
  const byAngle = Array.from({ length: n }, (_, i) => i + 1).sort((a, b) => angle(a) - angle(b));

  const cache = new Map();
  const cost = idx => {
    if (!idx.length) return 0;
    const key = [...idx].sort((a, b) => a - b).join(',');
    if (cache.has(key)) return cache.get(key);
    const sub = [0, ...idx];
    const M = sub.map(a => sub.map(b => D[a][b]));
    const perm = idx.length === 1 ? [1] : improve(nearestNeighbor(M), M, closed);
    const c = pathCost(full(perm, closed), M) + serviceS * idx.length;
    cache.set(key, c);
    return c;
  };
  const score = groups => {
    const t = groups.map(cost);
    return Math.max(...t) + 0.25 * t.reduce((a, b) => a + b, 0);
  };
  const split = rot => {
    const r = byAngle.slice(rot).concat(byAngle.slice(0, rot));
    const base = Math.floor(n / k), extra = n % k, groups = [];
    let p = 0;
    for (let g = 0; g < k; g++) { const size = base + (g < extra ? 1 : 0); groups.push(r.slice(p, p + size)); p += size; }
    return groups;
  };

  let best = null, bestS = Infinity;
  for (let rot = 0; rot < n; rot++) {
    const g = split(rot), s = score(g);
    if (s < bestS) { best = g; bestS = s; }
  }
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let a = 0; a < k; a++) {
      for (const stop of [...best[a]]) {
        if (best[a].length <= 1) continue;
        for (let b = 0; b < k; b++) {
          if (a === b) continue;
          const cand = best.map(g => g.slice());
          cand[a] = cand[a].filter(x => x !== stop);
          cand[b].push(stop);
          const s = score(cand);
          if (s < bestS - 1e-9) { best = cand; bestS = s; moved = true; break; }
        }
      }
    }
    if (!moved) break;
  }
  return best.map(g => g.slice()).sort((a, b) => cost(b) - cost(a));
}
