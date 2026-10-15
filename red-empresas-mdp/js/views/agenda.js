// Agenda: lo que la empresa guardó, ordenado por cercanía.
import { armarAgenda } from '../content.js';
import { el } from '../dom.js';
import * as store from '../store.js';
import { tarjeta, vacio } from './comun.js';

export const title = 'Agenda';

export function mount(root, ctx) {
  const pintar = () => {
    const now = Date.now();
    const grupos = armarAgenda(ctx.items, store.state.guardados, now);
    const head = el('header', { class: 'pag-head' }, el('h1', { text: 'Mi agenda' }),
      el('p', { text: 'Lo que guardaste. Desde cada pieza podés pasarla al calendario del celular.' }));
    if (!grupos.length) {
      root.replaceChildren(head, vacio('Todavía no guardaste nada', 'Tocá la estrella en un curso, evento o beneficio y aparece acá, ordenado por fecha.',
        el('a', { class: 'btn primario', href: '#/', text: 'Ver el inicio' })));
      return;
    }
    root.replaceChildren(head, ...grupos.map(g => el('section', { class: 'grupo grupo-' + g.clave },
      el('h2', { class: 'sec', text: `${g.titulo} · ${g.items.length}` }),
      el('div', { class: 'lista' }, g.items.map(x => tarjeta(x, now, { sinResumen: g.clave === 'pasados', alCambiar: () => setTimeout(pintar, 250) }))))));
  };
  pintar();
}
