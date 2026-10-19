/**
 * Hash-Router. Adressen wie `#heute`, `#training`, `#live` funktionieren als Direktsprung
 * (Homebildschirm-Kurzbefehl, Manifest-Shortcuts) und überleben ein Neuladen.
 *
 * `resolveHash` ist rein und getestet; `createRouter` verbindet es mit `location`.
 */

/**
 * @typedef {object} Route
 * @property {string} name
 * @property {Record<string, string>} params
 */

/**
 * @typedef {object} RouteTable
 * @property {readonly string[]} routes                 bekannte Namen
 * @property {Readonly<Record<string, string>>} [aliases]  z. B. umlenken → fokus
 * @property {string} fallback
 */

/**
 * `#name?x=1` → {name, params}. Groß/klein egal, Aliase werden aufgelöst
 * (der ursprüngliche Name steht dann in params.via), Unbekanntes → fallback.
 * @param {string} hash
 * @param {RouteTable} table
 * @returns {Route}
 */
export function resolveHash(hash, { routes, aliases = {}, fallback }) {
  const raw = String(hash ?? '').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const requested = decodeURIComponent(path).trim().toLowerCase();
  const params = Object.fromEntries(new URLSearchParams(query));
  if (routes.includes(requested)) return { name: requested, params };
  if (requested in aliases) return { name: aliases[requested], params: { ...params, via: requested } };
  return { name: fallback, params };
}

/**
 * @typedef {object} Router
 * @property {() => Route} current
 * @property {(name: string, options?: {replace?: boolean, params?: Record<string,string>}) => void} go
 * @property {() => void} start    erste Route melden und auf Änderungen hören
 * @property {() => void} stop
 */

/**
 * Richtung eines Wechsels aus der Position im Verlauf (für Vor-/Zurück-Übergänge).
 * @param {number|null} entry   gespeicherte Position des neuen Eintrags (null = neuer Eintrag)
 * @param {number} index        bisherige Position
 * @returns {{direction: 'forward'|'back'|'none', index: number}}
 */
export function historyStep(entry, index) {
  if (entry == null) return { direction: 'forward', index: index + 1 };
  return { direction: entry < index ? 'back' : entry > index ? 'forward' : 'none', index: entry };
}

/**
 * @param {RouteTable & {onRoute: (route: Route, previous: Route|null, info: {direction: 'forward'|'back'|'none'}) => void, location?: Location, history?: History, window?: Window}} options
 * @returns {Router}
 */
export function createRouter({ onRoute, location = globalThis.location, history = globalThis.history, window: win = globalThis.window, ...table }) {
  /** @type {Route|null} */
  let current = null;
  /** Position im Verlauf; steht als `ngIndex` im Verlaufseintrag (so erkennt „Zurück“ sich selbst). */
  let index = 0;
  const entryIndex = () => {
    const state = history.state;
    return state && typeof state.ngIndex === 'number' ? state.ngIndex : null;
  };

  const handle = () => {
    const next = resolveHash(location.hash, table);
    const previous = current;
    current = next;
    let direction = /** @type {'forward'|'back'|'none'} */ ('none');
    if (previous) {
      const step = historyStep(entryIndex(), index);
      direction = step.direction;
      index = step.index;
    } else {
      index = entryIndex() ?? 0;
    }
    if (entryIndex() !== index) history.replaceState({ ...(history.state ?? {}), ngIndex: index }, '');
    onRoute(next, previous, { direction });
  };

  return {
    current: () => current ?? resolveHash(location.hash, table),
    go(name, { replace = false, params } = {}) {
      const query = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
      const hash = `#${name}${query}`;
      if (location.hash === hash) return;
      if (replace) {
        history.replaceState({ ngIndex: index }, '', hash);
        handle();
      } else {
        location.hash = hash;
      }
    },
    start() {
      win.addEventListener('hashchange', handle);
      handle();
    },
    stop() {
      win.removeEventListener('hashchange', handle);
    },
  };
}
