/**
 * Nachtgarten – Teilen: Werkzeug für alle Bildvorlagen (Papier, Schrift, Siegel, Signatur).
 * Reine Canvas-Helfer ohne Vorlagenlogik; cards.js und kraftbilder.js bauen darauf auf.
 */

import { hashOf, pathLength, seeded } from './geo.js';
import { sealForSpecies } from './seal.js';

export const W = 1080;
export const H = 1920;
/** Sichere Zone der Instagram-Story: hier liegt alles Wichtige. */
export const SAFE = { top: 250, bottom: H - 340, left: 72, right: W - 72 };
/** Formate. Im Feed wird die Story-Zone (250…1580) auf 90 % gesetzt; eigene Layouts nutzen FRAME. */
export const FORMATS = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1350 } };
/** Inhaltsrahmen je Format (für Vorlagen mit eigenem Feed-Layout). */
export const FRAME = { story: { top: SAFE.top, bottom: SAFE.bottom }, feed: { top: 84, bottom: 1350 - 70 } };
export const FEED_K = 0.9;
export const FEED_T = [FEED_K, 0, 0, FEED_K, (W - W * FEED_K) / 2, 76 - SAFE.top * FEED_K];
export const M = 96; // Seitenrand für Text

export const SERIF = "'Instrument Serif', 'Iowan Old Style', Georgia, serif";
export const SANS = "'Nunito Sans', system-ui, sans-serif";

/** Abendruhe-Palette, je Thema. „ink“ ist die Schriftfarbe. */
export const PALETTES = {
  hell: {
    paper: '#F4F1EC', paper2: '#EEEAE4', ink: '#24211F', muted: '#7B736E', faint: '#B3ABA5',
    rose: '#B07F75', roseInk: '#9A685E', sage: '#9DAA8F', soft: '#E9E4DE', line: '#DAD3CC',
    far: '#A29A94', env: '#DDD6CF',
  },
  dunkel: {
    paper: '#211E1E', paper2: '#1C1A1A', ink: '#EEE9E4', muted: '#A69D98', faint: '#625A57',
    rose: '#D3A99F', roseInk: '#D9AFA5', sage: '#AFBCA2', soft: '#363130', line: '#3A3433',
    far: '#7A726E', env: '#3D3735',
  },
};

// ───────────────────────────── Grundwerkzeuge ─────────────────────────────

export function makeCanvas(w, h, opts = {}) {
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
export function begin(data, opts, size) {
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

export const fontOf = ({ px, serif = true, italic = false, weight = 400 }) =>
  `${italic ? 'italic ' : ''}${weight} ${Math.round(px * 10) / 10}px ${serif ? SERIF : SANS}`;

/** letterSpacing gibt es in Safari erst ab 18.4 – sonst setzen wir Zeichen für Zeichen. */
export const hasTracking = (ctx) => 'letterSpacing' in ctx;
export function setTracking(ctx, px) { if (hasTracking(ctx)) ctx.letterSpacing = `${px}px`; }

export function trackedWidth(ctx, str, tracking) {
  if (!tracking) return ctx.measureText(str).width;
  if (hasTracking(ctx)) { setTracking(ctx, tracking); const w = ctx.measureText(str).width; setTracking(ctx, 0); return w; }
  const chars = [...str];
  return chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + tracking * chars.length;
}

/** Schreibt einen Text; gibt die Breite zurück. o: {px, serif, italic, weight, color, align, alpha, tracking} */
export function write(ctx, str, x, y, o) {
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

export function measure(ctx, str, o) {
  ctx.font = fontOf(o);
  return trackedWidth(ctx, str, o.tracking || 0);
}

/** Mehrere Textstücke auf einer Grundlinie (z. B. „7,42“ + kursives „km“). */
export function writeRun(ctx, parts, x, y, align = 'left') {
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
export function fitSize(ctx, str, maxW, o, maxPx) {
  const w = measure(ctx, str, { ...o, px: 100, tracking: (o.trackingEm || 0) * 100 });
  return Math.min(maxPx, (maxW / (w || 1)) * 100);
}

/** Papier: weicher Verlauf, Vignette, feines Korn. */
export function paper(ctx, pal, theme, rand, opts, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme === 'dunkel' ? '#252121' : '#F6F3EF');
  g.addColorStop(0.6, pal.paper);
  g.addColorStop(1, pal.paper2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h * 0.42, h * 0.2, w / 2, h * 0.5, h * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, theme === 'dunkel' ? 'rgba(0,0,0,0.2)' : 'rgba(90,70,60,0.05)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, theme, rand, opts, w, h);
}

/** Korn: kleine Kachel mit Zufallspunkten, als Muster über die ganze Fläche. */
export function grain(ctx, theme, rand, opts, w, h) {
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

export function withShadow(ctx, color, blur, fn) {
  if (!color) { fn(); return; }
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = Math.round(blur / 8);
  fn();
  ctx.restore();
}

export function hairline(ctx, x1, y, x2, color, alpha = 1, width = 1.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.restore();
}

/** Werte nebeneinander: Zahl in der Serife, darunter ein ruhiges Etikett. */
export function statRow(ctx, stats, x1, x2, y, pal, { px = 76, labelPx = 27, align = 'spread', color, muted } = {}) {
  const n = stats.length;
  const colW = (x2 - x1) / n;
  stats.forEach((s, i) => {
    let x; let a;
    if (align === 'center') { x = x1 + colW * (i + 0.5); a = 'center'; } else if (align === 'spread') {
      a = i === 0 ? 'left' : i === n - 1 && n > 1 ? 'right' : 'center';
      x = a === 'left' ? x1 : a === 'right' ? x2 : (x1 + x2) / 2;
    } else if (align === 'grid') { x = x1 + ((x2 - x1) / Math.max(3, n)) * i; a = 'left'; } else { x = x1 + colW * i; a = 'left'; }
    const ink = s.accent ? pal.roseInk : color || pal.ink;
    const parts = [{ t: s.value, px, color: ink }];
    if (s.unit) parts.push({ t: s.unit, px: px * 0.42, italic: true, color: s.accent ? pal.roseInk : muted || pal.muted, gap: px * 0.1 });
    writeRun(ctx, parts, x, y, a);
    const lp = align === 'grid' ? Math.min(labelPx, fitSize(ctx, s.label, (x2 - x1) / Math.max(3, n) - 20, { serif: false }, labelPx)) : labelPx;
    write(ctx, s.label, x, y + labelPx + 18, { px: lp, serif: false, color: s.accent ? pal.roseInk : muted || pal.muted, align: a });
  });
}

// ───────────────────────────── Pinselstrich ─────────────────────────────

/** Eine einzige, gefüllte Linie mit wechselnder Breite – widthAt(t), t ∈ [0, 1]. */
export function brushStroke(ctx, pts, widthAt, color) {
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
export function breathingWidth(base, paces) {
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

/**
 * Motiv des Siegels: eigene Zeilen (opts.sealRows), sonst der Begleiter
 * (opts.companion.species bzw. opts.seal als Art-Id), sonst Keimling/Mond/Elli.
 */
export function sealRowsOf(opts = {}, motif = opts.seal) {
  if (opts.sealRows) return opts.sealRows;
  const species = (opts.companion && opts.companion.species) || (motif && !SEALS[motif] ? motif : null);
  const rows = species ? sealForSpecies(species) : null;
  return rows || SEALS[motif] || SEALS.keim;
}

/** Das Siegel: ein kleiner Pixel-Stempel in Altrosa, Motiv ausgespart – wie der rote Stempel unter einem Holzschnitt. */
export function seal(ctx, x, y, size, pal, rand, opts, motif = 'keim', motifRows = null) {
  const rows = motifRows || sealRowsOf(opts, motif);
  const nx = rows[0].length + 2; const ny = rows.length + 2;
  const p = Math.max(1, Math.round(size / 11));
  const c = makeCanvas(p * nx, p * ny, opts);
  const s = c.getContext('2d');
  s.fillStyle = pal.rose;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if ((i === 0 || i === nx - 1) && (j === 0 || j === ny - 1)) continue;
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
  for (let k = 0; k < 3; k++) s.fillRect(Math.floor(rand() * nx) * p, Math.floor(rand() * ny) * p, p, p);
  ctx.drawImage(c, Math.round(x), Math.round(y));
  return p * nx;
}

/**
 * Das Zeichen: eine schmale Mondsichel – Nacht, ohne Niedlichkeit. Mittelpunkt (cx, cy), Höhe h.
 */
export function mark(ctx, cx, cy, h, color) {
  const r1 = h / 2; const r2 = r1 * 0.84;
  const dx = r1 * 0.5; const dy = -r1 * 0.24; // innerer Kreis nach rechts oben versetzt
  const d = Math.hypot(dx, dy); const ux = dx / d; const uy = dy / d;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const P1 = [a * ux - hh * uy, a * uy + hh * ux]; const P2 = [a * ux + hh * uy, a * uy - hh * ux];
  const ang = (p, c = [0, 0]) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  // Bogen von s nach e, der durch Winkel m läuft
  const arcThrough = (x0, y0, r, s0, e0, m) => {
    const norm = (t) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const cw = norm(m - s0) < norm(e0 - s0);
    ctx.arc(x0, y0, r, s0, e0, !cw);
  };
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  arcThrough(cx, cy, r1, ang(P1), ang(P2), Math.atan2(-uy, -ux));
  arcThrough(cx + dx, cy + dy, r2, ang(P2, [dx, dy]), ang(P1, [dx, dy]), Math.atan2(-uy, -ux));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Signatur: Zeichen + „nachtgarten“ kursiv, klein. y ist die Grundlinie.
 * Standard ist die Mondsichel; das Pixel-Siegel des Begleiters nur mit opts.companion (opt-in).
 */
export function signature(ctx, x, y, pal, rand, opts, { align = 'right', px = 32, color } = {}) {
  const word = 'nachtgarten';
  const o = { px, italic: true, color: color || pal.muted };
  const tw = measure(ctx, word, o);
  const gap = Math.round(px * 0.36);
  if (opts.companion) {
    const sz = Math.round((px * 1.1) / 11) * 11;
    const total = sz + gap + tw;
    const x0 = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    seal(ctx, x0, y + Math.round(px * 0.12) - sz, sz, pal, rand, opts, opts.seal);
    write(ctx, word, x0 + sz + gap, y, o);
    return total;
  }
  const mh = Math.round(px * 0.78);
  const total = mh * 0.8 + gap + tw;
  const x0 = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  mark(ctx, x0 + mh * 0.4, y - px * 0.3, mh, pal.rose);
  write(ctx, word, x0 + mh * 0.8 + gap, y, o);
  return total;
}

/**
 * Zahl mit festen Ziffernbreiten (Tabellenziffern), rechts- oder linksbündig.
 * Hat die Schrift ohnehin gleich breite Ziffern, wird der Text in einem Stück gesetzt.
 */
export function writeNum(ctx, str, x, y, o) {
  ctx.font = fontOf(o);
  const dw = ctx.measureText('0').width;
  const uniform = ['1', '4', '7'].every((d) => Math.abs(ctx.measureText(d).width - dw) < 0.01);
  if (uniform || !/\d/.test(str)) return write(ctx, str, x, y, o);
  const widths = [...str].map((ch) => (/\d/.test(ch) ? dw : ctx.measureText(ch).width));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x;
  [...str].forEach((ch, i) => {
    const w = widths[i];
    write(ctx, ch, cx + (/\d/.test(ch) ? (w - ctx.measureText(ch).width) / 2 : 0), y, { ...o, align: 'left' });
    ctx.font = fontOf(o);
    cx += w;
  });
  return total;
}

/** Breite einer Zahl mit Tabellenziffern. */
export function measureNum(ctx, str, o) {
  ctx.font = fontOf(o);
  const dw = ctx.measureText('0').width;
  return [...str].reduce((a, ch) => a + (/\d/.test(ch) ? dw : ctx.measureText(ch).width), 0);
}

/** Markierung für Bestwert / schnellsten Kilometer. */
export function blossom(ctx, x, y, p, pal) {
  // Markierung: ein kleiner Punkt in Altrosa (früher eine Pixel-Blüte)
  ctx.save();
  ctx.fillStyle = pal.rose;
  ctx.beginPath(); ctx.arc(x + p / 2, y + p / 2, p * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
