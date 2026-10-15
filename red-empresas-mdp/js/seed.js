// Contenido inicial, relevado de las fuentes públicas el 15/10/2026 (campo `verificado`).
// Regla de contenido: resumen con palabras propias, datos concretos, fuente citada y link al original. Nada de copiar notas ni fotos.
// Cuando el dato sale de un medio y no del sitio de la fuente, `via` dice de qué medio.
// El servidor arranca vacío: hasta que el panel publique la primera versión, la app muestra este contenido.
//
// Campos:
//   id, fuente (config.FUENTES), tipo (config.TIPOS), titulo, resumen (1 o 2 oraciones), cuerpo [párrafos], datos [[etiqueta, valor]]
//   inicio / fin        ISO con zona (-03:00). En cursos, `inicio` es la primera clase y `sesiones` la cantidad (semanales).
//   duracionMin         duración de cada clase o del evento (para el calendario)
//   todoElDia           eventos de varios días sin horario único
//   cierre              fecha límite de inscripción o postulación
//   lugar, url (original), via, accion { txt, url }, rubros ['todos' | config.RUBROS], temas [config.TEMAS]
//   serie               { titulo, unidad, puntos: [[etiqueta, valor]] } para datos del sector
//   publicado           fecha de publicación en la fuente, si se conoce

export const SEED_VERSION = '2026-10-15';

export const SEED = [
  // ───────────── UCIP ─────────────
  {
    id: 'ucip-excel-ia-2026', fuente: 'ucip', tipo: 'capacitacion',
    titulo: 'Excel básico con IA',
    resumen: 'Curso de 8 clases para manejar planillas desde cero y usar inteligencia artificial para armar fórmulas y ordenar datos.',
    cuerpo: ['Pensado para quien usa Excel poco o nada: planillas, fórmulas básicas, formatos y cómo pedirle ayuda a una IA para resolver una fórmula o limpiar una lista.',
      'Los socios de UCIP no pagan matrícula y tienen 15% de descuento en las cuotas. Si te anotás con otra persona, 50% en la matrícula y 10% en las cuotas.'],
    datos: [['Cuándo', 'Viernes de 18:30 a 20:30, del 16/10 al 4/12 (8 clases)'], ['Dónde', 'Centro de Capacitación UCIP, Av. Luro 3030'], ['Costo', 'No publicado. Socios: matrícula bonificada y 15% en cuotas'], ['Consultas', 'WhatsApp de cursos: 223 436-0509']],
    inicio: '2026-10-16T18:30:00-03:00', duracionMin: 120, sesiones: 8,
    lugar: 'Av. Luro 3030, Mar del Plata',
    url: 'https://www.ucip.org.ar/cursospre/excel-basico/',
    accion: { txt: 'Ver curso e inscribirme', url: 'https://www.ucip.org.ar/cursospre/excel-basico/' },
    rubros: ['todos'], temas: ['capacitacion', 'tecnologia'], verificado: '2026-10-15'
  },
  {
    id: 'ucip-manipulacion-alimentos-2026-10', fuente: 'ucip', tipo: 'capacitacion',
    titulo: 'Carnet de manipulación de alimentos',
    resumen: 'Dos clases presenciales que dan el carnet oficial de la Provincia de Buenos Aires para quien trabaja con alimentos.',
    cuerpo: ['Sirve para cocineros, mozos, repositores, proveedores y personal de transporte de alimentos. El carnet lo emite el Ministerio de Desarrollo Agrario bonaerense y, según UCIP, tiene validez en todo el país.',
      'Hay que asistir a las dos clases para obtenerlo. Los empleados de empresas socias de UCIP tienen 15% de descuento.'],
    datos: [['Cuándo', 'Miércoles 21/10 y 28/10, de 16 a 19 (asistencia obligatoria a ambas)'], ['Dónde', 'Av. Luro 3030'], ['Docente', 'Ing. Vanina Sgromo'], ['Costo', 'No publicado. 15% para empleados de empresas socias']],
    inicio: '2026-10-21T16:00:00-03:00', duracionMin: 180, sesiones: 2,
    lugar: 'Av. Luro 3030, Mar del Plata',
    url: 'https://www.ucip.org.ar/cursospre/manipulacion-de-alimentos/',
    accion: { txt: 'Ver curso e inscribirme', url: 'https://www.ucip.org.ar/cursospre/manipulacion-de-alimentos/' },
    rubros: ['gastronomia', 'alimentos', 'comercio', 'turismo', 'logistica'], temas: ['capacitacion', 'normativa'], verificado: '2026-10-15'
  },
  {
    id: 'ucip-ia-trabajo-2026', fuente: 'ucip', tipo: 'capacitacion',
    titulo: 'Inteligencia artificial: optimizá tu trabajo',
    resumen: 'Seis clases prácticas para dueños, gerentes y equipos: asistentes de IA, automatizaciones con Make y n8n y un bot básico de atención por WhatsApp.',
    cuerpo: ['Recorre cómo funcionan los modelos de lenguaje (y por qué a veces inventan), compara asistentes, enseña a escribir buenas instrucciones y a armar un asistente propio para tu puesto.',
      'La segunda mitad es aplicada: automatizaciones con Make y n8n, IA en WhatsApp y Telegram con un bot de atención básico, y uso para redes sociales. En la última clase cada participante presenta su proyecto.'],
    datos: [['Cuándo', 'Jueves de 18 a 20:30, del 22/10 al 26/11 (6 clases)'], ['Dónde', 'Av. Luro 3030'], ['Docente', 'Prof. Javier Mateos'], ['Costo', 'No publicado. Socios: matrícula bonificada y 15% en cuotas']],
    inicio: '2026-10-22T18:00:00-03:00', duracionMin: 150, sesiones: 6,
    lugar: 'Av. Luro 3030, Mar del Plata',
    url: 'https://www.ucip.org.ar/cursospre/ia-aplicada-automatiza-tu-trabajo/',
    accion: { txt: 'Ver curso e inscribirme', url: 'https://www.ucip.org.ar/cursospre/ia-aplicada-automatiza-tu-trabajo/' },
    rubros: ['todos'], temas: ['tecnologia', 'capacitacion'], verificado: '2026-10-15'
  },
  {
    id: 'ucip-finanzas-2026', fuente: 'ucip', tipo: 'capacitacion',
    titulo: 'Finanzas personales: aprendé a invertir',
    resumen: 'Cinco clases para entender los distintos tipos de inversión y cómo funcionan, dictadas por dos contadores.',
    cuerpo: ['Curso abierto al público general. Útil para dueños de pymes que quieren ordenar excedentes o entender instrumentos antes de hablar con un asesor.'],
    datos: [['Cuándo', 'Martes de 16 a 18:20, del 27/10 al 24/11 (5 clases)'], ['Dónde', 'Av. Luro 3030'], ['Docentes', 'Lic. y CP Javier Mateos y Lic. y CP Ariel Rajovitzky'], ['Costo', 'No publicado. Descuentos para socios y ex alumnos']],
    inicio: '2026-10-27T16:00:00-03:00', duracionMin: 140, sesiones: 5,
    lugar: 'Av. Luro 3030, Mar del Plata',
    url: 'https://www.ucip.org.ar/cursospre/finanzas-personales-aprende-a-invertir/',
    accion: { txt: 'Ver curso e inscribirme', url: 'https://www.ucip.org.ar/cursospre/finanzas-personales-aprende-a-invertir/' },
    rubros: ['todos'], temas: ['capacitacion', 'financiamiento'], verificado: '2026-10-15'
  },
  {
    id: 'ucip-ley-27826', fuente: 'ucip', tipo: 'novedad',
    titulo: 'Ley 27.826: bajan multas tributarias y cambia Ganancias simplificado',
    resumen: 'Algunas multas de la Ley de Procedimiento Tributario bajan 25% automáticamente y hay una reducción especial del 50% para infracciones formales anteriores.',
    cuerpo: ['Alcanza a micro, pequeñas y medianas empresas, personas humanas, sucesiones indivisas y entidades sin fines de lucro que no sean Grandes Contribuyentes Nacionales. Rige desde su publicación en el Boletín Oficial.',
      'La reducción del 50% exige aceptar la sanción restante, cumplir la obligación omitida y renunciar a reclamos; lo ya pagado no se devuelve. Los cambios en Ganancias simplificado aplican desde el período fiscal 2025. ARCA tenía 30 días para reglamentarlo.',
      'Es un resumen de la nota de UCIP, no asesoramiento: revisalo con tu contador.'],
    datos: [['Norma', 'Ley 27.826 (decreto 1160/2026)'], ['Para quién', 'Mipymes y personas humanas que no son Grandes Contribuyentes'], ['Qué hacer', 'Consultá con tu contador si tenés multas formales pendientes']],
    url: 'https://www.ucip.org.ar/noticias/nueva-ley-tributaria-bajan-multas-y-cambian-las-reglas-de-ganancias-simplificado/',
    rubros: ['todos'], temas: ['normativa'], publicado: '2026-10-09', verificado: '2026-10-15'
  },
  {
    id: 'ucip-ventas-sep-2026', fuente: 'ucip', tipo: 'dato',
    titulo: 'Ventas minoristas: −7,9% interanual en septiembre',
    resumen: 'El relevamiento mensual de UCIP marca seis meses seguidos de caída. El 93,7% de los comerciantes dice que no es momento de invertir, pero el 98,4% piensa sostener a su personal.',
    cuerpo: ['La caída se mide en unidades vendidas contra el mismo mes de 2025. Entre las causas, los comerciantes señalan la falta de liquidez de los clientes, la suba de servicios y el costo de la mercadería.',
      'El 85,7% califica su rentabilidad como regular, mala o pésima, y el 54% dice estar peor que hace un año.'],
    datos: [['Elabora', 'DESE, Departamento de Estudios Sociales y Económicos de UCIP'], ['Septiembre', '−7,9% interanual en unidades'], ['No es momento de invertir', '93,7%'], ['Mantendrá su personal 6 meses', '98,4%']],
    serie: { titulo: 'Ventas minoristas, variación interanual', unidad: '%', puntos: [['Abr', -2.6], ['May', -5.8], ['Jun', -5.7], ['Jul', -7], ['Ago', -9.2], ['Sep', -7.9]] },
    url: 'https://www.ucip.org.ar/noticias/nueva-caida-de-ventas-en-septiembre/',
    rubros: ['comercio', 'textil', 'gastronomia', 'alimentos'], temas: ['datos'], publicado: '2026-10-04', verificado: '2026-10-15'
  },
  {
    id: 'ucip-nodo', fuente: 'ucip', tipo: 'programa',
    titulo: 'Nodo UCIP: salas, coworking, estudio de contenidos y rondas',
    resumen: 'Espacio nuevo en la sede de UCIP para empresas de cualquier tamaño: salas para reuniones y videollamadas, coworking, estudio para podcast y streaming, y rondas de negocios.',
    cuerpo: ['Se organiza en cuatro ejes. Negocios: aulas con videoconferencia, coworking, boxes para reuniones, café abierto y lockers. Educativo: amplía el centro de capacitación, que hoy forma a 1.600 a 1.800 personas por año, con formación ejecutiva junto a universidades.',
      'Media: herramientas para producir podcasts, streaming, reels y transmisiones. Conecta: rondas de negocios, encuentros y networking entre sectores para fortalecer cadenas de valor.',
      'Según UCIP, el uso no se diferencia por tamaño de empresa. Los costos no están publicados: hay que consultar en la sede.'],
    datos: [['Dónde', 'Sede UCIP, Av. Luro 3030'], ['Para quién', 'Empresas y emprendedores de cualquier tamaño'], ['Costo', 'No publicado. Consultar al 223 499-7777']],
    lugar: 'Av. Luro 3030, Mar del Plata',
    url: 'https://www.infobrisas.com/noticias/2026/08/31/106226-la-ucip-inauguro-un-nuevo-nodo-para-empresas-en-mar-del-plata-que-servicios-ofrecera',
    via: 'Infobrisas',
    rubros: ['todos'], temas: ['red', 'clientes', 'visibilidad', 'capacitacion'], publicado: '2026-08-31', verificado: '2026-10-15'
  },
  {
    id: 'ucip-socios', fuente: 'ucip', tipo: 'beneficio',
    titulo: 'Hacerse socio de UCIP: cuotas y qué incluye',
    resumen: 'La cuota va de $7.200 (unipersonal) a $96.000 (más de 100 empleados). Incluye asesoramiento en créditos y subsidios, descuentos en cursos y consultorías ISO y HACCP.',
    cuerpo: ['Beneficios publicados: representación gremial en la ciudad, la provincia (FEBA) y la Nación (CAME); asesoramiento en créditos y subsidios (PRE, FONAPYME y Crédito Fiscal); asesoramiento laboral, impositivo y previsional; descuentos en capacitaciones, salones, seguros, servicio de empleo y sellados; consultorías en normas ISO y HACCP; informes crediticios.',
      'Para asociarte se completa la ficha de ingreso del sitio y se lleva a la sede, o se pide contacto por el formulario web.'],
    datos: [['Unipersonal', '$7.200 por mes'], ['Micro (1 a 5)', '$10.800'], ['Mini (6 a 16)', '$18.000'], ['Pyme 1A (17 a 50)', '$36.000'], ['Pyme 1B (51 a 100)', '$72.000'], ['Pyme 2 (más de 100)', '$96.000']],
    url: 'https://www.ucip.org.ar/sociosucip/como-asociarse/',
    accion: { txt: 'Ver cómo asociarme', url: 'https://www.ucip.org.ar/sociosucip/como-asociarse/' },
    rubros: ['todos'], temas: ['financiamiento', 'normativa', 'red'], verificado: '2026-10-15'
  },

  // ───────────── ATICMA ─────────────
  {
    id: 'aticma-b2b-2026', fuente: 'aticma', tipo: 'evento',
    titulo: 'B2B Demandas Tecnológicas: contá tu problema y reunite con quien lo resuelve',
    resumen: 'Ronda de reuniones cara a cara entre empresas de cualquier rubro y proveedores de tecnología elegidos según tu necesidad. Gratis para empresas, cupos limitados.',
    cuerpo: ['No es una charla ni una feria. Te inscribís contando un desafío concreto de tu negocio (stock, ventas, turnos, procesos) y ATICMA te arma reuniones con las empresas tecnológicas que pueden resolverlo. No hace falta saber de tecnología.',
      'En 2025 participaron 60 empresas demandantes y 18 tecnológicas: hubo 130 reuniones y más de 40 siguieron en conversaciones comerciales. Después de la ronda hay un after de networking.'],
    datos: [['Cuándo', 'Martes 10/11, 15 h'], ['Dónde', 'Centro Cultural Estación Terminal Sur (Paseo Aldrey), Sarmiento 2601'], ['Costo', 'Gratis para empresas demandantes'], ['Para quién', 'Turismo, agro, pesca, comercio, logística, salud, industria, construcción y más'], ['Consultas', 'director@aticma.org.ar · WhatsApp 223 577-8704']],
    inicio: '2026-11-10T15:00:00-03:00', duracionMin: 180,
    lugar: 'Sarmiento 2601, Mar del Plata',
    url: 'https://www.aticma.org.ar/novedades/b2b-demandas-tecnologicas-2026-tu-empresa-tiene-un-desafio-nosot/',
    accion: { txt: 'Inscribir a mi empresa', url: 'https://forms.gle/8p7h4FGrffAUin2v8' },
    rubros: ['todos'], temas: ['tecnologia', 'red', 'clientes'], publicado: '2026-10-06', verificado: '2026-10-15'
  },
  {
    id: 'aticma-awards-2026', fuente: 'aticma', tipo: 'convocatoria',
    titulo: 'ATICMA Awards: postulá a tu empresa por su transformación digital',
    resumen: 'Hay una categoría para empresas industriales o productivas que no son de tecnología y mejoraron sus procesos con soluciones tecnológicas. Postulaciones hasta el 2/11.',
    cuerpo: ['Categorías 2026: Emprendimiento innovador, Empresa – Transformación digital, Desarrollo de empresa TIC, Innovación en inteligencia artificial, Innovación audiovisual (nueva), Proyecto destacado Mar del Plata Dev (nueva) y Trayectoria.',
      'Para postularte elegís la categoría, completás el formulario y adjuntás la documentación que pide el reglamento. La entrega es el 13/11 a las 19 h y cierra la Tech Week.'],
    datos: [['Cierre de postulaciones', 'Lunes 2/11'], ['Ceremonia', 'Viernes 13/11, 19 h, Centro Cultural Estación Terminal Sur'], ['Categoría para pymes no TIC', 'Empresa – Transformación digital'], ['Costo', 'No publicado']],
    cierre: '2026-11-02T23:59:00-03:00',
    inicio: '2026-11-13T19:00:00-03:00', duracionMin: 180,
    lugar: 'Sarmiento 2601, Mar del Plata',
    url: 'https://awards.aticma.org.ar/',
    accion: { txt: 'Ver categorías y postularme', url: 'https://awards.aticma.org.ar/' },
    rubros: ['todos'], temas: ['visibilidad', 'tecnologia'], verificado: '2026-10-15'
  },
  {
    id: 'aticma-techweek-2026', fuente: 'aticma', tipo: 'evento',
    titulo: 'Mar del Plata Tech Week',
    resumen: 'Nueve días de actividades del ecosistema tecnológico: semifinal de ATICMA Emprende, la ronda B2B, actividades del Festival de Cine y los Awards.',
    cuerpo: ['Agenda publicada: jueves 5/11, semifinal de ATICMA Emprende en la sede de ATICMA; martes 10/11 a las 15 h, B2B Demandas Tecnológicas; del 11 al 13/11, actividades en el Festival de Cine (programa a confirmar); viernes 13/11 a las 19 h, ATICMA Awards y final de ATICMA Emprende.'],
    datos: [['Cuándo', 'Del jueves 5/11 al viernes 13/11'], ['Sede principal', 'Centro Cultural Estación Terminal Sur, Sarmiento 2601']],
    inicio: '2026-11-05T00:00:00-03:00', fin: '2026-11-13T23:59:00-03:00', todoElDia: true,
    lugar: 'Mar del Plata',
    url: 'https://awards.aticma.org.ar/',
    rubros: ['todos'], temas: ['tecnologia', 'red'], verificado: '2026-10-15'
  },
  {
    id: 'aticma-uaa', fuente: 'aticma', tipo: 'beneficio',
    titulo: 'Descuentos en la Universidad Atlántida Argentina para la red ATICMA',
    resumen: '10% en las cuotas de todas las carreras para socios, empleados de empresas socias y sus familias. Pagando el semestre por adelantado: matrícula bonificada y 25% en seis cuotas.',
    cuerpo: ['Vale para carreras presenciales y a distancia, durante los ciclos 2026 y 2027. Incluye a hijos y cónyuges, y también a quien ya estudia en la UAA.',
      'Para usarlo hay que pedir los pasos a ATICMA.'],
    datos: [['Descuento', '10% en cuotas'], ['Pago adelantado del semestre', 'Matrícula 100% bonificada y 25% en las primeras 6 cuotas'], ['Vigencia', 'Ciclos 2026 y 2027'], ['Cómo', 'info@aticma.org.ar · 223 577-8704']],
    url: 'https://www.aticma.org.ar/novedades/aticma-y-la-uaa-firmaron-un-convenio-con-beneficios-exclusivos-p/',
    rubros: ['tecnologia'], temas: ['capacitacion'], publicado: '2026-08-25', verificado: '2026-10-15'
  },
  {
    id: 'aticma-ccya', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Convenio ATICMA y Centro de Constructores para digitalizar la construcción',
    resumen: 'Las dos entidades firmaron un convenio marco: primero capacitaciones para el sector y después soluciones tecnológicas a medida.',
    cuerpo: ['Si tu empresa es de la construcción o de rubros anexos, es la puerta para pedir capacitación en herramientas digitales e inteligencia artificial aplicada a obra y gestión.'],
    datos: [['Para quién', 'Constructoras y empresas de rubros anexos'], ['Contacto', 'Centro de Constructores y Anexos o ATICMA']],
    url: 'https://www.aticma.org.ar/novedades/aticma-y-el-centro-de-constructores-y-anexos-impulsaran-juntos-l/',
    rubros: ['construccion'], temas: ['tecnologia', 'capacitacion'], publicado: '2026-08-20', verificado: '2026-10-15'
  },
  {
    id: 'aticma-emprende-2026', fuente: 'aticma', tipo: 'programa',
    titulo: 'ATICMA Emprende: final con viaje a Silicon Valley',
    resumen: 'Programa de formación y mentoría para proyectos tecnológicos. La inscripción ya cerró; la final abierta es el 13/11 y el equipo ganador viaja a Silicon Valley.',
    cuerpo: ['Seis encuentros (validación de la idea, modelo de negocio, clientes y crecimiento, IA aplicada, finanzas e inversores, pitch), mentorías y una final con formato de inversión frente a empresarios.',
      'Sirve para seguir el ecosistema y conocer emprendimientos locales que pueden ser proveedores o socios.'],
    datos: [['Inscripción', 'Cerró el 18/9'], ['Semifinal', 'Jueves 5/11'], ['Final', 'Viernes 13/11, junto con los Awards'], ['Premio', 'Viaje de una semana a Silicon Valley']],
    cierre: '2026-09-18T23:59:00-03:00',
    inicio: '2026-11-13T19:00:00-03:00', duracionMin: 180,
    lugar: 'Sarmiento 2601, Mar del Plata',
    url: 'https://www.aticma.org.ar/novedades/lanzamiento-del-aticma-emprende-2026-el-programa-que-llevara-a-u/',
    rubros: ['tecnologia'], temas: ['red', 'tecnologia'], publicado: '2026-08-26', verificado: '2026-10-15'
  },

  // ───────────── Producto Local ─────────────
  {
    id: 'pl-programa', fuente: 'pl', tipo: 'programa',
    titulo: 'Sumá tus productos al sello Producto Local',
    resumen: 'El Municipio identifica lo que se fabrica en Mar del Plata, Batán y Sierra de los Padres con un sello y entrega piezas para vidriera y góndola.',
    cuerpo: ['Las empresas adheridas reciben material para mostrar el sello: vinilo para vidriera, cenefas y stoppers para los comercios que venden sus productos, y el logo para su sitio web. Los comercios que venden producción local lo muestran como "Apoya a los productores locales".',
      'Participan alimentos y bebidas, indumentaria, maquinaria, pesca y química, entre otros. No hay requisitos formales publicados: conviene confirmarlos por teléfono antes de enviar datos.',
      'El sitio del Municipio tiene el listado de empresas adheridas, útil para buscar proveedores locales.'],
    datos: [['Cómo sumarse', 'Web del Municipio, teléfono o en persona'], ['Teléfono', '499-7970, internos 4347 y 4376'], ['Oficina', 'Salta 1842, 5° piso'], ['Costo', 'No publicado']],
    lugar: 'Salta 1842, 5° piso, Mar del Plata',
    url: 'https://www.mardelplata.gob.ar/productolocal',
    accion: { txt: 'Ver empresas adheridas', url: 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-empresas-adheridas' },
    rubros: ['alimentos', 'industria', 'textil', 'pesca', 'comercio'], temas: ['visibilidad', 'clientes'], verificado: '2026-10-15'
  },
  {
    id: 'pl-310-empresas', fuente: 'pl', tipo: 'dato',
    titulo: 'Producto Local llegó a 310 empresas y 13.372 productos',
    resumen: 'Se sumaron 11 firmas en el último período y 435 productos nuevos frente al año anterior. Las adhesiones crecieron 3,67% interanual.',
    cuerpo: ['El programa depende de la Secretaría de Desarrollo Local, Inversiones e Integración Público-Privado, con apoyo de la Dirección de Comercio e Industria.',
      'Entre las novedades, la pesquera Marbella proyecta ampliarse al Parque Industrial.'],
    datos: [['Empresas adheridas', '310'], ['Productos con sello', '13.372'], ['Altas recientes', '11 empresas'], ['Productos nuevos en el año', '435']],
    serie: { titulo: 'Empresas adheridas (cifras de notas de prensa de cada año)', unidad: '', puntos: [['2021', 43], ['2022', 135], ['2023', 205], ['2025', 300], ['2026', 310]] },
    url: 'https://www.elmarplatense.com/el-programa-producto-local-supero-los-13300-articulos-y-suma-310-empresas',
    via: 'El Marplatense',
    rubros: ['alimentos', 'industria', 'pesca', 'textil'], temas: ['datos', 'visibilidad'], publicado: '2026-09-23', verificado: '2026-10-15'
  }
];
