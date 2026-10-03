#!/usr/bin/env node
// Prueba de humo contra el sitio publicado (usa Blobs de verdad): node scripts/smoke.mjs <https://sitio> <código-de-activación>
// Crea un repartidor "smoke-<n>", lo usa y lo borra: no toca a los repartidores reales.
const [base, code] = process.argv.slice(2);
if (!base || !code) { console.error('Uso: node scripts/smoke.mjs <https://sitio> <código-de-activación>'); process.exit(2); }
const url = p => `${base.replace(/\/$/, '')}/api/track/${p}`;
const post = async (p, body, init = {}) => {
  const r = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...init });
  let data = null; try { data = await r.json(); } catch { /* sin cuerpo JSON */ }
  return { status: r.status, data, headers: r.headers };
};
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  → ' + extra : ''}`); return ok; };
const cid = `smoke-${Date.now().toString(36)}`;
let w, ck;
try {
  const h = await post('health', {});
  check('health responde con la versión', h.status === 200 && h.data?.v === 1, JSON.stringify(h.data));
  console.log(`  última limpieza programada: ${h.data?.gcAt ? new Date(h.data.gcAt).toISOString() : 'todavía no corrió'}`);
  check('respuestas en JSON, sin caché ni sniffing', /application\/json/.test(h.headers.get('content-type')) && h.headers.get('cache-control') === 'no-store' && h.headers.get('x-content-type-options') === 'nosniff');
  check('tipo de contenido incorrecto: 415', (await post('ws', { code }, { headers: { 'content-type': 'text/plain' } })).status === 415);
  check('cuerpo enorme: 413', (await post('ping', { pad: 'x'.repeat(40000) })).status === 413);
  check('ruta desconocida: 404 JSON', (await post('nada', {})).data?.error === 'not_found');
  check('código incorrecto: 401', (await post('ws', { code: code + 'x' })).status === 401);
  const ws = await post('ws', { code });
  w = ws.data;
  if (!check('con el código se obtienen las claves', ws.status === 200 && w?.ws && w?.admin, String(ws.status))) throw new Error('sin claves');
  check('pedir las claves de nuevo devuelve las mismas', JSON.stringify((await post('ws', { code })).data) === JSON.stringify(w));
  check('clave del despacho inventada: 401', (await post('read', { ws: w.ws, admin: 'x'.repeat(43) })).status === 401);

  const c = await post('courier', { ws: w.ws, admin: w.admin, cid, name: 'Prueba de humo', color: '#2563eb' });
  ck = c.data?.ck;
  check('alta del repartidor de prueba', c.status === 200 && ck, String(c.status));
  check('la clave se recupera igual', (await post('courier', { ws: w.ws, admin: w.admin, cid, name: 'Prueba de humo', color: '#2563eb' })).data?.ck === ck);
  check('clave de repartidor inventada: 401', (await post('ping', { ws: w.ws, cid, ck: 'y'.repeat(43), pts: [] })).status === 401);

  const t = Date.now();
  const P = i => ({ t: t - 10000 + i * 4000, lat: -38.0148 + i * 3e-4, lng: -57.54085, acc: 8 });
  const p1 = await post('ping', { ws: w.ws, cid, ck, ct: t, ev: 'start', pts: [P(0), P(1), P(2)] });
  check('ping con 3 puntos', p1.status === 200 && p1.data?.accepted === 3, JSON.stringify(p1.data));
  const rd = await post('read', { ws: w.ws, admin: w.admin, since: t - 60000 });
  const mine = rd.data?.couriers?.[cid];
  check('el despacho lee los 3 puntos y el evento', rd.status === 200 && mine?.pts?.length === 3 && mine?.ev?.k === 'start', JSON.stringify(mine && { n: mine.pts.length, ev: mine.ev }));

  // Envíos simultáneos sobre la misma ventana (con Blobs real): cada uno escribe su propio blob, así que ninguno puede pisar a otro
  const par = await Promise.all([3, 4, 5, 6, 7, 8, 9, 10].map(i => post('ping', { ws: w.ws, cid, ck, ct: Date.now(), pts: [P(i)] })));
  const okN = par.filter(r => r.status === 200 && r.data?.accepted === 1).length;
  const after = (await post('read', { ws: w.ws, admin: w.admin, since: t - 60000 })).data?.couriers?.[cid];
  check('8 envíos en paralelo: no se pierde ninguno', okN === 8 && after?.pts?.length === 11, `ok=${okN} guardados=${after?.pts?.length} (esperados 11)`);
  await post('ping', { ws: w.ws, cid, ck, ct: Date.now(), pts: [P(10)] });
  check('un reintento repetido no duplica en la lectura', (await post('read', { ws: w.ws, admin: w.admin, since: t - 60000 })).data?.couriers?.[cid]?.pts?.length === 11);
  check('lectura incremental: pide solo lo nuevo', ((await post('read', { ws: w.ws, admin: w.admin, since: Date.now() + 5000 })).data?.couriers?.[cid]?.pts?.length ?? -1) === 0);

  check('el repartidor borra su recorrido', (await post('clear', { ws: w.ws, cid, ck })).status === 200);
  const empty = (await post('read', { ws: w.ws, admin: w.admin, since: t - 60000 })).data?.couriers?.[cid];
  check('después de borrar no queda nada', empty?.pts?.length === 0 && !empty?.last);
  check('revocar al repartidor de prueba', (await post('revoke', { ws: w.ws, admin: w.admin, cid })).data?.revoked === 1);
  check('con la clave revocada no se puede enviar', (await post('ping', { ws: w.ws, cid, ck, pts: [P(9)] })).status === 401);
  const gone = (await post('read', { ws: w.ws, admin: w.admin })).data?.couriers ?? {};
  check('el repartidor de prueba ya no figura', !(cid in gone));
} catch (e) {
  fail++; console.log('FAIL  la prueba se interrumpió:', e.message);
} finally {
  if (w && ck) await post('revoke', { ws: w.ws, admin: w.admin, cid }).catch(() => {});      // por si algo quedó a medias
  console.log(`\n${pass}/${pass + fail} comprobaciones OK`);
  process.exit(fail ? 1 : 0);
}
