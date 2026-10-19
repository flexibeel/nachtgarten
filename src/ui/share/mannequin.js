/**
 * Nachtgarten – Teilen: das Pixel-Mannequin auf Canvas.
 *
 * Dieselbe Figur wie in den Übungsanimationen (src/ui/anim): gleiche Gelenke
 * (figure.js → solve), gleiche „Pillen“-Breiten, gleiche Geräte – nur ohne SVG.
 * Jede Pose wird direkt auf ein kleines Raster gerechnet (Teilpixel, gewichtete
 * Mehrheitswahl wie in pixel.js) und hart in der Abendruhe-Palette gemalt.
 * Synchron und rein: in node testbar, im Browser schnell genug für mehrere Posen je Karte.
 *
 *   rasterPose(pose, def, {cols, rows, frame, moving, muscles, ...}) → {cols, rows, cells}
 *   paintRaster(ctx, R, x, y, p, colors, {style})                    → malt die Zellen
 *   boundsOf(def, poses)                                             → enger Rahmen um alle Posen
 */

import { GROUND, SEG, WID, add, angTo, dirDown, lerpP, solve } from '../anim/figure.js';
import { pulleyPos } from '../anim/equipment.js';

/** Farbschlüssel (Index = Wert in cells; 0 = leer). */
export const KEYS = ['', 'figure', 'far', 'head', 'edge', 'face', 'cheek', 'work', 'workFar', 'move', 'moveFar',
  'sprout', 'weight', 'weightBack', 'env', 'envLine', 'cable', 'band', 'floor', 'mat', 'hole'];
const K = Object.fromEntries(KEYS.map((k, i) => [k, i]));
/** Feine Details setzen sich bei der Mehrheitswahl eher durch (wie PALETTE_WEIGHTS). */
const WEIGHT = { face: 2, sprout: 2.2, work: 1.4, workFar: 1.2, cable: 2.4, band: 1.8, weight: 1.4, envLine: 1.3, cheek: 1.6, edge: 1.15 };
const WTS = KEYS.map((k) => WEIGHT[k] || 1);

/** Farben je Thema – dieselben Werte wie --anim-* in player.js. */
export const MANNEQUIN_COLORS = {
  hell: {
    figure: '#8C807A', far: '#C9BEB8', head: '#F6EFEA', edge: '#8C807A', face: '#6A5F5A', cheek: '#C9988E',
    work: '#A9695D', workFar: '#CBA39A', move: '#CB9C91', moveFar: '#E6CEC7', sprout: '#93A485',
    weight: '#5F5652', weightBack: '#8D8380', env: '#E7DDD7', envLine: '#D2C7C1', cable: '#9A8F8A',
    band: '#9DAA8F', floor: '#E2D8D2', mat: '#E3E8DD', hole: '#FFFCFA',
  },
  dunkel: {
    figure: '#BDB1AB', far: '#746B68', head: '#ECE3DE', edge: '#BDB1AB', face: '#3A3433', cheek: '#C9A097',
    work: '#F1CDC4', workFar: '#A68D87', move: '#D3A99F', moveFar: '#84685F', sprout: '#AFBCA2',
    weight: '#E4DBD6', weightBack: '#9E9590', env: '#3D3837', envLine: '#575050', cable: '#928884',
    band: '#AFBCA2', floor: '#46403F', mat: '#3B4237', hole: '#2A2626',
  },
};

// ───────────────────────────── Formen ─────────────────────────────

const D2R = Math.PI / 180;
const cap = (a, b, r, c) => ({ t: 'cap', a, b, r, c });
const circ = (p, r, c) => ({ t: 'circ', p, r, c });
/** Rechteck um Mittelpunkt, gedreht (Grad, wie SVG rotate). */
const rect = (cx, cy, w, h, rot, c) => ({ t: 'rect', cx, cy, w, h, rot: rot || 0, c });
/** Rechteck ab linker oberer Ecke (lokal), dann um (px,py) gedreht. */
function rectAt(px, py, x, y, w, h, rot, c) {
  const cs = Math.cos(rot * D2R); const sn = Math.sin(rot * D2R);
  const lx = x + w / 2; const ly = y + h / 2;
  return rect(px + lx * cs - ly * sn, py + lx * sn + ly * cs, w, h, rot, c);
}
const val = (v, J) => (typeof v === 'function' ? v(J) : v);
const rot = (p, deg, o) => {
  const cs = Math.cos(deg * D2R); const sn = Math.sin(deg * D2R);
  return [o[0] + p[0] * cs - p[1] * sn, o[1] + p[0] * sn + p[1] * cs];
};

function boxOf(s) {
  if (s.t === 'cap') return [Math.min(s.a[0], s.b[0]) - s.r, Math.min(s.a[1], s.b[1]) - s.r, Math.max(s.a[0], s.b[0]) + s.r, Math.max(s.a[1], s.b[1]) + s.r];
  if (s.t === 'circ') return [s.p[0] - s.r, s.p[1] - s.r, s.p[0] + s.r, s.p[1] + s.r];
  const e = Math.hypot(s.w, s.h) / 2;
  return [s.cx - e, s.cy - e, s.cx + e, s.cy + e];
}

function hit(s, x, y) {
  if (s.t === 'circ') return (x - s.p[0]) ** 2 + (y - s.p[1]) ** 2 <= s.r * s.r;
  if (s.t === 'cap') {
    const [ax, ay] = s.a; const dx = s.b[0] - ax; const dy = s.b[1] - ay;
    const l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    return (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 <= s.r * s.r;
  }
  const cs = Math.cos(-s.rot * D2R); const sn = Math.sin(-s.rot * D2R);
  const u = (x - s.cx) * cs - (y - s.cy) * sn; const v = (x - s.cx) * sn + (y - s.cy) * cs;
  return Math.abs(u) <= s.w / 2 && Math.abs(v) <= s.h / 2;
}

/** Einfache SVG-Pfade (M, L, H, V) → Liniensegmente. */
function pathSegs(d) {
  const out = []; let cur = [0, 0]; let start = [0, 0];
  const re = /([MLHVZ])([^MLHVZ]*)/gi;
  let m;
  while ((m = re.exec(d))) {
    const cmd = m[1].toUpperCase();
    const n = (m[2].match(/-?[\d.]+/g) || []).map(Number);
    if (cmd === 'M') { cur = [n[0], n[1]]; start = cur; for (let i = 2; i + 1 < n.length; i += 2) { const q = [n[i], n[i + 1]]; out.push([cur, q]); cur = q; } } else if (cmd === 'L') { for (let i = 0; i + 1 < n.length; i += 2) { const q = [n[i], n[i + 1]]; out.push([cur, q]); cur = q; } } else if (cmd === 'H') { for (const v of n) { const q = [v, cur[1]]; out.push([cur, q]); cur = q; } } else if (cmd === 'V') { for (const v of n) { const q = [cur[0], v]; out.push([cur, q]); cur = q; } } else if (cmd === 'Z') { out.push([cur, start]); cur = start; }
  }
  return out;
}

// ───────────────────────────── Geräte ─────────────────────────────

/** Geräte als Formen, je Ebene (back, farProp, mid, front). */
export function propShapes(props, J) {
  const L = { back: [], farProp: [], mid: [], front: [] };
  const put = (s, def, x) => (L[s.layer || def] || L.front).push(x);
  for (const s of props || []) {
    switch (s.k) {
      case 'pad': { const p = val(s.at || [s.x, s.y], J); put(s, 'back', rect(p[0], p[1], s.w, s.h, val(s.a || 0, J), 'env')); break; }
      case 'frame': for (const [a, b] of pathSegs(s.d || `M${s.pts.map((p) => p.join(' ')).join('L')}`)) put(s, 'back', cap(a, b, (s.sw || 2.2) / 2, 'envLine')); break;
      case 'bench': {
        const h = 3.4; const { x, y: top, w } = s;
        for (const lx of [x + 4, x + w - 4]) put(s, 'back', cap([lx, top + h], [lx, GROUND], 1, 'envLine'));
        put(s, 'back', rectAt(0, 0, x, top, w, h, 0, 'env'));
        if (s.incline) {
          const { a, len, at = 'left' } = s.incline;
          const px = at === 'left' ? x + 1 : x + w - 1;
          put(s, 'back', rectAt(px, top + h / 2, -len, -h / 2, len, h, a, 'env'));
        }
        break;
      }
      case 'mat': put(s, 'back', rectAt(0, 0, s.x, GROUND - 1.6, s.w, 2.2, 0, 'mat')); break;
      case 'wall': { const side = s.side || 1; put(s, 'back', rectAt(0, 0, side > 0 ? s.x : s.x - 6, 4, 6, GROUND - 4, 0, 'env')); break; }
      case 'chair': {
        const f = s.facing || 1; const y = s.y ?? 74; const x = s.x;
        put(s, 'back', cap([x - f * 7.5, y], [x - f * 7.5, y - 19], 1, 'envLine'));
        for (const lx of [x - f * 6.5, x + f * 6.5]) put(s, 'back', cap([lx, y + 2], [lx, GROUND], 1, 'envLine'));
        put(s, 'back', rectAt(0, 0, x - 8, y - 1, 16, 3.2, 0, 'env'));
        break;
      }
      case 'pullbar': put(s, 'back', cap([s.x, s.y], [s.x, 2], 1.1, 'envLine')); L.front.push(circ([s.x, s.y], 1.9, 'weight')); break;
      case 'tower': {
        const top = s.top ?? 6;
        put(s, 'back', rectAt(0, 0, s.x - 3.2, top, 6.4, GROUND - top, 0, 'env'));
        const [px, py] = s.pulley || pulleyPos(s.x, s.height, s.side || 1);
        put(s, 'back', circ([px, py], 2.8, 'cable')); put(s, 'back', circ([px, py], 1.5, 'hole'));
        break;
      }
      case 'cable': {
        const from = val(s.from, J); const to = val(s.to, J); const h = s.handle || 'Einzelgriff';
        const off = h === 'Fußschlaufe' ? 0 : h === 'Seil' ? 3.2 : h === 'V-Griff' ? 3.6 : h.includes('Stange') ? 0 : 3.4;
        const attach = off ? add(to, dirDown(angTo(to, from)), off) : to;
        put(s, 'mid', cap(from, attach, 0.85, 'cable'));
        const a = s.a != null ? val(s.a, J) : 180 - angTo(to, from);
        const hl = s.handleLayer || 'front';
        if (h === 'Seil') {
          for (const sx of [-1, 1]) {
            L[hl].push(cap(rot([0, -3.2], a, to), rot([sx * 0.9, 0.4], a, to), 0.95, 'weight'));
            L[hl].push(circ(rot([sx * 0.9, 0.9], a, to), 1.25, 'weight'));
          }
        } else if (h.includes('Stange')) {
          const ba = val(s.barA || 0, J);
          L[hl].push(cap(rot([-3.6, 0], ba, to), rot([3.6, 0], ba, to), 0.95, 'weight'));
        } else L[hl].push(circ(to, 1.8, 'weight'));
        break;
      }
      case 'dumbbell': {
        const p = val(s.at, J); const a = val(s.a ?? 62, J); const d = dirDown(a);
        const q1 = add(p, d, -3.1); const q2 = add(p, d, 3.1);
        const lb = s.far ? 'farProp' : 'mid'; const lf = s.far ? 'farProp' : 'front';
        L[lb].push(cap(q1, q2, 1, 'weightBack'));
        L[lb].push(rect(q1[0], q1[1], 3.8, 6.6, 90 - a, 'weightBack'));
        L[lf].push(rect(q2[0], q2[1], 3.8, 6.6, 90 - a, s.far ? 'weightBack' : 'weight'));
        break;
      }
      case 'barbell': case 'ez': {
        const p = val(s.at, J); const r = s.r || (s.k === 'ez' ? 5.8 : 8.4);
        put(s, 'mid', circ(p, r, 'weight'));
        break;
      }
      case 'kettlebell': {
        const p = val(s.at, J); const a = val(s.a || 0, J);
        put(s, s.far ? 'farProp' : 'mid', cap(rot([-2.4, 2.6], a, p), rot([0, -1.6], a, p), 0.8, 'weight'));
        put(s, s.far ? 'farProp' : 'mid', cap(rot([2.4, 2.6], a, p), rot([0, -1.6], a, p), 0.8, 'weight'));
        put(s, s.far ? 'farProp' : 'mid', circ(rot([0, 7], a, p), 4.8, s.far ? 'weightBack' : 'weight'));
        break;
      }
      case 'band': {
        const a = val(s.from, J); const b = val(s.to, J); const m = lerpP(a, b, 0.5); const sag = s.sag ?? 1.2;
        const c = [m[0], m[1] + sag]; let prev = a;
        for (let i = 1; i <= 8; i++) {
          const t = i / 8; const u = 1 - t;
          const q = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
          put(s, 'mid', cap(prev, q, 1, 'band')); prev = q;
        }
        L.back.push(circ(a, 1.4, 'band'));
        break;
      }
      case 'loop': put(s, 'front', cap(val(s.a, J), val(s.b, J), 1, 'band')); break;
      case 'lever': put(s, 'back', cap(val(s.from, J), val(s.to, J), 1, 'envLine')); break;
      case 'roller': {
        const p = val(s.at, J); const v = val(s.pivot, J);
        put(s, 'back', cap(v, p, 1, 'envLine')); put(s, 'back', circ(v, 1.4, 'envLine'));
        put(s, 'front', circ(p, s.r || 2.8, 'weightBack'));
        break;
      }
      case 'grip': {
        const p = val(s.at, J);
        if (s.pivot) put(s, 'back', cap(val(s.pivot, J), p, 1, 'envLine'));
        put(s, 'mid', rect(p[0], p[1], 3, 5.2, val(s.a || 0, J), 'weight'));
        break;
      }
      case 'sled': {
        const p = val(s.at, J); const a = val(s.a || 0, J); const w = s.w || 16;
        put(s, 'back', rectAt(p[0], p[1], -1.8, -w / 2, 3.6, w, a, 'env'));
        put(s, 'back', rectAt(p[0], p[1], 1.8, -3, 7, 6, a, 'env'));
        break;
      }
      case 'step': put(s, 'back', rectAt(0, 0, s.x, GROUND - s.h, s.w, s.h, 0, 'env')); break;
      default: break;
    }
  }
  return L;
}

// ───────────────────────────── Figur ─────────────────────────────

/** Muskel-Hinweise je Ansicht (wie HL_SIDE / HL_FRONT in figure.js). */
const HL_SIDE = {
  chest: [{ seg: 'torso', side: 1, t: [0.6, 0.9] }],
  abs: [{ seg: 'torso', side: 1, t: [0.12, 0.52] }],
  back: [{ seg: 'torso', side: -1, t: [0.42, 0.9] }],
  lowerback: [{ seg: 'torso', side: -1, t: [0.08, 0.42] }],
  shoulders: [{ seg: 'upper', dot: true }],
  biceps: [{ seg: 'upper', side: 1, t: [0.28, 0.82] }],
  triceps: [{ seg: 'upper', side: -1, t: [0.28, 0.82] }],
  forearms: [{ seg: 'fore', side: 1, t: [0.15, 0.7] }],
  quads: [{ seg: 'thigh', side: 1, t: [0.22, 0.86] }],
  hams: [{ seg: 'thigh', side: -1, t: [0.25, 0.86] }],
  glutes: [{ seg: 'thigh', side: -1, t: [-0.02, 0.24], w: 0.62 }],
  calves: [{ seg: 'shin', side: -1, t: [0.12, 0.5] }],
};
const HL_FRONT = {
  chest: [{ seg: 'torso', across: 0.74 }],
  back: [{ seg: 'torso', across: 0.7 }],
  abs: [{ seg: 'torso', side: 0, t: [0.14, 0.5], w: 0.4 }],
  lowerback: [{ seg: 'torso', side: 0, t: [0.08, 0.36], w: 0.4 }],
  shoulders: [{ seg: 'upper', dot: true }],
  biceps: [{ seg: 'upper', side: 0, t: [0.3, 0.82] }],
  triceps: [{ seg: 'upper', side: 0, t: [0.3, 0.82] }],
  forearms: [{ seg: 'fore', side: 0, t: [0.15, 0.7] }],
  quads: [{ seg: 'thigh', side: 0, t: [0.22, 0.86] }],
  hams: [{ seg: 'thigh', side: 0, t: [0.22, 0.86] }],
  glutes: [{ seg: 'thigh', side: 1, t: [-0.05, 0.22], w: 0.66 }],
  calves: [{ seg: 'shin', side: 0, t: [0.12, 0.5] }],
};
/** Welche Muskeln sind in welcher Frontansicht sichtbar. */
const FRONT_ONLY = new Set(['chest', 'abs', 'quads', 'biceps']);
const BACK_ONLY = new Set(['back', 'lowerback', 'glutes', 'hams', 'calves', 'triceps']);

const bez = (J, t) => {
  const a = J.H; const c = J.C; const b = J.S; const m = 1 - t;
  return [m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]];
};
const bezN = (J, t) => {
  const a = J.H; const c = J.C; const b = J.S;
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
};

/**
 * Alle Formen einer Pose, von hinten nach vorn.
 * o: {moving:Set, muscles:string[] | {m: Stufe 0…1}, detail, back, props:boolean, floor:[x0,x1]}
 */
export function poseShapes(pose, def, o = {}) {
  const view = def.view || 'side';
  const back = !!(o.back ?? def.back);
  const J = solve(pose, view);
  const mv = o.moving || new Set();
  const mus = Array.isArray(o.muscles) ? Object.fromEntries(o.muscles.map((m) => [m, 1])) : (o.muscles || {});
  const HL = view === 'front' ? HL_FRONT : HL_SIDE;
  const props = o.props === false ? { back: [], farProp: [], mid: [], front: [] } : propShapes(def.props, J);
  const S = [...props.back];
  if (o.floor) S.push(cap([o.floor[0], GROUND + 0.7], [o.floor[1], GROUND + 0.7], 0.85, 'floor'));
  const sides = view === 'front' ? ['l', 'r'] : ['f', 'n'];
  const layers = { farLeg: [], farArm: [], nearLeg: [], nearArm: [] };
  const tint = (m) => {
    const v = mus[m] || 0;
    if (view === 'front' && ((back && FRONT_ONLY.has(m)) || (!back && BACK_ONLY.has(m)))) return 0;
    return v;
  };
  const work = (v, far) => (v >= 0.66 ? (far ? 'workFar' : 'work') : v > 0.05 ? (far ? 'moveFar' : 'move') : null);

  for (const s of sides) {
    const L = J[s];
    const far = view === 'side' && s === 'f';
    const base = far ? 'far' : 'figure';
    const col = (seg) => (mv.has(`${s}.${seg}`) ? (far ? 'moveFar' : 'move') : base);
    const leg = view === 'side' ? (far ? layers.farLeg : layers.nearLeg) : layers.farLeg;
    const arm = view === 'side' ? (far ? layers.farArm : layers.nearArm) : back ? layers.farArm : layers.nearArm;
    const segs = {
      thigh: [L.hip, L.K, WID.thigh], shin: [L.K, L.A, WID.shin], upper: [L.root, L.E, WID.upper], fore: [L.E, L.W, WID.fore],
    };
    leg.push(cap(L.hip, L.K, WID.thigh / 2, col('thigh')), cap(L.K, L.A, WID.shin / 2, col('shin')), cap(L.heel, L.toe, WID.foot / 2, col('foot')));
    arm.push(cap(L.root, L.E, WID.upper / 2, col('upper')), cap(L.E, L.W, WID.fore / 2, col('fore')));
    arm.push(circ(add(L.W, dirDown(L.aH ?? L.aL), SEG.hand * 0.55), WID.hand / 2, col('fore')));
    // Muskel-Tönung auf den Gliedern
    for (const m in HL) {
      const v = tint(m);
      if (!(v > 0.05)) continue;
      for (const sp of HL[m]) {
        if (sp.seg === 'torso') continue;
        const c = work(v, far);
        const into = sp.seg === 'upper' || sp.seg === 'fore' ? arm : leg;
        const [p, q, w] = segs[sp.seg];
        if (sp.dot) { into.push(circ(lerpP(p, q, 0.12), WID.upper * 0.62, c)); continue; }
        const dx = q[0] - p[0]; const dy = q[1] - p[1]; const l = Math.hypot(dx, dy) || 1;
        let n = [dy / l, -dx / l];
        if (view === 'front' && s === 'l') n = [-dy / l, dx / l];
        const hw = w * (sp.w || 0.5);
        const off = (sp.side || 0) * (w / 2 - hw / 2);
        const sw = w * (sp.w || (sp.side ? 0.5 : 0.56));
        into.push(cap(add(lerpP(p, q, sp.t[0]), n, off), add(lerpP(p, q, sp.t[1]), n, off), sw / 2, c));
      }
    }
  }
  S.push(...layers.farLeg, ...layers.farArm, ...props.farProp);
  // Rumpf
  const tcol = mv.has('torso') ? 'move' : 'figure';
  if (view === 'front') {
    S.push(cap(J.H, add(J.S, J.u, -1), WID.torsoFront / 2, tcol));
  } else {
    const end = add(J.S, J.u, -0.6); const r = (WID.torso + (J.br || 0) * 1.6) / 2;
    const C = J.C; let prev = J.H;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8; const u = 1 - t;
      const q = [u * u * J.H[0] + 2 * u * t * C[0] + t * t * end[0], u * u * J.H[1] + 2 * u * t * C[1] + t * t * end[1]];
      S.push(cap(prev, q, r, tcol)); prev = q;
    }
  }
  for (const m in HL) {
    const v = tint(m);
    if (!(v > 0.05)) continue;
    for (const sp of HL[m]) {
      if (sp.seg !== 'torso') continue;
      const c = work(v, false);
      if (view === 'front') {
        if (sp.across) { const cc = lerpP(J.H, J.S, sp.across); S.push(cap(add(cc, J.right, -4.2), add(cc, J.right, 4.2), 2.3, c)); } else S.push(cap(lerpP(J.H, J.S, sp.t[0]), lerpP(J.H, J.S, sp.t[1]), (WID.torso * (sp.w || 0.48)) / 2, c));
        continue;
      }
      const off = sp.side * (WID.torso / 2 - (WID.torso * 0.48) / 2 - 0.2);
      const r = (WID.torso * (sp.w || 0.48)) / 2;
      let prev = null;
      for (let i = 0; i <= 6; i++) {
        const t = sp.t[0] + ((sp.t[1] - sp.t[0]) * i) / 6;
        const q = add(bez(J, t), bezN(J, t), off);
        if (prev) S.push(cap(prev, q, r, c));
        prev = q;
      }
    }
  }
  // Kopf: heller Schädel mit Rand, Augen, Wange, Keimling
  const hd = J.Hd; const ha = J.hdA;
  const local = (x, y) => rot([x, y], ha, hd);
  S.push(cap(local(-0.6, -6.2), local(0, -9.6), 0.75, 'sprout'));
  S.push(circ(local(-2.3, -10.9), 1.75, 'sprout'), circ(local(-3.6, -11.4), 0.9, 'sprout'));
  S.push(circ(local(1.9, -10.9), 1.6, 'sprout'), circ(local(3.0, -11.6), 0.8, 'sprout'));
  S.push(circ(hd, SEG.headR + 1.05, 'edge'), circ(hd, SEG.headR - 1.05, 'head'));
  if (o.detail !== false) {
    if (view === 'front' && !back) {
      const er = o.eyeR || 1.1;
      S.push(circ(local(-2.3, -0.4), er, 'face'), circ(local(2.3, -0.4), er, 'face'));
      const lying = Math.abs((((ha % 360) + 540) % 360) - 180) > 50;
      if (!lying) S.push(circ(local(-3.7, 1.8), 1.3, 'cheek'), circ(local(3.7, 1.8), 1.3, 'cheek'));
    } else if (view === 'side') {
      S.push(circ(local(3.1, -0.9), 1.1, 'face'), circ(local(3.4, 2.2), 1.3, 'cheek'));
    }
  }
  S.push(...props.mid, ...layers.nearLeg, ...layers.nearArm, ...props.front);
  return { shapes: S, J };
}

// ───────────────────────────── Rahmen ─────────────────────────────

/** Enger Rahmen [x, y, w, h] um Figur (und Geräte) über alle Posen. */
export function boundsOf(def, poses, { props = true, pad = 3 } = {}) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of poses) {
    const { shapes } = poseShapes(p, def, { props });
    for (const s of shapes) {
      if (s.c === 'envLine' && s.t === 'cap' && Math.min(s.a[1], s.b[1]) < 6) continue; // hohe Gestelle nicht mitzählen
      const b = boxOf(s);
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
    }
  }
  y1 = Math.max(y1, GROUND + 1.6);
  return [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
}

// ───────────────────────────── Raster ─────────────────────────────

const cache = new Map();

/**
 * Rastert eine Pose in frame = [x, y, w, h] (Figureneinheiten) auf cols × rows Zellen.
 * @returns {{cols:number, rows:number, cells:Uint8Array}}  Wert = Index in KEYS (0 leer)
 */
export function rasterPose(pose, def, o = {}) {
  const frame = o.frame || boundsOf(def, [pose]);
  const cols = o.cols || 48;
  const rows = o.rows || Math.round((cols * frame[3]) / frame[2]);
  const key = JSON.stringify([pose, def.label, def.view, def.back, o.back, frame, cols, rows, o.moving ? [...o.moving] : 0, o.muscles || 0, o.eyeR || 0, o.props, o.floor, o.detail, (def.props || []).length]);
  const hitc = cache.get(key);
  if (hitc) return hitc;
  const { shapes } = poseShapes(pose, def, o);
  const cw = frame[2] / cols; const ch = frame[3] / rows;
  const SS = o.ss || 3;
  const boxes = shapes.map(boxOf);
  const cells = new Uint8Array(cols * rows);
  const cnt = new Float32Array(KEYS.length);
  for (let j = 0; j < rows; j++) {
    const yA = frame[1] + j * ch; const yB = yA + ch;
    // nur Formen, die diese Zeile berühren
    const live = [];
    for (let k = 0; k < shapes.length; k++) if (boxes[k][1] <= yB && boxes[k][3] >= yA) live.push(k);
    if (!live.length) continue;
    for (let i = 0; i < cols; i++) {
      const xA = frame[0] + i * cw; const xB = xA + cw;
      const here = live.filter((k) => boxes[k][0] <= xB && boxes[k][2] >= xA);
      if (!here.length) continue;
      cnt.fill(0);
      let opaque = 0;
      for (let sy = 0; sy < SS; sy++) {
        const y = yA + ((sy + 0.5) / SS) * ch;
        for (let sx = 0; sx < SS; sx++) {
          const x = xA + ((sx + 0.5) / SS) * cw;
          for (let q = here.length - 1; q >= 0; q--) {
            const s = shapes[here[q]];
            if (hit(s, x, y)) { const c = K[s.c]; cnt[c] += WTS[c]; opaque++; break; }
          }
        }
      }
      if (opaque < SS * SS * 0.4) continue;
      let best = 1;
      for (let c = 2; c < KEYS.length; c++) if (cnt[c] > cnt[best]) best = c;
      cells[j * cols + i] = best;
    }
  }
  const R = { cols, rows, cells };
  cache.set(key, R);
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return R;
}

/** Geisterfarben: alles in einem Ton, Arbeit in Altrosa. */
const GHOST = { work: 'move', workFar: 'move', move: 'move', moveFar: 'move' };

/**
 * Malt ein Raster. (x, y) = linke obere Ecke, p = Zellgröße in px.
 * colors: MANNEQUIN_COLORS[theme] (oder eigene).
 * o.style: 'voll' | 'geist' (einfarbig in o.ghost, Arbeit in o.ghostWork) | 'schatten' (alles o.ink)
 */
export function paintRaster(ctx, R, x, y, p, colors, o = {}) {
  const style = o.style || 'voll';
  const colOf = KEYS.map((k) => {
    if (!k) return null;
    if (o.skip && o.skip.includes(k)) return null;
    if (style === 'schatten') return o.ink;
    if (style === 'geist') {
      if (GHOST[k]) return o.ghostWork || colors.move;
      if (k === 'head') return o.ghostHead || colors.head;
      if (k === 'sprout') return o.ghostSprout || colors.sprout;
      return o.ghost;
    }
    return colors[k];
  });
  const prev = ctx.globalAlpha;
  if (o.alpha != null) ctx.globalAlpha = prev * o.alpha;
  for (let j = 0; j < R.rows; j++) {
    let i = 0;
    while (i < R.cols) {
      const c = R.cells[j * R.cols + i];
      const col = colOf[c];
      if (!c || !col) { i++; continue; }
      let e = i + 1;
      while (e < R.cols && R.cells[j * R.cols + e] === c) e++;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + i * p), Math.round(y + j * p), Math.round(x + e * p) - Math.round(x + i * p), Math.round(y + (j + 1) * p) - Math.round(y + j * p));
      i = e;
    }
  }
  ctx.globalAlpha = prev;
}

/** Anteil gefüllter Zellen je Farbschlüssel (für Tests). */
export function census(R) {
  const out = {};
  for (const c of R.cells) if (c) out[KEYS[c]] = (out[KEYS[c]] || 0) + 1;
  return out;
}
