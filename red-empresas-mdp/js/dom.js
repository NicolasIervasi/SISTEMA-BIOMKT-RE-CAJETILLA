// Helpers de interfaz: elementos, iconos, avisos y hoja de opciones. Todo el texto de usuario entra con textContent.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) n.style.setProperty(p, val);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}

export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ico ' + cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

// Link externo: siempre en pestaña nueva y sin pasar la página de origen
export const ext = (href, props, ...kids) => el('a', { href, target: '_blank', rel: 'noopener noreferrer', ...props }, ...kids);

export function toast(message, kind = '', ms = 3200) {
  const box = $('#toasts');
  const t = el('div', { class: 'toast ' + kind, role: 'status', text: message });
  box.append(t);
  setTimeout(() => t.remove(), ms);
  while (box.children.length > 3) box.firstChild.remove();
}

// Hoja de opciones sobre <dialog id="hoja">: abajo en el celular, centrada en pantallas grandes.
export function hoja(titulo, contenido) {
  const dlg = $('#hoja');
  if (dlg.open) dlg.close();
  dlg.replaceChildren(
    el('div', { class: 'hoja-head' }, el('h2', { id: 'hojaTit', text: titulo }),
      el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar', onclick: () => dlg.close() }, icon('x'))),
    el('div', { class: 'hoja-body' }, contenido));
  dlg.showModal();
  return () => dlg.close();
}

export async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

// Descarga de un archivo generado en el navegador (el .ics del calendario)
export function descargar(nombre, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10e3);
}
