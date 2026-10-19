/**
 * Plan ↔ kurzer Text für die Adresse (#plan=…). Rein, im Browser und in Node gleich.
 *
 * Schema (Version 1, kurz gehalten): [1, Name, [[Übungs-Id, Sätze, Soll, Name?], …]]
 * „Name?“ nur bei eigenen Übungen, die beim Empfänger sonst unbekannt wären.
 * Kodierung: „z“ + base64url(deflate-raw(JSON)) mit CompressionStream, sonst „j“ + base64url(JSON).
 * Beim Lesen wird alles begrenzt und geprüft (fremde Links sind Daten, keine Anweisungen).
 */

export const PLAN_CODE_VERSION = 1;
const MAX_ITEMS = 40;
const MAX_NAME = 60;
const MAX_ID = 48;
const MAX_REPS = 12;
const MAX_CODE = 6000;

/** @param {Uint8Array} bytes */
const toB64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
/** @param {string} text */
const fromB64url = (text) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** @param {Uint8Array} bytes @param {CompressionStream|DecompressionStream} stream */
async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canDeflate = () => typeof globalThis.CompressionStream === 'function' && typeof globalThis.DecompressionStream === 'function';

/**
 * Plan in die kurze Listenform.
 * @param {{name: string, items: {exercise: string, sets: number, reps: string}[]}} plan
 * @param {(id: string) => string|undefined} [customName]   Name eigener Übungen
 */
export function compactPlan(plan, customName = () => undefined) {
  return [
    PLAN_CODE_VERSION,
    String(plan.name ?? '').slice(0, MAX_NAME),
    plan.items.slice(0, MAX_ITEMS).map((it) => {
      const row = [it.exercise, it.sets, it.reps ?? ''];
      const name = customName(it.exercise);
      return name ? [...row, String(name).slice(0, MAX_NAME)] : row;
    }),
  ];
}

/**
 * Kurze Listenform prüfen und zurückverwandeln (null = ungültig).
 * @param {unknown} data
 * @returns {{name: string, items: {exercise: string, sets: number, reps: string, name?: string}[]}|null}
 */
export function expandPlan(data) {
  if (!Array.isArray(data) || data[0] !== PLAN_CODE_VERSION || typeof data[1] !== 'string' || !Array.isArray(data[2])) return null;
  const items = [];
  for (const row of data[2].slice(0, MAX_ITEMS)) {
    if (!Array.isArray(row)) return null;
    const [exercise, sets, reps, name] = row;
    if (typeof exercise !== 'string' || !/^[\w-]{1,48}$/.test(exercise) || exercise.length > MAX_ID) return null;
    const n = Number(sets);
    if (!Number.isInteger(n) || n < 1 || n > 20) return null;
    /** @type {{exercise: string, sets: number, reps: string, name?: string}} */
    const item = { exercise, sets: n, reps: String(reps ?? '').slice(0, MAX_REPS) };
    if (typeof name === 'string' && name.trim()) item.name = name.trim().slice(0, MAX_NAME);
    items.push(item);
  }
  const title = data[1].trim().slice(0, MAX_NAME);
  if (!title || !items.length) return null;
  return { name: title, items };
}

/**
 * @param {{name: string, items: {exercise: string, sets: number, reps: string}[]}} plan
 * @param {(id: string) => string|undefined} [customName]
 * @param {{deflate?: boolean}} [options]
 * @returns {Promise<string>}
 */
export async function encodePlan(plan, customName, { deflate = canDeflate() } = {}) {
  const json = new TextEncoder().encode(JSON.stringify(compactPlan(plan, customName)));
  if (deflate) {
    try {
      return 'z' + toB64url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      /* Rückfall unten */
    }
  }
  return 'j' + toB64url(json);
}

/**
 * @param {string} code
 * @returns {Promise<ReturnType<typeof expandPlan>>}
 */
export async function decodePlan(code) {
  try {
    const text = decodeURIComponent(String(code ?? '')).trim();
    if (!text || text.length > MAX_CODE || !/^[zj][\w-]+$/.test(text)) return null;
    let bytes = fromB64url(text.slice(1));
    if (text[0] === 'z') {
      if (!canDeflate()) return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    }
    return expandPlan(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
