// Constantes de la app: fuentes, tipos de contenido, rubros e intereses.
// Los colores identifican cada fuente dentro de la app; no son ni imitan los logos de las instituciones.

export const APP = 'Red Empresas MDP';
export const STORE_KEY = 'redmdp.v1';
export const THEME_KEY = 'redmdp.theme';

export const FUENTES = {
  ucip: {
    id: 'ucip', corto: 'UCIP', color: 'var(--f-ucip)',
    nombre: 'Unión del Comercio, la Industria y la Producción',
    que: 'La entidad empresaria más grande de la ciudad: representa a comercios, industrias y cámaras sectoriales. Tiene centro de capacitación, asesoramiento en créditos y subsidios, informes del sector (DESE) y el Nodo UCIP.',
    web: 'https://www.ucip.org.ar/',
    novedades: 'https://www.ucip.org.ar/noticias/',
    redes: [['Instagram', 'https://www.instagram.com/ucipmdp/'], ['Facebook', 'https://www.facebook.com/UCIPmdp/'], ['X', 'https://twitter.com/ucipmdp']],
    contacto: 'Av. Luro 3030 · 223 499-7777',
    publica: 'Noticias varias veces por semana, cursos todo el año, informe de ventas mensual. Sin RSS; tiene newsletter por temas.'
  },
  aticma: {
    id: 'aticma', corto: 'ATICMA', color: 'var(--f-aticma)',
    nombre: 'Asociación de Tecnologías de la Información y la Comunicación de Mar del Plata',
    que: 'El clúster tecnológico de la ciudad (20 años en 2026). Conecta a empresas de cualquier rubro con proveedores de tecnología, organiza la Tech Week, los ATICMA Awards y el programa ATICMA Emprende.',
    web: 'https://www.aticma.org.ar/',
    novedades: 'https://www.aticma.org.ar/novedades/',
    redes: [['Instagram', 'https://www.instagram.com/aticmamdp/'], ['LinkedIn', 'https://www.linkedin.com/company/aticma'], ['Facebook', 'https://www.facebook.com/aticma']],
    contacto: 'Chaco 1670 · info@aticma.org.ar · 223 577-8704',
    publica: 'Novedades 1 a 3 veces por semana; eventos fuertes en noviembre (Tech Week). Sin RSS.'
  },
  pl: {
    id: 'pl', corto: 'Producto Local', color: 'var(--f-pl)',
    nombre: 'Programa Producto Local (Municipio de General Pueyrredon)',
    que: 'Sello municipal gratuito ("Producto Local – Trabajo Marplatense", Decreto 2032/20) que identifica lo fabricado en el partido. Se suman productores e industrias, y también comercios que venden esos productos.',
    web: 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-participa-programa',
    novedades: 'https://www.mardelplata.gob.ar/desarrollo-productivo/producto-local-empresas-adheridas',
    redes: [],
    contacto: 'Salta 1842, 5° piso · productolocal@mardelplata.gob.ar · 499-7970 int. 4347',
    publica: 'Pocas novedades al año (altas de empresas y cifras del programa), casi siempre por gacetilla a medios.'
  }
};
export const FUENTE_IDS = Object.keys(FUENTES);

// Orden = orden de los filtros
export const TIPOS = {
  evento: { label: 'Evento', plural: 'Eventos' },
  capacitacion: { label: 'Curso', plural: 'Cursos' },
  convocatoria: { label: 'Convocatoria', plural: 'Convocatorias' },
  beneficio: { label: 'Beneficio', plural: 'Beneficios' },
  servicio: { label: 'Servicio', plural: 'Servicios' },
  programa: { label: 'Programa', plural: 'Programas' },
  directorio: { label: 'Directorio', plural: 'Directorios' },
  novedad: { label: 'Novedad', plural: 'Novedades' },
  dato: { label: 'Dato del sector', plural: 'Datos del sector' }
};
export const TIPO_IDS = Object.keys(TIPOS);

export const RUBROS = {
  comercio: 'Comercio minorista',
  gastronomia: 'Gastronomía',
  alimentos: 'Alimentos y bebidas',
  industria: 'Industria / manufactura',
  pesca: 'Pesca',
  construccion: 'Construcción',
  tecnologia: 'Tecnología',
  turismo: 'Turismo y hotelería',
  textil: 'Textil e indumentaria',
  servicios: 'Servicios profesionales',
  salud: 'Salud',
  logistica: 'Logística y transporte',
  agro: 'Agro',
  otro: 'Otro'
};

export const TAMANOS = {
  uni: 'Unipersonal',
  micro: '1 a 5 personas',
  mini: '6 a 16 personas',
  pyme: '17 a 100 personas',
  grande: 'Más de 100 personas'
};

export const TEMAS = {
  capacitacion: 'Capacitación del equipo',
  clientes: 'Clientes nuevos y rondas de negocios',
  tecnologia: 'Tecnología e IA',
  financiamiento: 'Créditos y financiamiento',
  normativa: 'Impuestos y normativa',
  visibilidad: 'Visibilidad y marca local',
  datos: 'Datos del sector',
  red: 'Contactos y networking',
  empleo: 'Personal y recursos humanos',
  exportacion: 'Comercio exterior'
};

// Ventanas de tiempo
export const DIA = 864e5;
export const CIERRA_PRONTO_DIAS = 7;   // un plazo que vence en esta ventana se destaca arriba del feed
export const ESTA_SEMANA_DIAS = 7;
export const NUEVO_DIAS = 10;          // "Nuevo" en las piezas publicadas hace menos que esto
export const ARCHIVO_DIAS = 90;        // novedades y datos sin fechas propias pasan al archivo a los 3 meses
