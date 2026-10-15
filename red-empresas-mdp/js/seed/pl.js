// Producto Local – Trabajo Marplatense (Municipio de General Pueyrredon, Decreto 2032/20).
// Fuentes: la página "Participá del programa" y las dos Actas Compromiso (2026) del sitio municipal, el listado de empresas
// adheridas y las gacetillas publicadas por los medios (campo `via`). La dirección mardelplata.gob.ar/productolocal responde con error.
const V = '2026-10-15';
const PARTICIPA = 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-participa-programa';
const ACTA_PRODUCTOR = 'https://www.mardelplata.gob.ar/documentos/desarrollo_productivo/pl%20acta-productor.pdf';
const ACTA_COMERCIO = 'https://www.mardelplata.gob.ar/documentos/desarrollo_productivo/acta-establecimiento-comercial_2023.pdf';
const ADHERIDAS = 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-empresas-adheridas';

export const PL = [
  {
    id: 'pl-programa', fuente: 'pl', tipo: 'programa',
    titulo: 'Sumá tus productos al sello Producto Local (gratis)',
    resumen: 'Si fabricás en Mar del Plata, Batán o Sierra de los Padres, el Municipio identifica tus productos con el sello y los difunde. Es gratis: se completa un acta y se manda por mail.',
    cuerpo: ['Cómo se hace: descargás el Acta Compromiso para productores o industrias, la completás con los datos de la empresa y la lista de productos (nombre y posición NCM, con carácter de declaración jurada) y la mandás a productolocal@mardelplata.gob.ar. El Municipio responde para confirmar la inscripción.',
      'Requisitos: los productos se tienen que fabricar en plantas del partido de General Pueyrredon y cumplir las normas de elaboración y venta; la empresa y el local tienen que estar en regla legal, fiscal e impositivamente.',
      'Qué da el Municipio: una campaña en medios y redes, la publicación de tus productos en la web municipal como Oferta Productiva Local y los elementos del sello (vinilos, cenefas, stoppers) para tus locales, los comercios adheridos que te venden y tu tienda online. Esos elementos se entregan sin cobrar nada al comercio.',
      'El acta dura un año y se renueva sola; se puede dar de baja avisando con 30 días.'],
    datos: [['Costo', 'Gratis y voluntario'], ['Cómo', 'Acta Compromiso por mail a productolocal@mardelplata.gob.ar'], ['Requisito', 'Productos fabricados en el partido, empresa en regla'], ['Vigencia', '1 año, renovación automática'], ['Consultas', '499-7970 int. 4347 · Salta 1842, 5° piso'], ['Norma', 'Decreto 2032/20']],
    lugar: 'Salta 1842, 5° piso, Mar del Plata',
    url: PARTICIPA,
    accion: { txt: 'Descargar el acta para productores', url: ACTA_PRODUCTOR },
    rubros: ['alimentos', 'industria', 'textil', 'pesca'], temas: ['visibilidad', 'clientes'], verificado: V
  },
  {
    id: 'pl-comercios', fuente: 'pl', tipo: 'programa',
    titulo: 'Tu comercio puede mostrar que "Apoya a los productores locales"',
    resumen: 'Los comercios que venden productos marplatenses se adhieren gratis: identifican esos productos en góndola y online, y el Municipio los difunde como comercios que apoyan lo local.',
    cuerpo: ['Se completa el Acta Compromiso para establecimientos comerciales con la dirección y las sucursales, y se manda a productolocal@mardelplata.gob.ar. Los productores adheridos te entregan la lista de productos avalada por el Municipio y los elementos del sello para ubicarlos en el local y en tus canales online.',
      'Es voluntario y gratis; dura un año con renovación automática.'],
    datos: [['Costo', 'Gratis'], ['Cómo', 'Acta Compromiso para comercios por mail a productolocal@mardelplata.gob.ar'], ['Consultas', '499-7970 int. 4347 · Salta 1842, 5° piso']],
    url: PARTICIPA,
    accion: { txt: 'Descargar el acta para comercios', url: ACTA_COMERCIO },
    rubros: ['comercio', 'gastronomia', 'alimentos'], temas: ['visibilidad', 'clientes'], verificado: V
  },
  {
    id: 'pl-directorio', fuente: 'pl', tipo: 'directorio',
    titulo: 'Empresas con sello Producto Local: proveedores de la ciudad',
    resumen: 'El listado del sitio municipal, por categoría: alimentos, bebidas, maquinaria, química, textil y pesca. Útil para comprar cerca o sumar productos locales a tu góndola.',
    cuerpo: ['Algunos ejemplos del listado. Alimentos: Quesos Los Alemanes, Helados Capurro, Helados Augustus, Postres Balcarce, Galletitas Olitas, Tallarines Punta Mogotes, Granja La Piedra, Panacity. Bebidas: cervecerías Persa, Back, La Paloma, Gaukler y Cheverry. Maquinaria: Orengia y Conforti, Grupo Electrógenos del Atlántico. Química: Limpa, Duncan (Biokitol), Malthus. Textil: Tout, Sumatra, El Lanero del Sud, Tejidos Raquel, Patagonix, Oxala. Pesca: Marechiare Conservas, Luis Solimeno e Hijos.',
      'Ojo: la web municipal muestra 39 productores, mientras que el programa informa 310 empresas adheridas. Para el listado completo conviene consultar al programa.'],
    datos: [['Publicados en la web', '39 productores'], ['Adheridas según el Municipio', '310 empresas (septiembre 2026)'], ['Listado completo', 'productolocal@mardelplata.gob.ar']],
    url: ADHERIDAS,
    accion: { txt: 'Ver el listado', url: ADHERIDAS },
    rubros: ['gastronomia', 'comercio', 'alimentos', 'industria'], temas: ['clientes', 'red'], verificado: V
  },
  {
    id: 'pl-310-empresas', fuente: 'pl', tipo: 'dato',
    titulo: 'Producto Local llegó a 310 empresas y 13.372 productos',
    resumen: 'Se sumaron 11 firmas en el último período y 435 productos nuevos frente al año anterior. Las adhesiones crecieron 3,67% interanual.',
    cuerpo: ['Entre las novedades, la pesquera Marbella proyecta ampliarse al Parque Industrial. A mediados de 2025 el programa tenía 293 empresas y 12.343 productos.'],
    datos: [['Empresas adheridas', '310'], ['Productos con sello', '13.372'], ['Altas recientes', '11 empresas'], ['Productos nuevos en el año', '435']],
    serie: { titulo: 'Empresas adheridas (cifras de las gacetillas de cada momento)', unidad: '', puntos: [['jun 21', 43], ['ago 22', 135], ['sep 23', 205], ['jul 25', 293], ['nov 25', 300], ['sep 26', 310]] },
    url: 'https://www.elmarplatense.com/el-programa-producto-local-supero-los-13300-articulos-y-suma-310-empresas',
    via: 'El Marplatense',
    rubros: ['alimentos', 'industria', 'pesca', 'textil'], temas: ['datos', 'visibilidad'], publicado: '2026-09-23', verificado: V
  }
];
