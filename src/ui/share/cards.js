/**
 * Nachtgarten – Teilen: Bildvorlagen für Instagram-Story, Feed und Strava.
 *
 * Handschrift (siehe docs/HANDSCHRIFT.md): „Ein Druck aus dem Nachtgarten“.
 * Jede Einheit wird ein kleiner, signierter Druck – eine Linie, eine Zahl, ein Siegel.
 *
 * Jeder Renderer ist eine reine Funktion (data, opts) → Canvas.
 *   laufSticker   a) transparenter Aufkleber: Route als ein Pinselstrich + drei Zahlen
 *   laufKarte     b) Route als Sternbild, mit Mondphase zur Laufzeit
 *   kraftKarte    c) Körperbeet (kompakt) bzw. Programmheft (detailliert)
 *   pixelStempel  d) Briefmarke mit Pixel-Garten und Begleiter, Poststempel
 *   minimalTypo   e) nur Ziffern, wie ein Plakat (auch als Bestwert-Karte)
 *   tempoWelle    f) generative Linien aus dem Tempo je Kilometer
 *
 * opts: {
 *   theme: 'hell'|'dunkel', transparent?: boolean,
 *   format?: 'story' (1080×1920, Standard) | 'feed' (1080×1350) | 'kompakt' (nur Sticker: eng zugeschnitten),
 *   detail?: 'kompakt' (Standard) | 'detailliert', focus?: 'bestwert',
 *   createCanvas?: (w, h) => canvas, seal?: 'keim'|'mond'|'elli', companion?: {rows, colors}
 * }
 * Schriften vorher laden (ensureFonts). In der Story bleibt alles Beschriftete in der
 * sicheren Zone (oben 250 px, unten 340 px frei).
 */

import {
  chaikin, fit, hashOf, isLoop, markersEvery, project, pathLength, seeded, simplify, simplifyTo,
} from './geo.js';
import {
  facts, fmtCoord, fmtDateShort, fmtInt, fmtMonth, fmtPace, fmtTime, moonName, moonPhase,
  musclesText, paceProfile, setsCompact, setsText, summarizeStrength, suggestCards, MUSCLE_NAMES,
} from './data.js';
import { drawFigure, figureSize } from './figur.js';

export * from './data.js';

export const W = 1080;
export const H = 1920;
/** Sichere Zone der Instagram-Story: hier liegt alles Wichtige. */
export const SAFE = { top: 250, bottom: H - 340, left: 72, right: W - 72 };
/** Formate. Im Feed wird die Story-Zone (250…1580) auf 90 % gesetzt; eigene Layouts nutzen FRAME. */
export const FORMATS = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1350 } };
/** Inhaltsrahmen je Format (für Vorlagen mit eigenem Feed-Layout). */
export const FRAME = { story: { top: SAFE.top, bottom: SAFE.bottom }, feed: { top: 84, bottom: 1350 - 70 } };
const FEED_K = 0.9;
const FEED_T = [FEED_K, 0, 0, FEED_K, (W - W * FEED_K) / 2, 76 - SAFE.top * FEED_K];
const M = 96; // Seitenrand für Text

export const SERIF = "'Instrument Serif', 'Iowan Old Style', Georgia, serif";
export const SANS = "'Nunito Sans', system-ui, sans-serif";

/** Abendruhe-Palette, je Thema. „ink“ ist die Schriftfarbe. */
export const PALETTES = {
  hell: {
    paper: '#F5F1EE', paper2: '#EEE6E0', ink: '#2E2A28', muted: '#7D746F', faint: '#B7ADA7',
    rose: '#B58C83', roseInk: '#A0766C', sage: '#9DAA8F', soft: '#EAE2DC', line: '#DDD3CD',
  },
  dunkel: {
    paper: '#211E1E', paper2: '#1C1A1A', ink: '#EEE7E3', muted: '#ABA19C', faint: '#6E6562',
    rose: '#D3A99F', roseInk: '#D3A99F', sage: '#AFBCA2', soft: '#383332', line: '#3A3433',
  },
};

// ───────────────────────────── Grundwerkzeuge ─────────────────────────────

function makeCanvas(w, h, opts = {}) {
  if (opts.createCanvas) return opts.createCanvas(w, h);
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  throw new Error('Kein Canvas verfügbar – bitte opts.createCanvas übergeben.');
}

/** Startet eine Karte. size überschreibt das Format (dann keine Feed-Verkleinerung). */
function begin(data, opts, size) {
  const theme = opts.theme === 'dunkel' || opts.theme === 'dark' ? 'dunkel' : 'hell';
  const pal = PALETTES[theme];
  const fmt = opts.format === 'feed' ? 'feed' : 'story';
  const { w, h } = size || FORMATS[fmt];
  const canvas = makeCanvas(w, h, opts);
  const ctx = canvas.getContext('2d');
  const seed = hashOf([String(data.start || data.date || ''), data.distanceM || 0, data.title || '', opts.template || '']);
  const rand = seeded(seed);
  ctx.textBaseline = 'alphabetic';
  const stage = () => { if (fmt === 'feed' && !size) ctx.setTransform(...FEED_T); };
  return { canvas, ctx, pal, theme, rand, seed, transparent: !!opts.transparent, w, h, fmt, stage, detailed: opts.detail === 'detailliert' };
}

const fontOf = ({ px, serif = true, italic = false, weight = 400 }) =>
  `${italic ? 'italic ' : ''}${weight} ${Math.round(px * 10) / 10}px ${serif ? SERIF : SANS}`;

/** letterSpacing gibt es in Safari erst ab 18.4 – sonst setzen wir Zeichen für Zeichen. */
const hasTracking = (ctx) => 'letterSpacing' in ctx;
function setTracking(ctx, px) { if (hasTracking(ctx)) ctx.letterSpacing = `${px}px`; }

function trackedWidth(ctx, str, tracking) {
  if (!tracking) return ctx.measureText(str).width;
  if (hasTracking(ctx)) { setTracking(ctx, tracking); const w = ctx.measureText(str).width; setTracking(ctx, 0); return w; }
  const chars = [...str];
  return chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + tracking * chars.length;
}

/** Schreibt einen Text; gibt die Breite zurück. o: {px, serif, italic, weight, color, align, alpha, tracking} */
function write(ctx, str, x, y, o) {
  ctx.font = fontOf(o);
  ctx.fillStyle = o.color;
  const prev = ctx.globalAlpha;
  if (o.alpha != null) ctx.globalAlpha = prev * o.alpha;
  const tr = o.tracking || 0;
  const w = trackedWidth(ctx, str, tr);
  if (!tr || hasTracking(ctx)) {
    setTracking(ctx, tr);
    ctx.textAlign = o.align || 'left';
    // Mit Laufweite hängt der Browser rechts einen Abstand an – ausgleichen.
    const shift = tr && o.align === 'right' ? -tr : tr && o.align === 'center' ? -tr / 2 : 0;
    ctx.fillText(str, x + shift, y);
    setTracking(ctx, 0);
  } else {
    ctx.textAlign = 'left';
    let cx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    for (const ch of str) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tr; }
  }
  ctx.globalAlpha = prev;
  return w;
}

function measure(ctx, str, o) {
  ctx.font = fontOf(o);
  return trackedWidth(ctx, str, o.tracking || 0);
}

/** Mehrere Textstücke auf einer Grundlinie (z. B. „7,42“ + kursives „km“). */
function writeRun(ctx, parts, x, y, align = 'left') {
  const widths = parts.map((p) => measure(ctx, p.t, p));
  const total = widths.reduce((a, w, i) => a + w + (parts[i].gap || 0), 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  parts.forEach((p, i) => {
    cx += p.gap || 0;
    write(ctx, p.t, cx, y, { ...p, align: 'left' });
    cx += widths[i];
  });
  return total;
}

/** Größte Schriftgröße, bei der `str` in `maxW` passt (höchstens maxPx). */
function fitSize(ctx, str, maxW, o, maxPx) {
  const w = measure(ctx, str, { ...o, px: 100, tracking: (o.trackingEm || 0) * 100 });
  return Math.min(maxPx, (maxW / (w || 1)) * 100);
}

/** Papier: weicher Verlauf, Vignette, feines Korn. */
function paper(ctx, pal, theme, rand, opts, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme === 'dunkel' ? '#282424' : '#F7F3F0');
  g.addColorStop(0.6, pal.paper);
  g.addColorStop(1, pal.paper2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h * 0.42, h * 0.2, w / 2, h * 0.5, h * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, theme === 'dunkel' ? 'rgba(0,0,0,0.26)' : 'rgba(90,70,60,0.07)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, theme, rand, opts, w, h);
}

/** Korn: kleine Kachel mit Zufallspunkten, als Muster über die ganze Fläche. */
function grain(ctx, theme, rand, opts, w, h) {
  const S = 160;
  const tile = makeCanvas(S, S, opts);
  const t = tile.getContext('2d');
  const img = t.createImageData(S, S);
  const d = img.data;
  for (let i = 0; i < S * S; i++) {
    const r = rand();
    const light = r > 0.5;
    const c = light ? 255 : 0;
    d[i * 4] = c; d[i * 4 + 1] = c; d[i * 4 + 2] = c;
    const base = theme === 'dunkel' ? (light ? 12 : 18) : (light ? 26 : 14);
    d[i * 4 + 3] = Math.round(base * Math.abs(r - 0.5) * 2 * (rand() < 0.5 ? 1 : 0.4));
  }
  t.putImageData(img, 0, 0);
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
}

function withShadow(ctx, color, blur, fn) {
  if (!color) { fn(); return; }
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = Math.round(blur / 8);
  fn();
  ctx.restore();
}

function hairline(ctx, x1, y, x2, color, alpha = 1, width = 1.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.restore();
}

/** Werte nebeneinander: Zahl in der Serife, darunter ein ruhiges Etikett. */
function statRow(ctx, stats, x1, x2, y, pal, { px = 76, labelPx = 27, align = 'spread', color, muted } = {}) {
  const n = stats.length;
  const colW = (x2 - x1) / n;
  stats.forEach((s, i) => {
    let x; let a;
    if (align === 'center') { x = x1 + colW * (i + 0.5); a = 'center'; } else if (align === 'spread') {
      a = i === 0 ? 'left' : i === n - 1 && n > 1 ? 'right' : 'center';
      x = a === 'left' ? x1 : a === 'right' ? x2 : (x1 + x2) / 2;
    } else { x = x1 + colW * i; a = 'left'; }
    const parts = [{ t: s.value, px, color: color || pal.ink }];
    if (s.unit) parts.push({ t: s.unit, px: px * 0.46, italic: true, color: muted || pal.muted, gap: px * 0.1 });
    writeRun(ctx, parts, x, y, a);
    write(ctx, s.label, x, y + labelPx + 20, { px: labelPx, serif: false, color: muted || pal.muted, align: a });
  });
}

// ───────────────────────────── Pinselstrich ─────────────────────────────

/** Eine einzige, gefüllte Linie mit wechselnder Breite – widthAt(t), t ∈ [0, 1]. */
function brushStroke(ctx, pts, widthAt, color) {
  if (pts.length < 2) return;
  const total = pathLength(pts) || 1;
  const left = []; const right = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]); let ny = b[0] - a[0];
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
    const w = widthAt(acc / total) / 2;
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const p of left) ctx.lineTo(p[0], p[1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  const z = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], widthAt(0) / 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(z[0], z[1], widthAt(1) / 2, 0, Math.PI * 2); ctx.fill();
}

/** Breite: an den Enden schmal (Ansetzen/Abheben), dazwischen „atmet“ sie mit dem Tempo. */
function breathingWidth(base, paces) {
  const n = paces.length;
  const min = Math.min(...paces); const max = Math.max(...paces);
  const span = max - min || 1;
  return (t) => {
    const taper = Math.max(0, Math.min(1, t / 0.05, (1 - t) / 0.07));
    const ease = Math.sin((taper * Math.PI) / 2);
    let pace = 0.5;
    if (n > 1) {
      const f = t * (n - 1);
      const i = Math.min(n - 2, Math.floor(f));
      const s = (1 - Math.cos((f - i) * Math.PI)) / 2;
      pace = ((paces[i] * (1 - s) + paces[i + 1] * s) - min) / span;
    }
    return base * (0.28 + 0.72 * ease) * (0.8 + 0.4 * pace); // langsamer = mehr Druck
  };
}

// ───────────────────────────── Siegel & Signatur ─────────────────────────────

/** Pixel-Motive fürs Siegel (9 × 9, „#“ = ausgespart). */
export const SEALS = {
  keim: [
    '.........',
    '.##...##.',
    '#..#.#..#',
    '.#..#..#.',
    '..#.#.#..',
    '....#....',
    '....#....',
    '..#####..',
    '.........',
  ],
  mond: [
    '...###...',
    '..##.....',
    '.##......',
    '.##....#.',
    '.##......',
    '.##......',
    '..##.....',
    '...###...',
    '.........',
  ],
  elli: [
    '.........',
    '...####..',
    '..######.',
    '.###.##.#',
    '.######.#',
    '.######.#',
    '.#.##.#..',
    '.#.##.#..',
    '.........',
  ],
};

/** Das Siegel: ein kleiner Pixel-Stempel in Altrosa, Motiv ausgespart – wie der rote Stempel unter einem Holzschnitt. */
function seal(ctx, x, y, size, pal, rand, opts, motif = 'keim') {
  const rows = SEALS[motif] || SEALS.keim;
  const n = 11;
  const p = Math.max(1, Math.round(size / n));
  const S = p * n;
  const c = makeCanvas(S, S, opts);
  const s = c.getContext('2d');
  s.fillStyle = pal.rose;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 || i === n - 1) && (j === 0 || j === n - 1)) continue;
      s.globalAlpha = 0.8 + rand() * 0.2;
      s.fillRect(i * p, j * p, p, p);
    }
  }
  s.globalAlpha = 1;
  s.globalCompositeOperation = 'destination-out';
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '#') s.fillRect((i + 1) * p, (j + 1) * p, p, p);
  }));
  s.globalAlpha = 0.45;
  for (let k = 0; k < 3; k++) s.fillRect(Math.floor(rand() * n) * p, Math.floor(rand() * n) * p, p, p);
  ctx.drawImage(c, Math.round(x), Math.round(y));
  return S;
}

/** Signatur: Siegel + „nachtgarten“ kursiv, klein. y ist die Grundlinie. */
function signature(ctx, x, y, pal, rand, opts, { align = 'right', px = 32, color } = {}) {
  const word = 'nachtgarten';
  const o = { px, italic: true, color: color || pal.muted };
  const tw = measure(ctx, word, o);
  const sz = Math.round((px * 1.1) / 11) * 11;
  const gap = Math.round(px * 0.4);
  const total = sz + gap + tw;
  const x0 = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  seal(ctx, x0, y - sz + Math.round(px * 0.12), sz, pal, rand, opts, opts.seal);
  write(ctx, word, x0 + sz + gap, y, o);
  return total;
}

// ───────────────────────────── Mond ─────────────────────────────

/** Mondphase als feine Zeichnung: Scheibe zart, beleuchteter Teil in Tinte. */
function moonGlyph(ctx, x, y, r, phase, color) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.95;
  const waxing = phase < 0.5;
  const k = Math.cos(2 * Math.PI * phase);
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(x, y, Math.max(0.01, r * Math.abs(k)), r, 0, Math.PI / 2, -Math.PI / 2, waxing ? k > 0 : k <= 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ───────────────────────────── Detail-Zeilen ─────────────────────────────

/**
 * Zeilen für die detaillierte Ansicht.
 * Kraft: jede Übung mit Sätzen; Lauf: jeder Kilometer mit Tempo (Balken = Geschwindigkeit).
 */
export function detailRows(data) {
  if (data.type === 'kraft') {
    return (data.exercises || []).map((ex) => {
      const t = setsText(ex);
      return { left: ex.name, right: t.reps, sub: musclesText(ex), subRight: t.load, mark: !!ex.pr };
    });
  }
  const paces = paceProfile(data);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const full = Math.floor((data.distanceM || 0) / 1000);
  return paces.map((p, i) => ({
    left: i < full || !data.distanceM ? `${i + 1}. Kilometer` : `letzte ${fmtInt((data.distanceM % 1000) || 1000)} m`,
    right: fmtPace(p),
    unit: '/km',
    speed: slowest - fastest ? (slowest - p) / (slowest - fastest) : 0.5,
    mark: p === fastest && paces.length > 1,
  }));
}

/** Kleine Pixel-Blüte (Markierung für Bestwert / schnellsten Kilometer). */
function blossom(ctx, x, y, p, pal, heart) {
  ctx.fillStyle = pal.rose;
  ctx.fillRect(x, y - p, p, p); ctx.fillRect(x - p, y, p, p); ctx.fillRect(x + p, y, p, p); ctx.fillRect(x, y + p, p, p);
  ctx.fillStyle = heart || pal.paper;
  ctx.fillRect(x, y, p, p);
}

/**
 * Detail-Zeilen wie ein Programmheft: Name links, Punktlinie, Wert rechts,
 * darunter klein die Muskeln bzw. das Gewicht. Gibt die benutzte Höhe zurück.
 */
function drawRows(ctx, rows, x1, x2, y, rowH, pal, { px = 46, subPx = 26, index = true, compact = false } = {}) {
  const ix = index ? Math.round(px * 1.1) : 0;
  rows.forEach((r, k) => {
    const base = y + k * rowH + px * 0.8;
    if (index) write(ctx, String(k + 1), x1, base, { px: px * 0.62, italic: true, color: pal.roseInk });
    const nameW = write(ctx, r.left, x1 + ix, base, { px, color: pal.ink });
    let after = x1 + ix + nameW + 16;
    if (r.mark) {
      const bp = Math.max(3, Math.round(px / 9));
      blossom(ctx, after + bp * 2, Math.round(base - px * 0.34), bp, pal);
      after += bp * 5;
      if (!compact && r.sub != null) after += write(ctx, 'Bestwert', after + 4, base, { px: subPx + 2, italic: true, color: pal.roseInk }) + 12;
    }
    const rightParts = [{ t: r.right, px, color: pal.ink }];
    if (r.unit) rightParts.push({ t: r.unit, px: px * 0.5, italic: true, color: pal.muted, gap: 6 });
    const rw = rightParts.reduce((a, p) => a + measure(ctx, p.t, p) + (p.gap || 0), 0);
    const leadEnd = x2 - rw - 22;
    if (r.speed != null) {
      const len = Math.max(0, leadEnd - after - 10) * (0.25 + 0.75 * r.speed);
      ctx.save();
      ctx.strokeStyle = r.mark ? pal.rose : pal.ink;
      ctx.globalAlpha = r.mark ? 0.95 : 0.26;
      ctx.lineWidth = r.mark ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(leadEnd - len, base - px * 0.28); ctx.lineTo(leadEnd, base - px * 0.28); ctx.stroke();
      ctx.restore();
    } else if (leadEnd - after > 24) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      ctx.globalAlpha = 0.26;
      for (let x = after + 8; x < leadEnd; x += 13) { ctx.beginPath(); ctx.arc(x, base - 6, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    writeRun(ctx, rightParts, x2, base, 'right');
    if (!compact && (r.sub || r.subRight)) {
      const sy = base + subPx + 14;
      if (r.sub) write(ctx, r.sub, x1 + ix, sy, { px: subPx, italic: true, color: pal.muted });
      if (r.subRight) write(ctx, r.subRight, x2, sy, { px: subPx, serif: false, color: pal.muted, align: 'right' });
    } else if (compact && r.subRight) {
      // kompakte Zeile: Gewicht direkt hinter die Sätze
    }
  });
  return rows.length * rowH;
}

/** Kompakte Kraft-Zeilen: eine Zeile je Übung ("3 × 8 · 100 kg", "10 · 10 · 8 · bis 85 kg"). */
function compactRows(data, rows) {
  return rows.map((r, i) => ({ ...r, right: setsCompact((data.exercises || [])[i] || {}) || r.right }));
}

// ───────────────────────────── a) Lauf-Sticker ─────────────────────────────

/**
 * Transparenter Aufkleber: Route als ein Pinselstrich, darunter Distanz, Zeit und Tempo.
 * theme 'hell' = dunkle Tinte (für helle Fotos), 'dunkel' = helle Tinte (für dunkle Fotos).
 * format 'kompakt' liefert ein eng zugeschnittenes Bild (1080 breit) zum Kopieren in die Story.
 * opts.transparent (Standard true); false legt Papier darunter. opts.anchor: 'unten' | 'oben'.
 */
export function laufSticker(run, opts = {}) {
  const o = { transparent: true, ...opts, template: 'sticker' };
  const routeH = 420; const blockH = routeH + 60 + 196 + 132 + 152 + 20;
  const compact = o.format === 'kompakt';
  const size = compact ? { w: W, h: blockH + 110 } : null;
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(run, o, size);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(run);
  const light = transparent && theme === 'dunkel';
  const ink = light ? '#F8F2ED' : pal.ink;
  const muted = light ? 'rgba(248,242,237,0.86)' : pal.muted;
  const shadow = transparent ? (light ? 'rgba(18,12,10,0.45)' : 'rgba(255,250,246,0.6)') : null;
  const p = { ...pal, ink, muted };
  const top = compact ? 60 : o.anchor === 'oben' ? SAFE.top + 40 : SAFE.bottom - blockH;

  const meters = project(run.route || []);
  const simple = chaikin(simplify(meters, 3), 2);
  const fitted = fit(simple, { x: 0, y: 0, w: 520, h: routeH }).points;
  const bx = fitted.length ? Math.min(...fitted.map((q) => q[0])) : 0;
  const by = fitted.length ? Math.max(...fitted.map((q) => q[1])) : routeH;
  const pts = fitted.map(([x, y]) => [x - bx + M + 10, y - by + top + routeH]);
  withShadow(ctx, shadow, 22, () => {
    brushStroke(ctx, pts, breathingWidth(14, paceProfile(run)), ink);
    if (pts.length) {
      const a = pts[0]; const z = pts[pts.length - 1];
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a[0], a[1], 16, 0, Math.PI * 2); ctx.stroke();
      if (Math.hypot(z[0] - a[0], z[1] - a[1]) > 34) {
        ctx.fillStyle = pal.rose;
        ctx.beginPath(); ctx.arc(z[0], z[1], 10, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
  const yHero = top + routeH + 60 + 196;
  withShadow(ctx, shadow, 28, () => {
    if (detailed) write(ctx, f.title, W - M, top + 40, { px: 40, italic: true, color: muted, align: 'right' });
    writeRun(ctx, [
      { t: f.hero.value, px: 260, color: ink, tracking: -5 },
      { t: f.hero.unit, px: 90, italic: true, color: muted, gap: 20 },
    ], M - 8, yHero);
    const stats = detailed ? f.stats.slice(0, 3) : f.stats.slice(0, 2);
    statRow(ctx, stats, M, M + (detailed ? 780 : 560), yHero + 132, p, { px: 80, labelPx: 28, align: 'left', muted });
    signature(ctx, M, yHero + 132 + 152, p, rand, o, { align: 'left', px: 32, color: muted });
  });
  return canvas;
}

// ───────────────────────────── b) Lauf-Karte „Sternbild“ ─────────────────────────────

/** Ein Stern: Punkt mit zartem Kreuz (keine Leuchteffekte). */
function starShape(ctx, x, y, r, color, alpha, ring = false) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, r * 0.16);
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.5, y); ctx.lineTo(x + r * 1.5, y);
  ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x, y + r * 1.5);
  ctx.stroke();
  if (ring) {
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Abbildung Meter → Kreis: Mitte des Rahmens in die Kreismitte, weitester Punkt auf radius. */
function circleFit(meters, cx, cy, radius) {
  if (!meters.length) return (p) => p;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of meters) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const mx = (minX + maxX) / 2; const my = (minY + maxY) / 2;
  const far = Math.max(1e-6, ...meters.map(([x, y]) => Math.hypot(x - mx, y - my)));
  const k = radius / far;
  return ([x, y]) => [cx + (x - mx) * k, cy + (y - my) * k];
}

/**
 * Die Route als Sternbild: markante Knicke werden Sterne, feine Linien verbinden sie,
 * jeder Kilometer ist ein Stern in Altrosa – der schnellste leuchtet am hellsten.
 * Oben die Mondphase zur Laufzeit, unten Koordinaten wie im Sternatlas.
 */
export function laufKarte(run, opts = {}) {
  const o = { ...opts, template: 'sternbild' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(run, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  const dark = theme === 'dunkel';
  const star = dark ? '#F4ECE6' : pal.ink;
  if (!transparent) {
    for (let i = 0; i < 360; i++) {
      const x = rand() * w; const y = rand() * h;
      const r = rand() ** 3 * 2.4 + 0.6;
      ctx.globalAlpha = (dark ? 0.1 : 0.08) + rand() * (dark ? 0.38 : 0.2);
      ctx.fillStyle = rand() < 0.1 ? pal.rose : star;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  stage();
  const f = facts(run);
  const when = run.start || run.date;

  const R = detailed ? 290 : 370;
  const cx = W / 2; const cy = SAFE.top + 84 + R;
  ctx.save();
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = dark ? 0.11 : 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, R + 20, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([2, 10]);
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const ang = (k * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R + 20), cy + Math.sin(ang) * (R + 20));
    ctx.lineTo(cx - Math.cos(ang) * (R + 20), cy - Math.sin(ang) * (R + 20));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  const meters = project(run.route || []);
  const stars = simplifyTo(meters, 22, 8);
  // Einpassen nach Radius: die Route füllt den Kreis, egal wie sie geformt ist.
  const kmRaw = markersEvery(meters, 1000);
  const toCircle = circleFit(meters, cx, cy, R * 0.84);
  const sp = stars.map(toCircle);
  const kmMarks = kmRaw.map(toCircle);

  ctx.save();
  ctx.strokeStyle = star;
  ctx.globalAlpha = dark ? 0.5 : 0.45;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  sp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (isLoop(meters)) ctx.closePath();
  ctx.stroke();
  ctx.restore();
  sp.forEach(([x, y], i) => {
    const a = sp[(i - 1 + sp.length) % sp.length]; const b = sp[(i + 1) % sp.length];
    const v1 = [x - a[0], y - a[1]]; const v2 = [b[0] - x, b[1] - y];
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1);
    starShape(ctx, x, y, 3.5 + ((1 - cos) / 2) * 8 + rand() * 2, star, 0.92);
  });
  const paces = paceProfile(run);
  const pMin = Math.min(...paces); const pMax = Math.max(...paces);
  kmMarks.forEach(([x, y], i) => {
    const pace = paces[i] || pMax;
    const s01 = pMax - pMin ? (pMax - pace) / (pMax - pMin) : 0.5;
    starShape(ctx, x, y, 5 + s01 * 6, pal.rose, 0.55 + 0.45 * s01, pace === pMin && paces.length > 1);
    const dx = x - cx; const dy = y - cy; const d = Math.hypot(dx, dy) || 1;
    write(ctx, String(i + 1), x + (dx / d) * 36, y + (dy / d) * 36 + 10, { px: 30, italic: true, color: pal.roseInk, align: 'center' });
  });
  if (sp.length) {
    ctx.strokeStyle = pal.sage; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sp[0][0], sp[0][1], 16, 0, Math.PI * 2); ctx.stroke();
  }

  write(ctx, f.line, M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted });
  const phase = moonPhase(when);
  write(ctx, moonName(phase), W - M - 50, SAFE.top + 34, { px: 30, italic: true, color: pal.muted, align: 'right' });
  moonGlyph(ctx, W - M - 18, SAFE.top + 24, 17, phase, star);

  const route = run.route || [];
  if (route.length) {
    const lat = route.reduce((a, q) => a + q[0], 0) / route.length;
    const lon = route.reduce((a, q) => a + q[1], 0) / route.length;
    write(ctx, `${fmtCoord(lat, 'N', 'S')}  ·  ${fmtCoord(lon, 'O', 'W')}`, W / 2, cy + R + 76, { px: 26, serif: false, color: pal.muted, align: 'center', tracking: 1 });
  }
  const name = run.constellation ? `Sternbild „${run.constellation}“` : f.title;
  if (detailed) {
    const yT = cy + R + 166;
    write(ctx, name, W / 2, yT, { px: 70, color: pal.ink, align: 'center' });
    write(ctx, `${f.hero.value} km  ·  ${f.stats[0].value}  ·  ${f.stats[1].value} /km`, W / 2, yT + 56, { px: 34, italic: true, color: pal.muted, align: 'center' });
    const rows = detailRows(run);
    const y0 = yT + 100;
    const avail = SAFE.bottom - 80 - y0;
    const rowH = Math.min(54, avail / rows.length);
    drawRows(ctx, rows, M + 30, W - M - 30, y0, rowH, pal, { px: Math.min(34, rowH * 0.64), index: false, compact: true });
  } else {
    const yT = cy + R + 178;
    write(ctx, name, W / 2, yT, { px: 88, color: pal.ink, align: 'center' });
    if (run.constellation) write(ctx, f.title, W / 2, yT + 56, { px: 34, italic: true, color: pal.muted, align: 'center' });
    statRow(ctx, [{ value: f.hero.value, unit: 'km', label: 'Distanz' }, ...f.stats.slice(0, 2)], M, W - M, yT + 170, pal, { px: 70, labelPx: 26, align: 'center' });
  }
  signature(ctx, W / 2, SAFE.bottom - 12, pal, rand, o, { align: 'center', px: 30 });
  return canvas;
}

// ───────────────────────────── c) Kraft: Körperbeet & Programmheft ─────────────────────────────

/**
 * Krafttraining. Kompakt: das Körperbeet – zwei Pixel-Mannequins (vorn, hinten),
 * trainierte Muskeln getönt, die stärksten blühen; drei Zahlen.
 * Detailliert: das Programmheft (programmKarte).
 */
export function kraftKarte(workout, opts = {}) {
  if (opts.detail === 'detailliert') return programmKarte(workout, opts);
  const o = { ...opts, template: 'kraft' };
  const { canvas, ctx, pal, theme, rand, seed, transparent, w, h, stage } = begin(workout, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(workout);
  const s = f.summary;

  write(ctx, f.line, M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted });
  const tPx = fitSize(ctx, f.title, W - 2 * M, {}, 120);
  write(ctx, f.title, M - 4, SAFE.top + 54 + tPx * 0.8, { px: tPx, color: pal.ink });

  const p = 9;
  const fs = figureSize(p);
  const gap = 110;
  const yFig = SAFE.top + 236;
  const xL = W / 2 - gap / 2 - fs.w; const xR = W / 2 + gap / 2;
  drawFigure(ctx, 'vorn', xL, yFig, p, s.load, theme, seed);
  drawFigure(ctx, 'hinten', xR, yFig, p, s.load, theme, seed);
  const yCap = yFig + fs.h + 46;
  write(ctx, 'vorn', xL + fs.w / 2, yCap, { px: 30, italic: true, color: pal.muted, align: 'center' });
  write(ctx, 'hinten', xR + fs.w / 2, yCap, { px: 30, italic: true, color: pal.muted, align: 'center' });

  const blooming = Object.entries(s.load).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => MUSCLE_NAMES[m] || m);
  const yV = SAFE.bottom - 150;
  hairline(ctx, M, yV - 104, W - M, pal.ink, 0.14);
  if (blooming.length) write(ctx, `Es blüht: ${blooming.join(', ')}`, W / 2, yV - 140, { px: 34, italic: true, color: pal.roseInk, align: 'center' });
  const stats = [{ value: f.hero.value, unit: 'kg', label: 'bewegt' }, f.stats[0]];
  if (s.top) stats.push({ value: `${fmtInt(s.top.kg)}`, unit: 'kg', label: s.top.name });
  statRow(ctx, stats, M, W - M, yV, pal, { px: 74, labelPx: 26, align: 'spread' });
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 30 });
  return canvas;
}

/**
 * Das Programmheft: das ganze Training auf einem Bild, gesetzt wie eine Menükarte –
 * jede Übung mit Sätzen × Wiederholungen und Gewicht, Gesamtvolumen und Dauer.
 * Eigenes Layout für Story (9:16) und Feed (4:5). Für Strava: ein Bild statt Tipparbeit.
 */
export function programmKarte(workout, opts = {}) {
  const o = { ...opts, template: 'programm' };
  const fmt = o.format === 'feed' ? 'feed' : 'story';
  const { canvas, ctx, pal, theme, rand, seed, transparent, w, h } = begin(workout, o, FORMATS[fmt]);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  const fr = FRAME[fmt];
  const feed = fmt === 'feed';
  const s = summarizeStrength(workout);
  const f = facts(workout);
  const x1 = M; const x2 = W - M;

  // Kopf: Datum, Titel, Muskeln – rechts zwei kleine Mannequins
  const fp = feed ? 3 : 4;
  const fs = figureSize(fp);
  const figX = x2 - fs.w * 2 - 10;
  const figY = fr.top + (feed ? 0 : 8);
  drawFigure(ctx, 'vorn', figX, figY, fp, s.load, theme, seed);
  drawFigure(ctx, 'hinten', figX + fs.w + 10, figY, fp, s.load, theme, seed);
  write(ctx, f.line, x1, fr.top + 34, { px: feed ? 27 : 30, italic: true, color: pal.muted });
  const tPx = fitSize(ctx, f.title, figX - x1 - 30, {}, feed ? 100 : 116);
  const yTitle = fr.top + 34 + 24 + tPx * 0.78;
  write(ctx, f.title, x1 - 3, yTitle, { px: tPx, color: pal.ink });
  const topM = Object.entries(s.load).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => MUSCLE_NAMES[m] || m);
  write(ctx, topM.join(' · '), x1, yTitle + (feed ? 52 : 60), { px: feed ? 30 : 34, italic: true, color: pal.roseInk });

  const headBottom = Math.max(figY + fs.h, yTitle + 76) + (feed ? 22 : 36);
  hairline(ctx, x1, headBottom, x2, pal.ink, 0.16);

  const footH = feed ? 196 : 236;
  const footTop = fr.bottom - footH;
  const rows = detailRows(workout);
  const listTop = headBottom + (feed ? 26 : 40);
  const avail = footTop - listTop - (feed ? 6 : 16);
  const rowH = Math.min(feed ? 112 : 130, avail / Math.max(1, rows.length));
  const px = Math.max(28, Math.min(feed ? 44 : 50, rowH * 0.42));
  drawRows(ctx, rows, x1, x2, listTop, rowH, pal, { px, subPx: Math.round(px * 0.58), index: true });

  hairline(ctx, x1, footTop, x2, pal.ink, 0.16);
  const yS = footTop + (feed ? 84 : 100);
  statRow(ctx, [
    { value: fmtInt(s.volume), unit: 'kg', label: 'Volumen' },
    { value: fmtInt(s.sets), label: s.sets === 1 ? 'Satz' : 'Sätze' },
    { value: fmtInt((workout.durationS || 0) / 60), unit: 'min', label: 'Dauer' },
  ], x1, x2, yS, pal, { px: feed ? 58 : 66, labelPx: feed ? 24 : 26, align: 'spread' });
  const yEnd = fr.bottom - (feed ? 0 : 12);
  signature(ctx, x2, yEnd, pal, rand, o, { align: 'right', px: feed ? 28 : 30 });
  if (workout.place) write(ctx, workout.place, x1, yEnd, { px: feed ? 28 : 30, italic: true, color: pal.muted });
  return canvas;
}

// ───────────────────────────── d) Pixel-Stempel „Briefmarke“ ─────────────────────────────

/** Elli, das Elefantenbaby (Seitenansicht, schaut nach rechts). Platzhalter, bis src/ui/companion sie liefert. */
export const ELLI = {
  rows: [
    '.........bbbbbb.......',
    '......bbbbbbbbbbb.....',
    '....bbbbbbbppbbbbbb...',
    '...bbbbbbbppppbbbbbb..',
    '..bbbbbbbbppppbbbebbb.',
    '..bbbbbbbbbppbbbbbbcb.',
    '.bbbbbbbbbbbbbbbbbbbbb',
    '.bbbbbbbbbbbbbbbbbb.bb',
    'tbbbbbbbbbbbbbbbbbb..b',
    '.bbbbbbbbbbbbbbbbbb..b',
    '..sbbbbbbbbbbbbbbs..bb',
    '..sbbs.sbbs.sbbs.sbbs.',
    '..sbbs.sbbs.sbbs.sbbs.',
    '..ssss.ssss.ssss.ssss.',
  ],
  colors: {
    hell: { b: '#A39894', s: '#8A807C', p: '#D7AFA6', e: '#2E2A28', c: '#C99A90', t: '#8A807C' },
    dunkel: { b: '#A49A97', s: '#857B79', p: '#D3A99F', e: '#1C1A1A', c: '#D3A99F', t: '#857B79' },
  },
};

/** Pflanzen-Sprites. „g“ Blatt, „d“ dunkles Blatt, „r“ Blüte, „y“ Mitte, „w“ hell. */
const PLANTS = [
  ['.g.', 'gg.', '.g.'],
  ['g.g', '.g.', '.g.', '.g.'],
  ['.r.', 'ryr', '.r.', 'g.g', '.dg', '.g.'],
  ['.w.w.', 'wwyww', '.www.', '..g..', '.gg.d', '..g..', '..g..'],
  ['.rrr.', 'rryrr', '.rrr.', '..g..', 'dgg..', '..ggd', '..g..', '..g..', '..g..'],
];

function sprite(ctx, rows, colors, x, y, p) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const c = colors[ch];
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x + i * p, y + j * p, p, p);
  }));
}

/** Pixel-Szene: Himmel, Mond in der echten Phase, Sterne, Garten (wächst mit den Einheiten), Elli. */
function pixelScene(ctx, x0, y0, cols, rowsN, p, theme, data, rand, opts) {
  const dark = theme === 'dunkel';
  const sky = dark ? ['#1D1A1B', '#221E1F', '#282324', '#2F2929', '#373030'] : ['#E6CFC8', '#EBD4CA', '#EFDACD', '#F2E0D2', '#F5E7DA'];
  const groundY = rowsN - 13;
  const bandH = groundY / sky.length;
  const bayer = [[0, 2], [3, 1]];
  for (let j = 0; j < groundY; j++) {
    const fb = j / bandH;
    const b = Math.min(sky.length - 1, Math.floor(fb));
    const frac = fb - b;
    for (let i = 0; i < cols; i++) {
      const next = b + 1 < sky.length && frac > 0.55 && (frac - 0.55) * 9 > bayer[j % 2][i % 2] ? b + 1 : b;
      ctx.fillStyle = sky[next];
      ctx.fillRect(x0 + i * p, y0 + j * p, p, p);
    }
  }
  const starC = dark ? '#EEE7E3' : '#FFFFFF';
  for (let k = 0; k < (dark ? 24 : 9); k++) {
    const i = 2 + Math.floor(rand() * (cols - 4)); const j = 16 + Math.floor(rand() * (groundY - 34));
    ctx.fillStyle = starC;
    ctx.globalAlpha = 0.45 + rand() * 0.5;
    ctx.fillRect(x0 + i * p, y0 + j * p, p, p);
    if (rand() < 0.22) {
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x0 + (i - 1) * p, y0 + j * p, p, p); ctx.fillRect(x0 + (i + 1) * p, y0 + j * p, p, p);
      ctx.fillRect(x0 + i * p, y0 + (j - 1) * p, p, p); ctx.fillRect(x0 + i * p, y0 + (j + 1) * p, p, p);
    }
  }
  ctx.globalAlpha = 1;
  const phase = moonPhase(data.start || data.date);
  const k = Math.cos(2 * Math.PI * phase);
  const mx = cols - 13; const my = 22; const mr = 5.6;
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const xn = i / mr; const yn = j / mr;
      if (xn * xn + yn * yn > 1.04) continue;
      const term = k * Math.sqrt(Math.max(0, 1 - yn * yn));
      const lit = (phase < 0.5 ? xn : -xn) >= term;
      ctx.fillStyle = lit ? (dark ? '#EDE2D5' : '#FFF8F1') : (dark ? '#3A3333' : '#E2C9C0');
      ctx.fillRect(x0 + (mx + i) * p, y0 + (my + j) * p, p, p);
    }
  }
  const g1 = dark ? '#2C2827' : '#DDD2C9';
  const g2 = dark ? '#363130' : '#D2C6BC';
  const grass = dark ? '#6F7C66' : '#9DAA8F';
  const grass2 = dark ? '#AFBCA2' : '#7F8C72';
  for (let j = groundY; j < rowsN; j++) {
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = (i * 3 + j * 5) % 11 === 0 ? g2 : g1;
      ctx.fillRect(x0 + i * p, y0 + j * p, p, p);
    }
  }
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = grass;
    ctx.fillRect(x0 + i * p, y0 + groundY * p, p, p);
    if (rand() < 0.4) { ctx.fillStyle = grass2; ctx.fillRect(x0 + i * p, y0 + (groundY - 1) * p, p, p); }
  }
  const n = Math.max(1, Math.min(12, (data.garden && data.garden.count) || 1));
  const pc = { g: grass2, d: grass, r: dark ? '#D3A99F' : '#B58C83', y: dark ? '#E8D9A8' : '#D9C48A', w: dark ? '#EEE7E3' : '#FFFFFF' };
  const elliX = 5;
  const freeL = elliX + 26;
  const span = cols - 3 - freeL;
  for (let q = 0; q < n; q++) {
    const isNew = q === n - 1;
    const kind = isNew ? 4 : [0, 1, 2, 3, 1, 2][Math.floor(rand() * 6)];
    const rows = PLANTS[kind];
    const xx = freeL + Math.round(((q + 0.5) / n) * span) - 2;
    const yy = groundY - rows.length + 1;
    sprite(ctx, rows, pc, x0 + xx * p, y0 + yy * p, p);
    if (isNew) {
      ctx.fillStyle = pc.w;
      ctx.fillRect(x0 + (xx + 6) * p, y0 + (yy - 1) * p, p, p);
      ctx.fillRect(x0 + (xx - 2) * p, y0 + (yy + 2) * p, p, p);
    }
  }
  const comp = opts.companion && opts.companion.rows ? opts.companion : ELLI;
  const colors = (comp.colors && (comp.colors[theme] || comp.colors.hell)) || {};
  sprite(ctx, comp.rows, colors, x0 + elliX * p, y0 + (groundY - comp.rows.length + 1) * p, p);
}

/**
 * Briefmarke mit Zähnung und Pixel-Garten, darüber ein Poststempel mit Ort und Uhrzeit.
 * Für Lauf und Kraft. data.garden.count = Einheiten im Monat = Pflanzen im Beet.
 * Detailliert: darunter alle Übungen bzw. Kilometer.
 */
export function pixelStempel(data, opts = {}) {
  const o = { ...opts, template: 'stempel' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(data, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const dark = theme === 'dunkel';
  const f = facts(data, o.focus);

  const cols = 62; const rowsN = detailed ? 54 : 70; const p = detailed ? 9 : 10;
  const pad = 28; const foot = 84;
  const sw = cols * p + pad * 2; const sh = rowsN * p + pad + foot;
  const stamp = makeCanvas(sw, sh, o);
  const s = stamp.getContext('2d');
  s.textBaseline = 'alphabetic';
  s.fillStyle = dark ? '#EFE8E2' : '#FFFCFA';
  s.fillRect(0, 0, sw, sh);
  pixelScene(s, pad, pad, cols, rowsN, p, theme, data, rand, o);
  s.strokeStyle = 'rgba(46,42,40,0.16)'; s.lineWidth = 1.5;
  s.strokeRect(pad - 0.75, pad - 0.75, cols * p + 1.5, rowsN * p + 1.5);
  const valInk = dark ? '#F4ECE6' : '#2E2A28';
  writeRun(s, [
    { t: f.hero.value, px: 96, color: valInk, tracking: -2 },
    { t: f.hero.unit, px: 42, italic: true, color: valInk, gap: 8, alpha: 0.75 },
  ], pad + 26, pad + 100);
  const footY = pad + rowsN * p + 54;
  write(s, f.title, pad + 2, footY, { px: 36, color: '#2E2A28' });
  write(s, 'nachtgarten', sw - pad - 24, pad + 58, { px: 32, italic: true, color: valInk, align: 'right', alpha: 0.8 });
  s.globalCompositeOperation = 'destination-out';
  const holeR = 8.5; const step = 28;
  for (let x = step / 2; x < sw; x += step) {
    s.beginPath(); s.arc(x, 0, holeR, 0, Math.PI * 2); s.fill();
    s.beginPath(); s.arc(x, sh, holeR, 0, Math.PI * 2); s.fill();
  }
  for (let y = step / 2; y < sh; y += step) {
    s.beginPath(); s.arc(0, y, holeR, 0, Math.PI * 2); s.fill();
    s.beginPath(); s.arc(sw, y, holeR, 0, Math.PI * 2); s.fill();
  }
  s.globalCompositeOperation = 'source-over';

  const cx = W / 2; const cy = SAFE.top + 34 + sh / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.03);
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.5)' : 'rgba(80,60,50,0.2)';
  ctx.shadowBlur = 44; ctx.shadowOffsetY = 16;
  ctx.drawImage(stamp, -sw / 2, -sh / 2);
  ctx.restore();
  postmark(ctx, cx + sw / 2 - 66, cy + sh / 2 - 70, 124, pal, data);

  const below = cy + sh / 2 + 40;
  if (detailed) {
    const rows = data.type === 'kraft' ? compactRows(data, detailRows(data)) : detailRows(data);
    const y0 = below + 50;
    const avail = SAFE.bottom - 80 - y0;
    const rowH = Math.min(60, avail / rows.length);
    drawRows(ctx, rows, M, W - M, y0, rowH, pal, { px: Math.min(36, rowH * 0.62), index: data.type === 'kraft', compact: true });
    signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 30 });
  } else {
    const yS = below + 140;
    statRow(ctx, f.stats.slice(0, 2), M + 60, W - M - 60, yS, pal, { px: 72, labelPx: 26, align: 'center' });
    const count = data.garden && data.garden.count;
    if (count) {
      write(ctx, `Der Garten wächst: ${count} ${count === 1 ? 'Einheit' : 'Einheiten'} im ${fmtMonth(data.start || data.date)}.`, W / 2, Math.min(SAFE.bottom - 12, yS + 150), { px: 36, italic: true, color: pal.muted, align: 'center' });
    }
  }
  return canvas;
}

function postmark(ctx, x, y, r, pal, data) {
  const when = data.start || data.date;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.16);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = pal.rose;
  ctx.fillStyle = pal.rose;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r - 46, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const xx = r + 16 + t * 210;
      const yy = k * 28 + Math.sin(t * Math.PI * 3 + k) * 8;
      if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  arcText(ctx, (data.place || 'nachtgarten').toLowerCase(), r - 23, -Math.PI / 2, 28, true);
  arcText(ctx, `${fmtTime(when)} uhr`, r - 23, Math.PI / 2, 26, false);
  ctx.font = fontOf({ px: 40 });
  ctx.textAlign = 'center';
  ctx.fillText(fmtDateShort(when), 0, 13);
  ctx.restore();
}

/** Text entlang eines Kreisbogens, zentriert um `mid`; oben im Uhrzeigersinn, unten lesbar. */
function arcText(ctx, str, radius, mid, px, top) {
  ctx.font = fontOf({ px, italic: true });
  ctx.textAlign = 'center';
  const chars = [...str];
  const widths = chars.map((ch) => ctx.measureText(ch).width + 2);
  const total = widths.reduce((a, b) => a + b, 0);
  const dir = top ? 1 : -1;
  let ang = mid - (dir * (total / radius)) / 2;
  chars.forEach((ch, i) => {
    const a = ang + (dir * (widths[i] / radius)) / 2;
    ctx.save();
    ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.rotate(a + (dir * Math.PI) / 2);
    ctx.fillText(ch, 0, px * 0.34);
    ctx.restore();
    ang += (dir * widths[i]) / radius;
  });
}

// ───────────────────────────── e) Minimal-Typo „Plakat“ ─────────────────────────────

/** Nur Ziffern: eine große Zahl, zwei kleinere darunter – wie ein Plakat. focus 'bestwert' für Rekorde. */
export function minimalTypo(data, opts = {}) {
  const o = { ...opts, template: 'typo' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(data, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(data, o.focus);
  const onPhoto = transparent && theme === 'dunkel';
  const ink = onPhoto ? '#F8F2ED' : pal.ink;
  const muted = onPhoto ? 'rgba(248,242,237,0.84)' : pal.muted;
  const accent = onPhoto ? '#E6C0B6' : pal.roseInk;
  const shadow = transparent ? (onPhoto ? 'rgba(18,12,10,0.4)' : 'rgba(255,250,246,0.55)') : null;
  const p = { ...pal, ink, muted, roseInk: accent };

  withShadow(ctx, shadow, 26, () => {
    write(ctx, f.title, M, SAFE.top + 40, { px: 40, italic: true, color: muted });
    write(ctx, f.line.replace(/^Nr\. \d+ · /, '').replace(/ · \d\d:\d\d$/, ''), W - M, SAFE.top + 40, { px: 28, serif: false, color: muted, align: 'right' });
    const trEm = -0.03;
    const heroPx = fitSize(ctx, f.hero.value, W - M * 2 + 16, { trackingEm: trEm }, 600);
    const yHero = SAFE.top + 110 + heroPx * 0.7;
    write(ctx, f.hero.value, M - heroPx * 0.035, yHero, { px: heroPx, color: ink, tracking: heroPx * trEm });
    const label = o.focus === 'bestwert' && f.hero.unit ? `${f.hero.unit} · ${f.hero.label}` : f.hero.label;
    write(ctx, label, M, yHero + heroPx * 0.13 + 70, { px: 62, italic: true, color: accent });

    if (detailed) {
      const rows = data.type === 'kraft' ? compactRows(data, detailRows(data)) : detailRows(data);
      const y0 = yHero + heroPx * 0.13 + 140;
      hairline(ctx, M, y0, W - M, ink, 0.18);
      const avail = SAFE.bottom - 90 - (y0 + 30);
      const rowH = Math.min(66, avail / rows.length);
      drawRows(ctx, rows, M, W - M, y0 + 30, rowH, p, { px: Math.min(38, rowH * 0.6), index: data.type === 'kraft', compact: true });
    } else {
      let y = yHero + heroPx * 0.13 + 350;
      for (const st of f.stats.slice(0, 2)) {
        hairline(ctx, M, y - 190, W - M, ink, 0.18);
        writeRun(ctx, [
          { t: st.value, px: 190, color: ink, tracking: -3 },
          ...(st.unit ? [{ t: st.unit, px: 70, italic: true, color: muted, gap: 14 }] : []),
        ], M - 4, y);
        write(ctx, st.label, W - M, y, { px: 40, italic: true, color: muted, align: 'right' });
        y += 240;
      }
    }
    signature(ctx, W - M, SAFE.bottom - 12, p, rand, o, { align: 'right', px: 30, color: muted });
  });
  return canvas;
}

// ───────────────────────────── f) Tempo-Welle ─────────────────────────────

/**
 * Viele feine Linien wie Höhenzüge; die Höhe folgt dem Tempo (schneller = höher).
 * Die Linie in Altrosa ist das echte Tempo, die anderen ihr Echo.
 */
export function tempoWelle(run, opts = {}) {
  const o = { ...opts, template: 'welle' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(run, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const dark = theme === 'dunkel';
  const f = facts(run);
  const paces = paceProfile(run);
  const min = Math.min(...paces); const max = Math.max(...paces);
  const speed = paces.map((q) => (max - min ? (max - q) / (max - min) : 0.5));
  const fastIdx = paces.indexOf(min);

  const x1 = M; const x2 = W - M;
  const top = SAFE.top + 250; const lines = 26; const gap = 24;
  const prof = (t) => {
    if (speed.length < 2) return 0.5;
    const ff = t * (speed.length - 1);
    const i = Math.min(speed.length - 2, Math.floor(ff));
    const k = (1 - Math.cos((ff - i) * Math.PI)) / 2;
    return speed[i] * (1 - k) + speed[i + 1] * k;
  };
  const phases = Array.from({ length: lines }, () => [rand() * 6.28, rand() * 6.28, 0.6 + rand() * 0.8]);
  const hero = Math.round(lines * 0.6);
  let heroPts = [];
  for (let li = 0; li < lines; li++) {
    const base = top + li * gap + 140;
    const near = Math.exp(-((li - hero) ** 2) / 40);
    const pts = [];
    for (let k = 0; k <= 180; k++) {
      const t = k / 180;
      const env = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.02) / 0.96))) ** 1.4;
      const [a, b, c] = phases[li];
      const noise = Math.sin(t * 8 * c + a) * 0.5 + Math.sin(t * 21 + b) * 0.2;
      const v = li === hero ? prof(t) : prof(t) * (0.3 + 0.7 * near) + noise * 0.24 * (1 - near * 0.7);
      pts.push([x1 + t * (x2 - x1), base - env * (34 + 220 * Math.max(0, v))]);
    }
    if (li === hero) heroPts = pts;
    if (!transparent) {
      ctx.fillStyle = pal.paper;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineTo(x2, base + gap * 2); ctx.lineTo(x1, base + gap * 2); ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = li === hero ? pal.rose : pal.ink;
    ctx.globalAlpha = li === hero ? 1 : (dark ? 0.24 : 0.22) + near * 0.3;
    ctx.lineWidth = li === hero ? 4.5 : 1.7;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (paces.length > 1 && heroPts.length) {
    const t = fastIdx / (paces.length - 1);
    const q = heroPts[Math.round(t * (heroPts.length - 1))];
    blossom(ctx, Math.round(q[0]) - 4, Math.round(q[1]) - 28, 8, pal, dark ? '#E8D9A8' : '#D9C48A');
  }
  const yAxis = top + lines * gap + 190;
  paces.forEach((q, i) => {
    const t = paces.length > 1 ? i / (paces.length - 1) : 0.5;
    const x = x1 + t * (x2 - x1);
    const a = i === 0 ? 'left' : i === paces.length - 1 ? 'right' : 'center';
    write(ctx, String(i + 1), x, yAxis, { px: 30, italic: true, color: i === fastIdx ? pal.roseInk : pal.muted, align: a });
    if (detailed) write(ctx, fmtPace(q), x, yAxis + 42, { px: 25, serif: false, color: pal.ink, align: a, alpha: 0.85 });
  });
  write(ctx, f.line, M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted });
  write(ctx, f.title, M - 3, SAFE.top + 128, { px: 80, color: pal.ink });

  const yV = SAFE.bottom - 120;
  writeRun(ctx, [
    { t: f.hero.value, px: 150, color: pal.ink, tracking: -3 },
    { t: 'km', px: 60, italic: true, color: pal.muted, gap: 14 },
  ], M - 4, yV);
  f.stats.slice(0, 2).forEach((x, i) => writeRun(ctx, [
    { t: x.value, px: 54, color: pal.ink },
    ...(x.unit ? [{ t: x.unit, px: 28, italic: true, color: pal.muted, gap: 6 }] : []),
  ], W - M, yV - 70 + i * 70, 'right'));
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 30 });
  write(ctx, 'Tempo je Kilometer', M, SAFE.bottom - 12, { px: 28, italic: true, color: pal.muted });
  return canvas;
}

// ───────────────────────────── Übersicht ─────────────────────────────

/** Alle Vorlagen mit ihren sinnvollen Varianten. */
export const TEMPLATES = {
  sticker: { name: 'Lauf-Sticker', for: ['lauf'], render: laufSticker, variants: [{ theme: 'dunkel', transparent: true }, { theme: 'hell', transparent: true }, { theme: 'hell', transparent: false }, { theme: 'dunkel', transparent: false }] },
  sternbild: { name: 'Sternbild', for: ['lauf'], render: laufKarte, variants: [{ theme: 'dunkel' }, { theme: 'hell' }] },
  kraft: { name: 'Körperbeet · Programmheft', for: ['kraft'], render: kraftKarte, variants: [{ theme: 'hell' }, { theme: 'dunkel' }, { theme: 'dunkel', transparent: true }] },
  stempel: { name: 'Briefmarke', for: ['lauf', 'kraft'], render: pixelStempel, variants: [{ theme: 'dunkel' }, { theme: 'hell' }, { theme: 'hell', transparent: true }] },
  typo: { name: 'Plakat', for: ['lauf', 'kraft'], render: minimalTypo, variants: [{ theme: 'hell' }, { theme: 'dunkel' }, { theme: 'dunkel', transparent: true }] },
  welle: { name: 'Tempo-Welle', for: ['lauf'], render: tempoWelle, variants: [{ theme: 'dunkel' }, { theme: 'hell' }] },
};

/** Rendert eine Vorlage (z. B. einen Vorschlag aus suggestCards) mit zusätzlichen Optionen. */
export function renderCard(session, { template, opts = {} }, extra = {}) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`Unbekannte Vorlage: ${template}`);
  return t.render(session, { ...opts, ...extra });
}

/** Vorschläge samt Renderfunktion – für die Auswahl nach dem Training. */
export function suggestions(session, extra = {}) {
  return suggestCards(session).map((s) => ({ ...s, render: (more = {}) => renderCard(session, s, { ...extra, ...more }) }));
}

/** Lädt die Schriftschnitte, die die Karten brauchen (im Browser). */
export async function ensureFonts(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !doc.fonts) return;
  await Promise.all([
    `400 100px ${SERIF}`, `italic 400 100px ${SERIF}`, `400 100px ${SANS}`, `600 100px ${SANS}`,
  ].map((f) => doc.fonts.load(f).catch(() => null)));
}

/** Canvas → PNG-Blob (für Teilen, Kopieren, Speichern). */
export function toBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
}
