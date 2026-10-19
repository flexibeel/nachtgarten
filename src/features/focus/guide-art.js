/**
 * Schlichte Skizzen für die Anleitung „Instagram-Bremse einrichten“: ein Handy-Umriss mit
 * hervorgehobener Stelle je Schritt. Keine Screenshots, keine Logos, kein Text im Bild.
 * Farben über CSS-Klassen (ga-*), damit Hell und Dunkel stimmen.
 */

import { svg } from '../../ui/dom.js';

const phone = (inner) =>
  `<svg class="guide-art" viewBox="0 0 64 104" aria-hidden="true" focusable="false"><rect class="ga-phone" x="2" y="2" width="60" height="100" rx="11"/><rect class="ga-notch" x="24" y="7" width="16" height="4" rx="2"/>${inner}</svg>`;

const row = (y, hi = false, extra = '') =>
  `<rect class="${hi ? 'ga-hi' : 'ga-row'}" x="9" y="${y}" width="46" height="9" rx="3"/>${extra}`;

/** Skizzen je Schritt (0 = Kurzbefehle öffnen … 5 = fertig). */
const ART = [
  // App-Raster, eine App (Kurzbefehle: zwei versetzte Rauten) hervorgehoben
  phone(
    [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<rect class="${r === 1 && c === 1 ? 'ga-hi' : 'ga-row'}" x="${11 + c * 15}" y="${22 + r * 17}" width="11" height="11" rx="3"/>`)).join('') +
      '<path class="ga-mark" d="M29.5 41.5l3-3 3 3-3 3z M31 40l3-3 3 3"/>',
  ),
  // Tab-Leiste unten, mittlerer Tab hervorgehoben
  phone(`${row(20)}${row(33)}${row(46)}<rect class="ga-bar" x="6" y="84" width="52" height="12" rx="4"/><circle class="ga-dot" cx="17" cy="90" r="2.5"/><circle class="ga-hi" cx="32" cy="90" r="4"/><circle class="ga-dot" cx="47" cy="90" r="2.5"/>`),
  // „+“ oben rechts, darunter die Zeile „App“
  phone(`<circle class="ga-hi" cx="50" cy="20" r="5.5"/><path class="ga-plus" d="M50 17v6M47 20h6"/>${row(34)}${row(47, true)}${row(60)}`),
  // Instagram gewählt, „Wird geöffnet“ angehakt, „Sofort ausführen“ an
  phone(`${row(20, false, '<circle class="ga-dot" cx="15" cy="24.5" r="2.5"/>')}${row(36, true, '<path class="ga-check" d="M44 40.5l2.5 2.5 5-5"/>')}<rect class="ga-row" x="9" y="56" width="46" height="9" rx="3"/><rect class="ga-switch" x="42" y="58" width="10" height="5" rx="2.5"/><circle class="ga-knob" cx="49.5" cy="60.5" r="2"/>`),
  // Aktion „URL öffnen“ mit Adressfeld
  phone(`<rect class="ga-hi" x="9" y="26" width="46" height="26" rx="5"/><rect class="ga-field" x="13" y="38" width="38" height="8" rx="2.5"/><circle class="ga-dot" cx="16" cy="32" r="2.5"/>${row(62)}`),
  // Ergebnis: ruhige Frage mit drei Knöpfen
  phone(`<rect class="ga-title" x="14" y="22" width="36" height="6" rx="3"/><rect class="ga-hi" x="9" y="44" width="46" height="10" rx="4"/><rect class="ga-row" x="9" y="58" width="46" height="10" rx="4"/><rect class="ga-ghost" x="9" y="72" width="46" height="10" rx="4"/>`),
];

/** @param {number} index */
export const stepIllustration = (index) => svg(ART[index] ?? ART[ART.length - 1]);
