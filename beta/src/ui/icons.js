/**
 * Linien-Icons im einheitlichen Stil: 24er Raster, 1,75 Strich, runde Enden, `currentColor`.
 * Nur vertrauenswürdige, hier definierte Pfade.
 */

import { svg } from './dom.js';

/** @type {Readonly<Record<string, string>>} */
const PATHS = Object.freeze({
  heute:
    '<path d="M12 3.5v1.6M12 18.9v1.6M5.99 5.99l1.13 1.13M16.88 16.88l1.13 1.13M3.5 12h1.6M18.9 12h1.6M5.99 18.01l1.13-1.13M16.88 7.12l1.13-1.13"/><circle cx="12" cy="12" r="4"/>',
  training:
    '<path d="M6.5 7.5v9M3.75 9.5v5M17.5 7.5v9M20.25 9.5v5M6.5 12h11"/>',
  fokus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5"/>',
  mama: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.25 4.25 0 0 1 12 6.9a4.25 4.25 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10Z"/>',
  ideen:
    '<path d="M9.25 17.5h5.5M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.53.4.85 1.03.85 1.7v1.5h5.5V16c0-.67.32-1.3.85-1.7A6 6 0 0 0 12 3.5Z"/>',
  feed: '<path d="M12 6.5c-1.8-1.3-4.5-2-7.5-2v13c3 0 5.7.7 7.5 2 1.8-1.3 4.5-2 7.5-2v-13c-3 0-5.7.7-7.5 2Zm0 0v13"/>',
  play: '<path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  chevronRight: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  chevronLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  chevronDown: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>',
  chevronUp: '<path d="m5.5 14.5 6.5-6.5 6.5 6.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15.5v-11m0 0L7.5 9M12 4.5 16.5 9M5 19.5h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5.25c0-.41.34-.75.75-.75h3.5c.41 0 .75.34.75.75V7M6.5 7l.8 11.6c.06.8.72 1.4 1.5 1.4h6.4c.78 0 1.44-.6 1.5-1.4L17.5 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.75v1.5M12 19.75v1.5M2.75 12h1.5M19.75 12h1.5M5.46 5.46l1.06 1.06M17.48 17.48l1.06 1.06M5.46 18.54l1.06-1.06M17.48 6.52l1.06-1.06"/>',
  moon: '<path d="M19.5 14.2A7.75 7.75 0 1 1 9.8 4.5a6.25 6.25 0 0 0 9.7 9.7Z"/>',
  system: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16a8 8 0 0 0 0-16Z" fill="currentColor" stroke="none"/>',
  edit: '<path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L15.8 4.7a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5l-4.5 1Z"/>',
  undo: '<path d="M9 7.5 5 11.5l4 4M5 11.5h9a5 5 0 0 1 0 10h-2"/>',
  sparkle: '<path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5ZM18.5 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-13 14Zm0 0 7-7"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  user: '<circle cx="12" cy="8.5" r="3.75"/><path d="M5 19.5c.8-3.2 3.6-5.25 7-5.25s6.2 2.05 7 5.25"/>',
  shield: '<path d="M12 3.5 5 6.25v5.5c0 4.2 2.9 7.4 7 8.75 4.1-1.35 7-4.55 7-8.75v-5.5L12 3.5Z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
  backspace: '<path d="M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12 9 5.5Z"/><path d="m11.5 9.5 5 5M16.5 9.5l-5 5"/>',
  minus: '<path d="M5 12h14"/>',
  star: '<path d="m12 4.2 2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 16.2l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 4.2Z"/>',
  starFilled: '<path fill="currentColor" d="m12 4.2 2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 16.2l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 4.2Z"/>',
  list: '<path d="M9 7h10.5M9 12h10.5M9 17h10.5"/><circle cx="5" cy="7" r=".9" fill="currentColor"/><circle cx="5" cy="12" r=".9" fill="currentColor"/><circle cx="5" cy="17" r=".9" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12.5" r="7.5"/><path d="M12 8.5v4l2.5 1.75M10 3h4"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8v.01"/>',
  share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M6.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  wind: '<path d="M4 9h10.5a2.5 2.5 0 1 0-2.5-2.5M4 13h14a2.5 2.5 0 1 1-2.5 2.5M4 17h6"/>',
  walk: '<circle cx="13" cy="4.75" r="1.75"/><path d="m9.5 21 2-6 2.5 2.5V21M8 12l2.5-4.5 4 1 2 3.5M10.5 7.5 9.5 12l2 3"/>',
  eye: '<path d="M2.75 12S6 5.75 12 5.75 21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16M9.9 6A9.6 9.6 0 0 1 12 5.75C18 5.75 21.25 12 21.25 12a16 16 0 0 1-2.6 3.4M14.1 14.2A3 3 0 0 1 9.8 9.9M6.5 7.5C4 9.3 2.75 12 2.75 12S6 18.25 12 18.25c1.4 0 2.7-.35 3.8-.9"/>',
  arrowLeft: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
  grip: '<circle cx="9" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
});

export const ICON_NAMES = Object.freeze(Object.keys(PATHS));

/**
 * SVG-Markup eines Icons (für Stellen, die Strings brauchen).
 * @param {string} name
 * @param {{size?: number, label?: string}} [options]
 */
export function iconMarkup(name, { size = 24, label } = {}) {
  const body = PATHS[name] ?? PATHS.sparkle;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

/**
 * Icon als Element.
 * @param {string} name
 * @param {{size?: number, label?: string}} [options]
 */
export const icon = (name, options) => svg(iconMarkup(name, options));
