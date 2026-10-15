// Perfil de la empresa. La misma pantalla sirve de bienvenida la primera vez.
import { APP, FUENTES, FUENTE_IDS, RUBROS, TAMANOS, TEMAS } from '../config.js';
import { el, icon, toast } from '../dom.js';
import { borrarMisDatos, perfilCambiado, registrar } from '../api.js';
import * as store from '../store.js';

export const title = 'Perfil';

export function mount(root, ctx, modo) {
  const bienvenida = modo === 'bienvenida' || !store.state.listo;
  const { state } = store;
  const p = { ...state.perfil, temas: [...state.perfil.temas] };
  let sigue = [...state.sigue];
  let uso = state.usoAnonimo;

  const nombre = el('input', { id: 'pNombre', type: 'text', maxlength: '80', autocomplete: 'organization', value: p.nombre, placeholder: 'Ej.: Panadería La Perla' });
  const rubro = el('select', { id: 'pRubro', required: true },
    el('option', { value: '', text: 'Elegí un rubro' }), Object.entries(RUBROS).map(([k, v]) => el('option', { value: k, text: v, selected: p.rubro === k })));
  const tamano = el('select', { id: 'pTamano' },
    el('option', { value: '', text: 'Elegí un tamaño' }), Object.entries(TAMANOS).map(([k, v]) => el('option', { value: k, text: v, selected: p.tamano === k })));

  const chipsTemas = el('div', { class: 'chips wrap', role: 'group', 'aria-labelledby': 'lTemas' }, Object.entries(TEMAS).map(([k, v]) =>
    el('button', { type: 'button', class: 'chip', 'aria-pressed': String(p.temas.includes(k)), text: v, onclick: ev => {
      const i = p.temas.indexOf(k);
      if (i >= 0) p.temas.splice(i, 1); else p.temas.push(k);
      ev.currentTarget.setAttribute('aria-pressed', String(i < 0));
    } })));

  const chipsFuentes = el('div', { class: 'chips wrap', role: 'group', 'aria-labelledby': 'lFuentes' }, FUENTE_IDS.map(f =>
    el('button', { type: 'button', class: 'chip fuente-chip', style: { '--c': FUENTES[f].color }, 'aria-pressed': String(sigue.includes(f)), text: FUENTES[f].corto, onclick: ev => {
      sigue = sigue.includes(f) ? sigue.filter(x => x !== f) : [...sigue, f];
      ev.currentTarget.setAttribute('aria-pressed', String(sigue.includes(f)));
    } })));

  const usoBox = el('input', { id: 'pUso', type: 'checkbox', checked: uso, onchange: e => { uso = e.target.checked; } });
  const err = el('p', { class: 'error', role: 'alert', hidden: true });

  const guardar = el('button', { type: 'submit', class: 'btn primario grande', text: bienvenida ? 'Ver mi inicio' : 'Guardar cambios' });
  const form = el('form', { class: 'form', novalidate: true, onsubmit: ev => {
    ev.preventDefault();
    if (!rubro.value) { err.textContent = 'Elegí el rubro: con eso ordenamos lo que te mostramos.'; err.hidden = false; rubro.focus(); return; }
    if (!sigue.length) { err.textContent = 'Seguí al menos una fuente.'; err.hidden = false; return; }
    err.hidden = true;
    state.perfil = { nombre: nombre.value.trim().slice(0, 80), rubro: rubro.value, tamano: tamano.value, temas: p.temas };
    state.sigue = sigue;
    const dejoDeCompartir = state.usoAnonimo && !uso && state.listo;
    state.usoAnonimo = uso;
    const primera = !state.listo;
    state.listo = true;
    store.save();
    if (dejoDeCompartir) borrarMisDatos();          // también se borra el perfil anónimo que ya estaba en el servidor
    else perfilCambiado();
    if (primera) registrar('abrir', 'app');
    if (primera || bienvenida) location.hash = '#/';
    else toast('Perfil guardado');
  } },
    el('fieldset', {}, el('legend', { text: 'Tu empresa' }),
      campo('pNombre', 'Nombre (opcional, queda solo en tu celular)', nombre),
      campo('pRubro', 'Rubro', rubro),
      campo('pTamano', 'Tamaño', tamano)),
    el('fieldset', {}, el('legend', { id: 'lTemas', text: '¿Qué te interesa?' }),
      el('p', { class: 'ayuda', text: 'Lo usamos para poner primero lo que más te sirve. No esconde nada.' }), chipsTemas),
    el('fieldset', {}, el('legend', { id: 'lFuentes', text: 'Fuentes que seguís' }), chipsFuentes),
    el('fieldset', { class: 'privacidad' }, el('legend', { text: 'Privacidad' }),
      el('label', { class: 'check', for: 'pUso' }, usoBox,
        el('span', {}, el('strong', { text: 'Compartir uso anónimo. ' }),
          'Contamos qué piezas se abren, guardan y agendan, junto con tu rubro y tamaño, para mostrarles a las fuentes qué contenido sirve. No enviamos tu nombre ni datos de contacto, y podés desactivarlo cuando quieras.'))),
    err, guardar);

  const kids = [
    bienvenida
      ? el('header', { class: 'bienvenida' },
        el('p', { class: 'marca-chica', text: APP }),
        el('h1', { text: 'Todo lo que UCIP, ATICMA y Producto Local tienen para tu empresa, en un solo lugar.' }),
        el('p', { text: 'Cursos, rondas de negocios, convocatorias, beneficios y datos del sector. Contanos un poco de tu empresa y te mostramos primero lo que te sirve.' }))
      : el('header', { class: 'pag-head' }, el('h1', { text: 'Perfil' })),
    form
  ];
  if (!bienvenida) {
    kids.push(el('section', { class: 'zona-datos' }, el('h2', { class: 'sec', text: 'Tus datos' }),
      el('p', { text: 'Tu perfil, lo guardado y lo visto viven en este celular. Si borrás tus datos, también eliminamos tu perfil anónimo del servidor.' }),
      el('button', { type: 'button', class: 'btn peligro', onclick: async ev => {
        const b = ev.currentTarget;
        if (b.dataset.confirmar !== '1') { b.dataset.confirmar = '1'; b.textContent = 'Tocá de nuevo para borrar todo'; return; }
        b.disabled = true;
        const okServidor = await borrarMisDatos();
        store.reset();
        toast(okServidor ? 'Datos borrados' : 'Borramos los datos de este celular. El servidor no respondió: probá de nuevo más tarde.', '', 6000);
        location.hash = '#/bienvenida';
      } }, icon('trash'), 'Borrar mis datos')),
    el('p', { class: 'nota' }, el('a', { href: '#/admin', text: 'Panel de administración' })));
  }
  root.replaceChildren(...kids);
}

const campo = (id, label, input) => el('div', { class: 'campo' }, el('label', { for: id, text: label }), input);
