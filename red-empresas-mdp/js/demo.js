// Datos de uso INVENTADOS para ver el panel lleno en modo local (antes de tener empresas reales).
// Solo se cargan a pedido, desde el panel, y la pantalla avisa que son de ejemplo. Nunca se mandan al servidor.
import { DIA, FUENTE_IDS, RUBROS, TAMANOS, TEMAS } from './config.js';
import { estado } from './content.js';

const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function datosDeEjemplo(items, now, { empresas = 34, dias = 30 } = {}) {
  const r = rand(20261015);
  const rubros = Object.keys(RUBROS), tamanos = Object.keys(TAMANOS), temas = Object.keys(TEMAS);
  const emps = Array.from({ length: empresas }, (_, k) => ({
    eid: `ejemplo-${String(k).padStart(10, '0')}`,
    rubro: k < 9 ? 'comercio' : k < 14 ? 'gastronomia' : k < 18 ? 'industria' : pick(r, rubros),
    tamano: pick(r, tamanos.slice(0, 4)),
    temas: temas.filter(() => r() < 0.35),
    sigue: FUENTE_IDS.filter(() => r() < 0.8)
  }));
  const vigentes = items.filter(i => estado(i, now).clave !== 'pasado');
  const lotes = [];
  for (const e of emps) {
    const ev = [];
    const visitas = 2 + Math.floor(r() * 10);
    for (let v = 0; v < visitas; v++) {
      const at = now - Math.floor(r() * dias * DIA);
      ev.push(['abrir', 'app', at - 30e3]);
      const candidatos = vigentes.filter(i => e.sigue.includes(i.fuente));
      for (let n = 0; n < 1 + Math.floor(r() * 3) && candidatos.length; n++) {
        const i = pick(r, candidatos);
        const afin = (i.rubros || []).includes(e.rubro) ? 0.25 : 0;
        ev.push(['ver', i.id, at + n * 60e3]);
        if (r() < 0.22 + afin) ev.push(['guardar', i.id, at + n * 60e3 + 5e3]);
        if (i.accion && r() < 0.15 + afin) ev.push(['ir', i.id, at + n * 60e3 + 9e3]);
        if (r() < 0.08) ev.push(['agendar', i.id, at + n * 60e3 + 12e3]);
        if (r() < 0.05) ev.push(['compartir', i.id, at + n * 60e3 + 15e3]);
      }
    }
    lotes.push({ eid: e.eid, ev });
  }
  return { lotes, empresas: emps, ejemplo: true };
}
