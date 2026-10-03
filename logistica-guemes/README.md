# Cuadra — reparto en 11 cuadras

Despacho de reparto para Mar del Plata, zona Güemes: pedidos dentro de un radio de 11 cuadras (1 cuadra = 100 m → 1,1 km) alrededor de Güemes 2800, rutas óptimas por repartidor, modo repartidor para el celular, métricas y seguimiento GPS en vivo (opcional). La app es HTML + módulos ES + Leaflet, sin build; el seguimiento usa una función de Netlify con Blobs.

**En vivo:** https://cuadra-guemes.netlify.app (Netlify). Se publica solo la app y el servidor del seguimiento (`scripts/stage.mjs` arma esa carpeta; sin tests ni README); `_headers` fija el tipo del manifest, el caché del service worker y encabezados de seguridad básicos.

## Qué hace

- **Despacho**: carga de pedidos por dirección (geocodificada y validada contra el radio), marcando el punto en el mapa o pegando una lista desde una planilla. Estados `nuevo → asignado → en camino → entregado / no entregado` con historial.
- **Reparto automático entre la flota**: reparte los pedidos entre los repartidores libres en turno (barrido angular alrededor del local + refinamiento) y ordena cada ruta con tiempos reales por calles, respetando manos únicas (OSRM). Hasta 8 paradas por repartidor el orden es exacto.
- **Tarifas por anillo**: tres zonas de envío según la distancia (con 11 cuadras: hasta 3, 4–7 y 8–11), configurables. Total a cobrar en efectivo por pedido.
- **Modo repartidor** (celular): próxima parada grande, navegación a Google Maps o Waze, llamar, avisar por WhatsApp, entregado / no entregado con motivo, GPS opcional, resumen final con el efectivo a rendir.
- **Link de ruta**: la ruta viaja dentro de la URL (`#/r/...`, ~550 caracteres para 4 paradas), así llega al celular del repartidor por WhatsApp sin servidor ni instalación.
- **Seguimiento GPS en vivo** (opcional): el repartidor acepta compartir su ubicación desde su celular y el despacho lo ve en el mapa con su recorrido real (estela punteada), "en vivo hace 8 s", km recorridos y un botón para seguirlo. Detalle en [Seguimiento en vivo](#seguimiento-en-vivo).
- **Métricas**: entregas, tasa de éxito, tiempo medio, ingresos por envío, ticket promedio, efectivo a rendir, pedidos por hora, entregas por distancia y rendimiento por repartidor, con variación contra el período anterior y vista de tabla de cada gráfico.
- **Datos**: exportar pedidos a CSV, respaldo y restauración en JSON, datos de ejemplo con 14 días de historia y direcciones reales de la zona.
- **App instalable y offline**: manifest + service worker (la app abre sin conexión con la última versión vista). Tema claro/oscuro.

## Cómo correrla

Los módulos ES no cargan desde `file://`, y OpenStreetMap exige que el navegador envíe el origen de la página. Hay que servirla:

```bash
python3 -m http.server 8080        # desde la raíz del repo
# abrir http://localhost:8080/logistica-guemes/
```

o publicarla tal cual en Netlify / GitHub Pages (es una carpeta estática; en Netlify, `_headers` ya viene incluido).

## Seguimiento en vivo

Tres piezas: el celular del repartidor transmite (`js/live.js`, `js/views/courier.js`), el despacho consulta y dibuja (`js/live.js`, `js/views/dispatch.js`, `js/map.js`) y una función de Netlify guarda las posiciones en Netlify Blobs (`netlify/functions/track.mts` → `netlify/lib/track-core.mjs`).

**Cómo se usa.** Ajustes → Seguimiento en vivo → código de activación (ver abajo) → Activar. Después, "Enviar ruta" genera el link con la clave de ese repartidor. Al abrirlo, el repartidor ve el pedido de permiso con el nombre del local y decide si comparte; puede dejar de compartir o borrar lo enviado cuando quiera.

**Privacidad.** El repartidor acepta explícitamente (por despacho) y se ve un indicador mientras comparte. Se corta solo a las 12 horas o al terminar la ruta. Lo enviado se guarda hasta 48 horas y una función programada lo borra cada hora; el despacho puede borrar todo, y cada repartidor lo suyo. El respaldo JSON no incluye claves. Si el navegador del despacho pierde sus claves, los datos igual se borran solos.

**Limitaciones reales.** Mientras la pantalla del repartidor esté bloqueada o abra Maps/Waze, el navegador deja de entregar posiciones (la app avisa al despacho "en segundo plano"). No es una app nativa: para seguimiento con la pantalla apagada hace falta una app instalada. Un celular por repartidor. Los km son una estimación con filtro de ruido.

**Costo en Netlify (plan Free).** El plan es por créditos (300/mes) y, si se agotan, **se pausan todos los sitios de la cuenta**. Por eso: el celular manda cada 20 s y el despacho consulta cada 12 s si hay alguien en línea (45 s si no, 60 s con la pestaña oculta); las claves son HMAC y una clave falsa se rechaza sin tocar Blobs; la función tiene límite por IP de la plataforma; cada despliegue a producción cuesta 15 créditos. Medí el consumo real en Netlify → Billing → Usage después del primer día con repartidores y proyectá el mes antes de sumar más gente.

**Puesta en marcha del servidor.** Variables de entorno de la función (Netlify → Site configuration → Environment variables, alcance *Functions*; un cambio exige un nuevo despliegue):

| Variable | Qué es |
|---|---|
| `TRACK_SETUP_CODE` | Código que teclea el dueño en Ajustes para obtener las claves. Largo y aleatorio (≥ 16 caracteres). |
| `TRACK_SECRET` | Secreto al azar (≥ 32 caracteres, `openssl rand -base64 48`), nunca se teclea. De él salen todas las claves: cambiarlo las corta de golpe. Tiene que ser distinto del código. |
| `TRACK_PAUSED` | `1` corta todo el seguimiento sin tocar el almacenamiento (palanca de emergencia). |

```bash
node scripts/stage.mjs ../stage        # arma la carpeta publicable: site/ (público), netlify/functions, package.json
# desplegar esa carpeta y después:
node scripts/smoke.mjs https://tu-sitio.netlify.app <TRACK_SETUP_CODE>     # prueba de humo contra Blobs real
```

`POST /api/track/health` informa la versión y cuándo corrió la última limpieza (`gcAt`; si pasaron más de 2 h, la función programada no está corriendo).

## Estructura

```
index.html            shell, íconos (sprite SVG) y carga de Leaflet con SRI
css/app.css           tokens de diseño (claro/oscuro) y todas las pantallas
js/config.js          constantes: centro, cuadra, tarifas, vehículos, colores
js/store.js           estado, persistencia (localStorage) y reglas de consistencia
js/solver.js          orden de paradas y reparto entre repartidores (puro)
js/plan.js            horarios de llegada
js/geo.js             Nominatim (en cola, 1 consulta/s) y OSRM
js/dispatch.js        orquesta el reparto: matriz → grupos → rutas
js/share.js           link de ruta (JSON comprimido en base64url)
js/live.js            seguimiento en vivo (cliente): transmisión del celular y consulta del despacho
js/track-math.js      filtros y km del track GPS (puro; lo usan cliente y pruebas)
js/metrics.js         cálculo de métricas (puro)
js/charts.js          gráficos en HTML/CSS
js/map.js             mapa Leaflet
js/views/             despacho, modo repartidor, métricas, ajustes, diálogos
sw.js, manifest.webmanifest, icon.svg, _headers
netlify/functions/    track.mts (API /api/track/*), track-gc.mts (limpieza horaria)
netlify/lib/          track-core.mjs (lógica sin red), track-http.mjs, stores.mjs (Blobs y memoria)
scripts/              stage.mjs (carpeta publicable), smoke.mjs (prueba de humo del sitio)
tests/                unit, live (cliente), track-core, track-http, blob-store
```

Para cambiar el local o las tarifas por defecto: `DEFAULT_CENTER` y `DEFAULT_FEES` en `js/config.js`, y el radio inicial en `freshState()` de `js/store.js`. Con la app andando, todo se cambia desde Ajustes.

## Tests

```bash
npm ci                                   # una vez, dentro de logistica-guemes/
node --test tests/*.test.mjs
```

Cubre teléfonos para WhatsApp, anillos de tarifa, solver (exacto vs. heurística), reparto entre repartidores, ciclo de vida de pedidos, horarios, métricas, link de ruta y respaldo, y del seguimiento: filtros del track, cliente (cola sin conexión, esperas, consentimiento, claves), servidor (credenciales, límites, concurrencia, borrado, limpieza) y la capa HTTP.

## Límites actuales

- **Pedidos sin backend**: los pedidos y la flota viven en el navegador del despacho (90 días). El repartidor trabaja sobre su copia de la ruta y lo que marca (entregado, no entregado) queda en su celular: el despacho solo ve su ubicación si activó el seguimiento, no el estado de cada entrega. Pasar a producción real pide un backend de pedidos (por ejemplo Supabase: pedidos, flota, estado en tiempo real y login).
- Dirección, mapa y rutas salen de servicios públicos y gratuitos (Nominatim, OpenStreetMap, OSRM demo), con límites de uso. Para operación comercial intensa hay que usar proveedores propios o pagos.
- Los horarios usan la velocidad de auto de OSRM escalada por vehículo (moto 0,85×, bici 1,6×, a pie 3,2×): son estimaciones.
