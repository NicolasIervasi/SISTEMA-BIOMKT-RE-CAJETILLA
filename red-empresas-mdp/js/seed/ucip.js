// UCIP: servicios, sectores, programas, datos y las 10 noticias publicadas en ucip.org.ar/noticias al 15/10/2026.
// Resúmenes con palabras propias. Los mails de UCIP están ocultos en su sitio: se dan teléfonos y la sede.
const V = '2026-10-15';
const LURO = 'Av. Luro 3030, Mar del Plata';
const U = path => `https://www.ucip.org.ar/${path}`;

export const UCIP = [
  // ───────────── Convocatorias y beneficios ─────────────
  {
    id: 'ucip-escanea-y-gana', fuente: 'ucip', tipo: 'convocatoria',
    titulo: 'Escaneá y Ganá: sumá tu comercio gratis al sorteo del Día de la Madre',
    resumen: 'Los clientes escanean un QR en tu local y participan por órdenes de compra que UCIP paga en tu comercio. También hay premios para los vendedores. Sorteo: lunes 2/11.',
    cuerpo: ['Te registrás gratis, exhibís el código QR que te da el sistema y los clientes participan sin obligación de compra. Si sale sorteado alguien que escaneó en tu local, retira la mercadería ahí: para el comercio es una venta, porque UCIP paga la orden de compra contra factura.',
      'La idea es sumar visitas a las zonas comerciales de la ciudad. Pueden participar todos los comercios que quieran.'],
    datos: [['Sorteo', 'Lunes 2/11 (Día de la Madre)'], ['Premios para clientes', '$350.000, $250.000 y $200.000 en órdenes de compra'], ['Premios para vendedores', '$100.000, $60.000 y $40.000'], ['Costo', 'Gratis para el comercio'], ['Consultas', 'WhatsApp 223 600-0201']],
    inicio: '2026-11-02T00:00:00-03:00', todoElDia: true,
    url: U('sistema-escanea-y-gana/'),
    accion: { txt: 'Adherir mi comercio', url: U('sistema-escanea-y-gana/') },
    rubros: ['comercio', 'gastronomia', 'textil'], temas: ['clientes', 'visibilidad'], verificado: V
  },
  {
    id: 'ucip-socios', fuente: 'ucip', tipo: 'beneficio',
    titulo: 'Hacerse socio de UCIP: cuotas y qué incluye',
    resumen: 'La cuota va de $7.200 (unipersonal) a $96.000 (más de 100 empleados). Incluye asesoramiento en créditos y subsidios, descuentos en cursos y consultorías ISO y HACCP.',
    cuerpo: ['Beneficios publicados: representación gremial en la ciudad, la provincia (FEBA) y la Nación (CAME); asesoramiento en créditos y subsidios (PRE, FONAPYME y Crédito Fiscal); asesoramiento laboral, impositivo y previsional; descuentos en capacitaciones, salones, seguros, servicio de empleo, certificados de origen y sellados; consultorías en normas ISO y HACCP; informes crediticios.',
      'Para asociarte se completa la ficha de ingreso del sitio (una para comercios y otra para cámaras) y se lleva a la sede, o se pide contacto por el formulario web.'],
    datos: [['Unipersonal', '$7.200 por mes'], ['Micro (1 a 5 empleados)', '$10.800'], ['Mini (6 a 16)', '$18.000'], ['Pyme 1A (17 a 50)', '$36.000'], ['Pyme 1B (51 a 100)', '$72.000'], ['Pyme 2 (más de 100)', '$96.000'], ['Cámaras', '$24.000'], ['Dónde', 'Departamento de socios, Av. Luro 3030 · 223 499-7777']],
    url: U('sociosucip/como-asociarse/'),
    accion: { txt: 'Ver cómo asociarme', url: U('sociosucip/como-asociarse/') },
    rubros: ['todos'], temas: ['financiamiento', 'normativa', 'red'], verificado: V
  },

  // ───────────── Servicios ─────────────
  {
    id: 'ucip-financiamiento', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Área de Financiamiento: subsidios y créditos para pymes',
    resumen: 'Un equipo de UCIP acerca las herramientas de financiamiento nacionales y provinciales y te acompaña hasta obtenerlas. Al 15/10, todas las líneas que publica figuran con convocatoria cerrada.',
    cuerpo: ['Las líneas listadas son PRODEPRO (desarrollo de proveedores, con asistencia del INTI y tasa subsidiada del BICE), créditos del CFI para la reactivación productiva, el bono de Crédito Fiscal para invertir en seguridad e higiene, y subsidios para desarrollar una nueva línea productiva. Todas aparecen como "convocatoria cerrada".',
      'Sirve dejar los datos en el formulario del área: avisan cuando abre una línea y arman la presentación. Tienen más de 10 años gestionando estos instrumentos.'],
    datos: [['Estado de las líneas', 'Todas cerradas al 15/10/2026'], ['Cómo', 'Formulario en la página o en la sede'], ['Dónde', 'Av. Luro 3030 · 223 499-7777']],
    lugar: LURO, url: U('servicios/servicios-de-financiamiento/'),
    accion: { txt: 'Dejar mis datos', url: U('servicios/servicios-de-financiamiento/') },
    rubros: ['todos'], temas: ['financiamiento'], verificado: V
  },
  {
    id: 'ucip-consultoria', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Consultoría para pymes',
    resumen: 'Profesionales de UCIP asesoran en proyectos de Crédito Fiscal y PACC, normas de calidad, costos, marketing, recursos humanos y proyectos de inversión.',
    cuerpo: ['El área tiene más de 20 años asesorando pymes de la ciudad y la zona. Temas: formulación de proyectos de Crédito Fiscal y PACC, incubadora de empresas, normas de calidad, diagnóstico de gestión, desarrollo de recursos humanos, proyectos de inversión, estrategias de marketing y análisis de costos y financiero.'],
    datos: [['Profesionales', 'Ing. Santiago Camilion, Cdra. Miriam Villar, Lic. María Marcela Urriza, Lic. María Laura Roberto, Mg. Abel Arostegui'], ['Dónde', 'Av. Luro 3030 · 223 499-7777'], ['Socios', 'Las consultorías ISO y HACCP figuran entre los beneficios de socio']],
    lugar: LURO, url: U('consultoria-para-empresas/'),
    rubros: ['todos'], temas: ['financiamiento', 'normativa', 'empleo'], verificado: V
  },
  {
    id: 'ucip-empleo', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Servicio de Empleo UCIP-AMIA: búsqueda de personal',
    resumen: 'Un equipo de recursos humanos que ayuda a las empresas a encontrar personal y a las personas a conseguir trabajo.',
    cuerpo: ['Atiende a todas las organizaciones y personas sin distinción. Los ingresos se reinvierten en programas de empleo. Los socios de UCIP tienen descuento en el servicio.'],
    datos: [['Para empresas', 'Búsqueda y selección de personal'], ['Para personas', 'Orientación e intermediación laboral'], ['Dónde', 'Av. Luro 3030 · 223 499-7777']],
    lugar: LURO, url: U('servicios/servicio-de-empleo-ucip-amia/'),
    rubros: ['todos'], temas: ['empleo'], verificado: V
  },
  {
    id: 'ucip-seguros', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Seguros para empresas y comercios (IAM)',
    resumen: 'En UCIP se contratan seguros de IAM: los obligatorios para empleadores, responsabilidad civil, comercio, caución y garantía de alquiler.',
    cuerpo: ['Para empresas: seguros de vida obligatorios (Convenio Mercantil, Ley de Contrato de Trabajo, Decreto 1567/74, trabajadores rurales), vida colectivo, accidentes personales, sepelio, saldos deudores, responsabilidad civil, comercio, turismo, consorcios, establecimientos educativos, gimnasios, colonias de verano, caución, garantía de alquiler y garantías para directores (IGJ).',
      'También hay seguros personales: vida, accidentes, freelancers, hogar y garantía de alquiler.'],
    datos: [['Contacto comercial', 'Eugenia Fusoni · 0223 499-7777 int. 217 · 223 684-8314'], ['Socios', 'Descuento en seguros']],
    lugar: LURO, url: U('servicios/seguros/'),
    rubros: ['todos'], temas: ['normativa', 'empleo'], verificado: V
  },
  {
    id: 'ucip-sellados', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Sellado de contratos (agente de ARBA)',
    resumen: 'UCIP es agente de recaudación del Impuesto de Sellos de ARBA en el régimen preferencial: sella compraventas de mercaderías, locaciones y otros contratos comerciales.',
    cuerpo: ['Alcanza, entre otras, compraventas de mercaderías (no automotores), cereales y productos del agro; locaciones de obras, servicios, muebles e inmuebles comerciales o industriales; reconocimiento de deudas comerciales, mutuos, depósitos, transporte, consignación, fianzas, transferencias de fondos de comercio, leasing, factoring y franchising, siempre que se registren en bolsas, mercados o cámaras.'],
    datos: [['Para quién', 'Socios y público general'], ['Socios', 'Descuento en sellados'], ['Dónde', 'Av. Luro 3030 · 223 499-7777']],
    lugar: LURO, url: U('servicios/sellados-de-contratos/'),
    rubros: ['todos'], temas: ['normativa'], verificado: V
  },
  {
    id: 'ucip-veraz', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Informes comerciales (Veraz) para dar crédito',
    resumen: 'Antes de vender en cuotas o dar crédito, UCIP informa en el momento los datos del cliente, sus créditos y si pidió financiación en otras empresas ese día.',
    cuerpo: ['El informe incluye datos personales, domicilio y datos laborales actualizados, solicitudes de crédito del día en otras empresas, créditos acordados y su cumplimiento. Para mantener la base al día, el comercio informa si otorgó el crédito, el monto, las cuotas y si entra en mora.'],
    datos: [['Cómo', 'Atención personalizada en la sede'], ['Socios', 'Los informes crediticios figuran entre los beneficios de socio'], ['Dónde', 'Av. Luro 3030 · 223 499-7777']],
    lugar: LURO, url: U('servicios/veraz/'),
    rubros: ['comercio', 'servicios'], temas: ['financiamiento'], verificado: V
  },
  {
    id: 'ucip-provincia-net', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Provincia NET: pagos en UCIP y cómo ser boca de cobro',
    resumen: 'La sede de UCIP es boca de cobro de Provincia NET para empresas. Tu comercio también puede ser agente de cobro para atraer más gente al local.',
    cuerpo: ['En una boca de Provincia NET se pagan impuestos y servicios (con o sin factura), impuestos de ARBA, recargas de celular y se extrae dinero con tarjeta del Banco Provincia.',
      'Los comercios que se suman reciben el equipamiento, cartelería, seguros sobre el dinero y el equipo, y una capacitación inicial. El atractivo es sumar público al local.'],
    datos: [['Boca UCIP (solo empresas)', 'Av. Luro 3030, de 8 a 13'], ['Otras bocas', 'Puerto, centro y barrios: lista en la página'], ['Ser agente', 'Formulario en la página']],
    lugar: LURO, url: U('servicios/provincia-pagos/'),
    rubros: ['comercio'], temas: ['clientes'], verificado: V
  },
  {
    id: 'ucip-cajas-seguridad', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Cajas de seguridad',
    resumen: '75 cajas de seguridad con tecnología aprobada por el Banco Central, en dos medidas, con atención personalizada de lunes a viernes de 9 a 16.',
    datos: [['Medidas', '10 × 15 cm y 10 × 30 cm'], ['Horario', 'Lunes a viernes de 9 a 16'], ['Reservas', '0223 499-7777']],
    lugar: LURO, url: U('cajas-de-seguridad/'),
    rubros: ['todos'], temas: [], verificado: V
  },
  {
    id: 'ucip-autogestion', fuente: 'ucip', tipo: 'servicio',
    titulo: 'Terminal de autogestión: tasas municipales y OSSE',
    resumen: 'En la sede hay una terminal para consultar deuda y reimprimir facturas de la tasa municipal y de Obras Sanitarias.',
    datos: [['Dónde', 'Av. Luro 3030']],
    lugar: LURO, url: U('servicios/autogestion-de-tramites/'),
    rubros: ['todos'], temas: ['normativa'], verificado: V
  },
  {
    id: 'ucip-dese', fuente: 'ucip', tipo: 'servicio',
    titulo: 'DESE: los informes económicos de UCIP',
    resumen: 'El Departamento de Estudios Sociales y Económicos mide cada mes las ventas del comercio y publica informes de coyuntura e industriales para decidir con datos.',
    cuerpo: ['Hace informes periódicos de coyuntura local y provincial, informes sectoriales de industria, comercio y servicios, y estudios a pedido de los socios.'],
    url: U('servicios/departamento-de-estudios-sociales-y-economicos-de-ucip/'),
    rubros: ['todos'], temas: ['datos'], verificado: V
  },

  // ───────────── Programas y sectores ─────────────
  {
    id: 'ucip-nodo', fuente: 'ucip', tipo: 'programa',
    titulo: 'Nodo UCIP: salas, coworking, estudio de contenidos y rondas',
    resumen: 'Espacio nuevo en la sede de UCIP para empresas de cualquier tamaño: salas para reuniones y videollamadas, coworking, estudio para podcast y streaming, y rondas de negocios.',
    cuerpo: ['Se organiza en cuatro ejes. Negocios: aulas con videoconferencia, coworking, boxes para reuniones, café abierto y lockers. Educativo: amplía el centro de capacitación, que hoy forma a 1.600 a 1.800 personas por año, con formación ejecutiva junto a universidades.',
      'Media: herramientas para producir podcasts, streaming, reels y transmisiones. Conecta: rondas de negocios, encuentros y networking entre sectores para fortalecer cadenas de valor.',
      'Según UCIP, el uso no se diferencia por tamaño de empresa. Los costos no están publicados: hay que consultar en la sede.'],
    datos: [['Dónde', 'Sede UCIP, Av. Luro 3030'], ['Para quién', 'Empresas y emprendedores de cualquier tamaño'], ['Costo', 'No publicado. Consultar al 223 499-7777']],
    lugar: LURO,
    url: 'https://www.infobrisas.com/noticias/2026/08/31/106226-la-ucip-inauguro-un-nuevo-nodo-para-empresas-en-mar-del-plata-que-servicios-ofrecera',
    via: 'Infobrisas',
    rubros: ['todos'], temas: ['red', 'clientes', 'visibilidad', 'capacitacion'], publicado: '2026-08-31', verificado: V
  },
  {
    id: 'ucip-incubadora', fuente: 'ucip', tipo: 'programa',
    titulo: 'Incubadora de UCIP para emprendedores',
    resumen: 'Capacitación y asistencia técnica gratuitas para emprendimientos en marcha o ideas de negocio, incluida la presentación a líneas de financiamiento.',
    datos: [['Costo', 'Gratis'], ['Cómo', 'Anotarse en el formulario de la página']],
    url: U('servicios/incubadora/'),
    accion: { txt: 'Anotarme', url: U('servicios/incubadora/') },
    rubros: ['todos'], temas: ['capacitacion', 'financiamiento'], verificado: V
  },
  {
    id: 'ucip-centros-comerciales', fuente: 'ucip', tipo: 'programa',
    titulo: 'Centros Comerciales a Cielo Abierto',
    resumen: 'Programa de UCIP que organiza a los comerciantes de una zona para mejorar la calle, animarla y promocionarla. Hay doce en la ciudad.',
    cuerpo: ['Los doce centros son Constitución, Tejedor, San Juan, Microcentro, Alberti, Güemes, Playa Grande, Juan B. Justo, Talcahuano, 12 de Octubre, Punta Mogotes y Sierra de los Padres. Trabajan mejoras urbanas, acciones de animación, promociones y comunicación conjunta.',
      'Desde la misma página se puede denunciar la venta ilegal.'],
    url: U('centros-comerciales/'),
    rubros: ['comercio', 'gastronomia', 'textil'], temas: ['clientes', 'visibilidad', 'red'], verificado: V
  },
  {
    id: 'ucip-ucom', fuente: 'ucip', tipo: 'programa',
    titulo: 'UCOM: Unión del Comercio Marplatense',
    resumen: 'El brazo comercial de UCIP: temas gremiales y una base de conocimiento con lo que pide cada organismo para abrir y mantener un local.',
    url: U('organizaciones-asociadas/ucom/'),
    rubros: ['comercio', 'gastronomia', 'textil'], temas: ['normativa', 'red'], verificado: V
  },
  {
    id: 'ucip-uim', fuente: 'ucip', tipo: 'programa',
    titulo: 'UIM: Unión Industrial Marplatense',
    resumen: 'Agrupa a las industrias de la ciudad, las representa ante el Estado y ayuda a acceder a planes de desarrollo oficiales.',
    url: U('organizaciones-asociadas/union-industrial-marplatense-uim/'),
    rubros: ['industria', 'alimentos', 'pesca', 'textil', 'construccion'], temas: ['red', 'financiamiento'], verificado: V
  },
  {
    id: 'ucip-oferta-exportable', fuente: 'ucip', tipo: 'programa',
    titulo: 'Oferta Exportable de Mar del Plata: cargá tu empresa',
    resumen: 'La UIM difunde la Oferta Exportable municipal: una vidriera de productos locales para compradores del exterior, en castellano e inglés.',
    cuerpo: ['La empresa tiene que estar empadronada en Desarrollo Productivo del Municipio. Después se carga con CUIT y clave fiscal: productos con su posición arancelaria, fotos, logo, países a los que exporta, certificaciones y redes.'],
    datos: [['Dónde se ve', 'mardelplata.gob.ar/ofertaexportable'], ['Requisito', 'Empadronamiento en Desarrollo Productivo (Municipio)']],
    url: U('organizaciones-asociadas/union-industrial-marplatense-uim/oferta-exportable/'),
    rubros: ['industria', 'alimentos', 'pesca', 'textil'], temas: ['exportacion', 'visibilidad'], verificado: V
  },
  {
    id: 'ucip-upri', fuente: 'ucip', tipo: 'programa',
    titulo: 'UPRI: productores regionales intensivos',
    resumen: 'El espacio de UCIP para productores frutícolas, hortícolas, apícolas, avícolas, porcinos, viveros y de papa.',
    cuerpo: ['Funciona como canal con funcionarios e instituciones. Tiene una columna semanal en Radio Brisas, donde se trataron, por ejemplo, microseguros para productores de la zona.'],
    url: U('organizaciones-asociadas/upri/'),
    rubros: ['agro', 'alimentos'], temas: ['red'], verificado: V
  },
  {
    id: 'ucip-mujeres-empresarias', fuente: 'ucip', tipo: 'programa',
    titulo: 'Comisión de Mujeres Empresarias',
    resumen: 'Espacio de UCIP para visibilizar la actividad empresaria de las mujeres, proponer capacitaciones con perspectiva de género y trabajar por la equidad.',
    datos: [['Presidenta', 'Rosana Leo']],
    url: U('organizaciones-asociadas/mujeres-empresarias/'),
    rubros: ['todos'], temas: ['red', 'capacitacion'], verificado: V
  },
  {
    id: 'ucip-comision-joven', fuente: 'ucip', tipo: 'programa',
    titulo: 'Comisión Joven: empresarios de 18 a 40 años',
    resumen: 'Grupo de jóvenes empresarios y profesionales dentro de UCIP, sin costo: rondas de negocios, desayunos de trabajo y charlas.',
    cuerpo: ['Integra Jóvenes Empresarios de FEBA y CAME Joven. También da la Cátedra del Emprendedorismo en escuelas secundarias.'],
    datos: [['Edad', '18 a 40 años'], ['Costo', 'Sin costo, afiliación voluntaria']],
    url: U('organizaciones-asociadas/jovenes-empresarios-ucip/'),
    rubros: ['todos'], temas: ['red', 'clientes'], verificado: V
  },
  {
    id: 'ucip-programa-tv', fuente: 'ucip', tipo: 'programa',
    titulo: 'Política y Producción, el programa de TV de UCIP',
    resumen: 'Programa semanal sobre consumo, producción y actualidad de Mar del Plata.',
    datos: [['Canal 8', 'Sábados a las 12'], ['Canal Ciudad (10 de Cablevisión)', 'Lunes 21, martes 13:30 y jueves 15']],
    url: U('programa-tv/'),
    rubros: ['todos'], temas: [], verificado: V
  },

  // ───────────── Directorios ─────────────
  {
    id: 'ucip-camaras', fuente: 'ucip', tipo: 'directorio',
    titulo: 'Las cámaras sectoriales socias de UCIP: buscá la de tu rubro',
    resumen: 'Treinta cámaras y asociaciones de rubro forman parte de UCIP, del transporte de cargas a las cervecerías artesanales.',
    cuerpo: ['Turismo (AEVYT), diseñadores gráficos (ADGCA), mujeres de negocios (AMNYP), papa semilla (APPASBA), talleres automotores (ATAM), frutihorticultura, panaderos y confiteros (AIPCA), administradores de propiedad horizontal, artículos del hogar, ferreteros (Ca.Fa.Mar), GNC, joyeros y relojeros, kioscos (CAKMAR), recreación, libreros, permisionarios del Centro Comercial del Puerto, comercio automotor, transporte de cargas, madera, letreros luminosos, supermercados y autoservicios, textil, Cooperativa de Horticultores, COPETRAF, COOMARPES (pesca), Copetel, UGAR, industria de la moda y cervecerías artesanales.',
      'La página de UCIP tiene el teléfono de cada una.'],
    url: U('organizaciones-asociadas/camaras-asociadas/'),
    rubros: ['todos'], temas: ['red'], verificado: V
  },
  {
    id: 'ucip-biblioteca', fuente: 'ucip', tipo: 'directorio',
    titulo: 'Biblioteca digital de UCIP',
    resumen: 'Informes de la pyme industrial de 2016 a 2025, el Manual para emprender y la revista Comerciante, para descargar.',
    url: U('biblioteca-digital/'),
    rubros: ['todos'], temas: ['datos'], verificado: V
  },

  // ───────────── Datos ─────────────
  {
    id: 'ucip-ventas-sep-2026', fuente: 'ucip', tipo: 'dato',
    titulo: 'Ventas minoristas: −7,9% interanual en septiembre',
    resumen: 'El relevamiento mensual de UCIP marca seis meses seguidos de caída. El 93,7% de los comerciantes dice que no es momento de invertir, pero el 98,4% piensa sostener a su personal.',
    cuerpo: ['La caída se mide en unidades vendidas contra el mismo mes de 2025. Entre las causas, los comerciantes señalan la falta de liquidez de los clientes, la suba de servicios y el costo de la mercadería.',
      'El 85,7% califica su rentabilidad como regular, mala o pésima, y el 54% dice estar peor que hace un año.'],
    datos: [['Elabora', 'DESE, Departamento de Estudios Sociales y Económicos de UCIP'], ['Septiembre', '−7,9% interanual en unidades'], ['No es momento de invertir', '93,7%'], ['Mantendrá su personal 6 meses', '98,4%']],
    serie: { titulo: 'Ventas minoristas, variación interanual', unidad: '%', puntos: [['Abr', -2.6], ['May', -5.8], ['Jun', -5.7], ['Jul', -7], ['Ago', -9.2], ['Sep', -7.9]] },
    url: U('noticias/nueva-caida-de-ventas-en-septiembre/'),
    rubros: ['comercio', 'textil', 'gastronomia', 'alimentos'], temas: ['datos'], publicado: '2026-10-04', verificado: V
  },
  {
    id: 'ucip-informe-industrial-2025', fuente: 'ucip', tipo: 'dato',
    titulo: 'Pyme industrial: 9 de cada 10 usan más del 60% de su capacidad, pero casi no acceden al crédito',
    resumen: 'La encuesta anual de UCIP y la UIM a 160 pymes industriales muestra mejor uso de la capacidad instalada, inversión defensiva y el acceso al crédito más bajo de todos los años relevados.',
    cuerpo: ['La encuesta se hizo entre octubre de 2024 y abril de 2025. El 56,9% de las pymes usa entre 61% y 80% de su capacidad y el 32,5%, más del 81%.',
      'Al invertir, el 36,3% busca mantener la capacidad, el 24,8% mejorar la calidad y solo el 18,6% ampliarla. Las expectativas de ventas son más pesimistas que en años anteriores.'],
    datos: [['Muestra', '160 pymes industriales del partido (UCIP y UIM)'], ['Relevamiento', '9/10/2024 al 24/4/2025'], ['Acceso al crédito', 'El más bajo desde 2016']],
    serie: { titulo: 'Pymes industriales que usan más del 60% de su capacidad', unidad: '%', puntos: [['2017', 45.2], ['2018', 39.3], ['2019', 31.3], ['2020', 35.7], ['2022', 37.6], ['2024', 89.4]] },
    url: 'https://www.ucip.org.ar/wp-content/uploads/2026/06/Informe-Encuesta-Pyme-2025.pdf',
    rubros: ['industria', 'alimentos', 'pesca', 'textil'], temas: ['datos', 'financiamiento'], verificado: V
  },
  {
    id: 'ucip-pollo-carne', fuente: 'ucip', tipo: 'dato',
    titulo: 'Por primera vez se come más pollo que carne vacuna',
    resumen: 'Según el IERAL, el consumo de pollo llegó a 47 kilos por habitante por año y el de carne vacuna bajó a 46,7. El cerdo también marca récord.',
    cuerpo: ['El cambio se explica por el precio: en el último año, un kilo de carne vacuna valió lo mismo que 3,6 kilos de pollo entero o 1,9 kilos de pechito de cerdo. El consumo de cerdo llegó a 20,1 kilos por habitante.'],
    url: U('noticias/en-argentina-se-come-mas-pollo-que-carne-vacuna/'),
    rubros: ['gastronomia', 'alimentos', 'comercio'], temas: ['datos'], publicado: '2026-10-06', verificado: V
  },

  // ───────────── Noticias ─────────────
  {
    id: 'ucip-ley-27826', fuente: 'ucip', tipo: 'novedad',
    titulo: 'Ley 27.826: bajan multas tributarias y cambia Ganancias simplificado',
    resumen: 'Algunas multas de la Ley de Procedimiento Tributario bajan 25% automáticamente y hay una reducción especial del 50% para infracciones formales anteriores.',
    cuerpo: ['Alcanza a micro, pequeñas y medianas empresas, personas humanas, sucesiones indivisas y entidades sin fines de lucro que no sean Grandes Contribuyentes Nacionales. Rige desde su publicación en el Boletín Oficial.',
      'La reducción del 50% exige aceptar la sanción restante, cumplir la obligación omitida y renunciar a reclamos; lo ya pagado no se devuelve. Los cambios en Ganancias simplificado aplican desde el período fiscal 2025. ARCA tenía 30 días para reglamentarlo.',
      'Es un resumen de la nota de UCIP, no asesoramiento: revisalo con tu contador.'],
    datos: [['Norma', 'Ley 27.826 (decreto 1160/2026)'], ['Para quién', 'Mipymes y personas humanas que no son Grandes Contribuyentes'], ['Qué hacer', 'Consultá con tu contador si tenés multas formales pendientes']],
    url: U('noticias/nueva-ley-tributaria-bajan-multas-y-cambian-las-reglas-de-ganancias-simplificado/'),
    rubros: ['todos'], temas: ['normativa'], publicado: '2026-10-09', verificado: V
  },
  {
    id: 'ucip-came-papa', fuente: 'ucip', tipo: 'novedad',
    titulo: 'CAME le llevó al papa León XIV un documento sobre las pymes',
    resumen: 'El presidente de CAME, Ricardo Diab, entregó en el Vaticano un diagnóstico de las pymes y propuso una mesa federal con cinco compromisos para pasar de la estabilidad a la inversión y el empleo.',
    cuerpo: ['El documento reconoce estabilidad y baja de la inflación, y pide dinamizar el consumo, bajar la presión impositiva en todos los niveles, financiamiento productivo y menores costos operativos. Entre los compromisos propuestos están la formalización laboral y la capacitación.'],
    url: U('noticias/el-presidente-de-came-llevo-al-papa-leon-xiv-la-voz-federal-de-las-pymes-argentinas/'),
    rubros: ['todos'], temas: ['normativa'], publicado: '2026-10-08', verificado: V
  },
  {
    id: 'ucip-camarco-50', fuente: 'ucip', tipo: 'novedad',
    titulo: 'La Cámara Argentina de la Construcción cumplió 50 años en Mar del Plata',
    resumen: 'UCIP acompañó el aniversario de la delegación local de CAMARCO, que preside Flavio Saglia.',
    url: U('noticias/aniversario-de-camarco/'),
    rubros: ['construccion'], temas: ['red'], publicado: '2026-10-06', verificado: V
  },
  {
    id: 'ucip-intercamaras', fuente: 'ucip', tipo: 'novedad',
    titulo: 'Encuentro regional Intercámaras en Tandil',
    resumen: 'Dirigentes de UCIP y FEBA participaron el 2/10, en la Expotan, de un encuentro de cámaras de la región para compartir problemas comunes y servicios.',
    url: U('noticias/encuentro-regional-intercamaras/'),
    rubros: ['todos'], temas: ['red'], publicado: '2026-10-05', verificado: V
  },
  {
    id: 'ucip-acde', fuente: 'ucip', tipo: 'novedad',
    titulo: 'ACDE habló de liderazgo e inteligencia artificial en UCIP',
    resumen: 'La Asociación Cristiana de Dirigentes de Empresa hizo su encuentro local el 30/9 en UCIP, con una charla sobre liderazgo, IA y valor humano.',
    url: U('noticias/encuentro-de-acde-en-ucip/'),
    rubros: ['todos'], temas: ['red', 'tecnologia'], publicado: '2026-10-02', verificado: V
  },
  {
    id: 'ucip-planificacion-patrimonial', fuente: 'ucip', tipo: 'novedad',
    titulo: 'Charla en UCIP sobre planificación patrimonial y empresa familiar',
    resumen: 'La abogada Noelia López Castellanos repasó protección patrimonial, testamentos, donaciones, protocolos familiares y continuidad de la empresa familiar.',
    url: U('noticias/planificacion-patrimonial/'),
    rubros: ['todos'], temas: ['normativa'], publicado: '2026-10-02', verificado: V
  },
  {
    id: 'ucip-mar-chiquita-produce', fuente: 'ucip', tipo: 'novedad',
    titulo: 'Mar Chiquita Produce: financiamiento y crédito para comercios',
    resumen: 'UCIP participó de una jornada en Mar Chiquita sobre herramientas locales, financiamiento productivo y crédito para comercios, y explicó el rol de las cámaras sectoriales.',
    url: U('noticias/mar-chiquita-produce/'),
    rubros: ['todos'], temas: ['financiamiento', 'red'], publicado: '2026-09-28', verificado: V
  },
  {
    id: 'ucip-fundami', fuente: 'ucip', tipo: 'novedad',
    titulo: 'UCIP en el almuerzo de FUNDAMI',
    resumen: 'Una delegación de UCIP acompañó el encuentro de la fundación del Hospital Materno Infantil, en Laguna de los Padres.',
    url: U('noticias/ucip-presente-en-el-almuerzo-de-fundami/'),
    rubros: ['todos'], temas: [], publicado: '2026-09-28', verificado: V
  }
];
