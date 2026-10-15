// Panel de administración: carga de contenido, estadísticas e informe por fuente.
// Con servidor pide el código del panel; en modo local trabaja sobre este navegador y lo avisa.
import { DIA, FUENTES, FUENTE_IDS, RUBROS, TAMANOS, TEMAS, TIPOS, TIPO_IDS } from '../config.js';
import { estado } from '../content.js';
import { $, descargar, el, icon, toast } from '../dom.js';
import { aInputLocal, deInputLocal, fechaCorta, fechaLarga, isoDia, norm, num, pct, plural } from '../fmt.js';
import * as api from '../api.js';
import { datosDeEjemplo } from '../demo.js';
import { agregar, informe } from '../stats.js';
import { chipFuente, tarjeta } from './comun.js';

export const title = 'Panel';
const K_BORRADOR = 'redmdp.borrador';
let ejemplo = false;
let cache = null;   // { dias, data }

const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(K_BORRADOR)); } catch { return null; } };
const escribirBorrador = items => { try { localStorage.setItem(K_BORRADOR, JSON.stringify(items)); } catch { toast('No se pudo guardar el borrador en este navegador', 'error'); } };
const borrarBorrador = () => { try { localStorage.removeItem(K_BORRADOR); } catch { /* nada */ } };

export async function mount(root, ctx, sub = '', arg = '') {
  if (api.modo === 'servidor' && !api.tokenAdmin()) return pantallaLogin(root, ctx);
  const tabs = el('nav', { class: 'tabs', 'aria-label': 'Secciones del panel' },
    [['', 'Contenido'], ['stats', 'Estadísticas'], ['informe', 'Informes']].map(([k, label]) =>
      el('a', { href: '#/admin' + (k ? '/' + k : ''), class: 'tab', 'aria-current': (sub === k || (k === '' && sub === 'editar')) ? 'page' : null, text: label })));
  const head = el('header', { class: 'pag-head panel-head' },
    el('div', {}, el('h1', { text: 'Panel' }),
      el('p', { text: api.modo === 'local' ? 'Modo local: sin servidor. Lo que publiques queda en este navegador y las estadísticas usan solo sus eventos.' : 'Conectado al servidor.' })),
    api.modo === 'servidor' ? el('button', { type: 'button', class: 'btn fantasma', onclick: () => { api.salirAdmin(); location.hash = '#/admin'; mount(root, ctx); } }, 'Cerrar sesión') : null);
  const body = el('div', { class: 'panel-body' });
  root.replaceChildren(head, tabs, body);
  if (sub === 'stats') return pantallaStats(body, ctx);
  if (sub === 'informe') return pantallaInforme(body, ctx, arg || 'ucip');
  if (sub === 'editar') return pantallaEditor(body, ctx, arg);
  return pantallaContenido(body, ctx);
}

// ───────────── Acceso ─────────────
function pantallaLogin(root, ctx) {
  const input = el('input', { id: 'code', type: 'password', autocomplete: 'current-password', required: true });
  const err = el('p', { class: 'error', role: 'alert', hidden: true });
  root.replaceChildren(el('section', { class: 'login' },
    el('h1', { text: 'Panel de administración' }),
    el('p', { text: 'Ingresá el código del panel (la variable ADMIN_CODE del sitio en Netlify).' }),
    el('form', { class: 'form', onsubmit: async ev => {
      ev.preventDefault();
      const b = ev.submitter; if (b) b.disabled = true;
      const r = await api.login(input.value);
      if (b) b.disabled = false;
      if (r.ok) return mount(root, ctx);
      err.textContent = {
        codigo_incorrecto: 'Código incorrecto.',
        admin_no_configurado: 'El panel no está configurado: faltan ADMIN_CODE (12+ caracteres) y ADMIN_SECRET (32+ caracteres) en Netlify → Site configuration → Environment variables. Después hay que volver a desplegar.',
        sin_conexion: 'El servidor no respondió. Revisá la conexión y probá de nuevo.'
      }[r.error] || 'No se pudo entrar. Probá de nuevo en un minuto.';
      err.hidden = false;
    } }, el('div', { class: 'campo' }, el('label', { for: 'code', text: 'Código' }), input), err,
    el('button', { class: 'btn primario', type: 'submit', text: 'Entrar' }))));
  input.focus();
}

// ───────────── Contenido ─────────────
function pantallaContenido(body, ctx) {
  let items = leerBorrador() || structuredClone(ctx.items);
  let filtroFuente = '', verPasados = false, q = '';
  const now = Date.now();
  const cambios = () => JSON.stringify(items) !== JSON.stringify(ctx.items);

  const barra = el('div', { class: 'panel-barra' });
  const lista = el('div', { class: 'admin-lista' });
  const importar = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data)) throw new Error();
      items = data; escribirBorrador(items); pintar(); toast(`Importadas ${data.length} piezas. Revisalas y publicá.`);
    } catch { toast('El archivo no es una exportación válida del panel', 'error'); }
    e.target.value = '';
  } });

  function pintar() {
    const editado = cambios();
    const nuncaPublicado = api.modo === 'servidor' && api.origen === 'semilla';   // las empresas ven el contenido inicial
    const hay = editado || nuncaPublicado;
    const texto = editado ? `Hay cambios sin publicar (${items.length} piezas en el borrador)`
      : nuncaPublicado ? `Las empresas ven el contenido inicial (${items.length} piezas). Publicalo para administrarlo desde acá.`
      : api.modo === 'local' ? `${items.length} piezas ${api.origen === 'local' ? 'publicadas en este navegador' : 'del contenido inicial'}`
      : `${items.length} piezas publicadas`;
    barra.replaceChildren(
      el('div', { class: 'estado-borrador' + (hay ? ' pendiente' : '') }, texto),
      el('div', { class: 'acciones' },
        el('a', { class: 'btn', href: '#/admin/editar/nueva' }, icon('plus'), 'Nueva pieza'),
        editado ? el('button', { type: 'button', class: 'btn fantasma', onclick: () => { borrarBorrador(); items = structuredClone(ctx.items); pintar(); toast('Cambios descartados'); } }, 'Descartar') : null,
        el('button', { type: 'button', class: 'btn primario', disabled: !hay, onclick: publicar }, icon('upload'), 'Publicar'),
        el('button', { type: 'button', class: 'btn fantasma', onclick: () => descargar(`red-empresas-mdp-contenido-${isoDia(Date.now())}.json`, JSON.stringify(items, null, 2), 'application/json') }, icon('download'), 'Exportar'),
        el('button', { type: 'button', class: 'btn fantasma', onclick: () => importar.click() }, 'Importar'), importar));

    const filtrados = items.filter(i => (!filtroFuente || i.fuente === filtroFuente) && (verPasados || estado(i, now).clave !== 'pasado') &&
      (!q || norm(i.titulo + ' ' + i.id).includes(norm(q))));
    lista.replaceChildren(...(filtrados.length ? filtrados : []).map(i => fila(i)),
      filtrados.length ? '' : el('p', { class: 'vacio', text: 'No hay piezas con este filtro.' }));
  }

  function fila(i) {
    const e = estado(i, now);
    const borrar = el('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Borrar', title: 'Borrar', onclick: ev => {
      const b = ev.currentTarget;
      if (b.dataset.confirmar !== '1') { b.dataset.confirmar = '1'; b.classList.add('confirmar'); b.setAttribute('aria-label', 'Tocá de nuevo para borrar'); b.title = 'Tocá de nuevo para borrar'; return; }
      items = items.filter(x => x.id !== i.id); escribirBorrador(items); pintar(); toast('Pieza borrada del borrador');
    } }, icon('trash'));
    return el('div', { class: 'admin-fila' },
      el('div', { class: 'admin-fila-main' },
        el('div', { class: 'card-meta' }, chipFuente(i.fuente), el('span', { class: 'tipo', text: TIPOS[i.tipo]?.label || i.tipo }), el('span', { class: 'estado ' + e.clave, text: e.texto })),
        el('a', { href: '#/admin/editar/' + encodeURIComponent(i.id), class: 'admin-tit', text: i.titulo }),
        el('span', { class: 'nota', text: `${i.id}${i.verificado ? ' · verificado ' + i.verificado.split('-').reverse().join('/') : ''}` })),
      el('div', { class: 'admin-fila-acc' },
        el('a', { class: 'iconbtn', href: '#/admin/editar/' + encodeURIComponent(i.id), 'aria-label': 'Editar', title: 'Editar' }, icon('edit')),
        el('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Duplicar', title: 'Duplicar', onclick: () => {
          const copia = { ...structuredClone(i), id: idNuevo(i.fuente, i.titulo, items), titulo: i.titulo + ' (copia)' };
          items.splice(items.indexOf(i) + 1, 0, copia); escribirBorrador(items); location.hash = '#/admin/editar/' + copia.id;
        } }, icon('copy')),
        borrar));
  }

  async function publicar(ev) {
    const b = ev.currentTarget; b.disabled = true;
    const r = await api.publicar(items);
    b.disabled = false;
    if (r.ok) { ctx.setItems(structuredClone(items)); borrarBorrador(); pintar(); toast(r.local ? 'Publicado en este navegador' : 'Publicado. Las empresas lo ven en hasta un minuto.'); return; }
    if (r.status === 401) { api.salirAdmin(); toast('La sesión venció: ingresá el código de nuevo', 'error'); location.hash = '#/admin'; return; }
    if (r.status === 409) { toast('Se publicó otra versión desde otro dispositivo. Exportá tu borrador, recargá la página y volvé a aplicar los cambios.', 'error', 9000); return; }
    if (r.status === 422) {
      const lineas = (r.errores || []).slice(0, 6).map(x => `${x.id || 'pieza ' + (x.i + 1)}: ${x.errores.join('; ')}`);
      toast('No se publicó. ' + lineas.join(' · '), 'error', 12000); return;
    }
    toast('No se pudo publicar: el servidor no respondió. El borrador sigue guardado.', 'error', 6000);
  }

  const filtros = el('div', { class: 'admin-filtros' },
    el('select', { id: 'fFuente', 'aria-label': 'Fuente', onchange: e => { filtroFuente = e.target.value; pintar(); } },
      el('option', { value: '', text: 'Todas las fuentes' }), FUENTE_IDS.map(f => el('option', { value: f, text: FUENTES[f].corto }))),
    el('input', { id: 'fQ', type: 'search', placeholder: 'Buscar por título o id', 'aria-label': 'Buscar', oninput: e => { q = e.target.value; pintar(); } }),
    el('label', { class: 'check', for: 'fPas' }, el('input', { id: 'fPas', type: 'checkbox', onchange: e => { verPasados = e.target.checked; pintar(); } }), 'Mostrar lo que ya pasó'));
  body.replaceChildren(barra, filtros, lista);
  pintar();
}

const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
function idNuevo(fuente, titulo, items) {
  const base = `${fuente}-${slug(titulo) || 'pieza'}`;
  let id = base, n = 2;
  while (items.some(i => i.id === id)) id = `${base}-${n++}`;
  return id;
}

// ───────────── Editor ─────────────
function pantallaEditor(body, ctx, id) {
  const items = leerBorrador() || structuredClone(ctx.items);
  const nueva = id === 'nueva';
  const it = nueva
    ? { id: '', fuente: 'ucip', tipo: 'evento', titulo: '', resumen: '', url: 'https://', rubros: ['todos'], temas: [], verificado: isoDia(Date.now()) }
    : items.find(i => i.id === id);
  if (!it) { body.replaceChildren(el('p', { class: 'vacio', text: 'No existe esa pieza en el borrador.' }), el('a', { class: 'btn', href: '#/admin', text: 'Volver' })); return; }

  const f = {};
  const input = (k, props) => (f[k] = el('input', { id: 'e_' + k, ...props }));
  const area = (k, props) => (f[k] = el('textarea', { id: 'e_' + k, ...props }));
  const sel = (k, opts, val) => (f[k] = el('select', { id: 'e_' + k }, opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === val }))));
  const campo = (k, label, control, ayuda) => el('div', { class: 'campo' }, el('label', { for: 'e_' + k, text: label }), control, ayuda ? el('p', { class: 'ayuda', text: ayuda }) : null);
  const checks = (nombre, opciones, valores) => el('div', { class: 'chips wrap', role: 'group', 'aria-label': nombre },
    opciones.map(([v, t]) => el('button', { type: 'button', class: 'chip', 'data-v': v, 'aria-pressed': String(valores.includes(v)), text: t,
      onclick: e => { const b = e.currentTarget; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); vista(); } })));
  const marcados = grupo => [...grupo.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.v);

  const rubrosG = checks('Rubros', [['todos', 'Todos los rubros'], ...Object.entries(RUBROS)], it.rubros || ['todos']);
  const temasG = checks('Temas', Object.entries(TEMAS), it.temas || []);
  const preview = el('div', { class: 'preview' });

  const form = el('form', { class: 'form editor', novalidate: true, oninput: () => vista(), onsubmit: ev => { ev.preventDefault(); guardar(); } },
    el('fieldset', {}, el('legend', { text: 'Qué es' }),
      el('div', { class: 'fila2' },
        campo('fuente', 'Fuente', sel('fuente', FUENTE_IDS.map(x => [x, FUENTES[x].corto]), it.fuente)),
        campo('tipo', 'Tipo', sel('tipo', TIPO_IDS.map(x => [x, TIPOS[x].label]), it.tipo))),
      campo('titulo', 'Título', input('titulo', { maxlength: '140', value: it.titulo, required: true }), 'Concreto, con el beneficio para la empresa. Máx. 140 caracteres.'),
      campo('resumen', 'Resumen', area('resumen', { maxlength: '400', rows: '3', required: true, text: it.resumen }), 'Una o dos oraciones con palabras propias: qué es y para quién.'),
      campo('cuerpo', 'Más detalle (opcional)', area('cuerpo', { rows: '5', text: (it.cuerpo || []).join('\n\n') }), 'Un párrafo por bloque, separados por una línea en blanco.'),
      campo('datos', 'Datos clave (opcional)', area('datos', { rows: '4', text: (it.datos || []).map(([k, v]) => `${k}: ${v}`).join('\n') }), 'Uno por línea, como "Cuándo: jueves 18 h". Hasta 12.')),
    el('fieldset', {}, el('legend', { text: 'Fechas' }),
      el('div', { class: 'fila2' },
        campo('inicio', 'Empieza', input('inicio', { type: 'datetime-local', value: aInputLocal(it.inicio) })),
        campo('duracionMin', 'Duración de cada encuentro (min)', input('duracionMin', { type: 'number', min: '1', max: '1440', value: it.duracionMin ?? '' }))),
      el('div', { class: 'fila2' },
        campo('sesiones', 'Cantidad de clases semanales', input('sesiones', { type: 'number', min: '1', max: '52', value: it.sesiones ?? '' }), 'Solo en cursos: 8 = ocho semanas seguidas.'),
        campo('cierre', 'Cierre de inscripción', input('cierre', { type: 'datetime-local', value: aInputLocal(it.cierre) }))),
      el('div', { class: 'fila2' },
        campo('fin', 'Termina (eventos de varios días)', input('fin', { type: 'datetime-local', value: aInputLocal(it.fin) })),
        el('label', { class: 'check', for: 'e_todoElDia' }, input('todoElDia', { type: 'checkbox', checked: !!it.todoElDia }), 'Todo el día (sin horario)')),
      campo('etiqueta', 'Etiqueta si no hay fechas (opcional)', input('etiqueta', { maxlength: '48', value: it.etiqueta || '', placeholder: 'Ej.: Ciclo 2027 · de abril a diciembre' }), 'Se muestra en la tarjeta cuando la pieza no tiene fechas propias.')),
    el('fieldset', {}, el('legend', { text: 'Dónde y links' }),
      campo('lugar', 'Lugar', input('lugar', { maxlength: '160', value: it.lugar || '' })),
      campo('url', 'Link al original', input('url', { type: 'url', value: it.url || 'https://', required: true }), 'La página de la fuente donde se publicó. Obligatorio.'),
      campo('via', 'Vía (si el dato salió de un medio)', input('via', { maxlength: '60', value: it.via || '', placeholder: 'Ej.: La Capital' })),
      el('div', { class: 'fila2' },
        campo('accionTxt', 'Botón principal: texto', input('accionTxt', { maxlength: '60', value: it.accion?.txt || '', placeholder: 'Inscribirme' })),
        campo('accionUrl', 'Botón principal: link', input('accionUrl', { type: 'url', value: it.accion?.url || '', placeholder: 'https://' })))),
    el('fieldset', {}, el('legend', { text: 'A quién le sirve' }), el('p', { class: 'ayuda', text: 'Ordena el feed: no oculta la pieza a nadie que siga la fuente.' }),
      el('p', { class: 'hoja-sub', text: 'Rubros' }), rubrosG, el('p', { class: 'hoja-sub', text: 'Temas' }), temasG),
    el('fieldset', {}, el('legend', { text: 'Control' }),
      el('div', { class: 'fila2' },
        campo('publicado', 'Publicado en la fuente', input('publicado', { type: 'date', value: it.publicado || '' })),
        campo('verificado', 'Verificado por vos el', input('verificado', { type: 'date', value: it.verificado || '' }))),
      it.serie ? el('p', { class: 'ayuda', text: `Esta pieza tiene un gráfico ("${it.serie.titulo}"): se conserva tal cual. Para cambiarlo, exportá, editá el JSON e importá.` }) : null),
    el('p', { class: 'error', id: 'eErr', role: 'alert', hidden: true }),
    el('div', { class: 'acciones' }, el('button', { type: 'submit', class: 'btn primario', text: 'Guardar en el borrador' }), el('a', { class: 'btn fantasma', href: '#/admin', text: 'Cancelar' })));

  function leer() {
    const v = k => f[k].value.trim();
    const num = k => (v(k) ? Number(v(k)) : undefined);
    const out = {
      id: it.id || idNuevo(f.fuente.value, v('titulo'), items),
      fuente: f.fuente.value, tipo: f.tipo.value, titulo: v('titulo'), resumen: v('resumen'),
      cuerpo: v('cuerpo') ? v('cuerpo').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : undefined,
      datos: v('datos') ? v('datos').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['Dato', l]; }) : undefined,
      inicio: deInputLocal(f.inicio.value) || undefined, fin: deInputLocal(f.fin.value) || undefined, cierre: deInputLocal(f.cierre.value) || undefined,
      duracionMin: num('duracionMin'), sesiones: num('sesiones'), todoElDia: f.todoElDia.checked || undefined,
      lugar: v('lugar') || undefined, url: v('url'), via: v('via') || undefined, etiqueta: v('etiqueta') || undefined,
      accion: v('accionTxt') && v('accionUrl') ? { txt: v('accionTxt'), url: v('accionUrl') } : undefined,
      rubros: marcados(rubrosG).length ? marcados(rubrosG) : ['todos'], temas: marcados(temasG),
      serie: it.serie, publicado: v('publicado') || undefined, verificado: v('verificado') || undefined
    };
    return JSON.parse(JSON.stringify(out));     // saca los undefined
  }

  function errores(x) {
    const e = [];
    if (!x.titulo) e.push('Falta el título.');
    if (!x.resumen) e.push('Falta el resumen.');
    if (!/^https:\/\/\S+\.\S+/.test(x.url)) e.push('El link al original tiene que empezar con https://');
    if (x.accion && !/^https:\/\/\S+\.\S+/.test(x.accion.url)) e.push('El link del botón tiene que empezar con https://');
    if ((f.accionTxt.value.trim() || f.accionUrl.value.trim()) && !x.accion) e.push('El botón principal necesita texto y link.');
    if (x.datos?.length > 12) e.push('Hasta 12 datos clave.');
    if (x.fin && x.inicio && Date.parse(x.fin) < Date.parse(x.inicio)) e.push('"Termina" es anterior a "Empieza".');
    return e;
  }

  function vista() {
    const x = leer();
    preview.replaceChildren(el('p', { class: 'hoja-sub', text: 'Así se ve en el inicio' }),
      x.titulo ? tarjeta({ item: x, estado: estado(x, Date.now()) }, Date.now()) : el('p', { class: 'nota', text: 'Escribí un título para ver la tarjeta.' }));
  }

  function guardar() {
    const x = leer();
    const e = errores(x);
    const box = $('#eErr');
    if (e.length) { box.textContent = e.join(' '); box.hidden = false; return; }
    const i = items.findIndex(p => p.id === it.id && !nueva);
    if (i >= 0) items[i] = x; else items.unshift(x);
    escribirBorrador(items);
    toast('Guardado en el borrador. Publicá para que lo vean las empresas.');
    location.hash = '#/admin';
  }

  body.replaceChildren(el('h2', { class: 'sec', text: nueva ? 'Nueva pieza' : 'Editar pieza' }), preview, form);
  vista();
}

// ───────────── Estadísticas ─────────────
async function cargar(dias, ctx) {
  if (ejemplo) return { ok: true, ...datosDeEjemplo(ctx.items, Date.now(), { dias }) };
  if (cache?.dias === dias && Date.now() - cache.at < 60e3) return cache.data;
  const d = await api.datos(dias);
  if (d.ok) cache = { dias, data: d, at: Date.now() };
  return d;
}

async function pantallaStats(body, ctx, dias = 30) {
  body.replaceChildren(el('p', { class: 'cargando', text: 'Cargando estadísticas…' }));
  const d = await cargar(dias, ctx);
  if (!d.ok) return errorDatos(body, d);
  const now = Date.now();
  const agg = agregar({ lotes: d.lotes, empresas: d.empresas, items: ctx.items, now, dias });
  const T = agg.totales;
  const periodo = el('select', { id: 'sDias', 'aria-label': 'Período', onchange: e => pantallaStats(body, ctx, Number(e.target.value)) },
    [7, 30, 90].map(n => el('option', { value: String(n), text: `Últimos ${n} días`, selected: n === dias })));
  const kids = [
    el('div', { class: 'panel-barra' }, periodo,
      api.modo === 'local' ? el('button', { type: 'button', class: 'btn fantasma', onclick: () => { ejemplo = !ejemplo; pantallaStats(body, ctx, dias); } }, ejemplo ? 'Quitar datos de ejemplo' : 'Cargar datos de ejemplo') : null),
    ejemplo ? el('p', { class: 'aviso-ejemplo', text: 'Datos de ejemplo inventados para ver el panel lleno. No son empresas reales.' }) : null,
    d.recortado ? el('p', { class: 'aviso-ejemplo', text: 'Hay demasiados envíos sin compactar: se muestran los más recientes. La compactación diaria lo resuelve.' }) : null,
    el('div', { class: 'kpis' },
      kpi('Empresas registradas', T.registradas),
      kpi('Activas en 7 días', T.activas7, T.registradas ? `${pct(T.activas7, T.registradas)}% de las registradas` : ''),
      kpi('Volvieron 2+ días en la semana', T.recurrentes7, T.registradas ? `${pct(T.recurrentes7, T.registradas)}% · meta del piloto: 60%` : 'Meta del piloto: 60%'),
      kpi(`Activas en ${dias} días`, T.activas),
      kpi('Guardados', T.guardados),
      kpi('Clics a inscripción u original', T.clics),
      kpi('Agendados', T.agendados)),
    el('section', { class: 'bloque' }, el('h2', { class: 'sec', text: 'Empresas activas por día' }), sparkline(agg.serie)),
    el('section', { class: 'bloque' }, el('h2', { class: 'sec', text: 'Por fuente' }),
      el('div', { class: 'fstats' }, FUENTE_IDS.map(f => {
        const x = agg.porFuente[f];
        return el('div', { class: 'fstat', style: { '--c': FUENTES[f].color } }, chipFuente(f),
          el('dl', {}, [['Seguidores', x.seguidores], ['Alcance', x.alcance], ['Vistas', x.vistas], ['Guardados', x.guardados], ['Clics', x.clics], ['Agendados', x.agendados]]
            .map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: num(v) })))));
      })),
      el('p', { class: 'nota', text: 'Alcance: empresas distintas que abrieron al menos una pieza. Vistas: una por empresa, pieza y día.' })),
    el('section', { class: 'bloque' }, el('h2', { class: 'sec', text: 'Piezas con más alcance' }),
      agg.porItem.length
        ? ranking(agg.porItem.slice(0, 12), true)
        : el('p', { class: 'vacio', text: 'Todavía no hay uso registrado en este período. Cuando las empresas abran la app, acá aparece qué contenido les sirve.' })),
    el('section', { class: 'bloque dos' },
      el('div', {}, el('h2', { class: 'sec', text: 'Empresas por rubro' }), barras(agg.rubros, RUBROS)),
      el('div', {}, el('h2', { class: 'sec', text: 'Empresas por tamaño' }), barras(agg.tamanos, TAMANOS)))
  ];
  body.replaceChildren(...kids.filter(Boolean));
}

function errorDatos(body, d) {
  if (d.status === 401) { api.salirAdmin(); location.hash = '#/admin'; return; }
  body.replaceChildren(el('p', { class: 'error', text: 'No se pudieron leer las estadísticas: el servidor no respondió. Probá de nuevo en un minuto.' }));
}

const kpi = (label, n, sub) => el('div', { class: 'kpi' }, el('span', { class: 'kpi-n', text: num(n) }), el('span', { class: 'kpi-l', text: label }), sub ? el('span', { class: 'kpi-s', text: sub }) : null);

// Piezas ordenadas por alcance: título, barra proporcional y el resto de las acciones en una línea
function ranking(filas, conFuente) {
  const max = Math.max(1, ...filas.map(x => x.alcance));
  return el('ol', { class: 'ranking' }, filas.map(x => el('li', {},
    el('div', { class: 'rk-top' },
      el('a', { class: 'rk-tit', href: '#/c/' + encodeURIComponent(x.id), text: x.titulo }),
      el('span', { class: 'rk-n', text: plural(x.alcance, 'empresa', 'empresas') })),
    el('span', { class: 'barra-t' }, el('span', { class: 'barra-v', style: { width: `${Math.max(2, (x.alcance / max) * 100)}%` } })),
    el('span', { class: 'rk-meta', text: [conFuente && x.fuente ? FUENTES[x.fuente].corto : '', plural(x.guardados, 'guardado', 'guardados'), plural(x.clics, 'clic', 'clics'), plural(x.agendados, 'agendado', 'agendados')].filter(Boolean).join(' · ') }))));
}

function barras(lista, nombres) {
  if (!lista.length) return el('p', { class: 'vacio', text: 'Sin empresas registradas todavía.' });
  const max = Math.max(...lista.map(x => x.n));
  return el('div', { class: 'barras' }, lista.slice(0, 10).map(x => el('div', { class: 'barra' },
    el('span', { class: 'barra-l', text: nombres[x.clave] || (x.clave === 'sin-dato' ? 'Sin dato' : x.clave) }),
    el('span', { class: 'barra-t' }, el('span', { class: 'barra-v', style: { width: `${Math.max(2, (x.n / max) * 100)}%` } })),
    el('span', { class: 'barra-n', text: num(x.n) }))));
}

// Área con la última jornada marcada; eje y en empresas.
function sparkline(serie) {
  const W = 640, H = 120, P = 6, max = Math.max(1, ...serie.map(s => s.activas));
  const x = i => P + (i / Math.max(1, serie.length - 1)) * (W - 2 * P);
  const y = v => H - 18 - (v / max) * (H - 32);
  const pts = serie.map((s, i) => `${x(i).toFixed(1)},${y(s.activas).toFixed(1)}`);
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, a, t) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); if (t != null) n.textContent = t; return n; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', role: 'img', 'aria-label': `Empresas activas por día: máximo ${max}, hoy ${serie.at(-1).activas}` });
  for (const g of [0, 0.5, 1]) svg.append(s('line', { x1: P, x2: W - P, y1: y(max * g), y2: y(max * g), class: 'spark-grid' }));
  svg.append(s('text', { x: P, y: y(max) - 3, class: 'spark-lab' }, `${max}`));
  svg.append(s('path', { d: `M${x(0)},${y(0)} L${pts.join(' L')} L${x(serie.length - 1)},${y(0)} Z`, class: 'spark-area' }));
  svg.append(s('polyline', { points: pts.join(' '), class: 'spark-line' }));
  const u = serie.at(-1);
  svg.append(s('circle', { cx: x(serie.length - 1), cy: y(u.activas), r: 4, class: 'spark-dot' }));
  const ini = serie[0].dia * DIA + 12 * 3600e3;
  svg.append(s('text', { x: P, y: H - 3, class: 'spark-lab' }, fechaCorta(ini)));
  svg.append(s('text', { x: W - P, y: H - 3, class: 'spark-lab', 'text-anchor': 'end' }, `hoy: ${u.activas}`));
  return el('div', { class: 'spark-wrap' }, svg);
}

// ───────────── Informe por fuente ─────────────
async function pantallaInforme(body, ctx, fuente) {
  if (!FUENTES[fuente]) fuente = 'ucip';
  body.replaceChildren(el('p', { class: 'cargando', text: 'Armando el informe…' }));
  const dias = 30;
  const d = await cargar(dias, ctx);
  if (!d.ok) return errorDatos(body, d);
  const now = Date.now();
  const agg = agregar({ lotes: d.lotes, empresas: d.empresas, items: ctx.items, now, dias });
  const inf = informe(agg, fuente);
  const F = FUENTES[fuente];
  const elegir = el('div', { class: 'panel-barra no-print' },
    el('div', { class: 'chips' }, FUENTE_IDS.map(f => el('a', { class: 'chip', href: '#/admin/informe/' + f, 'aria-pressed': String(f === fuente), text: FUENTES[f].corto }))),
    window.top === window.self ? el('button', { type: 'button', class: 'btn primario', onclick: () => window.print() }, icon('download'), 'Imprimir o guardar PDF') : null);
  const desde = now - dias * DIA;
  const hoja = el('article', { class: 'informe', style: { '--c': F.color } },
    el('header', {},
      el('p', { class: 'marca-chica', text: 'Red Empresas MDP · Informe de alcance' }),
      el('h2', { text: `${F.corto}: lo que tu contenido movió en ${dias} días` }),
      el('p', { class: 'nota', text: `Del ${fechaLarga(desde)} al ${fechaLarga(now)}. Generado el ${fechaCorta(now)}.` })),
    ejemplo ? el('p', { class: 'aviso-ejemplo', text: 'Datos de ejemplo inventados: no usar con la fuente.' }) : null,
    el('div', { class: 'kpis' },
      kpi('Empresas que vieron tu contenido', inf.alcance),
      kpi('Empresas que te siguen', inf.seguidores),
      kpi('Guardados en agendas', inf.guardados),
      kpi('Clics a inscripción u original', inf.clics),
      kpi('Agendados en el calendario', inf.agendados),
      kpi('Piezas publicadas', inf.piezas)),
    el('section', {}, el('h3', { text: 'Tus piezas con más alcance' }),
      inf.top.length ? ranking(inf.top, false) : el('p', { class: 'vacio', text: 'Sin uso registrado en el período.' })),
    el('section', {}, el('h3', { text: 'Rubros de las empresas alcanzadas' }), barras(inf.rubros, RUBROS)),
    el('footer', { class: 'nota' },
      'Cómo se mide: cada empresa usa la app con un identificador anónimo. Contamos una vista por empresa, pieza y día; guardados, clics y agendados son acciones dentro de la app. ',
      'No se registran nombres ni datos de contacto. Red Empresas MDP es una plataforma independiente, no afiliada a la institución.'));
  body.replaceChildren(elegir, hoja);
}

