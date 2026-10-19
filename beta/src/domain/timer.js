/**
 * Timer-Engine für Pausen und Intervall-Programme (Heimpläne, Einsteiger-Zirkel).
 *
 * Zeitstempel-basiert: Die Restzeit wird immer aus der Uhr berechnet, nie heruntergezählt.
 * Läuft die App im Hintergrund oder ruckelt ein Intervall, stimmt die Zeit trotzdem;
 * beim nächsten `poll()` werden verpasste Schrittwechsel nachgeholt.
 * Die Uhr ist injizierbar (`clock`), die Engine kennt weder DOM noch Töne:
 * Sie liefert Ereignisse, die UI spielt Ton/Vibration ab.
 */

/**
 * @typedef {object} TimerStep
 * @property {'work'|'rest'} kind
 * @property {number|null} duration   Sekunden; null = Wiederholungs-Schritt (wartet auf „Fertig“)
 * @property {string} label
 * @property {boolean} [sideSwitch]   Seitenwechsel zur Hälfte ankündigen
 * @property {string} [block]
 * @property {string} [nextLabel]
 * @property {string} [cue]
 * @property {string} [avoid]
 * @property {number|string} [reps]
 */

/**
 * @typedef {{type:'countdown', seconds:number, index:number}
 *   | {type:'sideSwitch', index:number}
 *   | {type:'stepEnd', index:number}
 *   | {type:'finished'}} TimerEvent
 */

/**
 * @typedef {object} TimerState
 * @property {number} index
 * @property {boolean} running
 * @property {number} elapsedMs         bis zum letzten Start/Pause aufgelaufen
 * @property {number|null} segmentStart Zeitpunkt des letzten Starts (läuft) oder null
 * @property {boolean} finished
 * @property {boolean} sideSwitchSent
 * @property {number|null} lastCountdown
 */

export const COUNTDOWN_FROM = 3;

/** @returns {TimerState} */
const initialState = () => ({
  index: 0,
  running: false,
  elapsedMs: 0,
  segmentStart: null,
  finished: false,
  sideSwitchSent: false,
  lastCountdown: null,
});

/**
 * @param {TimerStep[]} steps
 * @param {{clock?: () => number, state?: TimerState}} [options]  `state` zum Fortsetzen nach Neuladen
 */
export function createTimer(steps, { clock = Date.now, state } = {}) {
  let s = state ? { ...state } : initialState();
  if (!steps.length) s.finished = true;

  const current = () => steps[s.index] ?? null;
  const isTimed = (step) => !!step && step.duration != null && step.duration > 0;
  const elapsed = () => s.elapsedMs + (s.running && s.segmentStart != null ? clock() - s.segmentStart : 0);

  const enterStep = (index, keepRunning, carryMs = 0) => {
    s.index = index;
    s.elapsedMs = 0;
    s.sideSwitchSent = false;
    s.lastCountdown = null;
    if (index >= steps.length) {
      s.finished = true;
      s.running = false;
      s.segmentStart = null;
      return;
    }
    s.running = keepRunning && isTimed(steps[index]);
    // Überhang aus dem vorigen Schritt zählt schon zum neuen (Zeitstempel-Genauigkeit).
    s.segmentStart = s.running ? clock() - carryMs : null;
  };

  /**
   * Uhr auswerten: Seitenwechsel, Countdown, Schrittende (auch mehrere nachholen).
   * @returns {TimerEvent[]}
   */
  const poll = () => {
    /** @type {TimerEvent[]} */
    const events = [];
    while (s.running && !s.finished) {
      const step = current();
      const durMs = step.duration * 1000;
      const el = elapsed();
      if (el >= durMs) {
        events.push({ type: 'stepEnd', index: s.index });
        enterStep(s.index + 1, true, el - durMs);
        if (s.finished) events.push({ type: 'finished' });
        continue;
      }
      if (step.sideSwitch && !s.sideSwitchSent && el >= durMs / 2) {
        s.sideSwitchSent = true;
        events.push({ type: 'sideSwitch', index: s.index });
      }
      const left = Math.ceil((durMs - el) / 1000);
      if (left <= COUNTDOWN_FROM && left !== s.lastCountdown) {
        s.lastCountdown = left;
        events.push({ type: 'countdown', seconds: left, index: s.index });
      }
      break;
    }
    return events;
  };

  const api = {
    poll,

    /** Starten/Fortsetzen (nur bei Zeit-Schritten). */
    start() {
      if (s.finished || s.running || !isTimed(current())) return;
      s.running = true;
      s.segmentStart = clock();
    },

    pause() {
      if (!s.running) return;
      s.elapsedMs = elapsed();
      s.running = false;
      s.segmentStart = null;
    },

    toggle() {
      if (s.running) api.pause();
      else api.start();
    },

    /**
     * Nächster Schritt. Lief der Timer, läuft er beim nächsten Zeit-Schritt weiter;
     * ein Wiederholungs-Schritt hält an. Für „Fertig“ bei Wiederholungen: `next({run:true})`.
     * @param {{run?: boolean}} [options]
     * @returns {TimerEvent[]}
     */
    next({ run } = {}) {
      if (s.finished) return [];
      enterStep(s.index + 1, run ?? s.running);
      return s.finished ? [{ type: 'finished' }] : [];
    },

    prev() {
      if (s.finished) return;
      enterStep(Math.max(0, s.index - 1), false);
    },

    /** Restsekunden (aufgerundet) oder null bei Wiederholungs-Schritt/Ende. */
    remaining() {
      const step = current();
      if (s.finished || !isTimed(step)) return null;
      return Math.max(0, Math.ceil((step.duration * 1000 - elapsed()) / 1000));
    },

    snapshot() {
      const step = current();
      return {
        index: s.index,
        total: steps.length,
        step,
        running: s.running,
        finished: s.finished,
        remaining: api.remaining(),
        /** Fortschritt im aktuellen Schritt, 0…1 (Wiederholungs-Schritt: 0). */
        stepProgress: isTimed(step) ? Math.min(1, elapsed() / (step.duration * 1000)) : 0,
        nextWork: steps.slice(s.index + 1).find((x) => x.kind === 'work') ?? null,
      };
    },

    /** Zustand zum Speichern (z. B. bei Seitenwechsel). @returns {TimerState} */
    getState() {
      return { ...s };
    },
  };
  return api;
}

/* ---------------------------------------------------------- Programme */

/**
 * @typedef {object} HomePlanItem
 * @property {string} ex
 * @property {'time'|'reps'} mode
 * @property {number} [work]   Sekunden bei mode "time"
 * @property {number|string} [reps]
 * @property {number} rest
 * @property {number} sets
 * @property {string} [cue]
 * @property {string} [avoid_if]
 * @typedef {{name: string, items: HomePlanItem[]}} HomePlanBlock
 * @typedef {{id: string, name: string, minutes: number, blocks: HomePlanBlock[]}} HomePlan
 */

const SIDE_SWITCH = /Seite wechseln|Seite in der Hälfte/;
const SCAR_EXERCISE = /Narbenmobilisation/;
const CIRCUIT = /Zirkel|Runden/;

/** @param {HomePlanItem} it */
const hasSideSwitch = (it) => it.mode === 'time' && SIDE_SWITCH.test(it.cue ?? '');

/**
 * @param {HomePlanItem} it
 * @param {string} block
 * @returns {TimerStep}
 */
const workStep = (it, block) => ({
  kind: 'work',
  duration: it.mode === 'time' ? it.work ?? null : null,
  label: it.ex,
  block,
  cue: it.cue ?? '',
  avoid: it.avoid_if ?? '',
  reps: it.reps,
  sideSwitch: hasSideSwitch(it),
});

/**
 * @param {HomePlanItem} it
 * @param {string} block
 * @param {string} nextLabel
 * @returns {TimerStep}
 */
const restStep = (it, block, nextLabel) => ({ kind: 'rest', duration: it.rest, label: 'Pause', block, nextLabel });

/**
 * Heimplan → Schrittfolge.
 * - Blöcke mit „Zirkel“/„Runden“ laufen als echte Runden (alle Übungen, dann von vorn).
 * - Kurzversion: jede Übung einmal.
 * - Narbenmobilisation nur nach Kaiserschnitt.
 * @param {HomePlan} plan
 * @param {{short?: boolean, includeScar?: boolean}} [options]
 * @returns {TimerStep[]}
 */
export function buildProgram(plan, { short = false, includeScar = false } = {}) {
  /** @type {TimerStep[]} */
  const steps = [];
  for (const b of plan.blocks) {
    const items = b.items.filter((it) => includeScar || !SCAR_EXERCISE.test(it.ex));
    if (!items.length) continue;
    const setsOf = (it) => (short ? 1 : it.sets);

    if (CIRCUIT.test(b.name) && items.length > 1) {
      const base = b.name.replace(/\s*\(.*\)/, '');
      const rounds = Math.max(...items.map(setsOf));
      for (let r = 1; r <= rounds; r++) {
        const block = `${base} · Runde ${r} von ${rounds}`;
        items.forEach((it, k) => {
          if (r > setsOf(it)) return;
          steps.push(workStep(it, block));
          const next = k < items.length - 1 ? items[k + 1] : r < rounds ? items[0] : null;
          if (it.rest && next) steps.push(restStep(it, block, `Gleich: ${next.ex}`));
        });
      }
      continue;
    }

    items.forEach((it, k) => {
      const total = setsOf(it);
      for (let set = 1; set <= total; set++) {
        const block = total > 1 ? `${b.name} · Satz ${set} von ${total}` : b.name;
        steps.push(workStep(it, block));
        const last = set === total && k === items.length - 1;
        if (it.rest && !last) {
          const nextLabel = set < total ? `Gleich: ${it.ex} (Satz ${set + 1})` : `Gleich: ${items[k + 1].ex}`;
          steps.push(restStep(it, block, nextLabel));
        }
      }
    });
  }
  return steps;
}

/**
 * Gibt es eine Kurzversion (mindestens eine Übung mit mehreren Sätzen)?
 * @param {HomePlan} plan
 */
export const hasShortVersion = (plan) => plan.blocks.some((b) => b.items.some((it) => it.sets > 1));

/**
 * Ungefähre Dauer der Kurzversion.
 * @param {HomePlan} plan
 */
export const shortMinutes = (plan) => Math.max(5, Math.round(plan.minutes * 0.45));

/**
 * Einfache Satzpause im Live-Training.
 * @param {number} seconds
 * @returns {TimerStep[]}
 */
export const restProgram = (seconds) => [{ kind: 'rest', duration: seconds, label: 'Pause' }];
