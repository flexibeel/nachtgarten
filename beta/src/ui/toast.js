/**
 * Kurze Rückmeldung unten am Rand, optional mit Aktion („Rückgängig“).
 * Liegt immer über Sheets und Leisten: Die Unterkante wird über allen sichtbaren
 * Elementen mit `data-toast-avoid` (Tab-Leiste, Aktionsleiste, Sheet-Fußzeile) platziert.
 */

import { h } from './dom.js';

const DEFAULT_DURATION = 3200;
const WITH_ACTION_DURATION = 5200;
const GAP = 12;

/** @type {{el: HTMLElement, timer: number}|null} */
let current = null;

/**
 * Abstand zur unteren Kante: über dem höchsten sichtbaren Hindernis.
 * @returns {number}
 */
function bottomOffset() {
  const vh = window.innerHeight;
  let offset = 0;
  for (const el of document.querySelectorAll('[data-toast-avoid]')) {
    if (!(el instanceof HTMLElement) || el.hidden || !el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.top >= vh) continue;
    offset = Math.max(offset, vh - r.top);
  }
  return offset;
}

/**
 * @param {string} message
 * @param {{action?: {label: string, onClick: () => void}, duration?: number}} [options]
 */
export function toast(message, { action, duration } = {}) {
  dismissToast();
  const label = h('span', { class: 'toast-text', text: message });
  const button = action ? h('button', { type: 'button', class: 'toast-action', text: action.label }) : null;
  const el = h('div', { class: ['toast', button && 'has-action'], role: 'status', 'aria-live': 'polite' }, label, button);
  el.style.setProperty('--toast-bottom', `${bottomOffset() + GAP}px`);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));

  button?.addEventListener('click', () => {
    action.onClick();
    dismissToast();
  });

  const timer = window.setTimeout(dismissToast, duration ?? (action ? WITH_ACTION_DURATION : DEFAULT_DURATION));
  current = { el, timer };
}

/** Aktuellen Hinweis ausblenden. */
export function dismissToast() {
  if (!current) return;
  const { el, timer } = current;
  current = null;
  clearTimeout(timer);
  el.classList.remove('is-visible');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 400);
}
