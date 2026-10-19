/**
 * Sätze und Trainings: e1RM, gewichtete Muskelsätze, Bestleistungen,
 * Live-Training abschließen, Zusammenfassung für die Abschluss-Karte.
 *
 * Übungen kommen über eine Nachschlage-Funktion `lookup(id)` herein,
 * damit diese Datei keine Übungsdaten kennen muss.
 */

import { dateKey } from '../core/dates.js';
import { MUSCLE_NAMES } from '../data/muscles.js';

/** @typedef {import('../core/store.js').Exercise} Exercise */
/** @typedef {import('../core/store.js').LiveSession} LiveSession */
/** @typedef {import('../core/store.js').LiveSet} LiveSet */
/** @typedef {import('../core/store.js').SetRecord} SetRecord */
/** @typedef {import('../core/store.js').PersonalRecord} PersonalRecord */
/** @typedef {import('../core/store.js').Session} Session */
/** @typedef {import('../core/store.js').Plan} Plan */
/** @typedef {(id: string) => Exercise|undefined} ExerciseLookup */

/** Hilfsmuskeln zählen halb (Pelland u. a. 2024). */
export const SECONDARY_WEIGHT = 0.5;
/** Sätze mit mehr Reserve zählen nicht als harte Sätze. */
export const MAX_RIR_FOR_VOLUME = 4;
/** Bestleistung nur mit ehrlicher Reserve (oder unbekannter RIR). */
export const MAX_RIR_FOR_PR = 3;
/** Ein vergessenes Live-Training wird nach drei Stunden ohne Satz beendet. */
export const AUTO_FINISH_MS = 3 * 60 * 60 * 1000;
/** Je Übung werden höchstens so viele Sätze im Verlauf behalten. */
export const HISTORY_LIMIT = 500;

/** Kleinster Abstand, ab dem ein Satz als besser gilt (gegen Rundungsrauschen). */
const PR_EPSILON = 0.01;

/**
 * Geschätztes Einerwiederholungsmaximum nach Epley, Reserve (RIR) eingerechnet:
 * w · (1 + (Wdh. + RIR) / 30). Ohne Zusatzgewicht zählt die Wiederholungszahl.
 * @param {number} weight
 * @param {number} reps
 * @param {number|null} [rir]
 */
export function e1rm(weight, reps, rir = null) {
  const effective = reps + (rir ?? 0);
  return weight > 0 ? weight * (1 + effective / 30) : effective;
}

/**
 * Gewichtete Muskelsätze für `count` Sätze einer Übung.
 * @param {Exercise|undefined} exercise
 * @param {number} count
 * @param {Record<string, number>} [into]  wird ergänzt (und zurückgegeben)
 */
export function addMuscleSets(exercise, count, into = {}) {
  if (!exercise || !count) return into;
  exercise.muscles.forEach((m, i) => {
    into[m] = (into[m] ?? 0) + count * (i === 0 ? 1 : SECONDARY_WEIGHT);
  });
  return into;
}

/**
 * @param {LiveSet[]} sets
 * @param {ExerciseLookup} lookup
 */
export function muscleSetsFromLive(sets, lookup) {
  const out = {};
  for (const s of sets) {
    if (s.rir == null || s.rir <= MAX_RIR_FOR_VOLUME) addMuscleSets(lookup(s.exercise), 1, out);
  }
  return out;
}

/**
 * Für das Abhaken nach Plan: `done[i]` Sätze von Übung i.
 * @param {Plan} plan
 * @param {number[]} done
 * @param {ExerciseLookup} lookup
 */
export function muscleSetsFromChecklist(plan, done, lookup) {
  const out = {};
  plan.items.forEach((item, i) => addMuscleSets(lookup(item.exercise), done[i] ?? 0, out));
  return out;
}

/**
 * Darf ein Satz mit dieser Reserve eine Bestleistung sein?
 * @param {number|null|undefined} rir
 */
export const countsForPR = (rir) => rir == null || rir <= MAX_RIR_FOR_PR;

/**
 * Bestleistung = besser als alles bisher (e1RM aus Gewicht × Wdh., ohne RIR,
 * weil nur zählt, was wirklich geschafft wurde). Der erste Satz ist nie eine Bestleistung.
 * @param {Pick<SetRecord,'weight'|'reps'>[]} previous
 * @param {{weight:number, reps:number, rir?:number|null}} candidate
 */
export function isPersonalRecord(previous, candidate) {
  if (!previous.length || !countsForPR(candidate.rir)) return false;
  const best = Math.max(...previous.map((x) => e1rm(x.weight, x.reps)));
  return e1rm(candidate.weight, candidate.reps) > best + PR_EPSILON;
}

/**
 * Bester Satz (höchstes e1RM ohne RIR) oder null.
 * @template {Pick<SetRecord,'weight'|'reps'>} T
 * @param {T[]} records
 * @returns {T|null}
 */
export function bestSet(records) {
  return records.reduce(
    (best, x) => (!best || e1rm(x.weight, x.reps) > e1rm(best.weight, best.reps) ? x : best),
    /** @type {T|null} */ (null),
  );
}

/**
 * Prüft Eingaben eines Satzes. Liefert einen Text-Schlüssel oder null.
 * @param {number} weight
 * @param {number} reps
 * @returns {'set.invalidWeight'|'set.invalidReps'|null}
 */
export function validateSet(weight, reps) {
  if (!Number.isFinite(weight) || weight < 0 || weight > 500) return 'set.invalidWeight';
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) return 'set.invalidReps';
  return null;
}

/**
 * Neues Live-Training.
 * @param {number} now
 * @param {LiveSession['form']} [form]
 * @returns {LiveSession}
 */
export function startLive(now, form = null) {
  return { start: now, sets: [], form, queue: null, metrics: null, legHintDismissed: false };
}

/**
 * Letzte Aktivität: Start oder letzter Satz.
 * @param {LiveSession|null} live
 */
export function lastActivityAt(live) {
  if (!live) return 0;
  return Math.max(live.start || 0, ...live.sets.map((s) => s.at || 0));
}

/**
 * @param {LiveSession|null} live
 * @param {number} now
 */
export function shouldAutoFinish(live, now) {
  return !!live && now - lastActivityAt(live) >= AUTO_FINISH_MS;
}

/**
 * Satz speichern: Live-Training, Verlauf und Bestleistungen fortschreiben.
 * Reine Funktion – liefert neue Objekte.
 * @param {{live: LiveSession, history: Record<string, SetRecord[]>, prs: PersonalRecord[]}} state
 * @param {{exercise:string, weight:number, reps:number, rir?:number|null, attachment?:string, height?:string}} input
 * @param {number} now
 */
export function logSet(state, input, now) {
  const rir = input.rir ?? null;
  const date = dateKey(now);
  const previous = state.history[input.exercise] ?? [];
  const pr = isPersonalRecord(previous, { ...input, rir });

  /** @type {LiveSet} */
  const set = { exercise: input.exercise, weight: input.weight, reps: input.reps, rir, at: now };
  if (input.attachment) set.attachment = input.attachment;
  if (input.height) set.height = input.height;

  const record = { date, weight: input.weight, reps: input.reps, rir, session: state.live.start };
  const history = {
    ...state.history,
    [input.exercise]: [...previous, record].slice(-HISTORY_LIMIT),
  };
  const prs = pr
    ? [...state.prs, { date, exercise: input.exercise, weight: input.weight, reps: input.reps, session: state.live.start }]
    : state.prs;

  return { live: { ...state.live, sets: [...state.live.sets, set] }, history, prs, pr };
}

/**
 * Verlauf und Bestleistungen einer Übung neu aufbauen, nachdem im laufenden Training
 * ein Satz geändert oder gelöscht wurde.
 * @param {{live: LiveSession, history: Record<string, SetRecord[]>, prs: PersonalRecord[]}} state
 * @param {string} exercise
 */
export function rebuildExercise(state, exercise) {
  const tag = state.live.start;
  const own = state.live.sets.filter((s) => s.exercise === exercise);
  const base = (state.history[exercise] ?? []).filter((x) => x.session !== tag);
  const dayOf = (s) => dateKey(s.at || tag);

  const records = own.map((s) => ({ date: dayOf(s), weight: s.weight, reps: s.reps, rir: s.rir ?? null, session: tag }));
  const days = new Set([dateKey(tag), ...records.map((r) => r.date)]);
  const prs = state.prs.filter(
    (p) => !(p.exercise === exercise && (p.session === tag || (p.session == null && days.has(p.date)))),
  );

  const running = [...base];
  for (const r of records) {
    if (isPersonalRecord(running, r)) {
      prs.push({ date: r.date, exercise, weight: r.weight, reps: r.reps, session: tag });
    }
    running.push(r);
  }
  return { history: { ...state.history, [exercise]: running.slice(-HISTORY_LIMIT) }, prs };
}

/**
 * Titel eines Live-Trainings aus den meistgenutzten Hauptmuskeln ("Brust & Trizeps").
 * @param {LiveSession} live
 * @param {ExerciseLookup} lookup
 */
export function liveTitle(live, lookup) {
  if (live.queue?.name) return live.queue.name;
  /** @type {Record<string, number>} */
  const count = {};
  for (const s of live.sets) {
    const main = lookup(s.exercise)?.muscles[0];
    if (main) count[main] = (count[main] ?? 0) + 1;
  }
  const ranked = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return 'Live-Training';
  let top = ranked.filter(([, n]) => n >= ranked[0][1] * 0.34).slice(0, 3).map(([m]) => m);
  if (top.includes('quads') && top.includes('hams')) {
    top = ['legs', ...top.filter((m) => m !== 'quads' && m !== 'hams')];
  }
  return top.slice(0, 2).map((m) => (m === 'legs' ? 'Beine' : MUSCLE_NAMES[m] ?? m)).join(' & ');
}

/**
 * Live-Training abschließen → Protokolleintrag. Ohne Sätze: null.
 * Das Datum ist der Tag des letzten Satzes (wichtig nach Mitternacht oder beim Nachtragen).
 * @param {LiveSession} live
 * @param {ExerciseLookup} lookup
 * @param {{autoFinished?: boolean}} [options]
 * @returns {Session|null}
 */
export function finishLive(live, lookup, { autoFinished = false } = {}) {
  if (!live.sets.length) return null;
  /** @type {Session} */
  const session = {
    id: `live-${live.start}`,
    date: dateKey(lastActivityAt(live)),
    kind: 'strength',
    planId: live.queue?.planId ?? null,
    name: liveTitle(live, lookup),
    muscleSets: muscleSetsFromLive(live.sets, lookup),
    setCount: live.sets.length,
    exercises: [...new Set(live.sets.map((s) => s.exercise))],
    live: true,
  };
  if (autoFinished) session.autoFinished = true;
  if (live.metrics && Object.keys(live.metrics).length) session.metrics = live.metrics;
  return session;
}

/**
 * Abhaken nach Plan abschließen. Ohne einen abgehakten Satz: null.
 * @param {Plan} plan
 * @param {number[]} done
 * @param {ExerciseLookup} lookup
 * @param {number} now
 * @returns {Session|null}
 */
export function finishChecklist(plan, done, lookup, now) {
  const setCount = done.reduce((a, b) => a + b, 0);
  if (!setCount) return null;
  return {
    id: `plan-${now}`,
    date: dateKey(now),
    kind: 'strength',
    planId: plan.id,
    name: plan.name,
    muscleSets: muscleSetsFromChecklist(plan, done, lookup),
    setCount,
    exercises: plan.items.filter((_, i) => done[i] > 0).map((it) => it.exercise),
  };
}

/**
 * Geschätzte Dauer eines Plans: 2,5 Minuten pro Satz, auf 5 gerundet, mindestens 10.
 * @param {Plan} plan
 */
export function planMinutes(plan) {
  const total = plan.items.reduce((a, it) => a + it.sets, 0);
  return Math.max(10, Math.round((total * 2.5) / 5) * 5);
}

/**
 * @typedef {object} ShareCard
 * @property {string} title
 * @property {string} date
 * @property {number|null} minutes
 * @property {number} sets
 * @property {number|null} reps
 * @property {number|null} volume   kg × Wdh.
 * @property {Record<string, number>} muscles
 * @property {{name:string, gear:string, sets:{weight:number|null, reps:number|string}[], pr?:boolean}[]} items
 */

/** @param {number} from @param {number} to */
const minutesBetween = (from, to) => Math.max(1, Math.round((to - from) / 60_000));

/**
 * Zusammenfassung eines Live-Trainings für die Abschluss-Karte.
 * @param {LiveSession} live
 * @param {{lookup: ExerciseLookup, prs: PersonalRecord[], now: number, timeTracking: boolean}} ctx
 * @returns {ShareCard}
 */
export function summarizeLive(live, { lookup, prs, now, timeTracking }) {
  /** @type {Map<string, LiveSet[]>} */
  const byExercise = new Map();
  for (const s of live.sets) {
    if (!byExercise.has(s.exercise)) byExercise.set(s.exercise, []);
    byExercise.get(s.exercise).push(s);
  }
  const muscles = {};
  live.sets.forEach((s) => addMuscleSets(lookup(s.exercise), 1, muscles));
  return {
    title: liveTitle(live, lookup),
    date: dateKey(lastActivityAt(live)),
    minutes: timeTracking ? minutesBetween(live.start, now) : null,
    sets: live.sets.length,
    reps: live.sets.reduce((a, s) => a + s.reps, 0),
    volume: Math.round(live.sets.reduce((a, s) => a + s.weight * s.reps, 0)),
    muscles,
    items: [...byExercise].map(([id, list]) => {
      const ex = lookup(id);
      return {
        id,
        name: ex?.name ?? id,
        gear: ex?.gear ?? '',
        muscles: ex?.muscles ?? [],
        sets: list.map((s) => ({ weight: s.weight, reps: s.reps })),
        pr: prs.some((p) => p.exercise === id && p.session === live.start),
      };
    }),
  };
}

/**
 * Zusammenfassung des Abhakens nach Plan (ohne Gewichte).
 * @param {Plan} plan
 * @param {number[]} done
 * @param {{lookup: ExerciseLookup, startedAt: number|null, now: number, timeTracking: boolean}} ctx
 * @returns {ShareCard}
 */
export function summarizeChecklist(plan, done, { lookup, startedAt, now, timeTracking }) {
  return {
    title: plan.name,
    date: dateKey(now),
    minutes: timeTracking && startedAt ? minutesBetween(startedAt, now) : null,
    sets: done.reduce((a, b) => a + b, 0),
    reps: null,
    volume: null,
    muscles: muscleSetsFromChecklist(plan, done, lookup),
    items: plan.items
      .map((it, i) => {
        const ex = lookup(it.exercise);
        return {
          name: ex?.name ?? it.exercise,
          gear: ex?.gear ?? '',
          sets: Array.from({ length: done[i] ?? 0 }, () => ({ weight: null, reps: it.reps })),
        };
      })
      .filter((x) => x.sets.length),
  };
}
