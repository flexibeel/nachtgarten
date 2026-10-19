/**
 * Start eines Heimplans (SPEC 3.13.4): einmalig Sicherheitshinweise bestätigen, vor dem
 * Belastungstest die Laufkriterien, dann Komplett oder Kurz – danach öffnet der Player.
 */

import { STRESS_TEST_PLAN } from '../../domain/homeplans.js';
import { hasShortVersion, shortMinutes } from '../../domain/timer.js';
import { MAMA } from '../../data/homeplans.js';
import { haptic } from '../../core/platform.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { openSheet } from '../../ui/sheet.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../../domain/homeplans.js').Plan} Plan */

/**
 * Sheet mit Auswahl; löst mit dem Wert der gewählten Möglichkeit auf, null beim Schließen.
 * @param {{title: string, content: Node[], choices: {label: string, sub?: string, value: string, primary?: boolean}[], className?: string}} options
 * @returns {Promise<string|null>}
 */
function choiceSheet({ title, content, choices, className }) {
  return new Promise((resolve) => {
    let result = /** @type {string|null} */ (null);
    const buttons = choices.map((c) =>
      h(
        'button',
        { type: 'button', class: ['button', c.primary ? 'button-primary' : 'button-quiet', 'button-wide', c.sub && 'button-two-line'], 'data-choice': c.value },
        h('span', { class: 'button-main', text: c.label }),
        c.sub ? h('span', { class: 'button-sub', text: c.sub }) : null,
      ),
    );
    const sheet = openSheet({ title, content, actions: h('div', { class: 'choice-actions' }, buttons), className, onClose: () => resolve(result) });
    buttons.forEach((b, i) =>
      b.addEventListener('click', () => {
        haptic('select');
        result = choices[i].value;
        sheet.close('choice');
      }),
    );
  });
}

const list = (items) => h('ul', { class: 'safety-list' }, items.map((s) => h('li', { text: s })));

/**
 * @param {AppContext} ctx
 * @param {Plan} plan
 * @param {{from?: 'mama'|'training'}} [options]
 */
export async function startHomePlan(ctx, plan, { from = 'mama' } = {}) {
  const { store } = ctx;
  const isMama = from === 'mama';

  if (isMama && !store.mama.get()?.safetyOk) {
    const ok = await choiceSheet({
      title: t('mama.beforeTitle'),
      className: 'mama-before',
      content: [h('p', { class: 'sheet-text', text: t('mama.disclaimer') }), h('p', { class: 'setting-label', text: t('mama.stopNow') }), list(tList('mama.stopSigns'))],
      choices: [{ label: t('mama.beforeOk'), value: 'ok', primary: true }],
    });
    if (ok !== 'ok') return;
    store.mama.update((m) => (m ? { ...m, safetyOk: true } : m));
  }

  if (plan.id === STRESS_TEST_PLAN) {
    const criteria = MAMA.phases.find((p) => p.return_to_running_criteria)?.return_to_running_criteria ?? [];
    const ok = await choiceSheet({
      title: t('mama.testTitle'),
      content: [h('p', { class: 'sheet-text', text: t('mama.testText') }), list(criteria)],
      choices: [
        { label: t('mama.testNo'), value: 'no' },
        { label: t('mama.testOk'), value: 'ok', primary: true },
      ],
    });
    if (ok !== 'ok') return;
  }

  let short = false;
  if (hasShortVersion(plan)) {
    const length = await choiceSheet({
      title: t('mama.lengthTitle'),
      className: 'mama-length',
      content: [h('p', { class: 'sheet-text', text: plan.name })],
      choices: [
        { label: t('mama.lengthFull'), sub: t('mama.lengthFullSub', { minutes: plan.minutes }), value: 'full', primary: true },
        { label: t('mama.lengthShort'), sub: t('mama.lengthShortSub', { minutes: shortMinutes(plan) }), value: 'short' },
      ],
    });
    if (!length) return;
    short = length === 'short';
  }

  store.player.set(null);
  ctx.go('player', { params: { plan: plan.id, ...(short ? { kurz: '1' } : {}), von: from } });
}
