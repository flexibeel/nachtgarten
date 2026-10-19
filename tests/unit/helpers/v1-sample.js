/**
 * Realistische v1-Daten, so wie src/app.html (v1) sie in localStorage schreibt:
 * jeder Wert JSON-kodiert, nur "lab.theme" als roher String.
 */

const t = (iso) => new Date(iso).getTime();
const LIVE_START = t('2026-10-19T17:40:00+02:00');

export const V1_VALUES = {
  'lab.name': 'Felix',
  'lab.profile': { name: 'Felix', goal: 'Muskelaufbau', age: 34, weight: '', days: 4 },
  'lab.gear': ['Körpergewicht', 'Kurzhanteln', 'Kabelzug', 'Maschinen'],
  'lab.plans': [
    { id: 'ok', name: 'Oberkörper', ex: true, items: [{ e: 'bench', s: 3, r: '8–10' }, { e: 'row1', s: 3, r: '10' }] },
    { id: 'p1760000000000', name: 'Push', items: [{ e: 'chestpress', s: 4, r: 10 }, { e: 'k_ropepush', s: 3, r: '12' }, { e: 42 }] },
    { name: 'kaputt ohne id', items: [] },
  ],
  'lab.sched': { 0: 'ok', 2: 'p1760000000000', 4: 'act:run', 7: 'ok', 5: '' },
  'lab.tlog': [
    { date: '2026-10-12', plan: 'ok', sets: { chest: 3, triceps: 1.5, shoulders: 1.5, back: 3, biceps: 1.5 }, ex: true },
    { date: '2026-10-13', plan: 'ok', sets: { chest: 3, triceps: 1.5, shoulders: 1.5 }, n: 3, name: 'Oberkörper' },
    { date: '2026-10-14', plan: 'live', sets: { chest: 2, triceps: 1, biceps: 1 }, live: true },
    { date: '2026-10-15', plan: 'act:run', sets: {}, act: true, dur: 35, km: 6.2, rpe: 6, vals: { Blutzucker: { vor: '110', nach: '92', tv: '18:01', tn: '18:50' } } },
    { date: '2026-10-16', plan: 'mama:b1', sets: {}, act: true },
    { date: '2026-10-11', plan: 'p1760000000000', sets: { chest: 4, triceps: 2 }, live: true, n: 7, exs: ['chestpress', 'k_ropepush'], name: 'Brust & Trizeps', auto: true, vals: { Puls: { vor: null, nach: null } } },
    { date: 'gestern', plan: 'ok', sets: {} },
    null,
  ],
  'lab.hist': {
    bench: [{ date: '2026-10-13', w: 60, r: 10 }, { date: '2026-10-19', w: 62.5, r: 9, rir: 2, lv: LIVE_START }],
    chestpress: [{ date: '2026-10-11', w: 45, r: 10, rir: null }, { date: 'x', w: 1, r: 1 }, { date: '2026-10-11', w: '50', r: 8 }],
    leer: [],
  },
  'lab.live': {
    start: LIVE_START,
    sets: [{ e: 'bench', w: 62.5, r: 9, t: LIVE_START + 300000, rir: 2 }, { e: 'k_row', w: 40, r: 12, t: LIVE_START + 600000, a: 'V-Griff', h: 'mittel' }],
    form: 'high',
    queue: { plan: 'ok', name: 'Oberkörper', items: [{ e: 'bench', s: 3, r: '8–10' }, { e: 'row1', s: 3, r: '10' }], i: 1 },
    vals: { Puls: { vor: '64', nach: null, tv: '17:39', tn: null } },
    legOk: 1,
    _budEnd: 1,
  },
  'lab.prs': [{ date: '2026-10-19', e: 'bench', w: 62.5, r: 9, lv: LIVE_START }, { date: '2026-10-13', e: 'bench', w: 60, r: 10 }],
  'lab.custom': [
    { id: 'c1759000000000', n: 'Glute-Maschine Studio', m: ['glutes'], g: 'Eigenes' },
    { id: 'db12', n: 'Alternate Hammer Curl', g: 'Kurzhanteln', m: ['biceps', 'forearms'], att: '', db: true },
  ],
  'lab.favs': ['latpull', 'chestpress', 'press', 'c1759000000000'],
  'lab.attach': { k_row: { a: 'V-Griff', h: 'mittel' } },
  'lab.step': { chestpress: 5, lat: 1 },
  'lab.repRange': { bench: [6, 10], kaputt: [1] },
  'lab.rirLast': 2,
  'lab.habit': { name: '10 Min. lesen', days: { '2026-10-18': true, '2026-10-19': true, nix: true }, anchor: 'nach dem Frühstück' },
  'lab.focus': { day: '2026-10-19', text: 'Exposé fertig', done: false },
  'lab.foci': ['train', 'handy', 'mama'],
  'lab.dump': ['Oma anrufen', 'Laufschuhe'],
  'lab.feed': [
    { t: 'Warum wir uns an kurze Videos gewöhnen', s: 'Artikel · 8 Min.', tag: 'Beispiel', read: true },
    { t: 'Podcast über Langeweile', s: 'Gespeichert', tag: 'Gespeichert', read: false },
  ],
  'lab.queue': [{ t: 'Rezept Linsencurry', s: 'Gespeichert' }],
  'lab.feedDay': '2026-10-19',
  'lab.feedReadDay': '2026-10-19',
  'lab.people': [
    { name: 'Tim', last: '2026-09-07', ex: true },
    { name: 'Mama', last: '2026-10-17' },
  ],
  'lab.igHist': {
    '2026-10-18': { tries: 4, redirects: 2, used: 10, earned: 10, why: ['kontakt0', 'kontakt1'] },
    '2026-10-19': { tries: 1, redirects: 0, used: 0, earned: 15, why: ['training'] },
  },
  'lab.igUnlock': { until: t('2026-10-19T20:10:00+02:00') },
  'lab.redirects': { '2026-10-12': 3, '2026-10-19': 2 },
  'lab.lockTrain': false,
  'lab.buddy': { name: 'Keimi', tone: 'frech', on: true },
  'lab.buddyMeta': { max: 3, last: '2026-10-19', backDay: '2026-10-10', backShown: true },
  'lab.mama': { mode: 'post', date: '2026-08-01', cs: true },
  'lab.mamaSeen': 'pp1',
  'lab.mamaSafetyOk': true,
  'lab.ppCheck6': true,
  'lab.metrics': [{ name: 'Blutzucker', unit: 'mg/dl', lo: 70, hi: 180 }, { name: 'Puls', unit: '' }, { name: '' }],
  'lab.view': 'profi',
  'lab.startView': 'live',
  'lab.rest': 120,
  'lab.timeOn': true,
  'lab.motto': 'Weniger scrollen, mehr erleben.',
  'lab.likes': ['feed', 'gate', 'training'],
  'lab.lastCard': {
    title: 'Brust & Trizeps', date: '2026-10-11', mins: null, sets: 7, reps: 70, vol: 3150, mus: { chest: 4, triceps: 2 },
    items: [{ n: 'Brustpresse', g: 'Maschinen', sets: [{ w: 45, r: 10 }], pr: true }], hr: { avg: 120, max: 150 },
  },
};

/** Rohe localStorage-Einträge. */
export function v1Raw(values = V1_VALUES) {
  const raw = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)]));
  raw['lab.theme'] = 'light';
  return raw;
}

export { LIVE_START };
