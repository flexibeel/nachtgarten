/**
 * Nachtgarten – Teilen: Kraft-Vorlagen mit der Figur als Piktogramm.
 *
 *   koerperbeet       „Muskelkarte“: Silhouette vorn und hinten, trainierte Partien dunkel (Stärke = Last)
 *   bewegungsStudie   die Hauptübung als Serienfotografie: Belichtungen auf einer Grundlinie,
 *                     von hell nach dunkel, dazu die Bahn der Hantel als feine Linie
 *   sammelKarte       jede Übung eine Karte (kompakt: Hauptübung, detailliert: Kartensatz)
 *   drawPoseIcon      kleines Piktogramm je Übung (Programmheft)
 *
 * Kein Keimling, kein Gesicht: präzise Silhouetten aus demselben Skelett wie die Animationen.
 * Alle Renderer: (workout, opts) → Canvas, wie in cards.js.
 */

import { ANKLE_Y, GROUND } from '../anim/figure.js';
import {
  facts, fmtDateLong, fmtInt, fmtKg, fmtTime, musclesText, setsText, MUSCLE_NAMES,
} from './data.js';
import {
  M, SAFE, W, begin, fitSize, hairline, makeCanvas, measure, paper, signature, statRow, withShadow, write, writeNum,
} from './ink.js';
import { drawFigure, figureBounds, figureGeometry } from './piktogramm.js';
import {
  heroExercise, keyPose, motionOf, movingSegments, sequence,
} from './pose.js';

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const canvasMaker = (opts) => (w, h) => makeCanvas(w, h, opts);

/** Kopfzeile aller Kraftkarten: Datum · Uhrzeit links, Nummer rechts (Nunito, gedämpft). */
function metaLine(ctx, workout, pal, y, px = 26) {
  const when = workout.start || workout.date;
  write(ctx, `${fmtDateLong(when)}${workout.start ? ` · ${fmtTime(when)}` : ''}`, M, y, { px, serif: false, color: pal.muted });
  if (workout.edition) writeNum(ctx, `Nr. ${workout.edition}`, W - M, y, { px, serif: false, color: pal.muted, align: 'right' });
}

// ───────────────────────────── Piktogramm je Übung ─────────────────────────────

/**
 * Kleines Piktogramm einer Übung in ein Quadrat (x, y, size): Schlüsselpose als feine
 * technische Linie (o.iconStyle 'flaeche' für die Silhouette), ohne Umgebung.
 */
export function drawPoseIcon(ctx, ex, x, y, size, theme, pal, opts = {}) {
  const mo = motionOf(ex);
  const pose = keyPose(mo.def);
  const fr = figureBounds(mo.def, [pose], { pad: 2, env: false });
  const s = Math.min(size / fr[2], size / fr[3]);
  const style = opts.iconStyle || 'kontur';
  const fx = (size - fr[2] * s) / 2; const fy = (size - fr[3] * s) / 2;
  const base = { s, frame: fr, ink: pal.ink, far: pal.ink, env: pal.env, skipEnv: true, makeCanvas: canvasMaker(opts) };
  if (style !== 'kontur') {
    drawFigure(ctx, pose, mo.def, { ...base, x: x + fx, y: y + fy, style, far: pal.far, lw: Math.max(1.4, size / 42) });
    return;
  }
  // Kontur: Silhouette etwas dicker zeichnen und die eigentliche Form wieder ausstanzen –
  // bleibt eine feine, gleichmäßige Umrisslinie (wie ein Symbol, nicht wie ein Strichmännchen).
  const L = makeCanvas(Math.ceil(size) + 4, Math.ceil(size) + 4, opts);
  const lc = L.getContext('2d');
  const line = Math.max(1.6, size / 34) / s;
  drawFigure(lc, pose, mo.def, { ...base, x: fx + 2, y: fy + 2, grow: line });
  lc.globalCompositeOperation = 'destination-out';
  drawFigure(lc, pose, mo.def, { ...base, x: fx + 2, y: fy + 2 });
  ctx.drawImage(L, Math.round(x - 2), Math.round(y - 2));
}

// ───────────────────────────── Muskelkarte (Körperbeet) ─────────────────────────────

const HY = ANKLE_Y - 36.9;
/** Ruhiger Stand von vorn, Arme etwas vom Körper. */
const STAND_FRONT = { hx: 50, hy: HY, tr: 0, lA: [45.2, ANKLE_Y], rA: [54.8, ANKLE_Y], lU: 14, lL: 8, rU: 14, rL: 8 };
const BODY = { label: 'Stand', view: 'front', props: [], frames: [STAND_FRONT] };

/** Muskelpartien als runde Formen auf der Silhouette (Figureneinheiten): [{a, b, w}] (a = b → Kreis). */
function muscleForms(m, view, g) {
  const J = g.J; const out = [];
  const T = (t) => lerp(J.H, J.S, t);
  const side = (p, k) => [p[0] + J.right[0] * k, p[1] + J.right[1] * k];
  const seg = (sg, t0, t1, wk) => {
    for (const sd of g.sides) {
      const L = g.limbs[sd][sg === 'upper' || sg === 'fore' ? 'arm' : 'leg'].find((x) => x.seg === sg);
      out.push({ a: lerp(L.a, L.b, t0), b: lerp(L.a, L.b, t1), w: L.w * wk });
    }
  };
  const pair = (fn) => { for (const k of [-1, 1]) out.push(fn(k)); };
  if (view === 'vorn') {
    if (m === 'chest') pair((k) => ({ a: side(T(0.8), k * 1.9), b: side(T(0.78), k * 4.2), w: 4.6 }));
    if (m === 'abs') out.push({ a: T(0.16), b: T(0.54), w: 4.6 });
    if (m === 'quads') seg('thigh', 0.16, 0.84, 0.74);
    if (m === 'biceps') seg('upper', 0.32, 0.84, 0.66);
  } else {
    if (m === 'back') pair((k) => ({ a: side(T(0.88), k * 3.8), b: side(T(0.5), k * 2.2), w: 5.2 }));
    if (m === 'lowerback') out.push({ a: T(0.12), b: T(0.4), w: 4 });
    if (m === 'glutes') pair((k) => ({ a: side(T(0.02), k * 3.2), b: side(T(-0.06), k * 3.2), w: 5.6 }));
    if (m === 'hams') seg('thigh', 0.3, 0.86, 0.7);
    if (m === 'calves') seg('shin', 0.1, 0.52, 0.72);
    if (m === 'triceps') seg('upper', 0.32, 0.84, 0.66);
  }
  if (m === 'shoulders') for (const sd of g.sides) out.push({ a: J[sd].root, b: lerp(J[sd].root, J[sd].E, 0.18), w: 5 });
  if (m === 'forearms') seg('fore', 0.12, 0.64, 0.7);
  return out;
}

/**
 * Silhouette in hellem Ton, trainierte Partien darüber in Tinte – je mehr Last, desto dunkler.
 * Gibt den Rahmen in px zurück.
 */
export function drawMuscleFigure(ctx, view, x, y, h, load, pal, opts = {}) {
  const fr = figureBounds(BODY, [STAND_FRONT], { pad: 1.5 });
  const s = h / fr[3];
  const def = view === 'hinten' ? { ...BODY, back: true } : BODY;
  drawFigure(ctx, STAND_FRONT, def, { x, y, s, frame: fr, ink: pal.env, far: pal.env, env: pal.env, gap: 0, makeCanvas: canvasMaker(opts) });
  const g = figureGeometry(STAND_FRONT, def);
  const P = (p) => [x + (p[0] - fr[0]) * s, y + (p[1] - fr[1]) * s];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.ink;
  for (const [m, v] of Object.entries(load).sort((a, b) => a[1] - b[1])) {
    if (v < 0.05) continue;
    ctx.globalAlpha = 0.14 + 0.7 * v;
    for (const f of muscleForms(m, view, g)) {
      ctx.lineWidth = f.w * s;
      ctx.beginPath(); ctx.moveTo(...P(f.a)); ctx.lineTo(...P(f.b)); ctx.stroke();
    }
  }
  ctx.restore();
  return { x, y, w: fr[2] * s, h, groundY: y + (GROUND + 0.7 - fr[1]) * s };
}

/**
 * Muskelkarte: die Figur von vorn und hinten, trainierte Partien in Tinte (Stärke = Anteil
 * der Last), darunter die Muskeln nach Rang und drei Zahlen. opts.figure: false → nur Daten.
 */
export function koerperbeet(workout, opts = {}) {
  const o = { ...opts, template: 'kraft' };
  const { canvas, ctx, pal, theme, rand, transparent, w, h, stage } = begin(workout, o);
  if (!transparent) paper(ctx, pal, theme, rand, o, w, h);
  stage();
  const f = facts(workout);
  const s = f.summary;
  metaLine(ctx, workout, pal, SAFE.top + 30);
  const tPx = fitSize(ctx, f.title, W - 2 * M, {}, 132);
  const yTitle = SAFE.top + 60 + tPx * 0.8;
  write(ctx, f.title, M - tPx * 0.04, yTitle, { px: tPx, color: pal.ink, tracking: -tPx * 0.015 });

  const ranked = Object.entries(s.load).filter(([, v]) => v >= 0.05).sort((a, b) => b[1] - a[1]);
  const yV = SAFE.bottom - 150;
  const listTop = yV - 104 - 50 - Math.min(5, ranked.length) * 46;
  if (o.figure !== false) {
    const figTop = yTitle + 70;
    const figH = Math.min(620, listTop - 110 - figTop);
    const fw = figH * 0.42;
    const gap = 96;
    const x0 = W / 2 - fw - gap / 2;
    const a = drawMuscleFigure(ctx, 'vorn', x0, figTop, figH, s.load, pal, o);
    const b = drawMuscleFigure(ctx, 'hinten', W / 2 + gap / 2, figTop, figH, s.load, pal, o);
    write(ctx, 'vorn', a.x + a.w / 2, a.groundY + 44, { px: 22, serif: false, color: pal.muted, align: 'center' });
    write(ctx, 'hinten', b.x + b.w / 2, b.groundY + 44, { px: 22, serif: false, color: pal.muted, align: 'center' });
  }
  // Rangliste der Muskeln: Name links, feiner Balken, Anteil rechts als Wort-freie Linie
  ranked.slice(0, 5).forEach(([m, v], i) => {
    const y = listTop + i * 46 + 30;
    write(ctx, MUSCLE_NAMES[m] || m, M, y, { px: 26, serif: false, weight: i === 0 ? 600 : 400, color: i === 0 ? pal.ink : pal.muted });
    const bx = M + 260; const bw = W - M - bx;
    ctx.save(); ctx.lineCap = 'butt';
    ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.1; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, y - 9); ctx.lineTo(bx + bw, y - 9); ctx.stroke();
    ctx.globalAlpha = 0.25 + 0.75 * v; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, y - 9); ctx.lineTo(bx + bw * v, y - 9); ctx.stroke();
    ctx.restore();
  });
  hairline(ctx, M, yV - 104, W - M, pal.ink, 0.85, 2);
  const stats = [{ value: f.hero.value, unit: 'kg', label: 'Volumen' }, f.stats[0]];
  if (s.top) stats.push({ value: `${fmtInt(s.top.kg)}`, unit: 'kg', label: s.top.name });
  statRow(ctx, stats, M, W - M, yV, pal, { px: 76, labelPx: 24, align: 'grid' });
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 28 });
  return canvas;
}

// ───────────────────────────── Bewegungsstudie ─────────────────────────────

/** Punkt, dessen Bahn gezeigt wird: Langhantel, sonst Kurzhantel, sonst Hüfte. */
function trackPoint(def, J) {
  const bar = (def.props || []).find((p) => p.k === 'barbell' || p.k === 'ez');
  if (bar) return typeof bar.at === 'function' ? bar.at(J) : bar.at;
  const db = (def.props || []).find((p) => p.k === 'dumbbell' && !p.far) || (def.props || []).find((p) => p.k === 'dumbbell');
  if (db) return typeof db.at === 'function' ? db.at(J) : db.at;
  return J.H;
}

/**
 * Anordnung der Belichtungen: eine Reihe auf gemeinsamer Grundlinie (4–5 Bilder), bei
 * liegenden Übungen zwei Reihen. Größte Figur gewinnt, fünf in einer Reihe bekommen Vorzug.
 */
export function plateLayout(fr, availH, { maxS = 7 } = {}) {
  const options = [[5, 1], [4, 1], [2, 2]];
  let best = null;
  for (const [cols, rows] of options) {
    const x0 = rows === 1 ? 40 : M;
    const cw = (W - 2 * x0) / cols;
    const ch = (availH - (rows - 1) * 70) / rows;
    const sc = Math.min(maxS, (cw * 0.94) / fr[2], ch / fr[3]);
    const score = sc * (cols * rows === 5 ? 1.12 : 1);
    if (!best || score > best.score) best = { cols, rows, n: cols * rows, cw, s: sc, score, x0 };
  }
  best.ch = best.s * fr[3];
  best.h = best.rows * best.ch + (best.rows - 1) * 70;
  return best;
}

/**
 * Bewegungsstudie: die Hauptübung als Serienfotografie. Die Belichtungen stehen auf einer
 * gemeinsamen Grundlinie, von hell nach dunkel; die letzte in voller Tinte. Eine feine
 * Linie in Altrosa zeichnet die Bahn der Hantel durch alle Bilder. Darunter die Zahlen.
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

  metaLine(ctx, workout, pal, SAFE.top + 30);
  const tPx = fitSize(ctx, ex.name, W - 2 * M, { trackingEm: -0.015 }, 140);
  const yTitle = SAFE.top + 60 + tPx * 0.8;
  write(ctx, ex.name, M - tPx * 0.04, yTitle, { px: tPx, color: pal.ink, tracking: -tPx * 0.015 });
  const ySub = yTitle + 52;
  const sub = `Bewegungsstudie · ${f.title}`;
  const sw = write(ctx, sub, M, ySub, { px: 28, serif: false, color: pal.muted });
  if (ex.pr) write(ctx, '· Bestwert', M + sw + 10, ySub, { px: 28, serif: false, weight: 600, color: pal.roseInk });

  // Belichtungen
  const yV = SAFE.bottom - 150;
  const plateTop = ySub + 90;
  const plateBottom = (detailed ? SAFE.bottom - 330 : yV - 104) - 90;
  const probe = sequence(mo.def, 5);
  const fr0 = figureBounds(mo.def, probe, { pad: 2 });
  const lay = plateLayout(fr0, plateBottom - plateTop);
  const poses = sequence(mo.def, lay.n);
  const fr = figureBounds(mo.def, poses, { pad: 2 });
  const y0 = plateTop + (plateBottom - plateTop - lay.h) / 2;
  const moving = movingSegments(mo.def);
  const track = [];
  poses.forEach((pose, i) => {
    const c = i % lay.cols; const r = Math.floor(i / lay.cols);
    const cx = lay.x0 + (c + 0.5) * lay.cw;
    const top = y0 + r * (lay.ch + 70);
    const fx = cx - (fr[2] * lay.s) / 2;
    const last = i === poses.length - 1;
    const t = poses.length > 1 ? i / (poses.length - 1) : 1;
    // frühe Belichtungen heller (Tinte über Papier abgestuft), die letzte voll
    ctx.save();
    ctx.globalAlpha = last ? 1 : 0.22 + 0.5 * t;
    drawFigure(ctx, pose, mo.def, {
      x: fx, y: top, s: lay.s, frame: fr, ink: pal.ink, far: pal.far, env: pal.env, moving, makeCanvas: canvasMaker(o),
    });
    ctx.restore();
    const g = figureGeometry(pose, mo.def);
    const tp = trackPoint(mo.def, g.J);
    track.push([fx + (tp[0] - fr[0]) * lay.s, top + (tp[1] - fr[1]) * lay.s, r]);
    // Grundlinie und Bildnummer
    const gy = top + (GROUND + 0.7 - fr[1]) * lay.s;
    if (c === 0) hairline(ctx, lay.x0, gy + 10, W - lay.x0, pal.ink, 0.22, 1.5);
    writeNum(ctx, String(i + 1).padStart(2, '0'), cx, gy + 52, { px: 22, serif: false, color: last ? pal.ink : pal.muted, align: 'center' });
  });
  // Bahn der Hantel (nur innerhalb einer Reihe)
  ctx.save();
  ctx.strokeStyle = pal.rose; ctx.fillStyle = pal.rose; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
  for (let r = 0; r < lay.rows; r++) {
    const pts = track.filter((p) => p[2] === r);
    if (pts.length < 2) continue;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const [x, y] of track) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  const top = (ex.sets || []).reduce((b, st) => ((Number(st.kg) || 0) > (Number(b.kg) || 0) ? st : b), (ex.sets || [])[0] || {});
  if (detailed) {
    const t = setsText(ex);
    const yS = SAFE.bottom - 250;
    hairline(ctx, M, yS - 74, W - M, pal.ink, 0.85, 2);
    const sets = (ex.sets || []).map((st) => (st.kg ? `${fmtInt(st.reps)} × ${fmtKg(st.kg)} kg` : st.reps ? `${fmtInt(st.reps)} Wdh.` : `${fmtInt(st.sec)} s`));
    const line = sets.join('   ');
    writeNum(ctx, line, M, yS, { px: Math.min(44, fitSize(ctx, line, W - 2 * M, { serif: false, weight: 600 }, 44)), serif: false, weight: 600, color: pal.ink });
    const subl = [`${(ex.sets || []).length} ${(ex.sets || []).length === 1 ? 'Satz' : 'Sätze'}`, musclesText(ex, 3), ex.perSide ? 'je Seite' : '', !t.load || t.load === 'Körpergewicht' ? t.load : ''].filter(Boolean).join(' · ');
    write(ctx, subl, M, yS + 46, { px: 24, serif: false, color: pal.muted });
    const others = (workout.exercises || []).filter((e) => e !== ex).map((e) => e.name);
    if (others.length) {
      let px = 24; let lines;
      for (; px >= 18; px -= 2) {
        lines = [''];
        for (const word of `Danach: ${others.join(', ')}`.split(' ')) {
          const tryLine = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
          if (measure(ctx, tryLine, { px, serif: false }) <= W - 2 * M || !lines[lines.length - 1]) lines[lines.length - 1] = tryLine;
          else lines.push(word);
        }
        if (lines.length <= 2) break;
      }
      lines.slice(0, 2).forEach((l, i) => write(ctx, l, M, yS + 104 + i * px * 1.4, { px, serif: false, color: pal.muted }));
    }
  } else {
    hairline(ctx, M, yV - 104, W - M, pal.ink, 0.85, 2);
    const stats = [];
    if (top.kg) stats.push({ value: fmtKg(top.kg), unit: 'kg', label: `schwerster Satz · ${fmtInt(top.reps)} Wdh.`, accent: !!ex.pr });
    else stats.push({ value: fmtInt((ex.sets || []).length), label: 'Sätze' });
    stats.push({ value: fmtInt(s.sets), label: 'Sätze gesamt' });
    stats.push({ value: fmtInt(s.volume), unit: 'kg', label: 'Volumen' });
    statRow(ctx, stats, M, W - M, yV, pal, { px: 76, labelPx: 24, align: 'grid' });
  }
  signature(ctx, W - M, SAFE.bottom - 12, pal, rand, o, { align: 'right', px: 28 });
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

const FACE = { hell: '#FBF9F6', dunkel: '#2B2726' };

/** Bildfeld einer Karte: Startpose hell, Endpose in Tinte, auf feiner Grundlinie. */
function poseField(ctx, ex, x, y, w, h, pal, opts) {
  ctx.save();
  ctx.fillStyle = pal.soft;
  ctx.fillRect(x, y, w, h);
  const mo = motionOf(ex);
  const pose = keyPose(mo.def);
  const both = mo.def.loop !== 'cycle' && mo.def.frames.length > 1 ? [mo.def.frames[0], pose] : [pose];
  const fr = figureBounds(mo.def, both, { pad: 2 });
  const s = Math.min((w * 0.86) / fr[2], (h * 0.84) / fr[3]);
  const fx = x + (w - fr[2] * s) / 2; const fy = y + h - fr[3] * s - h * 0.06;
  if (both.length > 1) {
    ctx.globalAlpha = 0.3;
    drawFigure(ctx, both[0], mo.def, { x: fx, y: fy, s, frame: fr, ink: pal.ink, far: pal.far, env: pal.env, props: false, makeCanvas: canvasMaker(opts) });
    ctx.globalAlpha = 1;
  }
  drawFigure(ctx, pose, mo.def, { x: fx, y: fy, s, frame: fr, ink: pal.ink, far: pal.far, env: pal.env, makeCanvas: canvasMaker(opts) });
  hairline(ctx, x + w * 0.04, fy + (GROUND + 0.7 - fr[1]) * s + 4, x + w * 0.96, pal.ink, 0.25, 1.5);
  ctx.restore();
}

/** Große Karte (lokal 0,0 bis cw,ch): Nummer, Name, Bildfeld, Sätze × Wdh. und Gewicht. */
function drawTradingCard(ctx, ex, idx, total, cw, ch, pal, theme, opts) {
  const k = cw / 720;
  ctx.fillStyle = FACE[theme];
  roundRect(ctx, 0, 0, cw, ch, 22 * k); ctx.fill();
  ctx.save(); ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.12; ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, cw - 1.5, ch - 1.5, 22 * k); ctx.stroke(); ctx.restore();
  const pad = 52 * k;
  writeNum(ctx, `${String(idx).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, pad, pad + 26 * k, { px: 24 * k, serif: false, color: ex.pr ? pal.roseInk : pal.muted });
  if (ex.pr) write(ctx, 'Bestwert', cw - pad, pad + 26 * k, { px: 24 * k, serif: false, weight: 600, color: pal.roseInk, align: 'right' });
  const nPx = fitSize(ctx, ex.name, cw - 2 * pad, {}, 76 * k);
  write(ctx, ex.name, pad - nPx * 0.03, pad + 40 * k + nPx * 0.8, { px: nPx, color: pal.ink });
  const fy = pad + 150 * k; const fh = ch - fy - 250 * k;
  poseField(ctx, ex, pad, fy, cw - 2 * pad, fh, pal, opts);
  write(ctx, musclesText(ex) || '', pad, fy + fh + 50 * k, { px: 24 * k, serif: false, color: pal.muted });
  const t = setsText(ex);
  const kgs = (ex.sets || []).map((st) => Number(st.kg) || 0).filter((x) => x > 0);
  const yN = ch - pad - 30 * k;
  const big = 80 * k;
  writeNum(ctx, t.reps, pad, yN, { px: big, color: pal.ink });
  write(ctx, 'Sätze × Wdh.', pad, yN + 40 * k, { px: 22 * k, serif: false, color: pal.muted });
  if (kgs.length) {
    const lo = Math.min(...kgs); const hi = Math.max(...kgs);
    const v = lo === hi ? fmtKg(hi) : `${fmtKg(lo)}–${fmtKg(hi)}`;
    const uw = measure(ctx, 'kg', { px: big * 0.4, italic: true }) + 8 * k;
    write(ctx, 'kg', cw - pad, yN, { px: big * 0.4, italic: true, color: pal.muted, align: 'right' });
    writeNum(ctx, v, cw - pad - uw, yN, { px: big, color: ex.pr ? pal.roseInk : pal.ink, align: 'right' });
    write(ctx, ex.perSide ? 'Gewicht je Seite' : 'Gewicht', cw - pad, yN + 40 * k, { px: 22 * k, serif: false, color: pal.muted, align: 'right' });
  } else write(ctx, 'Körpergewicht', cw - pad, yN, { px: 30 * k, serif: false, color: pal.muted, align: 'right' });
}

/** Quartett-Karte (quer): oben Nummer und Name über die ganze Breite, darunter Bildfeld und Zahlen. */
function drawQuartettCard(ctx, ex, idx, total, cw, ch, pal, theme, opts, namePx = 36) {
  ctx.fillStyle = FACE[theme];
  roundRect(ctx, 0, 0, cw, ch, 16); ctx.fill();
  ctx.save(); ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.12; ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, cw - 1.5, ch - 1.5, 16); ctx.stroke(); ctx.restore();
  const pad = 22;
  writeNum(ctx, `${String(idx).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, pad, pad + 18, { px: 18, serif: false, color: ex.pr ? pal.roseInk : pal.muted });
  if (ex.pr) write(ctx, 'Bestwert', cw - pad, pad + 18, { px: 18, serif: false, weight: 600, color: pal.roseInk, align: 'right' });
  write(ctx, ex.name, pad - 1, pad + 26 + namePx * 0.8, { px: namePx, color: pal.ink });
  const fy = pad + 26 + namePx + 12;
  const fh = ch - fy - pad;
  const fw = Math.min(fh * 1.15, cw * 0.5);
  poseField(ctx, ex, pad, fy, fw, fh, pal, opts);
  const tx = pad + fw + 20; const tw = cw - tx - pad;
  const t = setsText(ex);
  const kgs = (ex.sets || []).map((st) => Number(st.kg) || 0).filter((x) => x > 0);
  const yB = ch - pad - 4;
  const val = kgs.length ? (Math.min(...kgs) === Math.max(...kgs) ? `${fmtKg(Math.max(...kgs))} kg` : `${fmtKg(Math.min(...kgs))}–${fmtKg(Math.max(...kgs))} kg`) : 'Körpergewicht';
  writeNum(ctx, t.reps, tx, yB - 38, { px: Math.min(42, fitSize(ctx, t.reps, tw, { serif: false, weight: 600 }, 42)), serif: false, weight: 600, color: pal.ink });
  write(ctx, val, tx, yB, { px: Math.min(24, fitSize(ctx, val, tw, { serif: false }, 24)), serif: false, color: ex.pr ? pal.roseInk : pal.muted });
}

/** Karte gedreht um ihre Mitte zeichnen, mit weichem Schatten. */
function placeCard(ctx, cx, cy, cw, ch, angle, theme, draw, soft = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.save();
  ctx.shadowColor = theme === 'dunkel' ? 'rgba(0,0,0,0.5)' : 'rgba(60,45,40,0.14)';
  ctx.shadowBlur = 40 * soft; ctx.shadowOffsetY = 14 * soft;
  ctx.fillStyle = FACE[theme];
  roundRect(ctx, 0, 0, cw, ch, 20); ctx.fill();
  ctx.restore();
  draw();
  ctx.restore();
}

/**
 * Sammelkarte. Kompakt: die Hauptübung als große Karte, zwei weitere liegen dahinter.
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
  withShadow(ctx, shadow, 22, () => metaLine(ctx, workout, { ...pal, muted }, SAFE.top + 30));

  if (!detailed) {
    const hero = heroExercise(workout) || list[0];
    const idx = Math.max(1, list.indexOf(hero) + 1);
    const cw = 780; const ch = 1060;
    const cx = W / 2; const cy = SAFE.top + 90 + ch / 2;
    const rest = list.filter((e) => e !== hero).slice(0, 2);
    const behind = [[rest[1], 0.05, 40, 18], [rest[0], -0.04, -36, 26]];
    for (const [ex, a, dx, dy] of behind) {
      if (!ex) continue;
      placeCard(ctx, cx + dx, cy + dy, cw, ch, a, theme, () => {
        drawTradingCard(ctx, ex, list.indexOf(ex) + 1, total, cw, ch, pal, theme, o);
        ctx.fillStyle = theme === 'dunkel' ? 'rgba(15,12,12,0.4)' : 'rgba(110,95,85,0.08)';
        roundRect(ctx, 0, 0, cw, ch, 22); ctx.fill();
      });
    }
    placeCard(ctx, cx, cy, cw, ch, -0.012, theme, () => drawTradingCard(ctx, hero, idx, total, cw, ch, pal, theme, o));
    withShadow(ctx, shadow, 22, () => {
      write(ctx, `${f.title} · ${total} ${total === 1 ? 'Übung' : 'Übungen'}`, M, SAFE.bottom - 12, { px: 26, serif: false, color: muted });
      signature(ctx, W - M, SAFE.bottom - 12, { ...pal, muted }, rand, o, { align: 'right', px: 28, color: muted });
    });
    return canvas;
  }

  const tPx = 96;
  withShadow(ctx, shadow, 22, () => {
    write(ctx, f.title, M - 4, SAFE.top + 60 + tPx * 0.8, { px: tPx, color: onPhoto ? '#F8F2ED' : pal.ink });
  });
  const shown = list.slice(0, 6);
  const cols = 2; const rows = Math.ceil(shown.length / cols);
  const top = SAFE.top + 60 + tPx + 30; const bottom = SAFE.bottom - 70;
  const gx = 20; const gy = 20;
  const cw = (W - 2 * 60 - gx * (cols - 1)) / cols;
  const ch = Math.min(cw * 0.78, (bottom - top - gy * (rows - 1)) / Math.max(1, rows));
  const y0 = top + (bottom - top - (rows * ch + (rows - 1) * gy)) / 2;
  // eine Namensgröße für den ganzen Satz: die größte, bei der jeder Name in eine Zeile passt
  const namePx = Math.max(24, Math.min(36, ...shown.map((ex) => fitSize(ctx, ex.name, cw - 44, {}, 36))));
  shown.forEach((ex, i) => {
    const c = i % cols; const r = Math.floor(i / cols);
    const x = 60 + c * (cw + gx); const y = y0 + r * (ch + gy);
    placeCard(ctx, x + cw / 2, y + ch / 2, cw, ch, 0, theme, () => drawQuartettCard(ctx, ex, i + 1, total, cw, ch, pal, theme, o, namePx), 0.5);
  });
  withShadow(ctx, shadow, 22, () => {
    const more = total > shown.length ? ` · und ${total - shown.length} weitere` : '';
    write(ctx, `${fmtInt(f.summary.volume)} kg Volumen · ${fmtInt(f.summary.sets)} Sätze${more}`, M, SAFE.bottom - 12, { px: 26, serif: false, color: muted });
    signature(ctx, W - M, SAFE.bottom - 12, { ...pal, muted }, rand, o, { align: 'right', px: 28, color: muted });
  });
  return canvas;
}
