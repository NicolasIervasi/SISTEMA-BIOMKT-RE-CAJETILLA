// Detalle de una pieza: datos clave, acción principal, agendar, compartir y link al original.
import { FUENTES, TIPOS } from '../config.js';
import { categoriaDe, esNuevo, estado, relacionados } from '../content.js';
import { copiar, descargar, el, ext, hoja, icon, toast } from '../dom.js';
import { fechaLarga, ts } from '../fmt.js';
import { entradas, googleUrl, ics } from '../ics.js';
import { registrar } from '../api.js';
import { botonGuardar, chipFuente, graficoSerie, tarjeta, vacio } from './comun.js';
import * as store from '../store.js';

export const title = 'Detalle';

const linkApp = id => `${location.origin}${location.pathname}#/c/${encodeURIComponent(id)}`;

export function mount(root, ctx, id) {
  const now = Date.now();
  const item = ctx.items.find(i => i.id === id);
  if (!item) {
    root.replaceChildren(vacio('No encontramos esta pieza', 'Puede que la fuente la haya dado de baja o que el link esté incompleto.', el('a', { class: 'btn primario', href: '#/', text: 'Ir al inicio' })));
    return;
  }
  registrar('ver', item.id);
  const e = estado(item, now);
  const F = FUENTES[item.fuente];
  const cal = entradas(item, now);

  const acciones = el('div', { class: 'acciones tres' },
    botonGuardar(item, { grande: true }),
    cal.length ? el('button', { type: 'button', class: 'btn', onclick: () => agendar(item, cal) }, icon('calendar'), 'Agendar') : null,
    el('button', { type: 'button', class: 'btn', onclick: () => compartir(item) }, icon('share'), 'Compartir'));

  const principal = item.accion
    ? ext(item.accion.url, { class: 'btn primario grande', onclick: () => registrar('ir', item.id) }, item.accion.txt, icon('arrow-up-right'))
    : null;

  const nodos = [
    // Si se llegó navegando dentro de la app, "Volver" vuelve a donde estaba (con su filtro); si se abrió un link compartido, va al inicio
    el('a', { class: 'volver', href: '#/', onclick: ev => { if (ctx.navegoDentro) { ev.preventDefault(); history.back(); } } }, icon('arrow-left'), 'Volver'),
    el('div', { class: 'det-meta' }, chipFuente(item.fuente),
      el('a', { class: 'tipo tipo-link', href: '#/explorar/' + categoriaDe(item).id, title: `Ver ${categoriaDe(item).label.toLowerCase()}`, text: TIPOS[item.tipo]?.label || '' }),
      esNuevo(item, now) ? el('span', { class: 'nuevo', text: 'Nuevo' }) : null),
    el('h1', { class: 'det-tit', text: item.titulo }),
    el('span', { class: 'estado grande ' + e.clave, text: e.texto }),
    el('p', { class: 'lead', text: item.resumen }),
    principal,
    acciones
  ];
  if (item.datos?.length) nodos.push(el('dl', { class: 'datos' }, item.datos.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v })))));
  if (item.serie) nodos.push(graficoSerie(item.serie));
  if (item.cuerpo?.length) nodos.push(el('div', { class: 'cuerpo' }, item.cuerpo.map(p => el('p', { text: p }))));
  nodos.push(el('div', { class: 'original' },
    ext(item.url, { class: 'btn fantasma', onclick: () => registrar('ir', item.id) },
      `Ver el original en ${item.via || F.corto}`, icon('arrow-up-right')),
    el('p', { class: 'nota' },
      `Resumen propio de Red Empresas MDP con datos de ${F.corto}${item.via ? ` publicados por ${item.via}` : ''}`,
      item.verificado ? `, verificado el ${fechaLarga(ts(item.verificado + 'T12:00:00-03:00'))}` : '',
      '. Ante cualquier diferencia, vale lo que dice la fuente.')));
  const rel = relacionados(ctx.items, item, store.state.perfil, now, 3);
  if (rel.length) nodos.push(el('section', { class: 'relacionados', 'aria-labelledby': 'tRel' },
    el('h2', { id: 'tRel', class: 'sec', text: 'También te puede servir' }),
    el('div', { class: 'lista' }, rel.map(x => tarjeta(x, now, { sinResumen: true })))));
  root.replaceChildren(el('article', { class: 'detalle', style: { '--c': F.color } }, nodos));
}

function agendar(item, cal) {
  const url = linkApp(item.id);
  const enMarco = window.top !== window.self;   // embebida (vista previa): el navegador bloquea las descargas
  const opciones = cal.flatMap(c => [
    el('p', { class: 'hoja-sub', text: c.label }),
    enMarco ? null : el('button', { type: 'button', class: 'btn ancho', onclick: () => {
      descargar(`${item.id}${c.clave === 'cierre' ? '-cierre' : ''}.ics`, ics(item, c, { url }), 'text/calendar;charset=utf-8');
      registrar('agendar', item.id); cerrar(); toast('Abrí el archivo para sumarlo a tu calendario');
    } }, icon('calendar'), 'Calendario del celular (iPhone, Outlook)'),
    ext(googleUrl(item, c, { url }), { class: 'btn ancho', onclick: () => { registrar('agendar', item.id); cerrar(); } }, icon('calendar'), 'Google Calendar')
  ]);
  const cerrar = hoja('Agendar', el('div', { class: 'hoja-opciones' }, opciones));
}

function compartir(item) {
  const url = linkApp(item.id);
  const texto = `${item.titulo}\n${item.resumen}\n${url}`;
  const opciones = [
    ext(`https://wa.me/?text=${encodeURIComponent(texto)}`, { class: 'btn ancho', onclick: () => { registrar('compartir', item.id); cerrar(); } }, icon('msg'), 'Mandar por WhatsApp'),
    el('button', { type: 'button', class: 'btn ancho', onclick: async () => {
      const okc = await copiar(url);
      registrar('compartir', item.id); cerrar();
      toast(okc ? 'Link copiado' : url, '', okc ? 3000 : 8000);
    } }, icon('link'), 'Copiar link')
  ];
  if (navigator.share) opciones.unshift(el('button', { type: 'button', class: 'btn ancho', onclick: async () => {
    try { await navigator.share({ title: item.titulo, text: item.resumen, url }); registrar('compartir', item.id); cerrar(); } catch { /* canceló */ }
  } }, icon('share'), 'Compartir…'));
  const cerrar = hoja('Compartir', el('div', { class: 'hoja-opciones' }, opciones));
}
