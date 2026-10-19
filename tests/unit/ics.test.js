import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ICS_FILENAME, buildWeeklyCalendar, escapeText, eventsFromSchedule, firstOccurrence, foldLine, icsDuration, parseTime,
} from '../../src/domain/ics.js';

const NOW = Date.UTC(2026, 9, 19, 10, 30, 5);
const enc = new TextEncoder();

/** Physische Zeilen (ohne letztes leeres Element). */
const physical = (ics) => ics.split('\r\n').slice(0, -1);
/** Faltung rückgängig machen (RFC 5545, 3.1). */
const unfold = (ics) => ics.replace(/\r\n /g, '').split('\r\n').slice(0, -1);
/** Werte einer Eigenschaft (Name ggf. mit Parametern) aus entfalteten Zeilen. */
const props = (lines, name) => lines.filter((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));

/** Grundlegende Gültigkeit, die jede erzeugte Datei erfüllen muss. */
function assertValid(ics) {
  assert.ok(ics.endsWith('\r\n'), 'endet mit CRLF');
  assert.ok(!/[^\r]\n/.test(ics), 'kein LF ohne CR');
  assert.ok(!/\r(?!\n)/.test(ics), 'kein CR ohne LF');
  for (const line of physical(ics)) assert.ok(enc.encode(line).length <= 75, `Zeile zu lang: ${line}`);
  const lines = unfold(ics);
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines.at(-1), 'END:VCALENDAR');
  assert.ok(lines.includes('VERSION:2.0'));
  assert.ok(props(lines, 'PRODID').length === 1);
  const stack = [];
  for (const l of lines) {
    if (l.startsWith('BEGIN:')) stack.push(l.slice(6));
    if (l.startsWith('END:')) assert.equal(stack.pop(), l.slice(4), 'BEGIN/END passen zusammen');
  }
  assert.equal(stack.length, 0);
  return lines;
}

/** Inhalt der einzelnen VEVENTs. */
const vevents = (lines) => {
  const out = [];
  let cur = null;
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') cur = [];
    else if (l === 'END:VEVENT') {
      out.push(cur);
      cur = null;
    } else if (cur) cur.push(l);
  }
  return out;
};

const events = [
  { weekday: 0, title: 'Training: Oberkörper', description: 'Bankdrücken, Rudern; danach dehnen\nViel Spaß', uid: 'ng2-training-mo@nachtgarten' },
  { weekday: 3, title: 'Laufen', uid: 'ng2-training-th@nachtgarten' },
];

test('Escaping von Backslash, Semikolon, Komma und Zeilenumbruch', () => {
  assert.equal(escapeText('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
  assert.equal(escapeText('Beine: Kniebeugen'), 'Beine: Kniebeugen', 'Doppelpunkt bleibt');
});

test('Faltung bei 75 Oktetten, ohne UTF-8-Zeichen zu zerteilen', () => {
  const ascii = `SUMMARY:${'x'.repeat(200)}`;
  const folded = foldLine(ascii);
  const parts = folded.split('\r\n');
  assert.equal(parts[0].length, 75);
  assert.ok(parts.slice(1).every((p) => p.startsWith(' ') && enc.encode(p).length <= 75));
  assert.equal(folded.replace(/\r\n /g, ''), ascii);

  const umlauts = `DESCRIPTION:${'ä'.repeat(100)}`; // 2 Oktette je Zeichen
  const f2 = foldLine(umlauts);
  for (const p of f2.split('\r\n')) {
    assert.ok(enc.encode(p).length <= 75);
    assert.ok(!p.includes('�'));
  }
  assert.equal(f2.replace(/\r\n /g, ''), umlauts);
  assert.equal(foldLine('KURZ:1'), 'KURZ:1');
  const emoji = foldLine(`X:${'💪'.repeat(40)}`);
  assert.equal(emoji.replace(/\r\n /g, ''), `X:${'💪'.repeat(40)}`);
});

test('Dauer-Werte', () => {
  assert.equal(icsDuration(0), 'PT0M');
  assert.equal(icsDuration(30), 'PT30M');
  assert.equal(icsDuration(60), 'PT1H');
  assert.equal(icsDuration(90), 'PT1H30M');
  assert.equal(icsDuration(1440), 'P1D');
  assert.equal(icsDuration(1500), 'P1DT1H');
});

test('Uhrzeit prüfen', () => {
  assert.deepEqual(parseTime('7:05'), { hours: 7, minutes: 5 });
  assert.deepEqual(parseTime('23:59'), { hours: 23, minutes: 59 });
  assert.throws(() => parseTime('24:00'), RangeError);
  assert.throws(() => parseTime('18.30'), RangeError);
});

test('erster Termin am oder nach dem Startdatum', () => {
  assert.equal(firstOccurrence('2026-10-19', 0), '2026-10-19');
  assert.equal(firstOccurrence('2026-10-21', 0), '2026-10-26');
  assert.equal(firstOccurrence('2026-12-30', 4), '2027-01-01');
});

test('Termine mit Uhrzeit: TZID Europe/Berlin, VTIMEZONE, RRULE, Erinnerung', () => {
  const ics = buildWeeklyCalendar({ events, startDate: '2026-10-21', now: NOW, time: '18:30', durationMinutes: 75, alarmMinutesBefore: 30 });
  const lines = assertValid(ics);
  assert.equal(props(lines, 'BEGIN').filter((l) => l === 'BEGIN:VTIMEZONE').length, 1);
  assert.ok(lines.includes('TZID:Europe/Berlin'));
  assert.ok(lines.includes('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU'));

  const [mo, th] = vevents(lines);
  assert.ok(mo.includes('UID:ng2-training-mo@nachtgarten'));
  assert.ok(mo.includes('DTSTAMP:20261019T103005Z'));
  assert.ok(mo.includes('DTSTART;TZID=Europe/Berlin:20261026T183000'), 'Montag nach dem Start');
  assert.ok(mo.includes('DTEND;TZID=Europe/Berlin:20261026T194500'));
  assert.ok(mo.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'));
  assert.ok(mo.includes('SUMMARY:Training: Oberkörper'));
  assert.ok(mo.includes('DESCRIPTION:Bankdrücken\\, Rudern\\; danach dehnen\\nViel Spaß'));
  assert.ok(mo.includes('TRIGGER:-PT30M'));
  assert.ok(mo.includes('ACTION:DISPLAY'));
  assert.ok(th.includes('DTSTART;TZID=Europe/Berlin:20261022T183000'));
  assert.ok(th.includes('RRULE:FREQ=WEEKLY;BYDAY=TH'));
  assert.equal(props(th, 'DESCRIPTION').filter((l) => !l.startsWith('DESCRIPTION:Laufen')).length, 0, 'nur Alarm-Text');
});

test('Termin über Mitternacht endet am Folgetag', () => {
  const ics = buildWeeklyCalendar({ events: [events[1]], startDate: '2026-12-31', now: NOW, time: '23:30', durationMinutes: 60 });
  const [ev] = vevents(assertValid(ics));
  assert.ok(ev.includes('DTSTART;TZID=Europe/Berlin:20261231T233000'));
  assert.ok(ev.includes('DTEND;TZID=Europe/Berlin:20270101T003000'));
});

test('Wanduhrzeit bleibt über die Zeitumstellung gleich', () => {
  // Start in der Woche der Umstellung; die Uhrzeit wird nicht in UTC umgerechnet
  const ics = buildWeeklyCalendar({ events: [{ weekday: 6, title: 'Yoga', uid: 'u' }], startDate: '2026-10-19', now: NOW, time: '09:00' });
  const [ev] = vevents(assertValid(ics));
  assert.ok(ev.includes('DTSTART;TZID=Europe/Berlin:20261025T090000'));
});

test('ohne Uhrzeit: ganztägig, keine VTIMEZONE, ohne Erinnerung kein VALARM', () => {
  const ics = buildWeeklyCalendar({ events, startDate: '2026-10-19', now: NOW });
  const lines = assertValid(ics);
  assert.ok(!lines.includes('BEGIN:VTIMEZONE'));
  assert.ok(!lines.includes('BEGIN:VALARM'));
  const [mo] = vevents(lines);
  assert.ok(mo.includes('DTSTART;VALUE=DATE:20261019'));
  assert.ok(mo.includes('DTEND;VALUE=DATE:20261020'));
});

test('ganztägig über Schalttag', () => {
  const ics = buildWeeklyCalendar({ events: [{ weekday: 3, title: 'X', uid: 'x' }], startDate: '2024-02-26', now: NOW });
  const [ev] = vevents(assertValid(ics));
  assert.ok(ev.includes('DTSTART;VALUE=DATE:20240229'));
  assert.ok(ev.includes('DTEND;VALUE=DATE:20240301'));
});

test('Erinnerung 0 Minuten und lange Texte bleiben gültig', () => {
  const long = { weekday: 1, title: `Training: ${'Ganzkörper mit Übungen, Pausen; '.repeat(6)}`, description: 'ü'.repeat(120), uid: 'x' };
  const ics = buildWeeklyCalendar({ events: [long], startDate: '2026-10-19', now: NOW, time: '07:00', alarmMinutesBefore: 0, calendarName: 'Mein, Plan' });
  const lines = assertValid(ics);
  assert.ok(lines.includes('X-WR-CALNAME:Mein\\, Plan'));
  const [ev] = vevents(lines);
  assert.ok(ev.includes('TRIGGER:-PT0M'));
  assert.ok(physical(ics).length > lines.length, 'es wurde gefaltet');
});

test('leerer Plan ergibt gültigen, leeren Kalender', () => {
  const lines = assertValid(buildWeeklyCalendar({ events: [], startDate: '2026-10-19', now: NOW }));
  assert.equal(vevents(lines).length, 0);
});

test('Termine aus dem Wochenplan, sortiert, mit stabiler UID', () => {
  const schedule = {
    4: { kind: 'activity', id: 'run' },
    0: { kind: 'plan', id: 'ok' },
    2: { kind: 'plan', id: 'weg' },
    6: { kind: 'activity', id: 'unbekannt' },
    9: { kind: 'plan', id: 'ok' },
  };
  const list = eventsFromSchedule(schedule, {
    plan: (id) => (id === 'ok' ? { name: 'Oberkörper', description: 'Bankdrücken' } : undefined),
    activity: (id) => (id === 'run' ? 'Laufen' : undefined),
  });
  assert.deepEqual(list, [
    { weekday: 0, uid: 'ng2-training-mo@nachtgarten', title: 'Training: Oberkörper', description: 'Bankdrücken' },
    { weekday: 4, uid: 'ng2-training-fr@nachtgarten', title: 'Laufen' },
  ]);
  assert.match(ICS_FILENAME, /\.ics$/);
});
