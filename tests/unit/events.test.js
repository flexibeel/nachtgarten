import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmitter } from '../../src/core/events.js';

test('on/emit/off', () => {
  const e = createEmitter();
  const got = [];
  const off = e.on('a', (p) => got.push(p));
  assert.equal(e.emit('a', 1), 1);
  off();
  assert.equal(e.emit('a', 2), 0);
  assert.deepEqual(got, [1]);
});

test('once wird nur einmal zugestellt', () => {
  const e = createEmitter();
  let n = 0;
  e.once('x', () => n++);
  e.emit('x');
  e.emit('x');
  assert.equal(n, 1);
});

test('Fehler eines Abonnenten stoppen die anderen nicht', () => {
  const errors = [];
  const e = createEmitter({ onError: (err, topic) => errors.push([err.message, topic]) });
  let reached = false;
  e.on('t', () => {
    throw new Error('kaputt');
  });
  e.on('t', () => {
    reached = true;
  });
  assert.equal(e.emit('t'), 2);
  assert.ok(reached);
  assert.deepEqual(errors, [['kaputt', 't']]);
});

test('Abmelden während der Zustellung ist sicher; clear entfernt alles', () => {
  const e = createEmitter();
  const calls = [];
  const offB = e.on('t', () => calls.push('b'));
  e.on('t', () => {
    calls.push('a');
    offB();
  });
  e.emit('t');
  e.emit('t');
  assert.deepEqual(calls, ['b', 'a', 'a']);
  e.clear();
  assert.equal(e.emit('t'), 0);
  e.on('u', () => {});
  e.clear('u');
  assert.equal(e.emit('u'), 0);
});

test('Listener muss eine Funktion sein', () => {
  assert.throws(() => createEmitter().on('a', null), TypeError);
});
