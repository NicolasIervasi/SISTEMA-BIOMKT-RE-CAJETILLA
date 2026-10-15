// Agendar en el calendario del celular: archivo .ics (iPhone, Outlook, cualquier calendario) y link de Google Calendar.
// Puro: recibe la pieza y devuelve textos y URLs.
import { DIA } from './config.js';
import { fechaCorta, isoDia, ok, ts } from './fmt.js';
import { sesiones } from './content.js';

// Qué se puede agendar de una pieza: el evento (o la primera clase, con repetición semanal) y/o el día de cierre.
export function entradas(item, now) {
  const out = [];
  const s = sesiones(item);
  // Un curso que ya empezó no se ofrece para agendar (no se suma uno a mitad de cursada); un evento de varios días en curso sí
  const vigente = s.length && (s[0].inicio >= now || (item.todoElDia && s[s.length - 1].fin >= now));
  if (vigente) {
    out.push({
      clave: 'evento',
      label: s.length > 1 ? `Agendar las clases (semanales hasta el ${fechaCorta(s[s.length - 1].inicio)})` : 'Agendar el evento',
      titulo: item.titulo,
      inicio: s[0].inicio, fin: s[0].fin,
      todoElDia: !!item.todoElDia,
      repetir: s.length > 1 ? s.length : 0
    });
  }
  const c = ts(item.cierre);
  if (ok(c) && c >= now) {
    out.push({ clave: 'cierre', label: 'Recordarme el cierre', titulo: `Cierra: ${item.titulo}`, inicio: c, fin: c, todoElDia: true, repetir: 0 });
  }
  return out;
}

const utc = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');    // 20261022T210000Z
const fechaAR = ms => isoDia(ms).replace(/-/g, '');                                          // 20261022
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Líneas de más de 75 octetos se pliegan (RFC 5545): se cuenta en bytes UTF-8 y nunca se parte una letra con tilde.
const enc = new TextEncoder();
const plegar = line => {
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) { out.push(cur); cur = ' '; bytes = 1; }   // la continuación empieza con un espacio, que también cuenta
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
};

function rango(e) {
  if (e.todoElDia) {
    const finDia = Math.max(e.fin, e.inicio);
    return { ini: fechaAR(e.inicio), fin: fechaAR(finDia + DIA) };   // DTEND es exclusivo en eventos de día completo
  }
  return { ini: utc(e.inicio), fin: utc(e.fin) };
}

export function descripcion(item, url) {
  const datos = (item.datos || []).map(([k, v]) => `${k}: ${v}`).join('\n');
  return [item.resumen, datos, item.accion?.url ? `Inscripción: ${item.accion.url}` : '', `Fuente: ${item.url}`, url ? `En la app: ${url}` : '']
    .filter(Boolean).join('\n\n');
}

export function ics(item, e, { url = '', now = Date.now() } = {}) {
  const r = rango(e);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Red Empresas MDP//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${item.id}-${e.clave}@redempresasmdp`,
    `DTSTAMP:${utc(now)}`,
    e.todoElDia ? `DTSTART;VALUE=DATE:${r.ini}` : `DTSTART:${r.ini}`,
    e.todoElDia ? `DTEND;VALUE=DATE:${r.fin}` : `DTEND:${r.fin}`,
    e.repetir ? `RRULE:FREQ=WEEKLY;COUNT=${e.repetir}` : '',
    `SUMMARY:${esc(e.titulo)}`,
    `DESCRIPTION:${esc(descripcion(item, url))}`,
    item.lugar ? `LOCATION:${esc(item.lugar)}` : '',
    `URL:${item.accion?.url || item.url}`,
    // aviso un día antes (en el cierre) o dos horas antes (en eventos)
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)}`, `TRIGGER:${e.clave === 'cierre' ? '-P1D' : '-PT2H'}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.map(plegar).join('\r\n') + '\r\n';
}

export function googleUrl(item, e, { url = '' } = {}) {
  const r = rango(e);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${r.ini}/${r.fin}`,
    details: descripcion(item, url),
    location: item.lugar || '',
    ctz: 'America/Argentina/Buenos_Aires'
  });
  if (e.repetir) p.set('recur', `RRULE:FREQ=WEEKLY;COUNT=${e.repetir}`);
  return `https://calendar.google.com/calendar/render?${p}`;
}
