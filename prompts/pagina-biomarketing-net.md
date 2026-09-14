# PROMPT — biomarketing.net (rediseño)

> Spec de build del sitio de Biomarketing, mejorado. Fuente de verdad: si cambia la página, primero cambia acá.
> Basado en el sitio actual (biomarketing.net) + mejoras marcadas con **[MEJORA]**. Los `[?]` son datos que
> faltan confirmar con el cliente (Nico).

---

## 0. META

- **Slug:** `pagina-biomarketing-net`
- **Objetivo:** que una PYME/marca de Mar del Plata (y alrededores) entienda en 10s qué hace Biomarketing y agende una reunión.
- **Público:** dueños de marcas/PYMES que quieren crecer con branding, web, audiovisual y estrategia.
- **Acción principal (UN CTA):** **Agendar reunión** → WhatsApp `wa.me/2236346417`. Todos los CTA llevan acá.
- **Tono:** humano, consciente, aspiracional. Nada frío. "acompañamos", "juntos", "marcas humanas".
- **Stack de salida:** `[? HTML standalone (Tailwind CDN)  ·  React 18 + Vite ]`  ← a definir
- **Skill de ejecución:** `[? Artifact directo · web-artifacts-builder ]`
- **Entrega:** Artifact + (opcional) deploy real.

---

## 1. MARCA / TOKENS

- **Violeta (acento/CTA/logo):** `#635BA7`  ·  **violeta claro:** `#8A84BF`
- **Texto:** `#231F20`  ·  **gris:** `#A7A9AC`  ·  **fondo:** `#FFFFFF`
- **[?]** Si querés empujar a un look más audiovisual/cine en el hero, disponible paleta oscura: fondo `#0F1114`.

---

## 2. FUENTE / TIPOGRAFÍA

- **Display:** `"Figtree", "Garet", "Helvetica Neue", Arial, sans-serif` (peso 700–800 en títulos).
- **Body:** misma familia, peso 400.
- **Tratamiento:** títulos de sección en **UPPERCASE + tracking amplio**; body en caja normal.
- **Escala títulos:** `clamp(2rem, 7vw, 5.5rem)`.

---

## 3. FONDO / ATMÓSFERA

- **Hero:** **[MEJORA]** fondo `[? video full-screen reel de trabajos · imagen · degradé violeta ]`.
  - Si video: `absolute inset-0 object-cover`, `muted loop autoplay playsinline`, overlay para legibilidad.
- **Resto del sitio:** fondo blanco, secciones separadas por aire (no líneas duras).

---

## 4. LAYOUT GLOBAL

- Contenedor `flex column`. Padding horizontal `px-5 sm:px-8 md:px-12`.
- **Orden de secciones:**
  `Nav · Hero · About · Servicios(4) · Portfolio · Proceso(3 pasos) · Stats · Clientes(logos) · Compromiso · Reflexiones · CTA final · Footer`
  - **[MEJORA]** Subí **Servicios** y **Stats** más arriba (hoy el mensaje de valor tarda en aparecer).

---

## 5. SECCIONES

### 1 — NAV
- Logo violeta (punto/círculo) izquierda.
- **[MEJORA]** Menú (hoy solo *Inicio/Contacto*): `Servicios · Trabajos · Proceso · Reflexiones · Contacto`. Oculto en mobile → hamburguesa abre overlay full-screen.
- CTA persistente derecha: **Agendar reunión**.

### 2 — HERO
- Titular: **"marketing, comunicación, publicidad."**
- Subtítulo: **"cada marca tiene una historia que merece ser contada."**
- Bajada: "acompañamos tu crecimiento con estrategias, comunicación y visión."
- CTA: **Agendar reunión**.

### 3 — ABOUT
- Titular: "cada marca tiene una historia que merece ser contada."
- Body: "Somos una agencia de comunicación y marketing consciente en Mar del Plata…" (texto completo del actual).
- CTA: Agendar reunión.

### 4 — SERVICIOS (4 cards)
| Servicio | Bajada | CTA |
|---|---|---|
| Branding de Marcas | Identidad de marca que siente, comunica y evoluciona. | Descubrí tu identidad |
| Desarrollo de Páginas Web | Espacios digitales vivos y funcionales. | Explorá tu nueva web |
| Contenido Audiovisual | Historias que conectan e inspiran. | Conectá con tu público |
| Posicionamiento Estratégico | Posicionamos marcas que impactan y trascienden. | Impulsá tu evolución |
- **[MEJORA]** unificar todos los CTA de servicio → **Agendar reunión** (mantener el copy como microtexto).

### 5 — PORTFOLIO / TRABAJOS
- Titular: "Algunos de nuestros trabajos". Subtítulo: "Fotografía · Edición · Spots Publicitarios".
- Grilla de 12 imágenes. **[MEJORA]** hover con nombre del proyecto/cliente.

### 6 — PROCESO (3 pasos)
- Titular: "Conectamos primero, creamos después."
1. **Primera reunión** — "Nos encontramos para conocer tu marca…"
2. **Asesoramiento personalizado** — "Analizamos tu situación actual…"
3. **Segunda reunión** — "Nos volvemos a encontrar…"

### 7 — STATS  ← **[MEJORA importante]**
- Titular: "Nuestros números hablan."
- **Hoy la sección existe pero NO tiene números.** Cargar 3 métricas reales (estilo +NNN, "+" en violeta):
  - `[? +NN ]` MARCAS ACOMPAÑADAS
  - `[? +NN ]` PROYECTOS AUDIOVISUALES
  - `[? +NN años ]` DE EXPERIENCIA
- Número negro, "+" violeta 0.5em, label uppercase tracking.

### 8 — CLIENTES (logos)
- Titular: "confiaron en nosotros". 13 logos en escala de grises, color al hover.

### 9 — COMPROMISO
- Titular: "comprometido con tus resultados". 5 imágenes de equipo/trabajo + párrafo de resultados.

### 10 — REFLEXIONES (blog)
- Titular: "Reflexiones". 4 posts con fecha y "Saber más".
- **[MEJORA]** revisar fechas (los actuales son de 2025) — mostrar solo los últimos o quitar fecha si no se actualiza.

### 11 — CTA FINAL
- Titular: "¿te gustaría empezar a vender más de manera digital?"
- CTA: **Agendar reunión / Contactanos**.
- **[MEJORA]** el modal "Diagnóstico Express" (pide email) → conectarlo a `[? destino del lead: email/CRM/Sheet ]`.

### 12 — FOOTER
- Catamarca 2978, Mar del Plata, Argentina · Tel 223-6346417 · info@biomarketing.net
- Redes: WhatsApp · Facebook · Instagram (@biomarketing.arg) · TikTok (@biomarketing_)
- © 2026 · Powered by Biomarketing.arg · botón scroll-to-top.

---

## 6. ANIMACIONES
- Hero: entrada al cargar (fadeDown nav, fadeUp titular/CTA, clip-reveal del titular grande).
- Resto: fadeUp al entrar en viewport (IntersectionObserver si es HTML), stagger `i*0.12s`.
- Respetar `prefers-reduced-motion`.

## 7. RESPONSIVE
- Mobile-first, `sm` 640 / `md` 768. Nav → hamburguesa + overlay. Grillas de servicios/portfolio 1 col → 2 → 4.

## 8. DEPENDENCIAS
- Según stack (sección 0). HTML: Tailwind CDN + fuentes. React: + framer-motion + lucide-react.

## 9. CHECKLIST DE ACEPTACIÓN
- [ ] Un solo destino de CTA (WhatsApp agendar).
- [ ] Stats con números reales cargados.
- [ ] Nav ampliada + overlay mobile.
- [ ] Datos de contacto y redes correctos.
- [ ] Sin scroll horizontal en ~400px.
- [ ] `prefers-reduced-motion` respetado.
