/**
 * Bottom-Sheet: von unten, mit Griff zum Herunterziehen, Fokusfalle, Esc zum Schließen,
 * Hintergrund wird `inert`. Mehrere Sheets können gestapelt werden.
 */

import { h } from './dom.js';
import { icon } from './icons.js';
import { haptic, prefersReducedMotion } from '../core/platform.js';
import { t } from '../data/texts/i18n.js';
import { dismissToast } from './toast.js';

/** @type {Sheet[]} */
const stack = [];

/** Pixel, ab denen Herunterziehen schließt (oder schnelles Wischen). */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.6; // px/ms

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @typedef {object} Sheet
 * @property {HTMLElement} el        Wurzel (Hintergrund + Panel)
 * @property {HTMLElement} body      Inhaltsbereich
 * @property {HTMLElement} footer    feste Fußzeile (Aktionen)
 * @property {(reason?: string) => Promise<void>} close
 * @property {(title: string) => void} setTitle
 */

/**
 * @param {object} options
 * @param {string} options.title
 * @param {Node|Node[]} [options.content]
 * @param {Node|Node[]} [options.actions]     Knöpfe in der festen Fußzeile
 * @param {boolean} [options.hideTitle]        Titel nur für Screenreader
 * @param {boolean} [options.dismissible]      false: kein Schließen per Wischen/Esc/Hintergrund
 * @param {'auto'|'tall'} [options.size]
 * @param {string} [options.className]
 * @param {(reason: string) => void} [options.onClose]
 * @returns {Sheet}
 */
export function openSheet({ title, content = [], actions, hideTitle = false, dismissible = true, size = 'auto', className, onClose }) {
  const returnFocus = /** @type {HTMLElement|null} */ (document.activeElement);
  const titleId = `sheet-title-${stack.length + 1}-${Date.now()}`;

  const heading = h('h2', { id: titleId, class: ['sheet-title', hideTitle && 'visually-hidden'], text: title });
  const closeButton = dismissible
    ? h('button', { type: 'button', class: 'icon-button sheet-close', 'aria-label': t('common.close') }, icon('close'))
    : null;
  const handle = h('div', { class: 'sheet-handle', 'aria-hidden': 'true' });
  const header = h('header', { class: 'sheet-header' }, handle, heading, closeButton);
  const body = h('div', { class: 'sheet-body' }, content);
  const footer = h('footer', { class: 'sheet-footer', 'data-toast-avoid': '' }, actions ?? []);
  footer.hidden = !actions;
  const panel = h(
    'div',
    { class: ['sheet-panel', `sheet-${size}`, className], role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
    header,
    body,
    footer,
  );
  const scrim = h('div', { class: 'sheet-scrim' });
  const el = h('div', { class: 'sheet' }, scrim, panel);
  el.style.setProperty('--sheet-level', String(stack.length));

  let closing = false;

  /** @type {Sheet} */
  const sheet = {
    el,
    body,
    footer,
    setTitle: (t) => {
      heading.textContent = t;
    },
    async close(reason = 'api') {
      if (closing) return;
      closing = true;
      document.removeEventListener('keydown', onKey, true);
      el.classList.remove('is-open');
      el.classList.add('is-closing');
      await waitForTransition(panel);
      el.remove();
      stack.splice(stack.indexOf(sheet), 1);
      updateInert();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      onClose?.(reason);
    },
  };

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (stack[stack.length - 1] !== sheet) return;
    if (e.key === 'Escape' && dismissible) {
      e.preventDefault();
      sheet.close('escape');
    } else if (e.key === 'Tab') {
      trapFocus(panel, e);
    }
  }

  closeButton?.addEventListener('click', () => sheet.close('button'));
  if (dismissible) scrim.addEventListener('click', () => sheet.close('scrim'));
  if (dismissible) enableDrag(panel, header, () => sheet.close('drag'));
  document.addEventListener('keydown', onKey, true);

  stack.push(sheet);
  // Ein offener Hinweis gehört zum Bildschirm darunter, nicht über das neue Sheet.
  dismissToast();
  document.body.append(el);
  updateInert();
  requestAnimationFrame(() => {
    el.classList.add('is-open');
    const first = /** @type {HTMLElement|null} */ (body.querySelector('[autofocus]') ?? null);
    (first ?? panel).focus({ preventScroll: true });
  });
  haptic('tap');
  return sheet;
}

/** Alles außer dem obersten Sheet für Tastatur und Screenreader sperren. */
function updateInert() {
  const top = stack[stack.length - 1];
  const app = document.querySelector('.app');
  if (app) app.inert = !!top;
  for (const s of stack) s.el.inert = s !== top;
  document.documentElement.classList.toggle('has-sheet', !!top);
}

/**
 * @param {HTMLElement} container
 * @param {KeyboardEvent} e
 */
function trapFocus(container, e) {
  const items = /** @type {HTMLElement[]} */ ([...container.querySelectorAll(FOCUSABLE)]).filter((x) => x.offsetParent !== null);
  if (!items.length) {
    e.preventDefault();
    container.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === container)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Herunterziehen am Kopf (Griff und Titel). Schließt ab CLOSE_DISTANCE oder schnellem Wisch.
 * @param {HTMLElement} panel
 * @param {HTMLElement} grip
 * @param {() => void} onClose
 */
function enableDrag(panel, grip, onClose) {
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let dragging = false;

  grip.addEventListener('pointerdown', (e) => {
    if (/** @type {HTMLElement} */ (e.target).closest('button')) return;
    dragging = true;
    startY = lastY = e.clientY;
    lastT = e.timeStamp;
    velocity = 0;
    grip.setPointerCapture(e.pointerId);
    panel.classList.add('is-dragging');
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = Math.max(0, e.clientY - startY);
    const dt = Math.max(1, e.timeStamp - lastT);
    velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = e.timeStamp;
    panel.style.setProperty('--drag', `${dy}px`);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('is-dragging');
    const dy = lastY - startY;
    if (dy > CLOSE_DISTANCE || (dy > 24 && velocity > CLOSE_VELOCITY)) onClose();
    else panel.style.setProperty('--drag', '0px');
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
}

/**
 * Auf das Ende der Schließ-Animation warten (mit Sicherheitsnetz).
 * @param {HTMLElement} el
 */
function waitForTransition(el) {
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 400);
    el.addEventListener(
      'transitionend',
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
      { once: true },
    );
  });
}

/** Alle offenen Sheets schließen (z. B. nach dem Löschen aller Daten). */
export const closeAllSheets = () => Promise.all([...stack].reverse().map((s) => s.close('reset')));

/** Ist gerade ein Sheet offen? */
export const hasOpenSheet = () => stack.length > 0;

/**
 * Bestätigungs-Sheet.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.confirmLabel
 * @param {string} [options.cancelLabel]
 * @param {boolean} [options.danger]
 * @returns {Promise<boolean>}
 */
export function confirmSheet({ title, message, confirmLabel, cancelLabel = t('common.cancel'), danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const confirm = h('button', { type: 'button', class: ['button', danger ? 'button-danger' : 'button-primary'], text: confirmLabel });
    const cancel = h('button', { type: 'button', class: 'button button-quiet', text: cancelLabel });
    const sheet = openSheet({
      title,
      content: h('p', { class: 'sheet-text', text: message }),
      actions: [cancel, confirm],
      onClose: () => resolve(result),
    });
    confirm.addEventListener('click', () => {
      result = true;
      haptic(danger ? 'warning' : 'select');
      sheet.close('confirm');
    });
    cancel.addEventListener('click', () => sheet.close('cancel'));
  });
}
