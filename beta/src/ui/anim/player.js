/**
 * Nachtgarten – Übungsanimationen: Abspieler.
 *
 *   import { createExerciseAnim } from "./ui/anim/player.js";
 *   const a = createExerciseAnim(el, { pattern: "squat", equipment: "kurzhantel", size: "large" });
 *   a.pause(); a.play(); a.destroy();
 *
 * - Schleife Start ↔ Ende (~2,4 s, sanft beschleunigt, kurze Haltepunkte).
 * - prefers-reduced-motion: statt Bewegung Start- und Endpose nebeneinander (groß)
 *   bzw. nur die Endpose (Mini-Vorschau).
 * - Pausiert außerhalb des Sichtbereichs (IntersectionObserver) und bei verstecktem Tab.
 * - Farben über CSS-Variablen (--anim-*), passend zu Hell/Dunkel (Design „Abendruhe“).
 * - Ein gemeinsamer requestAnimationFrame-Takt für alle Instanzen.
 * - Zwei Darstellungen: "pixel" (Standard – kleines Pixel-Mannequin, 5–8 Sprite-Bilder
 *   je Bewegung, harte Abendruhe-Palette) und "vector" (glatt, stufenlos, mit Pfeil).
 */
import { adoptCss } from "../adopt-css.js";
import { createFigure, solve, el, NS, GROUND } from "./figure.js";
import { createEquipment } from "./equipment.js";
import { buildPattern } from "../../data/patterns.js";
import { PALETTE_VARS, PALETTE_WEIGHTS, PIXEL_CSS, resolveVars, parseColor, bakeCss, rasterize, onThemeChange } from "./pixel.js";

/* ------------------------------------------------------------ Stil */

export const ANIM_VARS_CSS = `
:where(:root){
  --anim-figure:#8C807A; --anim-figure-far:#C9BEB8; --anim-head:#F6EFEA; --anim-face:#6A5F5A;
  --anim-work:#A9695D; --anim-sprout:#93A485; --anim-weight:#5F5652; --anim-weight-back:#8D8380;
  --anim-env:#EFE7E2; --anim-env-line:#D2C7C1; --anim-cable:#9A8F8A; --anim-band:#9DAA8F;
  --anim-floor:#E2D8D2; --anim-mat:#E3E8DD; --anim-trace:#B58C83; --anim-hole:#FFFCFA;
  --anim-move:#CB9C91; --anim-move-far:#E6CEC7; --anim-ghost:#E7DDD7;
}
@media (prefers-color-scheme:dark){:where(:root:not([data-theme="light"])){
  --anim-figure:#BDB1AB; --anim-figure-far:#6A615E; --anim-head:#ECE3DE; --anim-face:#3A3433;
  --anim-work:#F1CDC4; --anim-sprout:#AFBCA2; --anim-weight:#E4DBD6; --anim-weight-back:#9E9590;
  --anim-env:#2F2A29; --anim-env-line:#4B4442; --anim-cable:#8A807C; --anim-band:#AFBCA2;
  --anim-floor:#3A3433; --anim-mat:#343A31; --anim-trace:#D3A99F; --anim-hole:#252222;
  --anim-move:#D3A99F; --anim-move-far:#7D625C; --anim-ghost:#3B3534;
}}
:where(:root[data-theme="dark"]){
  --anim-figure:#BDB1AB; --anim-figure-far:#6A615E; --anim-head:#ECE3DE; --anim-face:#3A3433;
  --anim-work:#F1CDC4; --anim-sprout:#AFBCA2; --anim-weight:#E4DBD6; --anim-weight-back:#9E9590;
  --anim-env:#2F2A29; --anim-env-line:#4B4442; --anim-cable:#8A807C; --anim-band:#AFBCA2;
  --anim-floor:#3A3433; --anim-mat:#343A31; --anim-trace:#D3A99F; --anim-hole:#252222;
  --anim-move:#D3A99F; --anim-move-far:#7D625C; --anim-ghost:#3B3534;
}`;
/** Regeln für die Szene (Farben nur über --anim-*). */
export const ANIM_RULES_CSS = `
.nga{display:block;overflow:hidden;width:100%;height:100%}
.nga-wrap{position:relative;display:block;aspect-ratio:1/1}
.nga-wrap.nga-pair{aspect-ratio:2/1}
.nga .nga-limb line,.nga .nga-limb path{stroke:var(--anim-figure);stroke-linecap:round;stroke-linejoin:round;fill:none}
.nga .nga-far line{stroke:var(--anim-figure-far)}
.nga .nga-hand{fill:var(--anim-figure)}
.nga .nga-far .nga-hand{fill:var(--anim-figure-far)}
.nga .nga-skull{fill:var(--anim-head);stroke:var(--anim-figure);stroke-width:2.1}
.nga .nga-eye{fill:var(--anim-face)}
.nga .nga-cheek{fill:var(--anim-work);opacity:.42}
.nga .nga-sprout path{fill:var(--anim-sprout)}
.nga .nga-sprout .nga-sprout-stem{fill:none;stroke:var(--anim-sprout);stroke-width:1.1;stroke-linecap:round}
.nga .nga-limb .nga-work{stroke:var(--anim-work);opacity:.95}
.nga circle.nga-work{fill:var(--anim-work);stroke:none;opacity:.95}
.nga .nga-limb .nga-work-far{opacity:.5}
.nga circle.nga-work-far{opacity:.5}
.nga .nga-breath{fill:var(--anim-work)}
.nga .nga-pelvic{fill:var(--anim-work)}
.nga .nga-floor{stroke:var(--anim-floor);stroke-width:1.4;stroke-linecap:round}
.nga .nga-env{fill:var(--anim-env);stroke:var(--anim-env-line);stroke-width:.9}
.nga .nga-tower{fill:var(--anim-env);stroke:var(--anim-env-line);stroke-width:.9}
.nga .nga-wall{fill:var(--anim-env);stroke:none}
.nga .nga-far-env{opacity:.5}
.nga .nga-mat{fill:var(--anim-mat)}
.nga .nga-frame{stroke:var(--anim-env-line);fill:none;stroke-linecap:round;stroke-linejoin:round}
.nga .nga-pulley{fill:var(--anim-hole);stroke:var(--anim-cable);stroke-width:1.3}
.nga .nga-cable{stroke:var(--anim-cable);stroke-width:.85;stroke-linecap:round}
.nga .nga-handle{stroke:var(--anim-weight);fill:none;stroke-linecap:round;stroke-linejoin:round}
.nga .nga-handle .nga-knob{fill:var(--anim-weight);stroke:none}
.nga .nga-weight{fill:var(--anim-weight)}
.nga .nga-weight-back{fill:var(--anim-weight-back)}
.nga .nga-dbbar{stroke:var(--anim-weight-back);stroke-width:1.6;stroke-linecap:round}
.nga .nga-plate-ring{fill:none;stroke:var(--anim-hole);stroke-width:.7;opacity:.55}
.nga .nga-hub{fill:var(--anim-hole)}
.nga .nga-kbhandle{stroke:var(--anim-weight);stroke-width:1.5}
.nga .nga-bar{fill:var(--anim-weight)}
.nga .nga-band{stroke:var(--anim-band);stroke-width:1.7;stroke-linecap:round}
.nga .nga-band-anchor{fill:var(--anim-band)}
.nga .nga-lever{stroke:var(--anim-env-line);stroke-width:2;stroke-linecap:round}
.nga .nga-roller{fill:var(--anim-weight-back)}
.nga .nga-pivot{fill:var(--anim-env-line)}
.nga .nga-gripbar{fill:var(--anim-weight)}
.nga .nga-trace{stroke:var(--anim-trace);fill:none;stroke-width:1.1;stroke-linecap:round;stroke-dasharray:.1 2.6;opacity:.75}
.nga .nga-trace-head{fill:var(--anim-trace);opacity:.8}
.nga .nga-limb .nga-move{stroke:var(--anim-move)}
.nga .nga-far .nga-move{stroke:var(--anim-move-far)}
.nga .nga-hand.nga-move{fill:var(--anim-move)}
.nga .nga-far .nga-hand.nga-move{fill:var(--anim-move-far)}
.nga .nga-ghost line,.nga .nga-ghost path{stroke:var(--anim-ghost)!important}
.nga .nga-ghost circle,.nga .nga-ghost .nga-sprout path{fill:var(--anim-ghost)!important;stroke:var(--anim-ghost)!important}
.nga .nga-ghost .nga-sprout .nga-sprout-stem{fill:none!important}
.nga-phase{display:flex;justify-content:center;gap:.5em;font-size:.8rem;line-height:1.3;color:var(--anim-figure);margin-top:4px;min-height:1.3em}
.nga-phase span{opacity:.5;transition:opacity .25s,color .25s}
.nga-phase span.on{opacity:1;color:var(--anim-trace);font-weight:700}
.nga-phase i{font-style:normal;opacity:.4}
.nga .nga-pairarrow{fill:none;stroke:var(--anim-trace);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.nga--thumb .nga-trace,.nga--thumb .nga-trace-head{display:none}
.nga-px{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.nga-pairbox{display:flex;align-items:center;gap:4%;width:100%;height:100%}
.nga-pairbox>canvas{flex:1;min-width:0;aspect-ratio:1/1;height:auto}
.nga-pairbox>span{color:var(--anim-trace);font-size:1.1em;flex:none}
`;
export const ANIM_CSS = ANIM_VARS_CSS + ANIM_RULES_CSS;

let cssDone = false;
/** Fügt die Standard-Stile einmalig ein (im Dokument oder in einem ShadowRoot). */
export function injectAnimCss(root = document.head) {
  if (cssDone && root === document.head) return;
  if (root === document.head) {
    adoptCss("nga-css", ANIM_CSS);
    cssDone = true;
    return;
  }
  const st = document.createElement("style");
  st.dataset.nga = "1";
  st.textContent = ANIM_CSS;
  root.appendChild(st);
  if (root === document.head) cssDone = true;
}

/* -------------------------------------------------------- Interpolation */

/** Interpoliert zwei Posen (Zahlen und [x,y]-Paare). */
export function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (vb === undefined) o[k] = va;
    else if (typeof va === "number") o[k] = va + (vb - va) * t;
    else if (Array.isArray(va)) o[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
    else o[k] = t < 0.5 ? va : vb;
  }
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}
const easeSine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const easeQuad = (x) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x));

/** Pose an Position s ∈ [0, frames-1] (stückweise linear zwischen Schlüsselposen). */
function poseAt(frames, s) {
  const n = frames.length - 1;
  if (s <= 0) return frames[0];
  if (s >= n) return frames[n];
  const i = Math.floor(s);
  return lerpPose(frames[i], frames[i + 1], s - i);
}

/** Zeitplan → Position s ∈ [0, frames-1]. timing: {hold0, up, hold1, down} in Sekunden. */
export function phase(def, time) {
  const n = def.frames.length - 1;
  if (def.loop === "cycle") { const per = def.period || 2.4; return ((time % per) / per) * n; }
  const T = def.timing;
  const total = T.hold0 + T.up + T.hold1 + T.down;
  let c = time % total;
  const e = def.ease === "quad" ? easeQuad : easeSine;
  if (c < T.hold0) return 0;
  c -= T.hold0;
  if (c < T.up) return e(c / T.up) * n;
  c -= T.up;
  if (c < T.hold1) return n;
  c -= T.hold1;
  return (1 - e(c / T.down)) * n;
}
export { poseAt };

/** Richtung: 0 = Start → Ende (inkl. Halt davor), 1 = zurück (inkl. Halt am Ende). */
export function phaseDir(def, time) {
  if (def.loop === "cycle") return 0;
  const T = def.timing, c = time % (T.hold0 + T.up + T.hold1 + T.down);
  return c < T.hold0 + T.up ? 0 : 1;
}

/* --------------------------------------------------------------- Szene */

const LAYERS = ["ghost", "back", "trace", "farLeg", "farArm", "farProp", "torso", "head", "mid", "nearLeg", "nearArm", "front"];

/**
 * Welche Segmente bewegen sich deutlich? (Winkeländerung > 26° zwischen den Posen)
 * def.emph kann das überschreiben: Liste aus "legs", "arms", "torso", "nArm", "fLeg", "rArm", …
 */
export function movingSegments(def) {
  const sides = def.view === "front" ? ["l", "r"] : ["n", "f"];
  const out = new Set();
  if (def.emph) {
    for (const t of def.emph) {
      if (t === "torso") { out.add("torso"); continue; }
      const one = /^[nflr][A-Z]/.test(t); // z. B. "nArm" = nur nahe Seite
      const grp = (one ? t.slice(1) : t).toLowerCase();
      const ss = one ? [t[0]] : sides;
      const segs = grp === "legs" || grp === "leg" ? ["thigh", "shin", "foot"] : ["upper", "fore"];
      for (const s of ss) for (const g of segs) out.add(s + "." + g);
    }
    return out;
  }
  if (def.frames.length < 2) return out;
  const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 57.2958;
  const segs = { thigh: ["hip", "K"], shin: ["K", "A"], foot: ["heel", "toe"], upper: ["root", "E"], fore: ["E", "W"] };
  const J0 = solve(def.frames[0], def.view);
  for (const f of def.frames.slice(1)) {
    const J = solve(f, def.view);
    for (const s of sides) for (const g in segs) {
      const [a, b] = segs[g];
      let d = Math.abs(ang(J[s][a], J[s][b]) - ang(J0[s][a], J0[s][b])) % 360;
      if (d > 180) d = 360 - d;
      if (d > 26) out.add(s + "." + g);
    }
  }
  return out;
}

/** Bewegt sich die Figur überhaupt nennenswert? (für Geist/Pfeil) */
function hasMotion(def) {
  if (def.loop === "cycle" || def.frames.length < 2 || def.breath) return false;
  const a = solve(def.frames[0], def.view), b = solve(def.frames[def.frames.length - 1], def.view);
  const pts = (J) => [J.H, J.S, J.Hd, ...[].concat(...(def.view === "front" ? ["l", "r"] : ["n", "f"]).map((s) => [J[s].W, J[s].A, J[s].K, J[s].E]))];
  const pa = pts(a), pb = pts(b);
  return pa.some((p, i) => Math.hypot(p[0] - pb[i][0], p[1] - pb[i][1]) > 5);
}

/** Baut eine Szene (Figur + Geräte) in eine Gruppe. */
function buildScene(parent, def, { detail, ghost, pixel, frame, emphasis = true }) {
  const L = {};
  for (const n of LAYERS) L[n] = el("g", { class: "nga-l-" + n }, parent);
  if (def.floor !== false) {
    const [vx, , vw] = frame || def.frame;
    el("line", { x1: vx + 3, x2: vx + vw - 3, y1: GROUND + 0.7, y2: GROUND + 0.7, class: "nga-floor" }, L.back);
  }
  const equip = createEquipment(L, def.props, { detail });
  const moving = emphasis ? movingSegments(def) : new Set();
  const fig = createFigure(L, { view: def.view, back: def.back, detail, pixel, moving,
    muscles: def.muscles, breath: def.breath, pelvic: def.pelvic });
  if (ghost && hasMotion(def)) { // Endpose als einfarbige Silhouette ganz hinten
    const gl = {};
    for (const n of ["farLeg", "farArm", "torso", "head", "nearLeg", "nearArm"]) gl[n] = el("g", {}, L.ghost);
    createFigure(gl, { view: def.view, back: def.back, detail: false, ghost: true }).update(solve(def.frames[def.frames.length - 1], def.view));
  }
  return {
    L,
    render(pose) {
      const J = solve(pose, def.view);
      fig.update(J);
      equip.update(J);
      return J;
    },
  };
}

/** Bewegungspfad (gepunktete Linie mit kleiner Pfeilspitze) für def.trace. */
function drawTrace(layer, def, headR = 2.6) {
  const tr = def.trace;
  if (!tr || !hasMotion(def)) return;
  const list = Array.isArray(tr) ? tr : [tr];
  const n = def.frames.length - 1;
  for (const t of list) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(t.at(solve(poseAt(def.frames, (i / 24) * n), def.view)));
    // seitlich versetzen
    const off = t.off ?? 5.5;
    const sh = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [p[0] - (dy / l) * off, p[1] + (dx / l) * off];
    });
    const s0 = t.from ?? 0.12, s1 = t.to ?? 0.88;
    const sel = sh.slice(Math.round(s0 * 24), Math.round(s1 * 24) + 1);
    if (sel.length < 2) continue;
    const len = sel.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - sel[i - 1][0], p[1] - sel[i - 1][1]) : 0), 0);
    if (len < 4) continue;
    el("path", { class: "nga-trace", d: "M" + sel.map((p) => p.map((v) => v.toFixed(2)).join(" ")).join("L") }, layer);
    const e = sel[sel.length - 1], p = sel[sel.length - 2];
    const a = Math.atan2(e[1] - p[1], e[0] - p[0]);
    const h = (ang, r) => [e[0] + Math.cos(ang) * r, e[1] + Math.sin(ang) * r];
    const q1 = h(a + Math.PI * 0.8, headR), q2 = h(a - Math.PI * 0.8, headR);
    el("path", { class: "nga-trace-head", d: `M${e[0].toFixed(2)} ${e[1].toFixed(2)}L${q1[0].toFixed(2)} ${q1[1].toFixed(2)}L${q2[0].toFixed(2)} ${q2[1].toFixed(2)}Z` }, layer);
  }
}

/* ------------------------------------------------------- gemeinsamer Takt */

const active = new Set();
let rafId = 0;
function tick(now) {
  for (const inst of active) inst._frame(now);
  rafId = active.size ? requestAnimationFrame(tick) : 0;
}
function wake(inst) {
  active.add(inst);
  if (!rafId) rafId = requestAnimationFrame(tick);
}
function sleep(inst) { active.delete(inst); }

const reducedMQ = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

/**
 * Enger, quadratischer Bildausschnitt um die Figur über alle Posen –
 * für Mini-Vorschauen, damit die Figur das kleine Feld gut ausfüllt.
 */
export function autoFrame(def, pad = 4, anchors = false) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const take = (p, r = 0) => {
    if (!p) return;
    x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r);
    x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r);
  };
  for (const f of def.frames) {
    const J = solve(f, def.view);
    take(J.Hd, 10.5); take(J.H, 7); take(J.S, 7);
    for (const s of def.view === "front" ? ["l", "r"] : ["n", "f"]) {
      const L = J[s];
      [L.E, L.W, L.G, L.K, L.A, L.toe, L.heel].forEach((p) => take(p, 3.5));
    }
  }
  if (anchors) for (const pr of def.props || []) {
    // feste Kabel-/Band-Ankerpunkte (Umlenkrolle) sollen sichtbar bleiben
    if ((pr.k === "cable" || pr.k === "band") && Array.isArray(pr.from)) take(pr.from, 3);
    if (pr.k === "pullbar") take([pr.x, pr.y], 3);
  }
  if (def.floor !== false) y1 = Math.max(y1, GROUND + 2);
  const side = Math.max(x1 - x0, y1 - y0) + pad * 2;
  const cx = (x0 + x1) / 2;
  const top = def.floor !== false ? Math.min(y1 + pad - side, (y0 + y1) / 2 - side / 2) : (y0 + y1) / 2 - side / 2;
  return [cx - side / 2, top, side, side];
}

/** Größen in Pixeln. */
export const SIZES = { thumb: 56, small: 120, large: 280 };
/** Rastergröße (Pixel je Kante) für den Pixel-Look. */
export const GRID = { thumb: 32, large: 88 };

/* ------------------------------------------------------- Vektor-Darstellung */

function vectorRunner(wrap, def, o) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "nga" + (o.thumb ? " nga--thumb" : ""));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("viewBox", o.frame.join(" "));
  wrap.appendChild(svg);
  const scene = buildScene(el("g", {}, svg), def, { detail: !o.thumb, ghost: o.ghost, frame: o.frame });
  if (o.arrow) drawTrace(scene.L.trace, def);
  let lastS = -1;
  scene.render(def.frames[0]);
  return {
    draw(time) {
      const s = phase(def, time);
      o.onPhase && o.onPhase(time);
      if (Math.abs(s - lastS) < 1e-4) return; // in Haltephasen nichts neu zeichnen
      lastS = s;
      scene.render(poseAt(def.frames, s));
    },
    showStatic() {
      svg.remove();
      const [x, y, w, h] = o.frame;
      const last = def.frames[def.frames.length - 1];
      const s2 = document.createElementNS(NS, "svg");
      s2.setAttribute("class", "nga" + (o.thumb ? " nga--thumb" : ""));
      s2.setAttribute("aria-hidden", "true");
      wrap.appendChild(s2);
      if (o.thumb) {
        s2.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
        buildScene(el("g", {}, s2), def, { detail: false, frame: o.frame }).render(def.reducedPose || last);
        return;
      }
      wrap.classList.add("nga-pair");
      const gap = w * 0.16;
      s2.setAttribute("viewBox", `${x} ${y} ${w * 2 + gap} ${h}`);
      buildScene(el("g", {}, s2), def, { detail: true, frame: o.frame }).render(def.frames[0]);
      buildScene(el("g", { transform: `translate(${w + gap} 0)` }, s2), def, { detail: true, frame: o.frame }).render(last);
      const ax = x + w + gap / 2, ay = y + h * 0.5;
      el("path", { class: "nga-pairarrow", d: `M${ax - 4} ${ay}h8m-3 -3l3 3l-3 3` }, s2);
    },
    destroy() {},
  };
}

/* -------------------------------------------------------- Pixel-Darstellung */

const spriteCache = new Map();

/** Anzahl Sprite-Bilder und deren Positionen s entlang der Schlüsselposen. */
function spritePositions(def) {
  const n = def.frames.length - 1;
  if (def.loop === "cycle") { const K = 8; return Array.from({ length: K }, (_, i) => (i / K) * n); }
  const slow = def.timing.up >= 1.9;
  const K = slow ? 5 : n > 1 ? 8 : 7;
  return Array.from({ length: K }, (_, i) => (i / (K - 1)) * n);
}

function pixelRunner(wrap, def, o) {
  const grid = o.grid || (o.thumb ? GRID.thumb : GRID.large);
  const pos = spritePositions(def);
  const K = pos.length, n = def.frames.length - 1;
  const cv = document.createElement("canvas");
  cv.width = cv.height = grid;
  cv.className = "nga-px";
  wrap.appendChild(cv);
  const ctx = cv.getContext("2d");
  let sprites = null, cur = -1, token = 0, staticMode = false;

  // Unsichtbare Vektor-Szene als Vorlage
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("class", "nga" + (o.thumb ? " nga--thumb" : ""));
  svg.setAttribute("viewBox", o.frame.join(" "));
  svg.setAttribute("width", grid); svg.setAttribute("height", grid);
  const style = el("style", {}, svg);
  const scene = buildScene(el("g", {}, svg), def, { detail: !o.thumb, pixel: true, ghost: o.ghost, frame: o.frame });
  if (o.arrow) drawTrace(scene.L.trace, def, 3.8); // Pixel-Bewegungsspur

  async function prepare() {
    const my = ++token;
    // Farben erst lesen, wenn das Element im Dokument hängt (sonst sind die CSS-Variablen leer)
    if (!wrap.isConnected) { requestAnimationFrame(() => my === token && prepare()); return; }
    const vars = resolveVars(wrap);
    const key = o.key + "|" + grid + "|" + PALETTE_VARS.map((k) => vars[k]).join(",");
    let job = spriteCache.get(key);
    if (!job) {
      job = (async () => {
        style.textContent = bakeCss(ANIM_RULES_CSS + PIXEL_CSS, vars);
        const names = PALETTE_VARS.filter((k, i) => PALETTE_VARS.findIndex((q) => vars[q] === vars[k]) === i);
        const pal = names.map((k) => parseColor(vars[k]));
        const wts = names.map((k) => PALETTE_WEIGHTS[k] || 1);
        const out = [];
        for (const s of pos) {
          scene.render(poseAt(def.frames, s));
          out.push(await rasterize(new XMLSerializer().serializeToString(svg), grid, pal, wts));
        }
        return out;
      })();
      spriteCache.set(key, job);
      if (spriteCache.size > 400) spriteCache.delete(spriteCache.keys().next().value);
    }
    const res = await job;
    if (my !== token) return;
    sprites = res; cur = -1;
    if (staticMode) paintStatic(); else show(0);
  }
  function show(i) {
    if (!sprites || i === cur) return;
    cur = i; ctx.putImageData(sprites[i], 0, 0);
  }
  let pairBox = null;
  function paintStatic() {
    if (!sprites) return;
    if (o.thumb) { ctx.putImageData(sprites[def.loop === "cycle" ? 0 : K - 1], 0, 0); return; }
    if (!pairBox) {
      cv.remove();
      wrap.classList.add("nga-pair");
      pairBox = document.createElement("div");
      pairBox.className = "nga-pairbox";
      const c1 = document.createElement("canvas"), c2 = document.createElement("canvas");
      for (const c of [c1, c2]) { c.width = c.height = grid; c.className = "nga-px"; }
      const ar = document.createElement("span"); ar.textContent = "→"; ar.setAttribute("aria-hidden", "true");
      pairBox.append(c1, ar, c2);
      wrap.appendChild(pairBox);
    }
    const [c1, , c2] = pairBox.children;
    c1.getContext("2d").putImageData(sprites[0], 0, 0);
    c2.getContext("2d").putImageData(sprites[def.loop === "cycle" ? Math.floor(K / 2) : K - 1], 0, 0);
  }
  const off = onThemeChange(() => { clearTimeout(prepare._t); prepare._t = setTimeout(prepare, 30); });
  prepare();
  return {
    draw(time) {
      const s = phase(def, time);
      o.onPhase && o.onPhase(time);
      const i = def.loop === "cycle" ? Math.floor((s / n) * K + 1e-6) % K : Math.round((s / n) * (K - 1));
      show(i);
    },
    showStatic() { staticMode = true; paintStatic(); },
    ready: () => !!sprites,
    destroy() { off(); token++; },
  };
}

/* ------------------------------------------------------------ öffentliche API */

/**
 * Erzeugt eine Übungsanimation im Element `host`.
 * @param {HTMLElement} host
 * @param {object} cfg
 *   pattern, equipment, options – siehe data/patterns.js bzw. data/exercise-map.js
 *   size: "thumb" | "small" | "large" | Zahl (px)
 *   renderer: "pixel" (Standard, Sprite-Look) | "vector" (glatt, stufenlos)
 *   muscles: überschreibt die getönten Muskeln; label: Bildbeschreibung
 *   arrow: Bewegungsspur mit Pfeil (Standard: groß ja), ghost: Endpose als blasse Silhouette (Standard: groß ja)
 *   phases: Phasen-Beschriftung unter der großen Ansicht („runter · hoch“, Standard: groß ja)
 *   grid: Pixelraster (Standard 88 groß / 32 klein)
 *   reduced: true/false erzwingt bzw. verhindert die ruhige Darstellung
 *   offset: Startversatz in Sekunden (damit nicht alle im Gleichtakt laufen)
 * @returns {{play():void, pause():void, toggle():void, seek(sec:number):void, destroy():void, playing:boolean, def:object}}
 */
export function createExerciseAnim(host, cfg = {}) {
  injectAnimCss();
  const opts = { equipment: cfg.equipment, ...(cfg.options || {}) };
  const def = buildPattern(cfg.pattern, opts);
  if (cfg.muscles) def.muscles = cfg.muscles;
  const size = cfg.size || "large";
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.large;
  const thumb = px <= 72;
  const reduced = cfg.reduced ?? !!(reducedMQ && reducedMQ.matches);
  // Ausschnitt: Mini eng um die Figur, groß etwas luftiger inkl. Kabelrollen
  const frame = thumb ? def.thumbFrame || autoFrame(def) : def.largeFrame || autoFrame(def, 7, true);
  const renderer = cfg.renderer === "vector" ? "vector" : "pixel";

  const wrap = document.createElement("div");
  wrap.className = "nga-wrap nga-wrap--" + renderer + (thumb ? " nga-wrap--thumb" : "");
  wrap.style.width = (reduced && !thumb ? px * 1.6 : px) + "px";
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", cfg.label || def.label || "Übungsanimation");
  host.appendChild(wrap);

  const o = { thumb, frame, ghost: cfg.ghost ?? !thumb, arrow: cfg.arrow ?? !thumb, grid: cfg.grid,
    key: JSON.stringify([cfg.pattern, opts, cfg.muscles || null, thumb, cfg.ghost, cfg.arrow]) };
  // Phasen-Beschriftung (z. B. „runter · hoch“): aktive Richtung wird betont
  let phaseEl = null;
  if ((cfg.phases ?? !thumb) && !reduced && def.phases) {
    phaseEl = document.createElement("div");
    phaseEl.className = "nga-phase";
    phaseEl.setAttribute("aria-hidden", "true");
    const labels = def.loop === "cycle" ? [def.phases[0]] : def.phases;
    labels.forEach((t, i) => {
      if (i) phaseEl.append(Object.assign(document.createElement("i"), { textContent: "·" }));
      phaseEl.append(Object.assign(document.createElement("span"), { textContent: t }));
    });
    wrap.after(phaseEl);
    let last = -1;
    const spans = phaseEl.querySelectorAll("span");
    o.onPhase = (time) => {
      const d = phaseDir(def, time);
      if (d === last) return;
      last = d;
      spans.forEach((sp, i) => sp.classList.toggle("on", i === d || spans.length === 1));
    };
  }
  const runner = renderer === "pixel" ? pixelRunner(wrap, def, o) : vectorRunner(wrap, def, o);
  const inst = { def, playing: false, renderer };

  if (reduced) {
    runner.showStatic();
    inst.play = inst.pause = inst.toggle = inst.seek = () => {};
    inst.destroy = () => { runner.destroy(); wrap.remove(); };
    return inst;
  }

  let t0 = null, tPaused = 0, visible = true, wanted = cfg.autoplay !== false;
  const offset = (cfg.offset || 0) * 1000;
  inst._frame = (now) => {
    if (t0 === null) t0 = now - tPaused - offset;
    runner.draw((now - t0) / 1000);
  };
  const sync = () => {
    const run = wanted && visible && !document.hidden;
    if (run && !inst.playing) { t0 = null; inst.playing = true; wake(inst); }
    else if (!run && inst.playing) {
      inst.playing = false; sleep(inst);
      if (t0 !== null) tPaused = performance.now() - t0;
    }
  };
  let io = null;
  if (typeof IntersectionObserver === "function") {
    io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: "80px" });
    io.observe(wrap);
  }
  const onVis = () => sync();
  document.addEventListener("visibilitychange", onVis);

  inst.play = () => { wanted = true; sync(); };
  inst.pause = () => { wanted = false; sync(); };
  inst.toggle = () => (wanted ? inst.pause() : inst.play());
  /** Hält an und springt auf eine feste Zeit (Sekunden) – für Tests/Vorschaubilder. */
  inst.seek = (sec) => { inst.pause(); runner.draw(sec); };
  inst.ready = () => (runner.ready ? runner.ready() : true);
  inst.destroy = () => {
    inst.pause(); io && io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    runner.destroy(); wrap.remove(); phaseEl && phaseEl.remove();
  };
  sync();
  return inst;
}
