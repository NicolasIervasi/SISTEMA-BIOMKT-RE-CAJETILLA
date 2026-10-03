# SISTEMA BIOMKT — RE CAJETILLA

Repositorio de guiones y material audiovisual.

## Guiones

| # | Título | Formato | Archivo |
|---|--------|---------|---------|
| 1 | Post-entreno: el batido de proteína no es obligatorio | Reel · hablando a cámara | [texto](guiones/guion-01-post-entreno-batido-proteina.md) · [visual](guiones/guion-01-post-entreno-visual.html) |

## Calendario

- [`calendario/calendario-pau-nutri-sep-oct-2026.html`](calendario/calendario-pau-nutri-sep-oct-2026.html) — versión simple para Pau: las 14 piezas (09/09 → 21/10 2026) con día, formato, tema y qué falta de cada una. Sin métricas ni jerga interna — el análisis de la grilla (mezcla de formatos, cadencia, ejes) está en el historial de git.

## Procesos

- [`procesos/procesos-eventos-audiovisual.html`](procesos/procesos-eventos-audiovisual.html) — eventos y contenido audiovisual en el formato del PDF de servicios (Garet / violeta #635BA7). Fuente del PDF `Procesos-Eventos-y-Contenido-Audiovisual.pdf`.
- [`procesos/proceso-eventos.html`](procesos/proceso-eventos.html) — cómo se arma un evento, en ocho pasos: del cuestionario inicial al anuncio, con el lugar como paso bisagra.

## Apps

- [`logistica-guemes/index.html`](logistica-guemes/index.html) — planificador de reparto para Mar del Plata, zona Güemes. Solo acepta pedidos dentro de un radio de 11 cuadras (1 cuadra = 100 m → 1,1 km) alrededor de Güemes 2800; arma el recorrido más corto con horarios de llegada y lo manda por WhatsApp o Google Maps. Un solo HTML, sin build. Direcciones con Nominatim y tiempos por calles con OSRM, ambos públicos y gratuitos. Para que ande el buscador de direcciones hay que abrirla desde un hosting (Netlify, GitHub Pages) o con `python3 -m http.server`; si se abre con doble clic como archivo local el buscador puede ser rechazado (marcar el punto en el mapa funciona igual).

## Estructura

- `guiones/` — un archivo por guion, numerado (`guion-NN-slug.md`). Cada guion incluye formato, por qué funciona, el guion completo (gancho, desarrollo, CTA, cierre) e indicaciones de producción.
- `guiones/guion-NN-*-visual.html` — versión visual de rodaje del mismo guion: línea de tiempo, beats con timecode y encuadre, textos en pantalla, placas gráficas y guion corrido para teleprompter. Se publica como Artifact para compartir con el equipo de producción.
- `procesos/` — procesos internos del equipo, un archivo por proceso.
- `calendario/` — planificación por período. Cada posteo es un bloque `.fila` en el HTML: día, formato, tema y estado (`e-listo`, `e-falta`, `e-sin`).
- `logistica-guemes/` — app de reparto. El centro, el radio y las cuadras están en `DEFAULT_CENTER`, `radiusBlocks` y `BLOCK_M` al principio del script.
