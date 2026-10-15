// Lógica del contenido (pura, sin DOM): fechas de cada pieza, estado, relevancia para una empresa, feed y agenda.
import { ARCHIVO_DIAS, CIERRA_PRONTO_DIAS, DIA, ESTA_SEMANA_DIAS, NUEVO_DIAS, TIPOS } from './config.js';
import { diaMes, diasHasta, fechaCorta, hora, norm, ok, ts, tsDia } from './fmt.js';

const SEMANA = 7 * DIA;

// Clases de un curso (semanales) o el evento como una sola sesión. [{ inicio, fin }] en ms.
// Un curso con `fin` (última clase) tiene una clase por semana hasta esa fecha: así coincide con lo que publica la fuente
// aunque haya semanas sin clase. Sin `fin`, `sesiones` dice cuántas semanas seguidas.
export function sesiones(item) {
  const ini = ts(item.inicio);
  if (!ok(ini)) return [];
  const finItem = ts(item.fin);
  if (item.todoElDia) return [{ inicio: ini, fin: ok(finItem) ? finItem : ini + DIA - 1 }];
  const dur = (item.duracionMin || 60) * 60e3;
  if (ok(finItem) && finItem - ini > DIA) {
    const out = [];
    for (let t = ini; t <= finItem && out.length < 60; t += SEMANA) out.push({ inicio: t, fin: t + dur });
    return out;
  }
  const n = Math.max(1, Math.min(52, item.sesiones | 0 || 1));
  return Array.from({ length: n }, (_, i) => ({ inicio: ini + i * SEMANA, fin: ini + i * SEMANA + dur }));
}

// Momento en que la pieza deja de servir: fin del evento o del curso, o el cierre si no tiene fechas propias.
export function finDe(item) {
  const s = sesiones(item);
  if (s.length) return Math.max(s[s.length - 1].fin, ok(ts(item.fin)) ? ts(item.fin) : 0);
  const c = ts(item.cierre);
  return ok(c) ? c : NaN;
}

// Próxima fecha que le importa a la empresa: el cierre si sigue abierto, si no la próxima clase o el evento.
export function proximaFecha(item, now) {
  const c = ts(item.cierre);
  if (ok(c) && c >= now) return c;
  const s = sesiones(item).find(x => x.fin >= now);
  return s ? s.inicio : NaN;
}

// Novedades y datos sin fechas propias pasan al archivo a los ARCHIVO_DIAS de publicados
const archivable = item => (item.tipo === 'novedad' || item.tipo === 'dato') && !item.inicio && !item.cierre;

// Estado visible de la pieza.
//   clave: pasado | cerrado | cierra | en-curso | hoy | manana | semana | proximo | abierto | info | sin-fecha
//   texto: frase corta para la tarjeta · urgente: va en el bloque "Cierra pronto"
export function estado(item, now) {
  const fin = finDe(item);
  if (ok(fin) && fin < now) return { clave: 'pasado', texto: 'Ya pasó', urgente: false };
  const pub = tsDia(item.publicado);
  if (archivable(item) && ok(pub) && now - pub > ARCHIVO_DIAS * DIA) return { clave: 'pasado', texto: `Archivo · publicado el ${diaMes(pub)}`, urgente: false };
  const c = ts(item.cierre);
  const s = sesiones(item);
  if (ok(c) && c < now) {
    const prox = s.find(x => x.fin >= now);
    return { clave: 'cerrado', texto: prox ? `Inscripción cerrada · ${fechaCorta(prox.inicio)}` : 'Inscripción cerrada', urgente: false };
  }
  if (ok(c)) {
    const d = diasHasta(c, now);
    if (d <= CIERRA_PRONTO_DIAS) {
      const texto = d <= 0 ? 'Cierra hoy' : d === 1 ? 'Cierra mañana' : `Cierra en ${d} días`;
      return { clave: 'cierra', texto, urgente: true, dias: d };
    }
  }
  if (s.length) {
    const primera = s[0].inicio;
    if (primera < now) {
      if (item.todoElDia || s.length === 1) return { clave: 'en-curso', texto: 'En curso', urgente: false };
      return { clave: 'en-curso', texto: `En curso · termina el ${fechaCorta(s[s.length - 1].inicio)}`, urgente: false };
    }
    const d = diasHasta(primera, now);
    const h = item.todoElDia ? '' : ` · ${hora(primera)}`;
    const verbo = s.length > 1 ? 'Empieza' : '';
    if (d === 0) return { clave: 'hoy', texto: `${verbo || 'Es'} hoy${h}`, urgente: false };
    if (d === 1) return { clave: 'manana', texto: `${verbo || 'Es'} mañana${h}`, urgente: false };
    if (d < ESTA_SEMANA_DIAS) return { clave: 'semana', texto: `${verbo ? verbo + ' el' : 'El'} ${fechaCorta(primera)}${h}`, urgente: false };
    if (ok(c)) return { clave: 'abierto', texto: `Inscripción hasta el ${fechaCorta(c)}`, urgente: false };
    return { clave: 'proximo', texto: `${verbo ? verbo + ' el' : 'El'} ${fechaCorta(primera)}${h}`, urgente: false };
  }
  if (ok(c)) return { clave: 'abierto', texto: `Abierto hasta el ${fechaCorta(c)}`, urgente: false };
  if (item.etiqueta) return { clave: 'info', texto: item.etiqueta, urgente: false };
  return { clave: 'sin-fecha', texto: TIPOS[item.tipo]?.label || '', urgente: false };
}

export const esNuevo = (item, now) => {
  const p = tsDia(item.publicado);
  return ok(p) && now - p >= 0 && now - p < NUEVO_DIAS * DIA;
};

// Cuánto le sirve una pieza a esta empresa. Solo ordena: nunca esconde contenido de las fuentes seguidas.
export function puntaje(item, perfil = {}, now) {
  const e = estado(item, now);
  if (e.clave === 'pasado') return -100;
  let p = 0;
  const rubros = item.rubros || ['todos'];
  if (perfil.rubro && rubros.includes(perfil.rubro)) p += 3;
  else if (rubros.includes('todos')) p += 1;
  const temas = perfil.temas || [];
  p += Math.min(4, (item.temas || []).filter(t => temas.includes(t)).length * 2);
  p += { cierra: 4, hoy: 3, manana: 3, semana: 2, 'en-curso': -1, proximo: 1, abierto: 1, info: 0, cerrado: -2, 'sin-fecha': 0 }[e.clave] || 0;
  if (esNuevo(item, now)) p += 1;
  return p;
}

export const coincide = (item, q) => {
  if (!q) return true;
  const hay = norm([item.titulo, item.resumen, ...(item.cuerpo || []), ...(item.datos || []).flat(), item.lugar].join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

// Feed de la empresa: fuentes seguidas, filtro por tipo y búsqueda; ordenado por relevancia y, a igual relevancia, por fecha.
export function armarFeed(items, { perfil = {}, sigue = [], tipo = '', fuente = '', q = '', now, pasados = false } = {}) {
  return items
    .filter(i => sigue.includes(i.fuente) && (!fuente || i.fuente === fuente))
    .filter(i => !tipo || i.tipo === tipo)
    .filter(i => coincide(i, q))
    .map(i => ({ item: i, estado: estado(i, now), puntaje: puntaje(i, perfil, now), fecha: proximaFecha(i, now) }))
    .filter(x => pasados ? x.estado.clave === 'pasado' : x.estado.clave !== 'pasado')
    .sort((a, b) => b.puntaje - a.puntaje || orden(a.fecha, b.fecha) || (tsDia(b.item.publicado) || 0) - (tsDia(a.item.publicado) || 0));
}
const orden = (a, b) => (ok(a) ? a : Infinity) - (ok(b) ? b : Infinity) || 0;

// Plazos que vencen en la ventana de "Cierra pronto", el más cercano primero.
export const cierranPronto = (items, sigue, now) =>
  items.filter(i => sigue.includes(i.fuente)).map(i => ({ item: i, estado: estado(i, now) }))
    .filter(x => x.estado.urgente).sort((a, b) => ts(a.item.cierre) - ts(b.item.cierre));

// Lo que empieza, cierra o pasa en los próximos 7 días, para el resumen del inicio.
// Las clases de un curso que ya empezó no cuentan: no le sirven a quien no está inscripto.
export const enLaSemana = (items, sigue, now) =>
  items.filter(i => sigue.includes(i.fuente)).filter(i => {
    if (estado(i, now).clave === 'en-curso' && !i.todoElDia) return false;
    const f = proximaFecha(i, now);
    return ok(f) && diasHasta(f, now) < ESTA_SEMANA_DIAS;
  });

// Agenda: lo guardado, agrupado por cercanía.
export function armarAgenda(items, guardados, now) {
  const grupos = { semana: [], despues: [], sinFecha: [], pasados: [] };
  for (const i of items.filter(x => guardados.includes(x.id))) {
    const e = estado(i, now), f = proximaFecha(i, now);
    const x = { item: i, estado: e, fecha: f };
    if (e.clave === 'pasado') grupos.pasados.push(x);
    else if (!ok(f)) grupos.sinFecha.push(x);
    else if (diasHasta(f, now) < ESTA_SEMANA_DIAS) grupos.semana.push(x);
    else grupos.despues.push(x);
  }
  const porFecha = (a, b) => orden(a.fecha, b.fecha);
  grupos.semana.sort(porFecha); grupos.despues.sort(porFecha);
  grupos.pasados.sort((a, b) => finDe(b.item) - finDe(a.item));
  return [
    { clave: 'semana', titulo: 'Próximos 7 días', items: grupos.semana },
    { clave: 'despues', titulo: 'Más adelante', items: grupos.despues },
    { clave: 'sinFecha', titulo: 'Sin fecha', items: grupos.sinFecha },
    { clave: 'pasados', titulo: 'Ya pasaron', items: grupos.pasados }
  ].filter(g => g.items.length);
}

// Cuántas piezas vigentes tiene cada fuente (para la pantalla de fuentes)
export const vigentesPorFuente = (items, now) => items.reduce((acc, i) => {
  if (estado(i, now).clave !== 'pasado') acc[i.fuente] = (acc[i.fuente] || 0) + 1;
  return acc;
}, {});

// ───────────── Organización por categorías (pantalla Explorar) ─────────────
export const CATEGORIAS = [
  { id: 'cursos', label: 'Cursos', tipos: ['capacitacion'], desc: 'Los que empiezan pronto, el ciclo 2027 y los que están en curso' },
  { id: 'eventos', label: 'Eventos y convocatorias', tipos: ['evento', 'convocatoria'], desc: 'Rondas de negocios, premios, sorteos y plazos para postularse' },
  { id: 'beneficios', label: 'Beneficios y servicios', tipos: ['beneficio', 'servicio'], desc: 'Asesoramiento, financiamiento, seguros, informes y descuentos' },
  { id: 'programas', label: 'Programas', tipos: ['programa'], desc: 'Sellos, incubadoras, comisiones y espacios para sumarse' },
  { id: 'directorios', label: 'Directorios', tipos: ['directorio'], desc: 'Proveedores, cámaras, empresas y dónde estudiar' },
  { id: 'novedades', label: 'Novedades y datos', tipos: ['novedad', 'dato'], desc: 'Noticias de las fuentes y cifras del sector' }
];
export const categoriaDe = item => CATEGORIAS.find(c => c.tipos.includes(item.tipo)) || CATEGORIAS[CATEGORIAS.length - 1];

const ordenFuente = id => ['ucip', 'aticma', 'pl'].indexOf(id);
const NOMBRE_FUENTE = { ucip: 'UCIP', aticma: 'ATICMA', pl: 'Producto Local' };
const visibles = (items, { sigue, fuente }) => items.filter(i => sigue.includes(i.fuente) && (!fuente || i.fuente === fuente));
const conEstado = (items, perfil, now) => items.map(i => ({ item: i, estado: estado(i, now), puntaje: puntaje(i, perfil, now), fecha: proximaFecha(i, now) }));
const porTitulo = (a, b) => a.item.titulo.localeCompare(b.item.titulo, 'es');
const porRelevancia = (a, b) => b.puntaje - a.puntaje || porTitulo(a, b);

// Secciones de una categoría, cada una ordenada como se lee mejor. [{ clave, titulo, items: [{ item, estado }] }]
export function secciones(items, catId, { perfil = {}, sigue = [], fuente = '', now } = {}) {
  const cat = CATEGORIAS.find(c => c.id === catId);
  if (!cat) return [];
  const lista = conEstado(visibles(items, { sigue, fuente }).filter(i => cat.tipos.includes(i.tipo)), perfil, now);
  const pasados = lista.filter(x => x.estado.clave === 'pasado').sort((a, b) => (finDe(b.item) || tsDia(b.item.publicado) || 0) - (finDe(a.item) || tsDia(a.item.publicado) || 0));
  const vivos = lista.filter(x => x.estado.clave !== 'pasado');
  let out;
  if (cat.id === 'cursos') {
    out = [
      { clave: 'pronto', titulo: 'Empiezan pronto', items: vivos.filter(x => ok(ts(x.item.inicio)) && x.estado.clave !== 'en-curso').sort((a, b) => ts(a.item.inicio) - ts(b.item.inicio)) },
      { clave: 'ciclo', titulo: 'Ciclo 2027 (fechas a confirmar)', items: vivos.filter(x => !ok(ts(x.item.inicio))).sort(porRelevancia) },
      { clave: 'encurso', titulo: 'En curso', items: vivos.filter(x => x.estado.clave === 'en-curso').sort((a, b) => finDe(a.item) - finDe(b.item)) },
      { clave: 'pasados', titulo: 'Ya terminaron', items: pasados }
    ];
  } else if (cat.id === 'eventos') {
    out = [
      { clave: 'proximos', titulo: 'Próximos', items: vivos.sort((a, b) => orden(a.fecha, b.fecha)) },
      { clave: 'pasados', titulo: 'Ya pasaron', items: pasados }
    ];
  } else if (cat.id === 'novedades') {
    out = [
      { clave: 'recientes', titulo: 'Últimos 3 meses', items: vivos.sort((a, b) => (tsDia(b.item.publicado) || 0) - (tsDia(a.item.publicado) || 0) || porTitulo(a, b)) },
      { clave: 'pasados', titulo: 'Archivo', items: pasados }
    ];
  } else {
    // Beneficios, servicios, programas y directorios: por fuente, primero lo que más le sirve a la empresa
    const fuentes = [...new Set(vivos.map(x => x.item.fuente))].sort((a, b) => ordenFuente(a) - ordenFuente(b));
    out = fuentes.map(f => ({ clave: f, titulo: NOMBRE_FUENTE[f] || f, items: vivos.filter(x => x.item.fuente === f).sort(porRelevancia) }));
    if (pasados.length) out.push({ clave: 'pasados', titulo: 'Ya pasaron', items: pasados });
  }
  return out.filter(s => s.items.length);
}

export const cuentaVigentes = (items, catId, opts) =>
  secciones(items, catId, opts).filter(s => s.clave !== 'pasados').reduce((n, s) => n + s.items.length, 0);

// ───────────── Búsqueda ─────────────
// Sin tildes, singular/plural y sinónimos de cómo busca una pyme. Todas las palabras tienen que aparecer (en el texto o en un sinónimo).
const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'para', 'con', 'por', 'un', 'una', 'que', 'a', 'al', 'mi', 'mis', 'como', 'sobre',
  'busco', 'buscar', 'busca', 'quiero', 'necesito', 'donde', 'hacer', 'tengo', 'hay', 'empresa', 'empresas', 'pyme', 'pymes', 'negocio']);
const SINONIMOS = [
  ['credito', 'financiamiento', 'financiacion', 'prestamo', 'subsidio'],
  ['curso', 'capacitacion', 'taller', 'clase', 'aprender', 'formacion', 'masterclass'],
  ['ia', 'inteligencia artificial', 'chatgpt', 'automatiz', 'bot'],
  ['empleo', 'empleado', 'busqueda de personal', 'seleccion de personal', 'recursos humanos', 'rrhh', 'sueldo', 'contratar'],
  ['exportar', 'exporta', 'comercio exterior', 'aduan', 'comex'],
  ['socio', 'asociar', 'asociate', 'cuota', 'afiliacion'],
  ['gratis', 'gratuit', 'sin costo'],
  ['impuesto', 'arca', 'afip', 'multa', 'tributari', 'sellado', 'ganancias', 'tasa'],
  ['marketing', 'redes', 'community', 'instagram', 'publicidad', 'contenido'],
  ['ronda', 'evento', 'networking', 'b2b', 'encuentro'],
  ['proveedor', 'directorio', 'listado', 'oferta tic'],
  ['comercio', 'comercial', 'comerciante', 'tienda', 'vidriera', 'gondola'],
  ['alimento', 'comida', 'gastronomia', 'restaurante', 'cocina', 'manipulacion'],
  ['tecnologia', 'software', 'digital', 'sistema', 'tic'],
  ['construccion', 'obra', 'constructor'],
  ['seguro', 'cobertura', 'caucion'],
  ['premio', 'concurso', 'sorteo', 'certamen', 'awards'],
  ['cerveza', 'cervecer']
];
const raiz = w => (w.length > 4 && w.endsWith('es') && !w.endsWith('ones') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
function alternativas(w) {
  const r = raiz(w);
  const alt = new Set([w, r]);
  if (r.length >= 8) alt.add(r.slice(0, 7));   // raíz corta: "tecnologicos" encuentra "tecnología", "proveedores" encuentra "proveedor"
  const pega = g => g === w || g === r || (g.length >= 5 && r.startsWith(g)) || (r.length >= 5 && g.startsWith(r));
  for (const grupo of SINONIMOS) if (grupo.some(pega)) grupo.forEach(g => alt.add(g));
  return [...alt].filter(Boolean);
}
// Cada alternativa tiene que estar al principio de una palabra ("curso" no coincide con "recursos", ni "arca" con "marca").
// Las cortas ("ia", "red", "bot", "arca") tienen que estar enteras: "ia" no puede coincidir con "industria".
const NO_LETRA = '[^a-z0-9ñ]';
const cacheRe = new Map();
const reDe = (a, entera) => {
  const k = a + (entera ? '|e' : '');
  if (!cacheRe.has(k)) cacheRe.set(k, new RegExp(`(^|${NO_LETRA})${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${entera ? `(${NO_LETRA}|$)` : ''}`));
  return cacheRe.get(k);
};
const incluye = (campo, a) => reDe(a, a.length <= 4).test(campo);
const entera = (campo, a) => reDe(a, true).test(campo);
const RUBRO_TXT = { comercio: 'comercio minorista', gastronomia: 'gastronomia', alimentos: 'alimentos bebidas', industria: 'industria manufactura', pesca: 'pesca', construccion: 'construccion', tecnologia: 'tecnologia', turismo: 'turismo hoteleria', textil: 'textil indumentaria', servicios: 'servicios profesionales', salud: 'salud', logistica: 'logistica transporte', agro: 'agro campo', otro: '' };
const TEMA_TXT = { capacitacion: 'capacitacion', clientes: 'clientes nuevos ventas', tecnologia: 'tecnologia ia', financiamiento: 'credito financiamiento', normativa: 'impuestos normativa', visibilidad: 'visibilidad marca', datos: 'datos estadisticas', red: 'contactos red', empleo: 'empleo personal rrhh', exportacion: 'exportar comercio exterior' };

function campos(item) {
  const cat = categoriaDe(item);
  return {
    titulo: norm(item.titulo),
    resumen: norm([item.resumen, item.etiqueta].join(' ')),
    meta: norm([TIPOS[item.tipo]?.label, TIPOS[item.tipo]?.plural, cat.label, NOMBRE_FUENTE[item.fuente], item.fuente === 'pl' ? 'producto local municipio' : '',
      ...(item.rubros || []).map(r => RUBRO_TXT[r] || ''), ...(item.temas || []).map(t => TEMA_TXT[t] || '')].join(' ')),
    resto: norm([...(item.cuerpo || []), ...(item.datos || []).flat(), item.lugar, item.via].join(' '))
  };
}

export const palabrasBusqueda = q => norm(q).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1 && !VACIAS.has(w) && !VACIAS.has(raiz(w)));

// Coincidencia de una pieza con una búsqueda. puntaje 0 si falta alguna palabra; el título vale más que el resumen, y este más
// que el resto. fuerte: todas las palabras están en el título, el resumen o la clasificación (no solo mencionadas en el detalle).
export function coincidencia(item, palabras) {
  if (!palabras.length) return { puntaje: 0, fuerte: false };
  const c = campos(item);
  let total = 0, fuerte = true;
  for (const w of palabras) {
    const alts = alternativas(w);
    const propias = [w, raiz(w)];
    const en = campo => alts.some(a => incluye(campo, a));
    const p = en(c.titulo) ? 6 : en(c.resumen) ? 3 : en(c.meta) ? 2 : en(c.resto) ? 1 : 0;
    if (!p) return { puntaje: 0, fuerte: false };
    if (p < 2) fuerte = false;
    total += p
      + (alts.some(a => entera(c.titulo, a)) ? 2 : 0)                                         // palabra entera en el título ("personal", no "personales")
      + (propias.some(a => incluye(c.titulo, a) || incluye(c.resumen, a)) ? 1 : 0);            // la palabra buscada pesa más que un sinónimo
  }
  return { puntaje: total, fuerte };
}
export const puntajeBusqueda = (item, palabras) => coincidencia(item, palabras).puntaje;

// Resultados de búsqueda: vigentes y pasados por separado, ordenados por coincidencia y después por relevancia para la empresa.
export function buscar(items, q, { perfil = {}, sigue = [], fuente = '', now } = {}) {
  const palabras = palabrasBusqueda(q);
  if (!palabras.length) return { principales: [], menciones: [], pasados: [], vigentes: [], palabras };
  const res = conEstado(visibles(items, { sigue, fuente }), perfil, now)
    .map(x => { const c = coincidencia(x.item, palabras); return { ...x, coincide: c.puntaje, fuerte: c.fuerte }; })
    .filter(x => x.coincide > 0)
    .sort((a, b) => b.coincide - a.coincide || b.puntaje - a.puntaje || porTitulo(a, b));
  const vigentes = res.filter(x => x.estado.clave !== 'pasado');
  return {
    principales: vigentes.filter(x => x.fuerte),        // la búsqueda está en el título, el resumen o la clasificación
    menciones: vigentes.filter(x => !x.fuerte),         // solo se menciona en el detalle (por ejemplo "socios" en las promos de cada curso)
    pasados: res.filter(x => x.estado.clave === 'pasado'),
    vigentes,
    palabras
  };
}

// ───────────── Inicio ─────────────
// Próximas fechas de las fuentes seguidas: inicios de cursos y eventos, y cierres de inscripción. Una fila por fecha.
export function proximasFechas(items, sigue, now, dias = 45) {
  const out = [];
  for (const i of items.filter(x => sigue.includes(x.fuente))) {
    const e = estado(i, now);
    if (e.clave === 'pasado') continue;
    const c = ts(i.cierre);
    if (ok(c) && c >= now && diasHasta(c, now) <= dias) out.push({ item: i, estado: e, fecha: c, que: 'cierre' });
    const s = sesiones(i);
    if (s.length && s[0].inicio >= now && diasHasta(s[0].inicio, now) <= dias)
      out.push({ item: i, estado: e, fecha: s[0].inicio, que: s.length > 1 ? 'empieza' : 'evento' });
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}

export function agruparPorSemana(filas, now) {
  const grupos = [
    { clave: 'semana', titulo: 'Esta semana', filas: [] },
    { clave: 'siguiente', titulo: 'La semana que viene', filas: [] },
    { clave: 'despues', titulo: 'Más adelante', filas: [] }
  ];
  for (const f of filas) {
    const d = diasHasta(f.fecha, now);
    grupos[d < 7 ? 0 : d < 14 ? 1 : 2].filas.push(f);
  }
  return grupos.filter(g => g.filas.length);
}

// Lo permanente (servicios, beneficios, programas, directorios) que mejor le calza a la empresa por rubro e intereses
export function recomendados(items, perfil = {}, sigue = [], now, n = 4) {
  const tipos = ['beneficio', 'servicio', 'programa', 'directorio'];
  return conEstado(items.filter(i => sigue.includes(i.fuente) && tipos.includes(i.tipo)), perfil, now)
    .filter(x => x.estado.clave !== 'pasado')
    .filter(x => (perfil.rubro && (x.item.rubros || []).includes(perfil.rubro)) || (x.item.temas || []).some(t => (perfil.temas || []).includes(t)))
    .sort(porRelevancia)
    .slice(0, n);
}

export const novedadesRecientes = (items, sigue, now, n = 4) =>
  conEstado(items.filter(i => sigue.includes(i.fuente) && (i.tipo === 'novedad' || i.tipo === 'dato') && i.publicado), {}, now)
    .filter(x => x.estado.clave !== 'pasado')
    .sort((a, b) => tsDia(b.item.publicado) - tsDia(a.item.publicado))
    .slice(0, n);

// Piezas relacionadas para el pie del detalle: misma categoría o temas en común, vigentes
export function relacionados(items, item, perfil = {}, now, n = 3) {
  const cat = categoriaDe(item);
  return conEstado(items.filter(i => i.id !== item.id), perfil, now)
    .filter(x => x.estado.clave !== 'pasado')
    .map(x => ({ ...x, afinidad: (cat.tipos.includes(x.item.tipo) ? 2 : 0) + (x.item.fuente === item.fuente ? 1 : 0) + (x.item.temas || []).filter(t => (item.temas || []).includes(t)).length * 2 }))
    .filter(x => x.afinidad >= 3)
    .sort((a, b) => b.afinidad - a.afinidad || b.puntaje - a.puntaje || porTitulo(a, b))
    .slice(0, n);
}
