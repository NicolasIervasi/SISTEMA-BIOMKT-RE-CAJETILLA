// Tests del núcleo del cliente (sin navegador): node --test red-empresas-mdp/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { FUENTE_IDS, RUBROS, TAMANOS, TEMAS, TIPO_IDS } from '../js/config.js';
import { armarAgenda, armarFeed, cierranPronto, coincide, enLaSemana, estado, finDe, proximaFecha, puntaje, sesiones } from '../js/content.js';
import { cuando, diasHasta, fechaCorta, hora, isoDia, aInputLocal, deInputLocal } from '../js/fmt.js';
import { entradas, googleUrl, ics } from '../js/ics.js';
import { agregar, informe } from '../js/stats.js';
import { datosDeEjemplo } from '../js/demo.js';
import { SEED } from '../js/seed.js';
import { fresco, sanear } from '../js/store.js';
import * as server from '../netlify/lib/core.mjs';

const T = iso => Date.parse(iso);
const NOW = T('2026-10-15T12:00:00-03:00');
const byId = id => SEED.find(i => i.id === id);

test('las listas del servidor coinciden con las de la app', () => {
  assert.deepEqual(server.FUENTES, FUENTE_IDS);
  assert.deepEqual(server.TIPOS, TIPO_IDS);
  assert.deepEqual(server.RUBROS, Object.keys(RUBROS));
  assert.deepEqual(server.TAMANOS, Object.keys(TAMANOS));
  assert.deepEqual(server.TEMAS, Object.keys(TEMAS));
});

test('el contenido inicial pasa la validación del servidor', () => {
  assert.deepEqual(server.erroresContenido(SEED), []);
  for (const i of SEED) assert.ok(i.verificado, i.id);
});

test('fechas en hora de Mar del Plata', () => {
  assert.equal(hora(T('2026-10-16T18:30:00-03:00')), '18:30');
  assert.equal(fechaCorta(T('2026-10-22T18:00:00-03:00')), 'jue 22/10');
  assert.equal(diasHasta(T('2026-10-16T00:30:00-03:00'), NOW), 1);
  assert.equal(diasHasta(T('2026-10-15T23:59:00-03:00'), NOW), 0);
  assert.equal(cuando(T('2026-10-16T10:00:00-03:00'), NOW), 'mañana');
  assert.equal(isoDia(T('2026-10-15T23:30:00-03:00')), '2026-10-15');
  assert.equal(aInputLocal('2026-10-22T18:00:00-03:00'), '2026-10-22T18:00');
  assert.equal(deInputLocal('2026-10-22T18:00'), '2026-10-22T18:00:00-03:00');
  assert.equal(T(deInputLocal(aInputLocal('2026-11-02T23:59:00-03:00'))), T('2026-11-02T23:59:00-03:00'));
});

test('clases semanales de los cursos', () => {
  const excel = sesiones(byId('ucip-excel-ia-2026'));
  assert.equal(excel.length, 8);
  assert.equal(isoDia(excel.at(-1).inicio), '2026-12-04');            // último viernes publicado por UCIP
  assert.equal(isoDia(sesiones(byId('ucip-ia-trabajo-2026')).at(-1).inicio), '2026-11-26');
  assert.equal(isoDia(sesiones(byId('ucip-finanzas-2026')).at(-1).inicio), '2026-11-24');
  assert.equal(isoDia(sesiones(byId('ucip-manipulacion-alimentos-2026-10')).at(-1).inicio), '2026-10-28');
  const tw = sesiones(byId('aticma-techweek-2026'));
  assert.equal(tw.length, 1);
  assert.equal(finDe(byId('aticma-techweek-2026')), T('2026-11-13T23:59:00-03:00'));
});

test('estado de cada pieza', () => {
  assert.deepEqual(estado(byId('ucip-excel-ia-2026'), NOW), { clave: 'manana', texto: 'Empieza mañana · 18:30', urgente: false });
  assert.equal(estado(byId('aticma-awards-2026'), NOW).clave, 'abierto');
  assert.match(estado(byId('aticma-awards-2026'), NOW).texto, /^Inscripción hasta el lun 2\/11$/);
  const a = estado(byId('aticma-awards-2026'), T('2026-10-28T10:00:00-03:00'));
  assert.equal(a.clave, 'cierra'); assert.equal(a.texto, 'Cierra en 5 días'); assert.ok(a.urgente);
  assert.equal(estado(byId('aticma-awards-2026'), T('2026-11-02T09:00:00-03:00')).texto, 'Cierra hoy');
  assert.equal(estado(byId('aticma-emprende-2026'), NOW).texto, 'Inscripción cerrada · vie 13/11');
  assert.equal(estado(byId('aticma-techweek-2026'), T('2026-11-07T10:00:00-03:00')).clave, 'en-curso');
  assert.equal(estado(byId('ucip-ia-trabajo-2026'), T('2026-11-06T10:00:00-03:00')).texto, 'En curso · van 3 de 6 clases');
  assert.equal(estado(byId('ucip-ley-27826'), NOW).clave, 'sin-fecha');
  assert.equal(estado(byId('ucip-excel-ia-2026'), T('2026-12-05T10:00:00-03:00')).clave, 'pasado');
  assert.equal(estado(byId('aticma-b2b-2026'), T('2026-11-08T10:00:00-03:00')).texto, 'El mar 10/11 · 15:00');
});

test('próxima fecha: el cierre si está abierto, si no la próxima clase', () => {
  assert.equal(proximaFecha(byId('aticma-awards-2026'), NOW), T('2026-11-02T23:59:00-03:00'));
  assert.equal(proximaFecha(byId('aticma-awards-2026'), T('2026-11-05T10:00:00-03:00')), T('2026-11-13T19:00:00-03:00'));
  assert.equal(proximaFecha(byId('ucip-excel-ia-2026'), T('2026-10-20T10:00:00-03:00')), T('2026-10-23T18:30:00-03:00'));
  assert.ok(Number.isNaN(proximaFecha(byId('pl-programa'), NOW)));
});

test('el feed ordena por rubro, intereses y urgencia, sin esconder nada', () => {
  const gastro = { rubro: 'gastronomia', temas: ['capacitacion'] };
  const feed = armarFeed(SEED, { perfil: gastro, sigue: FUENTE_IDS, now: NOW });
  assert.equal(feed[0].item.id, 'ucip-manipulacion-alimentos-2026-10');
  const vigentes = SEED.filter(i => estado(i, NOW).clave !== 'pasado').length;
  assert.equal(feed.length, vigentes);
  assert.ok(puntaje(byId('aticma-ccya'), { rubro: 'construccion', temas: [] }, NOW) > puntaje(byId('aticma-ccya'), { rubro: 'comercio', temas: [] }, NOW));
  // fuentes seguidas, tipo y búsqueda
  assert.ok(armarFeed(SEED, { sigue: ['pl'], now: NOW }).every(x => x.item.fuente === 'pl'));
  assert.ok(armarFeed(SEED, { sigue: FUENTE_IDS, tipo: 'capacitacion', now: NOW }).every(x => x.item.tipo === 'capacitacion'));
  assert.deepEqual(armarFeed(SEED, { sigue: FUENTE_IDS, q: 'credito fonapyme', now: NOW }).map(x => x.item.id), ['ucip-socios']);
  assert.ok(coincide(byId('ucip-manipulacion-alimentos-2026-10'), 'MANIPULACIÓN'));
  // lo pasado va aparte
  const dic = T('2026-12-10T10:00:00-03:00');
  assert.ok(armarFeed(SEED, { sigue: FUENTE_IDS, now: dic, pasados: true }).some(x => x.item.id === 'ucip-excel-ia-2026'));
  assert.ok(!armarFeed(SEED, { sigue: FUENTE_IDS, now: dic }).some(x => x.item.id === 'ucip-excel-ia-2026'));
});

test('cierra pronto y semana', () => {
  assert.deepEqual(cierranPronto(SEED, FUENTE_IDS, NOW), []);
  assert.deepEqual(cierranPronto(SEED, FUENTE_IDS, T('2026-10-30T10:00:00-03:00')).map(x => x.item.id), ['aticma-awards-2026']);
  assert.deepEqual(cierranPronto(SEED, ['ucip'], T('2026-10-30T10:00:00-03:00')), []);
  // próximos 7 días = hoy y los 6 siguientes: el curso de IA (22/10, a 7 días) todavía no entra
  const semana = enLaSemana(SEED, FUENTE_IDS, NOW).map(i => i.id).sort();
  assert.deepEqual(semana, ['ucip-excel-ia-2026', 'ucip-manipulacion-alimentos-2026-10']);
  assert.ok(enLaSemana(SEED, FUENTE_IDS, NOW + 86400e3).some(i => i.id === 'ucip-ia-trabajo-2026'));
});

test('agenda agrupada por cercanía', () => {
  const g = armarAgenda(SEED, ['aticma-b2b-2026', 'ucip-excel-ia-2026', 'ucip-nodo', 'no-existe'], NOW);
  assert.deepEqual(g.map(x => [x.clave, x.items.map(i => i.item.id)]), [
    ['semana', ['ucip-excel-ia-2026']], ['despues', ['aticma-b2b-2026']], ['sinFecha', ['ucip-nodo']]]);
  assert.equal(armarAgenda(SEED, ['ucip-excel-ia-2026'], T('2026-12-20T10:00:00-03:00'))[0].clave, 'pasados');
});

test('calendario: .ics con repetición semanal, alarma y líneas plegadas', () => {
  const it = byId('ucip-excel-ia-2026');
  const [e] = entradas(it, NOW);
  assert.equal(e.repetir, 8);
  const txt = ics(it, e, { url: 'https://ejemplo.netlify.app/#/c/x', now: NOW });
  assert.match(txt, /DTSTART:20261016T213000Z/);
  assert.match(txt, /DTEND:20261016T233000Z/);
  assert.match(txt, /RRULE:FREQ=WEEKLY;COUNT=8/);
  assert.match(txt, /TRIGGER:-PT2H/);
  for (const l of txt.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, l);
  assert.ok(txt.endsWith('\r\n'));
  // día completo de varios días: DTEND exclusivo
  const tw = byId('aticma-techweek-2026');
  const t2 = ics(tw, entradas(tw, NOW)[0], { now: NOW });
  assert.match(t2, /DTSTART;VALUE=DATE:20261105/);
  assert.match(t2, /DTEND;VALUE=DATE:20261114/);
  // convocatoria: evento y recordatorio del cierre
  const aw = entradas(byId('aticma-awards-2026'), NOW);
  assert.deepEqual(aw.map(x => x.clave), ['evento', 'cierre']);
  assert.match(ics(byId('aticma-awards-2026'), aw[1], { now: NOW }), /TRIGGER:-P1D/);
  assert.deepEqual(entradas(byId('ucip-ley-27826'), NOW), []);
  const g = new URL(googleUrl(it, e));
  assert.equal(g.searchParams.get('dates'), '20261016T213000Z/20261016T233000Z');
  assert.equal(g.searchParams.get('recur'), 'RRULE:FREQ=WEEKLY;COUNT=8');
});

test('estadísticas: alcance, guardados netos, seguidores y rubros por fuente', () => {
  const t = NOW - 3600e3;
  const empresas = [
    { eid: 'a', rubro: 'comercio', tamano: 'micro', sigue: ['ucip', 'aticma'] },
    { eid: 'b', rubro: 'gastronomia', tamano: 'mini', sigue: ['ucip'] },
    { eid: 'c', rubro: 'comercio', tamano: 'micro', sigue: [] }
  ];
  const lotes = [
    { eid: 'a', ev: [['ver', 'ucip-excel-ia-2026', t], ['guardar', 'ucip-excel-ia-2026', t], ['ver', 'aticma-b2b-2026', t], ['ir', 'aticma-b2b-2026', t]] },
    { eid: 'b', ev: [['ver', 'ucip-excel-ia-2026', t], ['guardar', 'ucip-excel-ia-2026', t], ['quitar', 'ucip-excel-ia-2026', t + 1]] },
    { eid: 'b', ev: [['ver', 'ucip-excel-ia-2026', t - 86400e3], ['agendar', 'ucip-manipulacion-alimentos-2026-10', t], ['abrir', 'app', t - 86400e3]] },
    { eid: 'a', ev: [['abrir', 'app', t]] },
    { eid: 'x', ev: [['ver', 'ucip-excel-ia-2026', NOW - 40 * 86400e3]] },          // fuera de la ventana
    { eid: 'y', ev: [['raro', 'ucip-excel-ia-2026', t], 'basura'] },                  // inválidos
    null
  ];
  const agg = agregar({ lotes, empresas, items: SEED, now: NOW, dias: 30 });
  assert.equal(agg.totales.registradas, 3);
  assert.equal(agg.totales.activas, 2);
  assert.equal(agg.totales.recurrentes7, 1);                                      // b usó la app ayer y hoy
  assert.ok(!agg.porItem.some(x => x.id === 'app'));
  const excel = agg.porItem.find(x => x.id === 'ucip-excel-ia-2026');
  assert.deepEqual([excel.vistas, excel.alcance, excel.guardados], [3, 2, 1]);
  assert.equal(agg.porFuente.ucip.seguidores, 2);
  assert.equal(agg.porFuente.ucip.alcance, 2);
  assert.equal(agg.porFuente.aticma.clics, 1);
  assert.equal(agg.porFuente.ucip.agendados, 1);
  assert.deepEqual(agg.porFuente.ucip.rubros, [{ clave: 'comercio', n: 1 }, { clave: 'gastronomia', n: 1 }]);
  assert.deepEqual(agg.rubros[0], { clave: 'comercio', n: 2 });
  assert.equal(agg.serie.length, 30);
  assert.equal(agg.serie.at(-1).activas, 2);
  assert.equal(agg.serie.at(-2).activas, 1);
  const inf = informe(agg, 'ucip');
  assert.equal(inf.top[0].id, 'ucip-excel-ia-2026');
});

test('datos de ejemplo: deterministas y siempre marcados', () => {
  const a = datosDeEjemplo(SEED, NOW), b = datosDeEjemplo(SEED, NOW);
  assert.deepEqual(a, b);
  assert.ok(a.ejemplo);
  assert.ok(a.empresas.every(e => e.eid.startsWith('ejemplo-')));
  const agg = agregar({ ...a, items: SEED, now: NOW });
  assert.ok(agg.totales.activas > 10);
});

test('estado local: se sanea lo que venga del almacenamiento', () => {
  const f = fresco();
  assert.match(f.eid, /^[A-Za-z0-9_-]{22}$/);
  assert.deepEqual(f.sigue, FUENTE_IDS);
  const s = sanear({ eid: 'corto', perfil: { rubro: 'inventado', temas: ['red', 'x'], nombre: 'A'.repeat(200) }, sigue: ['ucip', 'otra'], guardados: [1, 'a'], usoAnonimo: false });
  assert.notEqual(s.eid, 'corto');
  assert.equal(s.perfil.rubro, '');
  assert.deepEqual(s.perfil.temas, ['red']);
  assert.equal(s.perfil.nombre.length, 80);
  assert.deepEqual(s.sigue, ['ucip']);
  assert.deepEqual(s.guardados, ['a']);
  assert.equal(s.usoAnonimo, false);
  assert.equal(sanear(null).listo, false);
});
