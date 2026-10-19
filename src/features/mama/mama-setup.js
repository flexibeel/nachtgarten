/**
 * Angaben für Schwangerschaft & Rückbildung: schwanger oder entbunden, Datum,
 * Kaiserschnitt, Sicherheitshinweise mit Bestätigung. Für Onboarding und Profil.
 */

import { createMamaState, mamaStatus, validateMamaInput } from '../../domain/pregnancy.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h, uid } from '../../ui/dom.js';
import { segmented } from '../../ui/chips.js';
import { switchRow } from '../../ui/fields.js';
import { icon } from '../../ui/icons.js';
import { statusLabel } from './status.js';

/** @typedef {import('../../core/store.js').MamaState} MamaState */

/**
 * @typedef {object} MamaForm
 * @property {HTMLElement} el
 * @property {() => ({ok: true, state: MamaState} | {ok: false, error: string})} result
 * @property {() => boolean} touched   wurde etwas eingegeben?
 */

/**
 * Sicherheitsblock: Hinweis, aufklappbare Warnzeichen.
 * @returns {HTMLElement}
 */
export function mamaSafetyNotice() {
  return h(
    'div',
    { class: 'safety' },
    h('p', { class: 'safety-text', text: t('mama.disclaimer') }),
    h(
      'details',
      { class: 'safety-details' },
      h('summary', { class: 'safety-summary' }, h('span', { text: t('mama.stopTitle') }), icon('chevronDown', { size: 18 })),
      h('ul', { class: 'safety-list' }, tList('mama.stopSigns').map((s) => h('li', { text: s }))),
    ),
  );
}

/**
 * @param {{initial: MamaState|null, today: string, onChange?: () => void}} options
 * @returns {MamaForm}
 */
export function mamaForm({ initial, today, onChange }) {
  let mode = initial?.mode ?? 'preg';
  let date = initial?.date ?? '';
  let cesarean = initial?.cesarean ?? false;
  let safetyOk = initial?.safetyOk ?? false;
  let touched = false;
  const changed = () => {
    touched = true;
    error.textContent = '';
    onChange?.();
  };

  const dateId = uid('mama-date');
  const dateLabel = h('label', { class: 'field-label', for: dateId });
  const dateInput = h('input', { id: dateId, class: 'input', type: 'date', value: date });
  dateInput.value = date;
  const statusLine = h('p', { class: 'field-hint mama-status', 'aria-live': 'polite' });
  const error = h('p', { class: 'field-error', role: 'alert' });

  const cesareanRow = switchRow({
    label: t('mama.cesarean'),
    hint: t('mama.cesareanHint'),
    checked: cesarean,
    onChange: (v) => {
      cesarean = v;
      changed();
    },
  });

  const paint = () => {
    dateLabel.textContent = t(mode === 'preg' ? 'mama.dueDate' : 'mama.birthDate');
    dateInput.max = mode === 'post' ? today : '';
    cesareanRow.hidden = mode !== 'post';
    const check = validateMamaInput({ mode, date }, today);
    const status = check.ok ? mamaStatus(createMamaState({ mode, date }), today) : null;
    statusLine.textContent = status ? t('mama.today', { status: statusLabel(status) }) : '';
  };

  const modeControl = segmented({
    label: t('mama.mode'),
    options: [
      { value: 'preg', label: t('mama.preg') },
      { value: 'post', label: t('mama.post') },
    ],
    value: mode,
    onChange: (v) => {
      mode = /** @type {'preg'|'post'} */ (v);
      changed();
      paint();
    },
  });
  modeControl.classList.add('segmented-tall');

  dateInput.addEventListener('input', () => {
    date = dateInput.value;
    changed();
    paint();
  });

  const safetyRow = switchRow({
    label: t('mama.safetyOk'),
    hint: t('mama.safetyOkHint'),
    checked: safetyOk,
    onChange: (v) => {
      safetyOk = v;
      changed();
    },
  });

  const el = h(
    'div',
    { class: 'mama-form' },
    modeControl,
    h('div', { class: 'field' }, dateLabel, dateInput, statusLine),
    cesareanRow,
    mamaSafetyNotice(),
    safetyRow,
    error,
  );
  paint();

  return {
    el,
    touched: () => touched || !!date,
    result() {
      const check = validateMamaInput({ mode, date }, today);
      if (!check.ok) {
        error.textContent = t(check.error);
        return check;
      }
      if (!safetyOk) {
        error.textContent = t('mama.safetyMissing');
        return { ok: false, error: 'mama.safety' };
      }
      return { ok: true, state: { ...createMamaState({ mode, date, cesarean, safetyOk }), seenPhase: initial?.seenPhase ?? null } };
    },
  };
}
