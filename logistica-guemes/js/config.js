// Constantes de la app. El centro, las cuadras y las tarifas por defecto viven acá.
export const BRAND = 'Cuadra';
export const TAGLINE = 'Reparto en 11 cuadras, bajo control';

export const STORE_KEY = 'cuadra.v2';
export const COURIER_KEY = 'cuadra.courier.v1';
export const THEME_KEY = 'cuadra.theme';

export const BLOCK_M = 100;            // una cuadra en Mar del Plata
export const MAX_PLAN = 60;            // pedidos que se reparten por corrida
export const DEFAULT_CENTER = { lat: -38.0148, lng: -57.54085, label: 'Güemes 2800' };
export const DEFAULT_FEES = [1500, 2200, 3000];   // $ por anillo: cerca, medio, lejos

export const OSRM = 'https://router.project-osrm.org';
export const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const FALLBACK_SPEED = 18 / 3.6;   // m/s para estimar sin conexión
export const FALLBACK_DETOUR = 1.3;       // la calle recorre más que la línea recta

// factor sobre el tiempo de auto que da OSRM
export const VEHICLES = {
  moto: { label: 'Moto', factor: 0.85, mode: 'driving' },
  auto: { label: 'Auto', factor: 1, mode: 'driving' },
  bici: { label: 'Bici', factor: 1.6, mode: 'bicycling' },
  pie: { label: 'A pie', factor: 3.2, mode: 'walking' }
};

// Colores de repartidor: paleta categórica validada (orden fijo, nunca rotado). Se ven sobre el mapa claro y en las tablas.
export const COURIER_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

export const STATUS = {
  nuevo: { label: 'Nuevo' },
  asignado: { label: 'Asignado' },
  en_camino: { label: 'En camino' },
  entregado: { label: 'Entregado' },
  fallido: { label: 'No entregado' }
};
export const OPEN_STATUSES = ['nuevo', 'asignado', 'en_camino'];
export const FAIL_REASONS = ['No estaba', 'Dirección incorrecta', 'No respondió', 'Rechazó el pedido', 'Otro'];
export const PAYMENTS = { efectivo: 'Cobrar en efectivo', pagado: 'Ya pagado' };
