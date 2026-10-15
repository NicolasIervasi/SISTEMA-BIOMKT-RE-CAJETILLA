// Los 38 cursos del Centro de Capacitación de UCIP publicados al 15/10/2026 (ucip.org.ar/servicios/capacitacion/cursos-presenciales).
// Fechas, horarios, docentes, destinatarios y promociones copiados de la página de cada curso; resúmenes con palabras propias.
// Los cursos con fecha tienen una clase por semana entre `desde` y `hasta`. Los del ciclo 2027 todavía no tienen día ni horario.
const VERIFICADO = '2026-10-15';
const LURO = 'Av. Luro 3030, Mar del Plata';
const PROMO = 'Socios de UCIP: matrícula bonificada y 15% en las cuotas. Con otra persona o dos cursos: 50% en la matrícula y 10% en las cuotas. Ex alumnos de cursos anuales o cuatrimestrales: matrícula bonificada.';

const min = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function curso(c) {
  const url = `https://www.ucip.org.ar/cursospre/${c.slug}/`;
  const conFecha = Boolean(c.desde);
  const empezo = conFecha && c.desde < VERIFICADO;
  const datos = [['Cuándo', c.cuando]];
  if (c.duracion) datos.push(['Duración', c.duracion]);
  if (c.docente) datos.push(['Docente', c.docente]);
  datos.push(['Dónde', 'Centro de Capacitación UCIP, Av. Luro 3030']);
  if (c.para) datos.push(['Para quién', c.para]);
  if (c.requisitos) datos.push(['Requisitos', c.requisitos]);
  if (c.titulo2) datos.push(['Certificación', c.titulo2]);
  datos.push(['Descuentos', c.promo || PROMO]);
  datos.push(['Costo', 'No publicado: se consulta al inscribirse']);
  datos.push(['Consultas', 'WhatsApp 223 436-0509 · capacitacion@ucip.org.ar · 223 499-7777']);
  const item = {
    id: c.id || `ucip-c-${c.slug}`.slice(0, 80),
    fuente: 'ucip', tipo: 'capacitacion',
    titulo: c.titulo, resumen: c.resumen,
    cuerpo: c.cuerpo,
    datos,
    lugar: LURO,
    url,
    accion: { txt: empezo ? 'Ver el curso' : conFecha ? 'Ver curso e inscribirme' : 'Consultar e inscribirme', url },
    rubros: c.rubros || ['todos'], temas: c.temas ?? ['capacitacion'],
    verificado: VERIFICADO
  };
  if (conFecha) {
    item.inicio = `${c.desde}T${c.hora[0]}:00-03:00`;
    item.fin = `${c.hasta}T${c.hora[1]}:00-03:00`;
    item.duracionMin = min(c.hora[1]) - min(c.hora[0]);
    if (c.clases) item.sesiones = c.clases;
  } else {
    item.etiqueta = c.etiqueta || 'Ciclo 2027 · de abril a diciembre';
  }
  if (!item.cuerpo) delete item.cuerpo;
  return item;
}

export const UCIP_CURSOS = [
  // ── Empiezan en octubre ──
  curso({
    id: 'ucip-excel-ia-2026', slug: 'excel-basico', titulo: 'Excel básico con IA',
    resumen: 'Ocho clases para manejar planillas desde cero: fórmulas, funciones básicas y gráficos, con ayuda de inteligencia artificial.',
    cuerpo: ['Pensado para quien usa Excel poco o nada y necesita resolver cuentas, listas y gráficos del día a día. Se pide manejo básico de computadora.'],
    desde: '2026-10-16', hasta: '2026-12-04', hora: ['18:30', '20:30'], clases: 8,
    cuando: 'Viernes de 18:30 a 20:30, del 16/10 al 4/12', duracion: '8 clases',
    docente: 'Prof. Trinidad Scaine', para: 'Público general con manejo de PC', requisitos: 'Manejo de PC',
    temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    id: 'ucip-manipulacion-alimentos-2026-10', slug: 'manipulacion-de-alimentos', titulo: 'Carnet de manipulación de alimentos',
    resumen: 'Dos clases presenciales que dan el carnet oficial de la Provincia de Buenos Aires para quien trabaja con alimentos.',
    cuerpo: ['Sirve para cocineros, mozos, repositores, proveedores y personal de transporte de alimentos. El carnet lo emite el Ministerio de Desarrollo Agrario bonaerense y, según UCIP, vale en todo el país. Hay que asistir a las dos jornadas.'],
    desde: '2026-10-21', hasta: '2026-10-28', hora: ['16:00', '19:00'], clases: 2,
    cuando: 'Miércoles 21/10 y 28/10, de 16 a 19 (asistencia obligatoria a ambas)', duracion: '2 encuentros presenciales',
    docente: 'Ing. Vanina Sgromo', para: 'Quien trabaja con alimentos: cocina, salón, depósito, reparto',
    titulo2: 'Carnet del Ministerio de Desarrollo Agrario de la Provincia de Buenos Aires',
    promo: 'Empleados de empresas socias de UCIP: 15% de descuento.',
    rubros: ['gastronomia', 'alimentos', 'comercio', 'turismo', 'logistica'], temas: ['capacitacion', 'normativa']
  }),
  curso({
    id: 'ucip-ia-trabajo-2026', slug: 'ia-aplicada-automatiza-tu-trabajo', titulo: 'Inteligencia artificial: optimizá tu trabajo',
    resumen: 'Seis clases prácticas para dueños, gerentes y equipos: asistentes de IA, automatizaciones con Make y n8n y un bot básico de atención por WhatsApp.',
    cuerpo: ['Recorre cómo funcionan los modelos de lenguaje (y por qué a veces inventan), compara asistentes, enseña a escribir buenas instrucciones y a armar un asistente propio para el puesto de cada uno.',
      'La segunda mitad es aplicada: automatizaciones con Make y n8n, IA en WhatsApp y Telegram con un bot de atención, y uso para redes. En la última clase cada participante presenta su proyecto.'],
    desde: '2026-10-22', hasta: '2026-11-26', hora: ['18:00', '20:30'], clases: 6,
    cuando: 'Jueves de 18 a 20:30, del 22/10 al 26/11', duracion: '6 clases',
    docente: 'Prof. Javier Mateos', para: 'Trabajadores, profesionales, gerentes y dueños de empresa',
    temas: ['tecnologia', 'capacitacion']
  }),
  curso({
    id: 'ucip-finanzas-2026', slug: 'finanzas-personales-aprende-a-invertir', titulo: 'Finanzas personales: aprendé a invertir',
    resumen: 'Cinco clases para entender los distintos tipos de inversión, evaluar riesgos y decidir sin intermediarios.',
    desde: '2026-10-27', hasta: '2026-11-24', hora: ['16:00', '18:20'], clases: 5,
    cuando: 'Martes de 16 a 18:20, del 27/10 al 24/11', duracion: '5 clases',
    docente: 'Lic. y CP Javier Mateos y Lic. y CP Ariel Rajovitzky', para: 'Público general interesado en invertir',
    temas: ['capacitacion', 'financiamiento']
  }),

  // ── En curso (empezaron entre junio y septiembre) ──
  curso({
    slug: 'liquidacion-de-sueldos-y-jornales', titulo: 'Liquidación de sueldos',
    resumen: 'Cómo liquidar sueldos y jornales aplicando la Ley de Contrato de Trabajo y los convenios vigentes.',
    desde: '2026-08-18', hasta: '2026-12-01', hora: ['18:30', '21:00'], clases: 16,
    cuando: 'Martes de 18:30 a 21, del 18/8 al 1/12', duracion: '16 clases',
    docente: 'CP Romina Slamich y equipo', para: 'Interesados en el tema y profesionales que quieran especializarse',
    temas: ['capacitacion', 'empleo', 'normativa']
  }),
  curso({
    slug: 'cajero-administrativo-comercial', titulo: 'Caja y administración comercial',
    resumen: 'Tareas de caja, atención al cliente y administración: documentación comercial, medios de pago, facturación, arqueo y planillas.',
    cuerpo: ['Orientado a quien busca su primer empleo en comercios, empresas o consultorios. Se trabaja con ejercicios y simulaciones de situaciones reales, con Excel y Google Sheets.'],
    desde: '2026-08-28', hasta: '2026-12-04', hora: ['18:00', '20:30'], clases: 15,
    cuando: 'Viernes de 18 a 20:30, del 28/8 al 4/12', duracion: '15 clases',
    docente: 'Cdora. Natalia Carreras y equipo', para: 'Quien quiere trabajar en caja o administración, sin conocimientos previos',
    rubros: ['comercio', 'gastronomia', 'servicios', 'salud'], temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'ventas-en-accion-estrategias-para-vender-mas-y-mejor', titulo: 'Escuela de ventas: vendedor profesional',
    resumen: 'Entrenamiento práctico para profesionalizar el proceso comercial y vender más y mejor.',
    desde: '2026-08-11', hasta: '2026-10-27', hora: ['18:30', '20:30'], clases: 12,
    cuando: 'Martes de 18:30 a 20:30, del 11/8 al 27/10', duracion: '12 clases',
    docente: 'Gabriel Sapienza y otros consultores', para: 'Gerentes y equipos de venta, comerciantes y emprendedores',
    temas: ['capacitacion', 'clientes']
  }),
  curso({
    slug: 'asistente-de-gestoria-general', titulo: 'Asistente de gestoría general',
    resumen: 'Bases de derecho civil, familiar, laboral y comercial aplicadas a trámites inmobiliarios, judiciales, previsionales y del automotor.',
    desde: '2026-08-26', hasta: '2026-11-25', hora: ['18:00', '20:30'], clases: 14,
    cuando: 'Miércoles de 18 a 20:30, del 26/8 al 25/11', duracion: '14 clases',
    docente: 'Dra. Valeria Maccarone y Dra. Jorgelina Harriague', para: 'Quien quiera trabajar en gestoría, por su cuenta o en un estudio',
    promo: 'Socios de UCIP: 50% en la matrícula y 10% en las cuotas. Con otra persona o dos cursos: 50% en la matrícula y 10% en las cuotas.',
    rubros: ['servicios'], temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'community-manager-desde-cero', titulo: 'Community manager desde cero',
    resumen: 'Planificar contenidos, diseñar piezas en Photoshop, editar videos en CapCut y analizar los resultados de redes de una marca.',
    desde: '2026-08-14', hasta: '2026-11-27', hora: ['19:00', '21:00'], clases: 16,
    cuando: 'Viernes de 19 a 21, del 14/8 al 27/11', duracion: '16 clases',
    docente: 'Simón Alderete', para: 'Quien quiera trabajar como community manager o manejar las redes de su negocio', requisitos: 'Manejo de computadora y celular',
    temas: ['capacitacion', 'visibilidad', 'clientes']
  }),
  curso({
    slug: 'produccion-audiovisual-y-edicion-de-video', titulo: 'Producción audiovisual y edición de video',
    resumen: 'Escritura, producción y edición de piezas audiovisuales para distintas plataformas.',
    desde: '2026-08-26', hasta: '2026-12-09', hora: ['18:00', '21:00'], clases: 16,
    cuando: 'Miércoles de 18 a 21, del 26/8 al 9/12', duracion: '16 clases',
    docente: 'Prof. Christopher Espinoza y Rocío Osinaga', para: 'Interesados en crear contenido audiovisual',
    temas: ['capacitacion', 'visibilidad']
  }),
  curso({
    slug: 'produccion-musical', titulo: 'Producción musical y audio digital',
    resumen: 'Música, informática y audio digital para producir temas listos para Spotify, YouTube y otras plataformas.',
    desde: '2026-08-10', hasta: '2026-11-30', hora: ['18:30', '21:00'], clases: 14,
    cuando: 'Lunes de 18:30 a 21, del 10/8 al 30/11', duracion: '14 clases',
    docente: 'Máximo Parisi', para: 'Adolescentes y adultos con manejo básico de PC', requisitos: 'Manejo básico de PC; conviene llevar auriculares',
    rubros: ['servicios', 'otro']
  }),
  curso({
    slug: 'informatica-basica-para-adultos', titulo: 'Informática básica',
    resumen: 'Cómo funciona una computadora y un celular, navegar seguro por internet y usar las aplicaciones más comunes, desde cero.',
    desde: '2026-08-20', hasta: '2026-11-26', hora: ['15:45', '17:45'], clases: 15,
    cuando: 'Jueves de 15:45 a 17:45, del 20/8 al 26/11', duracion: '15 clases',
    docente: 'Prof. Celeste Arévalo', para: 'Adultos sin conocimientos previos', requisitos: 'Sin requisitos',
    temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'como-manejar-tu-celular-y-sus-aplicaciones', titulo: 'Cómo manejar tu celular y sus aplicaciones',
    resumen: 'Para usar el celular con autonomía y resolver problemas básicos. Jubilados sin matrícula.',
    desde: '2026-08-18', hasta: '2026-11-03', hora: ['10:45', '12:15'], clases: 12,
    cuando: 'Martes de 10:45 a 12:15, del 18/8 al 3/11', duracion: '12 clases',
    docente: 'Prof. Celeste Arévalo', para: 'Personas que no manejan el celular',
    promo: 'Jubilados: matrícula bonificada. Socios de UCIP: matrícula bonificada y 15% en las cuotas. Con otra persona o dos cursos: 50% en la matrícula y 10% en las cuotas.',
    temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'armado-y-reparacion-de-pc', titulo: 'Armado y reparación de PC',
    resumen: 'Diagnosticar y resolver las fallas comunes de una computadora para trabajar como técnico.',
    desde: '2026-08-26', hasta: '2026-11-25', hora: ['18:30', '21:00'], clases: 14,
    cuando: 'Miércoles de 18:30 a 21, del 26/8 al 25/11', duracion: '14 clases',
    docente: 'Ariel Polisano', para: 'Público general, aficionados y futuros técnicos',
    rubros: ['tecnologia', 'servicios', 'comercio'], temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'reparacion-de-telefonos-moviles', titulo: 'Reparación de teléfonos celulares',
    resumen: 'Las reparaciones de todos los días en un taller de celulares, con las herramientas para diagnosticar distintas tecnologías.',
    desde: '2026-08-27', hasta: '2026-12-03', hora: ['16:00', '18:30'], clases: 15,
    cuando: 'Jueves de 16 a 18:30, del 27/8 al 3/12', duracion: '15 clases',
    docente: 'Tec. Gastón Suárez', para: 'Quien busque una salida laboral en reparación de celulares', requisitos: 'Sin requisitos',
    rubros: ['comercio', 'servicios', 'tecnologia']
  }),
  curso({
    slug: 'reparacion-de-pequenos-electrodomesticos', titulo: 'Reparación de pequeños electrodomésticos',
    resumen: 'Electricidad aplicada, componentes, diagnóstico de fallas y reparaciones sencillas con trabajo seguro.',
    desde: '2026-08-25', hasta: '2026-11-10', hora: ['18:00', '20:30'], clases: 12,
    cuando: 'Martes de 18 a 20:30, del 25/8 al 10/11', duracion: '12 clases',
    docente: 'Prof. Mario Schust', para: 'Público general interesado',
    rubros: ['servicios', 'comercio']
  }),
  curso({
    slug: 'electricidad-domiciliaria-basica', titulo: 'Electricidad domiciliaria básica',
    resumen: 'Instalación, reparación y mantenimiento de instalaciones eléctricas monofásicas de una casa.',
    desde: '2026-08-20', hasta: '2026-11-19', hora: ['15:00', '17:30'], clases: 14,
    cuando: 'Jueves de 15 a 17:30, del 20/8 al 19/11', duracion: '14 clases',
    docente: 'Prof. Claudio Fierro', para: 'Público general y técnicos, sin conocimientos previos',
    rubros: ['construccion', 'servicios']
  }),
  curso({
    slug: 'curso-de-automatismo-instalacion-de-portones-y-operacion-de-sistemas-automaticos', titulo: 'Automatismo: instalación de portones y sistemas automáticos',
    resumen: 'Instalación y operación de portones y otros sistemas automatizados, con el apoyo de la Cámara de Ferreteros (Ca.Fa.Mar).',
    desde: '2026-08-26', hasta: '2026-12-02', hora: ['18:00', '20:30'], clases: 15,
    cuando: 'Miércoles de 18 a 20:30, del 26/8 al 2/12', duracion: '15 clases',
    docente: 'Equipo docente de Ca.Fa.Mar', para: 'Público general, herrerías, fabricantes de portones y técnicos de mantenimiento',
    rubros: ['construccion', 'industria', 'servicios']
  }),
  curso({
    slug: 'cerrajeria-general', titulo: 'Cerrajería general',
    resumen: 'Copiado de llaves, reparación, instalación y apertura de cerraduras: el inicio completo al oficio, con apoyo de Ca.Fa.Mar.',
    desde: '2026-08-24', hasta: '2026-12-14', hora: ['18:00', '21:00'], clases: 14,
    cuando: 'Lunes de 18 a 21, del 24/8 al 14/12', duracion: '14 clases',
    docente: 'Equipo docente de Ca.Fa.Mar', para: 'Personal de mantenimiento, ferreteros y mayores de edad que quieran aprender el oficio',
    requisitos: 'Ser mayor de edad; fotocopia de DNI y certificado de antecedentes penales',
    promo: 'Socios de UCIP o de Ca.Fa.Mar: matrícula bonificada y 15% en las cuotas. Con otra persona o dos cursos: 50% en la matrícula y 10% en las cuotas.',
    rubros: ['comercio', 'servicios', 'construccion']
  }),
  curso({
    slug: 'sistemas-de-alarmas', titulo: 'Sistemas de control de acceso',
    resumen: 'Instalar, configurar, programar y mantener sistemas de control de acceso.',
    desde: '2026-09-21', hasta: '2026-12-14', hora: ['18:00', '21:00'], clases: 10,
    cuando: 'Lunes de 18 a 21, del 21/9 al 14/12', duracion: '10 clases',
    docente: 'Prof. Horacio Portó', para: 'Público general y técnicos, sin conocimientos previos',
    rubros: ['servicios', 'construccion', 'comercio'], temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'curso-de-programacion-y-tecnologia-para-ninos', titulo: 'Programación y tecnología para chicos de 7 a 10 años',
    resumen: 'Programación visual, lógica, electrónica básica y robótica con actividades prácticas para chicos.',
    desde: '2026-06-22', hasta: '2026-11-09', hora: ['15:30', '17:00'],
    cuando: 'Lunes de 15:30 a 17, del 22/6 al 9/11', duracion: '4 meses',
    docente: 'Prof. Celeste Arévalo y Victoria Sánchez', para: 'Chicos y chicas de 7 a 10 años',
    promo: 'Hermanos: 10% en las cuotas para ambos. Se acepta la Tarjeta Centro de Familias.',
    temas: []
  }),
  curso({
    slug: 'curso-de-programacion-y-tecnologia-para-adolescentes', titulo: 'Programación y tecnología para chicos de 11 a 16 años',
    resumen: 'De las primeras ideas de programación al trabajo con robots, electrónica básica y juegos interactivos.',
    desde: '2026-06-12', hasta: '2026-10-16', hora: ['15:30', '17:00'],
    cuando: 'Viernes de 15:30 a 17, del 12/6 al 16/10', duracion: '4 meses',
    docente: 'Prof. Celeste Arévalo y Victoria Sánchez', para: 'Chicos y chicas de 11 a 16 años',
    promo: 'Hermanos: 10% en las cuotas para ambos. Se acepta la Tarjeta Centro de Familias.',
    temas: []
  }),

  // ── Terminados en 2026 ──
  curso({
    slug: 'excel-intermedio-avanzado', titulo: 'Excel intermedio-avanzado',
    resumen: 'Funciones y herramientas avanzadas de Excel para quien ya maneja lo básico.',
    desde: '2026-08-12', hasta: '2026-09-30', hora: ['16:00', '18:00'], clases: 8,
    cuando: 'Miércoles de 16 a 18, del 12/8 al 30/9', duracion: '8 clases',
    docente: 'Prof. Rocío Feijoó', para: 'Público general con Excel básico',
    temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'trading-desde-cero', titulo: 'Trading desde cero, con IA aplicada',
    resumen: 'Análisis de mercados, gestión de riesgo y un plan de trading propio, con herramientas actuales.',
    desde: '2026-06-05', hasta: '2026-07-17', hora: ['18:30', '20:30'], clases: 6,
    cuando: 'Viernes de 18:30 a 20:30, del 5/6 al 17/7', duracion: '6 clases',
    docente: 'Lic. y CP Javier Mateos', para: 'Público general, sin conocimientos previos',
    temas: ['capacitacion', 'financiamiento']
  }),

  // ── Ciclo 2027 (abril a diciembre; día y horario a confirmar) ──
  curso({
    slug: 'auxiliar-administrativo', titulo: 'Auxiliar administrativo',
    resumen: 'Gestión administrativa de una organización: registraciones contables, conciliaciones y análisis de cuentas.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'CPN Fernando Francesh y CPN Marcelo Burstein', para: 'Quien quiera trabajar en administración y estudiantes que quieran práctica diaria',
    temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'gerenciamiento-de-recursos-humanos', titulo: 'Gestión de recursos humanos (certificación DIEGEP)',
    resumen: 'Comportamiento humano en el trabajo, liderazgo de equipos y procesos de cambio, con certificación oficial.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Lic. Cecilia Pérez y equipo', para: 'Quien trabaja o quiere trabajar en el área de RR. HH.', requisitos: 'Sin requisitos',
    titulo2: 'Certificación oficial DIEGEP',
    temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'marketing-digital-para-redes-sociales', titulo: 'Marketing digital (certificación DIEGEP)',
    resumen: 'Planificar, ejecutar y optimizar campañas de marketing digital con publicidad online, datos, automatización e IA.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Prof. Martín Malaspina', para: 'Comercios y servicios con redes activas, y quienes trabajan o quieren trabajar en marketing digital',
    requisitos: 'Manejo de PC', titulo2: 'Certificación oficial DIEGEP',
    temas: ['capacitacion', 'visibilidad', 'clientes']
  }),
  curso({
    slug: 'diseno-grafico', titulo: 'Diseño gráfico (certificación DIEGEP)',
    resumen: 'Fundamentos del diseño y los programas para hacer piezas de promoción y difusión.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Prof. Ignacio Suárez', para: 'Quien quiera incorporar herramientas de diseño gráfico',
    titulo2: 'Título oficial DIEGEP',
    rubros: ['servicios', 'comercio', 'todos'], temas: ['capacitacion', 'visibilidad']
  }),
  curso({
    slug: 'despachante-de-aduana-2013', titulo: 'Comercio exterior y procedimientos aduaneros',
    resumen: 'Operatoria del comercio internacional y de la aduana para trabajar como auxiliar en una empresa o con un despachante.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Lic. Tamara Ruiz y equipo', para: 'Quien quiera trabajar en comercio exterior',
    rubros: ['industria', 'alimentos', 'pesca', 'logistica'], temas: ['capacitacion', 'exportacion']
  }),
  curso({
    slug: 'secretariado-medico', titulo: 'Secretariado médico',
    resumen: 'Organización y administración de servicios de salud: gestión, nomencladores y atención al público.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Lic. Amalia Chromechek y equipo', para: 'Quien quiera trabajar en la administración de un centro de salud', requisitos: 'Sin requisitos',
    promo: 'Socios de UCIP: matrícula bonificada y 25% en las cuotas. Con otra persona o dos cursos: 50% en la matrícula y 10% en las cuotas.',
    rubros: ['salud', 'servicios'], temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'auxiliar-de-farmacia', titulo: 'Auxiliar de farmacia',
    resumen: 'Formación para trabajar como auxiliar del farmacéutico, en farmacias comerciales u hospitalarias.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual',
    docente: 'Prof. Eliana Pugliese', para: 'Quien quiera trabajar en el ámbito farmacéutico', requisitos: 'Sin requisitos',
    rubros: ['salud', 'comercio'], temas: ['capacitacion', 'empleo']
  }),
  curso({
    slug: 'gestion-integral-de-seguridad-electronica-video-seguridad-alarma-y-control-de-acceso', id: 'ucip-c-seguridad-electronica',
    titulo: 'Seguridad electrónica: cámaras, alarmas y control de acceso',
    resumen: 'Diseño, instalación y mantenimiento de videovigilancia, alarmas y controles de acceso para casas y comercios. Se puede cursar un solo módulo.',
    cuando: 'De abril a diciembre de 2027. Día y horario a confirmar', duracion: 'Anual, por módulos',
    docente: 'Horacio Portó', para: 'Público general y técnicos, sin conocimientos previos',
    rubros: ['servicios', 'construccion', 'comercio'], temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'electronica-basica', titulo: 'Electrónica básica',
    resumen: 'Leyes, componentes y mediciones de la electrónica, con reconocimiento físico de cada pieza.',
    cuando: 'De abril a agosto de 2027. Día y horario a confirmar', duracion: '16 clases', etiqueta: 'Ciclo 2027 · de abril a agosto',
    docente: 'Prof. Mario Schust', para: 'Público general y técnicos que quieran complementar su formación',
    rubros: ['tecnologia', 'industria', 'servicios']
  }),
  curso({
    slug: 'robotica-aplicada-basica', titulo: 'Robótica aplicada (certificación DIEGEP)',
    resumen: 'Diseñar y programar robots para la industria o el entretenimiento; al final se arma una máquina CNC.',
    cuando: 'De abril a septiembre de 2027. Día y horario a confirmar', duracion: '21 clases', etiqueta: 'Ciclo 2027 · de abril a septiembre',
    docente: 'Alejandro Patuto', para: 'Quien quiera iniciarse en robótica', titulo2: 'Certificación oficial DIEGEP',
    rubros: ['industria', 'tecnologia'], temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'robotica-industrial', titulo: 'Robótica industrial',
    resumen: 'Movimiento, programación, sensores y control de robots industriales, con mirada práctica para la planta.',
    cuando: 'De abril a septiembre de 2027. Día y horario a confirmar', duracion: '19 clases', etiqueta: 'Ciclo 2027 · de abril a septiembre',
    docente: 'Prof. Alejandro Patuto', para: 'Técnicos, estudiantes, operarios industriales y egresados de Robótica aplicada',
    rubros: ['industria', 'tecnologia', 'alimentos', 'pesca'], temas: ['capacitacion', 'tecnologia']
  }),
  curso({
    slug: 'academia-tecnologica-indetec-metodo-steam', titulo: 'Robótica y tecnología INDETEC para chicos de 8 y 9 años',
    resumen: 'Educación STEAM para que los chicos resuelvan problemas con tecnología.',
    cuando: 'De abril a diciembre de 2027. Horario a confirmar', duracion: 'Anual',
    docente: 'Equipo docente de UCIP', para: 'Chicos y chicas de 8 y 9 años',
    promo: 'Inscripción anticipada (antes del 16 de febrero): 50% en la matrícula. Dos chicos (hermanos o amigos): matrícula bonificada y 10% en las cuotas.',
    temas: []
  }),
  curso({
    slug: 'academia-tecnologica-indetec-modelo-steam-ninos-de-10-11-y-12-anos', id: 'ucip-c-indetec-10-12',
    titulo: 'Robótica y tecnología INDETEC para chicos de 10 a 12 años',
    resumen: 'Educación STEAM para que los chicos resuelvan problemas con tecnología.',
    cuando: 'De abril a diciembre de 2027. Horario a confirmar', duracion: 'Anual',
    docente: 'Equipo de Capacitación de UCIP', para: 'Chicos y chicas de 10 a 12 años',
    promo: 'Inscripción anticipada (antes del 16 de febrero): 50% en la matrícula. Dos chicos (hermanos o amigos): matrícula bonificada y 10% en las cuotas.',
    temas: []
  }),
  curso({
    slug: 'academia-tecnologica-indetec-modelo-steam-adolescentes-de-13-y-14-anos', id: 'ucip-c-indetec-13-15',
    titulo: 'Robótica y tecnología INDETEC para chicos de 13 a 15 años',
    resumen: 'Educación STEAM para que los chicos resuelvan problemas con tecnología.',
    cuando: 'De abril a diciembre de 2027. Horario a confirmar', duracion: 'Anual',
    docente: 'Equipo docente de UCIP', para: 'Adolescentes de 13 a 15 años',
    promo: 'Dos chicos (hermanos o amigos): matrícula bonificada y 10% en las cuotas.',
    temas: []
  })
];
