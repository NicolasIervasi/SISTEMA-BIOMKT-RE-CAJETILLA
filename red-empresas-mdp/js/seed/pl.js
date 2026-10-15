// Producto Local (Municipio de General Pueyrredon). El sitio municipal no responde a consultas automáticas:
// los datos salen de las gacetillas publicadas por los medios locales (campo `via`).
const V = '2026-10-15';

export const PL = [
  {
    id: 'pl-programa', fuente: 'pl', tipo: 'programa',
    titulo: 'Sumá tus productos al sello Producto Local',
    resumen: 'El Municipio identifica lo que se fabrica en Mar del Plata, Batán y Sierra de los Padres con un sello y entrega piezas para vidriera y góndola.',
    cuerpo: ['Las empresas adheridas reciben material para mostrar el sello: vinilo para vidriera, cenefas y stoppers para los comercios que venden sus productos, y el logo para su sitio web. Los comercios que venden producción local lo muestran como "Apoya a los productores locales". El Municipio, además, difunde el programa y acompaña a las empresas adheridas.',
      'Participan alimentos y bebidas, indumentaria, maquinaria, pesca y química, entre otros. No hay requisitos formales ni costo publicados: conviene confirmarlos por teléfono antes de enviar datos.',
      'Lo lleva la Secretaría de Desarrollo Local, Inversiones e Integración Público-Privado, con la Dirección de Comercio e Industria.'],
    datos: [['Cómo sumarse', 'Web del Municipio, teléfono o en persona'], ['Teléfono', '499-7970, internos 4347 y 4376'], ['Oficina', 'Salta 1842, 5° piso'], ['Costo', 'No publicado']],
    lugar: 'Salta 1842, 5° piso, Mar del Plata',
    url: 'https://www.mardelplata.gob.ar/productolocal',
    accion: { txt: 'Ver cómo sumarme', url: 'https://www.mardelplata.gob.ar/productolocal' },
    rubros: ['alimentos', 'industria', 'textil', 'pesca', 'comercio'], temas: ['visibilidad', 'clientes'], verificado: V
  },
  {
    id: 'pl-directorio', fuente: 'pl', tipo: 'directorio',
    titulo: 'Empresas con sello Producto Local: buscá proveedores de la ciudad',
    resumen: 'El listado municipal de las 310 empresas adheridas, por rubro: alimentos y bebidas, indumentaria, maquinaria, pesca y química.',
    cuerpo: ['Sirve para comprar cerca: un restaurante que busca quesos o cerveza local, un comercio que quiere sumar productos marplatenses a la góndola o una empresa que necesita un proveedor industrial. El Municipio también publicó un mapa con la ubicación de cada empresa.'],
    url: 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-empresas-adheridas',
    accion: { txt: 'Ver empresas adheridas', url: 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-empresas-adheridas' },
    rubros: ['gastronomia', 'comercio', 'alimentos', 'industria', 'todos'], temas: ['clientes', 'red'], verificado: V
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
