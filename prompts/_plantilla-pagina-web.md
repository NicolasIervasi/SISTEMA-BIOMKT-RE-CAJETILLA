# PLANTILLA — PROMPT DE PÁGINA WEB

> **Qué es esto.** El esqueleto para escribir un *prompt-spec* de una página web completa, al nivel de detalle
> del ejemplo del hero (fondo, color, fuente, layout, sección por sección, animaciones, responsive, dependencias).
> No es una lista de deseos: es una **especificación de build** que otra IA (o vos con una skill) ejecuta sin adivinar.
>
> **Cómo se usa.**
> 1. Copiá este archivo a `prompts/pagina-<slug>.md`.
> 2. Completá los `[corchetes]` y borrá lo que no uses.
> 3. Pasáselo a Claude indicando la skill de ejecución (ver `prompts/README.md`).
>
> **Regla de oro:** cada valor concreto (px, hex, breakpoint, delay) que dejes escrito es una decisión que la IA
> **no** tiene que inventar. Cuanto más cerrás, más se parece el resultado a lo que tenés en la cabeza.

---

## 0. META

- **Nombre / slug:** `[pagina-...]`
- **Objetivo de la página (una frase):** [qué tiene que lograr]
- **Público / buyer persona:** [a quién le habla]
- **Acción principal (UN solo CTA):** [ej: "Agendar llamada"]
- **Tono:** [ej: audiovisual/cine · corporativo violeta · minimal editorial]
- **Referencias visuales:** [links o "como el hero de ejemplo"]
- **Stack de salida:** `HTML standalone (Tailwind CDN)` *(default)* · `React 18 + Vite`
- **Skill de ejecución:** `design` · `web-artifacts-builder` · `Artifact directo`
- **Entrega:** se publica como Artifact.

---

## 1. MARCA / TOKENS

> Default = Biomarketing. Si la página es para un cliente, **sobrescribí** esta sección con la marca del cliente.

**Paleta doc/corporativa (default):**
- Violeta `#635BA7` · violeta claro `#8A84BF` · texto `#231F20` · gris `#A7A9AC` · fondo `#FFFFFF`

**Paleta audiovisual/cine (alternativa):**
- Fondo `#0F1114` · superficies `#181B20`/`#22262C` · texto claro `#EAECEF` · acentos `#E27A41` / `#82B2D8`

- **Color de acento (logo, CTA, símbolos):** `[#635BA7]`
- **Color de todo el body text:** `[#231F20]`

---

## 2. FUENTE / TIPOGRAFÍA

- **Familia display:** `[ "Figtree", "Garet", "Helvetica Neue", Arial, sans-serif ]`
- **Familia body:** `[ igual que display | otra ]`
- **Tratamiento:** `[ UPPERCASE + tracking-widest | mixed case ]`
- **Pesos:** `[ 400 body / 700–800 títulos ]`
- **Escala fluida títulos:** `[ clamp(2rem, 9vw, 9rem) ]`

---

## 3. FONDO / ATMÓSFERA

- **Tipo:** `[ video full-screen | imagen | color plano | degradé | patrón ]`
- **Si video/imagen:** URL `[...]`, `position:absolute; inset-0; object-cover`, `muted loop autoplay playsinline`.
- **Overlay:** `[ ninguno | negro 30% | degradé para legibilidad ]`

---

## 4. LAYOUT GLOBAL

- **Contenedor raíz:** `[ flex column, min-h-screen ]`
- **Padding horizontal responsive:** `[ px-5 sm:px-8 md:px-12 ]`
- **Orden de secciones (arriba → abajo):** `[ Nav · Hero · ... · Footer ]`

---

## 5. SECCIONES  *(repetí este bloque por cada sección de la página)*

### Sección N — `[NOMBRE]`
- **Rol:** [qué hace en el recorrido del usuario]
- **Estructura:** `[ flex row/col, alineación, justify, gap ]`
- **Contenido exacto:** [textos literales, en su idioma, con saltos de línea marcados]
- **Sub-elementos** (uno por bullet, con medidas): `[ ej: logo 32px, borde 2px acento, punto 10px ]`
- **Tipografía del bloque:** `[ tamaño, peso, tracking, color ]`
- **Estado responsive:** `[ qué se oculta/reordena en mobile ]`
- **Animación de entrada:** `[ variante + delay + duración, ver sección 6 ]`

> **Catálogo de secciones típicas** (elegí y ordená): `Nav` · `Hero` · `Prueba social / stats` ·
> `Servicios / features` · `Proceso (pasos)` · `Portfolio / casos` · `Testimonios` · `FAQ` ·
> `CTA final` · `Footer` · `Menú mobile overlay`.

---

## 6. ANIMACIONES

> Si stack = HTML standalone, traducir Framer Motion a CSS/JS equivalente (IntersectionObserver + transitions).

- **Variante A — `fadeDown`:** de `{opacity:0, y:-20}` a `{opacity:1, y:0}` · stagger `i*0.1s` · dur `0.5s` · ease `[0.22,1,0.36,1]`.
- **Variante B — `fadeUp`:** de `{opacity:0, y:32}` a `{opacity:1, y:0}` · stagger `i*0.12s` · dur `0.6s`.
- **Reveal de títulos (clip):** cada palabra en wrapper `overflow-hidden`, sube de `y:110%` a `0` · delay `0.4 + i*0.14`.
- **Disparo:** `[ al cargar (hero) | al entrar en viewport (resto) ]`.

---

## 7. RESPONSIVE

- **Enfoque:** mobile-first, 3 tiers: default · `sm:` (640) · `md:` (768).
- **Qué cambia por tier:** `[ nav links ocultos en mobile → visibles md+ · font sizes · anchos · gaps ]`
- **Menú mobile:** `[ overlay full-screen z-50, hamburguesa abre / X cierra ]`

---

## 8. DEPENDENCIAS

- **HTML standalone:** Tailwind CDN · (opcional) Lucide via CDN · fuentes Google/self-host.
- **React:** React 18 · Tailwind 3 · framer-motion · lucide-react.

---

## 9. CHECKLIST DE ACEPTACIÓN

- [ ] Un solo CTA, repetido, siempre a la misma acción.
- [ ] Marca correcta (tokens de la sección 1) en todos los elementos.
- [ ] Legible en mobile (~400px) sin scroll horizontal.
- [ ] Todas las secciones del orden (sección 4) presentes.
- [ ] Animaciones respetan `prefers-reduced-motion`.
- [ ] Publicado como Artifact y link entregado.
