# SISTEMA BIOMKT — RE CAJETILLA

Repositorio de guiones y material audiovisual.

## Guiones

| # | Título | Formato | Archivo |
|---|--------|---------|---------|
| 1 | Post-entreno: el batido de proteína no es obligatorio | Reel · hablando a cámara | [texto](guiones/guion-01-post-entreno-batido-proteina.md) · [visual](guiones/guion-01-post-entreno-visual.html) |

## Calendario

- [`calendario/calendario-pau-nutri-sep-oct-2026.html`](calendario/calendario-pau-nutri-sep-oct-2026.html) — versión simple para Pau: las 14 piezas (09/09 → 21/10 2026) con día, formato, tema y qué falta de cada una. Sin métricas ni jerga interna — el análisis de la grilla (mezcla de formatos, cadencia, ejes) está en el historial de git.

## Procesos

- [`procesos/proceso-eventos.html`](procesos/proceso-eventos.html) — cómo se arma un evento, paso a paso (reconstruido del audio de Ari), con el caso de Tandil noviembre y los puntos a confirmar.

## Estructura

- `guiones/` — un archivo por guion, numerado (`guion-NN-slug.md`). Cada guion incluye formato, por qué funciona, el guion completo (gancho, desarrollo, CTA, cierre) e indicaciones de producción.
- `guiones/guion-NN-*-visual.html` — versión visual de rodaje del mismo guion: línea de tiempo, beats con timecode y encuadre, textos en pantalla, placas gráficas y guion corrido para teleprompter. Se publica como Artifact para compartir con el equipo de producción.
- `procesos/` — procesos internos del equipo, un archivo por proceso.
- `calendario/` — planificación por período. Cada posteo es un bloque `.fila` en el HTML: día, formato, tema y estado (`e-listo`, `e-falta`, `e-sin`).
