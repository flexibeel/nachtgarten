/**
 * Eigener Plan (Editor) – reine Logik.
 *
 * Ein Programm hat Einheiten (Tag A, B …) mit geordneten Übungen und eine Woche (Mo…So → Einheit).
 * Gespeichert in `ng2.programs`; jede Änderung wird in die bestehenden Bereiche übertragen
 * (`plans` je Einheit mit Id „<programm>-<einheit>“, `schedule` für die Wochentage), damit
 * Live-Training, Heute und „Plan als Link“ unverändert funktionieren.
 */

import { validatePlan, repsLabel, weekOf } from './plan-select.js';
import { baseOf, variantOf } from './variants.js';

/**
 * @typedef {object} ProgramItem
 * @property {string} exercise
 * @property {number} sets
 * @property {[number, number]} reps     Wdh.-Bereich
 * @property {[number, number]} rir      Reserve-Bereich
 * @property {number} rest               Pause in Sekunden
 * @property {string} [src]              Übung der Vorlage (für die Hinweise; fällt beim Austauschen weg)
 * @typedef {object} ProgramSession
 * @property {string} id                 „A“, „B“ …
 * @property {string} name
 * @property {ProgramItem[]} items
 * @typedef {object} Program
 * @property {string} id
 * @property {string} name
 * @property {ProgramSession[]} sessions
 * @property {(string|null)[]} week      7 Tage, Mo = 0
 * @property {string} [template]         Vorlage, aus der er entstand
 * @property {string} [dose]             Dosis der Vorlage (sanft, standard …) für die Hinweise
 * @property {string[]} [tradeoffs]      bewusste Abwägungen der Vorlage
 */

export const MAX_SESSIONS = 6;
export const DEFAULT_ITEM = Object.freeze({ sets: 3, reps: /** @type {[number, number]} */ ([8, 12]), rir: /** @type {[number, number]} */ ([1, 2]), rest: 90 });
export const LIMITS = Object.freeze({ sets: [1, 10], reps: [1, 60], rir: [0, 5], rest: [15, 600] });

const LETTERS = 'ABCDEF';
const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));

/** Nächster freier Buchstabe. @param {ProgramSession[]} sessions */
const nextLetter = (sessions) => [...LETTERS].find((l) => !sessions.some((s) => s.id === l)) ?? String(sessions.length + 1);

/**
 * @param {{name: string, sessionName: string, now: number}} input
 * @returns {Program}
 */
export function newProgram({ name, sessionName, now }) {
  return { id: `p${now.toString(36)}`, name, sessions: [{ id: 'A', name: sessionName, items: [] }], week: Array(7).fill(null) };
}

/**
 * Vorlage (data/plans.js) als bearbeitbares Programm.
 * @param {import('./plan-select.js').PlanTemplate} template
 * @param {{now: number, mapId?: (id: string) => string, days?: number}} options
 * @returns {Program}
 */
export function programFromTemplate(template, { now, mapId = (id) => id, days }) {
  const week = weekOf(template, { days }).map((id) => id ?? null);
  return {
    id: `p${now.toString(36)}`,
    name: template.name,
    template: template.id,
    dose: template.dose,
    tradeoffs: [...(template.tradeoffs ?? [])],
    sessions: template.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      items: s.items.map((it) => ({
        exercise: mapId(it.ex),
        src: it.ex,
        sets: it.sets,
        reps: [it.reps[0], it.reps[1]],
        rir: it.rir ? [it.rir[0], it.rir[1]] : [...DEFAULT_ITEM.rir],
        rest: it.rest ?? DEFAULT_ITEM.rest,
      })),
    })),
    week,
  };
}

/**
 * Reducer des Editors. Unbekannte Aktionen und ungültige Indizes ändern nichts.
 * @param {Program} program
 * @param {{type: string, [k: string]: any}} action
 * @returns {Program}
 */
export function editProgram(program, action) {
  const sessions = program.sessions;
  const mapSession = (id, fn) => {
    const next = sessions.map((s) => (s.id === id ? fn(s) : s));
    return next.every((s, i) => s === sessions[i]) ? program : { ...program, sessions: next };
  };
  const has = (id) => sessions.some((s) => s.id === id);
  switch (action.type) {
    case 'rename':
      return { ...program, name: String(action.name ?? '').slice(0, 60) };
    case 'addSession': {
      if (sessions.length >= MAX_SESSIONS) return program;
      const id = nextLetter(sessions);
      return { ...program, sessions: [...sessions, { id, name: String(action.name ?? ''), items: [] }] };
    }
    case 'renameSession':
      return has(action.session) ? mapSession(action.session, (s) => ({ ...s, name: String(action.name ?? '').slice(0, 40) })) : program;
    case 'removeSession':
      if (!has(action.session) || sessions.length <= 1) return program;
      return { ...program, sessions: sessions.filter((s) => s.id !== action.session), week: program.week.map((d) => (d === action.session ? null : d)) };
    case 'restoreSession': {
      if (has(action.value.id)) return program;
      const next = [...sessions];
      next.splice(Math.min(action.index, next.length), 0, action.value);
      const week = program.week.map((d, i) => (action.days?.includes(i) && !d ? action.value.id : d));
      return { ...program, sessions: next, week };
    }
    case 'addItems':
      return has(action.session)
        ? mapSession(action.session, (s) => ({ ...s, items: [...s.items, ...action.exercises.map((exercise) => ({ exercise, ...structuredClone(DEFAULT_ITEM) }))] }))
        : program;
    case 'removeItem':
      return mapSession(action.session, (s) => (s.items[action.index] ? { ...s, items: s.items.filter((_, i) => i !== action.index) } : s));
    case 'restoreItem':
      return mapSession(action.session, (s) => {
        const items = [...s.items];
        items.splice(Math.min(Math.max(0, action.index), items.length), 0, action.item);
        return { ...s, items };
      });
    case 'moveItem':
      return mapSession(action.session, (s) => {
        const { from, to } = action;
        if (!s.items[from] || to < 0 || to >= s.items.length || from === to) return s;
        const items = [...s.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...s, items };
      });
    case 'updateItem':
      return mapSession(action.session, (s) => {
        const it = s.items[action.index];
        if (!it) return s;
        const p = action.patch ?? {};
        const next = { ...it };
        if ('exercise' in p && p.exercise !== it.exercise) {
          next.exercise = String(p.exercise);
          // Gerät-Variante derselben Übung: Muskeln bleiben gleich, die Vorlage-Zuordnung auch.
          const group = (/** @type {string} */ x) => variantOf(x)?.group.id ?? baseOf(x);
          if (group(it.exercise) !== group(next.exercise)) delete next.src;
        }
        if ('sets' in p) next.sets = clamp(p.sets, LIMITS.sets);
        if ('rest' in p) next.rest = clamp(p.rest, LIMITS.rest);
        if ('reps' in p) {
          const lo = clamp(p.reps[0], LIMITS.reps);
          next.reps = [lo, Math.max(lo, clamp(p.reps[1], LIMITS.reps))];
        }
        if ('rir' in p) {
          const lo = clamp(p.rir[0], LIMITS.rir);
          next.rir = [lo, Math.max(lo, clamp(p.rir[1], LIMITS.rir))];
        }
        return { ...s, items: s.items.map((x, i) => (i === action.index ? next : x)) };
      });
    case 'toggleDay': {
      const day = action.day;
      if (!has(action.session) || !(day >= 0 && day <= 6)) return program;
      // Ein Tag hat höchstens eine Einheit: erneut tippen nimmt sie weg, sonst wird umgelegt.
      const week = program.week.map((d, i) => (i === day ? (d === action.session ? null : action.session) : d));
      return { ...program, week };
    }
    default:
      return program;
  }
}

/** „3 × 8–10“ @param {ProgramItem} it */
export const itemLabel = (it) => `${it.sets} × ${it.reps[0] === it.reps[1] ? it.reps[0] : `${it.reps[0]}–${it.reps[1]}`}`;

/** Id des gespeicherten App-Plans einer Einheit. @param {Program} program @param {string} session */
export const planIdOf = (program, session) => `${program.id}-${session}`.toLowerCase();

/**
 * Programm → Einträge für `plans` und `schedule` (übrige Pläne und Tage bleiben).
 * @param {Program} program
 * @param {{plans: import('../core/store.js').Plan[], schedule: import('../core/store.js').Schedule}} current
 */
export function syncProgram(program, { plans, schedule }) {
  const prefix = `${program.id}-`.toLowerCase();
  const own = program.sessions.map((s) => ({
    id: planIdOf(program, s.id),
    name: program.sessions.length > 1 ? `${s.name || s.id}` : s.name || program.name,
    program: program.id,
    items: s.items.map((it) => ({ exercise: it.exercise, sets: it.sets, reps: repsLabel({ reps: it.reps }), rir: it.rir, rest: it.rest })),
  }));
  const kept = plans.filter((p) => !p.id.startsWith(prefix));
  /** @type {import('../core/store.js').Schedule} */
  const nextSchedule = {};
  for (const [day, slot] of Object.entries(schedule)) {
    if (slot?.kind === 'plan' && slot.id.startsWith(prefix)) continue;
    nextSchedule[day] = slot;
  }
  program.week.forEach((sid, day) => {
    if (sid) nextSchedule[String(day)] = { kind: 'plan', id: planIdOf(program, sid) };
  });
  return { plans: [...kept, ...own], schedule: nextSchedule };
}

/**
 * Programm aus allen Bereichen entfernen.
 * @param {Program} program
 * @param {{plans: any[], schedule: Record<string, any>}} current
 */
export function dropProgram(program, { plans, schedule }) {
  return syncProgram({ ...program, sessions: [], week: Array(7).fill(null) }, { plans, schedule });
}

/** Für sanfte Hinweise: nur diese Prüfungen, in dieser Reihenfolge. */
const HINT_CODES = ['frequency', 'pushPull', 'sessionVolume', 'volumeHigh', 'volumeLow'];
export const MAX_HINTS = 3;

/**
 * Sanfte Hinweise (nie blockierend) über validatePlan, z. B. „Beine hinten kommt nur 1× pro Woche dran.“
 * Ohne eingetragene Tage oder ohne Übungen gibt es keine Hinweise.
 * @param {Program} program
 * @returns {{code: string, text: string}[]}
 */
export function programHints(program) {
  const used = program.week.filter(Boolean);
  if (!used.length || !program.sessions.some((s) => s.items.length)) return [];
  const template = {
    id: program.id,
    name: program.name,
    dose: program.dose ?? 'standard',
    tradeoffs: program.tradeoffs ?? [],
    daysPerWeek: used.length,
    weeks: { [used.length]: program.week },
    sessions: program.sessions.map((s) => ({ id: s.id, name: s.name || s.id, items: s.items.map((it) => ({ ex: it.src ?? baseOf(it.exercise), sets: it.sets, reps: it.reps, rir: it.rir, rest: it.rest })) })),
  };
  const { issues } = validatePlan(/** @type {any} */ (template), { week: program.week });
  const seen = new Set();
  return issues
    // Nur echte Hinweise: bewusste Abwägungen der Vorlage (Stufe „info“) bleiben still.
    .filter((i) => i.level === 'warn' && HINT_CODES.includes(i.code))
    .sort((a, b) => HINT_CODES.indexOf(a.code) - HINT_CODES.indexOf(b.code))
    .filter((i) => (seen.has(i.text) ? false : seen.add(i.text)))
    .slice(0, MAX_HINTS)
    .map((i) => ({ code: i.code, text: (i.text.split('. ')[0].replace(/\.$/, '') + '.').replace(/(\d)\.(\d)/g, '$1,$2') }));
}
