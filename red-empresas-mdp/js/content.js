// Lógica del contenido (pura, sin DOM): fechas de cada pieza, estado, relevancia para una empresa, feed y agenda.
import { CIERRA_PRONTO_DIAS, DIA, ESTA_SEMANA_DIAS, NUEVO_DIAS, TIPOS } from './config.js';
import { diasHasta, fechaCorta, hora, norm, ok, ts } from './fmt.js';

const SEMANA = 7 * DIA;

// Clases de un curso (semanales) o el evento como una sola sesión. [{ inicio, fin }] en ms.
export function sesiones(item) {
  const ini = ts(item.inicio);
  if (!ok(ini)) return [];
  if (item.todoElDia) {
    const fin = ok(ts(item.fin)) ? ts(item.fin) : ini + DIA - 1;
    return [{ inicio: ini, fin }];
  }
  const dur = (item.duracionMin || 60) * 60e3;
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

// Estado visible de la pieza.
//   clave: pasado | cerrado | cierra | en-curso | hoy | manana | semana | proximo | abierto | sin-fecha
//   texto: frase corta para la tarjeta · urgente: va en el bloque "Cierra pronto"
export function estado(item, now) {
  const fin = finDe(item);
  if (ok(fin) && fin < now) return { clave: 'pasado', texto: 'Ya pasó', urgente: false };
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
      const hechas = s.filter(x => x.inicio < now).length;
      if (item.todoElDia) return { clave: 'en-curso', texto: 'En curso', urgente: false };
      return { clave: 'en-curso', texto: s.length > 1 ? `En curso · van ${hechas} de ${s.length} clases` : 'En curso', urgente: false };
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
  return { clave: 'sin-fecha', texto: TIPOS[item.tipo]?.label || '', urgente: false };
}

export const esNuevo = (item, now) => {
  const p = ts(item.publicado);
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
  p += { cierra: 4, hoy: 3, manana: 3, semana: 2, 'en-curso': 0, proximo: 1, abierto: 1, cerrado: -2, 'sin-fecha': 0 }[e.clave] || 0;
  if (esNuevo(item, now)) p += 1;
  return p;
}

export const coincide = (item, q) => {
  if (!q) return true;
  const hay = norm([item.titulo, item.resumen, ...(item.cuerpo || []), ...(item.datos || []).flat(), item.lugar].join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

// Feed de la empresa: fuentes seguidas, filtro por tipo y búsqueda; ordenado por relevancia y, a igual relevancia, por fecha.
export function armarFeed(items, { perfil = {}, sigue = [], tipo = '', q = '', now, pasados = false } = {}) {
  return items
    .filter(i => sigue.includes(i.fuente))
    .filter(i => !tipo || i.tipo === tipo)
    .filter(i => coincide(i, q))
    .map(i => ({ item: i, estado: estado(i, now), puntaje: puntaje(i, perfil, now), fecha: proximaFecha(i, now) }))
    .filter(x => pasados ? x.estado.clave === 'pasado' : x.estado.clave !== 'pasado')
    .sort((a, b) => b.puntaje - a.puntaje || orden(a.fecha, b.fecha) || (ts(b.item.publicado) || 0) - (ts(a.item.publicado) || 0));
}
const orden = (a, b) => (ok(a) ? a : Infinity) - (ok(b) ? b : Infinity) || 0;

// Plazos que vencen en la ventana de "Cierra pronto", el más cercano primero.
export const cierranPronto = (items, sigue, now) =>
  items.filter(i => sigue.includes(i.fuente)).map(i => ({ item: i, estado: estado(i, now) }))
    .filter(x => x.estado.urgente).sort((a, b) => ts(a.item.cierre) - ts(b.item.cierre));

// Lo que pasa en los próximos 7 días (clases, eventos o cierres), para el resumen del inicio.
export const enLaSemana = (items, sigue, now) =>
  items.filter(i => sigue.includes(i.fuente)).filter(i => {
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
