/**
 * Kurze Rückmeldung am unteren Rand, optional mit Aktion („Rückgängig“).
 *
 * Lage (nie über Bedienelementen):
 * - Über der höchsten sichtbaren festen Leiste mit `data-toast-avoid` (Tab-Leiste,
 *   Aktionsleiste, Sheet-Fußzeile): unten = Leistenhöhe (inkl. Safe Area) + 12 px.
 * - Gibt es eine sichtbare ruhige Fläche mit `data-toast-anchor` (z. B. Animation oder
 *   Pausen-Ring im Live-Training), sitzt der Hinweis oben auf dieser Fläche – nicht über
 *   Steppern und Knöpfen.
 * - Ohne beides: Safe Area + 12 px.
 */

import { h } from './dom.js';

const DEFAULT_DURATION = 3200;
const WITH_ACTION_DURATION = 5200;
const GAP = 12;

/** @type {{el: HTMLElement, timer: number}|null} */
let current = null;

/** @param {Element} el */
const visible = (el) => el instanceof HTMLElement && !el.hidden && el.getClientRects().length > 0 && !el.closest('[inert]');

/**
 * Lage des Hinweises: oben auf einer Ankerfläche oder über der höchsten Leiste.
 * @returns {{top: number}|{bottom: number}|null}   null = Standard (Safe Area + 12 px)
 */
export function toastPlacement() {
  const vh = window.innerHeight;
  for (const el of document.querySelectorAll('[data-toast-anchor]')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height >= 64 && r.top >= 0 && r.top < vh) return { top: Math.round(r.top + GAP / 2) };
  }
  let offset = 0;
  for (const el of document.querySelectorAll('[data-toast-avoid]')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.top >= vh) continue;
    offset = Math.max(offset, vh - r.top);
  }
  return offset ? { bottom: Math.round(offset + GAP) } : null;
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
  const place = toastPlacement();
  if (place && 'top' in place) {
    el.classList.add('is-top');
    el.style.setProperty('--toast-top', `${place.top}px`);
  } else if (place) {
    el.style.setProperty('--toast-bottom', `${place.bottom}px`);
  }
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
