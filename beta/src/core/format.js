/**
 * Deutsche Zahlen- und Textformatierung.
 * Dezimalkomma, Tausenderpunkt, Singular/Plural nach der Zahl.
 */

/** @type {Map<number, Intl.NumberFormat>} */
const formatters = new Map();

/** @param {number} digits */
const formatter = (digits) => {
  if (!formatters.has(digits)) {
    formatters.set(digits, new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }));
  }
  return formatters.get(digits);
};

/**
 * Rundet kaufmännisch auf `digits` Nachkommastellen (ohne Fließkomma-Ausreißer wie 1.005).
 * @param {number} value
 * @param {number} [digits]
 */
export function round(value, digits = 0) {
  const f = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * f) / f;
}

/**
 * Zahl auf Deutsch: 1234,5 → "1.234,5". Ungültige Werte gelten als 0.
 * @param {number} value
 * @param {number} [digits]  maximale Nachkommastellen
 */
export function formatNumber(value, digits = 1) {
  const n = Number(value);
  return formatter(digits).format(Number.isFinite(n) ? round(n, digits) : 0);
}

/**
 * Zahl mit passender Einzahl/Mehrzahl: (1, "Satz", "Sätze") → "1 Satz".
 * Nur genau 1 ist Einzahl (0 Sätze, 1,5 Sätze).
 * @param {number} n
 * @param {string} one
 * @param {string} many
 * @param {number} [digits]
 */
export function plural(n, one, many, digits = 1) {
  return `${formatNumber(n, digits)} ${Number(n) === 1 ? one : many}`;
}

/** @param {number} n */
export const sets = (n) => plural(n, 'Satz', 'Sätze');
/** @param {number} n */
export const minutes = (n) => plural(n, 'Minute', 'Minuten', 0);
/** @param {number} n */
export const weeks = (n) => plural(n, 'Woche', 'Wochen', 0);
/** @param {number} n */
export const days = (n) => plural(n, 'Tag', 'Tage', 0);
/** @param {number} n */
export const units = (n) => plural(n, 'Einheit', 'Einheiten', 0);
/** @param {number} n */
export const reps = (n) => plural(n, 'Wiederholung', 'Wiederholungen', 0);

/**
 * Gewicht: 42.5 → "42,5 kg".
 * @param {number} kg
 */
export function formatKg(kg) {
  return `${formatNumber(kg, 2)} kg`;
}

/**
 * Prozentuale Veränderung mit echtem Minuszeichen: "+12 %", "−5 %", "±0 %".
 * Liefert null, wenn es keinen Vergleichswert gibt.
 * @param {number} current
 * @param {number} previous
 * @returns {string|null}
 */
export function percentChange(current, previous) {
  if (!previous) return null;
  const d = Math.round(((current - previous) / previous) * 100);
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  return `${sign}${Math.abs(d)} %`;
}

/**
 * Sekunden als Uhr: 75 → "1:15", 3725 → "1:02:05".
 * @param {number} totalSeconds
 */
export function clock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/**
 * Deutsche Dezimaleingabe lesen: "42,5" → 42.5. Ungültig → NaN.
 * @param {unknown} input
 */
export function parseDecimal(input) {
  const t = String(input ?? '').trim().replace(/\s/g, '').replace(',', '.');
  return /^-?\d*\.?\d+$/.test(t) ? Number.parseFloat(t) : Number.NaN;
}

/**
 * Platzhalter füllen: "Hallo {name}" + {name:"Felix"}. Zahlen werden deutsch formatiert.
 * Unbekannte Platzhalter bleiben stehen, damit Fehler sichtbar sind.
 * @param {string} template
 * @param {Record<string, unknown>} [params]
 */
export function fillTemplate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in params)) return match;
    const v = params[name];
    return typeof v === 'number' ? formatNumber(v, 2) : String(v);
  });
}
