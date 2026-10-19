/**
 * Wochenplan als Kalender-Datei (iCalendar, RFC 5545).
 *
 * Entscheidungen (siehe docs/ARCHITECTURE.md):
 * - Termine mit Uhrzeit tragen TZID=Europe/Berlin und eine mitgelieferte VTIMEZONE.
 *   So bleibt 18:00 auch nach der Zeitumstellung 18:00, und Kalender, die keine
 *   „schwebende“ Zeit kennen, rechnen trotzdem richtig. Ohne Uhrzeit: ganztägig.
 * - Pro Wochentag ein wiederkehrender Termin (RRULE FREQ=WEEKLY;BYDAY=..).
 * - UID je Wochentag stabil: erneuter Import aktualisiert statt zu verdoppeln.
 * - CRLF-Zeilenenden, Faltung bei 75 Oktetten (UTF-8, ohne Zeichen zu zerteilen),
 *   Textwerte mit Escapes für \ ; , und Zeilenumbruch.
 */

import { addDays, parseKey, weekdayIdx } from '../core/dates.js';

/** @typedef {import('../core/store.js').Schedule} Schedule */

export const TZID = 'Europe/Berlin';
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const CRLF = '\r\n';
const MAX_OCTETS = 75;

const VTIMEZONE_BERLIN = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const encoder = new TextEncoder();

/**
 * TEXT-Wert escapen (RFC 5545, 3.3.11).
 * @param {string} value
 */
export function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Inhaltszeile auf höchstens 75 Oktette je physischer Zeile falten.
 * Folgezeilen beginnen mit einem Leerzeichen (zählt mit).
 * @param {string} line
 * @returns {string}
 */
export function foldLine(line) {
  const parts = [];
  let current = '';
  let octets = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (octets + size > MAX_OCTETS) {
      parts.push(current);
      current = ' ';
      octets = 1;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF);
}

/** @param {number} n @param {number} [len] */
const pad = (n, len = 2) => String(n).padStart(len, '0');

/** @param {string} key */
const icsDate = (key) => {
  const { year, month, day } = parseKey(key);
  return `${pad(year, 4)}${pad(month)}${pad(day)}`;
};

/** @param {number} ms */
const icsUtc = (ms) => {
  const d = new Date(ms);
  return (
    `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
};

/**
 * Dauer als ICS-Wert, z. B. 90 → "PT1H30M", 1440 → "P1D".
 * @param {number} totalMinutes  ≥ 0
 */
export function icsDuration(totalMinutes) {
  const m = Math.round(totalMinutes);
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  let out = 'P';
  if (days) out += `${days}D`;
  if (hours || mins || !days) {
    out += 'T';
    if (hours) out += `${hours}H`;
    if (mins || !hours) out += `${mins}M`;
  }
  return out;
}

/**
 * "18:30" → {hours:18, minutes:30}; ungültig → wirft.
 * @param {string} time
 */
export function parseTime(time) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(time));
  if (!m) throw new RangeError(`Ungültige Uhrzeit: ${time}`);
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

/**
 * Lokale Wanduhrzeit + Minuten (über Mitternacht hinweg) als "YYYYMMDDTHHMMSS".
 * @param {string} key
 * @param {number} minutesOfDay
 */
const localStamp = (key, minutesOfDay) => {
  const dayShift = Math.floor(minutesOfDay / 1440);
  const rest = minutesOfDay - dayShift * 1440;
  return `${icsDate(addDays(key, dayShift))}T${pad(Math.floor(rest / 60))}${pad(rest % 60)}00`;
};

/**
 * Erster Termin am oder nach `startDate` an diesem Wochentag.
 * @param {string} startDate
 * @param {number} weekday  0 = Mo
 */
export function firstOccurrence(startDate, weekday) {
  return addDays(startDate, (weekday - weekdayIdx(startDate) + 7) % 7);
}

/**
 * @typedef {object} WeeklyEvent
 * @property {number} weekday     0 = Montag
 * @property {string} title
 * @property {string} [description]
 * @property {string} uid
 */

/**
 * @typedef {object} CalendarOptions
 * @property {WeeklyEvent[]} events
 * @property {string} startDate              Datumsschlüssel, ab dem die Termine gelten
 * @property {number} now                    für DTSTAMP
 * @property {string|null} [time]            "HH:MM"; ohne Uhrzeit ganztägig
 * @property {number} [durationMinutes]      Standard 60
 * @property {number|null} [alarmMinutesBefore]  Erinnerung; null = keine
 * @property {string} [calendarName]
 */

/**
 * @param {CalendarOptions} options
 * @returns {string}
 */
export function buildWeeklyCalendar({
  events,
  startDate,
  now,
  time = null,
  durationMinutes = 60,
  alarmMinutesBefore = null,
  calendarName = 'Nachtgarten Training',
}) {
  const start = time ? parseTime(time) : null;
  const startMinutes = start ? start.hours * 60 + start.minutes : 0;
  const duration = Math.max(1, Math.round(durationMinutes));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nachtgarten//Training v2//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  if (start) lines.push(`X-WR-TIMEZONE:${TZID}`, ...VTIMEZONE_BERLIN);

  for (const ev of events) {
    const first = firstOccurrence(startDate, ev.weekday);
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${icsUtc(now)}`);
    if (start) {
      lines.push(
        `DTSTART;TZID=${TZID}:${localStamp(first, startMinutes)}`,
        `DTEND;TZID=${TZID}:${localStamp(first, startMinutes + duration)}`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(first)}`, `DTEND;VALUE=DATE:${icsDate(addDays(first, 1))}`);
    }
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[ev.weekday]}`, `SUMMARY:${escapeText(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    lines.push('TRANSP:OPAQUE');
    if (alarmMinutesBefore != null && alarmMinutesBefore >= 0) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(ev.title)}`,
        `TRIGGER:-${icsDuration(alarmMinutesBefore)}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/**
 * Wochenplan → Termine. Namen kommen über Nachschlage-Funktionen herein.
 * @param {Schedule} schedule
 * @param {object} names
 * @param {(id: string) => {name: string, description?: string}|undefined} names.plan
 * @param {(id: string) => string|undefined} names.activity
 * @returns {WeeklyEvent[]}
 */
export function eventsFromSchedule(schedule, names) {
  return Object.entries(schedule)
    .map(([day, slot]) => ({ weekday: Number(day), slot }))
    .filter(({ weekday }) => weekday >= 0 && weekday <= 6)
    .sort((a, b) => a.weekday - b.weekday)
    .flatMap(({ weekday, slot }) => {
      const uid = `ng2-training-${BYDAY[weekday].toLowerCase()}@nachtgarten`;
      if (slot.kind === 'activity') {
        const name = names.activity(slot.id);
        return name ? [{ weekday, uid, title: name }] : [];
      }
      const plan = names.plan(slot.id);
      if (!plan) return [];
      return [{ weekday, uid, title: `Training: ${plan.name}`, description: plan.description }];
    });
}

export const ICS_FILENAME = 'nachtgarten-wochenplan.ics';
