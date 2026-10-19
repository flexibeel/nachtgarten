/**
 * Kleines Publish/Subscribe.
 * Fehler in einem Abonnenten brechen die Zustellung an die anderen nicht ab;
 * sie werden gesammelt an `onError` gemeldet (Standard: console.error).
 */

/**
 * @template [T=unknown]
 * @typedef {(payload: T) => void} Listener
 */

/**
 * @typedef {object} Emitter
 * @property {(topic: string, fn: Listener<any>) => () => void} on    Abonnieren; liefert Abmelde-Funktion.
 * @property {(topic: string, fn: Listener<any>) => () => void} once  Nur einmal zustellen.
 * @property {(topic: string, fn: Listener<any>) => void} off
 * @property {(topic: string, payload?: unknown) => number} emit      Anzahl der erreichten Abonnenten.
 * @property {(topic?: string) => void} clear
 */

/**
 * @param {{onError?: (error: unknown, topic: string) => void}} [options]
 * @returns {Emitter}
 */
export function createEmitter({ onError = (e) => console.error(e) } = {}) {
  /** @type {Map<string, Set<Listener<any>>>} */
  const topics = new Map();

  const off = (topic, fn) => {
    const set = topics.get(topic);
    if (!set) return;
    set.delete(fn);
    if (!set.size) topics.delete(topic);
  };

  const on = (topic, fn) => {
    if (typeof fn !== 'function') throw new TypeError('Listener muss eine Funktion sein');
    if (!topics.has(topic)) topics.set(topic, new Set());
    topics.get(topic).add(fn);
    return () => off(topic, fn);
  };

  const once = (topic, fn) => {
    const wrapper = (payload) => {
      off(topic, wrapper);
      fn(payload);
    };
    return on(topic, wrapper);
  };

  const emit = (topic, payload) => {
    const set = topics.get(topic);
    if (!set) return 0;
    const listeners = [...set];
    for (const fn of listeners) {
      try {
        fn(payload);
      } catch (error) {
        onError(error, topic);
      }
    }
    return listeners.length;
  };

  const clear = (topic) => {
    if (topic === undefined) topics.clear();
    else topics.delete(topic);
  };

  return { on, once, off, emit, clear };
}
