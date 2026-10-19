import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHash } from '../../src/core/router.js';
import { oppositeTheme, resolveTheme } from '../../src/ui/theme.js';
import { applyKey } from '../../src/ui/numpad.js';
import { stepValue } from '../../src/ui/stepper.js';
import { ringDash } from '../../src/ui/ring.js';
import { neighbourStep, onboardingSteps } from '../../src/features/onboarding/steps.js';
import { startViewOptions } from '../../src/features/settings/controls.js';
import { createMamaState, validateMamaInput } from '../../src/domain/pregnancy.js';

const TABLE = { routes: ['heute', 'training', 'live', 'fokus'], aliases: { umlenken: 'fokus' }, fallback: 'heute' };

test('Router: Direktsprünge, Aliase, Parameter, Unbekanntes', () => {
  assert.deepEqual(resolveHash('#training', TABLE), { name: 'training', params: {} });
  assert.deepEqual(resolveHash('#/LIVE', TABLE), { name: 'live', params: {} });
  assert.deepEqual(resolveHash('#umlenken', TABLE), { name: 'fokus', params: { via: 'umlenken' } });
  assert.deepEqual(resolveHash('#live?plan=ok', TABLE), { name: 'live', params: { plan: 'ok' } });
  assert.deepEqual(resolveHash('', TABLE), { name: 'heute', params: {} });
  assert.deepEqual(resolveHash('#quatsch', TABLE), { name: 'heute', params: {} });
});

test('Design: System folgt dem Gerät, Schnellschalter wechselt das Sichtbare', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(oppositeTheme('system', true), 'light');
  assert.equal(oppositeTheme('light', true), 'dark');
});

test('Zahlenfeld: Tasten, Komma, Nachkommastellen, Länge', () => {
  const type = (keys, decimals = 1) => keys.reduce((t, k) => applyKey(t, k, decimals), '');
  assert.equal(type(['4', '2', ',', '5']), '42,5');
  assert.equal(type([',', '5']), '0,5');
  assert.equal(type(['4', ',', '5', '5']), '4,5', 'nur eine Nachkommastelle');
  assert.equal(type(['4', ','], 0), '4', 'ohne Nachkommastellen kein Komma');
  assert.equal(type(['0', '7']), '7', 'keine führende Null');
  assert.equal(type(['1', '2', 'back']), '1');
  assert.equal(type(['1', 'clear']), '');
  assert.equal(type(['1', '1', '1', '1', '1', '1', '1', '1', '1']).length, 7);
});

test('Stepper und Ring', () => {
  assert.equal(stepValue(2.5, 1.25, { min: 0, max: 10, decimals: 2 }), 3.75);
  assert.equal(stepValue(0, -1, { min: 0, max: 10 }), 0);
  assert.equal(stepValue(10, 1, { min: 0, max: 10 }), 10);
  const r = ringDash(0.5, 10);
  assert.ok(Math.abs(r.dash - Math.PI * 10) < 1e-9);
  assert.equal(ringDash(2, 10).dash, ringDash(1, 10).length);
  assert.equal(ringDash(Number.NaN, 10).dash, 0);
});

test('Onboarding-Schritte je nach Modulen', () => {
  assert.deepEqual(onboardingSteps(['train', 'habits']), ['hello', 'modules', 'goal', 'days', 'gear', 'companion']);
  assert.deepEqual(onboardingSteps(['mama', 'handy']), ['hello', 'modules', 'mama', 'companion']);
  assert.deepEqual(onboardingSteps(['train', 'mama']), ['hello', 'modules', 'mama', 'goal', 'days', 'gear', 'companion']);
  const steps = onboardingSteps(['habits']);
  assert.equal(neighbourStep(steps, 'hello', -1), 'hello');
  assert.equal(neighbourStep(steps, 'modules', 1), 'companion');
  assert.equal(neighbourStep(steps, 'companion', 1), null);
});

test('Startansicht: nur erreichbare Ziele', () => {
  assert.deepEqual(startViewOptions(['train']), ['heute', 'training', 'live']);
  assert.deepEqual(startViewOptions(['mama']), ['heute', 'live']);
  assert.deepEqual(startViewOptions(['habits', 'handy']), ['heute']);
});

test('Schwangerschaft & Rückbildung: Eingabe prüfen', () => {
  const today = '2026-10-19';
  assert.deepEqual(validateMamaInput({ mode: 'preg', date: '' }, today), { ok: false, error: 'mama.noDate' });
  assert.deepEqual(validateMamaInput({ mode: 'preg', date: '2027-02-10' }, today), { ok: true });
  assert.deepEqual(validateMamaInput({ mode: 'preg', date: '2027-08-01' }, today), { ok: false, error: 'mama.dueTooFar' });
  assert.deepEqual(validateMamaInput({ mode: 'preg', date: '2026-08-01' }, today), { ok: false, error: 'mama.dueLongPast' });
  assert.deepEqual(validateMamaInput({ mode: 'preg', date: '2026-09-20' }, today), { ok: true }, 'überfällig bis 6 Wochen');
  assert.deepEqual(validateMamaInput({ mode: 'post', date: '2026-10-20' }, today), { ok: false, error: 'mama.birthInFuture' });
  assert.deepEqual(validateMamaInput({ mode: 'post', date: '2025-09-01' }, today), { ok: false, error: 'mama.birthTooOld' });
  assert.deepEqual(validateMamaInput({ mode: 'post', date: '2026-09-01' }, today), { ok: true });
  assert.equal(createMamaState({ mode: 'preg', date: '2027-02-10', cesarean: true }).cesarean, false, 'Kaiserschnitt nur nach der Geburt');
  assert.equal(createMamaState({ mode: 'post', date: '2026-09-01', cesarean: true, safetyOk: true }).cesarean, true);
});
