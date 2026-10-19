/**
 * Nachtgarten – Übungsanimationen: Geräte-Overlays.
 *
 * Jedes Gerät ist ein kleines „Primitive“, das sich in eine Ebene zeichnet und pro Bild
 * mit den gelösten Gelenkpunkten (J, siehe figure.js) aktualisiert wird.
 * Positionen dürfen fest ([x,y]) oder Funktionen der Gelenke sein (J => [x,y]),
 * so hängen Hanteln an den Händen, Fußschlaufen am Knöchel, Polster am Schienbein …
 *
 * Ebenen (von hinten nach vorn): back · farProp · mid · front
 *   back    Umgebung: Kabelturm, Bank, Maschinen-Gestell, Matte, Wand, Stuhl
 *   farProp Gewichte an der fernen Hand (hinter dem Rumpf)
 *   mid     zwischen Rumpf und nahem Arm (Hantelscheibe, Kabel)
 *   front   vor allem (Griffe, nahe Kurzhantel-Köpfe, Polster)
 *
 * Unterstützte Arten (spec.k):
 *   Gewichte:  dumbbell (Kurzhantel), barbell (Langhantel mit Scheibe), ez (SZ-Stange),
 *              kettlebell
 *   Kabelzug:  tower (Turm mit Rolle; height hoch|mittel|tief), cable (Seil bis Griff, handle:
 *              Seil|Stange|Lat-Stange|V-Griff|Einzelgriff|Fußschlaufe)
 *   Band:      band (Widerstandsband zwischen zwei Punkten), loop (Miniband um die Knie)
 *   Umgebung:  bench (flach/schräg), mat (Matte), wall (Wand), chair (Stuhl), pullbar
 *              (Klimmzugstange), pad (Polster), frame (Gestell-Linie), floor-plate
 *   Maschine:  roller (Polsterrolle mit Hebel), lever (Hebelarm), grip (Maschinengriff),
 *              sled (Fußplatte der Beinpresse), step (Stufe); Maschinen werden in
 *              data/patterns.js aus pad/frame/roller/grip/sled zusammengesetzt.
 */
import { el, add, dirDown, angTo, lerpP, GROUND } from "./figure.js";

const f1 = (n) => Math.round(n * 100) / 100;
const val = (v, J) => (typeof v === "function" ? v(J) : v);
const setLine = (e, p, q) => {
  e.setAttribute("x1", f1(p[0])); e.setAttribute("y1", f1(p[1]));
  e.setAttribute("x2", f1(q[0])); e.setAttribute("y2", f1(q[1]));
};
const tf = (e, p, a = 0) => e.setAttribute("transform", `translate(${f1(p[0])} ${f1(p[1])})${a ? ` rotate(${f1(a)})` : ""}`);
const isFn = (v) => typeof v === "function";

/** Kabelhöhen (Rollen-y) im Seitenbild bzw. Frontbild. */
export const CABLE_Y = { hoch: 12, mittel: 50, tief: 88 };
/** Position der Umlenkrolle eines Turms bei x (Rolle auf Seite side). */
export const pulleyPos = (x, height = "mittel", side = 1) =>
  [x + side * 3.4, typeof height === "number" ? height : CABLE_Y[height] ?? CABLE_Y.mittel];

/* --------------------------------------------------------------- Teile */

const KINDS = {
  /** Polster: {x,y | at, w, h, a, r} – Mittelpunkt, Breite, Höhe, Drehung */
  pad(ctx, s) {
    const g = el("g", {}, ctx.layer(s, "back"));
    el("rect", { x: -s.w / 2, y: -s.h / 2, width: s.w, height: s.h, rx: s.r ?? Math.min(s.h / 2, 2.6), class: s.cls || "nga-env" }, g);
    const up = (J) => tf(g, val(s.at || [s.x, s.y], J), val(s.a || 0, J));
    return { update: up, static: !isFn(s.at) && !isFn(s.a) };
  },
  /** Gestell: {d} Pfad oder {pts:[[x,y],…]} */
  frame(ctx, s) {
    const d = s.d || "M" + s.pts.map((p) => p.map(f1).join(" ")).join("L");
    el("path", { d, class: s.cls || "nga-frame", "stroke-width": s.sw || 2.2 }, ctx.layer(s, "back"));
    return { static: true };
  },
  /** Bank: {x (linkes Ende), y (Polster-Oberkante), w, incline: {a, len} für Schrägbank} */
  bench(ctx, s) {
    const L = ctx.layer(s, "back"), h = 3.4;
    const top = s.y, x = s.x, w = s.w;
    el("path", { d: `M${f1(x + 4)} ${f1(top + h)}V${GROUND}M${f1(x + w - 4)} ${f1(top + h)}V${GROUND}`, class: "nga-frame", "stroke-width": 2 }, L);
    el("path", { d: `M${f1(x + 1)} ${GROUND - 0.6}h6M${f1(x + w - 7)} ${GROUND - 0.6}h6`, class: "nga-frame", "stroke-width": 1.6 }, L);
    el("rect", { x, y: top, width: w, height: h, rx: 1.7, class: "nga-env" }, L);
    if (s.incline) { // Rückenlehne, Drehpunkt am linken bzw. rechten Ende
      const { a, len, at = "left" } = s.incline;
      const px = at === "left" ? x + 1 : x + w - 1;
      const g = el("g", { transform: `translate(${f1(px)} ${f1(top + h / 2)}) rotate(${f1(a)})` }, L);
      el("rect", { x: -len, y: -h / 2, width: len, height: h, rx: 1.7, class: "nga-env" }, g);
      el("line", { x1: -len * 0.55, y1: h / 2, x2: -len * 0.25, y2: h / 2 + 8, class: "nga-frame", "stroke-width": 1.8 }, g);
    }
    return { static: true };
  },
  /** Matte: {x, w} */
  mat(ctx, s) {
    el("rect", { x: s.x, y: GROUND - 1.6, width: s.w, height: 2.2, rx: 1.1, class: "nga-mat" }, ctx.layer(s, "back"));
    return { static: true };
  },
  /** Wand: {x, side:+1 Wand rechts von x | −1 links} */
  wall(ctx, s) {
    const side = s.side || 1;
    const x = side > 0 ? s.x : s.x - 6;
    el("rect", { x, y: 4, width: 6, height: GROUND - 4, class: "nga-wall" }, ctx.layer(s, "back"));
    return { static: true };
  },
  /** Stuhl (Seitenansicht): {x (Sitzmitte), y (Sitzhöhe), facing:+1 Lehne links} */
  chair(ctx, s) {
    const L = ctx.layer(s, "back"), f = s.facing || 1, y = s.y ?? 74, x = s.x;
    const bx = x - f * 7.5;
    el("path", { d: `M${f1(bx)} ${f1(y)}V${f1(y - 19)}M${f1(x - f * 6.5)} ${f1(y + 2)}V${GROUND}M${f1(x + f * 6.5)} ${f1(y + 2)}V${GROUND}`, class: "nga-frame", "stroke-width": 2 }, L);
    el("rect", { x: x - 8, y: y - 1, width: 16, height: 3.2, rx: 1.4, class: "nga-env" }, L);
    return { static: true };
  },
  /** Klimmzugstange: {x, y} – Stange von der Seite (Kreis) mit Halterung */
  pullbar(ctx, s) {
    const L = ctx.layer(s, "back");
    // Klimmzug-Gestell: Stange (von der Seite) am Ausleger, Pfosten bis zum Boden
    el("path", { d: `M${f1(s.x)} ${f1(s.y)}V${f1(s.y - 5)}H${f1(s.x - 16)}V${GROUND - 0.6}M${f1(s.x - 21)} ${GROUND - 0.6}h10`, class: "nga-frame", "stroke-width": 2.4 }, L);
    el("circle", { cx: s.x, cy: s.y, r: 1.9, class: "nga-bar" }, ctx.layer({}, "front"));
    return { static: true };
  },
  /** Kabelturm: {x, pulley:[x,y] | height, side:+1 Rolle rechts vom Turm} */
  tower(ctx, s) {
    const L = ctx.layer(s, "back");
    const side = s.side || 1;
    const top = s.top ?? 6;
    // far: Turm steht seitlich hinter der Figur (blasser)
    el("rect", { x: s.x - 3.2, y: top, width: 6.4, height: GROUND - top, rx: 2.2, class: "nga-tower" + (s.far ? " nga-far-env" : "") }, L);
    el("line", { x1: s.x - 6, y1: GROUND - 0.6, x2: s.x + 6, y2: GROUND - 0.6, class: "nga-frame", "stroke-width": 1.6 }, L);
    const [px, py] = s.pulley || pulleyPos(s.x, s.height, side);
    el("circle", { cx: px, cy: py, r: 2.1, class: "nga-pulley" }, L);
    return { static: true, pulley: [px, py] };
  },
  /** Kabel mit Griff: {from:[x,y], to: J=>[x,y], handle, a: J=>Griffwinkel} */
  cable(ctx, s) {
    const line = el("line", { class: "nga-cable" }, ctx.layer(s, "mid"));
    const hg = el("g", { class: "nga-handle" }, ctx.layer({ layer: s.handleLayer }, "front"));
    const h = s.handle || "Einzelgriff";
    if (h === "Seil") {
      el("path", { d: "M0 -3.2L-0.9 0.4M0 -3.2L0.9 0.4", "stroke-width": 1.9 }, hg);
      el("circle", { cx: -0.9, cy: 0.9, r: 1.25, class: "nga-knob" }, hg);
      el("circle", { cx: 0.9, cy: 0.9, r: 1.25, class: "nga-knob" }, hg);
    } else if (h === "Stange" || h === "Lat-Stange") {
      el("path", { d: h === "Lat-Stange" ? "M-4.2 1.2L-2.6 0H2.6L4.2 1.2" : "M-3 0H3", "stroke-width": 1.9, fill: "none" }, hg);
    } else if (h === "V-Griff") {
      el("path", { d: "M0 -3.6L-1.8 0.6M0 -3.6L1.8 0.6M-2.4 0.6H2.4", "stroke-width": 1.5, fill: "none" }, hg);
    } else if (h === "Fußschlaufe") {
      el("rect", { x: -2.6, y: -2.2, width: 5.2, height: 4.4, rx: 2, "stroke-width": 1.4, fill: "none" }, hg);
    } else { // Einzelgriff (D-Griff)
      el("path", { d: "M-1.8 -2.2L0 -3.6L1.8 -2.2V1.1H-1.8Z", "stroke-width": 1.4, fill: "none" }, hg);
    }
    return {
      update(J) {
        const from = val(s.from, J), to = val(s.to, J);
        // Griff zeigt mit der Spitze zur Rolle
        const a = s.a != null ? val(s.a, J) : 180 - angTo(to, from);
        const attach = h === "Fußschlaufe" ? to : add(to, dirDown(angTo(to, from)), h === "Seil" ? 3.2 : h === "V-Griff" ? 3.6 : h.includes("Stange") ? 0 : 3.4);
        setLine(line, from, attach);
        tf(hg, to, h.includes("Stange") ? val(s.barA || 0, J) : a);
      },
    };
  },
  /** Kurzhantel: {at, a (Achsenwinkel im Bild; Standard leicht schräg = 3D-Eindruck), far} */
  dumbbell(ctx, s) {
    const Lb = ctx.layer(s, s.far ? "farProp" : "mid"), Lf = ctx.layer(s, s.far ? "farProp" : "front");
    const bar = el("line", { class: "nga-dbbar" }, Lb);
    const head = (L, cls) => el("rect", { x: -1.9, y: -3.3, width: 3.8, height: 6.6, rx: 1.6, class: cls }, L);
    const back = head(Lb, "nga-weight nga-weight-back"), front = head(Lf, "nga-weight");
    return {
      update(J) {
        const p = val(s.at, J), a = val(s.a ?? 62, J), d = dirDown(a);
        const q1 = add(p, d, -3.1), q2 = add(p, d, 3.1);
        setLine(bar, q1, q2); tf(back, q1, 90 - a); tf(front, q2, 90 - a);
      },
    };
  },
  /** Langhantel (von der Seite: Scheibe) {at, r} */
  barbell(ctx, s) {
    const g = el("g", {}, ctx.layer(s, "mid"));
    const r = s.r || 8.4;
    el("circle", { r, class: "nga-weight nga-plate" }, g);
    el("circle", { r: r * 0.62, class: "nga-plate-ring" }, g);
    el("circle", { r: 1.25, class: "nga-hub" }, g);
    return { update(J) { tf(g, val(s.at, J)); } };
  },
  /** SZ-Stange: kleinere Scheibe, leicht gekröpfter Griff als Andeutung */
  ez(ctx, s) {
    return KINDS.barbell(ctx, { ...s, r: s.r || 5.8 });
  },
  /** Kettlebell: {at (Griffpunkt), a (Richtung Kugel, Standard unten), far} */
  kettlebell(ctx, s) {
    const g = el("g", {}, ctx.layer(s, s.far ? "farProp" : "mid"));
    el("path", { d: "M-2.6 3.4C-3.4 -0.6 -2.2 -1.6 0 -1.6C2.2 -1.6 3.4 -0.6 2.6 3.4", class: "nga-kbhandle", fill: "none" }, g);
    el("path", { d: "M-4.6 7.6A5 5 0 1 1 4.6 7.6Q4.4 10.4 3.4 10.9H-3.4Q-4.4 10.4 -4.6 7.6Z", class: "nga-weight" }, g);
    return { update(J) { tf(g, val(s.at, J), val(s.a || 0, J)); } };
  },
  /** Widerstandsband: {from, to} – sanft gebogen */
  band(ctx, s) {
    const p = el("path", { class: "nga-band", fill: "none" }, ctx.layer(s, "mid"));
    const k = el("circle", { r: 1.4, class: "nga-band-anchor" }, ctx.layer(s, "back"));
    return {
      update(J) {
        const a = val(s.from, J), b = val(s.to, J);
        const m = lerpP(a, b, 0.5), sag = s.sag ?? 1.2;
        p.setAttribute("d", `M${f1(a[0])} ${f1(a[1])}Q${f1(m[0])} ${f1(m[1] + sag)} ${f1(b[0])} ${f1(b[1])}`);
        k.setAttribute("cx", f1(a[0])); k.setAttribute("cy", f1(a[1]));
      },
    };
  },
  /** Miniband zwischen zwei Punkten (z. B. Knie) */
  loop(ctx, s) {
    const p = el("line", { class: "nga-band nga-loop" }, ctx.layer(s, "front"));
    return { update(J) { setLine(p, val(s.a, J), val(s.b, J)); } };
  },
  /** Hebel: {from (Drehpunkt), to} */
  lever(ctx, s) {
    const l = el("line", { class: "nga-lever" }, ctx.layer(s, "back"));
    return { update(J) { setLine(l, val(s.from, J), val(s.to, J)); } };
  },
  /** Polsterrolle mit Hebel: {pivot, at, r} */
  roller(ctx, s) {
    const l = el("line", { class: "nga-lever" }, ctx.layer(s, "back"));
    const c = el("circle", { r: s.r || 2.8, class: "nga-roller" }, ctx.layer(s, "front"));
    const pv = el("circle", { r: 1.4, class: "nga-pivot" }, ctx.layer(s, "back"));
    return {
      update(J) {
        const p = val(s.at, J), v = val(s.pivot, J);
        setLine(l, v, p); c.setAttribute("cx", f1(p[0])); c.setAttribute("cy", f1(p[1]));
        pv.setAttribute("cx", f1(v[0])); pv.setAttribute("cy", f1(v[1]));
      },
    };
  },
  /** Maschinengriff: {at, pivot?} – kleiner Griff, optional mit Hebel */
  grip(ctx, s) {
    const l = s.pivot ? el("line", { class: "nga-lever" }, ctx.layer(s, "back")) : null;
    const c = el("rect", { x: -1.5, y: -2.6, width: 3, height: 5.2, rx: 1.4, class: "nga-gripbar" }, ctx.layer(s, "mid"));
    return {
      update(J) {
        const p = val(s.at, J);
        if (l) setLine(l, val(s.pivot, J), p);
        tf(c, p, val(s.a || 0, J));
      },
    };
  },
  /** Fußplatte (Beinpresse): {at, a, w} – Platte senkrecht zu a */
  sled(ctx, s) {
    const g = el("g", {}, ctx.layer(s, "back"));
    el("rect", { x: -1.8, y: -(s.w || 16) / 2, width: 3.6, height: s.w || 16, rx: 1.4, class: "nga-env" }, g);
    el("rect", { x: 1.8, y: -3, width: 7, height: 6, rx: 1.5, class: "nga-env" }, g);
    return { update(J) { tf(g, val(s.at, J), val(s.a || 0, J)); } };
  },
  /** Bodenplatte / Stufe: {x, w, h} */
  step(ctx, s) {
    el("rect", { x: s.x, y: GROUND - s.h, width: s.w, height: s.h, rx: 1.4, class: "nga-env" }, ctx.layer(s, "back"));
    return { static: true };
  },
};

/**
 * Erstellt alle Geräte eines Musters.
 * layers: {back, farProp, mid, front}; specs: Liste von {k, …}
 * Gibt {update(J), pulleys} zurück.
 */
export function createEquipment(layers, specs, opts = {}) {
  const ctx = {
    detail: opts.detail !== false,
    layer: (s, def) => layers[(s && s.layer) || def] || layers.front,
  };
  const items = [];
  for (const s of specs || []) {
    const make = KINDS[s.k];
    if (!make) { console.warn("[anim] unbekanntes Gerät", s.k); continue; }
    items.push(make(ctx, s));
  }
  return {
    update(J) { for (const it of items) if (it.update && !(it.static && it._done)) { it.update(J); it._done = true; } },
  };
}
