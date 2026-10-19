/**
 * Nachtgarten – Teilen: die Figur als Piktogramm.
 *
 * Dasselbe Skelett wie die Übungsanimationen (anim/figure.js → solve) und dieselben Geräte,
 * aber erwachsen gezeichnet: eine präzise, einfarbige Silhouette (Glieder als runde Striche,
 * Kopf als freistehender Kreis – in der Tradition der Sport-Piktogramme) oder eine feine
 * technische Linie (Achsen, Gelenkpunkte, Kopfring). Kein Keimling, kein Gesicht.
 *
 *   drawFigure(ctx, pose, def, {x, y, s, frame, style, ink, far, env, accent, moving})
 *   figureBounds(def, poses)  → [x, y, w, h] in Figureneinheiten
 */

import { SEG, WID, add, dirDown, dirUp, solve } from '../anim/figure.js';
import { propShapes } from './mannequin.js';

const D2R = Math.PI / 180;
/** Schlanker als in den Animationen: athletisch, nicht pummelig. */
const SLIM = { thigh: 0.86, shin: 0.84, foot: 0.8, torso: 0.86, torsoFront: 0.82, upper: 0.86, fore: 0.86 };
const HEAD_R = SEG.headR * 0.8;

/** Glieder einer Pose: [{a, b, w, side, seg}] in Zeichenreihenfolge (fern → nah), dazu Kopf und Rumpf. */
export function figureGeometry(pose, def) {
  const view = def.view || 'side';
  const J = solve(pose, view);
  const sides = view === 'front' ? ['l', 'r'] : ['f', 'n'];
  const limbs = {};
  for (const s of sides) {
    const L = J[s];
    const hand = add(L.W, dirDown(L.aH ?? L.aL), SEG.hand * 0.45);
    limbs[s] = {
      leg: [
        { a: L.hip, b: L.K, w: WID.thigh * SLIM.thigh, seg: 'thigh' },
        { a: L.K, b: L.A, w: WID.shin * SLIM.shin, seg: 'shin' },
        { a: L.heel, b: L.toe, w: WID.foot * SLIM.foot, seg: 'foot' },
      ],
      arm: [
        { a: L.root, b: L.E, w: WID.upper * SLIM.upper, seg: 'upper' },
        { a: L.E, b: hand, w: WID.fore * SLIM.fore, seg: 'fore' },
      ],
    };
  }
  // Rumpf: Seitenansicht als Kurve (Hüfte → Kontrollpunkt → Schulter), vorn als gerade Säule
  let torso;
  if (view === 'front') torso = { kind: 'line', a: J.H, b: add(J.S, J.u, -1.6), w: WID.torsoFront * SLIM.torsoFront };
  else torso = { kind: 'curve', a: J.H, c: J.C, b: add(J.S, J.u, -1.8), w: WID.torso * SLIM.torso };
  // Kopf frei über dem Rumpf (kleine Lücke = Hals), wie bei klassischen Piktogrammen
  const head = { c: add(J.Hd, dirUp(J.hdA), 0.6), r: HEAD_R };
  return { J, view, sides, limbs, torso, head };
}

function strokeSeg(ctx, P, a, b, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(a)); ctx.lineTo(...P(b)); ctx.stroke();
}

/**
 * Zeichnet die Figur. frame = Ausschnitt in Figureneinheiten, (x, y) = linke obere Ecke in px,
 * s = px je Einheit.
 * style: 'flaeche' (Silhouette, Standard) | 'linie' (technische Zeichnung).
 * Farben: ink (nah), far (fernes Bein/Arm), env (Bank, Gestell), accent (bewegte Glieder; optional).
 */
export function drawFigure(target, pose, def, o) {
  const style = o.style || 'flaeche';
  // Eigene Ebene, damit Fugen (Papierlücken zwischen Gliedern) sauber ausgespart werden können –
  // auch auf durchsichtigen Karten.
  const g = figureGeometry(pose, def);
  const frame = o.frame;
  let layer = null; let ctx = target; let ox = o.x; let oy = o.y;
  if (o.makeCanvas) {
    const lw = Math.ceil(frame[2] * o.s) + 4; const lh = Math.ceil(frame[3] * o.s) + 4;
    layer = o.makeCanvas(lw, lh);
    ctx = layer.getContext('2d');
    ox = 2; oy = 2;
  }
  const s = o.s;
  const ink = o.ink; const far = o.far || ink; const env = o.env || far;
  const P = (p) => [ox + (p[0] - frame[0]) * s, oy + (p[1] - frame[1]) * s];
  const mv = o.moving || new Set();
  const colFor = (side, seg, base) => (o.accent && mv.has(`${side}.${seg}`) ? o.accent : base);
  const props = o.props === false ? null : propShapes(def.props, g.J);
  const gap = layer && style === 'flaeche' && !o.grow ? (o.gap ?? 0.75) * s : 0;
  const lw = o.lw || 1.6;
  const G = (o.grow || 0) * s; // alle Formen um G px dicker (für Konturen)
  ctx.save();
  ctx.lineJoin = 'round';
  // Fuge: vor dem Zeichnen eines Glieds dessen etwas breitere Form ausradieren
  const cut = (fn) => {
    if (!gap) return;
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; fn(gap * 2); ctx.restore();
  };

  const shape = (sh, color, line) => {
    if (sh.t === 'cap') {
      const w = line ? Math.max(1, lw) : sh.r * 2 * s + 2 * G;
      cut((e) => strokeSeg(ctx, P, sh.a, sh.b, w + e, '#000'));
      strokeSeg(ctx, P, sh.a, sh.b, w, color);
    } else if (sh.t === 'circ') {
      const [cx, cy] = P(sh.p);
      const plate = sh.c === 'weight' && sh.r > 4.5; // Hantelscheibe: Ring mit Nabe, damit sie nicht wie ein Kopf wirkt
      cut((e) => { ctx.beginPath(); ctx.arc(cx, cy, sh.r * s + e / 2, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.arc(cx, cy, sh.r * s + G, 0, Math.PI * 2);
      if (line) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
      if (plate && !G) {
        ctx.save();
        if (layer) ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = layer ? '#000' : (o.paper || '#fff');
        ctx.beginPath(); ctx.arc(cx, cy, sh.r * s * 0.62, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, sh.r * s * 0.2), 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const [cx, cy] = P([sh.cx, sh.cy]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sh.rot * D2R);
      if (line) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect((-sh.w / 2) * s, (-sh.h / 2) * s, sh.w * s, sh.h * s); } else { ctx.fillStyle = color; ctx.fillRect((-sh.w / 2) * s - G, (-sh.h / 2) * s - G, sh.w * s + 2 * G, sh.h * s + 2 * G); }
      ctx.restore();
    }
  };
  const propColor = (c) => (c === 'weight' ? ink : c === 'weightBack' ? far : c === 'cable' || c === 'band' ? far : c === 'hole' ? null : env);
  const drawProps = (list) => {
    for (const sh of list || []) {
      const c = propColor(sh.c);
      if (!c) continue;
      if (o.skipEnv && c === env) continue;
      shape(sh, c, style === 'linie' && sh.c !== 'cable' && sh.c !== 'band' && sh.c !== 'weight');
    }
  };

  if (props) drawProps(props.back);
  const limb = (side, part, base, withCut) => {
    // Fuge nur an den freien Enden (Unterarm, untere Hälfte des Oberarms) – am Gelenkansatz
    // im Rumpf würde sie als Kontur sichtbar werden.
    if (withCut) {
      for (const L of g.limbs[side][part]) {
        const w = style === 'linie' ? lw : L.w * s;
        const a = L.seg === 'upper' ? [L.a[0] + (L.b[0] - L.a[0]) * 0.55, L.a[1] + (L.b[1] - L.a[1]) * 0.55] : L.a;
        if (L.seg === 'upper' || L.seg === 'fore') cut((e) => strokeSeg(ctx, P, a, L.b, w + e, '#000'));
      }
    }
    for (const L of g.limbs[side][part]) strokeSeg(ctx, P, L.a, L.b, style === 'linie' ? lw : L.w * s + 2 * G, colFor(side, L.seg, base));
  };
  const [s0, s1] = g.sides;
  const farCol = g.view === 'side' ? far : ink;
  limb(s0, 'leg', farCol); limb(s0, 'arm', farCol);
  if (props) drawProps(props.farProp);
  // Rumpf
  const tc = o.accent && mv.has('torso') ? o.accent : ink;
  const torsoPath = () => {
    ctx.beginPath(); ctx.moveTo(...P(g.torso.a));
    if (g.torso.kind === 'curve') ctx.quadraticCurveTo(...P(g.torso.c), ...P(g.torso.b)); else ctx.lineTo(...P(g.torso.b));
  };
  const tw = style === 'linie' ? lw : g.torso.w * s + 2 * G;
  ctx.strokeStyle = tc; ctx.lineCap = 'round'; ctx.lineWidth = tw;
  torsoPath(); ctx.stroke();
  // Kopf (in der Linienzeichnung mit Hals)
  const [hx, hy] = P(g.head.c);
  ctx.beginPath(); ctx.arc(hx, hy, g.head.r * s + G, 0, Math.PI * 2);
  if (style === 'linie') {
    ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
    const neckTop = add(g.head.c, dirUp(g.J.hdA), -g.head.r);
    strokeSeg(ctx, P, g.torso.b, neckTop, lw, ink);
  } else { ctx.fillStyle = ink; ctx.fill(); }
  if (props) drawProps(props.mid);
  limb(s1, 'leg', ink, false); limb(s1, 'arm', ink, true);
  if (props) drawProps(props.front);
  // Technische Zeichnung: Gelenkpunkte
  if (style === 'linie') {
    ctx.fillStyle = ink;
    for (const side of g.sides) {
      const L = g.J[side];
      for (const p of [L.hip, L.K, L.A, L.root, L.E]) { const [px, py] = P(p); ctx.beginPath(); ctx.arc(px, py, lw * 1.3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
  if (layer) target.drawImage(layer, Math.round(o.x - 2), Math.round(o.y - 2));
  return g;
}

/** Enger Rahmen um Figur (und Geräte) über alle Posen. */
export function figureBounds(def, poses, { pad = 2, props = true, env = true } = {}) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const take = (p, r = 0) => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
  for (const pose of poses) {
    const g = figureGeometry(pose, def);
    take(g.head.c, g.head.r);
    take(g.torso.a, g.torso.w / 2); take(g.torso.b, g.torso.w / 2);
    for (const side of g.sides) for (const part of ['leg', 'arm']) for (const L of g.limbs[side][part]) { take(L.a, L.w / 2); take(L.b, L.w / 2); }
    if (!props) continue;
    const pr = propShapes(def.props, g.J);
    for (const list of Object.values(pr)) {
      for (const sh of list) {
        if (!env && !['weight', 'weightBack', 'cable', 'band'].includes(sh.c)) continue;
        if (sh.c === 'envLine' && sh.t === 'cap' && Math.min(sh.a[1], sh.b[1]) < 6) continue;
        if (sh.t === 'cap') { take(sh.a, sh.r); take(sh.b, sh.r); } else if (sh.t === 'circ') take(sh.p, sh.r); else take([sh.cx, sh.cy], Math.hypot(sh.w, sh.h) / 2);
      }
    }
  }
  return [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
}
