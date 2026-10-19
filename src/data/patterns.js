/**
 * Nachtgarten – Bewegungsmuster für die Übungsanimationen.
 *
 * Jedes Muster ist eine Funktion (opts) → Definition:
 *   {
 *     label, view: "side"|"front", back (Rückansicht),
 *     frame: [x, y, w, h]  Bildausschnitt (viewBox),
 *     frames: [poseStart, …, poseEnde]  Schlüsselposen (siehe figure.js),
 *     loop: "pingpong" (Standard) | "cycle" (immer vorwärts, z. B. Gehen),
 *     timing: {hold0, up, hold1, down} Sekunden,  ease: "sine"|"quad",
 *     props: [Geräte-Specs (equipment.js)],
 *     muscles: [Muskel-Ids für die zarte Tönung],
 *     trace: {at: J => Punkt, off} Bewegungspfad-Hinweis,
 *     breath, pelvic: Atem-/Beckenboden-Anzeige
 *   }
 * Start = Ausgangsposition, Ende = Endposition der Arbeitsphase.
 *
 * Gemeinsame Optionen: equipment ("koerper" | "kurzhantel" | "langhantel" | "sz" |
 * "kettlebell" | "kabel" | "maschine" | "band" | "multipresse" | "stange"),
 * height ("hoch" | "mittel" | "tief") und handle ("Seil" | "Stange" | "Lat-Stange" |
 * "V-Griff" | "Einzelgriff" | "Fußschlaufe") für den Kabelzug, uni (einarmig/einbeinig)
 * und musterspezifische Varianten (variant).
 */
import { ANKLE_Y as AY, GROUND, add, dirDown, lerpP, SEG } from "../ui/anim/figure.js";
import { pulleyPos } from "../ui/anim/equipment.js";

/* ------------------------------------------------------------ Helfer */

const HY = AY - 36.9; // Hüfthöhe im Stand
const T = (hold0 = 0.3, up = 0.9, hold1 = 0.3, down = 0.9) => ({ hold0, up, hold1, down });
const P = (...os) => Object.assign({}, ...os);
const FR_STAND = [0, 4, 100, 100];
const FR_FLOOR = [4, 24, 92, 92];

/** Grundpose: aufrecht stehend, Seitenansicht, Blick nach rechts. */
const STAND = { hx: 50, hy: HY, tr: 0, nA: [51.5, AY], fA: [49.5, AY], nU: 3, nL: 6, fU: -3, fL: 2 };
/** Grundpose: Frontansicht stehend. */
const FSTAND = { hx: 50, hy: HY, tr: 0, lA: [45.6, AY], rA: [54.4, AY], lU: 6, lL: 4, rU: 6, rL: 4 };

/** Hüfte und Rumpfziel für eine gerade Körperlinie von ankle bis shoulder. */
function bodyLine(ankle, shoulder) {
  const k = 37 / 59;
  const hip = lerpP(ankle, shoulder, k);
  return { hx: hip[0], hy: hip[1], St: shoulder };
}

const g = (s) => (J) => J[s].G; // Griffpunkt
const mid = (J) => lerpP(J.n.G, J.f.G, 0.5);
const db = (s, a) => ({ k: "dumbbell", at: g(s), far: s === "f" || s === "l", ...(a != null ? { a } : {}) });
const tower = (x, height, side = 1, extra = {}) => ({ k: "tower", x, height, side, ...extra });

/** Gehaltene Gewichte an den Händen (Seitenansicht) je nach Gerät. */
function held(eq, o = {}) {
  switch (eq) {
    case "kurzhantel": return o.uni ? [db("n", o.a)] : [db("f", o.a), db("n", o.a)];
    case "langhantel": case "multipresse": return [{ k: "barbell", at: o.at || g("n") }];
    case "sz": return [{ k: "ez", at: o.at || g("n") }];
    case "kettlebell": return o.uni ? [{ k: "kettlebell", at: g("n") }] : [{ k: "kettlebell", at: g("f"), far: true }, { k: "kettlebell", at: g("n") }];
    default: return [];
  }
}
const isCable = (eq) => eq === "kabel";
const H = (o, d) => o.height || d;
const HD = (o, d) => o.handle || d;

/* ------------------------------------------------------------ Muster */

export const PATTERNS = {
  /** Kniebeuge (Langhantel hinten, Goblet, Körpergewicht, Multipresse, Stuhl) */
  squat(o) {
    const eq = o.equipment || "koerper";
    const A = P(STAND, { hx: 50, tr: 3, nA: [53, AY], fA: [51.5, AY] });
    const B = P(A, { hx: 38.5, hy: 72, tr: 40 });
    const props = [];
    if (eq === "langhantel" || eq === "multipresse") {
      const at = (J) => add(add(J.S, J.back, 6.2), J.u, -2.2);
      Object.assign(A, { nWr: [-4.5, 0.6], fWr: [-4, 0.4], nEb: 1, fEb: 1 });
      Object.assign(B, { nWr: [-4.5, 0.6], fWr: [-4, 0.4] });
      if (eq === "multipresse") props.push({ k: "frame", d: "M34 8V94M37 8V94", sw: 1.8 }, { k: "frame", d: "M30 8H41", sw: 2 });
      props.push({ k: "barbell", at, r: 7 });
    } else if (eq === "kurzhantel" || eq === "kettlebell") { // Goblet
      Object.assign(A, { nWr: [8.4, -6.5], fWr: [8, -6.5] });
      Object.assign(B, { nWr: [8.4, -6.5], fWr: [8, -6.5] });
      props.push(eq === "kurzhantel"
        ? { k: "dumbbell", at: (J) => add(J.n.G, J.u, -1.5), a: (J) => 180 - J.tr }
        : { k: "kettlebell", at: (J) => add(J.n.G, J.u, 0.5), a: (J) => -J.tr * 0.3 });
    } else {
      Object.assign(A, { nU: 8, nL: 14, fU: 4, fL: 10 });
      Object.assign(B, { nU: 84, nL: 88, fU: 80, fL: 84 });
    }
    if (o.chair) { props.unshift({ k: "chair", x: 33, y: 73.5 }); Object.assign(B, { hx: 36, hy: 68, tr: 34 }); }
    return { label: "Kniebeuge", frame: FR_STAND, frames: [A, B], props, muscles: ["quads", "glutes"], emph: ["legs"],
      trace: { at: (J) => J.H, off: 7 } };
  },

  /** Hüftbeuge: Rumänisches Kreuzheben, Kreuzheben (deep), Pull-Through (Kabel) */
  hinge(o) {
    const eq = o.equipment || "langhantel";
    const deep = o.variant === "deep";
    const A = P(STAND, { hx: 49, tr: 4, nA: [52, AY], fA: [50.5, AY], nU: -1, nL: -1, fU: -2, fL: -2 });
    const B = deep
      ? P(A, { hx: 38, hy: 69.6, tr: 56, nU: -4, nL: -4, fU: -5, fL: -5 })
      : P(A, { hx: 37.5, hy: 57, tr: 72, nU: -10, nL: -10, fU: -11, fL: -11 });
    const props = [];
    if (eq === "kabel") { // Pull-Through: Seil zwischen den Beinen von hinten
      Object.assign(A, { nU: 8, nL: 12, fU: 7, fL: 11 });
      Object.assign(B, { hx: 39, hy: 59, tr: 66, nU: -26, nL: -26, fU: -27, fL: -27 });
      props.push(tower(14, "tief"), { k: "cable", from: pulleyPos(14, "tief"), to: mid, handle: "Seil" });
    } else if (eq === "koerper") {
      Object.assign(A, { nWr: [8, -7], fWr: [7.5, -7] }); Object.assign(B, { nWr: [8, -7], fWr: [7.5, -7] });
    } else props.push(...held(eq));
    return { label: deep ? "Kreuzheben" : "Hüftbeuge", frame: FR_STAND, frames: [A, B], props, emph: ["torso"],
      muscles: ["hams", "glutes", "lowerback"], trace: { at: (J) => J.S, off: -6 } };
  },

  /** Ausfallschritt (vorwärts mit Schritt, oder variant "back" rückwärts) */
  lunge(o) {
    const eq = o.equipment || "koerper";
    const back = o.variant === "back";
    const arms = eq === "koerper" ? { nWr: [5.5, -19], fWr: [5, -19], nEb: 1, fEb: 1 } : { nU: 0, nL: 0, fU: -1, fL: -1 };
    let A, M, B;
    if (back) {
      A = P(STAND, arms, { hx: 54, nA: [55.5, AY], fA: [54, AY] });
      M = P(A, { hx: 52, hy: HY + 2, fA: [44, 82], fF: 70 });
      B = P(A, { hx: 46, hy: 70.5, tr: 6, nA: [55.5, AY], fA: [24, 89.6], fF: 30 });
    } else {
      A = P(STAND, arms, { hx: 42, nA: [43.5, AY], fA: [42, AY] });
      M = P(A, { hx: 45, hy: HY + 1.5, nA: [54, 80] });
      B = P(A, { hx: 47, hy: 70.5, tr: 6, nA: [62.5, AY], fA: [26, 89.6], fF: 30 });
    }
    return { label: "Ausfallschritt", frame: FR_STAND, frames: [A, M, B], props: held(eq), emph: ["legs"],
      timing: T(0.3, 1.0, 0.35, 1.0), muscles: ["quads", "glutes"], trace: { at: (J) => J.H, off: 7 } };
  },

  /** Split Squat / Halbkniestand (variant "kneel": Hüftbeuger-Dehnung) */
  splitsquat(o) {
    const eq = o.equipment || "koerper";
    const arms = eq === "koerper" ? { nWr: [5.5, -19], fWr: [5, -19], nEb: 1, fEb: 1 } : { nU: 0, nL: 0, fU: -1, fL: -1 };
    const base = P(STAND, arms, { nA: [62, AY], fA: [28, 89.6], fF: 30 });
    if (o.variant === "kneel") {
      const A = P(base, { hx: 42, hy: 67, tr: 0, fA: [22, 89.8], fF: 0 });
      const B = P(A, { hx: 46.5, hy: 68.5, tr: -6 });
      return { label: "Halbkniestand", frame: FR_STAND, frames: [A, B], phases: ["Hüfte vor", "zurück"], timing: T(0.6, 1.4, 0.8, 1.4),
        props: [{ k: "mat", x: 14, w: 60 }], muscles: ["quads"] };
    }
    const A = P(base, { hx: 45, hy: 57.5, tr: 2 });
    const B = P(A, { hx: 45.5, hy: 71 });
    return { label: "Split Squat", frame: FR_STAND, frames: [A, B], props: held(eq), emph: ["legs"],
      muscles: ["quads", "glutes"], trace: { at: (J) => J.H, off: 7 } };
  },

  /** Hip Thrust (Bank) bzw. Glute Bridge (variant "floor"; uni = einbeinig; "tilt" = Beckenkippen) */
  hipthrust(o) {
    const eq = o.equipment || "koerper";
    const floor = o.variant === "floor" || o.variant === "tilt" || eq === "koerper" && o.variant !== "bench";
    let A, B;
    const props = [];
    if (floor) {
      A = { hx: 52, hy: 87, St: [30, 87], nk: 0, nA: [67, AY], fA: [65.5, AY], nWr: [2, -20], fWr: [2, -20], nEb: 1, fEb: 1 };
      B = o.variant === "tilt" ? P(A, { hy: 85.6, St: [30, 87.6], nk: 2 }) : P(A, { hx: 54, hy: 75, St: [33, 86.6], nk: 24 });
      props.push({ k: "mat", x: 10, w: 72 });
    } else {
      props.push({ k: "bench", x: 6, y: 74.5, w: 24 });
      A = { hx: 47, hy: 84, St: [29, 68], nk: 18, nA: [68, AY], fA: [66.5, AY], nWr: [7.5, -20.5], fWr: [7, -20.5], nEb: 1, fEb: 1 };
      B = P(A, { hx: 52, hy: 66.5, St: [30, 67.5], nk: 30 });
      if (eq === "langhantel") props.push({ k: "barbell", at: (J) => add(J.H, J.fwd, 7.5) });
      if (eq === "kurzhantel") props.push({ k: "dumbbell", at: (J) => add(J.H, J.fwd, 6.4), a: (J) => 180 - J.tr + 90 });
    }
    if (o.uni) { delete A.nA; delete B.nA; Object.assign(A, { nT: 118, nS: 116 }); Object.assign(B, { nT: 80, nS: 80 }); }
    return { label: floor ? "Beckenheben" : "Hip Thrust", frame: FR_FLOOR, frames: [A, B], props,
      muscles: ["glutes", "hams"], pelvic: o.variant === "tilt", trace: { at: (J) => J.H, off: -7 } };
  },

  /** Horizontales Drücken: Bankdrücken, Liegestütz (variant knee|wall|table), Brustpresse, Kabel */
  pushH(o) {
    const eq = o.equipment || "koerper";
    const v = o.variant;
    if (eq === "koerper" || v === "wall" || v === "table" || v === "knee") {
      if (v === "wall" || v === "table") {
        const wall = v === "wall";
        const ank = [wall ? 30 : 22, AY];
        const handB = wall ? [78, 36] : [80, 63];
        const shB = wall ? [56, 37.5] : [61, 50];
        const shA = wall ? [63, 41] : [67.5, 58];
        const A = P(bodyLine(ank, shA), { nA: ank, fA: [ank[0] - 1.5, AY], nW: handB, fW: [handB[0] - 0.6, handB[1] + 0.5], nEb: 1, fEb: 1, nk: -8 });
        const B = P(bodyLine(ank, shB), { nA: ank, fA: [ank[0] - 1.5, AY], nW: handB, fW: [handB[0] - 0.6, handB[1] + 0.5], nk: -8 });
        const props = wall ? [{ k: "wall", x: 80 }] : [{ k: "pad", x: 88, y: 64.6, w: 30, h: 3.2, r: 1.2 },
          { k: "frame", d: "M78 66V94M98 66V94", sw: 2 }];
        return { label: wall ? "Liegestütz an der Wand" : "Liegestütz erhöht", frame: FR_STAND, frames: [A, B], props,
          phases: ["wegdrücken", "zurück"],
          muscles: ["chest", "triceps"], trace: { at: (J) => J.S, off: -7 } };
      }
      const knee = v === "knee";
      const ank = knee ? [36, 88.6] : [14, 88.6];
      const B0 = bodyLine(ank, [66, 67]);
      const A0 = bodyLine(ank, [70.5, 81]);
      const fix = (b) => { // Kniestütz: Oberschenkel zielt aufs Knie am Boden
        if (!knee) return { nA: ank, fA: [ank[0] - 1, ank[1] + 0.5], nF: 36, fF: 36 };
        const kp = [36, 90];
        const a = Math.atan2(kp[0] - b.hx, kp[1] - b.hy) * 57.2958;
        const len = Math.hypot(kp[0] - b.hx, kp[1] - b.hy) / SEG.thigh;
        return { nT: a, fT: a, nTl: len, fTl: len, nS: -125, fS: -125, nF: 60, fF: 60 };
      };
      const A = P(A0, fix(A0), { nW: [67, 91.4], fW: [66.4, 91.6], nEb: 1, fEb: 1, nk: -10 });
      const B = P(B0, fix(B0), { nW: [67, 91.4], fW: [66.4, 91.6], nEb: 1, fEb: 1, nk: -10 });
      return { label: knee ? "Liegestütz auf den Knien" : "Liegestütz", frame: FR_FLOOR, frames: [A, B], phases: ["hochdrücken", "senken"],
        props: [{ k: "mat", x: 8, w: 76 }], muscles: ["chest", "triceps", "shoulders"], trace: { at: (J) => J.S, off: -7 } };
    }
    if (eq === "maschine" || (eq === "kabel" && v !== "stand")) {
      // Sitzend: Brustpresse an der Maschine
      const base = { hx: 46, hy: 64.5, tr: -6, nA: [64, AY], fA: [62.5, AY], nk: 4 };
      const A = P(base, { nW: [54, 47.5], fW: [53.4, 47.9] });
      const B = P(base, { nW: [68.8, 47.5], fW: [68.3, 47.8] });
      const props = [...machineSeat(46, 69, 38.8, 47, -6),
        { k: "frame", d: "M84 94V16H70", sw: 2.2 }, { k: "grip", at: g("n"), pivot: [70, 16] }];
      return { label: "Brustpresse", frame: FR_STAND, frames: [A, B], props, muscles: ["chest", "triceps"],
        trace: { at: g("n"), off: -6 } };
    }
    if (eq === "kabel") { // stehend, Türme hinten
      const base = P(STAND, { hx: 46, tr: 10, nA: [58, AY], fA: [36, AY], fF: 70 });
      const A = P(base, { nWr: [8, -4], fWr: [7.5, -4] });
      const B = P(base, { nWr: [25, -3], fWr: [24.5, -3] });
      const py = pulleyPos(14, H(o, "mittel"));
      return { label: "Brustpresse am Kabel", frame: FR_STAND, frames: [A, B],
        props: [tower(14, H(o, "mittel")), { k: "cable", from: py, to: g("f"), handle: HD(o, "Einzelgriff") },
          { k: "cable", from: py, to: g("n"), handle: HD(o, "Einzelgriff") }],
        muscles: ["chest", "triceps"], trace: { at: g("n"), off: -6 } };
    }
    // Bankdrücken (Lang-/Kurzhantel), Schrägbank mit variant "incline"
    const incline = v === "incline";
    const base = incline
      ? { hx: 56, hy: 70, tr: -60, nA: [74, AY], fA: [72.5, AY], nk: 14 }
      : { hx: 58, hy: 67.6, tr: -90, nA: [76, AY], fA: [74.5, AY], nk: 4 };
    const props = incline
      ? [{ k: "bench", x: 50, y: 74.5, w: 14, incline: { a: 30, len: 30 } }]
      : [{ k: "bench", x: 14, y: 74.5, w: 50 }];
    let A, B;
    if (incline) {
      A = P(base, { nU: 76, nUl: 0.6, nW: [45.6, 46], fU: 76, fUl: 0.6, fW: [45.2, 46.4] });
      B = P(base, { nU: 150, nUl: 1, nW: [52, 27], fU: 150, fUl: 1, fW: [51.6, 27.4] });
    } else {
      A = P(base, { nU: 70, nUl: 0.55, nW: [43, 57.5], fU: 70, fUl: 0.55, fW: [42.6, 58] });
      B = P(base, { nU: 178, nUl: 1, nW: [37.5, 43.6], fU: 178, fUl: 1, fW: [37.1, 44] });
    }
    props.push(...held(eq === "kurzhantel" ? "kurzhantel" : eq === "sz" ? "sz" : "langhantel"));
    return { label: "Bankdrücken", frame: FR_FLOOR, frames: [A, B], props, phases: ["hochdrücken", "senken"], muscles: ["chest", "triceps", "shoulders"],
      trace: { at: g("n"), off: 7 } };
  },

  /** Dips am Barren */
  dip(o) {
    // Barren: Holm auf Hüfthöhe, Füße deutlich frei über dem Boden
    const A = { hx: 48.5, hy: 45, tr: 8, nW: [52, 49.6], fW: [51.5, 50], nEb: -1, fEb: -1, nT: 24, nS: -72, fT: 18, fS: -78, nk: 0 };
    const B = P(A, { hx: 46, hy: 57, tr: 18 });
    return { label: "Dips", frame: FR_STAND, frames: [A, B],
      props: [{ k: "frame", d: "M39 50.2H71M42 51V94M68 51V94M37 93.4H46M64 93.4H73", sw: 2.4 },
        { k: "frame", d: "M35 52.2H67", sw: 2.4, cls: "nga-frame nga-far-env", layer: "back" }],
      muscles: ["triceps", "chest"],
      trace: { at: (J) => J.S, off: -7 } };
  },

  /** Vertikales Drücken: Schulterdrücken (sitzend/stehend), Maschine, Pike */
  pushV(o) {
    const eq = o.equipment || "kurzhantel";
    if (o.variant === "pike") {
      const wr = [66, 91.4], an = [26, 89];
      const A = { hx: 41, hy: 50, St: [61, 65], nW: wr, fW: [65.4, 91.6], nEb: 1, fEb: 1, nA: an, fA: [25, 89.4], nF: 40, fF: 40, nk: 10 };
      const B = P(A, { hx: 42, hy: 53, St: [59, 74.5], nk: 22 });
      return { label: "Pike-Liegestütz", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 14, w: 64 }],
        muscles: ["shoulders", "triceps"], trace: { at: (J) => J.Hd, off: 8 } };
    }
    const standing = eq === "langhantel" || o.variant === "stand";
    const base = standing ? P(STAND, { hx: 48 }) : { hx: 46, hy: 64.5, tr: 0, nA: [64, AY], fA: [62.5, AY] };
    const A = P(base, { nU: 98, nUl: 0.55, nWr: [5.5, 7.5], fU: 98, fUl: 0.55, fWr: [5, 7.5] });
    const B = P(base, { nU: 178, nUl: 1, nWr: [1.6, 24.2], fU: 178, fUl: 1, fWr: [1.2, 24.2] });
    const props = standing ? [] : machineSeat(46, 69, 38.8, 47, 0);
    if (eq === "maschine") props.push({ k: "frame", d: "M30 94V10H40", sw: 2.2 }, { k: "grip", at: g("n"), pivot: [40, 10] });
    else props.push(...held(eq));
    return { label: "Schulterdrücken", frame: FR_STAND, frames: [A, B], props, muscles: ["shoulders", "triceps"],
      trace: { at: g("n"), off: 7 } };
  },

  /** Horizontales Ziehen: Rudern (vorgebeugt, einarmig, Kabel sitzend, Maschine, Band) */
  pullH(o) {
    const eq = o.equipment || "langhantel";
    if (eq === "kabel" || eq === "band" && o.variant === "seated") {
      const base = { hx: 34, hy: 77, nA: [69, 79.5], fA: [68, 80], nF: 80, fF: 80 };
      const A = P(base, { tr: 30, nW: [66.5, 64], fW: [66, 64.4] });
      const B = P(base, { tr: -10, nW: [46.5, 66], fW: [46, 66.4] });
      if (o.uni) { A.fW = [52, 70]; B.fW = [52, 70]; }
      const py = [84.6, 70];
      const props = [{ k: "pad", x: 34, y: 82.6, w: 18, h: 3.4 }, { k: "frame", d: "M28 84V94M40 84V94", sw: 2 },
        { k: "pad", x: 73, y: 79, w: 3.4, h: 13, r: 1.4 }];
      if (eq === "kabel") props.push(tower(88, py[1], -1), { k: "cable", from: py, to: o.uni ? g("n") : mid, handle: HD(o, o.uni ? "Einzelgriff" : "V-Griff") });
      else props.push({ k: "band", from: [72, 80], to: mid });
      return { label: "Rudern sitzend", frame: FR_STAND, frames: [A, B], props, muscles: ["back", "biceps"],
        trace: { at: g("n"), off: 6 } };
    }
    if (eq === "maschine") {
      const base = { hx: 40, hy: 64.5, tr: 4, nA: [58, AY], fA: [56.5, AY] };
      const A = P(base, { nW: [66, 46], fW: [65.5, 46.4] });
      const B = P(base, { nW: [52, 49], fW: [51.5, 49.4] });
      const props = [{ k: "pad", x: 40, y: 69, w: 16, h: 3.4 }, { k: "frame", d: "M40 71V94", sw: 2.2 },
        { k: "pad", x: 53.4, y: 48, w: 3.6, h: 16, a: 4 }, { k: "frame", d: "M58 50L62 94M80 94V30", sw: 2.2 },
        { k: "grip", at: g("n"), pivot: [80, 30] }];
      return { label: "Rudern an der Maschine", frame: FR_STAND, frames: [A, B], props, muscles: ["back", "biceps"],
        trace: { at: g("n"), off: 6 } };
    }
    if (eq === "band") {
      const base = P(STAND, { hx: 44, tr: -2, nA: [46, AY], fA: [44.5, AY] });
      const A = P(base, { nW: [67, 46], fW: [66.5, 46.4] });
      const B = P(base, { nW: [52, 52], fW: [51.5, 52.4] });
      return { label: "Rudern mit Band", frame: FR_STAND, frames: [A, B],
        props: [{ k: "frame", d: "M90 8V94", sw: 2.4 }, { k: "band", from: [89, 47], to: mid, sag: 0.6 }],
        muscles: ["back", "biceps"], trace: { at: g("n"), off: 6 } };
    }
    if (o.uni || o.variant === "support") { // einarmig, Hand auf Bank gestützt
      const base = { hx: 38, hy: 57.5, tr: 72, nA: [48, AY], fA: [27, AY], fF: 80, fW: [69, 70.5], fEb: 1, nk: -6 };
      const A = P(base, { nU: 0, nL: 0 });
      const B = P(base, { nU: -78, nL: -6 });
      return { label: "Einarmiges Rudern", frame: FR_STAND, frames: [A, B],
        props: [{ k: "bench", x: 60, y: 74.5, w: 30 }, ...held(eq === "langhantel" ? "kurzhantel" : eq, { uni: true })],
        muscles: ["back", "biceps"], trace: { at: g("n"), off: -6 } };
    }
    const base = { hx: 40, hy: 58, tr: 56, nA: [51, AY], fA: [49.5, AY], nk: -12 };
    const A = P(base, { nU: 0, nL: 0, fU: -1, fL: -1 });
    const B = P(base, { nU: -70, nL: -4, fU: -71, fL: -5 });
    return { label: "Vorgebeugtes Rudern", frame: FR_STAND, frames: [A, B], props: held(eq), muscles: ["back", "biceps"],
      trace: { at: g("n"), off: -6 } };
  },

  /** Vertikales Ziehen: Klimmzug (stange) bzw. Latzug (kabel/maschine) */
  pullV(o) {
    const eq = o.equipment || "kabel";
    if (eq === "stange" || eq === "koerper") {
      const bar = [52, 11];
      // hängt frei: Knie gebeugt, Füße nach hinten – deutlicher Abstand zum Boden
      const A = { hx: 51, hy: 58.2, tr: 2, nW: [52, 13.2], fW: [51.6, 13.4], nT: 14, nS: -76, fT: 10, fS: -82, nk: -6 };
      const B = P(A, { hy: 39, nk: -14, nEb: 1, fEb: 1 });
      return { label: "Klimmzug", frame: [0, -2, 100, 100], frames: [A, B], phases: ["hochziehen", "runter"],
        props: [{ k: "pullbar", x: bar[0], y: bar[1] }], muscles: ["back", "biceps"], trace: { at: (J) => J.S, off: -7 } };
    }
    const base = { hx: 48, hy: 66.5, nA: [66, AY], fA: [64.5, AY], nk: -6 };
    const A = P(base, { tr: 0, nW: [52.5, 19], fW: [52.1, 19.4] });
    const B = P(base, { tr: -20, nW: [49.5, 45.5], fW: [49, 45.9] });
    const handle = HD(o, "Lat-Stange");
    const props = [{ k: "pad", x: 48, y: 71, w: 17, h: 3.4 }, { k: "frame", d: "M48 73V94M30 94V6H54", sw: 2.2 },
      { k: "pad", x: 64.5, y: 58.4, w: 9, h: 3.6, r: 1.8 }, { k: "frame", d: "M64.5 60.4V64", sw: 1.6 },
      { k: "frame", d: "M58 94V64H64", sw: 2 },
      { k: "cable", from: [52, 8.6], to: mid, handle, barA: 0 }];
    props.push({ k: "pad", x: 52, y: 7.6, w: 4.2, h: 4.2, r: 2.1, cls: "nga-pulley" });
    return { label: "Latzug", frame: FR_STAND, frames: [A, B], props, muscles: ["back", "biceps"],
      trace: { at: g("n"), off: 7 } };
  },

  /** Beinheben: hängend (stange) oder liegend */
  legRaise(o) {
    if (o.equipment === "stange" || o.variant === "hang") {
      const A = { hx: 51, hy: 58.2, tr: 2, nW: [52, 13.2], fW: [51.6, 13.4], nT: 4, nS: 2, fT: 2, fS: 0, nk: -6 };
      const B = P(A, { hx: 49.5, tr: -6, nT: 92, nS: 46, fT: 90, fS: 44 });
      return { label: "Hängendes Beinheben", frame: [0, -2, 100, 100], frames: [A, B],
        props: [{ k: "pullbar", x: 52, y: 11 }], muscles: ["abs"], trace: { at: (J) => J.n.K, off: -7 } };
    }
    const A = { hx: 56, hy: 87, tr: -90, nk: 0, nT: 92, nS: 92, fT: 92, fS: 92, nF: 60, fF: 60, nU: -84, nL: -84, fU: -84, fL: -84 };
    const B = P(A, { nT: 178, nS: 150, fT: 178, fS: 150 });
    return { label: "Beinheben liegend", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 10, w: 80 }],
      muscles: ["abs"], trace: { at: (J) => J.n.A, off: -7 } };
  },

  /** Bizepscurl (Kurzhantel, Hammer, Lang-/SZ-Stange, Kabel, Band, hinter dem Körper, Unterarm) */
  curl(o) {
    const eq = o.equipment || "kurzhantel";
    const v = o.variant;
    if (v === "wrist") { // Unterarmcurl, Unterarme auf den Oberschenkeln
      const base = { hx: 42, hy: 66, tr: 18, nA: [61, AY], fA: [59.5, AY], nW: [62.5, 64.8], fW: [62, 65.2], nEb: -1, fEb: -1 };
      const A = P(base, { nH: 40, fH: 40 }), B = P(base, { nH: -60, fH: -60 });
      return { label: "Unterarmcurl", frame: FR_STAND, frames: [A, B],
        props: [...machineSeat(42, 70.5, null), ...(isCable(eq) ? [tower(84, "tief", -1), { k: "cable", from: pulleyPos(84, "tief", -1), to: mid, handle: "Stange" }] : held(eq === "kabel" ? "kurzhantel" : eq))],
        muscles: ["forearms"], trace: { at: g("n"), off: 4 } };
    }
    const seated = !!o.seated;
    const base = seated ? { hx: 42, hy: 65.5, tr: 0, nA: [60, AY], fA: [58.5, AY] } : P(STAND, { hx: 47 });
    let A = P(base, { nU: 4, nL: 4, fU: 3, fL: 3 });
    let B = P(base, { nU: 18, nL: 156, fU: 17, fL: 155 });
    const props = seated ? [{ k: "chair", x: 40, y: 72 }] : [];
    if (v === "bayes") { // hinter dem Körper, Kabel von hinten
      Object.assign(base, { nA: [58, AY], fA: [38, AY], fF: 70 });
      A = P(base, { tr: 6, nU: -28, nL: -28, fU: -6, fL: -6 });
      B = P(base, { tr: 6, nU: -28, nL: 112, fU: -6, fL: -6 });
      props.push(tower(14, "tief"), { k: "cable", from: pulleyPos(14, "tief"), to: g("n"), handle: "Einzelgriff" });
    } else if (isCable(eq)) {
      props.push(tower(84, "tief", -1), { k: "cable", from: pulleyPos(84, "tief", -1), to: mid, handle: HD(o, "Stange") });
    } else if (eq === "band") {
      props.push({ k: "band", from: [52, GROUND - 0.6], to: g("n"), sag: 0 }, { k: "band", from: [50, GROUND - 0.6], to: g("f"), sag: 0, layer: "farProp" });
    } else if (v === "hammer" && eq === "kurzhantel") {
      props.push(db("f", (J) => J.f.aL + 90), db("n", (J) => J.n.aL + 90));
    } else props.push(...held(eq, { uni: o.uni }));
    if (o.uni) { A.fU = B.fU = 2; A.fL = B.fL = 2; }
    return { label: "Bizepscurl", frame: FR_STAND, frames: [A, B], props,
      muscles: v === "hammer" ? ["biceps", "forearms"] : ["biceps"], trace: { at: g("n"), off: 6 } };
  },

  /** Trizeps: Pushdown am Kabel (Standard) oder Überkopf (variant "overhead") */
  triExt(o) {
    const eq = o.equipment || "kabel";
    if (o.variant === "overhead" || eq !== "kabel") {
      if (eq === "kabel") { // vom Turm weg gedreht, Seil hinter dem Kopf
        const base = P(STAND, { hx: 50, tr: 24, nA: [64, AY], fA: [40, AY], fF: 70, nk: -16 });
        const A = P(base, { nU: 154, nL: 296, fU: 153, fL: 295 });
        const B = P(base, { nU: 154, nL: 160, fU: 153, fL: 159 });
        const py = pulleyPos(14, H(o, "mittel"));
        return { label: "Trizepsstrecken über Kopf", frame: FR_STAND, frames: [A, B], phases: ["strecken", "beugen"],
          props: [tower(14, H(o, "mittel")), { k: "cable", from: py, to: mid, handle: HD(o, "Seil") }],
          muscles: ["triceps"], trace: { at: g("n"), off: 6 } };
      }
      // sitzend mit Kurzhantel (French Press)
      const base = { hx: 46, hy: 64.5, tr: 0, nA: [64, AY], fA: [62.5, AY] };
      const A = P(base, { nU: 176, nL: 322, fU: 175, fL: 321 });
      const B = P(base, { nU: 176, nL: 178, fU: 175, fL: 177 });
      return { label: "Trizepsstrecken über Kopf", frame: FR_STAND, frames: [A, B], phases: ["strecken", "beugen"],
        props: [...machineSeat(46, 69, 38.8, 47, 0), { k: "dumbbell", at: mid, a: (J) => J.n.aL + 90 }],
        muscles: ["triceps"], trace: { at: g("n"), off: -6 } };
    }
    const base = P(STAND, { hx: 46, tr: 12, nA: [49, AY], fA: [47.5, AY], nk: 4 });
    const A = P(base, { nU: 8, nL: 140, fU: 7, fL: 139 });
    const B = P(base, { nU: 4, nL: 2, fU: 3, fL: 1 });
    const py = pulleyPos(84, H(o, "hoch"), -1);
    return { label: "Trizepsdrücken", frame: FR_STAND, frames: [A, B],
      props: [tower(84, H(o, "hoch"), -1), { k: "cable", from: py, to: mid, handle: HD(o, "Seil") }],
      muscles: ["triceps"], trace: { at: g("n"), off: 6 } };
  },

  /** Seitheben (Frontansicht); variant "circle" = Armkreisen */
  latRaise(o) {
    const eq = o.equipment || "kurzhantel";
    const top = o.variant === "circle" ? 168 : 90;
    const A = P(FSTAND, { lU: 8, lL: 8, rU: 8, rL: 8 });
    const B = P(FSTAND, { lU: top, lL: top - 8, rU: top, rL: top - 8 });
    const props = [];
    if (isCable(eq)) { // einarmig, Kabel kreuzt vor dem Körper
      A.lU = B.lU = 14; A.lL = B.lL = 30;
      props.push(tower(12, "tief", 1), { k: "cable", from: pulleyPos(12, "tief", 1), to: g("r"), handle: "Einzelgriff" });
    } else if (eq === "band") {
      props.push({ k: "band", from: [47, GROUND - 0.6], to: g("l"), sag: 0 }, { k: "band", from: [53, GROUND - 0.6], to: g("r"), sag: 0 });
    } else if (eq === "kurzhantel") props.push(db("l"), db("r"));
    return { label: o.variant === "circle" ? "Armkreisen" : "Seitheben", view: "front", frame: FR_STAND, frames: [A, B], props,
      muscles: ["shoulders"], trace: { at: g("r"), off: -6 } };
  },

  /** Frontheben (Seitenansicht) */
  frontRaise(o) {
    const eq = o.equipment || "kurzhantel";
    const A = P(STAND, { hx: 47, nU: 4, nL: 4, fU: 3, fL: 3 });
    const B = P(A, { nU: 90, nL: 92, fU: 89, fL: 91 });
    const props = [];
    if (isCable(eq)) props.push(tower(14, "tief"), { k: "cable", from: pulleyPos(14, "tief"), to: mid, handle: HD(o, "Stange") });
    else if (eq === "band") props.push({ k: "band", from: [49, GROUND - 0.6], to: g("n"), sag: 0 });
    else props.push(...held(eq));
    return { label: "Frontheben", frame: FR_STAND, frames: [A, B], props, muscles: ["shoulders"], trace: { at: g("n"), off: -6 } };
  },

  /** Aufrechtes Rudern */
  uprightRow(o) {
    const eq = o.equipment || "kabel";
    const A = P(STAND, { hx: 47, nU: 2, nL: 2, fU: 1, fL: 1 });
    const B = P(A, { nU: 128, nUl: 0.8, nWr: [8.2, -3], fU: 127, fUl: 0.8, fWr: [7.8, -3], nEb: 1, fEb: 1 });
    delete A.nWr;
    const props = isCable(eq) ? [tower(84, "tief", -1), { k: "cable", from: pulleyPos(84, "tief", -1), to: mid, handle: HD(o, "Stange") }] : held(eq);
    return { label: "Aufrechtes Rudern", frame: FR_STAND, frames: [A, B], props, muscles: ["shoulders", "back"],
      trace: { at: g("n"), off: 6 } };
  },

  /** Schulterheben (Shrugs) */
  shrug(o) {
    const eq = o.equipment || "kurzhantel";
    const A = P(STAND, { hx: 48, nU: 0, nL: 0, fU: -1, fL: -1, sh: 0 });
    const B = P(A, { sh: 4.6, nk: -2 });
    const props = isCable(eq) ? [tower(84, "tief", -1), { k: "cable", from: pulleyPos(84, "tief", -1), to: mid, handle: "Stange" }] : held(eq);
    return { label: "Schulterheben", frame: FR_STAND, frames: [A, B], props, muscles: ["back"], timing: T(0.3, 0.7, 0.5, 0.8),
      trace: { at: (J) => J.n.root, off: -7 } };
  },

  /** Fliegende / Crossover (Frontansicht): Kabel hoch|mittel|tief, Maschine (Butterfly), Bank (Draufsicht) */
  fly(o) {
    const eq = o.equipment || "kabel";
    const props = [];
    let A, B;
    if (eq === "maschine") {
      // Butterfly / Pec Deck: aufrecht sitzend, Rückenlehne, Armpolster an Hebeln vom Gestell
      // Oberarm waagerecht auf Schulterhöhe, Unterarm senkrecht am Polster; die Ellbogen schwenken
      // nach vorn zur Mitte (Oberarm zeigt dann zur Kamera → verkürzt).
      A = P(FSEAT, { lU: 88, lUl: 1, lL: 178, rU: 88, rUl: 1, rL: 178 });
      B = P(FSEAT, { lU: 88, lUl: 0.3, lL: 178, rU: 88, rUl: 0.3, rL: 178 });
      props.push(...frontSeatMachine(), ...pecArms("forearm"));
      return { label: "Butterfly", view: "front", frame: FR_STAND, frames: [A, B], props, muscles: ["chest"], emph: ["arms"],
        trace: { at: g("r"), off: 6 } };
    }
    if (eq !== "kabel" || o.variant === "bench") {
      // Fliegende auf der Flachbank (Seitenansicht): Arme öffnen seitlich bis unter Bankhöhe
      // (verkürzt, weil sie zur Seite zeigen) und kommen gestreckt über der Brust zusammen.
      const base = { hx: 58, hy: 67.6, tr: -90, nA: [76, AY], fA: [74.5, AY], nk: 4 };
      A = P(base, { nW: [32.5, 80.5], nUl: 0.55, nLl: 0.55, nEb: 1, fW: [32, 80], fUl: 0.55, fLl: 0.55, fEb: 1 });
      B = P(base, { nW: [37.6, 44.4], nUl: 1, nLl: 1, fW: [37.2, 44.8], fUl: 1, fLl: 1 });
      props.push({ k: "bench", x: 14, y: 74.5, w: 50 });
      if (eq === "kabel") props.push({ k: "pad", x: 33, y: 92, w: 4.4, h: 4.4, r: 2.2, cls: "nga-pulley" },
        { k: "cable", from: [33, 91], to: g("n"), handle: "Einzelgriff" });
      else if (eq === "kurzhantel") props.push(...held("kurzhantel"));
      return { label: "Fliegende auf der Bank", frame: FR_FLOOR, frames: [A, B], props, phases: ["zusammen", "öffnen"],
        muscles: ["chest"], emph: ["arms"], trace: { at: g("n"), off: 7 } };
    }
    const h = H(o, "hoch");
    const pl = pulleyPos(10, h, 1), pr = pulleyPos(90, h, -1);
    const base = P(FSTAND, { lA: [44.6, AY], rA: [55.4, AY] });
    if (h === "tief") {
      A = P(base, { lW: [22, 60], rW: [78, 60] });
      B = P(base, { lW: [47.5, 38], rW: [52.5, 38] });
    } else if (h === "mittel") {
      A = P(base, { lW: [18, 36], rW: [82, 36] });
      B = P(base, { lW: [47.5, 40], rW: [52.5, 40] });
    } else {
      A = P(base, { lW: [22, 18], rW: [78, 18] });
      B = P(base, { lW: [47.5, 54], rW: [52.5, 54] });
    }
    props.push(tower(10, h, 1), tower(90, h, -1),
      { k: "cable", from: pl, to: g("l"), handle: "Einzelgriff" }, { k: "cable", from: pr, to: g("r"), handle: "Einzelgriff" });
    return { label: "Crossover", view: "front", frame: FR_STAND, frames: [A, B], props, muscles: ["chest", "shoulders"],
      trace: { at: g("r"), off: 6 } };
  },

  /** Reverse Fly (Rückansicht) bzw. Band-Pull-Apart (Frontansicht) */
  rearFly(o) {
    const eq = o.equipment || "kabel";
    const back = eq !== "band";
    const seated = eq === "maschine";
    const base = seated ? P(FSEAT) : P(FSTAND);
    const sy = seated ? 45 : 34;
    // Arme gestreckt auf Schulterhöhe: vorn zusammen (zur Kamera hin verkürzt) → weit auseinander
    let A = P(base, { lW: [47, sy + 1], rW: [53, sy + 1] });
    let B = P(base, { lW: [17.5, sy], rW: [82.5, sy] });
    if (seated) {
      A = P(base, { lU: 90, lUl: 0.28, lL: 90, lLl: 0.28, rU: 90, rUl: 0.28, rL: 90, rLl: 0.28 });
      B = P(base, { lU: 90, lUl: 1, lL: 92, lLl: 1, rU: 90, rUl: 1, rL: 92, rLl: 1 });
    }
    const props = [];
    if (eq === "kabel") {
      const pl = pulleyPos(10, "mittel", 1), pr = pulleyPos(90, "mittel", -1);
      props.push(tower(10, "mittel", 1), tower(90, "mittel", -1),
        { k: "cable", from: pr, to: g("l"), handle: "Einzelgriff", layer: "farProp" },
        { k: "cable", from: pl, to: g("r"), handle: "Einzelgriff", layer: "farProp" });
    } else if (eq === "band") props.push({ k: "band", from: g("l"), to: g("r"), sag: 0.5, layer: "front" });
    else if (eq === "maschine") props.push(...frontSeatMachine(true), ...pecArms("hand"));
    else if (eq === "kurzhantel") props.push(db("l"), db("r"));
    return { emph: seated ? ["arms"] : undefined, phases: ["auseinander", "zurück"], label: back ? "Reverse Fly" : "Band-Zug auseinander", view: "front", back, frame: FR_STAND, frames: [A, B], props,
      muscles: ["shoulders", "back"], trace: { at: g("r"), off: -6 } };
  },

  /** Face Pull am Kabel (Seitenansicht) */
  facePull(o) {
    const base = P(STAND, { hx: 44, tr: -4, nA: [48, AY], fA: [38, AY], fF: 70 });
    // Start: Arme lang zur Rolle; Ende: Hände neben dem Kopf, Ellbogen hoch und hinten
    const A = P(base, { nU: 92, nUl: 1, nW: [69, 32.5], fU: 92, fUl: 1, fW: [68.5, 32.9] });
    const B = P(base, { nU: -112, nUl: 0.62, nWr: [3.6, 7.4], fU: -112, fUl: 0.62, fWr: [3.2, 7.4] });
    const py = pulleyPos(86, H(o, "hoch") === "hoch" ? 26 : H(o, "hoch"), -1);
    return { label: "Face Pull", frame: FR_STAND, frames: [A, B],
      props: [tower(86, py[1], -1), { k: "cable", from: py, to: mid, handle: HD(o, "Seil") }],
      muscles: ["shoulders", "back"], trace: { at: g("n"), off: 6 } };
  },

  /** Überzüge mit gestreckten Armen am Kabel (Straight-Arm Pulldown) */
  pullover(o) {
    const base = P(STAND, { hx: 44, tr: 22, nA: [50, AY], fA: [48.5, AY], nk: -10 });
    const A = P(base, { nU: 148, nL: 150, fU: 147, fL: 149 });
    const B = P(base, { nU: 10, nL: 12, fU: 9, fL: 11 });
    const py = pulleyPos(86, "hoch", -1);
    return { label: "Überzüge am Kabel", frame: FR_STAND, frames: [A, B],
      props: [tower(86, "hoch", -1), { k: "cable", from: py, to: mid, handle: HD(o, "Seil") }],
      muscles: ["back"], trace: { at: g("n"), off: 6 } };
  },

  /** Crunch (liegend), Kabel-Crunch kniend (kabel), Bauchmaschine (maschine) */
  crunch(o) {
    const eq = o.equipment || "koerper";
    if (eq === "kabel") {
      const base = { hx: 46, hy: 70, nT: 0, nS: -88, fT: -2, fS: -90, nF: 0, fF: 0, nWr: [5, 8], fWr: [4.6, 8], nEb: -1, fEb: -1 };
      const A = P(base, { tr: 22, nk: 6 });
      const B = P(base, { hx: 43.5, hy: 71, tr: 82, sp: 3.4, nk: 22 });
      const py = pulleyPos(84, "hoch", -1);
      return { label: "Kabel-Crunch kniend", frame: FR_STAND, frames: [A, B], emph: ["torso"],
        props: [{ k: "mat", x: 20, w: 50 }, tower(84, "hoch", -1), { k: "cable", from: py, to: mid, handle: "Seil" }],
        muscles: ["abs"], trace: { at: (J) => J.Hd, off: 8 } };
    }
    if (eq === "maschine") {
      const base = { hx: 44, hy: 64.5, nA: [62, AY], fA: [60.5, AY], nWr: [3, 1.5], fWr: [2.6, 1.5], nEb: 1, fEb: 1 };
      const A = P(base, { tr: -2 }), B = P(base, { tr: 34, sp: 3, nk: 16 });
      return { label: "Bauchmaschine", frame: FR_STAND, frames: [A, B],
        props: [...machineSeat(44, 69, 36.8, 47, -2), { k: "grip", at: g("n") }], muscles: ["abs"],
        trace: { at: (J) => J.S, off: 7 } };
    }
    const base = { hx: 56, hy: 87, nA: [72, AY], fA: [70.5, AY], nWr: [-4.5, 8.5], fWr: [-4.8, 8.5], nEb: 1, fEb: 1 };
    const A = P(base, { tr: -90, nk: 0 });
    const B = P(base, { tr: -58, sp: 2.4, nk: 18 });
    return { label: "Crunch", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 14, w: 72 }], muscles: ["abs"], emph: ["torso"],
      trace: { at: (J) => J.S, off: 7 } };
  },

  /** Unterarmstütz (statisch, ruhiges Atmen); variant "knee" */
  plank(o) {
    const knee = o.variant === "knee";
    const ank = knee ? [36, 88.6] : [13, 88.6];
    const b = bodyLine(knee ? [30, 90] : ank, [64, 78]);
    const legs = knee
      ? { nT: Math.atan2(36 - b.hx, 90 - b.hy) * 57.3, nTl: Math.hypot(36 - b.hx, 90 - b.hy) / SEG.thigh, nS: -128, nF: 60 }
      : { nA: ank, fA: [ank[0] - 1, ank[1] + 0.5], nF: 36, fF: 36 };
    if (knee) Object.assign(legs, { fT: legs.nT, fTl: legs.nTl, fS: -128, fF: 60 });
    const A = P(b, legs, { nU: -2, nL: 90, fU: -2, fL: 88, nk: -8, br: 0 });
    const B = P(A, { hy: b.hy - 0.5, br: 1 });
    return { label: "Unterarmstütz", frame: FR_FLOOR, frames: [A, B], timing: T(0.4, 1.8, 0.4, 2.0),
      props: [{ k: "mat", x: 8, w: 78 }], muscles: ["abs"], breath: true, reducedPose: A };
  },

  /** Seitstütz (Frontansicht, Körper liegt auf der Seite); variant "knee" */
  sidePlank(o) {
    const knee = o.variant === "knee";
    // Kniestütz: Unterschenkel zeigen zur Kamera (stark verkürzt)
    const lA = knee ? [71, 89.6] : [86, 89.6], rA = knee ? [72, 82.5] : [87, 82];
    const B = { hx: 52, hy: 74.5, St: [32.5, 69], lA, rA, lU: 0, lL: 0, lLl: 0.25, rU: 172, rL: 172, nk: 18 };
    if (knee) Object.assign(B, { lSl: 0.3, rSl: 0.3 });
    const A = P(B, { hx: 50.5, hy: 84.5 });
    return { label: "Seitstütz", view: "front", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 12, w: 80 }],
      muscles: ["abs", "glutes"], timing: T(0.4, 1.0, 0.7, 1.0), trace: { at: (J) => J.H, off: 7 } };
  },

  /** Bird-Dog im Vierfüßlerstand */
  birdDog(o) {
    const A = { ...QUAD };
    const B = P(A, { nU: 96, nL: 96, fT: -88, fS: -88, fF: 90, nk: -4 });
    return { label: "Bird-Dog", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 12, w: 74 }],
      muscles: ["glutes", "lowerback"], timing: T(0.4, 1.0, 0.6, 1.0), trace: { at: (J) => J.f.A, off: 6 } };
  },

  /** Dead Bug (Rückenlage) bzw. Heel Slides (variant "heel") */
  deadBug(o) {
    if (o.variant === "heel") {
      const A = { hx: 52, hy: 87, tr: -90, nA: [67, AY], fA: [65.5, AY], nU: -88, nL: -88, fU: -88, fL: -88, nF: 80 };
      const B = P(A, { nA: [88.4, 90.5], nF: 60 });
      return { label: "Heel Slides", frame: FR_FLOOR, frames: [A, B], phases: ["Ferse weg", "zurück"], props: [{ k: "mat", x: 10, w: 82 }],
        muscles: ["abs"], timing: T(0.4, 1.2, 0.5, 1.2), pelvic: true, trace: { at: (J) => J.n.A, off: 6 } };
    }
    const A = { hx: 56, hy: 87, tr: -90, nT: 180, nS: 90, fT: 178, fS: 88, nF: 90, fF: 90, nU: 180, nL: 180, fU: 178, fL: 178 };
    const B = P(A, { nU: 262, nL: 262, fT: 100, fS: 98 });
    return { label: "Dead Bug", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 8, w: 86 }],
      muscles: ["abs"], timing: T(0.4, 1.1, 0.5, 1.1), trace: { at: (J) => J.f.A, off: -6 } };
  },

  /** Kickback für den Po: Kabel stehend (Fußschlaufe) oder Vierfüßler (koerper) */
  kickback(o) {
    const eq = o.equipment || "kabel";
    if (eq === "kabel" || eq === "maschine") {
      const base = P(STAND, { hx: 46, tr: 16, fA: [48, AY], nW: [74, 44], fW: [73.4, 44.6], nEb: -1, fEb: -1 });
      delete base.nA;
      const A = P(base, { nT: 6, nS: 2 });
      const B = P(base, { nT: -40, nS: -30, nF: 70 });
      const py = pulleyPos(80, "tief", -1);
      return { label: "Kickback am Kabel", frame: FR_STAND, frames: [A, B],
        props: [tower(80, "tief", -1), { k: "cable", from: py, to: (J) => J.n.A, handle: "Fußschlaufe", layer: "back" }],
        muscles: ["glutes"], trace: { at: (J) => J.n.A, off: 6 } };
    }
    const A = { ...QUAD, nT: 0, nS: -90 };
    const B = P(A, { nT: -104, nS: -184, nF: 90 });
    return { label: "Kickback im Vierfüßler", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 12, w: 74 }],
      muscles: ["glutes"], trace: { at: (J) => J.n.K, off: 6 } };
  },

  /** Wadenheben (stehend, Maschine, einbeinig mit uni) */
  calfRaise(o) {
    const eq = o.equipment || "koerper";
    // Auf einer Stufe: Fußballen fest auf der Kante, Fersen sinken unter die Stufe und heben sich hoch.
    const stepTop = GROUND - 4, toe = [60, stepTop - 2];
    const ankleFor = (F) => { const d = dirDown(F); return [toe[0] - d[0] * SEG.foot, toe[1] - d[1] * SEG.foot]; };
    const aA = ankleFor(112), aB = ankleFor(56);
    const A = { hx: aA[0], hy: aA[1] - 37, tr: 0, nT: 0, nS: 0, fT: 0, fS: 0, nF: 112, fF: 112, nU: 2, nL: 4, fU: -2, fL: 0 };
    const B = P(A, { hx: aB[0], hy: aB[1] - 37, nF: 56, fF: 56 });
    if (o.uni) { A.fT = B.fT = 6; A.fS = B.fS = -70; A.fF = B.fF = 80; }
    const props = [{ k: "step", x: 53.5, w: 18, h: 4 }];
    if (eq === "maschine") {
      Object.assign(A, { nWr: [4, 4], fWr: [3.6, 4], nEb: -1, fEb: -1 });
      Object.assign(B, { nWr: [4, 4], fWr: [3.6, 4] });
      props.push({ k: "frame", d: "M34 94V12H52", sw: 2.2 }, { k: "pad", at: (J) => add(J.S, J.u, 1.6), w: 12, h: 3.4 });
    } else if (o.wall) {
      Object.assign(A, { nW: [74, 44], fW: [73.6, 44.4], nEb: -1, fEb: -1 });
      Object.assign(B, { nW: [74, 44], fW: [73.6, 44.4] });
      props.push({ k: "wall", x: 76 });
    } else props.push(...held(eq));
    return { label: "Wadenheben", frame: FR_STAND, frames: [A, B], props, muscles: ["calves"],
      timing: T(0.3, 0.7, 0.4, 0.9), trace: { at: (J) => J.n.heel, off: -5 } };
  },

  /** Beinpresse (45°, Maschine) */
  legPress(o = {}) {
    // Horizontal/sitzend: aufrechter Rücken, Platte vor dem Körper, Schlitten auf Hüfthöhe.
    if (o.variant === "horizontal") {
      const hip = [30, 72], rail = dirDown(90);
      const base = { hx: hip[0], hy: hip[1], tr: -22, nk: 26, nW: [37, 78], fW: [36.6, 78.2], nEb: 1, fEb: 1, nF: 90, fF: 90 };
      const A = P(base, { nA: add(hip, rail, 20), fA: add(add(hip, rail, 20), [-0.6, 0.4]) });
      const B = P(base, { nA: add(hip, rail, 35), fA: add(add(hip, rail, 35), [-0.6, 0.4]) });
      return { label: "Beinpresse horizontal", frame: FR_STAND, frames: [A, B],
        props: [{ k: "frame", d: "M22 80H86M28 80V94M80 80V94M20 94H90", sw: 2.2 },
          { k: "pad", x: 30, y: 77.4, w: 18, h: 3.4, a: 0 },
          { k: "pad", at: (J) => add(lerpP(J.H, J.S, 0.6), J.back, 8.4), a: (J) => J.tr, w: 3.6, h: 24 },
          { k: "sled", at: (J) => add(lerpP(J.n.heel, J.n.toe, 0.5), rail, 3.6), a: 0, w: 16 }],
        muscles: ["quads", "glutes"], trace: { at: (J) => J.n.A, off: -7 } };
    }
    const hip = [34, 72], rail = dirDown(135);
    const base = { hx: hip[0], hy: hip[1], tr: -52, nk: 26, nW: [38.5, 77.5], fW: [38, 77.8], nEb: 1, fEb: 1, nF: 92, fF: 92 };
    const A = P(base, { nA: add(hip, rail, 19), fA: add(add(hip, rail, 19), [-0.6, 0.4]) });
    const B = P(base, { nA: add(hip, rail, 35.5), fA: add(add(hip, rail, 35.5), [-0.6, 0.4]) });
    return { label: "Beinpresse", frame: FR_STAND, frames: [A, B],
      props: [{ k: "frame", d: "M44 86L88 42M48 89L91 46M30 82V94M44 86V94M86 46V94M24 93.4H92", sw: 2.2 },
        { k: "pad", x: 33, y: 78.6, w: 16, h: 3.4, a: -14 },
        { k: "pad", at: (J) => add(lerpP(J.H, J.S, 0.6), J.back, 8.4), a: (J) => J.tr, w: 3.6, h: 24 },
        { k: "sled", at: (J) => add(lerpP(J.n.heel, J.n.toe, 0.5), rail, 3.6), a: -45, w: 16 }],
      muscles: ["quads", "glutes"], trace: { at: (J) => J.n.A, off: -7 } };
  },

  /** Beinstrecker (Maschine) */
  legExt() {
    const base = { hx: 44, hy: 62.5, tr: -8, nT: 88, fT: 87, nW: [50, 67], fW: [49.5, 67.4], nEb: -1, fEb: -1, nF: 80, fF: 80 };
    const A = P(base, { nS: 4, fS: 3 });
    const B = P(base, { nS: 84, fS: 83 });
    const roller = (J) => add(lerpP(J.n.K, J.n.A, 0.84), dirDown(J.n.aS + 90), 4.4);
    return { label: "Beinstrecker", frame: FR_STAND, frames: [A, B],
      props: [...machineSeat(44, 67, 36.6, 48, -8), { k: "frame", d: "M70 94V66H64", sw: 2.4 },
        { k: "frame", d: "M50.5 67V71", sw: 2 },
        { k: "roller", pivot: (J) => add(J.n.K, [0, 0]), at: roller, r: 3 }],
      muscles: ["quads"], trace: { at: (J) => J.n.A, off: 6 } };
  },

  /** Beinbeuger (liegend an der Maschine) */
  legCurl() {
    const base = { hx: 48, hy: 66, tr: 90, nk: -20, nT: -90, fT: -91, nW: [80, 72.5], fW: [79.5, 72.8], nEb: 1, fEb: 1, nF: 90, fF: 90 };
    const A = P(base, { nS: -90, fS: -91 });
    const B = P(base, { nS: -196, fS: -197 });
    const roller = (J) => add(lerpP(J.n.K, J.n.A, 0.86), dirDown(J.n.aS - 90), 4.2);
    return { label: "Beinbeuger", frame: [0, 18, 96, 96], frames: [A, B],
      props: [{ k: "bench", x: 32, y: 72.8, w: 50 }, { k: "frame", d: "M26 94V66H29", sw: 2.4 },
        { k: "roller", pivot: (J) => J.n.K, at: roller, r: 3 }],
      muscles: ["hams"], trace: { at: (J) => J.n.A, off: -6 } };
  },

  /** Holzhacker (Frontansicht): von hoch nach tief, variant "up" umgekehrt */
  rotation(o) {
    const up = o.variant === "up";
    const h = up ? "tief" : "hoch";
    const base = { hx: 51, hy: HY + 1, lA: [41, AY], rA: [61, AY], lKb: 1, rKb: 1 };
    const hi = P(base, { tr: -10, nk: -6, lW: [27, 23], rW: [30.5, 22], lEb: 1, rEb: -1 });
    const lo = P(base, { hy: HY + 5, tr: 9, nk: 6, lW: [67, 71], rW: [70.5, 70], lEb: 1, rEb: -1 });
    const A = up ? lo : hi, B = up ? hi : lo;
    if (up) { A.lW = [27, 72]; A.rW = [30.5, 71]; A.tr = -9; B.lW = [67, 22]; B.rW = [70.5, 23]; B.tr = 10; }
    const py = pulleyPos(12, h, 1);
    return { label: "Holzhacker", view: "front", frame: FR_STAND, frames: [A, B],
      props: [tower(12, h, 1), { k: "cable", from: py, to: (J) => lerpP(J.l.G, J.r.G, 0.5), handle: "Einzelgriff" }],
      muscles: ["abs"], trace: { at: (J) => lerpP(J.l.G, J.r.G, 0.5), off: 7 } };
  },

  /** Pallof Press (Seitenansicht; der Turm steht seitlich hinter der Figur) */
  pallof(o) {
    const eq = o.equipment || "kabel";
    let base = P(STAND, { hx: 46, hy: HY + 1.5, nA: [50, AY], fA: [44, AY] });
    const props = [];
    if (o.variant === "kneel") base = P(base, { hy: 67, nA: [62, AY], fA: [22, 89.8], fF: 0 });
    if (o.variant === "seated") { base = { hx: 42, hy: 65.5, tr: 0, nA: [60, AY], fA: [58.5, AY] }; props.push({ k: "chair", x: 40, y: 72 }); }
    const A = P(base, { nWr: [8.6, -6], fWr: [8.2, -6], nEb: -1, fEb: -1 });
    const B = P(base, { nWr: [24.4, -4.5], fWr: [24, -4.5] });
    const anchor = [60, base.hy - 18];
    if (eq === "band") props.push({ k: "frame", d: `M60 8V94`, sw: 2.4, cls: "nga-frame nga-farframe" }, { k: "band", from: anchor, to: mid, sag: 0.4 });
    else props.push(tower(60, anchor[1], -1, { pulley: [60, anchor[1]], far: true }), { k: "cable", from: anchor, to: mid, handle: "Einzelgriff" });
    return { label: "Pallof Press", frame: FR_STAND, frames: [A, B], props, muscles: ["abs"],
      timing: T(0.3, 0.8, 0.7, 0.8), trace: { at: g("n"), off: -6 } };
  },

  /** Farmer's Walk / Tragen: Gehen auf der Stelle mit Gewichten */
  carry(o) {
    const eq = o.equipment || "kurzhantel";
    const base = { hx: 50, hy: HY + 0.8, tr: 0, nU: 0, nL: 0, fU: -1, fL: -1, nk: 0 };
    const A = P(base, { nA: [60, AY], fA: [40, 90.6], fF: 62 });
    const M1 = P(base, { hy: HY - 0.2, nA: [50.5, AY], fA: [49, 84], fF: 80 });
    const B = P(base, { nA: [40, 90.6], nF: 62, fA: [60, AY] });
    const M2 = P(base, { hy: HY - 0.2, nA: [49, 84], nF: 80, fA: [50.5, AY] });
    return { label: "Farmer's Walk", frame: FR_STAND, frames: [A, M1, B, M2, A], loop: "cycle", period: 1.8,
      props: held(eq === "koerper" ? "kurzhantel" : eq), muscles: ["forearms", "back"] };
  },

  /** Marschieren / Gehen / Joggen auf der Stelle (variant "jog"), Einbeinstand ("hold") */
  march(o) {
    const jog = o.variant === "jog";
    const base = { hx: 50, hy: HY, tr: 2, nk: 0, nL: 0, fL: 0 };
    const up = (s, o2) => ({ [s + "T"]: 78, [s + "S"]: -4, [s + "F"]: 84, ...o2 });
    const A = P(base, up("n"), { fA: [49.5, AY], nU: -22, nL: jog ? 60 : -10, fU: 26, fL: jog ? 100 : 40 });
    if (o.variant === "hold") {
      const B = P(A, { br: 1 });
      return { label: "Einbeinstand", frame: FR_STAND, frames: [A, B], timing: T(0.4, 1.6, 0.4, 1.6), breath: true,
        muscles: ["glutes", "calves"] };
    }
    const M = P(base, { nA: [50.5, AY], fA: [49.5, AY], hy: HY + (jog ? 1 : 0), nU: 0, fU: 0, nL: jog ? 80 : 6, fL: jog ? 80 : 6 });
    const B = P(base, up("f"), { nA: [50.5, AY], fU: -22, fL: jog ? 60 : -10, nU: 26, nL: jog ? 100 : 40 });
    return { label: jog ? "Joggen auf der Stelle" : "Marschieren", frame: FR_STAND, frames: [A, M, B, M, A],
      loop: "cycle", period: jog ? 1.0 : 1.8, muscles: ["quads"] };
  },

  /** Katze-Kuh im Vierfüßlerstand */
  catCow() {
    const A = P(QUAD, { sp: -2.4, nk: -30 });
    const B = P(QUAD, { sp: 3.4, nk: 38, hy: QUAD.hy - 1 });
    return { label: "Katze-Kuh", frame: FR_FLOOR, frames: [A, B], props: [{ k: "mat", x: 12, w: 74 }], emph: ["torso"],
      timing: T(0.5, 1.5, 0.6, 1.5), muscles: ["lowerback"] };
  },

  /** Clamshell in Seitlage (Frontansicht, Figur liegt auf der linken Seite) */
  clamshell(o) {
    const base = { hx: 58, hy: 83, tr: -90, nk: -4,
      lT: -88, lTl: 0.55, lA: [74, 90.4], lKb: 1,
      lU: 92, lL: 92, rU: 94, rL: 96, rUl: 0.9 };
    const A = P(base, { rT: 82, rTl: 0.55, rA: [74.5, 83.6] });
    const B = P(base, { rT: 138, rTl: 0.72, rA: [74.5, 83.6] });
    const props = [{ k: "mat", x: 10, w: 76 }];
    if (o.equipment === "band") props.push({ k: "loop", a: (J) => lerpP(J.l.hip, J.l.K, 0.8), b: (J) => lerpP(J.r.hip, J.r.K, 0.8) });
    return { label: "Clamshell", view: "front", frame: FR_FLOOR, frames: [A, B], props, muscles: ["glutes"],
      timing: T(0.3, 0.9, 0.5, 0.9), trace: { at: (J) => J.r.K, off: -6 } };
  },

  /** Seitliches Abspreizen (Frontansicht): Kabel stehend, Adduktion (variant "add"), Maschine sitzend */
  hipAbd(o) {
    const eq = o.equipment || "kabel";
    if (eq === "maschine") {
      const seat = { ...FSEAT, lU: 18, lL: 10, rU: 18, rL: 10, lTl: 0.5, rTl: 0.5 };
      delete seat.lA; delete seat.rA;
      const add2 = o.variant === "add";
      const close = { lT: 6, lS: 2, rT: 6, rS: 2 }, open = { lT: 64, lS: 8, rT: 64, rS: 8 };
      const A = P(seat, add2 ? open : close), B = P(seat, add2 ? close : open);
      return { label: add2 ? "Adduktoren" : "Abduktoren", view: "front", frame: FR_STAND, frames: [A, B],
        phases: add2 ? ["Knie zusammen", "öffnen"] : ["Knie auseinander", "zurück"],
        props: [...frontSeatMachine(),
          { k: "pad", at: (J) => add(J.l.K, [add2 ? 3.4 : -3.8, 0]), w: 3, h: 8, layer: "front" },
          { k: "pad", at: (J) => add(J.r.K, [add2 ? -3.4 : 3.8, 0]), w: 3, h: 8, layer: "front" }],
        muscles: add2 ? ["quads"] : ["glutes"], trace: { at: (J) => J.r.K, off: -5 } };
    }
    const addn = o.variant === "add";
    const base = P(FSTAND, { tr: addn ? 3 : -4, lW: [17, 52], lEb: 1, rU: 10, rL: 14 });
    delete base.lU; delete base.lL;
    let A, B, props;
    if (addn) { // Arbeitsbein links (Turmseite) zieht zur Mitte
      Object.assign(base, { rA: [56, AY] }); delete base.lA;
      A = P(base, { lT: 30, lS: 30 }); B = P(base, { lT: -10, lS: -10 });
      props = [tower(10, "tief", 1), { k: "cable", from: pulleyPos(10, "tief", 1), to: (J) => J.l.A, handle: "Fußschlaufe", layer: "back" }];
    } else { // Arbeitsbein rechts, weg vom Turm
      Object.assign(base, { lA: [44, AY] }); delete base.rA;
      A = P(base, { rT: 2, rS: 2 }); B = P(base, { rT: 34, rS: 32 });
      props = [tower(10, "tief", 1), { k: "cable", from: pulleyPos(10, "tief", 1), to: (J) => J.r.A, handle: "Fußschlaufe", layer: "back" }];
    }
    return { label: addn ? "Adduktion am Kabel" : "Abduktion am Kabel", view: "front", frame: FR_STAND, frames: [A, B], props,
      phases: addn ? ["Bein zur Mitte", "zurück"] : ["Bein zur Seite", "zurück"],
      muscles: addn ? ["quads"] : ["glutes"], trace: { at: (J) => (addn ? J.l.A : J.r.A), off: -6 } };
  },

  /** Becken kreisen / schaukeln im Stand (Frontansicht, Hände an der Hüfte) */
  sway() {
    const base = P(FSTAND, { lA: [44, AY], rA: [56, AY], lWr: [-2.5, -19], rWr: [-2.5, -19], lEb: 1, rEb: 1 });
    delete base.lU; delete base.rU; delete base.lL; delete base.rL;
    const A = P(base, { hx: 46.5, tr: 5 }), B = P(base, { hx: 53.5, tr: -5 });
    return { label: "Hüftkreisen", view: "front", frame: FR_STAND, frames: [A, B], timing: T(0.2, 1.1, 0.2, 1.1), muscles: [] };
  },

  /** Atmung / Beckenboden: variant ruecken | sitzen | seite | stand | vierfuessler | kind */
  breathing(o) {
    const v = o.variant || "ruecken";
    const pelvic = !!o.pelvic;
    let A, frame = FR_FLOOR, props = [{ k: "mat", x: 10, w: 80 }], view = "side";
    if (v === "sitzen") {
      A = { hx: 44, hy: 65.5, tr: 0, nA: [62, AY], fA: [60.5, AY], nWr: [9, -16], fWr: [8.6, -12], nEb: -1, fEb: -1 };
      props = [{ k: "chair", x: 42, y: 72 }]; frame = FR_STAND;
    } else if (v === "stand") {
      A = P(STAND, { nWr: [9, -16], fWr: [8.6, -12] }); props = []; frame = FR_STAND;
    } else if (v === "vierfuessler") {
      A = { ...QUAD };
    } else if (v === "kind") {
      A = { hx: 36, hy: 79, tr: 105, sp: 1.6, nk: 4, nT: 62, fT: 61, nS: -90, fS: -91, nF: 0, fF: 0, nU: 74, nL: 74, fU: 73, fL: 73 };
    } else if (v === "seite") {
      A = { hx: 58, hy: 83, tr: -90, nk: -4, lT: -88, lTl: 0.55, lA: [74, 90.4], rT: 82, rTl: 0.55, rA: [74.5, 83.6],
        lU: 92, lL: 92, rU: 96, rL: 100, rUl: 0.9 };
      view = "front";
    } else { // Rückenlage, Knie angestellt, Hände auf dem Bauch
      A = { hx: 52, hy: 87, tr: -90, nA: [67, AY], fA: [65.5, AY], nU: 84, nL: 104, fU: 86, fL: 100 };
    }
    const In = P(A, { br: 1, pf: 0 }), Out = P(A, { br: 0, pf: 1 });
    if (v === "kind") { In.hy -= 1.2; In.sp = 2.4; }
    return { phases: pelvic ? ["ausatmen & anspannen", "einatmen & lösen"] : ["ausatmen", "einatmen"],
      label: pelvic ? "Beckenboden & Atmung" : "Atmung", view, frame, frames: [In, Out], props,
      timing: T(0.3, 2.6, 0.4, 2.2), breath: true, pelvic, muscles: [], reducedPose: In };
  },
};

/** Vierfüßlerstand (Seitenansicht, Kopf rechts). */
const QUAD = { hx: 40, hy: 70.6, St: [62.5, 66.4], nk: 4,
  nT: 2, nS: -90, fT: 1, fS: -91, nF: 0, fF: 0,
  nW: [63.5, 91.4], fW: [63, 91.6], nEb: 1, fEb: 1 };

/** Frontansicht sitzend (Maschine): Oberschenkel zeigen zur Kamera (verkürzt), Füße am Boden. */
const FSEAT = { hx: 50, hy: 65.5, tr: 0, lT: 14, lTl: 0.32, lS: 3, rT: 14, rTl: 0.32, rS: 3, lF: 62, rF: 62 };

/** Frontansicht: Sitzpolster mit Säule und hohe Rückenlehne (back: von hinten gesehen). */
function frontSeatMachine(back = false) {
  return [
    { k: "frame", d: "M50 72V93.4M38 93.4H62", sw: 2.4 },
    { k: "pad", x: 50, y: 44, w: back ? 14 : 19, h: 44, r: 4 },
    { k: "pad", x: 50, y: 69.6, w: 30, h: 4.2, r: 1.8 },
  ];
}

/** Butterfly-Gestell: Rahmen über dem Sitz, Hebel vom Drehpunkt zu senkrechten Armpolstern. */
function pecArms(at = "forearm") {
  const pl = [40, 17], pr = [60, 17];
  // forearm: senkrechtes Polster am Unterarm (Butterfly); hand: Griff in der Hand (Reverse Butterfly)
  const spot = (J, s) => (at === "forearm" ? lerpP(J[s].E, J[s].W, 0.5) : J[s].G);
  const pad = (s) => (at === "forearm"
    ? { k: "pad", at: (J) => spot(J, s), w: 3.4, h: 12, r: 1.5, layer: "front" }
    : { k: "pad", at: (J) => spot(J, s), w: 3, h: 7, r: 1.4, layer: "front" });
  return [
    { k: "frame", d: "M18 93.4V15H82V93.4M14 93.4H22M78 93.4H86", sw: 2.4 },
    { k: "lever", from: pl, to: (J) => (at === "forearm" ? J.l.W : J.l.G) }, { k: "lever", from: pr, to: (J) => (at === "forearm" ? J.r.W : J.r.G) },
    { k: "pad", x: pl[0], y: pl[1], w: 3, h: 3, r: 1.5, cls: "nga-pivot" }, { k: "pad", x: pr[0], y: pr[1], w: 3, h: 3, r: 1.5, cls: "nga-pivot" },
    pad("l"), pad("r"),
  ];
}

/** Sitz + Rückenpolster einer Maschine/Bank (bx = null → nur Sitz). */
function machineSeat(sx, sy, bx, by, ba = 0) {
  const parts = [{ k: "frame", d: `M${sx} ${sy + 2}V94M${sx - 7} 93.4h14`, sw: 2.2 }, { k: "pad", x: sx, y: sy, w: 16, h: 3.4 }];
  if (bx != null) parts.push({ k: "pad", x: bx, y: by, w: 3.6, h: 26, a: ba });
  return parts;
}

/** Liste aller Musternamen. */
export const PATTERN_NAMES = Object.keys(PATTERNS);

/**
 * Baut die vollständige Definition eines Musters (mit Standardwerten).
 * Unbekannte Muster fallen auf "breathing" (ruhig, ungefährlich) zurück.
 */
export function buildPattern(name, opts = {}) {
  const key = PATTERNS[name] ? name : "breathing";
  const d = PATTERNS[key](opts) || {};
  // Tempo: Arbeitsphase etwas langsamer, kurze Pausen an Start und Ende (gut zum Mitschauen)
  const t = { ...(d.timing || T()) };
  if (t.up < 1.9) { t.up *= 1.25; t.down *= 1.15; }
  t.hold0 = Math.max(t.hold0, 0.45); t.hold1 = Math.max(t.hold1, 0.45);
  return {
    view: "side", frame: FR_STAND, loop: "pingpong", ease: "sine",
    props: [], muscles: [], phases: PHASES[key], ...d, timing: t, name: key,
  };
}

/** Phasen-Beschriftung je Muster: [Start → Ende, zurück]. Muster können eigene setzen. */
export const PHASES = {
  squat: ["runter", "hoch"], hinge: ["Hüfte zurück", "aufrichten"], lunge: ["Schritt & runter", "zurück"],
  splitsquat: ["runter", "hoch"], hipthrust: ["Hüfte hoch", "senken"], pushH: ["drücken", "zurück"],
  dip: ["runter", "hoch"], pushV: ["hochdrücken", "senken"], pullH: ["ziehen", "zurück"], pullV: ["ziehen", "zurück"],
  legRaise: ["Beine hoch", "senken"], curl: ["hoch", "runter"], triExt: ["runterdrücken", "zurück"],
  latRaise: ["seitlich hoch", "senken"], frontRaise: ["nach vorn hoch", "senken"], uprightRow: ["hochziehen", "senken"],
  shrug: ["Schultern hoch", "senken"], fly: ["zusammen", "öffnen"], rearFly: ["auseinander", "zurück"],
  facePull: ["zum Gesicht", "zurück"], pullover: ["runterziehen", "zurück"], crunch: ["einrollen", "ablegen"],
  plank: ["halten", "ruhig atmen"], sidePlank: ["Hüfte hoch", "senken"], birdDog: ["Arm & Bein strecken", "zurück"],
  deadBug: ["strecken", "zurück"], kickback: ["Bein nach hinten", "zurück"], calfRaise: ["Fersen hoch", "senken"],
  legPress: ["wegdrücken", "beugen"], legExt: ["strecken", "beugen"], legCurl: ["beugen", "strecken"],
  rotation: ["diagonal ziehen", "zurück"], pallof: ["wegdrücken", "zurück"], carry: ["gehen"], march: ["marschieren"],
  catCow: ["Katzenbuckel", "Hohlkreuz"], clamshell: ["Knie öffnen", "schließen"], hipAbd: ["Bein zur Seite", "zurück"],
  sway: ["Becken links", "rechts"], breathing: ["ausatmen", "einatmen"],
};
