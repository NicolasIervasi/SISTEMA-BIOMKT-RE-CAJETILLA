# Red Empresas MDP: piloto

Reúne en una sola app lo que publican UCIP, ATICMA y el programa municipal Producto Local (cursos, rondas de negocios, convocatorias, beneficios y datos del sector) y lo ordena para cada empresa según su rubro y sus intereses. Cada cámara recibe un informe de alcance que muestra qué contenido le sirvió a las empresas. Es la base técnica de la **fase 2** del plan ("Plan de acción – Red Empresas MDP", octubre 2026), **sin la capa ODS**.

La app es HTML + módulos ES, sin build ni librerías. El servidor son dos funciones de Netlify con Netlify Blobs, con el mismo esquema que [Cuadra](../logistica-guemes/).

## Qué hace

**Para la empresa** (celular primero, instalable desde Safari con *Compartir → Agregar a inicio*):
- **Bienvenida**: rubro, tamaño, intereses y fuentes a seguir. El nombre es opcional y no sale del celular.
- **Inicio**: lo que tiene fecha y lo que le sirve a la empresa.
  - "Cierra pronto": los plazos que vencen en 7 días.
  - "Próximas fechas": inicios de cursos, eventos y cierres de las próximas seis semanas, agrupados en esta semana, la que viene y más adelante.
  - "Para tu rubro": servicios, beneficios, programas y directorios que coinciden con el rubro o los intereses.
  - Las últimas novedades y un acceso a cada categoría con su cantidad.
- **Explorar**: todo el contenido separado en seis categorías, cada una ordenada como se lee mejor.
  - **Cursos:** empiezan pronto (por fecha), ciclo 2027, en curso (el que termina antes, primero) y ya terminaron.
  - **Eventos y convocatorias:** próximos y pasados.
  - **Beneficios y servicios, Programas y Directorios:** por fuente, primero lo que más le sirve al rubro.
  - **Novedades y datos:** últimos 3 meses y archivo.
  - Filtro por fuente y buscador.
- **Búsqueda**: entiende plurales, tildes y sinónimos de cómo busca una pyme ("créditos", "buscar personal", "ronda de negocios", "proveedores"). Las palabras cortas se buscan enteras ("ia" no coincide con "industria") y lo genérico se ignora ("para mi empresa"). Separa las coincidencias principales de lo que solo lo menciona en el detalle (por ejemplo, "socios" en las promociones de cada curso) y de lo que ya pasó.
- **Detalle**: datos clave, botón de inscripción, link al original, una nota de verificación y "También te puede servir" con piezas relacionadas. El tipo lleva a su categoría en Explorar.
  - **Agendar**: archivo .ics para el calendario del iPhone u Outlook (los cursos entran con sus clases semanales hasta la última y aviso 2 h antes) o Google Calendar. En convocatorias también se puede agendar el recordatorio del cierre. Los cursos que ya empezaron no se ofrecen para agendar: en la tarjeta se ve hasta cuándo duran.
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

`js/seed/` trae **97 piezas reales**, todo lo publicado por las tres fuentes que le sirve a una empresa. Están resumidas con palabras propias, tienen link al original y la fecha de verificación. El servidor arranca vacío: hasta la primera publicación desde el panel, las empresas ven este contenido.

| Fuente | Qué se relevó | De dónde |
|---|---|---|
| UCIP (`ucip-cursos.js`, `ucip.js`) | **Los 38 cursos** del Centro de Capacitación, con fechas, horario, clases, docente, destinatarios, requisitos y promociones: 4 empiezan en octubre, 18 están en curso, 2 terminaron y 14 son del ciclo 2027. **Servicios:** financiamiento (todas las líneas cerradas al 15/10), consultoría, empleo UCIP-AMIA, seguros, sellados ARBA, informes Veraz, Provincia NET, cajas de seguridad, autogestión de tasas y DESE. **Programas:** Nodo UCIP, incubadora, Centros Comerciales a Cielo Abierto, UCOM, UIM, Oferta Exportable, UPRI, Mujeres Empresarias, Comisión Joven y programa de TV. **Convocatoria:** Escaneá y Ganá (sorteo del 2/11). **Además:** cuotas de socio, las 30 cámaras socias, la biblioteca digital, ventas de septiembre, el informe industrial 2025 y las 10 noticias del sitio. | [cursos](https://www.ucip.org.ar/servicios/capacitacion/cursos-presenciales/), [servicios y sectores](https://www.ucip.org.ar/), [noticias](https://www.ucip.org.ar/noticias/), [informe industrial 2025 (PDF)](https://www.ucip.org.ar/wp-content/uploads/2026/06/Informe-Encuesta-Pyme-2025.pdf), [Infobrisas](https://www.infobrisas.com/noticias/2026/08/31/106226-la-ucip-inauguro-un-nuevo-nodo-para-empresas-en-mar-del-plata-que-servicios-ofrecera) |
| ATICMA (`aticma.js`) | **Tech Week:** B2B Demandas Tecnológicas (10/11, gratis), Awards (postulaciones hasta el 2/11), ATICMA Emprende (récord de 250 proyectos, final el 13/11). **Directorios:** las 111 empresas socias y dónde estudiar tecnología. **Socios:** beneficios de asociarse, comisiones y convenio con la UAA. **Además:** cifras del sector TIC y las 11 novedades de 2026 (las de más de 3 meses quedan en el archivo). | [aticma.org.ar](https://www.aticma.org.ar/), [novedades](https://www.aticma.org.ar/novedades/), [socios](https://www.aticma.org.ar/socios/), [emprende.aticma.org.ar](https://emprende.aticma.org.ar/), [awards.aticma.org.ar](https://awards.aticma.org.ar/) |
| Producto Local (`pl.js`) | El trámite oficial para productores y para comercios: Actas Compromiso 2026, gratis, por mail a productolocal@mardelplata.gob.ar, Decreto 2032/20. También el listado de empresas adheridas, que la web muestra parcialmente (39 de 310), y la evolución del programa. | [El Marplatense](https://www.elmarplatense.com/el-programa-producto-local-supero-los-13300-articulos-y-suma-310-empresas), [La Capital](https://www.lacapitalmdp.com/temas/producto-local/), [Punto Noticias](https://puntonoticias.com/producto-local-casi-300-empresas-adheridas-y-mas-de-12-300-productos-ya-forman-parte-de-esta-iniciativa/), [mardelplata.gob.ar/productolocal](https://www.mardelplata.gob.ar/productolocal) |

Lo que no se pudo confirmar quedó dicho en la pieza:
- Los costos de los cursos y del Nodo UCIP no están publicados; la cuota de socio de ATICMA tampoco.
- La dirección mardelplata.gob.ar/productolocal responde con error, así que se enlaza la página "Participá del programa" del mismo sitio.
- Quedó afuera Aemprender: es un certamen de 2023 que sigue en el menú de UCIP.

**Verificación (15/10/2026):**
- Todos los links de las piezas responden. Además se revisó el título de cada página, para detectar las páginas de error que responden como si estuvieran bien.
- Los mails que UCIP y el Municipio muestran ocultos se decodificaron de sus propias páginas.
- Una prueba automática controla la coherencia de todas las fechas:
  - Que cada "martes 10/11" de los textos sea martes en 2026.
  - Que el "Cuándo" de cada curso coincida con su inicio, su fin y su horario.
  - Que la última clase calculada caiga en la fecha de fin publicada.

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
cd ../stage-redmdp && npm ci --omit=dev   # @netlify/blobs, para empaquetar las funciones
netlify deploy --prod --no-build --dir site --functions netlify/functions
```

**Publicada en https://red-empresas-mdp.netlify.app.** Es el proyecto `red-empresas-mdp` del equipo Sistema Gantt BIOMKT. Se subió con la CLI desde la carpeta de `stage.mjs` y no está conectado a Git, así que cada cambio hay que volver a desplegarlo.

El equipo crea los proyectos como *Privados*: solo el dueño los ve, entrando con su cuenta de Netlify. Para abrirlo a las empresas: *Project configuration → General → Visitor access → Project visibility → Edit visibility → Public*.

Arrastrar `site/` a Netlify Drop publica solo la parte estática. La app anda en modo local, sin estadísticas compartidas ni panel.

Variables a configurar:

| Variable (alcance *Functions*) | Qué es |
|---|---|
| `ADMIN_CODE` | Código del panel, de 12 caracteres o más. Es lo que se tipea en `#/admin`. |
| `ADMIN_SECRET` | Secreto al azar de 32 caracteres o más (`openssl rand -base64 48`). Nunca se tipea y tiene que ser distinto del código. Cambiarlo cierra todas las sesiones del panel. |
| `PAUSADO` | `1` deja de guardar eventos (palanca de emergencia de costos). El contenido se sigue sirviendo. |

Un cambio de variables exige volver a desplegar. `GET /api/salud` dice si el panel quedó configurado. En el sitio publicado `ADMIN_CODE` y `ADMIN_SECRET` ya están cargadas; el código del panel se lee en *Project configuration → Environment variables*.

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
js/seed.js, js/seed/            contenido inicial relevado, por fuente
js/content.js                   estado de cada pieza, relevancia, feed, agenda (puro)
js/ics.js                       .ics y Google Calendar (puro)
js/stats.js                     estadísticas e informe (puro)
js/fmt.js                       fechas en hora de Mar del Plata
js/store.js, js/api.js          estado local, conexión con la API y modo local
js/demo.js                      datos de uso inventados para ver el panel lleno
js/views/                       inicio, explorar, detalle, agenda, fuentes, perfil, panel
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
- Fechas en hora de Mar del Plata, y la coherencia de todas las fechas del contenido.
- Clases semanales de los cursos contra las fechas publicadas por UCIP.
- Explorar: secciones de cada categoría, en las que cada pieza cae en una sola.
- Búsqueda: primer resultado esperado para consultas típicas, sinónimos y palabras cortas enteras.
- Inicio: próximas fechas por semana, recomendados por rubro y novedades.
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
