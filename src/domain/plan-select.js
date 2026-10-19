/**
 * Trainingsplan-Vorlagen auswerten, prüfen und empfehlen. Rein, ohne DOM.
 *
 * - weeklyVolume(plan)     gewichtete harte Sätze je Muskel und Woche (Hilfsmuskeln halb, Pelland)
 * - weeklyFrequency(plan)  Einheiten pro Woche, in denen ein Muskel ≥ 1 gewichteten Satz bekommt
 * - validatePlan(plan)     Frequenz, Volumen-Korridor, Push:Pull, Beine vor harten Läufen
 * - recommendPlans(input)  Top 3 mit „Passt, weil …“
 * - arrangeWeek(plan, …)   Krafttage um feste Lauftage legen
 */

import { addMuscleSets } from './training.js';
import { MUSCLE_IDS, MUSCLE_NAMES } from '../data/muscles.js';
import { DOSE_RANGES, PLAN_EXERCISES, PLAN_TEMPLATES, RELATED_PLANS } from '../data/plans.js';

/** @typedef {import('../data/plans.js').PlanTemplate} PlanTemplate */
/** @typedef {import('../data/plans.js').PlanSession} PlanSession */
/** @typedef {import('../data/plans.js').PlanItem} PlanItem */
/** @typedef {import('../data/plans.js').RunDay} RunDay */

/** Große Muskeln: Frequenz und Volumen werden geprüft. Arme, Waden, Bauch laufen nebenher. */
export const MAJOR_MUSCLES = Object.freeze(['chest', 'back', 'shoulders', 'quads', 'hams', 'glutes']);
export const LEG_MUSCLES = Object.freeze(['quads', 'hams', 'glutes']);
export const MIN_FREQUENCY = 2;
/** Push:Pull-Sätze außerhalb dieses Verhältnisses → Hinweis. */
export const PUSH_PULL_RANGE = Object.freeze([2 / 3, 1.5]);
/** Mehr gewichtete Sätze pro Muskel in einer Einheit bringen kaum noch etwas. */
export const MAX_SETS_PER_SESSION = 12;
/** Direkte Beinsätze in einer Einheit ab hier „schwer“ bzw. „mittel“. */
export const LEG_HEAVY = 6;
export const LEG_MEDIUM = 3;
export const DAY_NAMES = Object.freeze(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);

const DEFAULT_WARMUP_MIN = 5;
const SECONDS_PER_REP = 3;
/** Umbau, Gewicht wählen, Weg zum Gerät – pro Übung. */
const TRANSITION_S = 60;

/** @param {string} id */
const lookup = (id) => PLAN_EXERCISES[id];
/** Mobilität (rir null) zählt nicht als harter Satz. */
const isHard = (/** @type {PlanItem} */ it) => it.rir != null && lookup(it.ex)?.move !== 'mobility';
const round1 = (n) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------ Woche */

/**
 * Wochenbelegung Mo…So für eine Tage-Variante (Standard: plan.daysPerWeek).
 * @param {PlanTemplate} plan
 * @param {{days?: number, week?: (string|null)[]}} [opts]
 * @returns {(string|null)[]}
 */
export function weekOf(plan, { days, week } = {}) {
  if (week) return week;
  return plan.weeks[days ?? plan.daysPerWeek] ?? plan.weeks[plan.daysPerWeek];
}

/** Tage-Varianten eines Plans, z. B. [2, 3]. @param {PlanTemplate} plan */
export const dayOptions = (plan) => Object.keys(plan.weeks).map(Number).sort((a, b) => a - b);

/** @param {PlanTemplate} plan @param {string} id */
export const sessionById = (plan, id) => plan.sessions.find((s) => s.id === id);

/* ------------------------------------------------------------ Volumen */

/**
 * Gewichtete harte Sätze je Muskel in einer Einheit.
 * @param {PlanSession} session
 * @returns {Record<string, number>}
 */
export function sessionVolume(session) {
  const out = {};
  for (const it of session.items) if (isHard(it)) addMuscleSets(lookup(it.ex), it.sets, out);
  return out;
}

/**
 * Gewichtete harte Sätze je Muskel und Woche, für alle 12 Muskeln (0 wenn nicht trainiert).
 * @param {PlanTemplate} plan
 * @param {{days?: number, week?: (string|null)[]}} [opts]
 * @returns {Record<string, number>}
 */
export function weeklyVolume(plan, opts = {}) {
  const out = Object.fromEntries(MUSCLE_IDS.map((m) => [m, 0]));
  for (const id of weekOf(plan, opts)) {
    const s = id && sessionById(plan, id);
    if (!s) continue;
    for (const [m, n] of Object.entries(sessionVolume(s))) out[m] = round1(out[m] + n);
  }
  return out;
}

/**
 * Wie viele Einheiten pro Woche einen Muskel mit mindestens einem gewichteten Satz treffen.
 * @param {PlanTemplate} plan
 * @param {{days?: number, week?: (string|null)[]}} [opts]
 */
export function weeklyFrequency(plan, opts = {}) {
  const out = Object.fromEntries(MUSCLE_IDS.map((m) => [m, 0]));
  for (const id of weekOf(plan, opts)) {
    const s = id && sessionById(plan, id);
    if (!s) continue;
    for (const [m, n] of Object.entries(sessionVolume(s))) if (n >= 1) out[m] += 1;
  }
  return out;
}

/**
 * Direkte Sätze je Bewegungsrichtung pro Woche (Drücken vs. Ziehen; Arme/Seitheben zählen nicht).
 * @param {PlanTemplate} plan
 * @param {{days?: number, week?: (string|null)[]}} [opts]
 */
export function pushPull(plan, opts = {}) {
  let push = 0;
  let pull = 0;
  for (const id of weekOf(plan, opts)) {
    const s = id && sessionById(plan, id);
    if (!s) continue;
    for (const it of s.items) {
      if (!isHard(it)) continue;
      const move = lookup(it.ex)?.move;
      if (move === 'push') push += it.sets;
      if (move === 'pull') pull += it.sets;
    }
  }
  return { push, pull, ratio: pull ? push / pull : push ? Infinity : 1 };
}

/**
 * Beinbelastung einer Einheit aus den direkten Beinsätzen.
 * @param {PlanSession|undefined} session
 * @returns {'schwer'|'mittel'|'leicht'}
 */
export function legLoad(session) {
  if (!session) return 'leicht';
  const n = session.items
    .filter((it) => isHard(it) && LEG_MUSCLES.includes(lookup(it.ex)?.muscles[0]))
    .reduce((a, it) => a + it.sets, 0);
  return n >= LEG_HEAVY ? 'schwer' : n >= LEG_MEDIUM ? 'mittel' : 'leicht';
}

/* ------------------------------------------------------------ Dauer */

/** @param {PlanItem} it */
function workSeconds(it) {
  const [lo, hi] = it.reps;
  const base = it.unit === 's' ? hi : Math.max(20, ((lo + hi) / 2) * SECONDS_PER_REP);
  return base * (it.perSide ? 2 : 1);
}

/**
 * Geschätzte Minuten einer Einheit (Aufwärmen + Arbeit + Pausen + Wechsel), auf 5 gerundet.
 * Supersätze: pro Runde die Arbeit beider Übungen, dann einmal die Pause.
 * @param {PlanSession} session
 * @param {number} [warmupMin]
 */
export function sessionMinutes(session, warmupMin = DEFAULT_WARMUP_MIN) {
  /** @type {Map<string, PlanItem[]>} */
  const groups = new Map();
  session.items.forEach((it, i) => {
    const key = it.superset ? `s${it.superset}` : `i${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  });
  let seconds = warmupMin * 60;
  for (const list of groups.values()) {
    const rounds = Math.max(...list.map((it) => it.sets));
    const work = list.reduce((a, it) => a + workSeconds(it), 0);
    const rest = Math.max(...list.map((it) => it.rest));
    seconds += rounds * (work + rest) + TRANSITION_S * list.length;
  }
  return Math.round(seconds / 60 / 5) * 5;
}

/**
 * Spanne der Einheiten-Dauer eines Plans.
 * @param {PlanTemplate} plan
 * @returns {{min:number, max:number}}
 */
export function templateMinutes(plan) {
  const m = plan.sessions.map((s) => sessionMinutes(s, plan.warmupMin ?? DEFAULT_WARMUP_MIN));
  return { min: Math.min(...m), max: Math.max(...m) };
}

/* ------------------------------------------------------------ Prüfen */

/**
 * @typedef {object} PlanIssue
 * @property {'error'|'warn'|'info'} level
 * @property {string} code
 * @property {string} text
 * @property {string} [muscle]
 * @property {number} [day]
 */

/**
 * @param {(string|null)[]} week
 * @param {PlanTemplate} plan
 * @param {RunDay[]} runDays
 * @returns {PlanIssue[]}
 */
function legIssues(week, plan, runDays) {
  /** @type {PlanIssue[]} */
  const out = [];
  const loadAt = (d) => {
    const id = week[(d + 7) % 7];
    return id ? legLoad(sessionById(plan, id)) : 'leicht';
  };
  for (let d = 0; d < 7; d++) {
    if (loadAt(d) === 'schwer' && loadAt(d + 1) === 'schwer') {
      out.push({
        level: 'warn',
        code: 'legsBackToBack',
        day: d,
        text: `${DAY_NAMES[d]} und ${DAY_NAMES[(d + 1) % 7]} sind beide schwere Beintage. Leg einen Tag Abstand dazwischen.`,
      });
    }
  }
  for (const run of runDays) {
    if (run.kind === 'easy') continue;
    const before = (run.day + 6) % 7;
    if (loadAt(before) === 'schwer') {
      out.push({
        level: 'warn',
        code: 'legsBeforeRun',
        day: before,
        text: `Schwerer Beintag am ${DAY_NAMES[before]} direkt vor „${run.label}“. Besser auf den Tag nach dem harten Lauf legen.`,
      });
    }
  }
  return out;
}

/**
 * Prüft einen Plan. `ok` heißt: keine Fehler. Warnungen sind Hinweise für die Anzeige;
 * bewusste Abwägungen (`plan.tradeoffs`) werden zu Infos herabgestuft.
 * @param {PlanTemplate} plan
 * @param {{days?: number, week?: (string|null)[], runDays?: RunDay[]}} [opts]
 * @returns {{ok: boolean, issues: PlanIssue[], volume: Record<string, number>, frequency: Record<string, number>}}
 */
export function validatePlan(plan, opts = {}) {
  /** @type {PlanIssue[]} */
  const issues = [];
  const week = weekOf(plan, opts);
  const accepted = new Set(plan.tradeoffs ?? []);
  const flag = (code) => (accepted.has(code) ? 'info' : 'warn');

  for (const s of plan.sessions) {
    for (const it of s.items) {
      if (!lookup(it.ex)) issues.push({ level: 'error', code: 'unknownExercise', text: `Unbekannte Übung „${it.ex}“ in ${s.name}.` });
      if (!(it.sets >= 1) || !(it.reps?.[0] <= it.reps?.[1])) {
        issues.push({ level: 'error', code: 'badItem', text: `Sätze oder Wiederholungen bei „${it.ex}“ in ${s.name} ungültig.` });
      }
    }
  }
  if (!Array.isArray(week) || week.length !== 7) {
    issues.push({ level: 'error', code: 'badWeek', text: 'Die Woche braucht genau 7 Tage.' });
    return { ok: false, issues, volume: {}, frequency: {} };
  }
  for (const id of week) {
    if (id && !sessionById(plan, id)) issues.push({ level: 'error', code: 'unknownSession', text: `Einheit „${id}“ gibt es nicht.` });
  }
  const used = week.filter(Boolean).length;
  if (!opts.week && used !== (opts.days ?? plan.daysPerWeek)) {
    issues.push({ level: 'error', code: 'daysMismatch', text: `Die Woche hat ${used} statt ${opts.days ?? plan.daysPerWeek} Trainingstage.` });
  }

  const volume = weeklyVolume(plan, { week });
  const frequency = weeklyFrequency(plan, { week });
  const [lo, hi] = DOSE_RANGES[plan.dose] ?? DOSE_RANGES.standard;

  for (const m of MAJOR_MUSCLES) {
    const name = MUSCLE_NAMES[m];
    if (frequency[m] < MIN_FREQUENCY) {
      issues.push({
        level: flag('frequency'),
        code: 'frequency',
        muscle: m,
        text: `${name} kommt nur ${frequency[m]}× pro Woche dran. Fürs Wachstum okay bei gleicher Satzzahl, für Kraft sind 2× besser.`,
      });
    }
    if (volume[m] < lo) {
      issues.push({ level: flag('volume'), code: 'volumeLow', muscle: m, text: `${name}: ${volume[m]} Sätze pro Woche, Ziel ${lo}–${hi}.` });
    } else if (volume[m] > hi) {
      issues.push({ level: flag('volume'), code: 'volumeHigh', muscle: m, text: `${name}: ${volume[m]} Sätze pro Woche – mehr als ${hi} bringt kaum noch etwas.` });
    }
  }

  for (const s of plan.sessions) {
    if (!week.includes(s.id)) continue;
    for (const [m, n] of Object.entries(sessionVolume(s))) {
      if (n > MAX_SETS_PER_SESSION) {
        issues.push({ level: 'warn', code: 'sessionVolume', muscle: m, text: `${s.name}: ${n} Sätze für ${MUSCLE_NAMES[m]} in einer Einheit – lieber auf zwei Tage verteilen.` });
      }
    }
  }

  if (plan.dose !== 'sanft') {
    const stretched = new Set();
    for (const id of week) {
      const s = id && sessionById(plan, id);
      s?.items.forEach((it) => lookup(it.ex)?.stretch && isHard(it) && lookup(it.ex).muscles.forEach((m) => stretched.add(m)));
    }
    for (const m of MAJOR_MUSCLES) {
      if (!stretched.has(m)) {
        issues.push({ level: 'warn', code: 'noStretch', muscle: m, text: `${MUSCLE_NAMES[m]}: keine Übung, die die gedehnte Position betont.` });
      }
    }
  }

  const pp = pushPull(plan, { week });
  if (pp.push + pp.pull > 0 && (pp.ratio < PUSH_PULL_RANGE[0] || pp.ratio > PUSH_PULL_RANGE[1])) {
    issues.push({
      level: flag('pushPull'),
      code: 'pushPull',
      text: `Drücken ${pp.push} : Ziehen ${pp.pull} Sätze – das ist unausgewogen. Ziel ungefähr 1 : 1.`,
    });
  }

  issues.push(...legIssues(week, plan, opts.runDays ?? plan.runDays ?? []));

  return { ok: !issues.some((i) => i.level === 'error'), issues, volume, frequency };
}

/* ------------------------------------------------------------ Lauftage */

/**
 * Krafteinheiten so auf die Woche legen, dass sie zu festen Lauftagen passen:
 * schwere Beine nie am Tag vor einem harten oder langen Lauf, gern am Tag danach,
 * möglichst nicht auf Lauftagen und nicht an zwei Tagen hintereinander.
 * @param {PlanTemplate} plan
 * @param {{runDays: RunDay[], days?: number}} opts
 * @returns {(string|null)[]}
 */
export function arrangeWeek(plan, { runDays, days }) {
  const base = weekOf(plan, { days });
  const ids = base.filter(Boolean);
  const hard = runDays.filter((r) => r.kind !== 'easy');
  const runSet = new Set(runDays.map((r) => r.day));
  const isDayBeforeHard = (d) => hard.some((r) => (r.day + 6) % 7 === d);
  const isDayAfterQuality = (d) => runDays.some((r) => r.kind === 'quality' && (r.day + 1) % 7 === d);

  let best = base;
  let bestScore = -Infinity;
  /** @param {number[]} chosen */
  const visit = (chosen) => {
    if (chosen.length === ids.length) {
      const week = Array(7).fill(null);
      chosen.forEach((d, i) => (week[d] = ids[i]));
      let score = 0;
      chosen.forEach((d, i) => {
        const load = legLoad(sessionById(plan, ids[i]));
        if (load === 'schwer' && isDayBeforeHard(d)) score -= 100;
        if (load === 'mittel' && isDayBeforeHard(d)) score -= 3;
        if (load === 'schwer' && isDayAfterQuality(d)) score += 4;
        if (runSet.has(d)) score -= 2;
        const next = (d + 1) % 7;
        if (chosen.includes(next)) score -= 2;
      });
      if (score > bestScore) {
        bestScore = score;
        best = week;
      }
      return;
    }
    for (let d = 0; d < 7; d++) if (!chosen.includes(d)) visit([...chosen, d]);
  };
  if (ids.length <= 4) visit([]);
  return best;
}

/* ------------------------------------------------------------ Empfehlen */

/**
 * @typedef {object} PlanQuery
 * @property {number} daysPerWeek
 * @property {number} minutesPerSession
 * @property {('gym'|'home'|'none')[]} equipment
 * @property {'neu'|'etwas'|'erfahren'} experience
 * @property {'kraft'|'muskel'|'fit'|'laufen'} focus
 * @property {{shiftWork?: boolean, backPain?: boolean, t1d?: boolean, runDays?: RunDay[], pregnant?: boolean, postpartum?: boolean}} [constraints]
 */

const FOCUS_LABEL = { kraft: 'Kraft', muskel: 'Muskelaufbau', fit: 'Fitness und Wohlbefinden', laufen: 'Laufen mit Kraft' };
/** Was ein Gerät-Angebot alles erlaubt (im Studio geht auch der Heimplan). */
const EQUIPMENT_ALLOWS = { gym: ['gym', 'home', 'none'], home: ['home', 'none'], none: ['none'] };

/** @param {string[]} parts */
function passtWeil(parts) {
  const p = parts.slice(0, 3);
  if (!p.length) return 'Passt als Alternative.';
  const list = p.length === 1 ? p[0] : `${p.slice(0, -1).join(', ')} und ${p[p.length - 1]}`;
  return `Passt, weil ${list}.`;
}

/**
 * Bewertet einen Plan für eine Anfrage. Null = passt nicht (Geräte).
 * @param {PlanTemplate} plan
 * @param {PlanQuery} q
 */
function scorePlan(plan, q) {
  const c = q.constraints ?? {};
  const allowed = new Set((q.equipment ?? ['gym']).flatMap((e) => EQUIPMENT_ALLOWS[e] ?? []));
  if (!allowed.has(plan.equipment)) return null;

  /** @type {{w:number, text:string}[]} */
  const reasons = [];
  let score = 0;

  // Tage
  const options = dayOptions(plan);
  const days = options.includes(q.daysPerWeek)
    ? q.daysPerWeek
    : options.filter((d) => d <= q.daysPerWeek).pop() ?? options[0];
  if (days === q.daysPerWeek) {
    score += 30;
    reasons.push({ w: 30, text: days === plan.daysPerWeek ? `er genau deine ${days} Tage pro Woche nutzt` : `er auch mit ${days} Tagen pro Woche funktioniert` });
  } else if (days < q.daysPerWeek) {
    score += Math.max(0, 15 - 8 * (q.daysPerWeek - days));
  } else {
    score -= 40 * (days - q.daysPerWeek);
  }

  // Zeit
  const { max } = templateMinutes(plan);
  const over = max - q.minutesPerSession;
  if (over <= 0) {
    score += 15;
    reasons.push({ w: 15, text: `eine Einheit mit ca. ${max} Minuten in dein Zeitfenster passt` });
  } else if (over <= 10) score += 3;
  else score -= 2.5 * over;

  // Erfahrung
  if (plan.level.includes(q.experience)) {
    score += 12;
    if (q.experience === 'neu') reasons.push({ w: 12, text: 'er für den Einstieg gedacht ist' });
    if (q.experience === 'erfahren' && plan.dose === 'standard') reasons.push({ w: 12, text: 'er genug Volumen für Erfahrene hat' });
  } else {
    const order = ['neu', 'etwas', 'erfahren'];
    const gap = Math.min(...plan.level.map((l) => Math.abs(order.indexOf(l) - order.indexOf(q.experience))));
    score -= 18 * gap;
  }

  // Ziel
  const fi = plan.focus.indexOf(q.focus);
  if (fi === 0) {
    score += 25;
    reasons.push({ w: 25, text: `er auf ${FOCUS_LABEL[q.focus]} ausgelegt ist` });
  } else if (fi > 0) score += 12;
  else score -= 10;

  // Geräte
  if (plan.equipment === 'home' && !q.equipment.includes('gym')) {
    score += 10;
    reasons.push({ w: 10, text: 'du dafür kein Studio brauchst' });
  }
  if (plan.equipment === 'none' && !q.equipment.includes('gym')) {
    score += 6;
    reasons.push({ w: 6, text: 'du nur eine Matte brauchst' });
  }

  // Besonderheiten
  if (c.shiftWork) {
    if (plan.flexible) {
      score += 8;
      reasons.push({ w: 20, text: 'du die Einheiten an deine Schichten anpassen kannst' });
    } else score -= 8;
  }
  if (c.backPain) {
    if (plan.id === 'ruecken') {
      score += 40;
      reasons.push({ w: 40, text: 'er sanft und rückenfreundlich aufgebaut ist' });
    } else if (plan.dose === 'standard') score -= 15;
  }
  if (q.focus === 'laufen' || c.runDays?.length) {
    if (plan.runDays) {
      score += 30;
      reasons.push({ w: 30, text: 'die Krafttage um deine Lauftage herum liegen' });
    } else if (plan.daysPerWeek > 3) score -= 20;
  }
  if (plan.dose === 'sanft' && !c.backPain) score -= 15; // Brückenplan, nicht erste Wahl ohne Beschwerden
  if (plan.tradeoffs?.includes('frequency')) score -= 5;

  reasons.sort((a, b) => b.w - a.w);
  return { score, days, reasons: reasons.map((r) => r.text) };
}

/**
 * Top 3 Pläne für eine Anfrage, mit kurzer Begründung und Hinweisen.
 * Bei Schwangerschaft oder kurz nach der Geburt: Verweis auf die eigenen Mama-Pläne.
 * @param {PlanQuery} q
 */
export function recommendPlans(q) {
  const c = q.constraints ?? {};
  if (c.pregnant || c.postpartum) {
    return { results: [], related: RELATED_PLANS[0], message: 'Für Schwangerschaft und Rückbildung gibt es eigene, passende Pläne.' };
  }
  const results = PLAN_TEMPLATES.map((plan) => ({ plan, s: scorePlan(plan, q) }))
    .filter((r) => r.s)
    .sort((a, b) => b.s.score - a.s.score)
    .slice(0, 3)
    .map(({ plan, s }) => {
      const week = c.runDays?.length ? arrangeWeek(plan, { runDays: c.runDays, days: s.days }) : weekOf(plan, { days: s.days });
      /** @type {string[]} */
      const notes = [];
      if (c.t1d && plan.healthNotes?.t1d) notes.push(...plan.healthNotes.t1d);
      else if (c.t1d) notes.push('Mit Typ-1-Diabetes: Glukose vor und nach dem Training prüfen, schnelle Kohlenhydrate dabeihaben und Anpassungen mit deinem Diabetes-Team besprechen.');
      if (c.backPain) notes.push('Bei starken, ausstrahlenden oder neuen Rückenschmerzen, Taubheit oder Lähmungen: erst ärztlich abklären.');
      const check = validatePlan(plan, { week, runDays: c.runDays ?? plan.runDays });
      return {
        id: plan.id,
        plan,
        score: Math.round(s.score),
        days: s.days,
        week,
        minutes: templateMinutes(plan),
        reason: passtWeil(s.reasons),
        notes,
        issues: check.issues.filter((i) => i.level !== 'error'),
      };
    });
  return { results, related: null, message: null };
}

/* ------------------------------------------------------------ App-Format */

/**
 * Wdh.-Soll im Freitextformat der App ("8–12", "20–40 s", "6–8 je Seite").
 * @param {PlanItem} it
 */
export function repsLabel(it) {
  const [lo, hi] = it.reps;
  const range = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `${range}${it.unit === 's' ? ' s' : ''}${it.perSide ? ' je Seite' : ''}`;
}

/**
 * Vorlage → Pläne im v2-Speicherformat ({id, name, items:[{exercise, sets, reps}]}), je Einheit einer.
 * Allgemeine Übungen (g_…) behalten ihre Id; die Bibliothek muss sie auflösen oder ersetzen.
 * @param {PlanTemplate} plan
 * @returns {import('../core/store.js').Plan[]}
 */
export function toAppPlans(plan) {
  return plan.sessions.map((s) => ({
    id: `${plan.id}-${s.id}`.toLowerCase(),
    name: `${plan.name}: ${s.name}`,
    items: s.items.map((it) => ({ exercise: it.ex, sets: it.sets, reps: repsLabel(it) })),
  }));
}
