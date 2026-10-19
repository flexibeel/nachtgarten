/**
 * Nachtgarten – Teilen: welche Bewegung zeigt das Mannequin?
 *
 * Verbindet eine Übung aus dem Training (Name, Muskeln, Sätze) mit dem
 * Bewegungsmuster der Übungsanimationen (data/exercise-map.js → data/patterns.js)
 * und liefert Posen entlang der Bewegung – für die Bewegungsstudie, die
 * Sammelkarten und die Mini-Posen im Programmheft. Rein, ohne DOM.
 */

import { mapExercise } from '../../data/exercise-map.js';
import { buildPattern } from '../../data/patterns.js';
import { ANKLE_Y, solve } from '../anim/figure.js';

/** Interpoliert zwei Posen (Zahlen und [x,y]-Paare) – wie im Abspieler. */
export function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) {
    const va = a[k]; const vb = b[k];
    if (vb === undefined) o[k] = va;
    else if (typeof va === 'number') o[k] = va + (vb - va) * t;
    else if (Array.isArray(va)) o[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
    else o[k] = t < 0.5 ? va : vb;
  }
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}

/** Pose an Position s ∈ [0, frames-1]. */
export function poseAt(frames, s) {
  const n = frames.length - 1;
  if (s <= 0) return frames[0];
  if (s >= n) return frames[n];
  const i = Math.floor(s);
  return lerpPose(frames[i], frames[i + 1], s - i);
}

/** Segmente, die sich deutlich bewegen (wie movingSegments im Abspieler). */
export function movingSegments(def) {
  const sides = def.view === 'front' ? ['l', 'r'] : ['n', 'f'];
  const out = new Set();
  if (def.emph) {
    for (const t of def.emph) {
      if (t === 'torso') { out.add('torso'); continue; }
      const one = /^[nflr][A-Z]/.test(t);
      const grp = (one ? t.slice(1) : t).toLowerCase();
      const ss = one ? [t[0]] : sides;
      const segs = grp === 'legs' || grp === 'leg' ? ['thigh', 'shin', 'foot'] : ['upper', 'fore'];
      for (const s of ss) for (const g of segs) out.add(`${s}.${g}`);
    }
    return out;
  }
  if (def.frames.length < 2) return out;
  const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 57.2958;
  const segs = { thigh: ['hip', 'K'], shin: ['K', 'A'], foot: ['heel', 'toe'], upper: ['root', 'E'], fore: ['E', 'W'] };
  const J0 = solve(def.frames[0], def.view);
  for (const f of def.frames.slice(1)) {
    const J = solve(f, def.view);
    for (const s of sides) {
      for (const g in segs) {
        const [a, b] = segs[g];
        let d = Math.abs(ang(J[s][a], J[s][b]) - ang(J0[s][a], J0[s][b])) % 360;
        if (d > 180) d = 360 - d;
        if (d > 26) out.add(`${s}.${g}`);
      }
    }
  }
  return out;
}

/** Muster, bei denen ein Gewicht ohne Geräteangabe eher eine Hantel als der Körper ist. */
const BARBELL_FIRST = new Set(['squat', 'hinge', 'pushH', 'hipthrust']);
const NEEDS_GEAR = new Set(['squat', 'hinge', 'pushH', 'pushV', 'lunge', 'splitsquat', 'curl', 'triExt', 'latRaise',
  'frontRaise', 'uprightRow', 'shrug', 'pullH', 'hipthrust', 'calfRaise', 'rearFly', 'fly']);

function muscleIds(ex) {
  if (Array.isArray(ex.muscles)) return ex.muscles;
  return Object.entries(ex.muscles || {}).sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

/**
 * Bewegung einer Übung. Nutzt ex.anim ({pattern, equipment, options}) oder ex.id/ex.gear,
 * sonst den Namen. Trägt eine Übung Gewicht, aber kein Gerät, wird ein passendes gewählt
 * (Kniebeuge mit 100 kg → Langhantel, „KH“ → Kurzhanteln, „am Seil“ → Kabelzug).
 * @returns {{pattern: string, equipment: string, options: object, def: object, muscles: string[]}}
 */
export function motionOf(ex = {}) {
  const muscles = muscleIds(ex);
  let m = ex.anim && ex.anim.pattern ? { equipment: 'koerper', options: {}, ...ex.anim } : mapExercise({ id: ex.id, name: ex.name, gear: ex.gear, muscles });
  const name = String(ex.name || '').toLowerCase();
  const kg = Math.max(0, ...(ex.sets || []).map((s) => Number(s.kg) || 0));
  let eq = m.equipment;
  if (!ex.anim && !ex.gear) {
    if (/\bkh\b/.test(name)) eq = 'kurzhantel';
    else if (/\blh\b/.test(name)) eq = 'langhantel';
    else if (/\bseil|kabel/.test(name) && eq !== 'kabel') {
      const again = mapExercise({ name: `${name} kabel`, muscles });
      m = again; eq = 'kabel';
    } else if (eq === 'koerper' && kg > 0 && NEEDS_GEAR.has(m.pattern)) eq = BARBELL_FIRST.has(m.pattern) ? 'langhantel' : 'kurzhantel';
  }
  const options = { ...(m.options || {}) };
  if (m.pattern === 'triExt' && eq === 'kabel' && !options.handle && /\bseil/.test(name)) options.handle = 'Seil';
  let def;
  try { def = buildPattern(m.pattern, { equipment: eq, ...options }); } catch {
    def = buildPattern('breathing', { equipment: 'koerper', variant: 'stand' });
  }
  return { pattern: m.pattern, equipment: eq, options, def, muscles: muscles.length ? muscles : def.muscles || [] };
}

/**
 * n Posen entlang der Bewegung, Start → Ende (sanft verteilt, wie eine Serienfotografie).
 * Kreisende Muster (Gehen, Laufen) werden einmal rundherum abgetastet.
 */
export function sequence(def, n = 5) {
  const last = def.frames.length - 1;
  if (n <= 1) return [def.frames[last]];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    if (def.loop === 'cycle') return poseAt(def.frames, ((i / n) * last));
    const e = 0.5 - 0.5 * Math.cos(Math.PI * t);
    return poseAt(def.frames, e * last);
  });
}

/** Schlüsselpose (Ende der Arbeitsphase) – für Sammelkarten und Mini-Posen. */
export function keyPose(def) {
  if (def.loop === 'cycle') return poseAt(def.frames, (def.frames.length - 1) * 0.25);
  return def.frames[def.frames.length - 1];
}

/**
 * Die Läuferin mitten im Schritt (für Laufkarten): vorderes Bein greift aus, das hintere
 * stößt ab, Arme gegengleich angewinkelt, Rumpf leicht vorgeneigt. Dasselbe Skelett
 * wie in den Übungsanimationen – nur eine eigene Pose.
 */
export const RUN_POSE = {
  hx: 50, hy: ANKLE_Y - 33.2, tr: 9, nk: -4,
  nT: 38, nS: 6, nF: 92, fT: -24, fS: -78, fF: 128,
  nU: -38, nL: 52, fU: 34, fL: 118,
};
let runnerCache = null;
export function runnerMotion() {
  if (!runnerCache) {
    const def = { label: 'Lauf', view: 'side', props: [], frames: [RUN_POSE], muscles: ['quads', 'calves'] };
    runnerCache = { def, pose: RUN_POSE };
  }
  return runnerCache;
}

/** Die Hauptübung einer Einheit: Bestwert zuerst, sonst die mit dem schwersten Satz unter den ersten drei. */
export function heroExercise(workout) {
  const list = workout.exercises || [];
  if (!list.length) return null;
  const pr = list.find((e) => e.pr);
  if (pr) return pr;
  const top = (e) => Math.max(0, ...(e.sets || []).map((s) => Number(s.kg) || 0));
  return list.slice(0, 3).reduce((b, e) => (top(e) > top(b) ? e : b), list[0]);
}
