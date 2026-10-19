/**
 * Nachtgarten – Teilen: Geometrie für Routen (reine Funktionen, ohne DOM).
 *
 * Eine Route ist eine Liste von Punkten [lat, lon] (Grad, WGS84).
 * Für die Zeichnung wird sie in lokale Meter projiziert (gleichabständige
 * Projektion um den Mittelpunkt – für Läufe von wenigen Kilometern genau genug),
 * vereinfacht (Douglas-Peucker), weich gemacht (Chaikin) und in einen
 * Zielrahmen eingepasst. Alle Funktionen geben neue Arrays zurück.
 */

const R_EARTH = 6371008.8; // mittlerer Erdradius in Metern
const RAD = Math.PI / 180;

/** Entfernung zweier [lat, lon]-Punkte in Metern (Haversine). */
export function haversine(a, b) {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Gesamtlänge einer [lat, lon]-Route in Metern. */
export function routeLength(route) {
  let sum = 0;
  for (let i = 1; i < route.length; i++) sum += haversine(route[i - 1], route[i]);
  return sum;
}

/** Länge eines ebenen Linienzugs [[x, y], …]. */
export function pathLength(pts) {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) sum += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return sum;
}

/**
 * Projiziert [lat, lon] in lokale Meter [x, y] (x nach Osten, y nach Süden –
 * also schon in Bildschirmrichtung). Leere oder ungültige Punkte fallen weg.
 * @param {Array<[number, number]>} route
 * @returns {Array<[number, number]>}
 */
export function project(route) {
  const pts = (route || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!pts.length) return [];
  let lat0 = 0;
  let lon0 = 0;
  for (const p of pts) { lat0 += p[0]; lon0 += p[1]; }
  lat0 /= pts.length;
  lon0 /= pts.length;
  const kx = Math.cos(lat0 * RAD) * RAD * R_EARTH;
  const ky = RAD * R_EARTH;
  return pts.map((p) => [(p[1] - lon0) * kx, -(p[0] - lat0) * ky]);
}

/** Begrenzungsrahmen eines Linienzugs. */
export function bounds(pts) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!pts.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Senkrechter Abstand von p zur Strecke a–b. */
function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas-Peucker-Vereinfachung (iterativ, ohne Rekursionstiefe-Probleme).
 * Anfangs- und Endpunkt bleiben immer erhalten.
 * @param {Array<[number, number]>} pts  ebene Punkte
 * @param {number} epsilon  maximal erlaubte Abweichung (gleiche Einheit wie pts)
 */
export function simplify(pts, epsilon) {
  if (pts.length <= 2 || !(epsilon > 0)) return pts.map((p) => [p[0], p[1]]);
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segDist(pts[i], pts[s], pts[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx > -1 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push([pts[i][0], pts[i][1]]);
  return out;
}

/**
 * Vereinfacht auf höchstens `maxPoints` Punkte, indem epsilon schrittweise wächst.
 * Gut für das Sternbild: wenige, markante Knicke werden zu Sternen.
 */
export function simplifyTo(pts, maxPoints, startEpsilon = 1) {
  if (pts.length <= maxPoints) return pts.map((p) => [p[0], p[1]]);
  let eps = startEpsilon;
  let out = simplify(pts, eps);
  for (let i = 0; i < 60 && out.length > maxPoints; i++) {
    eps *= 1.25;
    out = simplify(pts, eps);
  }
  return out;
}

/**
 * Chaikin-Glättung: schneidet Ecken ab, damit die Linie wie von Hand gezogen fließt.
 * Bei geschlossenen Runden (Start ≈ Ziel) bleiben die Enden trotzdem fest.
 */
export function chaikin(pts, iterations = 2) {
  let cur = pts.map((p) => [p[0], p[1]]);
  for (let k = 0; k < iterations && cur.length > 2; k++) {
    const next = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const [x0, y0] = cur[i];
      const [x1, y1] = cur[i + 1];
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

/**
 * Passt einen Linienzug seitenrichtig in einen Rahmen {x, y, w, h} ein (zentriert).
 * @returns {{points: Array<[number, number]>, scale: number}}
 */
export function fit(pts, box) {
  const b = bounds(pts);
  if (!pts.length) return { points: [], scale: 1 };
  const scale = Math.min(b.w ? box.w / b.w : Infinity, b.h ? box.h / b.h : Infinity);
  const s = Number.isFinite(scale) ? scale : 1;
  const ox = box.x + (box.w - b.w * s) / 2 - b.minX * s;
  const oy = box.y + (box.h - b.h * s) / 2 - b.minY * s;
  return { points: pts.map(([x, y]) => [x * s + ox, y * s + oy]), scale: s };
}

/**
 * Punkte in gleichem Abstand entlang des Linienzugs (z. B. jeder Kilometer).
 * @param {Array<[number, number]>} pts  ebene Punkte in Metern
 * @param {number} step  Abstand in Metern
 * @returns {Array<[number, number]>}  ohne Startpunkt
 */
export function markersEvery(pts, step) {
  const out = [];
  if (pts.length < 2 || !(step > 0)) return out;
  let next = step;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (d > 0 && acc + d >= next) {
      const t = (next - acc) / d;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      next += step;
    }
    acc += d;
  }
  return out;
}

/** Ob eine Route als Runde endet (Ziel nahe am Start, relativ zur Größe). */
export function isLoop(pts, tolerance = 0.08) {
  if (pts.length < 3) return false;
  const b = bounds(pts);
  const span = Math.max(b.w, b.h) || 1;
  const a = pts[0];
  const z = pts[pts.length - 1];
  return Math.hypot(z[0] - a[0], z[1] - a[1]) / span <= tolerance;
}

/**
 * Kleiner, reproduzierbarer Zufall (mulberry32). Derselbe Lauf ergibt
 * immer dasselbe Bild – jeder andere Lauf ein anderes.
 */
export function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Einfacher Hash über Zahlen/Text (FNV-1a), Grundlage für `seeded`. */
export function hashOf(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Komplette Vorbereitung für eine Zeichnung: projizieren, vereinfachen,
 * glätten, einpassen. epsilon in Metern.
 */
export function prepareRoute(route, box, { epsilon = 4, smooth = 2 } = {}) {
  const meters = project(route);
  const simple = simplify(meters, epsilon);
  const soft = smooth ? chaikin(simple, smooth) : simple;
  const { points, scale } = fit(soft, box);
  return { meters, points, scale };
}
