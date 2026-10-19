/**
 * Nachtgarten – Teilen: Daten für die Bildvorlagen (reine Funktionen, ohne Canvas).
 * Deutsche Formatierung, Kennzahlen, Mondphase und die Vorschläge nach dem Training.
 *
 * Lauf:  { type:'lauf', title, place, start, distanceM, durationS, elevationM?, avgHr?,
 *          route:[[lat,lon],…], splits?:[s/km,…], edition?, garden?:{count}, pr?:{label, value, unit} }
 * Kraft: { type:'kraft', title, start, durationS, edition?, garden?:{count},
 *          exercises:[{ name, muscles:['quads','glutes'] | {quads:1}, pr?:boolean,
 *                       sets:[{reps, kg?, sec?}] }] }
 */

// ───────────────────────────── Formatierung (deutsch) ─────────────────────────────

const nf = (min, max) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max });
const NF = { 0: nf(0, 0), 1: nf(1, 1), 2: nf(2, 2), n1: nf(0, 1) };

/** 7420 m → "7,42" (ab 100 km eine Nachkommastelle). */
export function fmtKm(meters) {
  const km = Math.max(0, Number(meters) || 0) / 1000;
  return (km >= 100 ? NF[1] : NF[2]).format(km);
}
/** Ganze Zahl mit Tausenderpunkt: 8640 → "8.640". */
export const fmtInt = (n) => NF[0].format(Math.round(Number(n) || 0));
/** Gewicht: 22.5 → "22,5", 100 → "100". */
export const fmtKg = (n) => NF.n1.format(Number(n) || 0);
/** Sekunden → "41:18" bzw. "1:02:05". */
export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
/** Sekunden pro km → "5:34". */
export function fmtPace(secPerKm) {
  const s = Math.round(Number(secPerKm) || 0);
  if (!(s > 0) || s > 5999) return '–';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export const toDate = (d) => (d instanceof Date ? d : new Date(d || Date.now()));
/** "Sonntag, 19. Oktober 2026" */
export const fmtDateLong = (d) => new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(d));
/** "19. Oktober 2026" */
export const fmtDate = (d) => new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(d));
/** "18:42" */
export const fmtTime = (d) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(toDate(d));
/** "19.10.26" */
export const fmtDateShort = (d) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(toDate(d));
/** "Oktober" */
export const fmtMonth = (d) => new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(toDate(d));
/** Grad mit Minuten, wie auf einer Sternkarte: 53.5683 → "53° 34′ N" */
export function fmtCoord(value, pos, neg) {
  const v = Math.abs(value);
  let deg = Math.floor(v);
  let min = Math.round((v - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}° ${String(min).padStart(2, '0')}′ ${value >= 0 ? pos : neg}`;
}

// ───────────────────────────── Mond ─────────────────────────────

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // bekannter Neumond

/** Mondphase 0…1 (0 Neumond, 0,5 Vollmond) zum Zeitpunkt d. */
export function moonPhase(d) {
  const days = (toDate(d).getTime() - NEW_MOON_REF) / 86400000;
  const p = (days / SYNODIC) % 1;
  return p < 0 ? p + 1 : p;
}
/** Beleuchteter Anteil 0…1. */
export const moonLight = (phase) => (1 - Math.cos(2 * Math.PI * phase)) / 2;
/** Name der Phase, ruhig formuliert. */
export function moonName(phase) {
  const names = ['Neumond', 'zunehmende Sichel', 'erstes Viertel', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'letztes Viertel', 'abnehmende Sichel'];
  return names[Math.round(phase * 8) % 8];
}

// ───────────────────────────── Kennzahlen ─────────────────────────────

/** Tempo je Kilometer in s/km. Nimmt run.splits, sonst gleichmäßig aus Zeit/Distanz. */
export function paceProfile(run) {
  if (Array.isArray(run.splits) && run.splits.length) return run.splits.map(Number).filter((s) => s > 0);
  const km = (run.distanceM || 0) / 1000;
  if (!(km > 0) || !(run.durationS > 0)) return [];
  const p = run.durationS / km;
  return Array.from({ length: Math.max(1, Math.round(km)) }, () => p);
}

/** Gewicht der Muskeln aus einer Übung: Array → erster 1, weitere 0,6; Objekt → wie angegeben. */
export function muscleWeights(ex) {
  if (Array.isArray(ex.muscles)) return Object.fromEntries(ex.muscles.map((m, i) => [m, i === 0 ? 1 : 0.6]));
  return ex.muscles || {};
}

/**
 * Kennzahlen eines Krafttrainings. top = schwerster Satz der Hauptübung (Bestwert, sonst erste Übung mit Gewicht).
 * load: je Muskel 0…1 (relativ zum meistbelasteten Muskel).
 */
export function summarizeStrength(workout) {
  let volume = 0; let sets = 0; let reps = 0; let top = null;
  const raw = {};
  const prs = [];
  for (const ex of workout.exercises || []) {
    let exVol = 0;
    let exTop = null;
    for (const s of ex.sets || []) {
      const r = Number(s.reps) || 0;
      const kg = Number(s.kg) || 0;
      sets += 1; reps += r;
      // Ohne Gewicht (Körpergewicht, Halten) zählt die Arbeit trotzdem – sonst bliebe der Muskel leer.
      exVol += (r || (Number(s.sec) || 0) / 3) * (kg || 12);
      volume += r * kg;
      if (kg > 0 && (!exTop || kg > exTop.kg || (kg === exTop.kg && r > exTop.reps))) exTop = { name: ex.name, kg, reps: r };
    }
    // Hauptübung: ein Bestwert zählt zuerst, sonst die erste Übung mit Gewicht (meist die Grundübung).
    if (exTop && (!top || (ex.pr && !top.pr))) top = { ...exTop, pr: !!ex.pr };
    if (ex.pr) {
      const best = (ex.sets || []).reduce((b, s) => (!b || (s.kg || 0) > (b.kg || 0) ? s : b), null);
      prs.push({ name: ex.name, kg: best ? best.kg || 0 : 0, reps: best ? best.reps || 0 : 0 });
    }
    for (const [m, w] of Object.entries(muscleWeights(ex))) raw[m] = (raw[m] || 0) + exVol * w;
  }
  const max = Math.max(0, ...Object.values(raw));
  const load = {};
  for (const [m, v] of Object.entries(raw)) load[m] = max ? Math.round((v / max) * 100) / 100 : 0;
  return { volume, sets, reps, top, load, prs };
}

/**
 * Sätze einer Übung, so kurz wie möglich:
 *  gleich       → "3 × 8" + "100 kg"
 *  Wdh. wechseln → "10 · 8 · 6" + "80 kg"
 *  alles wechselt → "8 · 8 · 6" + "100 · 100 · 105 kg"
 *  ohne Gewicht → "3 × 12" + "Körpergewicht";  Halten → "3 × 45 s"
 * @returns {{reps: string, load: string}}
 */
export function setsText(ex) {
  const sets = ex.sets || [];
  if (!sets.length) return { reps: '', load: '' };
  const isTime = sets.every((s) => !s.reps && s.sec);
  const reps = sets.map((s) => (isTime ? `${fmtInt(s.sec)}` : fmtInt(s.reps)));
  const kgs = sets.map((s) => Number(s.kg) || 0);
  const sameReps = reps.every((r) => r === reps[0]);
  const sameKg = kgs.every((k) => k === kgs[0]);
  const unit = isTime ? ' s' : '';
  const repText = sameReps ? `${sets.length} × ${reps[0]}${unit}` : `${reps.join(' · ')}${unit}`;
  let load;
  if (kgs.every((k) => k === 0)) load = ex.bodyweight === false ? '' : 'Körpergewicht';
  else if (sameKg) load = `${fmtKg(kgs[0])} kg`;
  else load = `${kgs.map(fmtKg).join(' · ')} kg`;
  if (ex.perSide && load) load += ' je Seite';
  return { reps: repText, load };
}

/**
 * Sätze in einer Zeile (für kompakte Listen):
 *  "3 × 8 · 100 kg", "10 · 10 · 8 · bis 85 kg", "3 × 10" (ohne Gewicht), "3 × 45 s".
 */
export function setsCompact(ex) {
  const t = setsText(ex);
  if (!t.reps) return '';
  const kgs = (ex.sets || []).map((s) => Number(s.kg) || 0);
  const max = Math.max(0, ...kgs);
  if (!max) return t.reps;
  const same = kgs.every((k) => k === kgs[0]);
  return `${t.reps} · ${same ? '' : 'bis '}${fmtKg(max)} kg`;
}

/** Lesbare Namen der Muskeln. */
export const MUSCLE_NAMES = {
  chest: 'Brust', abs: 'Bauch', back: 'Rücken', lowerback: 'unterer Rücken', shoulders: 'Schultern',
  biceps: 'Bizeps', triceps: 'Trizeps', forearms: 'Unterarme', quads: 'Beine vorn',
  hams: 'Beine hinten', glutes: 'Po', calves: 'Waden',
};

/** Muskelnamen einer Übung, z. B. "Beine vorn · Po". */
export function musclesText(ex, max = 2) {
  return Object.entries(muscleWeights(ex)).sort((a, b) => b[1] - a[1]).slice(0, max)
    .map(([m]) => MUSCLE_NAMES[m] || m).join(' · ');
}

/**
 * Einheitliche Sicht auf Lauf oder Kraft: eine Heldenzahl und höchstens zwei
 * bis drei Nebenwerte (nie mehr als drei Zahlen pro Bild).
 * focus 'bestwert' macht den Bestwert zur Heldenzahl.
 */
export function facts(data, focus) {
  const when = data.start || data.date;
  const edition = data.edition ? `Nr. ${data.edition} · ` : '';
  if (data.type === 'kraft') {
    const s = summarizeStrength(data);
    const stats = [
      { value: fmtInt(s.sets), label: s.sets === 1 ? 'Satz' : 'Sätze' },
      { value: fmtInt((data.durationS || 0) / 60), unit: 'min', label: 'Dauer' },
    ];
    let hero = { value: fmtInt(s.volume), unit: 'kg', label: 'Kilogramm bewegt' };
    if (focus === 'bestwert' && s.prs.length) {
      const pr = s.prs[0];
      hero = { value: fmtKg(pr.kg), unit: 'kg', label: `Bestwert ${pr.name}` };
      stats[0] = { value: fmtInt(s.volume), unit: 'kg', label: 'bewegt' };
    }
    return { hero, stats, title: data.title || 'Krafttraining', line: `${edition}${fmtDateLong(when)}`, summary: s };
  }
  const km = (data.distanceM || 0) / 1000;
  const stats = [
    { value: fmtDuration(data.durationS), label: 'Zeit' },
    { value: fmtPace(km ? data.durationS / km : 0), unit: '/km', label: 'Tempo' },
  ];
  if (Number.isFinite(data.elevationM)) stats.push({ value: fmtInt(data.elevationM), unit: 'm', label: 'Anstieg' });
  let hero = { value: fmtKm(data.distanceM), unit: 'km', label: 'Kilometer' };
  if (focus === 'bestwert' && data.pr) {
    hero = { value: data.pr.value, unit: data.pr.unit || '', label: data.pr.label };
    stats[0] = { value: fmtKm(data.distanceM), unit: 'km', label: 'Distanz' };
  }
  return { hero, stats, title: data.title || 'Lauf', line: `${edition}${fmtDateLong(when)} · ${fmtTime(when)}` };
}

// ───────────────────────────── Vorschläge nach dem Training ─────────────────────────────

/** Tageslicht → Thema: abends und nachts dunkel, tagsüber hell. */
export function themeFor(d) {
  const h = toDate(d).getHours();
  return h >= 18 || h < 7 ? 'dunkel' : 'hell';
}

/** Schwankung des Tempos (Variationskoeffizient). */
export function paceVariation(run) {
  const p = paceProfile(run);
  if (p.length < 2) return 0;
  const mean = p.reduce((a, b) => a + b, 0) / p.length;
  const sd = Math.sqrt(p.reduce((a, b) => a + (b - mean) ** 2, 0) / p.length);
  return sd / mean;
}

/**
 * Drei bis vier fertige Vorschläge nach einer Einheit, nach Passung sortiert –
 * wie bei Strava zum Durchwischen. Jeder Vorschlag nennt seinen Grund.
 * @returns {Array<{template: string, name: string, reason: string, score: number,
 *   opts: {theme: string, transparent?: boolean, detail: 'kompakt'|'detailliert', focus?: string, format?: string}}>}
 */
export function suggestCards(session, { max = 4 } = {}) {
  const theme = themeFor(session.start || session.date);
  const out = [];
  const add = (template, name, reason, score, opts = {}) => out.push({ template, name, reason, score, opts: { theme, detail: 'kompakt', ...opts } });
  const garden = session.garden && session.garden.count;
  const gardenMilestone = garden && garden % 5 === 0;

  if (session.type === 'kraft') {
    const s = summarizeStrength(session);
    const n = (session.exercises || []).length;
    if (s.prs.length) add('typo', 'Bestwert', `Neuer Bestwert: ${s.prs[0].name} ${fmtKg(s.prs[0].kg)} kg`, 100, { focus: 'bestwert' });
    add('kraft', 'Programmheft', 'Alles auf einem Bild – jede Übung, jeder Satz', n >= 4 ? 92 : 62, { detail: 'detailliert' });
    add('kraft', 'Körperbeet', 'Wo du trainiert hast, blüht es', 80);
    add('stempel', 'Briefmarke', garden ? `Dein Garten: ${garden} ${garden === 1 ? 'Einheit' : 'Einheiten'} im ${fmtMonth(session.start)}` : 'Ein Gruß aus dem Garten', gardenMilestone ? 88 : 66);
    if (!s.prs.length) add('typo', 'Plakat', 'Nur die Zahl, groß', 55);
  } else {
    const km = (session.distanceM || 0) / 1000;
    const hasRoute = (session.route || []).length > 8;
    if (session.pr) add('typo', 'Bestwert', `Neuer Bestwert: ${session.pr.label}`, 100, { focus: 'bestwert' });
    if (hasRoute) add('sticker', 'Fürs Foto', 'Zum Kopieren über dein Foto', 86, { transparent: true, theme: 'dunkel' });
    if (hasRoute) add('sternbild', 'Sternbild', km >= 10 ? 'Eine lange Runde – sie wird zum Sternbild' : 'Deine Runde als Sternbild', km >= 10 ? 95 : 82);
    if (paceProfile(session).length >= 3) add('welle', 'Tempo-Welle', paceVariation(session) > 0.03 ? 'Dein Tempo hatte schöne Wellen' : 'Gleichmäßig wie ein ruhiger See', paceVariation(session) > 0.03 ? 78 : 64);
    add('stempel', 'Briefmarke', garden ? `Dein Garten: ${garden} ${garden === 1 ? 'Einheit' : 'Einheiten'} im ${fmtMonth(session.start)}` : 'Ein Gruß aus dem Garten', gardenMilestone ? 88 : 66);
    if (!session.pr) add('typo', 'Plakat', 'Nur die Zahl, groß', 58);
  }
  out.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return out.filter((s) => {
    const k = `${s.template}:${s.opts.detail}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, Math.max(3, Math.min(4, max)));
}
