/**
 * Kleine DOM-Helfer. Texte werden immer als Text gesetzt (nie als HTML), damit
 * Eingaben der Nutzerin oder des Nutzers nie als Markup landen.
 * Nur vertrauenswürdige, im Code stehende SVG-Strings gehen über `svg()`.
 */

/**
 * @typedef {Node|string|number|false|null|undefined} Child
 * @typedef {Record<string, any>} Props
 *   class, text, html (nur für vertrauenswürdige Strings), dataset, style (Objekt),
 *   on: {click: fn, …}, aria-*, sonstige Attribute; Boolesches true → leeres Attribut,
 *   false/null → weggelassen.
 */

/**
 * Element erzeugen.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Props|null} [props]
 * @param {...(Child|Child[])} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props = null, ...children) {
  const el = document.createElement(tag);
  if (props) applyProps(el, props);
  append(el, children);
  return el;
}

/**
 * @param {HTMLElement} el
 * @param {Props} props
 */
function applyProps(el, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    else if (key === 'text') el.textContent = String(value);
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style') for (const [p, v] of Object.entries(value)) el.style.setProperty(p, String(v));
    else if (key === 'on') for (const [type, fn] of Object.entries(value)) el.addEventListener(type, fn);
    else if (key in el && typeof value !== 'string' && !key.startsWith('aria-')) /** @type {any} */ (el)[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
}

/**
 * Kinder anhängen (verschachtelte Listen, Strings und Zahlen erlaubt; falsy wird übersprungen).
 * @param {Element|DocumentFragment} parent
 * @param {(Child|Child[])[]} children
 */
export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/**
 * Inhalt ersetzen.
 * @param {Element} el
 * @param {...(Child|Child[])} children
 */
export function replace(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/**
 * SVG aus vertrauenswürdigem String.
 * @param {string} markup
 * @returns {SVGElement}
 */
export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return /** @type {SVGElement} */ (t.content.firstElementChild);
}

let idCounter = 0;
/**
 * Eindeutige Id für label/aria-Verknüpfungen.
 * @param {string} [prefix]
 */
export const uid = (prefix = 'ng') => `${prefix}-${++idCounter}`;

/**
 * Animation neu starten (Klasse entfernen, Reflow, wieder setzen).
 * @param {Element} el
 * @param {string} className
 */
export function restartAnimation(el, className) {
  el.classList.remove(className);
  void (/** @type {HTMLElement} */ (el).offsetWidth);
  el.classList.add(className);
}
