// Contenido inicial, relevado de las fuentes públicas el 15/10/2026 (campo `verificado` de cada pieza).
// Regla de contenido: resumen con palabras propias, datos concretos, fuente citada y link al original. Nada de copiar notas ni fotos.
// Cuando el dato sale de un medio y no del sitio de la fuente, `via` dice de qué medio.
// El servidor arranca vacío: hasta que el panel publique la primera versión, la app muestra este contenido.
//
// Campos de cada pieza:
//   id, fuente (config.FUENTES), tipo (config.TIPOS), titulo, resumen (1 o 2 oraciones), cuerpo [párrafos], datos [[etiqueta, valor]]
//   inicio / fin        ISO con zona (-03:00). Un curso con `fin` tiene una clase por semana desde `inicio` hasta `fin`.
//   duracionMin         duración de cada clase o del evento (para el calendario) · sesiones: cantidad de clases (informativo)
//   todoElDia           eventos de varios días sin horario único
//   cierre              fecha límite de inscripción o postulación
//   etiqueta            texto del estado cuando no hay fechas (por ejemplo "Ciclo 2027 · de abril a diciembre")
//   lugar, url (original), via, accion { txt, url }, rubros ['todos' | config.RUBROS], temas [config.TEMAS]
//   serie               { titulo, unidad, puntos: [[etiqueta, valor]] } para datos del sector
//   publicado           fecha de publicación en la fuente, si se conoce (las novedades se archivan a los 3 meses)
import { UCIP_CURSOS } from './seed/ucip-cursos.js';
import { UCIP } from './seed/ucip.js';
import { ATICMA } from './seed/aticma.js';
import { PL } from './seed/pl.js';

export const SEED_VERSION = '2026-10-15';
export const SEED = [...UCIP, ...UCIP_CURSOS, ...ATICMA, ...PL];
