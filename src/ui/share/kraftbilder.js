/**
 * Nachtgarten – Teilen: Kraft-Vorlagen mit dem Pixel-Mannequin der Übungsanimationen.
 *
 *   koerperbeet       Vorder- und Rückansicht, trainierte Muskeln getönt, die stärksten blühen
 *   bewegungsStudie   die Hauptübung als Serienfotografie (wie Muybridge), Bild für Bild
 *   sammelKarte       jede Übung eine Sammelkarte; kompakt die Hauptübung mit zwei Karten dahinter,
 *                     detailliert alle Übungen als Kartensatz
 *   drawPoseThumb     Mini-Pose für Listen (Programmheft)
 *   drawBodyPair      kleines Paar vorn/hinten (Kopf des Programmhefts)
 *
 * Alle Renderer: (workout, opts) → Canvas, wie in cards.js.
 */

import { ANKLE_Y, GROUND } from '../anim/figure.js';
import {
  facts, fmtDateShort, fmtInt, fmtKg, musclesText, setsText, summarizeStrength, MUSCLE_NAMES,
} from './data.js';
import {
  M, SAFE, W, begin, blossom, fitSize, hairline, measure, paper, signature, statRow, withShadow, write, writeRun,
} from './ink.js';
import {
  MANNEQUIN_COLORS, boundsOf, paintRaster, rasterPose,
} from './mannequin.js';
import {
  heroExercise, keyPose, motionOf, movingSegments, sequence,
} from './pose.js';
import { seeded } from './geo.js';

/** Figureneinheiten je Pixel: so grob wie die Sprites der Übungsanimationen. */
const UNITS_PER_CELL = 1.55;

/** Flächen und Linien für Tafeln und Karten, passend zum Papier. */
const PLATE = {
  hell: { panel: '#EEE7E2', grid: 'rgba(80,62,55,0.075)', ghost: '#CFC4BD', ghostWork: '#D9AEA4', ghostHead: '#F7F2EE', ghostSprout: '#BAC4AF', face: '#FFFCFA', window: '#F1EAE5', edge: '#E2D8D1' },
  dunkel: { panel: '#332E2E', grid: 'rgba(238,231,227,0.06)', ghost: '#6A605E', ghostWork: '#A07D75', ghostHead: '#9A8F8B', ghostSprout: '#7F8A75', face: '#3A3434', window: '#2C2828', edge: '#463F3E' },
};

const themeOf = (opts) => (opts.theme === 'dunkel' || opts.theme === 'dark' ? 'dunkel' : 'hell');

/** Muskelgewichte einer Übung als {m: 0…1}. */
function exMuscles(ex) {
  if (Array.isArray(ex.muscles)) return Object.fromEntries(ex.muscles.map((m, i) => [m, i === 0 ? 1 : 0.6]));
  return { ...(ex.muscles || {}) };
}

/**
 * Malt eine Pose in ein Feld: Boden auf der Unterkante, waagerecht mittig.
 * fr = Rahmen in Figureneinheiten, s = px je Einheit.
 */
function figureIn(ctx, def, pose, box, fr, s, colors, o = {}) {
  const p = Math.max(2, Math.round(s * (o.unit || UNITS_PER_CELL)));
  const cols = Math.max(4, Math.round((fr[2] * s) / p));
  const rows = Math.max(4, Math.round((fr[3] * s) / p));
  const frame = [fr[0] + fr[2] / 2 - (cols * p) / s / 2, fr[1] + fr[3] - (rows * p) / s, (cols * p) / s, (rows * p) / s];
  const R = rasterPose(pose, def, { ...o, frame, cols, rows });
  const x = Math.round(box.x + (box.w - cols * p) / 2);
  const y = Math.round(box.y + box.h - rows * p);
  paintRaster(ctx, R, x, y, p, colors, o);
  // Bodenlinie der Figur in px (für Gras, Schatten …)
  const groundY = y + ((GROUND + 0.7 - frame[1]) * s);
  return { R, x, y, p, cols, rows, frame, groundY, s };
}

/** Muybridge-Raster: feine Linien, an der Bodenlinie ausgerichtet. */
function plateGrid(ctx, x, y, w, h, step, color, groundY) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let gx = x + ((w / 2) % step); gx < x + w; gx += step) { ctx.moveTo(Math.round(gx) + 0.5, y); ctx.lineTo(Math.round(gx) + 0.5, y + h); }
  for (let gy = groundY; gy > y; gy -= step) { ctx.moveTo(x, Math.round(gy) + 0.5); ctx.lineTo(x + w, Math.round(gy) + 0.5); }
  ctx.stroke();
  ctx.restore();
}

/** Pixel-Gras auf einer Bodenlinie (ein, zwei Halme hoch, Salbei). */
function grassRow(ctx, x0, x1, gy, p, colors, rand, density = 0.42) {
  const g1 = colors.sprout; const g2 = colors.band;
  ctx.fillStyle = colors.floor;
  ctx.fillRect(Math.round(x0), Math.round(gy), Math.round(x1 - x0), p);
  for (let x = x0; x < x1 - p; x += p) {
    if (rand() < density) { ctx.fillStyle = rand() < 0.5 ? g1 : g2; ctx.fillRect(Math.round(x), Math.round(gy - p), p, p); }
    if (rand() < density * 0.22) { ctx.fillStyle = g1; ctx.fillRect(Math.round(x), Math.round(gy - 2 * p), p, p); }
  }
}

// ───────────────────────────── Mini-Posen ─────────────────────────────

/** Mini-Pose einer Übung in ein Quadrat (x, y, size) – Schlüsselpose, arbeitende Glieder in Altrosa. */
export function drawPoseThumb(ctx, ex, x, y, size, theme, { panel = true } = {}) {
  const mo = motionOf(ex);
  const pose = keyPose(mo.def);
  const fr = boundsOf(mo.def, [pose], { pad: 2 });
  const colors = MANNEQUIN_COLORS[theme];
  if (panel) {
    ctx.save();
    ctx.fillStyle = PLATE[theme].panel;
    roundRect(ctx, x, y, size, size, size * 0.18); ctx.fill();
    ctx.restore();
  }
  const inner = size * 0.84;
  const s = Math.min(inner / fr[2], inner / fr[3]);
  const p = Math.max(2, Math.round(s * 2.1));
  const cols = Math.max(4, Math.round((fr[2] * s) / p));
  const rows = Math.max(4, Math.round((fr[3] * s) / p));
  const frame = [fr[0] + fr[2] / 2 - (cols * p) / s / 2, fr[1] + fr[3] / 2 - (rows * p) / s / 2, (cols * p) / s, (rows * p) / s];
  const R = rasterPose(pose, mo.def, { frame, cols, rows, moving: movingSegments(mo.def), detail: false, ss: 2 });
  paintRaster(ctx, R, Math.round(x + (size - cols * p) / 2), Math.round(y + (size - rows * p) / 2), p, colors, { skip: ['env', 'envLine', 'mat', 'floor'] });
}

// ───────────────────────────── Körper vorn / hinten ─────────────────────────────

const HY = ANKLE_Y - 36.9;
/** Ruhiger Stand von vorn (wie FSTAND in den Mustern), Arme etwas vom Körper. */
const STAND_FRONT = { hx: 50, hy: HY, tr: 0, lA: [45.2, ANKLE_Y], rA: [54.8, ANKLE_Y], lU: 16, lL: 9, rU: 16, rL: 9 };
const BODY = { label: 'Stand', view: 'front', props: [], frames: [STAND_FRONT] };
const BODY_BACK = { ...BODY, back: true };
let bodyFrame = null;

/** Rahmen der stehenden Figur (beide Ansichten gleich). */
function standFrame() {
  if (!bodyFrame) bodyFrame = boundsOf(BODY, [STAND_FRONT], { pad: 2 });
  return bodyFrame;
}

/**
 * Paar vorn/hinten mit Muskel-Tönung. (x, y) linke obere Ecke, h = Höhe der Figuren in px.
 * Gibt die Boxen beider Figuren zurück. o.bloom: Blüten auf den stärksten Muskeln.
 */
export function drawBodyPair(ctx, x, y, h, load, theme, { gap = 0.5, bloom = false, seed = 1, grass = false } = {}) {
  const fr = standFrame();
  const s = h / fr[3];
  const w = fr[2] * s;
  // Auf der hellen Figur im Dunkeln braucht die Tönung mehr Tiefe als in den Animationen
  const colors = theme === 'dunkel' ? { ...MANNEQUIN_COLORS.dunkel, work: '#C9877B', move: '#DDAA9F' } : MANNEQUIN_COLORS.hell;
  const rand = seeded(seed);
  const out = [];
  [BODY, BODY_BACK].forEach((def, k) => {
    const box = { x: x + k * (w + w * gap), y, w, h };
    const r = figureIn(ctx, def, STAND_FRONT, box, fr, s, colors, { muscles: load, unit: h > 400 ? 1.2 : 1.55, eyeR: h > 400 ? 0.8 : 1.1 });
    if (bloom) blooms(ctx, r, load, colors, rand);
    out.push({ ...box, ...r });
  });
  if (grass) {
    const gy = out[0].groundY + out[0].p * 0.2;
    grassRow(ctx, x - w * 0.15, x + 2 * w + w * gap + w * 0.15, gy, out[0].p, colors, rand);
  }
  return out;
}

/** Pixel-Blüten auf den getönten Zellen (Arbeitsfarbe), je mehr Last, desto mehr. */
function blooms(ctx, r, load, colors, rand) {
  const strong = Object.values(load).filter((v) => v >= 0.66).length;
  if (!strong) return;
  const cells = [];
  for (let j = 1; j < r.rows - 1; j++) {
    for (let i = 1; i < r.cols - 1; i++) {
      const c = r.R.cells[j * r.cols + i];
      if (c && KEY_WORK.has(c) && KEY_WORK.has(r.R.cells[(j - 1) * r.cols + i]) && KEY_WORK.has(r.R.cells[(j + 1) * r.cols + i])) cells.push([i, j]);
    }
  }
  if (!cells.length) return;
  const n = Math.max(1, Math.min(7, Math.round(cells.length / 26)));
  const p = r.p;
  const taken = [];
  for (let k = 0; k < n * 4 && taken.length < n; k++) {
    const [i, j] = cells[Math.floor(rand() * cells.length)];
    if (taken.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) < 4)) continue;
    taken.push([i, j]);
    const X = r.x + i * p; const Y = r.y + j * p;
    ctx.fillStyle = colors === MANNEQUIN_COLORS.dunkel ? '#FFF6F1' : '#FFF9F5';
    ctx.fillRect(X, Y - p, p, p); ctx.fillRect(X - p, Y, p, p); ctx.fillRect(X + p, Y, p, p); ctx.fillRect(X, Y + p, p, p);
    ctx.fillStyle = colors === MANNEQUIN_COLORS.dunkel ? '#E8C978' : '#D9B65E';
    ctx.fillRect(X, Y, p, p);
  }
}
/** Zell-Indexe der Arbeitsfarben (aus KEYS in mannequin.js). */
const KEY_WORK = new Set([7, 9]); // work, move

/**
 * Körperbeet: das Mannequin von vorn und hinten, groß, auf einem Streifen Gras.
 * Wo gearbeitet wurde, ist es getönt; wo am meisten, blüht es. Drei Zahlen.
 */
export function koerperbeet(workout, opts = {}) {
  const o = { ...opts, template: 'kraft' };
  const { canvas, ctx, pal, theme, rand, seed, transparent, w, h, stage } = begin(workout, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(workout);
  const s = f.summary;

  write(ctx, f.line, M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted });
  const tPx = fitSize(ctx, f.title, W - 2 * M, {}, 132);
  const yTitle = SAFE.top + 60 + tPx * 0.78;
  write(ctx, f.title, M - 4, yTitle, { px: tPx, color: pal.ink });

  const blooming = Object.entries(s.load).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => MUSCLE_NAMES[m] || m);
  if (blooming.length) write(ctx, `Es blüht: ${blooming.join(', ')}`, M, yTitle + 62, { px: 36, italic: true, color: pal.roseInk });

  const yV = SAFE.bottom - 150;
  const figTop = yTitle + 130;
  const figH = yV - 104 - 96 - figTop;
  const fr = standFrame();
  const fw = (figH / fr[3]) * fr[2];
  const gap = 0.42;
  const x0 = W / 2 - (fw * (2 + gap)) / 2;
  const boxes = drawBodyPair(ctx, x0, figTop, figH, s.load, theme, { gap, bloom: true, seed, grass: true });
  const yCap = boxes[0].groundY + 58;
  write(ctx, 'vorn', boxes[0].x + fw / 2, yCap, { px: 30, italic: true, color: pal.muted, align: 'center' });
  write(ctx, 'hinten', boxes[1].x + fw / 2, yCap, { px: 30, italic: true, color: pal.muted, align: 'center' });

  hairline(ctx, M, yV - 104, W - M, pal.ink, 0.14);
  const stats = [{ value: f.hero.value, unit: 'kg', label: 'bewegt' }, f.stats[0]];
  if (s.top) stats.push({ value: `${fmtInt(s.top.kg)}`, unit: 'kg', label: s.top.name });
  statRow(ctx, stats, M, W - M, yV, pal, { px: 74, labelPx: 26, align: 'spread' });
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 30 });
  if (workout.place) write(ctx, workout.place, M, SAFE.bottom - 12, { px: 30, italic: true, color: pal.muted });
  return canvas;
}

// ───────────────────────────── Bewegungsstudie ─────────────────────────────

/**
 * Wie viele Bilder in welcher Anordnung? Größte Figur gewinnt; fünf in einer Reihe
 * (die klassische Serienfotografie) bekommt einen Vorzug. Eine einzelne Reihe läuft
 * fast randlos über die Breite – wie ein Filmstreifen; Raster bleiben im Satzspiegel.
 */
export function plateLayout(fr, availH, { gap = 8, numH = 48, pad = 14, maxS = 7.2 } = {}) {
  const options = [[5, 1], [4, 1], [3, 2], [2, 2]];
  let best = null;
  for (const [cols, rows] of options) {
    const x0 = rows === 1 ? 24 : M;
    const availW = W - 2 * x0;
    const g = rows === 1 ? gap : 16;
    const cw = (availW - g * (cols - 1)) / cols;
    const ch = (availH - (g + numH) * (rows - 1) - numH) / rows;
    const sc = Math.min(maxS, (cw - pad * 2) / fr[2], (ch - pad * 1.5) / fr[3]);
    const score = sc * (cols * rows === 5 ? 1.15 : 1);
    if (!best || score > best.score) best = { cols, rows, n: cols * rows, cw, s: sc, score, pad, x0, gap: g, numH };
  }
  best.ch = Math.round(best.s * fr[3] + best.pad * 1.5);
  best.h = best.rows * best.ch + (best.rows - 1) * (best.gap + best.numH) + best.numH;
  return best;
}

/**
 * Bewegungsstudie: die Hauptübung als Serienfotografie. Jedes Bild ein Feld mit feinem
 * Raster, darin das Mannequin; die Pose davor steht als Schatten dahinter, die arbeitenden
 * Glieder sind Altrosa. Darunter die Bildnummern, wie auf einer Tafel.
 */
export function bewegungsStudie(workout, opts = {}) {
  const o = { ...opts, template: 'studie' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(workout, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(workout);
  const s = f.summary;
  const ex = heroExercise(workout) || { name: f.title, muscles: [], sets: [] };
  const mo = motionOf(ex);
  const P = PLATE[theme];
  const colors = MANNEQUIN_COLORS[theme];

  // Kopf
  write(ctx, f.line.replace(/^Nr\. \d+ · /, ''), M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted });
  if (workout.edition) write(ctx, `Tafel ${workout.edition}`, W - M, SAFE.top + 34, { px: 30, italic: true, color: pal.muted, align: 'right' });
  const tPx = fitSize(ctx, ex.name, W - 2 * M, { trackingEm: -0.01 }, 150);
  const yTitle = SAFE.top + 70 + tPx * 0.76;
  write(ctx, ex.name, M - 5, yTitle, { px: tPx, color: pal.ink, tracking: -tPx * 0.01 });
  const yLede = yTitle + 64;
  const lede = `Bewegungsstudie aus dem ${f.title}`;
  const lw = write(ctx, lede, M, yLede, { px: 38, italic: true, color: pal.muted });
  if (ex.pr) {
    const bp = 5;
    blossom(ctx, M + lw + 30, Math.round(yLede - 14), bp, pal);
    write(ctx, 'Bestwert', M + lw + 48, yLede, { px: 38, italic: true, color: pal.roseInk });
  }

  // Tafel
  const yV = SAFE.bottom - 150;
  const plateTop = yLede + 70;
  const plateBottom = (detailed ? SAFE.bottom - 330 : yV - 104) - 40;
  const probe = sequence(mo.def, 5);
  const fr = boundsOf(mo.def, probe, { pad: 2 });
  const lay = plateLayout(fr, plateBottom - plateTop);
  const poses = sequence(mo.def, lay.n);
  const frAll = boundsOf(mo.def, poses, { pad: 2 });
  const y0 = Math.round(plateTop + (plateBottom - plateTop - lay.h) / 2);
  const moving = movingSegments(mo.def);
  const muscles = exMuscles(ex);
  const step = Math.max(14, Math.round(lay.s * 6));
  const ghost = { style: 'geist', ghost: P.ghost, ghostWork: P.ghostWork, ghostHead: P.ghostHead, ghostSprout: P.ghostSprout, moving, muscles };
  poses.forEach((pose, i) => {
    const c = i % lay.cols; const r = Math.floor(i / lay.cols);
    const bx = Math.round(lay.x0 + c * (lay.cw + lay.gap)); const by = Math.round(y0 + r * (lay.ch + lay.gap + lay.numH));
    const bw = Math.round(lay.x0 + (c + 1) * (lay.cw + lay.gap) - lay.gap) - bx; const bh = lay.ch;
    if (!transparent) { ctx.fillStyle = P.panel; ctx.fillRect(bx, by, bw, bh); }
    const inner = { x: bx + lay.pad, y: by + lay.pad, w: bw - lay.pad * 2, h: bh - lay.pad };
    const groundY = inner.y + inner.h - (frAll[1] + frAll[3] - (GROUND + 0.7)) * lay.s;
    if (!transparent) plateGrid(ctx, bx, by, bw, bh, step, P.grid, groundY);
    const last = i === poses.length - 1;
    // Frühe Bilder als Geist (nur die arbeitenden Glieder in Altrosa), das letzte in voller Farbe
    figureIn(ctx, mo.def, pose, inner, frAll, lay.s, colors, last ? { moving, muscles } : ghost);
    write(ctx, String(i + 1), bx + bw / 2, by + bh + 38, { px: 28, italic: true, color: last ? pal.roseInk : pal.muted, align: 'center' });
  });

  if (detailed) {
    // Detailliert: jeder Satz der Hauptübung, darunter die übrigen Übungen in einer Zeile
    const t = setsText(ex);
    const yS = SAFE.bottom - 250;
    hairline(ctx, M, yS - 70, W - M, pal.ink, 0.14);
    const sets = (ex.sets || []).map((st) => (st.kg ? `${fmtInt(st.reps)} × ${fmtKg(st.kg)} kg` : st.reps ? `${fmtInt(st.reps)} Wdh.` : `${fmtInt(st.sec)} s`));
    const line = sets.join('  ·  ');
    write(ctx, line, M, yS, { px: fitSize(ctx, line, W - 2 * M, {}, 46), color: pal.ink });
    const sub = [`${(ex.sets || []).length} ${(ex.sets || []).length === 1 ? 'Satz' : 'Sätze'}`, musclesText(ex, 3), ex.perSide ? 'je Seite' : '', !t.load || t.load === 'Körpergewicht' ? t.load : ''].filter(Boolean).join(' · ');
    write(ctx, sub, M, yS + 52, { px: 30, italic: true, color: pal.muted });
    const others = (workout.exercises || []).filter((e) => e !== ex).map((e) => e.name);
    if (others.length) {
      // „danach: …“ in höchstens zwei Zeilen, lieber kleiner als abgeschnitten
      let px = 30; let lines;
      for (; px >= 22; px -= 2) {
        lines = [''];
        for (const word of `danach: ${others.join(', ')}`.split(' ')) {
          const tryLine = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
          if (measure(ctx, tryLine, { px, italic: true }) <= W - 2 * M || !lines[lines.length - 1]) lines[lines.length - 1] = tryLine;
          else lines.push(word);
        }
        if (lines.length <= 2) break;
      }
      lines.slice(0, 2).forEach((l, i) => write(ctx, l, M, yS + 116 + i * px * 1.3, { px, italic: true, color: pal.muted }));
    }
  } else {
    hairline(ctx, M, yV - 104, W - M, pal.ink, 0.14);
    const top = (ex.sets || []).reduce((b, st) => ((Number(st.kg) || 0) > (Number(b.kg) || 0) ? st : b), (ex.sets || [])[0] || {});
    const stats = [];
    if (top.kg) stats.push({ value: fmtKg(top.kg), unit: 'kg', label: `schwerster Satz · ${fmtInt(top.reps)} Wdh.` });
    else stats.push({ value: fmtInt((ex.sets || []).length), label: 'Sätze' });
    stats.push({ value: fmtInt(s.sets), label: s.sets === 1 ? 'Satz insgesamt' : 'Sätze insgesamt' });
    stats.push({ value: fmtInt(s.volume), unit: 'kg', label: 'bewegt' });
    statRow(ctx, stats, M, W - M, yV, pal, { px: 74, labelPx: 26, align: 'spread' });
  }
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 30 });
  if (workout.place) write(ctx, workout.place, M, SAFE.bottom - 12, { px: 30, italic: true, color: pal.muted });
  return canvas;
}

// ───────────────────────────── Sammelkarten ─────────────────────────────

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Bogenfenster: unten gerade, oben ein Halbrund. */
function archPath(ctx, x, y, w, h) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/** Kartengrund: Fläche, doppelte Linie innen wie bei Spielkarten. */
function cardFace(ctx, cw, ch, pal, theme, k) {
  const P = PLATE[theme];
  ctx.fillStyle = P.face;
  roundRect(ctx, 0, 0, cw, ch, 30 * k); ctx.fill();
  ctx.save();
  ctx.strokeStyle = pal.ink; ctx.globalAlpha = theme === 'dunkel' ? 0.16 : 0.13; ctx.lineWidth = Math.max(1, 1.6 * k);
  roundRect(ctx, 18 * k, 18 * k, cw - 36 * k, ch - 36 * k, 18 * k); ctx.stroke();
  ctx.strokeStyle = pal.rose; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, 1.3 * k);
  roundRect(ctx, 26 * k, 26 * k, cw - 52 * k, ch - 52 * k, 13 * k); ctx.stroke();
  ctx.restore();
}

/** Bogenfenster mit der Schlüsselpose; die Startpose steht als Geist dahinter. */
function poseWindow(ctx, ex, wx, wy, ww, wh, pal, theme, rand, k) {
  const P = PLATE[theme];
  const colors = MANNEQUIN_COLORS[theme];
  ctx.save();
  archPath(ctx, wx, wy, ww, wh);
  ctx.fillStyle = P.window; ctx.fill();
  ctx.clip();
  const mo = motionOf(ex);
  const pose = keyPose(mo.def);
  const fr = boundsOf(mo.def, [mo.def.frames[0], pose], { pad: 3 });
  const top = Math.min(ww * 0.22, wh * 0.16);
  const inner = { x: wx + 16 * k, y: wy + top, w: ww - 32 * k, h: wh - top - 26 * k };
  const s = Math.min(inner.w / fr[2], inner.h / fr[3]);
  const groundY = inner.y + inner.h - (fr[1] + fr[3] - (GROUND + 0.7)) * s;
  plateGrid(ctx, wx, wy, ww, wh, Math.max(10, Math.round(s * 6)), P.grid, groundY);
  const moving = movingSegments(mo.def);
  if (mo.def.loop !== 'cycle' && mo.def.frames.length > 1) {
    figureIn(ctx, mo.def, mo.def.frames[0], inner, fr, s, colors, {
      style: 'geist', ghost: P.ghost, ghostWork: P.ghostWork, ghostHead: P.ghostHead, ghostSprout: P.ghostSprout, moving, muscles: {}, props: false, skip: ['env', 'envLine', 'mat', 'floor'],
    });
  }
  const r = figureIn(ctx, mo.def, pose, inner, fr, s, colors, { moving, muscles: exMuscles(ex) });
  grassRow(ctx, wx, wx + ww, r.groundY + r.p * 0.2, r.p, colors, rand, 0.3);
  ctx.restore();
}

/** Bestwert-Marke: Blüte und kursives „Bestwert“, zentriert über x. */
function prMark(ctx, x, y, px, pal, theme) {
  const bp = Math.max(3, Math.round(px / 6));
  const tw = measure(ctx, 'Bestwert', { px, italic: true });
  const x0 = x - (tw + bp * 4) / 2;
  blossom(ctx, Math.round(x0 + bp), Math.round(y - px * 0.32), bp, pal, theme === 'dunkel' ? '#E8C978' : '#D9B65E');
  write(ctx, 'Bestwert', x0 + bp * 4, y, { px, italic: true, color: pal.roseInk });
}

/**
 * Große Sammelkarte (lokal 0,0 bis cw,ch): Nummer und Name, Bogenfenster mit der Pose,
 * Muskeln, Sätze × Wiederholungen und Gewicht, unten Training und Kartennummer.
 */
function drawTradingCard(ctx, ex, idx, total, cw, ch, pal, theme, rand, { workout } = {}) {
  const k = cw / 720;
  cardFace(ctx, cw, ch, pal, theme, k);
  const padX = 58 * k;
  const yHead = 104 * k;
  const numW = write(ctx, String(idx), padX, yHead, { px: 64 * k, italic: true, color: pal.roseInk });
  const nameX = padX + numW + 20 * k;
  write(ctx, ex.name, nameX, yHead, { px: fitSize(ctx, ex.name, cw - nameX - padX, {}, 62 * k), color: pal.ink });

  // Fuß von unten nach oben gestapelt, damit nichts kollidiert
  const yFoot = ch - 50 * k;
  const yLab = yFoot - 64 * k;
  const yNum = yLab - 46 * k;
  const yMus = yNum - 104 * k;
  const wy = 140 * k; const wx = padX; const ww = cw - padX * 2;
  const wh = yMus - 62 * k - wy;
  poseWindow(ctx, ex, wx, wy, ww, wh, pal, theme, rand, k);
  if (ex.pr) prMark(ctx, cw / 2, wy + 62 * k, 30 * k, pal, theme);

  write(ctx, musclesText(ex) || '', cw / 2, yMus, { px: 34 * k, italic: true, color: pal.roseInk, align: 'center' });
  const t = setsText(ex);
  const kgs = (ex.sets || []).map((st) => Number(st.kg) || 0);
  const maxKg = Math.max(0, ...kgs);
  const big = 86 * k;
  const c1 = cw * 0.29; const c2 = cw * 0.71;
  writeRun(ctx, [{ t: t.reps, px: fitSize(ctx, t.reps, cw * 0.4, {}, big), color: pal.ink }], c1, yNum, 'center');
  write(ctx, 'Sätze × Wdh.', c1, yLab, { px: 25 * k, serif: false, color: pal.muted, align: 'center' });
  if (maxKg) {
    writeRun(ctx, [{ t: fmtKg(maxKg), px: big, color: pal.ink }, { t: 'kg', px: big * 0.46, italic: true, color: pal.muted, gap: 8 * k }], c2, yNum, 'center');
    const same = kgs.every((x) => x === maxKg);
    write(ctx, same ? (ex.perSide ? 'je Seite' : 'Gewicht') : 'schwerster Satz', c2, yLab, { px: 25 * k, serif: false, color: pal.muted, align: 'center' });
  } else {
    write(ctx, 'frei', c2, yNum, { px: big * 0.8, italic: true, color: pal.ink, align: 'center' });
    write(ctx, 'Körpergewicht', c2, yLab, { px: 25 * k, serif: false, color: pal.muted, align: 'center' });
  }
  ctx.save(); ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.12; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cw / 2, yNum - 64 * k); ctx.lineTo(cw / 2, yLab + 6 * k); ctx.stroke(); ctx.restore();
  if (workout) {
    write(ctx, `${workout.title || 'Krafttraining'} · ${fmtDateShort(workout.start || workout.date)}`, padX, yFoot, { px: 24 * k, italic: true, color: pal.muted });
    write(ctx, `Karte ${idx} von ${total}`, cw - padX, yFoot, { px: 24 * k, italic: true, color: pal.muted, align: 'right' });
  }
}

/**
 * Quartett-Karte (quer, für den Kartensatz): links das Bogenfenster mit der Pose,
 * rechts Nummer, Name, Muskeln, Sätze und Gewicht.
 */
function drawQuartettCard(ctx, ex, idx, cw, ch, pal, theme, rand) {
  const k = cw / 720;
  cardFace(ctx, cw, ch, pal, theme, k * 1.25);
  const pad = 44 * k;
  const ww = ch * 0.56; const wy = pad; const wh = ch - pad * 2;
  poseWindow(ctx, ex, pad, wy, ww, wh, pal, theme, rand, k * 1.2);
  const tx = pad + ww + 40 * k; const tw = cw - tx - pad;
  const yTop = pad + 64 * k;
  write(ctx, String(idx), tx, yTop, { px: 54 * k, italic: true, color: pal.roseInk });
  if (ex.pr) {
    const bp = Math.max(3, Math.round(7 * k));
    blossom(ctx, Math.round(cw - pad - bp * 2), Math.round(yTop - 20 * k), bp, pal, theme === 'dunkel' ? '#E8C978' : '#D9B65E');
  }
  // Name in bis zu zwei Zeilen
  const words = ex.name.split(' ');
  let lines = [ex.name];
  const npx = 64 * k;
  if (measure(ctx, ex.name, { px: npx }) > tw && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '); const b = words.slice(i).join(' ');
      const m = Math.max(measure(ctx, a, { px: npx }), measure(ctx, b, { px: npx }));
      if (!best || m < best.m) best = { m, l: [a, b] };
    }
    lines = best.l;
  }
  const lpx = Math.min(npx, ...lines.map((l) => fitSize(ctx, l, tw, {}, npx)));
  lines.forEach((l, i) => write(ctx, l, tx, yTop + 76 * k + i * lpx * 1.02, { px: lpx, color: pal.ink }));
  const yAfter = yTop + 76 * k + (lines.length - 1) * lpx * 1.02;
  write(ctx, musclesText(ex) || '', tx, yAfter + 54 * k, { px: fitSize(ctx, musclesText(ex) || ' ', tw, { italic: true }, 34 * k), italic: true, color: pal.roseInk });
  const t = setsText(ex);
  const yB = ch - pad - 56 * k;
  write(ctx, t.reps, tx, yB, { px: fitSize(ctx, t.reps, tw, {}, 84 * k), color: pal.ink });
  write(ctx, t.load || ' ', tx, yB + 50 * k, { px: fitSize(ctx, t.load || ' ', tw, {}, 30 * k), serif: false, color: pal.muted });
}

/** Karte gedreht um ihre Mitte (cx, cy) zeichnen, mit weichem Schatten. */
function placeCard(ctx, cx, cy, cw, ch, angle, theme, draw, shadow = true, soft = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cw / 2, -ch / 2);
  if (shadow) {
    ctx.save();
    ctx.shadowColor = theme === 'dunkel' ? 'rgba(0,0,0,0.45)' : 'rgba(80,60,50,0.16)';
    ctx.shadowBlur = 46 * soft; ctx.shadowOffsetY = 18 * soft;
    ctx.fillStyle = PLATE[theme].face;
    roundRect(ctx, 0, 0, cw, ch, 30 * Math.min(1, cw / 720)); ctx.fill();
    ctx.restore();
  }
  draw();
  ctx.restore();
}

/**
 * Sammelkarte. Kompakt: die Hauptübung als große Karte, zwei weitere liegen schräg dahinter.
 * Detailliert: alle Übungen als Kartensatz (höchstens sechs).
 */
export function sammelKarte(workout, opts = {}) {
  const o = { ...opts, template: 'sammel' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage, detailed } = begin(workout, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(workout);
  const list = workout.exercises || [];
  const total = list.length;
  const onPhoto = transparent && theme === 'dunkel';
  const muted = onPhoto ? 'rgba(248,242,237,0.86)' : pal.muted;
  const shadow = transparent ? (onPhoto ? 'rgba(18,12,10,0.45)' : 'rgba(255,250,246,0.6)') : null;

  withShadow(ctx, shadow, 22, () => {
    write(ctx, f.line, M, SAFE.top + 34, { px: 30, italic: true, color: muted });
  });

  if (!detailed) {
    const hero = heroExercise(workout) || list[0];
    const idx = Math.max(1, list.indexOf(hero) + 1);
    const cw = 780; const ch = 1084;
    const cx = W / 2; const cy = SAFE.top + 96 + ch / 2;
    const rest = list.filter((e) => e !== hero).slice(0, 2);
    const behind = [[rest[1], 0.105, 96, 26], [rest[0], -0.085, -88, 34]];
    for (const [ex, a, dx, dy] of behind) {
      if (!ex) continue;
      placeCard(ctx, cx + dx, cy + dy, cw, ch, a, theme, () => {
        drawTradingCard(ctx, ex, list.indexOf(ex) + 1, total, cw, ch, pal, theme, rand, { workout });
        ctx.fillStyle = theme === 'dunkel' ? 'rgba(20,16,16,0.32)' : 'rgba(120,100,90,0.07)';
        roundRect(ctx, 0, 0, cw, ch, 30); ctx.fill();
      });
    }
    placeCard(ctx, cx, cy, cw, ch, -0.022, theme, () => drawTradingCard(ctx, hero, idx, total, cw, ch, pal, theme, rand, { workout }));
    withShadow(ctx, shadow, 22, () => {
      write(ctx, `aus dem ${f.title} · ${total} ${total === 1 ? 'Karte' : 'Karten'}`, M, SAFE.bottom - 12, { px: 30, italic: true, color: muted });
      signature(ctx, W - M, SAFE.bottom - 12, { ...pal, muted }, rand, o, { align: 'right', px: 30, color: muted });
    });
    return canvas;
  }

  // Kartensatz
  const tPx = 96;
  withShadow(ctx, shadow, 22, () => {
    write(ctx, f.title, M - 4, SAFE.top + 70 + tPx * 0.76, { px: tPx, color: onPhoto ? '#F8F2ED' : pal.ink });
  });
  const shown = list.slice(0, 6);
  const cols = 2; const rows = Math.ceil(shown.length / cols);
  const top = SAFE.top + 70 + tPx + 30; const bottom = SAFE.bottom - 76;
  const gx = 22; const gy = 22;
  const cw = (W - 2 * 60 - gx * (cols - 1)) / cols;
  const ch = Math.min(cw * 0.82, (bottom - top - gy * (rows - 1)) / Math.max(1, rows));
  const y0 = top + (bottom - top - (rows * ch + (rows - 1) * gy)) / 2;
  shown.forEach((ex, i) => {
    const c = i % cols; const r = Math.floor(i / cols);
    const x = 60 + c * (cw + gx); const y = y0 + r * (ch + gy);
    const tilt = (rand() - 0.5) * 0.024;
    placeCard(ctx, x + cw / 2, y + ch / 2, cw, ch, tilt, theme, () => drawQuartettCard(ctx, ex, i + 1, cw, ch, pal, theme, rand), true, 0.6);
  });
  withShadow(ctx, shadow, 22, () => {
    const more = total > shown.length ? ` · und ${total - shown.length} weitere` : '';
    const s = summarizeStrength(workout);
    write(ctx, `${fmtInt(s.volume)} kg bewegt · ${fmtInt(s.sets)} Sätze${more}`, M, SAFE.bottom - 12, { px: 30, italic: true, color: muted });
    signature(ctx, W - M, SAFE.bottom - 12, { ...pal, muted }, rand, o, { align: 'right', px: 30, color: muted });
  });
  return canvas;
}

