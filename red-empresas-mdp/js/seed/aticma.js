// ATICMA: eventos y convocatorias de noviembre, programas, beneficios, directorios y las novedades de 2026 (aticma.org.ar al 15/10/2026).
// Resúmenes con palabras propias. Las novedades de más de 3 meses quedan en el archivo de la app.
const V = '2026-10-15';
const A = path => `https://www.aticma.org.ar/${path}`;
const SEDE = 'Sarmiento 2601, Mar del Plata';

export const ATICMA = [
  // ───────────── Noviembre: Tech Week ─────────────
  {
    id: 'aticma-b2b-2026', fuente: 'aticma', tipo: 'evento',
    titulo: 'B2B Demandas Tecnológicas: contá tu problema y reunite con quien lo resuelve',
    resumen: 'Ronda de reuniones cara a cara entre empresas de cualquier rubro y proveedores de tecnología elegidos según tu necesidad. Gratis para empresas, cupos limitados.',
    cuerpo: ['No es una charla ni una feria. Te inscribís contando un desafío concreto de tu negocio (stock, ventas, turnos, procesos) y ATICMA te arma reuniones con las empresas tecnológicas que pueden resolverlo. No hace falta saber de tecnología.',
      'En 2025 participaron 60 empresas demandantes y 18 tecnológicas: hubo 130 reuniones y más de 40 siguieron en conversaciones comerciales. Después de la ronda hay un after de networking.'],
    datos: [['Cuándo', 'Martes 10/11, 15 h'], ['Dónde', 'Centro Cultural Estación Terminal Sur (Paseo Aldrey), Sarmiento 2601'], ['Costo', 'Gratis para empresas demandantes'], ['Para quién', 'Turismo, agro, pesca, comercio, logística, salud, industria, construcción y más'], ['Consultas', 'director@aticma.org.ar · WhatsApp 223 577-8704']],
    inicio: '2026-11-10T15:00:00-03:00', duracionMin: 180,
    lugar: SEDE,
    url: A('novedades/b2b-demandas-tecnologicas-2026-tu-empresa-tiene-un-desafio-nosot/'),
    accion: { txt: 'Inscribir a mi empresa', url: 'https://forms.gle/8p7h4FGrffAUin2v8' },
    rubros: ['todos'], temas: ['tecnologia', 'red', 'clientes'], publicado: '2026-10-06', verificado: V
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
    lugar: SEDE,
    url: 'https://awards.aticma.org.ar/',
    accion: { txt: 'Ver categorías y postularme', url: 'https://awards.aticma.org.ar/' },
    rubros: ['todos'], temas: ['visibilidad', 'tecnologia'], verificado: V
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
    rubros: ['todos'], temas: ['tecnologia', 'red'], verificado: V
  },
  {
    id: 'aticma-emprende-2026', fuente: 'aticma', tipo: 'programa',
    titulo: 'ATICMA Emprende: récord de 250 proyectos y final con viaje a Silicon Valley',
    resumen: 'La tercera edición del programa para startups tecnológicas tiene a los seleccionados en masterclasses todo octubre. La semifinal es el 5/11 y la final abierta, al estilo Shark Tank, el 13/11.',
    cuerpo: ['Masterclasses de octubre: validación de la idea (1/10), modelo de negocio (8/10), IA en el negocio (15/10), clientes y growth (22/10), finanzas e inversores (29/10) y pitch y oratoria (sábado 31/10). Cada proyecto seleccionado tiene mentorías.',
      'En 2025 hubo 150 inscriptos y 18 seleccionados; ganó Pastech, que viajó a Silicon Valley y ocupa oficinas en ATICMA por un año. Sirve para conocer startups locales que pueden ser proveedores o socios.'],
    datos: [['Inscripción', 'Cerró el 18/9 con 250 proyectos'], ['Semifinal', 'Jueves 5/11'], ['Gran final', 'Viernes 13/11, Centro Cultural Estación Terminal Sur'], ['Premio', 'Viaje de una semana a Silicon Valley']],
    cierre: '2026-09-18T23:59:00-03:00',
    inicio: '2026-11-13T19:00:00-03:00', duracionMin: 180,
    lugar: SEDE,
    url: 'https://emprende.aticma.org.ar/',
    rubros: ['tecnologia'], temas: ['red', 'tecnologia'], publicado: '2026-08-26', verificado: V
  },

  // ───────────── Beneficios, programas y directorios ─────────────
  {
    id: 'aticma-socios-directorio', fuente: 'aticma', tipo: 'directorio',
    titulo: 'Oferta TIC local: 111 empresas de tecnología para resolver lo que necesites',
    resumen: 'El directorio de socios de ATICMA reúne software de gestión, IA, robótica, IoT, marketing digital, e-commerce, seguridad y más, todo de Mar del Plata.',
    cuerpo: ['Algunos ejemplos: Grupo E.S.I. (sistemas de gestión ERP), Equalitas (software industrial y transformación digital), Camet Robótica (robótica y visión artificial), Homein (IoT y domótica), GVenue (ticketing y control de acceso con QR), Albor (gestión agropecuaria), Exactian (gestión de contratistas), Grupo Kelsoft (IT e IA), Making Sense y Accenture (desarrollo de software).',
      'También hay agencias de marketing, consultoras, institutos de formación y universidades. El directorio tiene buscador.'],
    datos: [['Socios', '111 empresas, emprendimientos e instituciones'], ['Contacto de ATICMA', 'info@aticma.org.ar · 223 577-8704']],
    url: A('socios/'),
    accion: { txt: 'Buscar un proveedor', url: A('socios/') },
    rubros: ['todos'], temas: ['tecnologia', 'red'], verificado: V
  },
  {
    id: 'aticma-asociate', fuente: 'aticma', tipo: 'beneficio',
    titulo: 'Asociarse a ATICMA: qué incluye',
    resumen: 'Para empresas, emprendimientos y profesionales de tecnología: visibilidad, misiones comerciales, uso de las oficinas, eventos y capacitaciones gratis o con descuento.',
    cuerpo: ['Beneficios publicados: posicionamiento y visibilidad de la marca (web, prensa y actividades), vinculación con empresas del sector y de otras industrias, misiones comerciales locales e internacionales, representación ante gobiernos, universidades y grupos de I+D, uso de oficinas e instalaciones, acceso gratis o con precio especial a eventos y capacitaciones, información de oportunidades de negocio y beneficios de la vinculación con CESSI.',
      'La cuota no está publicada: se consulta por el formulario "Quiero asociarme".'],
    datos: [['Para quién', 'Empresas, emprendimientos, profesionales e instituciones TIC'], ['Cuota', 'No publicada'], ['Contacto', 'info@aticma.org.ar · 223 577-8704 · Chaco 1670']],
    url: A('socios/#asociarse'),
    accion: { txt: 'Quiero asociarme', url: A('socios/#asociarse') },
    rubros: ['tecnologia'], temas: ['red', 'clientes', 'visibilidad'], verificado: V
  },
  {
    id: 'aticma-uaa', fuente: 'aticma', tipo: 'beneficio',
    titulo: 'Descuentos en la Universidad Atlántida Argentina para la red ATICMA',
    resumen: '10% en las cuotas de todas las carreras para socios, empleados de empresas socias y sus familias. Pagando el semestre por adelantado: matrícula bonificada y 25% en seis cuotas.',
    cuerpo: ['Vale para carreras presenciales y a distancia, durante los ciclos 2026 y 2027. Incluye a hijos y cónyuges, y también a quien ya estudia en la UAA.',
      'Para usarlo hay que pedir los pasos a ATICMA.'],
    datos: [['Descuento', '10% en cuotas'], ['Pago adelantado del semestre', 'Matrícula 100% bonificada y 25% en las primeras 6 cuotas'], ['Vigencia', 'Ciclos 2026 y 2027'], ['Cómo', 'info@aticma.org.ar · 223 577-8704']],
    url: A('novedades/aticma-y-la-uaa-firmaron-un-convenio-con-beneficios-exclusivos-p/'),
    rubros: ['tecnologia'], temas: ['capacitacion'], publicado: '2026-08-25', verificado: V
  },
  {
    id: 'aticma-comisiones', fuente: 'aticma', tipo: 'programa',
    titulo: 'Comisiones de trabajo de ATICMA',
    resumen: 'Nueve espacios abiertos a los socios para trabajar por temas: Mujeres TIC, mercados externos, mercado local, robótica, videojuegos, emprendedores, talento, financiamiento y asuntos laborales.',
    cuerpo: ['La comisión de Mercado Local busca que los sectores productivos de la ciudad usen productos y servicios TIC locales: es la puerta de entrada para una empresa no tecnológica que quiere encontrar soluciones cerca.',
      'Mercados Externos ayuda a exportar servicios, Financiamiento releva líneas para el sector y Asuntos Laborales comparte experiencias sobre relaciones de trabajo.'],
    url: A('institucional/'),
    accion: { txt: 'Quiero participar', url: A('institucional/') },
    rubros: ['tecnologia'], temas: ['red', 'exportacion', 'financiamiento'], verificado: V
  },
  {
    id: 'aticma-carreras', fuente: 'aticma', tipo: 'directorio',
    titulo: 'Dónde estudiar tecnología en Mar del Plata',
    resumen: 'La guía de ATICMA de universidades, terciarios, secundarios técnicos y diplomaturas TIC, varias gratuitas. Útil para capacitar al equipo o buscar talento.',
    cuerpo: ['Universidades: UAA (ingeniería y licenciatura en informática), CAECE (sistemas y videojuegos), FASTA (informática y ciberseguridad) y la Universidad Nacional de Mar del Plata (gratuita).',
      'Terciarios: ISET del Municipio (gratuito), Instituto Idra, UTN, CRI, Hilet e ISFT 151 (gratuito). Secundarios técnicos: EEST 2, 3 y 5. Diplomaturas en diseño de experiencias digitales y en programación de bases de datos.'],
    url: A('sector/#carreras'),
    rubros: ['todos'], temas: ['empleo', 'capacitacion'], verificado: V
  },

  // ───────────── Datos ─────────────
  {
    id: 'aticma-sector-2026', fuente: 'aticma', tipo: 'dato',
    titulo: 'El sector tecnológico de Mar del Plata: 200 empresas y más de 10.000 empleos',
    resumen: 'Según ATICMA, las empresas TIC de la ciudad facturan USD 600 millones por año y exportan USD 130 millones. Mar del Plata es el tercer polo tecnológico del país.',
    cuerpo: ['Las cifras salen del relevamiento que hizo ATICMA por sus 20 años. El sector cubre software de gestión, consultoría, videojuegos, apps, marketing, e-commerce, datos, seguridad, hardware, automatización industrial e infraestructura.'],
    datos: [['Empresas tecnológicas', '200'], ['Empleos', 'Más de 10.000'], ['Facturación anual', 'USD 600 millones'], ['Exportaciones', 'USD 130 millones']],
    url: A('sector/'),
    rubros: ['tecnologia', 'todos'], temas: ['datos'], verificado: V
  },

  // ───────────── Novedades 2026 ─────────────
  {
    id: 'aticma-ccya', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Convenio ATICMA y Centro de Constructores para digitalizar la construcción',
    resumen: 'Las dos entidades firmaron un convenio marco: asesoramiento tecnológico, gestión digital de obra, ciberseguridad, IA, automatización y capacitación para el sector.',
    cuerpo: ['Uno de los ejes es relevar las necesidades tecnológicas concretas de las constructoras y conectarlas con empresas TIC locales. Arrancó en julio con una agenda de sensibilización y capacitación en IA.',
      'Si tu empresa es de la construcción o de rubros anexos, es la puerta para pedir asesoramiento.'],
    datos: [['Firmantes', 'Gustavo Bispo (ATICMA) y Leonardo Tamburini (CCYA)'], ['Para quién', 'Constructoras y empresas de rubros anexos']],
    url: A('novedades/aticma-y-el-centro-de-constructores-y-anexos-impulsaran-juntos-l/'),
    rubros: ['construccion'], temas: ['tecnologia', 'capacitacion'], publicado: '2026-08-20', verificado: V
  },
  {
    id: 'aticma-impulso-lider', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Impulso Líder: diez emprendimientos TIC se preparan para el pitch final',
    resumen: 'Programa de la Dirección de Economía del Conocimiento del Municipio y ATICMA. Fernando Genin (Pastech, ganador de ATICMA Emprende 2025) les habló de cómo presentar ante inversores.',
    datos: [['Organizan', 'Municipio de General Pueyrredon (Economía del Conocimiento) y ATICMA'], ['Coordina', 'Apertus']],
    url: A('novedades/seguimos-preparando-a-los-emprendedores-para-la-instancia-final/'),
    rubros: ['tecnologia'], temas: ['red', 'financiamiento'], publicado: '2026-07-28', verificado: V
  },
  {
    id: 'aticma-subsecretaria', fuente: 'aticma', tipo: 'novedad',
    titulo: 'ATICMA pidió previsibilidad para la Ley de Economía del Conocimiento',
    resumen: 'En una reunión con la Subsecretaría de Industria y Economía del Conocimiento de la Nación, ATICMA planteó la continuidad de la ley y la adopción de IA en las empresas.',
    url: A('novedades/aticma-participo-de-una-reunion-de-trabajo-junto-a-la-subsecreta/'),
    rubros: ['tecnologia'], temas: ['normativa'], publicado: '2026-07-23', verificado: V
  },
  {
    id: 'aticma-on-broker', fuente: 'aticma', tipo: 'novedad',
    titulo: 'ON Broker se suma como sponsor de ATICMA',
    resumen: 'La consultora de cobertura médica para empresas acompaña la Tech Week, ATICMA Emprende, los Awards y la ronda B2B.',
    url: A('novedades/on-broker-se-suma-como-sponsor-gold-de-aticma-para-impulsar-el-c/'),
    rubros: ['tecnologia'], temas: ['red'], publicado: '2026-07-16', verificado: V
  },
  {
    id: 'aticma-nuevos-socios', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Nuevos socios de ATICMA',
    resumen: 'Se sumaron Pescom, Rigoli.dev, Novarium, Facundo Pidal, OpenCourt, Equalitas Tech, Camila Espinosa y Orion Pagos.',
    url: A('novedades/el-ecosistema-tecnologico-de-mar-del-plata-se-expande-desayuno-d/'),
    rubros: ['tecnologia'], temas: ['red'], publicado: '2026-07-15', verificado: V
  },
  {
    id: 'aticma-intecmar', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Premios INTECMAR 2026 a la innovación',
    resumen: 'Ganaron Nexus Bionic y DecidAI entre los emprendedores, y Cura Track (Laboratorio IAC Internacional) y Deseado entre las empresas. Se lanzó el Club de Inversores del IAE en Mar del Plata.',
    url: A('novedades/aticma-acompano-una-nueva-edicion-de-intecmar-impulsando-el-desa/'),
    rubros: ['todos'], temas: ['red', 'financiamiento'], publicado: '2026-07-15', verificado: V
  },
  {
    id: 'aticma-empresa-b', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Encuentro "Empresa B" en UCIP',
    resumen: 'ATICMA participó de la presentación de Sistema B en la sede de UCIP: cómo medir y certificar el impacto económico, social y ambiental de una empresa.',
    url: A('novedades/aticma-participo-del-encuentro-empresa-b-en-la-sede-de-ucip/'),
    rubros: ['todos'], temas: ['red'], publicado: '2026-07-03', verificado: V
  },
  {
    id: 'aticma-roomix', fuente: 'aticma', tipo: 'novedad',
    titulo: 'De ATICMA Emprende a Silicon Valley: Roomix levantó USD 500.000',
    resumen: 'Ignacio Gorriti, primer ganador del programa, cerró una ronda pre-seed liderada por Guillermo Rauch (Vercel), con board members de OpenAI y Meta.',
    url: A('novedades/de-aticma-emprende-a-la-cima-de-silicon-valley-el-historico-caso/'),
    rubros: ['tecnologia'], temas: ['financiamiento', 'red'], publicado: '2026-05-22', verificado: V
  },
  {
    id: 'aticma-red-federal', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Encuentro de la Red Federal de Economía del Conocimiento en Tandil',
    resumen: 'Se trabajó sobre IA y transformación productiva, competitividad, talento, marco normativo e internacionalización.',
    url: A('novedades/aticma-participo-del-encuentro-de-la-red-federal-de-ec-realizado/'),
    rubros: ['tecnologia'], temas: ['red'], publicado: '2026-05-21', verificado: V
  },
  {
    id: 'aticma-20-anos', fuente: 'aticma', tipo: 'novedad',
    titulo: 'ATICMA cumplió 20 años',
    resumen: 'Lo celebró con más de 300 empresarios durante el encuentro de CESSI, con una placa de la cámara nacional del software y un homenaje a sus expresidentes.',
    url: A('novedades/20-anos-de-aticma-el-encuentro-que-marco-el-pulso-de-la-industri/'),
    rubros: ['tecnologia'], temas: ['red'], publicado: '2026-05-13', verificado: V
  },
  {
    id: 'aticma-cessi', fuente: 'aticma', tipo: 'novedad',
    titulo: 'Mar del Plata fue sede del 19° Encuentro Empresarial del Software',
    resumen: 'Más de 300 empresarios y referentes del software argentino debatieron tres días en el Sheraton sobre IA, nuevos modelos de negocio y talento.',
    url: A('novedades/mar-del-plata-fue-sede-del-encuentro-empresarial-tecnologico-mas/'),
    rubros: ['tecnologia'], temas: ['red', 'tecnologia'], publicado: '2026-05-13', verificado: V
  }
];
