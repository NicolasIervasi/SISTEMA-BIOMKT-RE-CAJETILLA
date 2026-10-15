// Fuentes: qué es cada institución, cómo contactarla y seguir o dejar de seguir.
import { FUENTES, FUENTE_IDS } from '../config.js';
import { vigentesPorFuente } from '../content.js';
import { el, ext, icon, toast } from '../dom.js';
import { plural } from '../fmt.js';
import { perfilCambiado } from '../api.js';
import * as store from '../store.js';

export const title = 'Fuentes';

export function mount(root, ctx) {
  const vig = vigentesPorFuente(ctx.items, Date.now());
  const tarjetas = FUENTE_IDS.map(id => {
    const F = FUENTES[id];
    const btn = el('button', { type: 'button', class: 'btn seguir' });
    const pintar = () => {
      const on = store.state.sigue.includes(id);
      btn.setAttribute('aria-pressed', String(on));
      btn.replaceChildren(icon(on ? 'check' : 'plus'), on ? 'Siguiendo' : 'Seguir');
    };
    btn.addEventListener('click', () => {
      const on = store.toggleSigue(id);
      perfilCambiado();
      toast(on ? `Ahora seguís a ${F.corto}` : `Dejaste de seguir a ${F.corto}`);
      pintar();
    });
    pintar();
    return el('article', { class: 'fuente-card', style: { '--c': F.color } },
      el('div', { class: 'fuente-top' },
        el('div', {}, el('h2', { text: F.corto }), el('p', { class: 'fuente-nombre', text: F.nombre })),
        btn),
      el('p', { text: F.que }),
      el('dl', { class: 'datos compacto' },
        el('div', {}, el('dt', { text: 'Publica' }), el('dd', { text: F.publica })),
        el('div', {}, el('dt', { text: 'Contacto' }), el('dd', { text: F.contacto }))),
      el('div', { class: 'fuente-links' },
        el('a', { class: 'cuenta link', href: '#/explorar', onclick: () => { store.state.fuenteFiltro = id; store.save(); } }, `Ver ${plural(vig[id] || 0, 'pieza vigente', 'piezas vigentes')}`),
        ext(F.web, { class: 'link' }, 'Sitio oficial', icon('arrow-up-right')),
        F.redes.map(([n, u]) => ext(u, { class: 'link', text: n }))));
  });
  root.replaceChildren(
    el('header', { class: 'pag-head' }, el('h1', { text: 'Fuentes' }),
      el('p', { text: 'Las instituciones cuyo contenido reunimos. Seguí las que te sirven: el inicio y los avisos se arman con esas.' })),
    el('div', { class: 'fuentes' }, tarjetas),
    el('section', { class: 'proximas' }, el('h2', { class: 'sec', text: 'Próximamente' }),
      el('p', { text: 'FortaleceRSE, Unión Industrial (UIM), CAMECO y las cámaras sectoriales de UCIP.' })),
    el('p', { class: 'nota', text: 'Red Empresas MDP es una plataforma independiente: no está afiliada a UCIP, ATICMA ni al Municipio de General Pueyrredon. Resumimos con palabras propias lo que publican y enlazamos siempre al original.' }));
}
