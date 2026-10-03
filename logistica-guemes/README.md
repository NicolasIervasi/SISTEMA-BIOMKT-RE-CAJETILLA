# Cuadra — reparto en 11 cuadras

Despacho de reparto para Mar del Plata, zona Güemes: pedidos dentro de un radio de 11 cuadras (1 cuadra = 100 m → 1,1 km) alrededor de Güemes 2800, rutas óptimas por repartidor, modo repartidor para el celular y métricas. Sin build ni backend: HTML + módulos ES + Leaflet.

## Qué hace

- **Despacho**: carga de pedidos por dirección (geocodificada y validada contra el radio), marcando el punto en el mapa o pegando una lista desde una planilla. Estados `nuevo → asignado → en camino → entregado / no entregado` con historial.
- **Reparto automático entre la flota**: reparte los pedidos entre los repartidores libres en turno (barrido angular alrededor del local + refinamiento) y ordena cada ruta con tiempos reales por calles, respetando manos únicas (OSRM). Hasta 8 paradas por repartidor el orden es exacto.
- **Tarifas por anillo**: tres zonas de envío según la distancia (con 11 cuadras: hasta 3, 4–7 y 8–11), configurables. Total a cobrar en efectivo por pedido.
- **Modo repartidor** (celular): próxima parada grande, navegación a Google Maps o Waze, llamar, avisar por WhatsApp, entregado / no entregado con motivo, GPS opcional, resumen final con el efectivo a rendir.
- **Link de ruta**: la ruta viaja dentro de la URL (`#/r/...`, ~550 caracteres para 4 paradas), así llega al celular del repartidor por WhatsApp sin servidor ni instalación.
- **Métricas**: entregas, tasa de éxito, tiempo medio, ingresos por envío, ticket promedio, efectivo a rendir, pedidos por hora, entregas por distancia y rendimiento por repartidor, con variación contra el período anterior y vista de tabla de cada gráfico.
- **Datos**: exportar pedidos a CSV, respaldo y restauración en JSON, datos de ejemplo con 14 días de historia y direcciones reales de la zona.
- **App instalable y offline**: manifest + service worker (la app abre sin conexión con la última versión vista). Tema claro/oscuro.

## Cómo correrla

Los módulos ES no cargan desde `file://`, y OpenStreetMap exige que el navegador envíe el origen de la página. Hay que servirla:

```bash
python3 -m http.server 8080        # desde la raíz del repo
# abrir http://localhost:8080/logistica-guemes/
```

o publicarla tal cual en Netlify / GitHub Pages (es una carpeta estática).

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
js/metrics.js         cálculo de métricas (puro)
js/charts.js          gráficos en HTML/CSS
js/map.js             mapa Leaflet
js/views/             despacho, modo repartidor, métricas, ajustes, diálogos
sw.js, manifest.webmanifest, icon.svg
tests/unit.test.mjs   tests del núcleo
```

Para cambiar el local o las tarifas por defecto: `DEFAULT_CENTER` y `DEFAULT_FEES` en `js/config.js`, y el radio inicial en `freshState()` de `js/store.js`. Con la app andando, todo se cambia desde Ajustes.

## Tests

```bash
node --test logistica-guemes/tests/unit.test.mjs
```

Cubre teléfonos para WhatsApp, anillos de tarifa, solver (exacto vs. heurística), reparto entre repartidores, ciclo de vida de pedidos, horarios, métricas, link de ruta y respaldo.

## Límites actuales

- **No hay backend**: los datos viven en el navegador del despacho (90 días). El repartidor trabaja sobre su copia de la ruta y lo que marca queda en su celular; el despacho no se entera en tiempo real. Es la pieza que falta para pasar de demo a producción (por ejemplo Supabase: pedidos, flota, estado en tiempo real y login).
- Dirección, mapa y rutas salen de servicios públicos y gratuitos (Nominatim, OpenStreetMap, OSRM demo), con límites de uso. Para operación comercial intensa hay que usar proveedores propios o pagos.
- Los horarios usan la velocidad de auto de OSRM escalada por vehículo (moto 0,85×, bici 1,6×, a pie 3,2×): son estimaciones.
