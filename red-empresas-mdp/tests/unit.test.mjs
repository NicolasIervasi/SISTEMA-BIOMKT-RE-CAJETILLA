// Tests del núcleo del cliente (sin navegador): node --test red-empresas-mdp/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { FUENTE_IDS, RUBROS, TAMANOS, TEMAS, TIPO_IDS } from '../js/config.js';
import { CATEGORIAS, agruparPorSemana, armarAgenda, armarFeed, buscar, categoriaDe, cierranPronto, coincide, enLaSemana, estado, finDe, novedadesRecientes, proximaFecha, proximasFechas, puntaje, recomendados, relacionados, secciones, sesiones } from '../js/content.js';
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
  // los 38 cursos publicados por UCIP al 15/10/2026
  assert.equal(SEED.filter(i => i.fuente === 'ucip' && i.tipo === 'capacitacion').length, 38);
  assert.equal(new Set(SEED.map(i => i.id)).size, SEED.length);
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
  assert.equal(estado(byId('ucip-ia-trabajo-2026'), T('2026-11-06T10:00:00-03:00')).texto, 'En curso · termina el jue 26/11');
  // cursos con fecha de fin: una clase por semana hasta la última publicada, aunque haya semanas sin clase
  assert.equal(estado(byId('ucip-c-cerrajeria-general'), NOW).texto, 'En curso · termina el lun 14/12');
  assert.equal(estado(byId('ucip-c-cerrajeria-general'), T('2026-12-14T22:00:00-03:00')).clave, 'pasado');
  // ciclo 2027 sin fechas: muestra la etiqueta
  assert.deepEqual(estado(byId('ucip-c-auxiliar-administrativo'), NOW), { clave: 'info', texto: 'Ciclo 2027 · de abril a diciembre', urgente: false });
  // las novedades se archivan a los 3 meses; los programas no
  assert.deepEqual(estado(byId('aticma-cessi'), NOW), { clave: 'pasado', texto: 'Archivo · publicado el 13/5', urgente: false });
  assert.equal(estado(byId('aticma-subsecretaria'), NOW).clave, 'sin-fecha');                       // publicada el 23/7: 84 días
  assert.equal(estado(byId('aticma-subsecretaria'), NOW + 7 * 86400e3).clave, 'pasado');           // a los 91 días, al archivo
  assert.equal(estado(byId('aticma-nuevos-socios'), NOW).clave, 'pasado');                         // 15/7: ya pasó los 90 días
  assert.equal(estado(byId('ucip-nodo'), T('2027-06-01T12:00:00-03:00')).clave, 'sin-fecha');
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
  assert.ok(armarFeed(SEED, { sigue: FUENTE_IDS, fuente: 'aticma', now: NOW }).every(x => x.item.fuente === 'aticma'));
  // los cursos que empiezan pronto van antes que los que ya están en curso
  const cursos = armarFeed(SEED, { sigue: FUENTE_IDS, tipo: 'capacitacion', now: NOW }).map(x => x.estado.clave);
  assert.ok(cursos.indexOf('en-curso') > cursos.indexOf('manana'));
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
  // próximos 7 días = hoy y los 6 siguientes: el curso de IA (22/10, a 7 días) todavía no entra.
  // Las clases de los cursos que ya empezaron tampoco cuentan.
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
  assert.deepEqual(entradas(byId('ucip-c-liquidacion-de-sueldos-y-jornales'), NOW), []);          // curso ya empezado: no se agenda
  assert.equal(entradas(byId('aticma-techweek-2026'), T('2026-11-08T10:00:00-03:00')).length, 1);   // evento de varios días en curso: sí
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

// Coherencia de fechas: cada "martes 10/11" de los textos es de verdad martes en 2026, y el "Cuándo" de cada curso
// coincide con su inicio, su fin y su horario. Si alguien carga una fecha mal, esta prueba lo marca.
test('coherencia de fechas en todo el contenido', () => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const n = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const diaSemana = (d, m) => new Date(Date.UTC(2026, m - 1, d, 15)).getUTCDay();
  const ar = ms => { const x = new Date(ms - 3 * 3600e3); return { d: x.getUTCDate(), m: x.getUTCMonth() + 1, w: x.getUTCDay(), h: x.getUTCHours(), mi: x.getUTCMinutes() }; };
  const problemas = [];
  for (const it of SEED) {
    const textos = [it.titulo, it.resumen, ...(it.cuerpo || []), ...(it.datos || []).map(x => x.join(': '))];
    for (const t of textos) for (const m of n(t).matchAll(/(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+(\d{1,2})\/(\d{1,2})/g))
      if (DIAS.indexOf(m[1]) !== diaSemana(+m[2], +m[3])) problemas.push(`${it.id}: ${m[0]}`);
    const cuando = (it.datos || []).find(x => x[0] === 'Cuándo')?.[1];
    if (!it.inicio || !cuando || it.todoElDia) continue;
    const i = ar(T(it.inicio)), f = it.fin ? ar(T(it.fin)) : null, c = n(cuando);
    const w = DIAS.findIndex(d => c.startsWith(d));
    if (w >= 0 && w !== i.w) problemas.push(`${it.id}: día de la semana`);
    const r = c.match(/del (\d{1,2})\/(\d{1,2}) al (\d{1,2})\/(\d{1,2})/);
    if (r && (+r[1] !== i.d || +r[2] !== i.m || (f && (+r[3] !== f.d || +r[4] !== f.m)))) problemas.push(`${it.id}: rango ${r[0]}`);
    const h = c.match(/de (\d{1,2})(?::(\d{2}))? a (\d{1,2})(?::(\d{2}))?/);
    if (h && (+h[1] !== i.h || +(h[2] || 0) !== i.mi || (f && (+h[3] !== f.h || +(h[4] || 0) !== f.mi)))) problemas.push(`${it.id}: horario ${h[0]}`);
    if (f && f.w !== i.w) problemas.push(`${it.id}: inicio y fin en distinto día`);
    const s = sesiones(it);
    if (f) { const u = ar(s.at(-1).inicio); if (u.d !== f.d || u.m !== f.m) problemas.push(`${it.id}: última clase`); }
    if (it.sesiones && s.length < it.sesiones) problemas.push(`${it.id}: faltan semanas para las clases publicadas`);
  }
  assert.deepEqual(problemas, []);
});

test('explorar: cada categoría separada en secciones coherentes', () => {
  const o = { sigue: FUENTE_IDS, now: NOW };
  const ids = secs => secs.map(x => [x.clave, x.items.length]);
  assert.deepEqual(ids(secciones(SEED, 'cursos', o)), [['pronto', 4], ['ciclo', 14], ['encurso', 18], ['pasados', 2]]);
  const pronto = secciones(SEED, 'cursos', o)[0].items.map(x => x.item.id);
  assert.deepEqual(pronto, ['ucip-excel-ia-2026', 'ucip-manipulacion-alimentos-2026-10', 'ucip-ia-trabajo-2026', 'ucip-finanzas-2026']);   // por fecha de inicio
  const enCurso = secciones(SEED, 'cursos', o)[2].items.map(x => finDe(x.item));
  assert.deepEqual(enCurso, [...enCurso].sort((a, b) => a - b));                                                                      // el que termina antes, primero
  const ev = secciones(SEED, 'eventos', o);
  assert.equal(ev[0].clave, 'proximos');
  assert.ok(ev[0].items.every(x => x.estado.clave !== 'pasado'));
  const nov = secciones(SEED, 'novedades', o);
  assert.deepEqual(nov.map(x => x.clave), ['recientes', 'pasados']);
  assert.ok(nov[1].items.every(x => x.estado.texto.startsWith('Archivo')));
  assert.deepEqual(secciones(SEED, 'beneficios', o).map(x => x.clave), ['ucip', 'aticma']);
  assert.deepEqual(secciones(SEED, 'cursos', { ...o, fuente: 'aticma' }), []);
  // todas las piezas caen en exactamente una categoría
  for (const i of SEED) assert.equal(CATEGORIAS.filter(c => c.tipos.includes(i.tipo)).length, 1, i.id);
  const total = CATEGORIAS.reduce((n, c) => n + secciones(SEED, c.id, o).reduce((m, x) => m + x.items.length, 0), 0);
  assert.equal(total, SEED.length);
});

test('búsqueda: plurales, tildes, sinónimos y palabras cortas enteras', () => {
  const o = { sigue: FUENTE_IDS, now: NOW };
  const primero = q => buscar(SEED, q, o).principales[0]?.item.id;
  assert.equal(primero('excel'), 'ucip-excel-ia-2026');
  assert.equal(primero('créditos para pymes'), 'ucip-financiamiento');
  assert.equal(primero('créditos'), 'ucip-financiamiento');
  assert.equal(primero('ronda de negocios'), 'aticma-b2b-2026');
  assert.equal(primero('buscar personal'), 'ucip-empleo');
  assert.equal(primero('carnet'), 'ucip-manipulacion-alimentos-2026-10');
  assert.equal(primero('sorteo'), 'ucip-escanea-y-gana');
  assert.equal(primero('directorio de proveedores tecnologicos'), 'aticma-socios-directorio');
  assert.deepEqual(buscar(SEED, 'socio', o).principales.slice(0, 2).map(x => x.item.id).sort(), ['aticma-asociate', 'ucip-socios']);
  assert.ok(buscar(SEED, 'socio', o).menciones.length > 20);           // los cursos lo mencionan en sus promos: van aparte
  assert.equal(buscar(SEED, 'xyz123', o).vigentes.length, 0);
  assert.deepEqual(buscar(SEED, 'de la para', o).palabras, []);
  // "ia" entera: no coincide con "industria"; "curso" no coincide con "recursos"
  assert.ok(!buscar(SEED, 'ia', o).vigentes.some(x => x.item.id === 'ucip-uim'));
  assert.ok(!buscar(SEED, 'curso', o).principales.some(x => x.item.id === 'ucip-empleo'));
  assert.ok(buscar(SEED, 'cerveza', o).vigentes.some(x => x.item.id === 'pl-directorio'));
  // lo pasado aparece aparte
  assert.ok(buscar(SEED, 'trading', o).pasados.some(x => x.item.id === 'ucip-c-trading-desde-cero'));
});

test('inicio: próximas fechas por semana, recomendados y novedades', () => {
  const f = proximasFechas(SEED, FUENTE_IDS, NOW, 45);
  assert.deepEqual(f.slice(0, 4).map(x => [x.item.id, x.que]), [
    ['ucip-excel-ia-2026', 'empieza'], ['ucip-manipulacion-alimentos-2026-10', 'empieza'], ['ucip-ia-trabajo-2026', 'empieza'], ['ucip-finanzas-2026', 'empieza']]);
  assert.ok(f.some(x => x.item.id === 'aticma-awards-2026' && x.que === 'cierre'));
  assert.ok(f.some(x => x.item.id === 'aticma-b2b-2026' && x.que === 'evento'));
  assert.ok(!f.some(x => x.item.id === 'ucip-c-liquidacion-de-sueldos-y-jornales'));          // en curso: no es una fecha para la empresa
  for (let k = 1; k < f.length; k++) assert.ok(f[k].fecha >= f[k - 1].fecha);
  const g = agruparPorSemana(f, NOW);
  assert.deepEqual(g.map(x => x.clave), ['semana', 'siguiente', 'despues']);
  assert.deepEqual(g[0].filas.map(x => x.item.id), ['ucip-excel-ia-2026', 'ucip-manipulacion-alimentos-2026-10']);
  const r = recomendados(SEED, { rubro: 'comercio', temas: [] }, FUENTE_IDS, NOW, 4);
  assert.equal(r.length, 4);
  assert.ok(r.every(x => x.item.rubros.includes('comercio') && ['beneficio', 'servicio', 'programa', 'directorio'].includes(x.item.tipo)));
  const n = novedadesRecientes(SEED, FUENTE_IDS, NOW, 4);
  assert.equal(n[0].item.id, 'ucip-ley-27826');                                              // la más reciente primero
  assert.ok(n.every(x => x.estado.clave !== 'pasado'));
  const rel = relacionados(SEED, SEED.find(i => i.id === 'ucip-ia-trabajo-2026'), {}, NOW, 3);
  assert.equal(rel.length, 3);
  assert.ok(rel.every(x => x.item.id !== 'ucip-ia-trabajo-2026' && x.estado.clave !== 'pasado'));
  assert.equal(categoriaDe(SEED.find(i => i.id === 'pl-directorio')).id, 'directorios');
});
