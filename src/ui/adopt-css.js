/**
 * Stile aus dem Code einfügen, ohne die Content-Security-Policy zu verletzen.
 * `style-src 'self'` verbietet <style>-Elemente mit Inhalt; „adoptierte“ Stylesheets
 * (CSSStyleSheet + document.adoptedStyleSheets) sind davon nicht betroffen.
 * Ohne Unterstützung (alte Browser, Tests) fällt es auf ein <style>-Element zurück.
 */

const done = new WeakMap();

/**
 * @param {string} id     Kennung, damit jedes Stylesheet nur einmal eingefügt wird
 * @param {string} css
 * @param {Document} [doc]
 */
export function adoptCss(id, css, doc = globalThis.document) {
  if (!doc) return;
  let ids = done.get(doc);
  if (!ids) done.set(doc, (ids = new Set()));
  if (ids.has(id) || doc.getElementById?.(id)) return;
  ids.add(id);
  const View = doc.defaultView;
  if (View && 'adoptedStyleSheets' in doc && typeof View.CSSStyleSheet === 'function') {
    try {
      const sheet = new View.CSSStyleSheet();
      sheet.replaceSync(css);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      return;
    } catch {
      /* Rückfall unten */
    }
  }
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}
