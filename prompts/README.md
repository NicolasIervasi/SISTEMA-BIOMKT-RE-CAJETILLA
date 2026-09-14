# Sistema de prompts — páginas web

Convierte "quiero una página de X" en un **spec de build** completo (como el ejemplo del hero) que se ejecuta
sin adivinar. Toma como base la plantilla y se apoya en tus skills y en el MCP de GitHub.

## Flujo

1. **Copiar** `_plantilla-pagina-web.md` → `pagina-<slug>.md`.
2. **Completar** los `[corchetes]` (a mano o dictándomelo; yo lo cierro).
3. **Ejecutar** con la skill según el caso (tabla de abajo).
4. **Publicar** como Artifact y guardar el `.md` del prompt en `prompts/` como fuente de verdad.

## Qué skill usar para ejecutar el prompt

| Necesidad | Skill | Cuándo |
|---|---|---|
| Página HTML standalone (tu patrón actual) | **Artifact directo** | Landing/one-page para publicar ya, sin build. |
| Mockup visual que retocás a mano (arrastrando) | **`design`** | Explorar layout/estética antes de codear. |
| App React con estado, routing, shadcn/ui | **`web-artifacts-builder`** | Página con interacción real (formularios, tabs, filtros). |
| Gráficos / dashboards / métricas | **`dataviz`** | Cualquier chart dentro de la página. |
| Calibrar diseño antes de escribir | **`artifact-design`** | Se lee antes de cualquier artifact. |

## MCPs

- **GitHub (`mcp__github__*`):** versionar cada prompt y su página, abrir PRs, revisar. El `.md` del prompt vive
  en `prompts/`; la página publicada vive donde corresponda (o como Artifact). Pushear siempre a la rama asignada.

## Convenciones

- Un archivo por página: `prompts/pagina-<slug>.md`.
- Marca **Biomarketing por default** (violeta `#635BA7`); si es para un cliente, se sobrescribe la sección MARCA.
- El prompt es la **fuente de verdad**: si cambia la página, primero cambia el prompt.

## Archivos

- `_plantilla-pagina-web.md` — la plantilla maestra (esqueleto).
- `README.md` — este archivo.
