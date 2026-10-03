// Helpers de interfaz: elementos, iconos, avisos y diálogos. Todo el texto de usuario entra con textContent.
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

export function toast(message, kind = '', ms = 3800) {
  const box = $('#toasts');
  const t = el('div', { class: 'toast ' + kind, text: message });
  box.append(t);
  setTimeout(() => t.remove(), ms);
  while (box.children.length > 3) box.firstChild.remove();
}

// Diálogo genérico sobre el <dialog id="dlg">. Resuelve con el valor del botón (o undefined si se cierra).
// action.onClick puede devolver false para dejarlo abierto (validación).
// La promesa se resuelve en el mismo instante en que se cierra: el evento "close" del <dialog> llega en una tarea posterior.
let finishCurrent = null;
export function openDialog({ title, body, actions = [], size }) {
  const dlg = $('#dlg');
  if (dlg.open) { finishCurrent?.(''); dlg.close(); }
  dlg.replaceChildren();
  dlg.style.width = size ? `min(${size}px, calc(100vw - 24px))` : '';
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; if (finishCurrent === finish) finishCurrent = null; resolve(v || undefined); };
    const closeWith = v => { finish(v); if (dlg.open) dlg.close(v); };
    finishCurrent = finish;
    const head = el('div', { class: 'dlg-head' },
      el('h2', { id: 'dlgTitle', text: title }),
      el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar', onclick: () => closeWith('') }, icon('x')));
    const foot = el('div', { class: 'dlg-foot' });
    dlg.append(head, el('div', { class: 'dlg-body' }, body), foot);
    for (const a of actions) {
      foot.append(el('button', {
        class: 'btn ' + (a.kind || ''), type: 'button', text: a.label,
        onclick: async ev => {
          if (a.onClick && (await a.onClick(ev)) === false) return;
          closeWith(a.value ?? '');
        }
      }));
    }
    if (!actions.length) foot.hidden = true;
    // Esc o clic afuera. Un "close" atrasado del diálogo anterior llega con otro ya abierto: se ignora.
    const onClose = () => { if (dlg.open) return; dlg.removeEventListener('close', onClose); finish(dlg.returnValue); };
    dlg.addEventListener('close', onClose);
    dlg.returnValue = '';
    dlg.showModal();
    const first = dlg.querySelector('input:not([type=hidden]), textarea, select');
    if (first) first.focus();
  });
}
export function closeDialog(value = '') {
  const d = $('#dlg');
  finishCurrent?.(value);
  if (d.open) d.close(value);
}

export async function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  const v = await openDialog({
    title, size: 440, body: el('p', { text: message }),
    actions: [{ label: 'Cancelar', value: '' }, { label: confirmLabel, kind: danger ? 'primary danger' : 'primary', value: 'ok' }]
  });
  return v === 'ok';
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* método viejo */ }
  const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
  ta.value = text; document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

export function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
