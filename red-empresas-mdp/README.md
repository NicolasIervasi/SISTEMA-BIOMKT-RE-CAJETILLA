# Red Empresas MDP: piloto

Reúne en una sola app lo que publican UCIP, ATICMA y el programa municipal Producto Local (cursos, rondas de negocios, convocatorias, beneficios y datos del sector) y lo ordena para cada empresa según su rubro y sus intereses. Cada cámara recibe un informe de alcance que muestra qué contenido le sirvió a las empresas. Es la base técnica de la **fase 2** del plan ("Plan de acción – Red Empresas MDP", octubre 2026), **sin la capa ODS**.

La app es HTML + módulos ES, sin build ni librerías. El servidor son dos funciones de Netlify con Netlify Blobs, con el mismo esquema que [Cuadra](../logistica-guemes/).

## Qué hace

**Para la empresa** (celular primero, instalable desde Safari con *Compartir → Agregar a inicio*):
- **Bienvenida**: rubro, tamaño, intereses y fuentes a seguir. El nombre es opcional y no sale del celular.
- **Inicio**: un bloque "Cierra pronto" con los plazos que vencen en 7 días y un feed ordenado por relevancia (rubro, intereses, urgencia y novedad), con filtros por tipo y búsqueda sin tildes. Ordenar no esconde nada: se ve todo lo que publican las fuentes seguidas. Lo que ya pasó queda aparte.
- **Detalle**: datos clave, botón de inscripción, link al original y una nota de verificación.
  - **Agendar**: archivo .ics para el calendario del iPhone u Outlook (los cursos entran con sus clases semanales y aviso 2 h antes) o Google Calendar. En convocatorias también se puede agendar el recordatorio del cierre.
  - **Compartir**: por WhatsApp o copiando el link.
  - **Gráfico** en los datos del sector.
- **Agenda**: lo guardado, agrupado en *próximos 7 días*, *más adelante*, *sin fecha* y *ya pasaron*. Un contador en la barra marca lo que viene esta semana.
- **Fuentes**: qué es cada institución, cómo contactarla, qué publica y con qué frecuencia. Ahí se sigue o se deja de seguir cada una.
- **Perfil**: cambiar datos, desactivar el uso anónimo o borrar todo, también del servidor.

**Para quien administra** (`#/admin`):
- **Contenido**:
  - Editor con vista previa de la tarjeta.
  - Borrador local, para publicar cuando está listo.
  - Duplicar, borrar, exportar e importar en JSON.
  - Control de versiones: si se publica desde dos dispositivos, el segundo recibe un aviso y no pisa lo publicado.
- **Estadísticas**:
  - Empresas registradas y activas, y las que volvieron 2 o más días en la semana (la compuerta del piloto es 60%).
  - Empresas activas por día.
  - Números por fuente: seguidores, alcance, vistas, guardados, clics y agendados.
  - Piezas con más alcance y empresas por rubro y por tamaño.
- **Informe por fuente**: una página para imprimir o guardar en PDF con lo que el contenido de esa cámara movió en 30 días. Es el gancho del plan para que las fuentes se sumen.

## Contenido inicial (relevado el 15/10/2026)

`js/seed.js` trae 16 piezas reales. Están resumidas con palabras propias, tienen link al original y la fecha de verificación. El servidor arranca vacío: hasta la primera publicación desde el panel, las empresas ven este contenido.

| Fuente | Qué se relevó | De dónde |
|---|---|---|
| UCIP | Cursos de octubre: Excel con IA (16/10), carnet de manipulación de alimentos (21 y 28/10), IA aplicada (22/10) y finanzas (27/10). Ley 27.826, ventas de septiembre (−7,9%, DESE), Nodo UCIP y cuotas de socio. | [ucip.org.ar/noticias](https://www.ucip.org.ar/noticias/), [cursos](https://www.ucip.org.ar/servicios/capacitacion/cursos-presenciales/), [asociarse](https://www.ucip.org.ar/sociosucip/como-asociarse/), [Infobrisas](https://www.infobrisas.com/noticias/2026/08/31/106226-la-ucip-inauguro-un-nuevo-nodo-para-empresas-en-mar-del-plata-que-servicios-ofrecera) |
| ATICMA | B2B Demandas Tecnológicas (10/11, gratis, con formulario), ATICMA Awards (postulaciones hasta el 2/11), Tech Week (5 al 13/11), convenio con la UAA, convenio con el Centro de Constructores y ATICMA Emprende. | [aticma.org.ar/novedades](https://www.aticma.org.ar/novedades/), [awards.aticma.org.ar](https://awards.aticma.org.ar/) |
| Producto Local | Cómo sumarse al sello y qué se recibe; 310 empresas y 13.372 productos (septiembre 2026). | [El Marplatense](https://www.elmarplatense.com/el-programa-producto-local-supero-los-13300-articulos-y-suma-310-empresas), [La Capital](https://www.lacapitalmdp.com/temas/producto-local/), [mardelplata.gob.ar/productolocal](https://www.mardelplata.gob.ar/productolocal) |

Lo que no se pudo confirmar quedó dicho en la pieza: costos de los cursos y del Nodo UCIP (no publicados), requisitos formales de Producto Local y email del programa (el sitio municipal rechaza las consultas automáticas).

Ninguna de las tres fuentes publica RSS. UCIP tiene un newsletter por temas. Por eso la carga es manual desde el panel, como propone el plan: no se extrae nada de redes sociales.

## Cómo probarla

```bash
# Solo la app (modo local: el contenido y las estadísticas viven en el navegador)
python3 -m http.server 8080          # desde esta carpeta → http://localhost:8080

# App + API completa, con almacenamiento en memoria (mismo código que en Netlify)
node scripts/dev.mjs                 # → http://localhost:8888, código del panel: codigo-local-1234
```

En modo local, el panel publica en ese navegador y puede **cargar datos de ejemplo** (34 empresas inventadas, marcadas como tales) para ver las estadísticas y el informe llenos.

## Publicar en Netlify

```bash
npm ci
node scripts/stage.mjs ../stage-redmdp    # carpeta publicable: site/ (público), funciones y package.json; sin tests ni README
# desplegar esa carpeta (netlify deploy --dir … o arrastrándola) y configurar:
```

| Variable (alcance *Functions*) | Qué es |
|---|---|
| `ADMIN_CODE` | Código del panel, de 12 caracteres o más. Es lo que se tipea en `#/admin`. |
| `ADMIN_SECRET` | Secreto al azar de 32 caracteres o más (`openssl rand -base64 48`). Nunca se tipea y tiene que ser distinto del código. Cambiarlo cierra todas las sesiones del panel. |
| `PAUSADO` | `1` deja de guardar eventos (palanca de emergencia de costos). El contenido se sigue sirviendo. |

Un cambio de variables exige volver a desplegar. `GET /api/salud` dice si el panel quedó configurado.

**Costos (plan Free por créditos).** Si se agotan los créditos, se pausan **todos** los sitios de la cuenta, Cuadra incluida. Por eso:
- El contenido se cachea un minuto en la CDN, así que abrir la app casi nunca invoca la función.
- Los eventos viajan en lotes (cada 20 s o al cerrar la app).
- Hay límite por IP.

Después del primer día del piloto, medí el consumo en *Billing → Usage* antes de sumar empresas.

## Cómo se guarda

- **Contenido**: un documento que solo escribe el panel, con control de versión.
- **Perfil anónimo**: uno por empresa, con rubro, tamaño, intereses y fuentes. Sin nombre ni contacto.
- **Eventos**: un archivo por envío, que nunca actualiza un documento compartido (la lección de Cuadra con Blobs). Cada noche la función `compactar` junta los de cada día y borra lo que tiene más de 400 días.
- **Tipos de evento**: `abrir` (una vez por día), `ver` (una vez por pieza y por día), `guardar`, `quitar`, `ir` (inscripción u original), `agendar` y `compartir`.

## Legal y privacidad (a revisar con el abogado, sección 5.3 del plan)

- La app dice en Fuentes, en cada detalle y en los informes que es una plataforma independiente, no afiliada a UCIP, ATICMA ni al Municipio. No usa logos: cada fuente se identifica con un color propio.
- Los textos son resúmenes propios, con la fuente citada y el link al original. No se copian notas ni fotos.
- Datos personales (Ley 25.326): no se piden nombre, email ni teléfono. El uso anónimo viene activado y se explica en la bienvenida; se puede desactivar y borrar desde Perfil. El abogado tiene que validar el texto, la política de privacidad (las tiendas la exigen) y si corresponde inscribir la base ante la AAIP.

## Estructura

```
index.html, css/app.css         shell, iconos y estilos (claro/oscuro, celular primero)
js/config.js                    fuentes, tipos, rubros, tamaños, temas
js/seed.js                      contenido inicial relevado
js/content.js                   estado de cada pieza, relevancia, feed, agenda (puro)
js/ics.js                       .ics y Google Calendar (puro)
js/stats.js                     estadísticas e informe (puro)
js/fmt.js                       fechas en hora de Mar del Plata
js/store.js, js/api.js          estado local, conexión con la API y modo local
js/demo.js                      datos de uso inventados para ver el panel lleno
js/views/                       inicio, detalle, agenda, fuentes, perfil, panel
netlify/functions/              api.mts (/api/*), compactar.mts (diaria)
netlify/lib/                    core.mjs (lógica sin red), http.mjs, stores.mjs, open-store.mjs
scripts/                        dev.mjs (servidor local), stage.mjs (carpeta publicable)
tests/                          unit (cliente) y server (núcleo y HTTP)
```

## Tests

```bash
npm ci && node --test tests/*.test.mjs
```

Cubren:
- Fechas en hora de Mar del Plata.
- Clases semanales de los cursos contra las fechas publicadas por UCIP.
- Estados ("cierra en 5 días", "inscripción cerrada", "van 3 de 6 clases").
- Feed y agenda.
- .ics: repetición, alarma, día completo y líneas plegadas.
- Estadísticas.
- Saneado del estado local.
- Servidor: login, publicación con validación y conflicto, eventos, pausa, compactación, retención y capa HTTP.
- Que el contenido inicial pase la validación del servidor.
- Que las listas del cliente y del servidor coincidan.

## Límites y próximos pasos

- **No es una app nativa.** Los avisos push y la publicación en las tiendas son la fase 4 del plan (Expo/React Native). La API y los datos de esta versión sirven igual.
- **No hay login de empresas.** Cada celular es una empresa anónima: si borra los datos del navegador, empieza de cero.
- **La carga es manual.** En una semana de prueba conviene medir cuánto lleva mantenerla al día, como pide el plan en 5.1.
- **El resumen y la etiqueta automáticos con la API de Claude** (plan, 6.1) quedan para la siguiente iteración, siempre con revisión humana.
