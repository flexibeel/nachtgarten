import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_ITEMS, earnsToday, isFinished, markRead, postpone, rollover, save, unreadCount } from '../../src/domain/feed.js';

const item = (title, read = false) => ({ title, source: 'Artikel', tag: 'Gespeichert', read });
const q = (title) => ({ title, source: 'Gespeichert' });
const feed = (extra = {}) => ({ items: [], queue: [], day: '2026-10-18', readDay: null, ...extra });

test('erster Start vermerkt nur den Tag', () => {
  const f = rollover(feed({ day: null, queue: [q('a')] }), '2026-10-19');
  assert.equal(f.day, '2026-10-19');
  assert.deepEqual(f.items, []);
  assert.equal(f.queue.length, 1);
});

test('gleicher Tag: nichts passiert', () => {
  const f = feed({ day: '2026-10-19', queue: [q('a')] });
  assert.equal(rollover(f, '2026-10-19'), f);
});

test('Tageswechsel: Ungelesenes bleibt, bis drei auffüllen, Gelesenes weg', () => {
  const f = feed({ items: [item('alt gelesen', true), item('alt offen')], queue: [q('n1'), q('n2'), q('n3')] });
  const r = rollover(f, '2026-10-19');
  assert.deepEqual(r.items.map((i) => i.title), ['alt offen', 'n1', 'n2']);
  assert.deepEqual(r.queue.map((i) => i.title), ['n3']);
  assert.ok(r.items.slice(1).every((i) => i.tag === 'Gespeichert' && !i.read));
  assert.equal(r.items.length, DAILY_ITEMS);
});

test('Tageswechsel mit mehr als drei Ungelesenen nimmt nichts nach', () => {
  const f = feed({ items: [item('1'), item('2'), item('3'), item('4')], queue: [q('n')] });
  const r = rollover(f, '2026-10-19');
  assert.equal(r.items.length, 4);
  assert.equal(r.queue.length, 1);
});

test('Tageswechsel über Jahresgrenze und nach Pause', () => {
  const r = rollover(feed({ day: '2026-12-31', queue: [q('a')] }), '2027-01-01');
  assert.equal(r.items.length, 1);
  const later = rollover(feed({ day: '2026-10-01', queue: [q('a'), q('b')] }), '2026-10-19');
  assert.equal(later.items.length, 2, 'eine Woche Pause füllt nicht mehrfach auf');
});

test('lesen, auf morgen, speichern', () => {
  let f = feed({ items: [item('a'), item('b')] });
  f = markRead(f, 0, '2026-10-19');
  assert.equal(f.items[0].read, true);
  assert.equal(f.readDay, '2026-10-19');
  assert.equal(markRead(f, 9, '2026-10-19'), f);
  f = postpone(f, 1);
  assert.deepEqual(f.items.map((i) => i.title), ['a']);
  assert.deepEqual(f.queue, [{ title: 'b', source: 'Artikel' }]);
  assert.equal(postpone(f, 5), f);
  f = save(f, '  Podcast über Langeweile ');
  assert.deepEqual(f.queue.at(-1), { title: 'Podcast über Langeweile', source: 'Gespeichert' });
  assert.equal(save(f, '   '), f);
});

test('fertig und Gutschrift nur am Lesetag', () => {
  const done = feed({ items: [item('a', true)], readDay: '2026-10-19' });
  assert.equal(unreadCount(done), 0);
  assert.equal(isFinished(done), true);
  assert.equal(earnsToday(done, '2026-10-19'), true);
  assert.equal(earnsToday(done, '2026-10-20'), false);
  assert.equal(isFinished(feed()), false, 'leerer Feed zählt nicht');
  assert.equal(earnsToday(feed({ items: [item('a')], readDay: '2026-10-19' }), '2026-10-19'), false);
});
