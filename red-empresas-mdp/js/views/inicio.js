// Inicio: lo que tiene fecha (cierra pronto y próximas fechas por semana), lo que le sirve al rubro de la empresa y las novedades.
// El catálogo completo, separado por categoría, está en Explorar.
import { FUENTES, RUBROS } from '../config.js';
import { CATEGORIAS, agruparPorSemana, cierranPronto, cuentaVigentes, novedadesRecientes, proximasFechas, recomendados } from '../content.js';
import { el, icon } from '../dom.js';
import { plural } from '../fmt.js';
import { origen } from '../api.js';
import { SEED_VERSION } from '../seed.js';
import * as store from '../store.js';
import { filaFecha, tarjeta, vacio } from './comun.js';
import { buscarDesdeAfuera } from './explorar.js';

export const title = 'Inicio';

export function mount(root, ctx) {
  const now = Date.now();
  const { state } = store;
  const items = ctx.items;
  const nombre = state.perfil.nombre.trim();

  if (!state.sigue.length) {
    root.replaceChildren(el('header', { class: 'inicio-head' }, el('h1', { text: 'Lo que pasa para tu empresa' })),
      vacio('No seguís ninguna fuente', 'Elegí al menos una para ver su contenido.', el('a', { class: 'btn primario', href: '#/fuentes', text: 'Elegir fuentes' })));
    return;
  }

  const urgentes = cierranPronto(items, state.sigue, now);
  const fechas = proximasFechas(items, state.sigue, now, 45);
  const semanas = agruparPorSemana(fechas, now);
  const estaSemana = semanas.find(g => g.clave === 'semana')?.filas.length || 0;
  const recom = recomendados(items, state.perfil, state.sigue, now, 4);
  const novedades = novedadesRecientes(items, state.sigue, now, 4);

  const input = el('input', { id: 'qInicio', type: 'search', placeholder: 'Buscar: Excel, crédito, exportar, proveedores…', autocomplete: 'off', enterkeyhint: 'search' });
  const buscador = el('form', { class: 'buscar grande', role: 'search', onsubmit: ev => {
    ev.preventDefault();
    buscarDesdeAfuera(input.value);
    location.hash = '#/explorar';
  } }, icon('search'), el('label', { class: 'sr', for: 'qInicio', text: 'Buscar' }), input,
  el('button', { type: 'submit', class: 'btn primario chico', text: 'Buscar' }));

  const bloques = [
    el('header', { class: 'inicio-head' },
      el('p', { class: 'saludo', text: nombre ? `Hola, ${nombre}` : 'Hola' }),
      el('h1', { text: 'Lo que pasa para tu empresa' }),
      el('p', { class: 'resumen-semana' },
        estaSemana ? plural(estaSemana, 'fecha esta semana', 'fechas esta semana') : 'Sin fechas esta semana',
        urgentes.length ? ` · ${plural(urgentes.length, 'plazo cierra', 'plazos cierran')} pronto` : ''),
      aviso()),
    buscador
  ];

  if (urgentes.length) {
    bloques.push(el('section', { class: 'urgentes', 'aria-labelledby': 'tUrg' },
      el('h2', { id: 'tUrg', class: 'sec' }, icon('clock'), 'Cierra pronto'),
      el('div', { class: 'urgentes-fila' }, urgentes.map(x =>
        el('a', { class: 'urgente', href: '#/c/' + encodeURIComponent(x.item.id) },
          el('span', { class: 'urgente-dias', text: x.estado.texto }),
          el('span', { class: 'urgente-tit', text: x.item.titulo }),
          el('span', { class: 'urgente-f', text: FUENTES[x.item.fuente].corto }))))));
  }

  bloques.push(el('section', { class: 'fechas', 'aria-labelledby': 'tFechas' },
    el('h2', { id: 'tFechas', class: 'sec' }, icon('calendar'), 'Próximas fechas'),
    semanas.length
      ? semanas.map(g => el('div', { class: 'semana' },
        el('h3', { class: 'semana-tit', text: g.titulo }),
        el('div', { class: 'filas' }, g.filas.map(f => filaFecha(f, now)))))
      : el('p', { class: 'nota', text: 'No hay inicios, eventos ni cierres en las próximas seis semanas.' }),
    el('a', { class: 'link-mas', href: '#/explorar/cursos' }, 'Ver todos los cursos', icon('arrow-up-right'))));

  if (recom.length) {
    const rubro = RUBROS[state.perfil.rubro];
    bloques.push(el('section', { class: 'recom', 'aria-labelledby': 'tRecom' },
      el('h2', { id: 'tRecom', class: 'sec', text: rubro ? `Para ${rubro.toLowerCase()}` : 'Según tus intereses' }),
      el('p', { class: 'nota', text: 'Servicios, beneficios, programas y directorios que le sirven a tu rubro, sin fecha de vencimiento.' }),
      el('div', { class: 'lista' }, recom.map(x => tarjeta(x, now)))));
  }

  if (novedades.length) {
    bloques.push(el('section', { class: 'novedades', 'aria-labelledby': 'tNov' },
      el('h2', { id: 'tNov', class: 'sec', text: 'Novedades' }),
      el('div', { class: 'lista' }, novedades.map(x => tarjeta(x, now))),
      el('a', { class: 'link-mas', href: '#/explorar/novedades' }, 'Ver todas las novedades', icon('arrow-up-right'))));
  }

  const opts = { perfil: state.perfil, sigue: state.sigue, now };
  bloques.push(el('section', { class: 'explorar-todo', 'aria-labelledby': 'tTodo' },
    el('h2', { id: 'tTodo', class: 'sec', text: 'Explorá todo' }),
    el('nav', { class: 'cats compactas', 'aria-label': 'Categorías' }, CATEGORIAS.map(c =>
      el('a', { class: 'cat', href: '#/explorar/' + c.id },
        el('span', { class: 'cat-n', text: String(cuentaVigentes(items, c.id, opts)) }),
        el('span', { class: 'cat-l', text: c.label }))))));

  root.replaceChildren(...bloques);
}

function aviso() {
  const txt = {
    semilla: `Contenido relevado de las fuentes públicas el ${SEED_VERSION.split('-').reverse().join('/')}.`,
    cache: 'Sin conexión: estás viendo la última versión descargada.',
    local: 'Modo local: contenido editado en este navegador.'
  }[origen];
  return txt ? el('p', { class: 'origen', text: txt }) : null;
}
