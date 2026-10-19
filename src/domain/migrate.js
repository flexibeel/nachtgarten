/**
 * Übernahme der v1-Daten ("lab.*") ins v2-Modell ("ng2.*").
 *
 * - Nicht-destruktiv: v1-Schlüssel bleiben unverändert (Rückweg zu v1 möglich).
 * - Idempotent: läuft nur einmal (ng2.meta.migratedFromV1); bereits vorhandene
 *   v2-Bereiche werden nie überschrieben.
 * - Robust: kaputte oder unerwartete Werte werden übersprungen, nicht übernommen.
 * - Beispiel-Einträge aus v1 (Trainings mit ex:true, Beispiel-Abschlusskarte) entfallen,
 *   Beispiel-Personen bleiben markiert (example: true).
 *
 * `convertV1` ist rein (nur Daten rein, Daten raus), `migrateFromV1` schreibt über den Store.
 */

import { isDateKey } from '../core/dates.js';

/** @typedef {import('../core/store.js').Store} Store */
/** @typedef {import('../core/store.js').AreaName} AreaName */

/**
 * Alle v1-Schlüssel und wohin sie in v2 gehen.
 * @type {Readonly<Record<string, AreaName>>}
 */
export const LEGACY_KEYS = Object.freeze({
  'lab.profile': 'profile',
  'lab.name': 'profile',
  'lab.theme': 'settings',
  'lab.view': 'settings',
  'lab.startView': 'settings',
  'lab.rest': 'settings',
  'lab.timeOn': 'settings',
  'lab.lockTrain': 'settings',
  'lab.foci': 'settings',
  'lab.gear': 'gear',
  'lab.plans': 'plans',
  'lab.sched': 'schedule',
  'lab.tlog': 'sessions',
  'lab.hist': 'history',
  'lab.live': 'live',
  'lab.prs': 'prs',
  'lab.custom': 'exercises',
  'lab.favs': 'exercises',
  'lab.attach': 'exercises',
  'lab.step': 'exercises',
  'lab.repRange': 'exercises',
  'lab.rirLast': 'exercises',
  'lab.habit': 'habit',
  'lab.focus': 'focus', // ganz alte Fassung: Array = Schwerpunkte → settings.enabledModules
  'lab.dump': 'dump',
  'lab.feed': 'feed',
  'lab.queue': 'feed',
  'lab.feedDay': 'feed',
  'lab.feedReadDay': 'feed',
  'lab.people': 'people',
  'lab.igHist': 'account',
  'lab.igUnlock': 'account',
  'lab.redirects': 'redirects',
  'lab.buddy': 'buddy',
  'lab.buddyMeta': 'buddy',
  'lab.mama': 'mama',
  'lab.mamaSeen': 'mama',
  'lab.mamaSafetyOk': 'mama',
  'lab.ppCheck6': 'mama',
  'lab.ppCheck12': 'mama',
  'lab.metrics': 'metrics',
  'lab.lastCard': 'lastCard',
  'lab.likes': 'ideas',
  'lab.motto': 'motto',
});

const GOALS = ['Muskelaufbau', 'Kraft', 'Abnehmen', 'Fit bleiben', 'Ausdauer'];
const TONES = ['ruhig', 'motiv', 'frech'];
const START_VIEWS = ['heute', 'training', 'live'];

/* ------------------------------------------------------------ Helfer */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
const strArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : null);
/** Zahl aus Zahl oder Zahl-String ("72"), sonst null. */
const numOrNull = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return isNum(n) ? n : null;
};
const intIn = (v, lo, hi, fallback) => (isNum(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const rirOrNull = (v) => (isNum(v) && v >= 0 ? v : null);

/**
 * v1 schrieb JSON, außer bei "lab.theme" (roher String). Beides wird gelesen.
 * @param {string|undefined} raw
 */
function parse(raw) {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** v1-Messwerte {vor, nach, tv, tn} → v2 {before, after, timeBefore, timeAfter}. */
function convertMetricValues(vals) {
  if (!isObj(vals)) return null;
  const out = {};
  for (const [name, v] of Object.entries(vals)) {
    if (!isObj(v) || (v.vor == null && v.nach == null)) continue;
    out[name] = {
      before: v.vor == null ? null : String(v.vor),
      after: v.nach == null ? null : String(v.nach),
      timeBefore: v.tv ?? null,
      timeAfter: v.tn ?? null,
    };
  }
  return Object.keys(out).length ? out : null;
}

/** Muskelsätze eines v1-Eintrags: nur Zahlen. */
function muscleSets(sets) {
  if (!isObj(sets)) return {};
  return Object.fromEntries(Object.entries(sets).filter(([, n]) => isNum(n) && n > 0));
}

/* ------------------------------------------------------- Bereiche */

/** v1 kannte nur den Keimling; sein Name stand in "lab.buddy". */
function convertProfile(p, name, buddy) {
  if (!isObj(p)) return undefined;
  const n = str(p.name, str(name)).trim();
  const companionName = isObj(buddy) ? str(buddy.name).trim() : '';
  return {
    name: n === 'du' ? '' : n,
    goal: GOALS.includes(p.goal) ? p.goal : '',
    age: numOrNull(p.age),
    weight: numOrNull(p.weight),
    days: intIn(numOrNull(p.days), 1, 7, 3),
    companion: { species: 'keimling', name: companionName || 'Keimi' },
  };
}

/** v1-Schwerpunkte → v2-Module. Die Gewohnheit war in v1 immer sichtbar. */
function convertModules(foci) {
  if (!foci) return null;
  return [...new Set([...foci, 'habits'])];
}

function convertSettings(v) {
  const has = ['lab.theme', 'lab.view', 'lab.startView', 'lab.rest', 'lab.timeOn', 'lab.lockTrain', 'lab.foci', 'lab.focus']
    .some((k) => v[k] !== undefined);
  if (!has) return undefined;
  const legacyFoci = Array.isArray(v['lab.focus']) ? strArray(v['lab.focus']) : null;
  return {
    theme: v['lab.theme'] === 'light' || v['lab.theme'] === 'dark' ? v['lab.theme'] : 'system',
    view: v['lab.view'] === 'profi' ? 'profi' : 'einfach',
    startView: START_VIEWS.includes(v['lab.startView']) ? v['lab.startView'] : 'heute',
    restSeconds: intIn(v['lab.rest'], 15, 600, 90),
    timeTracking: v['lab.timeOn'] === true,
    lockDuringTraining: v['lab.lockTrain'] !== false,
    enabledModules: convertModules(strArray(v['lab.foci']) ?? legacyFoci),
    tileOrder: [],
  };
}

function convertPlans(plans) {
  if (!Array.isArray(plans)) return undefined;
  return plans
    .filter((p) => isObj(p) && typeof p.id === 'string' && Array.isArray(p.items))
    .map((p) => {
      const plan = {
        id: p.id,
        name: str(p.name, 'Mein Plan'),
        items: p.items
          .filter((it) => isObj(it) && typeof it.e === 'string')
          .map((it) => ({ exercise: it.e, sets: intIn(it.s, 1, 10, 3), reps: String(it.r ?? '') })),
      };
      if (p.ex) plan.example = true;
      return plan;
    });
}

function convertSchedule(sched) {
  if (!isObj(sched)) return undefined;
  const out = {};
  for (const [day, v] of Object.entries(sched)) {
    if (!/^[0-6]$/.test(day) || typeof v !== 'string' || !v) continue;
    out[day] = v.startsWith('act:') ? { kind: 'activity', id: v.slice(4) } : { kind: 'plan', id: v };
  }
  return out;
}

function convertSession(l, index) {
  const plan = str(l.plan);
  const kind = plan.startsWith('act:') ? 'activity' : plan.startsWith('mama:') ? 'homeplan' : 'strength';
  const planId = kind === 'activity' ? plan.slice(4) : kind === 'homeplan' ? plan.slice(5) : plan && plan !== 'live' ? plan : null;
  const sets = muscleSets(l.sets);
  const counted = kind === 'strength' ? Math.round(Object.values(sets).reduce((a, b) => a + b, 0)) : 0;
  const session = {
    id: `v1-${index}`,
    date: l.date,
    kind,
    planId,
    muscleSets: sets,
    setCount: isNum(l.n) ? l.n : counted,
  };
  if (typeof l.name === 'string') session.name = l.name;
  if (Array.isArray(l.exs)) session.exercises = strArray(l.exs);
  if (l.live) session.live = true;
  if (l.auto) session.autoFinished = true;
  if (isNum(l.dur)) session.durationMin = l.dur;
  if (isNum(l.km)) session.km = l.km;
  if (isNum(l.rpe)) session.rpe = l.rpe;
  const metrics = convertMetricValues(l.vals);
  if (metrics) session.metrics = metrics;
  return session;
}

function convertSessions(tlog) {
  if (!Array.isArray(tlog)) return undefined;
  return tlog
    .map((l, i) => [l, i])
    .filter(([l]) => isObj(l) && !l.ex && isDateKey(l.date))
    .map(([l, i]) => convertSession(l, i))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function convertHistory(hist) {
  if (!isObj(hist)) return undefined;
  const out = {};
  for (const [id, list] of Object.entries(hist)) {
    if (!Array.isArray(list)) continue;
    const records = list
      .filter((x) => isObj(x) && isDateKey(x.date) && isNum(x.w) && isNum(x.r))
      .map((x) => ({ date: x.date, weight: x.w, reps: x.r, rir: rirOrNull(x.rir), session: isNum(x.lv) ? x.lv : null }));
    if (records.length) out[id] = records;
  }
  return out;
}

function convertLive(live) {
  if (!isObj(live) || !isNum(live.start)) return undefined;
  const q = live.queue;
  return {
    start: live.start,
    sets: (Array.isArray(live.sets) ? live.sets : [])
      .filter((s) => isObj(s) && typeof s.e === 'string' && isNum(s.w) && isNum(s.r))
      .map((s) => {
        const set = { exercise: s.e, weight: s.w, reps: s.r, rir: rirOrNull(s.rir), at: isNum(s.t) ? s.t : live.start };
        if (s.a) set.attachment = String(s.a);
        if (s.h) set.height = String(s.h);
        return set;
      }),
    form: ['low', 'ok', 'high'].includes(live.form) ? live.form : null,
    queue: isObj(q) && Array.isArray(q.items)
      ? {
          planId: str(q.plan),
          name: str(q.name),
          items: q.items.filter((it) => isObj(it) && typeof it.e === 'string')
            .map((it) => ({ exercise: it.e, sets: intIn(it.s, 1, 10, 3), reps: String(it.r ?? '') })),
          index: intIn(q.i, 0, 999, 0),
        }
      : null,
    metrics: convertMetricValues(live.vals),
    legHintDismissed: !!live.legOk,
  };
}

function convertPrs(prs) {
  if (!Array.isArray(prs)) return undefined;
  return prs
    .filter((p) => isObj(p) && isDateKey(p.date) && typeof p.e === 'string' && isNum(p.w) && isNum(p.r))
    .map((p) => ({ date: p.date, exercise: p.e, weight: p.w, reps: p.r, session: isNum(p.lv) ? p.lv : null }));
}

function convertExercises(v) {
  const keys = ['lab.custom', 'lab.favs', 'lab.attach', 'lab.step', 'lab.repRange', 'lab.rirLast'];
  if (!keys.some((k) => v[k] !== undefined)) return undefined;
  const custom = (Array.isArray(v['lab.custom']) ? v['lab.custom'] : [])
    .filter((c) => isObj(c) && typeof c.id === 'string' && typeof c.n === 'string')
    .map((c) => {
      const ex = { id: c.id, name: c.n, gear: str(c.g, 'Eigenes'), muscles: strArray(c.m) ?? [], source: c.db ? 'db' : 'custom' };
      if (c.att) ex.attachment = String(c.att);
      return ex;
    });
  const prefs = {};
  const pref = (id) => (prefs[id] ??= {});
  if (isObj(v['lab.step'])) {
    for (const [id, step] of Object.entries(v['lab.step'])) if (isNum(step)) pref(id).step = step;
  }
  if (isObj(v['lab.repRange'])) {
    for (const [id, r] of Object.entries(v['lab.repRange'])) {
      if (Array.isArray(r) && r.length === 2 && r.every(isNum)) pref(id).repRange = [r[0], r[1]];
    }
  }
  if (isObj(v['lab.attach'])) {
    for (const [id, a] of Object.entries(v['lab.attach'])) {
      if (!isObj(a)) continue;
      if (a.a) pref(id).attachment = String(a.a);
      if (a.h) pref(id).height = String(a.h);
    }
  }
  return {
    custom,
    favorites: strArray(v['lab.favs']) ?? [],
    prefs,
    lastRir: intIn(v['lab.rirLast'], 0, 3, 2),
  };
}

function convertHabit(h) {
  if (!isObj(h)) return undefined;
  const days = {};
  if (isObj(h.days)) for (const [k, on] of Object.entries(h.days)) if (on && isDateKey(k)) days[k] = true;
  return { name: str(h.name, '10 Min. lesen'), anchor: typeof h.anchor === 'string' && h.anchor ? h.anchor : null, days };
}

function convertFocus(f) {
  if (!isObj(f)) return undefined;
  return { day: isDateKey(f.day) ? f.day : '', text: str(f.text), done: !!f.done };
}

function convertFeed(v) {
  const keys = ['lab.feed', 'lab.queue', 'lab.feedDay', 'lab.feedReadDay'];
  if (!keys.some((k) => v[k] !== undefined)) return undefined;
  const items = (Array.isArray(v['lab.feed']) ? v['lab.feed'] : [])
    .filter((f) => isObj(f) && typeof f.t === 'string')
    .map((f) => ({ title: f.t, source: str(f.s), tag: str(f.tag, 'Gespeichert'), read: !!f.read }));
  const queue = (Array.isArray(v['lab.queue']) ? v['lab.queue'] : [])
    .filter((q) => isObj(q) && typeof q.t === 'string')
    .map((q) => ({ title: q.t, source: str(q.s, 'Gespeichert') }));
  return {
    items,
    queue,
    day: isDateKey(v['lab.feedDay']) ? v['lab.feedDay'] : null,
    readDay: isDateKey(v['lab.feedReadDay']) ? v['lab.feedReadDay'] : null,
  };
}

function convertPeople(people) {
  if (!Array.isArray(people)) return undefined;
  return people
    .filter((p) => isObj(p) && typeof p.name === 'string' && isDateKey(p.last))
    .map((p) => (p.ex ? { name: p.name, lastContact: p.last, example: true } : { name: p.name, lastContact: p.last }));
}

function convertAccount(hist, unlock) {
  if (hist === undefined && unlock === undefined) return undefined;
  const days = {};
  if (isObj(hist)) {
    for (const [k, d] of Object.entries(hist)) {
      if (!isDateKey(k) || !isObj(d)) continue;
      days[k] = {
        tries: intIn(d.tries, 0, 1e6, 0),
        redirects: intIn(d.redirects, 0, 1e6, 0),
        used: intIn(d.used, 0, 1e6, 0),
        earned: intIn(d.earned, 0, 1e6, 0),
        earnKeys: strArray(d.why) ?? [],
      };
    }
  }
  return { days, unlock: isObj(unlock) && isNum(unlock.until) ? { until: unlock.until } : null };
}

function convertRedirects(r) {
  if (!isObj(r)) return undefined;
  return Object.fromEntries(Object.entries(r).filter(([k, n]) => isDateKey(k) && isNum(n)));
}

function convertBuddy(cfg, meta) {
  if (cfg === undefined && meta === undefined) return undefined;
  const c = isObj(cfg) ? cfg : {};
  const m = isObj(meta) ? meta : {};
  return {
    tone: TONES.includes(c.tone) ? c.tone : 'motiv',
    on: c.on !== false,
    maxStage: intIn(m.max, 1, 4, 1),
    lastVisit: isDateKey(m.last) ? m.last : null,
    backDay: isDateKey(m.backDay) ? m.backDay : null,
    backShown: !!m.backShown,
  };
}

function convertMama(v) {
  const m = v['lab.mama'];
  if (!isObj(m)) return undefined;
  return {
    mode: m.mode === 'post' ? 'post' : 'preg',
    date: isDateKey(m.date) ? m.date : '',
    cesarean: !!m.cs,
    seenPhase: typeof v['lab.mamaSeen'] === 'string' ? v['lab.mamaSeen'] : null,
    safetyOk: v['lab.mamaSafetyOk'] === true,
    check6: v['lab.ppCheck6'] === true,
    check12: v['lab.ppCheck12'] === true,
  };
}

function convertMetrics(ms) {
  if (!Array.isArray(ms)) return undefined;
  return ms
    .filter((m) => isObj(m) && typeof m.name === 'string' && m.name.trim())
    .map((m) => {
      const out = { name: m.name, unit: str(m.unit) };
      if (isNum(m.lo)) out.lo = m.lo;
      if (isNum(m.hi)) out.hi = m.hi;
      return out;
    });
}

function convertCard(c) {
  if (!isObj(c) || c.sample || typeof c.title !== 'string') return undefined;
  return {
    title: c.title,
    date: str(c.date),
    minutes: isNum(c.mins) ? c.mins : null,
    sets: isNum(c.sets) ? c.sets : 0,
    reps: isNum(c.reps) ? c.reps : null,
    volume: isNum(c.vol) ? c.vol : null,
    muscles: muscleSets(c.mus),
    items: (Array.isArray(c.items) ? c.items : []).filter(isObj).map((it) => ({
      name: str(it.n),
      gear: str(it.g),
      sets: (Array.isArray(it.sets) ? it.sets : []).filter(isObj).map((s) => ({ weight: isNum(s.w) ? s.w : null, reps: s.r ?? null })),
      pr: !!it.pr,
    })),
  };
}

/* --------------------------------------------------------- Öffentlich */

/**
 * Rohe v1-Einträge → v2-Bereiche. Nur Bereiche mit v1-Daten sind im Ergebnis.
 * @param {Record<string, string>} raw   Schlüssel "lab.*" → gespeicherter String
 * @returns {Partial<Record<AreaName, unknown>>}
 */
export function convertV1(raw) {
  /** @type {Record<string, any>} */
  const v = {};
  for (const [k, value] of Object.entries(raw)) v[k] = parse(value);

  const focus = v['lab.focus'];
  const data = {
    profile: convertProfile(v['lab.profile'], v['lab.name'], v['lab.buddy']),
    settings: convertSettings(v),
    gear: strArray(v['lab.gear']) ?? undefined,
    plans: convertPlans(v['lab.plans']),
    schedule: convertSchedule(v['lab.sched']),
    sessions: convertSessions(v['lab.tlog']),
    history: convertHistory(v['lab.hist']),
    live: convertLive(v['lab.live']),
    prs: convertPrs(v['lab.prs']),
    exercises: convertExercises(v),
    habit: convertHabit(v['lab.habit']),
    focus: Array.isArray(focus) ? undefined : convertFocus(focus),
    dump: strArray(v['lab.dump']) ?? undefined,
    feed: convertFeed(v),
    people: convertPeople(v['lab.people']),
    account: convertAccount(v['lab.igHist'], v['lab.igUnlock']),
    redirects: convertRedirects(v['lab.redirects']),
    buddy: convertBuddy(v['lab.buddy'], v['lab.buddyMeta']),
    mama: convertMama(v),
    metrics: convertMetrics(v['lab.metrics']),
    lastCard: convertCard(v['lab.lastCard']),
    ideas: strArray(v['lab.likes']) ? { likes: strArray(v['lab.likes']) } : undefined,
    motto: typeof v['lab.motto'] === 'string' && v['lab.motto'].trim() ? v['lab.motto'] : undefined,
  };
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

/**
 * @typedef {{status:'done', areas: AreaName[]} | {status:'already'} | {status:'nothing'}} MigrationResult
 */

/**
 * Einmalige Übernahme beim Start. Schreibt nur Bereiche, die es in v2 noch nicht gibt.
 * @param {Store} store
 * @param {{now?: number}} [options]
 * @returns {MigrationResult}
 */
export function migrateFromV1(store, { now = Date.now() } = {}) {
  const meta = store.meta.get();
  const stamp = new Date(now).toISOString();
  if (meta.migratedFromV1) return { status: 'already' };

  const legacy = store.readLegacy();
  if (!Object.keys(legacy).length) {
    if (!store.meta.exists()) store.meta.set({ ...meta, createdAt: stamp });
    return { status: 'nothing' };
  }

  const converted = convertV1(legacy);
  /** @type {AreaName[]} */
  const areas = [];
  for (const [area, value] of Object.entries(converted)) {
    const a = /** @type {AreaName} */ (area);
    if (store[a].exists()) continue;
    store[a].set(value);
    areas.push(a);
  }
  store.meta.set({ ...meta, createdAt: meta.createdAt ?? stamp, migratedFromV1: stamp });
  return { status: 'done', areas };
}
