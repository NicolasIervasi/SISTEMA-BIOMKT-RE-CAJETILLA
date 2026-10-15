// Estadísticas del panel (puras). Entran los lotes de eventos anónimos y los perfiles de empresa; sale lo que se le muestra
// a cada fuente: alcance, vistas, guardados, clics a inscripción y agendados, por fuente y por pieza.
//   lote:    { eid, ev: [[tipo, itemId, at]] }      eid = identificador anónimo de la empresa (al azar, generado en su celular)
//   empresa: { eid, rubro, tamano, sigue: [], temas: [] }
import { DIA, FUENTE_IDS } from './config.js';
import { diaAR } from './fmt.js';

export const EV_TIPOS = ['abrir', 'ver', 'guardar', 'quitar', 'ir', 'agendar', 'compartir'];
export const APP_ID = 'app';   // id de los eventos 'abrir' (no es una pieza)
const vacio = () => ({ vistas: 0, alcance: 0, guardados: 0, clics: 0, agendados: 0, compartidos: 0 });
const CAMPO = { ver: 'vistas', guardar: 'guardados', ir: 'clics', agendar: 'agendados', compartir: 'compartidos' };

export function agregar({ lotes = [], empresas = [], items = [], now, dias = 30 }) {
  const desde = now - dias * DIA;
  const porId = new Map(items.map(i => [i.id, i]));
  const rubroDe = new Map(empresas.map(e => [e.eid, e.rubro || 'otro']));
  const activas = new Map();                         // eid -> último evento
  const diasRecientes = new Map();                   // eid -> Set(día) en los últimos 7 días
  const porDia = new Map();                          // diaAR -> Set(eid)
  const its = new Map();                             // itemId -> { ...vacio, lectores: Set }
  const lectoresFuente = new Map(FUENTE_IDS.map(f => [f, new Set()]));

  for (const l of lotes) {
    if (!l || typeof l.eid !== 'string' || !Array.isArray(l.ev)) continue;
    for (const e of l.ev) {
      if (!Array.isArray(e)) continue;
      const [t, id, at] = e;
      if (!EV_TIPOS.includes(t) || typeof id !== 'string' || !(at >= desde && at <= now + 3600e3)) continue;
      activas.set(l.eid, Math.max(activas.get(l.eid) || 0, at));
      const d = diaAR(at);
      if (!porDia.has(d)) porDia.set(d, new Set());
      porDia.get(d).add(l.eid);
      if (at >= now - 7 * DIA) {
        if (!diasRecientes.has(l.eid)) diasRecientes.set(l.eid, new Set());
        diasRecientes.get(l.eid).add(d);
      }
      if (t === 'abrir' || id === APP_ID) continue;
      if (!its.has(id)) its.set(id, { ...vacio(), lectores: new Set() });
      const x = its.get(id);
      if (CAMPO[t]) x[CAMPO[t]]++;
      if (t === 'quitar') x.guardados = Math.max(0, x.guardados - 1);
      if (t === 'ver') {
        x.lectores.add(l.eid);
        const f = porId.get(id)?.fuente;
        if (f && lectoresFuente.has(f)) lectoresFuente.get(f).add(l.eid);
      }
    }
  }

  const porItem = [...its].map(([id, x]) => {
    const i = porId.get(id);
    return { id, titulo: i?.titulo || `(pieza borrada: ${id})`, fuente: i?.fuente || '', tipo: i?.tipo || '',
      vistas: x.vistas, alcance: x.lectores.size, guardados: x.guardados, clics: x.clics, agendados: x.agendados, compartidos: x.compartidos };
  }).sort((a, b) => b.alcance - a.alcance || b.guardados - a.guardados || b.clics - a.clics);

  const porFuente = {};
  for (const f of FUENTE_IDS) {
    const t = vacio();
    for (const x of porItem.filter(p => p.fuente === f)) for (const k of Object.keys(t)) if (k !== 'alcance') t[k] += x[k];
    const lectores = lectoresFuente.get(f);
    t.alcance = lectores.size;
    t.seguidores = empresas.filter(e => (e.sigue || []).includes(f)).length;
    t.piezas = items.filter(i => i.fuente === f).length;
    t.rubros = contar([...lectores].map(eid => rubroDe.get(eid) || 'sin-dato'));
    porFuente[f] = t;
  }

  const hoy = diaAR(now);
  const serie = Array.from({ length: dias }, (_, k) => {
    const d = hoy - (dias - 1 - k);
    return { dia: d, activas: porDia.get(d)?.size || 0 };
  });

  const enVentana = n => [...activas.values()].filter(at => at >= now - n * DIA).length;
  const sum = k => porItem.reduce((a, x) => a + x[k], 0);
  return {
    dias,
    totales: {
      registradas: empresas.length,
      activas7: enVentana(7),
      recurrentes7: [...diasRecientes.values()].filter(s => s.size >= 2).length,   // abrieron la app 2 o más días en la semana
      activas: activas.size,
      vistas: sum('vistas'), guardados: sum('guardados'), clics: sum('clics'), agendados: sum('agendados'), compartidos: sum('compartidos')
    },
    porFuente,
    porItem,
    rubros: contar(empresas.map(e => e.rubro || 'sin-dato')),
    tamanos: contar(empresas.map(e => e.tamano || 'sin-dato')),
    serie
  };
}

function contar(arr) {
  const m = new Map();
  for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
  return [...m].map(([clave, n]) => ({ clave, n })).sort((a, b) => b.n - a.n || a.clave.localeCompare(b.clave));
}

// Lo que va en el informe de una fuente: sus números y sus piezas más leídas.
export function informe(agg, fuente, max = 5) {
  return { ...agg.porFuente[fuente], top: agg.porItem.filter(x => x.fuente === fuente).slice(0, max), dias: agg.dias };
}
