/**
 * Pläne finden und wählen: „Plan für mich finden“ (vier Taps), Plankarten mit drei Fakten,
 * „Warum dieser Plan?“ und Woche als Tages-Chips, „Alle Pläne“ zum Stöbern.
 * Plan-Inhalte (Name, Begründung, Quellen) stehen auf Deutsch in data/plans.js.
 */

import { haptic } from '../../core/platform.js';
import { PLAN_TEMPLATES, SOURCES } from '../../data/plans.js';
import { libraryIdFor } from '../../data/plan-exercise-map.js';
import { t, tList } from '../../data/texts/i18n.js';
import { WIZARD_OPTIONS, WIZARD_STEPS, adoptTemplate, experienceGuess, sessionChip, wizardResults } from '../../domain/plan-wizard.js';
import { sessionById, templateMinutes, validatePlan, weekOf } from '../../domain/plan-select.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../../data/plans.js').PlanTemplate} PlanTemplate */

/**
 * Plan übernehmen und Wochenplan belegen.
 * @param {AppContext} ctx
 * @param {PlanTemplate} plan
 * @param {(string|null)[]} week
 */
export function choosePlan(ctx, plan, week) {
  const { store } = ctx;
  const previous = store.settings.get().activePlan?.template ?? null;
  const r = adoptTemplate(plan, { week, plans: store.plans.get(), schedule: store.schedule.get(), previous }, libraryIdFor);
  store.plans.set(r.plans);
  store.schedule.set(r.schedule);
  store.settings.update((s) => ({ ...s, activePlan: { template: plan.id, days: r.days } }));
  store.profile.update((p) => (p ? { ...p, days: r.days } : p));
  haptic('success');
  toast(t('plans.chosen', { name: plan.name }));
}

/**
 * Woche als sieben Chips (Mo … So).
 * @param {PlanTemplate} plan
 * @param {(string|null)[]} week
 */
function weekChips(plan, week) {
  const days = tList('weekday.short');
  return h('ol', { class: 'plan-week', 'aria-label': t('plans.week') },
    week.map((id, i) => {
      const s = id ? sessionById(plan, id) : null;
      return h('li', { class: ['plan-day', s && 'is-on'], 'aria-label': s ? `${days[i]}: ${s.name}` : t('plans.restDay', { day: days[i] }) },
        h('span', { class: 'plan-day-name', text: days[i] }),
        h('span', { class: 'plan-day-label', text: s ? sessionChip(s) : '' }),
      );
    }));
}

/**
 * Plankarte.
 * @param {AppContext} ctx
 * @param {{plan: PlanTemplate, days?: number, week?: (string|null)[], reason?: string, notes?: string[]}} item
 * @param {() => void} onChosen
 */
export function planCard(ctx, { plan, days, week, reason, notes = [] }, onChosen) {
  const d = days ?? plan.daysPerWeek;
  const w = week ?? weekOf(plan, { days: d });
  const { min, max } = templateMinutes(plan);
  const minutes = min === max ? `${max}` : `${min}–${max}`;
  const infos = validatePlan(plan, { week: w, runDays: plan.runDays }).issues.filter((i) => i.level === 'info');
  const active = ctx.store.settings.get().activePlan?.template === plan.id;
  const take = h('button', { type: 'button', class: ['button', active ? 'button-quiet' : 'button-primary', 'button-wide'], text: t(active ? 'plans.active' : 'plans.take') });
  take.addEventListener('click', () => {
    choosePlan(ctx, plan, w);
    onChosen();
  });
  return h('article', { class: 'plan-card' },
    h('h3', { class: 'plan-card-name', text: plan.name }),
    h('p', { class: 'plan-card-short', text: plan.short }),
    h('ul', { class: 'plan-facts' },
      h('li', { class: 'plan-fact', text: t('plans.perWeek', { days: d }) }),
      h('li', { class: 'plan-fact', text: t('plans.minutes', { minutes }) }),
      h('li', { class: 'plan-fact', text: plan.focusLabel }),
    ),
    reason ? h('p', { class: 'plan-reason', text: reason }) : h('p', { class: 'plan-reason', text: plan.forWhom }),
    weekChips(plan, w),
    [...notes, ...infos.map((i) => i.text)].map((n) => h('p', { class: 'plan-note' }, icon('info', { size: 16 }), h('span', { text: n }))),
    h('details', { class: 'plan-why' },
      h('summary', { class: 'plan-why-summary' }, h('span', { text: t('plans.why') }), icon('chevronDown', { size: 18 })),
      h('div', { class: 'plan-why-body' },
        h('p', { text: plan.why }),
        h('p', { class: 'plan-small', text: plan.evidence }),
        h('p', { class: 'plan-small' }, h('strong', { text: t('plans.progression') }), ` ${plan.progression}`),
        h('p', { class: 'plan-small' }, h('strong', { text: t('plans.deload') }), ` ${plan.deload}`),
        h('ul', { class: 'plan-sources' },
          plan.sources.map((k) => SOURCES[k]).filter(Boolean).map((src) => h('li', {}, h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.label })))),
      ),
    ),
    take,
  );
}

/**
 * Alle Pläne.
 * @param {AppContext} ctx
 */
export function openAllPlans(ctx) {
  const sheet = openSheet({
    title: t('plans.all'),
    size: 'tall',
    className: 'plans-sheet',
    content: PLAN_TEMPLATES.map((plan) => planCard(ctx, { plan }, () => sheet.close('chosen'))),
  });
  return sheet;
}

/**
 * „Plan für mich finden“: vier Fragen, je ein Tipp, dann drei Vorschläge.
 * @param {AppContext} ctx
 */
export function openWizard(ctx) {
  /** @type {Record<string, any>} */
  const answers = {};
  let step = 0;
  const back = h('button', { type: 'button', class: 'button button-quiet', text: t('common.back') });
  const sheet = openSheet({ title: t('wizard.title'), size: 'tall', className: 'wizard', actions: back });
  const guess = experienceGuess(ctx.store.sessions.get());

  const paint = () => {
    sheet.body.scrollTop = 0;
    back.hidden = step === 0;
    if (step < WIZARD_STEPS.length) {
      const key = WIZARD_STEPS[step];
      const options = /** @type {readonly (string|number)[]} */ (WIZARD_OPTIONS[key]);
      replace(
        sheet.body,
        h('div', { class: 'wizard-dots', 'aria-hidden': 'true' }, WIZARD_STEPS.map((_, i) => h('span', { class: ['wizard-dot', i < step && 'is-done', i === step && 'is-current'] }))),
        h('h3', { class: 'wizard-question', text: t(`wizard.${key}`) }),
        h('div', { class: ['wizard-options', `wizard-${key}`], role: 'group', 'aria-label': t(`wizard.${key}`) },
          options.map((v) =>
            h('button', {
              type: 'button',
              class: ['wizard-option', (answers[key] ?? (key === 'experience' ? guess : null)) === v && 'is-suggested'],
              dataset: { value: String(v) },
              on: {
                click: () => {
                  answers[key] = v;
                  haptic('select');
                  step += 1;
                  paint();
                },
              },
            },
            h('span', { class: 'wizard-option-label', text: t(`wizard.${key}.${v}`) }),
            key === 'where' || key === 'experience' ? h('span', { class: 'wizard-option-hint', text: t(`wizard.${key}.${v}.hint`) }) : null)),
        ),
      );
      return;
    }
    const results = wizardResults(/** @type {any} */ (answers), ctx.store.profile.get() ?? {});
    replace(
      sheet.body,
      h('h3', { class: 'wizard-question', text: t('wizard.results') }),
      results.length ? null : h('p', { class: 'card-hint', text: t('wizard.none') }),
      results.map((r) => planCard(ctx, r, () => sheet.close('chosen'))),
      h('button', { type: 'button', class: 'button button-quiet button-wide', text: t('plans.all'), on: { click: () => sheet.close('all').then(() => openAllPlans(ctx)) } }),
    );
  };
  back.addEventListener('click', () => {
    step = Math.max(0, step - 1);
    paint();
  });
  paint();
  return sheet;
}
