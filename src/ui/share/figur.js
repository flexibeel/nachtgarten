/**
 * Nachtgarten – Teilen: das „Körperbeet“.
 *
 * Das Pixel-Mannequin der Übungsanimationen (src/ui/anim) – warmgrauer Körper,
 * heller runder Kopf, ein Keimling obendrauf – hier von vorn und hinten.
 * Trainierte Muskeln werden in der Arbeitsfarbe getönt (gerastert, je nach
 * Belastung voll oder gedithert); wo am meisten gearbeitet wurde, blüht es.
 * Kein realistischer Körper: eine kleine Gartenfigur.
 *
 * rasterFigure ist rein (testbar); drawFigure zeichnet auf einen 2D-Kontext.
 */

import { seeded } from './geo.js';

/** Formen in Figureneinheiten (Höhe ≈ 100). cap = Kapsel, ell = Ellipse. */
function shapes(view) {
  const S = [];
  const cap = (id, a, b, ra, rb, muscle = null, part = 'body') => S.push({ kind: 'cap', id, a, b, ra, rb, muscle, part });
  const ell = (id, x, y, rx, ry, muscle = null, part = 'body', rot = 0) => S.push({ kind: 'ell', id, x, y, rx, ry, muscle, part, rot });
  const front = view === 'vorn';
  cap('neck', [0, 13], [0, 17], 1.9, 2.1);
  cap('chest', [0, 22.2], [0, 30], 8.6, 7.0, front ? 'chest' : 'back');
  cap('belly', [0, 34.6], [0, 40.2], 5.6, 6.2, front ? 'abs' : 'lowerback');
  cap('pelvis', [0, 46], [0, 47], 8.0, 7.6, front ? null : 'glutes');
  for (const s of [1, -1]) {
    ell(`shoulder${s}`, s * 10.6, 19.6, 3.4, 3.0, 'shoulders');
    cap(`upper${s}`, [s * 12.6, 21.8], [s * 14.2, 35.6], 2.7, 2.3, front ? 'biceps' : 'triceps');
    cap(`fore${s}`, [s * 14.6, 38.2], [s * 15.8, 50.6], 2.2, 1.7, 'forearms');
    ell(`hand${s}`, s * 16.1, 54.2, 1.9, 2.6);
    cap(`thigh${s}`, [s * 4.6, 52.8], [s * 5.2, 71], 4.1, 3.0, front ? 'quads' : 'hams');
    cap(`shin${s}`, [s * 5.3, 74.2], [s * 5.6, 91.6], 2.9, 2.0, front ? null : 'calves');
    ell(`foot${s}`, s * (front ? 6.2 : 5.7), 95, front ? 3.2 : 2.6, 1.7);
    if (front) ell(`pec${s}`, s * 4.0, 24.0, 4.2, 3.2, 'chest', 'overlay', s * 0.18);
    else {
      ell(`lat${s}`, s * 4.4, 27.2, 3.8, 5.8, 'back', 'overlay', s * -0.2);
      ell(`glute${s}`, s * 3.8, 48.2, 4.0, 3.6, 'glutes', 'overlay');
    }
  }
  ell('head', 0, 7.0, 6.6, 6.6, null, 'head');
  return S;
}

function inside(sh, x, y) {
  if (sh.kind === 'ell') {
    const c = Math.cos(-sh.rot); const s = Math.sin(-sh.rot);
    const dx = x - sh.x; const dy = y - sh.y;
    const u = dx * c - dy * s; const v = dx * s + dy * c;
    return (u * u) / (sh.rx * sh.rx) + (v * v) / (sh.ry * sh.ry) <= 1;
  }
  const [ax, ay] = sh.a; const [bx, by] = sh.b;
  const dx = bx - ax; const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
  const r = sh.ra + (sh.rb - sh.ra) * t;
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) <= r;
}

/**
 * Rastert die Figur. Jede Zelle: null oder {part:'body'|'head'|'edge', muscle}.
 * @param {'vorn'|'hinten'} view
 * @param {number} cell  Zellgröße in Figureneinheiten (kleiner = feiner)
 */
export function rasterFigure(view, cell = 1.45) {
  const S = shapes(view);
  const cols = Math.ceil(42 / cell);
  const x0 = -(cols * cell) / 2; const y0 = -6; const y1 = 98; // mittig, damit beide Seiten gleich gerastert werden
  const rows = Math.ceil((y1 - y0) / cell);
  const grid = [];
  for (let j = 0; j < rows; j++) {
    const row = [];
    for (let i = 0; i < cols; i++) {
      const x = x0 + (i + 0.5) * cell; const y = y0 + (j + 0.5) * cell;
      let hit = null;
      for (const sh of S) {
        if (!inside(sh, x, y)) continue;
        if (sh.part === 'overlay') { if (hit) hit = { ...hit, muscle: sh.muscle }; continue; }
        hit = { part: sh.part, muscle: sh.muscle, id: sh.id };
      }
      row.push(hit);
    }
    grid.push(row);
  }
  // Kontur: Kopfrand hebt sich ab (wie in den Übungsanimationen), Körperrand wird dunkler.
  // Auf einer Kopie prüfen, damit sich der Rand nicht nach innen fortpflanzt.
  const src = grid.map((r) => r.slice());
  const at = (i, j) => (src[j] && src[j][i]) || null;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const c = src[j][i];
      if (!c) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => at(i + di, j + dj));
      if (c.part === 'head' && nb.some((q) => !q || q.part !== 'head')) grid[j][i] = { ...c, part: 'edge' };
      else if (c.part === 'body' && nb.some((q) => !q)) grid[j][i] = { ...c, outline: true };
    }
  }
  return { cols, rows, cell, grid, x0, y0 };
}

/** Farben je Thema, passend zu den Übungsanimationen. */
export const FIGURE_COLORS = {
  hell: {
    body: '#D6CCC6', outline: '#A99E98', head: '#FBF6F2', edge: '#8C807A', face: '#6A5F5A',
    work: '#C38C81', work2: '#DBAFA5', work3: '#EBD2CB', workEdge: '#A06A5F',
    petal: '#FFF9F5', heart: '#D9B65E', sprout: '#93A485', sprout2: '#7F8C72', ground: '#DCD2CA',
  },
  dunkel: {
    body: '#4B4443', outline: '#6E6563', head: '#ECE3DE', edge: '#BDB1AB', face: '#3A3433',
    work: '#D3A99F', work2: '#A9827A', work3: '#7A615C', workEdge: '#F1CDC4',
    petal: '#FFF6F1', heart: '#E8C978', sprout: '#AFBCA2', sprout2: '#8E9B81', ground: '#3A3433',
  },
};

/**
 * Zeichnet eine Figur. (x, y) = linke obere Ecke des Rasters, p = Pixelgröße.
 * load: {muscle: 0…1}. Gibt {w, h} zurück.
 */
export function drawFigure(ctx, view, x, y, p, load, theme, seed = 1, { bloom = true, cell } = {}) {
  const C = FIGURE_COLORS[theme] || FIGURE_COLORS.hell;
  const R = rasterFigure(view, cell);
  const rand = seeded(seed + (view === 'vorn' ? 0 : 99));
  const px = (i, j, color) => { ctx.fillStyle = color; ctx.fillRect(x + i * p, y + j * p, p, p); };
  const muscleCells = {};
  for (let j = 0; j < R.rows; j++) {
    for (let i = 0; i < R.cols; i++) {
      const c = R.grid[j][i];
      if (!c) continue;
      if (c.part === 'head') { px(i, j, C.head); continue; }
      if (c.part === 'edge') { px(i, j, C.edge); continue; }
      const v = c.muscle ? load[c.muscle] || 0 : 0;
      // Tönung in drei ruhigen Stufen: kräftig, mittel, zart
      const tint = v > 0.66 ? C.work : v > 0.33 ? C.work2 : v > 0.05 ? C.work3 : null;
      if (/^(hand|foot)/.test(c.id || '')) px(i, j, C.outline); // Hände und Füße schlicht, wie bei den Mannequins
      else if (c.outline) px(i, j, tint ? C.workEdge : C.outline);
      else px(i, j, tint || C.body);
      if (v > 0.05) (muscleCells[c.muscle] = muscleCells[c.muscle] || []).push([i, j]);
    }
  }
  // Gesicht (nur vorn): zwei Augenpunkte, Wangen in Arbeitsfarbe
  const cx = Math.round((0 - R.x0) / R.cell - 0.5);
  const eyeY = Math.round((7.6 - R.y0) / R.cell - 0.5);
  if (view === 'vorn') {
    px(cx - 2, eyeY, C.face); px(cx + 2, eyeY, C.face);
    ctx.globalAlpha = 0.5; px(cx - 3, eyeY + 2, C.work); px(cx + 3, eyeY + 2, C.work); ctx.globalAlpha = 1;
  }
  // Keimling auf dem Kopf (wie bei den Mannequins)
  const top = Math.round((7.0 - 6.6 - R.y0) / R.cell);
  px(cx, top - 1, C.sprout); px(cx, top - 2, C.sprout);
  px(cx - 1, top - 3, C.sprout); px(cx - 2, top - 3, C.sprout); px(cx - 2, top - 4, C.sprout2);
  px(cx + 1, top - 3, C.sprout); px(cx + 2, top - 4, C.sprout); px(cx + 3, top - 4, C.sprout2);
  // Boden: ein schmaler Grasstreifen – das Beet
  const gy = R.rows;
  for (let i = 3; i < R.cols - 3; i++) {
    px(i, gy, C.ground);
    if (rand() < 0.45) px(i, gy - 1, rand() < 0.5 ? C.sprout : C.sprout2);
  }
  // Blüten: auf den stärksten Muskeln
  if (bloom) {
    const ranked = Object.entries(muscleCells).sort((a, b) => (load[b[0]] || 0) - (load[a[0]] || 0));
    for (const [m, cells] of ranked) {
      const v = load[m] || 0;
      if (v < 0.5) continue;
      const inner = cells.filter(([i, j]) => !R.grid[j][i].outline);
      if (!inner.length) continue;
      const count = Math.max(1, Math.round((inner.length / 26) * v));
      for (let k = 0; k < count; k++) {
        const [i, j] = inner[Math.floor(rand() * inner.length)];
        px(i, j - 1, C.petal); px(i - 1, j, C.petal); px(i + 1, j, C.petal); px(i, j + 1, C.petal);
        px(i, j, C.heart);
        if (rand() < 0.6) { px(i + 1, j + 2, C.sprout); px(i + 2, j + 1, C.sprout2); }
      }
    }
  }
  return { w: R.cols * p, h: (R.rows + 1) * p };
}

/** Pixelmaße einer Figur (für Layout). */
export function figureSize(p, cell = 1.45) {
  const cols = Math.ceil(42 / cell); const rows = Math.ceil(104 / cell);
  return { w: cols * p, h: (rows + 1) * p, cols, rows };
}
