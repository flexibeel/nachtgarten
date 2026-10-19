/**
 * Nachtgarten – Übungsanimationen: die Figur.
 *
 * Eine freundliche, geschlechtsneutrale Figur aus abgerundeten „Pillen“-Gliedern
 * mit großem runden Kopf und – als kleine Signatur – einem Keimi-Spross obendrauf.
 * Die Figur ist ein Skelett aus Gelenken; eine Pose besteht nur aus Zahlen
 * (Winkel, Positionen, Ziele), damit sich Posen linear interpolieren lassen.
 *
 * Koordinaten: SVG-Einheiten, y wächst nach unten, Boden bei GROUND (94).
 *
 * Winkelkonventionen (Grad, absolut im Bild):
 *  - Glieder (Ober-/Unterschenkel, Ober-/Unterarm): 0 = hängt senkrecht nach unten,
 *    +90 = zeigt nach vorn (+x, Blickrichtung der Seitenansicht), 180 = nach oben,
 *    -90 = nach hinten.
 *  - Rumpf (tr) und Kopf (nk, relativ zum Rumpf): 0 = aufrecht, +90 = nach vorn
 *    gekippt (Bauch zeigt nach unten), -90 = nach hinten (Rückenlage, Kopf links).
 *  - Fuß (F) relativ zum Unterschenkel: 90 = rechtwinklig nach vorn (Standard),
 *    kleiner = Zehen gestreckt (Fersen hoch).
 *  - Hand (H) relativ zum Unterarm: 0 = gerade.
 *
 * Seitenansicht – Pose-Schlüssel (alle optional außer hx/hy):
 *   hx, hy        Hüfte (Becken)
 *   tr            Rumpfwinkel;  St:[x,y]  alternativ Schulterziel (Rumpf zielt dorthin)
 *   sp            Wirbelsäulen-Bogen (+ Katzenbuckel, − Hohlkreuz)
 *   nk            Kopfneigung relativ zum Rumpf
 *   sh            Schultern hochziehen (Einheiten)
 *   br, pf        Atmung 0..1, Beckenboden-Hebung 0..1 (nur wenn das Muster es nutzt)
 *   Beine  n…/f… (n = nah/vorn im Bild, f = fern/hinten):
 *     nT,nS       Oberschenkel-/Unterschenkelwinkel, oder
 *     nA:[x,y]    Knöchelziel (IK, Kniebeuge-Richtung nKb, Standard +1 = Knie nach vorn)
 *     nT + nA     „gepinnt“: Oberschenkel per Winkel, Unterschenkel zielt (verkürzt) aufs Ziel
 *     nF          Fußwinkel relativ
 *   Arme n…/f…:
 *     nU,nL       Ober-/Unterarmwinkel, oder nW:[x,y] Handgelenkziel (IK, nEb Standard −1)
 *     nH          Handwinkel relativ
 *
 * Frontansicht (view:"front") – Figur schaut zur Kamera (oder mit back:true von hinten):
 *   hx, hy, tr (seitliche Neigung, + = nach rechts im Bild), nk, sh
 *   Arme l…/r… (l = links im Bild): lU,lL / rU,rL  gespiegelt: + = nach außen
 *     oder lW/rW:[x,y] Ziel (lEb/rEb gespiegelt, Standard +1 = Ellbogen außen)
 *   Beine l…/r…: lT,lS / rT,rS gespiegelt (+ = nach außen) oder lA/rA Ziele
 */

export const NS = "http://www.w3.org/2000/svg";
export const GROUND = 94;
/** Knöchelhöhe, wenn der Fuß flach am Boden steht. */
export const ANKLE_Y = GROUND - 2.2;

/** Segmentlängen (Einheiten). Kopf bewusst groß – freundlich, gut lesbar im Mini-Format. */
export const SEG = {
  thigh: 19, shin: 18, foot: 6.4, heel: 1.5,
  torso: 22, neck: 3.2, headR: 6.6,
  upper: 13, fore: 12, hand: 2.4,
  shoulderHalf: 8.2, hipHalf: 4.6, // Frontansicht
};
/** Strichbreiten der „Pillen“. */
export const WID = {
  thigh: 7.6, shin: 6.3, foot: 4.2, torso: 13.6, upper: 5.9, fore: 5.1, hand: 5.4,
  torsoFront: 15.5,
};

const D2R = Math.PI / 180;
/** Richtungsvektor für Gliedwinkel (0 = nach unten). */
export const dirDown = (a) => [Math.sin(a * D2R), Math.cos(a * D2R)];
/** Richtungsvektor für Rumpfwinkel (0 = nach oben). */
export const dirUp = (a) => [Math.sin(a * D2R), -Math.cos(a * D2R)];
export const add = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s];
export const lerpP = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
/** Gliedwinkel (0 = unten) der Richtung p→q. */
export const angTo = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]) / D2R;
const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);

/**
 * Zwei-Knochen-IK. Liefert [winkel1, winkel2] (Gliedkonvention).
 * bend +1 dreht das Mittelgelenk in positive Winkelrichtung (bei hängendem Glied: nach vorn).
 */
export function ik2(P, T, a, b, bend = 1) {
  let d = dist(P, T);
  d = Math.min(Math.max(d, Math.abs(a - b) + 1e-3), a + b - 1e-3);
  const base = angTo(P, T);
  const c = (a * a + d * d - b * b) / (2 * a * d);
  const off = Math.acos(Math.max(-1, Math.min(1, c))) / D2R;
  const a1 = base + bend * off;
  const M = add(P, dirDown(a1), a);
  return [a1, angTo(M, T)];
}

/** Löst ein Glied: Winkel, IK oder gepinnt. Gibt {M (Mittelgelenk), E (Ende), a1, a2, l2}. */
function limb(P, ang1, ang2, target, bend, a, b) {
  let a1, a2, l2 = b;
  if (target && ang1 != null) { // gepinnt: erstes Segment per Winkel, zweites zielt aufs Ziel
    a1 = ang1;
    const M = add(P, dirDown(a1), a);
    a2 = angTo(M, target);
    l2 = Math.max(2, Math.min(b * 1.05, dist(M, target)));
    return { M, E: add(M, dirDown(a2), l2), a1, a2, l2 };
  }
  if (target) [a1, a2] = ik2(P, target, a, b, bend);
  else { a1 = ang1 || 0; a2 = ang2 == null ? a1 : ang2; }
  const M = add(P, dirDown(a1), a);
  return { M, E: add(M, dirDown(a2), l2), a1, a2, l2 };
}

/* ------------------------------------------------------------------ Lösen */

/** Löst eine Seitenansicht-Pose in Gelenkpunkte. */
export function solveSide(p) {
  const H = [p.hx, p.hy];
  let tr = p.tr || 0;
  if (p.St) tr = 180 - angTo(H, p.St); // Rumpf zielt auf Schulterziel
  const u = dirUp(tr);
  const fwd = [Math.cos(tr * D2R), Math.sin(tr * D2R)];
  const back = [-fwd[0], -fwd[1]];
  const S = add(H, u, SEG.torso);
  const sp = p.sp || 0;
  const C = add(lerpP(H, S, 0.5), back, sp * 2); // Bezier-Kontrollpunkt
  const hdA = tr + (p.nk || 0) + sp * 1.2;
  const Hd = add(S, dirUp(hdA), SEG.neck + SEG.headR);
  const armRoot = add(S, u, -1.4 + (p.sh || 0));
  const J = { view: "side", H, S, C, Hd, tr, hdA, u, fwd, back, armRoot, br: p.br || 0, pf: p.pf || 0 };
  for (const s of ["n", "f"]) {
    const L = limb(H, p[s + "T"], p[s + "S"], p[s + "A"], p[s + "Kb"] ?? 1,
      SEG.thigh * (p[s + "Tl"] ?? 1), SEG.shin * (p[s + "Sl"] ?? 1));
    const fa = L.a2 + (p[s + "F"] ?? 90);
    const fd = dirDown(fa);
    const legs = { hip: H, K: L.M, A: L.E, aT: L.a1, aS: L.a2, lS: L.l2, aF: fa,
      toe: add(L.E, fd, SEG.foot), heel: add(L.E, fd, -SEG.heel) };
    const wr = p[s + "Wr"]; // Handziel relativ zum Rumpf: [vor, hoch] ab Schulter
    const wT = p[s + "W"] || (wr && add(add(S, fwd, wr[0]), u, wr[1]));
    const R = limb(armRoot, p[s + "U"], p[s + "L"], wT, p[s + "Eb"] ?? -1,
      SEG.upper * (p[s + "Ul"] ?? 1), SEG.fore * (p[s + "Ll"] ?? 1));
    const ha = R.a2 + (p[s + "H"] || 0);
    const arm = { root: armRoot, E: R.M, W: R.E, aU: R.a1, aL: R.a2, lL: R.l2, aH: ha,
      G: add(R.E, dirDown(ha), SEG.hand * 0.9) }; // G = Griffpunkt
    J[s] = { ...legs, ...arm };
  }
  return J;
}

/** Löst eine Frontansicht-Pose. */
export function solveFront(p) {
  const P = [p.hx, p.hy];
  const tr = p.St ? 180 - angTo(P, p.St) : p.tr || 0;
  const u = dirUp(tr);
  const right = [Math.cos(tr * D2R), Math.sin(tr * D2R)];
  const N = add(P, u, SEG.torso);
  const hdA = tr + (p.nk || 0);
  const Hd = add(N, dirUp(hdA), SEG.neck + SEG.headR);
  const sh = add(N, u, -1.6 + (p.sh || 0));
  const J = { view: "front", H: P, S: N, Hd, tr, hdA, u, right };
  for (const s of ["l", "r"]) {
    const m = s === "l" ? -1 : 1; // Spiegelung
    const mir = (v) => (v == null ? v : v * m);
    const root = add(sh, right, m * SEG.shoulderHalf);
    const wr = p[s + "Wr"]; // relativ: [nach außen, hoch] ab Schulter
    const wT = p[s + "W"] || (wr && add(add(root, right, m * wr[0]), u, wr[1]));
    const R = limb(root, mir(p[s + "U"]), mir(p[s + "L"]), wT, m * (p[s + "Eb"] ?? 1),
      SEG.upper * (p[s + "Ul"] ?? 1), SEG.fore * (p[s + "Ll"] ?? 1));
    const hipJ = add(P, right, m * SEG.hipHalf);
    const L = limb(hipJ, mir(p[s + "T"]), mir(p[s + "S"]), p[s + "A"], m * (p[s + "Kb"] ?? 1),
      SEG.thigh * (p[s + "Tl"] ?? 1), SEG.shin * (p[s + "Sl"] ?? 1));
    const fd = dirDown(L.a2 + m * (p[s + "F"] ?? 62));
    J[s] = { root, E: R.M, W: R.E, aU: R.a1, aL: R.a2, lL: R.l2,
      G: add(R.E, dirDown(R.a2), SEG.hand * 0.9),
      hip: hipJ, K: L.M, A: L.E, aT: L.a1, aS: L.a2, lS: L.l2,
      toe: add(L.E, fd, 2.6), heel: L.E };
  }
  return J;
}

export const solve = (p, view) => (view === "front" ? solveFront(p) : solveSide(p));

/* ------------------------------------------------------------- Zeichnen */

/** Kleiner SVG-Element-Helfer. */
export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const f1 = (n) => Math.round(n * 100) / 100;
const setLine = (e, p, q) => {
  e.setAttribute("x1", f1(p[0])); e.setAttribute("y1", f1(p[1]));
  e.setAttribute("x2", f1(q[0])); e.setAttribute("y2", f1(q[1]));
};
const setCirc = (e, p) => { e.setAttribute("cx", f1(p[0])); e.setAttribute("cy", f1(p[1])); };

/** Keimi-Spross (lokale Koordinaten, Kopfmitte = 0,0). */
function sprout(g) {
  const s = el("g", { class: "nga-sprout" }, g);
  el("path", { d: "M-0.6 -6.2 Q-0.5 -8.4 0 -9.6", class: "nga-sprout-stem" }, s);
  el("path", { d: "M0 -9.6 C-0.9 -12.2 -3.5 -12.4 -4.2 -11.2 C-3.4 -9.7 -1.5 -9.2 0 -9.6Z" }, s);
  el("path", { d: "M0 -9.6 C0.7 -11.7 2.8 -12.5 3.6 -11.6 C3.1 -10.2 1.4 -9.4 0 -9.6Z" }, s);
}

/**
 * Muskel-Hinweise: welcher Gliedabschnitt wird zart im Akzent getönt.
 * side: +1 Vorderseite, −1 Rückseite, 0 Mitte. t: Abschnitt entlang des Segments.
 */
const HL_SIDE = {
  chest: [{ seg: "torso", side: 1, t: [0.6, 0.9] }],
  abs: [{ seg: "torso", side: 1, t: [0.12, 0.52] }],
  back: [{ seg: "torso", side: -1, t: [0.42, 0.9] }],
  lowerback: [{ seg: "torso", side: -1, t: [0.08, 0.42] }],
  shoulders: [{ seg: "upper", dot: true }],
  biceps: [{ seg: "upper", side: 1, t: [0.28, 0.82] }],
  triceps: [{ seg: "upper", side: -1, t: [0.28, 0.82] }],
  forearms: [{ seg: "fore", side: 1, t: [0.15, 0.7] }],
  quads: [{ seg: "thigh", side: 1, t: [0.22, 0.86] }],
  hams: [{ seg: "thigh", side: -1, t: [0.25, 0.86] }],
  glutes: [{ seg: "thigh", side: -1, t: [-0.02, 0.24], w: 0.62 }],
  calves: [{ seg: "shin", side: -1, t: [0.12, 0.5] }],
  pelvic: [],
};
const HL_FRONT = {
  chest: [{ seg: "torso", across: 0.74 }],
  back: [{ seg: "torso", across: 0.7 }],
  abs: [{ seg: "torso", side: 0, t: [0.14, 0.5], w: 0.4 }],
  lowerback: [{ seg: "torso", side: 0, t: [0.08, 0.36], w: 0.4 }],
  shoulders: [{ seg: "upper", dot: true }],
  biceps: [{ seg: "upper", side: 0, t: [0.3, 0.82] }],
  triceps: [{ seg: "upper", side: 0, t: [0.3, 0.82] }],
  forearms: [{ seg: "fore", side: 0, t: [0.15, 0.7] }],
  quads: [{ seg: "thigh", side: 0, t: [0.22, 0.86] }],
  hams: [{ seg: "thigh", side: 0, t: [0.22, 0.86] }],
  glutes: [{ seg: "thigh", side: 1, t: [-0.05, 0.22], w: 0.66 }],
  calves: [{ seg: "shin", side: 0, t: [0.12, 0.5] }],
  pelvic: [],
};

/**
 * Erstellt die Figur in den gegebenen Ebenen.
 * layers: {farLeg, farArm, torso, head, nearLeg, nearArm}
 * opts: {view, back, detail, muscles, breath, pelvic, moving, ghost}
 *   moving: Set bewegter Segmente ("n.thigh", "f.fore", "l.upper", "torso", …) → Altrosa-Betonung
 *   ghost:  ganze Figur einfarbig als „Geist“ (Endpose)
 * Gibt {update(J)} zurück.
 */
export function createFigure(layers, opts = {}) {
  const view = opts.view || "side";
  const detail = opts.detail !== false;
  const muscles = (opts.muscles || []).filter((m) => (view === "front" ? HL_FRONT : HL_SIDE)[m]);
  const HL = view === "front" ? HL_FRONT : HL_SIDE;
  const sides = view === "front" ? ["l", "r"] : ["f", "n"];
  const parts = {};
  const hls = []; // {spec, el, side}
  const mv = opts.moving || new Set();
  const M = (key) => (mv.has(key) ? " nga-move" : "");

  for (const s of sides) {
    const far = view === "side" && s === "f";
    const cls = far ? "nga-limb nga-far" : "nga-limb";
    const legG = el("g", { class: cls }, view === "side" ? (far ? layers.farLeg : layers.nearLeg) : layers.farLeg);
    // Rückansicht: Arme hinter dem Rumpf (Hände vor dem Körper sind verdeckt)
    const armG = el("g", { class: cls }, view === "side" ? (far ? layers.farArm : layers.nearArm) : opts.back ? layers.farArm : layers.nearArm);
    const P = (parts[s] = {
      thigh: el("line", { "stroke-width": WID.thigh, class: M(s + ".thigh") }, legG),
      shin: el("line", { "stroke-width": WID.shin, class: M(s + ".shin") }, legG),
      foot: el("line", { "stroke-width": WID.foot, class: M(s + ".foot") }, legG),
      upper: el("line", { "stroke-width": WID.upper, class: M(s + ".upper") }, armG),
      fore: el("line", { "stroke-width": WID.fore, class: M(s + ".fore") }, armG),
      hand: el("circle", { r: WID.hand / 2, class: "nga-hand" + M(s + ".fore") }, armG),
      legG, armG,
    });
    for (const m of muscles) for (const spec of HL[m]) {
      if (spec.seg === "torso") continue;
      const g = spec.seg === "upper" || spec.seg === "fore" ? armG : legG;
      const ref = P[spec.seg];
      const e = spec.dot
        ? el("circle", { r: WID.upper * 0.62, class: far ? "nga-work nga-work-far" : "nga-work" })
        : el("line", { class: far ? "nga-work nga-work-far" : "nga-work",
          "stroke-width": WID[spec.seg] * (spec.w || (spec.side ? 0.5 : 0.56)) });
      g.insertBefore(e, ref.nextSibling);
      hls.push({ spec, el: e, side: s });
    }
  }

  const torsoG = el("g", { class: "nga-limb" }, layers.torso);
  const torso = el(view === "front" ? "line" : "path", { class: M("torso").trim(),
    "stroke-width": view === "front" ? WID.torsoFront : WID.torso, fill: "none" }, torsoG);
  for (const m of muscles) for (const spec of HL[m]) {
    if (spec.seg !== "torso") continue;
    const w = spec.across ? 4.6 : WID.torso * (spec.w || 0.48);
    const e = el(spec.across || view === "front" ? "line" : "path",
      { class: "nga-work", "stroke-width": w, fill: "none" }, torsoG);
    hls.push({ spec, el: e, side: "t" });
  }
  let breathEl = null, pelvicEl = null;
  if (opts.breath) breathEl = el("ellipse", { class: "nga-breath" }, torsoG);
  if (opts.pelvic) pelvicEl = el("ellipse", { class: "nga-pelvic", rx: 2.6, ry: 1.5 }, torsoG);

  if (opts.ghost) for (const k in layers) layers[k].classList.add("nga-ghost");
  const headG = el("g", { class: "nga-head" }, layers.head);
  const cheeks = [];
  el("circle", { r: SEG.headR, cx: 0, cy: 0, class: "nga-skull" }, headG);
  if (detail) {
    const er = opts.pixel ? 1.1 : 0.72, cr = opts.pixel ? 1.3 : 1.25; // im Pixelraster etwas größer
    if (view === "front" && !opts.back) {
      el("circle", { cx: -2.3, cy: -0.4, r: er, class: "nga-eye" }, headG);
      el("circle", { cx: 2.3, cy: -0.4, r: er, class: "nga-eye" }, headG);
      cheeks.push(el("circle", { cx: -3.7, cy: 1.8, r: cr, class: "nga-cheek" }, headG),
        el("circle", { cx: 3.7, cy: 1.8, r: cr, class: "nga-cheek" }, headG));
    } else if (view === "side") {
      el("circle", { cx: 3.1, cy: -0.9, r: er, class: "nga-eye" }, headG);
      el("circle", { cx: 3.4, cy: 2.2, r: cr, class: "nga-cheek" }, headG);
    }
  }
  sprout(headG);

  /* Hilfen für Hinweis-Geometrie */
  const segPts = (J, s, seg) => {
    const L = J[s];
    if (seg === "thigh") return [L.hip, L.K, WID.thigh];
    if (seg === "shin") return [L.K, L.A, WID.shin];
    if (seg === "upper") return [L.root, L.E, WID.upper];
    return [L.E, L.W, WID.fore];
  };
  const bez = (J, t) => {
    const a = J.H, c = J.C, b = J.S, m = 1 - t;
    return [m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]];
  };
  const bezN = (J, t) => { // Normale (nach vorn) der Kurve
    const a = J.H, c = J.C, b = J.S;
    const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l]; // tangent (nach oben) um 90° im Uhrzeigersinn → vorn
  };

  function update(J) {
    for (const s of sides) {
      const L = J[s], P = parts[s];
      setLine(P.thigh, L.hip, L.K);
      setLine(P.shin, L.K, L.A);
      setLine(P.foot, L.heel, L.toe);
      setLine(P.upper, L.root, L.E);
      setLine(P.fore, L.E, L.W);
      setCirc(P.hand, add(L.W, dirDown(L.aH ?? L.aL), SEG.hand * 0.55));
    }
    if (view === "front") {
      setLine(torso, J.H, add(J.S, J.u, -1));
    } else {
      const s = add(J.S, J.u, -0.6);
      torso.setAttribute("d", `M${f1(J.H[0])} ${f1(J.H[1])}Q${f1(J.C[0])} ${f1(J.C[1])} ${f1(s[0])} ${f1(s[1])}`);
      if (J.br) torso.setAttribute("stroke-width", f1(WID.torso + J.br * 1.6));
    }
    headG.setAttribute("transform", `translate(${f1(J.Hd[0])} ${f1(J.Hd[1])}) rotate(${f1(J.hdA)})`);
    // Frontansicht liegend: Wangen ausblenden (wirken gedreht im Pixelraster unruhig)
    if (cheeks.length) { const lying = Math.abs(((J.hdA % 360) + 540) % 360 - 180) > 50; for (const c of cheeks) c.style.display = lying ? "none" : ""; }

    for (const h of hls) {
      const sp = h.spec;
      if (sp.seg === "torso") {
        if (view === "front") {
          if (sp.across) {
            const c = lerpP(J.H, J.S, sp.across);
            setLine(h.el, add(c, J.right, -4.2), add(c, J.right, 4.2));
          } else setLine(h.el, lerpP(J.H, J.S, sp.t[0]), lerpP(J.H, J.S, sp.t[1]));
          continue;
        }
        const off = sp.side * (WID.torso / 2 - (WID.torso * 0.48) / 2 - 0.2);
        let d = "";
        for (let i = 0; i <= 6; i++) {
          const t = sp.t[0] + ((sp.t[1] - sp.t[0]) * i) / 6;
          const q = add(bez(J, t), bezN(J, t), off);
          d += (i ? "L" : "M") + f1(q[0]) + " " + f1(q[1]);
        }
        h.el.setAttribute("d", d);
        continue;
      }
      const [p, q, w] = segPts(J, h.side, sp.seg);
      if (sp.dot) { setCirc(h.el, lerpP(p, q, 0.12)); continue; }
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      let n = [dy / l, -dx / l]; // Vorderseite eines hängenden Glieds = +x
      if (view === "front") n = h.side === "l" ? [-dy / l, dx / l] : n; // außen
      const hw = w * (sp.w || 0.5);
      const off = sp.side * (w / 2 - hw / 2);
      setLine(h.el, add(lerpP(p, q, sp.t[0]), n, off), add(lerpP(p, q, sp.t[1]), n, off));
    }

    if (breathEl) {
      const c = view === "front" ? lerpP(J.H, J.S, 0.35) : add(bez(J, 0.38), bezN(J, 0.38), WID.torso / 2 - 1.2);
      setCirc(breathEl, c);
      breathEl.setAttribute("rx", f1(2.2 + J.br * 2.4));
      breathEl.setAttribute("ry", f1(1.8 + J.br * 2));
      breathEl.setAttribute("opacity", f1(0.18 + J.br * 0.22));
    }
    if (pelvicEl) {
      const c = view === "front" ? add(J.H, J.u, -2 + J.pf * 2.4) : add(J.H, J.u, -1.6 + J.pf * 2.6);
      setCirc(pelvicEl, c);
      pelvicEl.setAttribute("transform", `rotate(${f1(J.tr)} ${f1(c[0])} ${f1(c[1])})`);
      pelvicEl.setAttribute("opacity", f1(0.35 + J.pf * 0.5));
    }
  }
  return { update };
}
