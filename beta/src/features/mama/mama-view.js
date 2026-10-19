/**
 * Ansicht „Schwangerschaft & Rückbildung“ (#mama): ruhig und klar.
 *
 * Von oben: (Weitermachen) · (eine Abfrage: Baby da? / nächster Schritt? / neue Phase) ·
 * „Heute für dich“ (ein Plan, ein Knopf) · „Deine Woche“ (Tage, Tipp, Pläne der Phase) ·
 * Hinweise zur Phase · Sicherheit & Warnzeichen · Angaben ändern · Quellen.
 * Ohne Angaben: Einrichtung, Sicherheit, Quellen.
 */

import { mamaStatus, markBirth } from '../../domain/pregnancy.js';
import { checklistKeys, confirmCheck, homeWeek, mamaPrompt, phaseById, todayPick, weekTip } from '../../domain/homeplans.js';
import { MAMA, SOURCES } from '../../data/homeplans.js';
import { haptic } from '../../core/platform.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { card } from '../../ui/card.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { reactivePart } from '../part.js';
import { longDay, shortDay } from '../days.js';
import { mamaForm } from './mama-setup.js';
import { statusLabel } from './status.js';
import { startHomePlan } from './start.js';
import { pausedPlayer, playerHref } from '../player/player.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../../domain/homeplans.js').Plan} Plan */

const list = (items, className = 'safety-list') => h('ul', { class: className }, items.map((s) => h('li', { text: s })));

/** Aufklappbarer Abschnitt. */
const fold = (title, className, ...children) =>
  h(
    'details',
    { class: ['card', 'mama-fold', className] },
    h('summary', { class: 'mama-fold-summary' }, h('span', { text: title }), icon('chevronDown', { size: 18 })),
    h('div', { class: 'mama-fold-body' }, children),
  );

/** @param {Plan} plan */
const planMeta = (plan) => t('mama.planMeta', { minutes: plan.minutes, level: plan.level ?? '' });

/**
 * Angaben eintragen oder ändern.
 * @param {AppContext} ctx
 */
function setupForm(ctx) {
  const initial = ctx.store.mama.get();
  const form = mamaForm({ initial, today: ctx.today() });
  const save = h('button', { type: 'button', class: 'button button-primary button-wide mama-save', text: t('mama.setupSave') });
  save.addEventListener('click', () => {
    const r = form.result();
    if (!r.ok) return;
    const status = mamaStatus(r.state, ctx.today());
    // Beim ersten Eintragen gilt die Phase still als gesehen; nach einer Änderung von Modus oder Datum neu.
    const same = initial && initial.mode === r.state.mode && initial.date === r.state.date;
    ctx.store.mama.set({
      ...r.state,
      seenPhase: same ? initial.seenPhase : status?.phase ?? null,
      check6: same ? initial.check6 : false,
      check12: same ? initial.check12 : false,
    });
    haptic('success');
    toast(t('mama.saved'));
  });
  return h('div', { class: 'mama-setup' }, form.el, save);
}

/** @returns {HTMLElement} */
function safetyCard() {
  return fold(
    t('mama.safetyTitle'),
    'mama-safety',
    h('p', { class: 'card-hint', text: t('mama.disclaimer') }),
    h('p', { class: 'setting-label', text: t('mama.stopNow') }),
    list(tList('mama.stopSigns')),
    h('p', { class: 'setting-label', text: t('mama.absolute') }),
    list(MAMA.contraindications_absolute),
    h('p', { class: 'setting-label', text: t('mama.relative') }),
    list(MAMA.contraindications_relative),
    h('p', { class: 'setting-label', text: t('mama.principles') }),
    list(MAMA.principles),
  );
}

const sources = () => h('p', { class: 'mama-sources', text: t('mama.sources', { sources: SOURCES }) });

/**
 * Abfrage über „Heute für dich“.
 * @param {AppContext} ctx
 * @param {ReturnType<typeof mamaPrompt>} prompt
 * @param {import('../../core/store.js').MamaState} mama
 */
function promptCard(ctx, prompt, mama) {
  const { store } = ctx;
  if (!prompt) return null;
  if (prompt.kind === 'askBirth') {
    return card(
      { variant: 'soft', className: 'mama-prompt mama-ask-birth' },
      h('p', { class: 'mama-prompt-title', text: t('mama.askBirthTitle') }),
      h('p', { class: 'card-hint', text: t('mama.askBirthHint') }),
      h('div', { class: 'mama-prompt-actions' },
        h('button', { type: 'button', class: 'button button-quiet', text: t('mama.askBirthNo'), on: { click: (e) => /** @type {HTMLElement} */ (e.currentTarget).closest('.mama-prompt')?.remove() } }),
        h('button', { type: 'button', class: 'button button-primary', text: t('mama.askBirthYes'), on: { click: () => store.mama.set(markBirth(mama)) } }),
      ),
    );
  }
  if (prompt.kind === 'check') {
    const phase = phaseById(MAMA, prompt.needs);
    return card(
      { variant: 'soft', className: 'mama-prompt mama-check' },
      h('p', { class: 'mama-prompt-title', text: t('mama.checkTitle') }),
      h('p', { class: 'mama-prompt-phase', text: phase?.title ?? '' }),
      h('p', { class: 'card-hint', text: t('mama.checkIntro') }),
      list(checklistKeys(prompt.needs, mama.cesarean).map((k) => t(k)), 'mama-checklist'),
      h('p', { class: 'card-hint', text: mama.cesarean ? `${t('mama.checkHint')} ${t('mama.checkHintCs')}` : t('mama.checkHint') }),
      h('div', { class: 'mama-prompt-actions' },
        h('button', { type: 'button', class: 'button button-quiet', text: t('mama.checkNo'), on: { click: (e) => { toast(t('mama.checkNoToast')); /** @type {HTMLElement} */ (e.currentTarget).closest('.mama-prompt')?.remove(); } } }),
        h('button', { type: 'button', class: 'button button-primary', text: t('mama.checkYes'), on: { click: () => { haptic('success'); store.mama.set(confirmCheck(mama, prompt.needs)); } } }),
      ),
    );
  }
  const phase = phaseById(MAMA, prompt.phase);
  return card(
    { variant: 'soft', className: 'mama-prompt mama-new' },
    h('p', { class: 'mama-prompt-title', text: t('mama.newTitle') }),
    h('p', { class: 'mama-prompt-phase', text: phase?.title ?? '' }),
    h('p', { class: 'card-hint', text: t('mama.newText', { focus: phase?.focus ?? '' }) }),
    h('div', { class: 'mama-prompt-actions' },
      h('button', { type: 'button', class: 'button button-primary', text: t('mama.newOk'), on: { click: () => store.mama.update((m) => (m ? { ...m, seenPhase: prompt.phase } : m)) } }),
    ),
  );
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 */
export function mountMama(ctx, view) {
  const part = reactivePart(ctx, ['mama', 'sessions', 'player'], (el) => {
    const { store } = ctx;
    const mama = store.mama.get();
    const status = mamaStatus(mama, ctx.today());
    const phase = status ? phaseById(MAMA, status.phase) : null;

    const head = h(
      'header',
      { class: 'page-head mama-head' },
      h('h1', { class: 'page-title', text: status ? statusLabel(status) : t('mama.headNoDate') }),
      phase ? h('p', { class: 'page-intro', text: phase.title }) : null,
    );

    if (!status || !phase || !mama) {
      replace(
        el,
        head,
        card({ title: t('mama.setupTitle'), className: 'mama-setup-card' }, h('p', { class: 'card-hint', text: t('mama.setupIntro') }), setupForm(ctx)),
        safetyCard(),
        sources(),
      );
      return;
    }

    // Beim allerersten Zustand gilt die Phase still als gesehen.
    if (!mama.seenPhase) {
      queueMicrotask(() => store.mama.update((m) => (m && !m.seenPhase ? { ...m, seenPhase: status.phase } : m)));
    }

    const paused = pausedPlayer(ctx);
    const resume = paused
      ? h(
          'a',
          { class: 'sport-start mama-resume', href: playerHref(paused.planId, { short: !!paused.short, from: paused.from ?? 'mama' }) },
          h('span', { class: 'sport-texts' },
            h('span', { class: 'sport-title', text: t('mama.continue') }),
            h('span', { class: 'sport-sub', text: t('mama.continueSub', { plan: paused.plan.name, step: paused.step, total: paused.total }) }),
          ),
          h('span', { class: 'sport-play', 'aria-hidden': 'true' }, icon('play', { size: 26 })),
        )
      : null;

    const prompt = promptCard(ctx, mamaPrompt(mama, status), mama);

    // Heute für dich
    const sessions = store.sessions.get();
    const pick = todayPick(phase, sessions, ctx.today());
    const plan = pick.plan;
    const startButton = h(
      'button',
      { type: 'button', class: ['button', pick.doneToday ? 'button-quiet' : 'button-primary', 'button-wide', 'mama-start'] },
      icon('play', { size: 20 }),
      h('span', { text: t(pick.doneToday ? 'mama.again' : 'mama.start') }),
    );
    startButton.addEventListener('click', () => startHomePlan(ctx, plan));
    const today = card(
      { className: ['mama-today', pick.doneToday && 'is-done'].filter(Boolean).join(' ') },
      h('p', { class: 'mama-eyebrow', text: t('mama.todayTitle') }),
      h('h2', { class: 'mama-plan-name', text: plan.name }),
      h('p', { class: 'mama-plan-meta', text: planMeta(plan) }),
      plan.equipment?.length ? h('p', { class: 'mama-plan-gear', text: t('mama.equipment', { list: plan.equipment.join(', ') }) }) : null,
      pick.doneToday ? h('p', { class: 'mama-done', text: t('mama.todayDone') }, ) : null,
      startButton,
    );

    // Deine Woche
    const week = homeWeek(sessions, ctx.now());
    const days = h(
      'ol',
      { class: 'week-days mama-week-days' },
      week.days.map((done, i) =>
        h(
          'li',
          { class: ['week-day', done && 'is-done', i === week.todayIndex && 'is-today'], 'aria-label': t(done ? 'week.dayDone' : 'week.dayFree', { day: longDay(i, i === week.todayIndex) }) },
          h('span', { class: 'week-dot', 'aria-hidden': 'true' }, done ? icon('check', { size: 14 }) : null),
          h('span', { class: 'week-label', 'aria-hidden': 'true', text: shortDay(i) }),
        )),
    );
    const plans = h(
      'ul',
      { class: 'plan-list mama-plans' },
      phase.plans.map((p) =>
        h('li', { class: 'plan-item' },
          h('button', { type: 'button', class: 'plan-row mama-plan-row', 'data-plan': p.id, on: { click: () => startHomePlan(ctx, p) } },
            h('span', { class: 'plan-row-texts' },
              h('span', { class: 'plan-row-name', text: p.name }),
              h('span', { class: 'plan-row-sub', text: week.plansDone[p.id] ? `${planMeta(p)} · ${t('mama.donePlan')}` : planMeta(p) }),
            ),
            week.plansDone[p.id] ? h('span', { class: 'mama-plan-check' }, icon('check', { size: 18 })) : icon('play', { size: 20 }),
          ),
        )),
    );
    const tip = weekTip(phase, status.weeks);
    const weekCard = card(
      { title: t('mama.weekTitle'), className: 'mama-week' },
      h('p', { class: 'mama-week-count', text: t('mama.weekCount', { count: week.count, goal: week.goal }) }),
      days,
      h('p', { class: 'card-hint', text: t('mama.weekHint') }),
      tip ? h('div', { class: 'mama-tip' }, h('p', { class: 'setting-label', text: t('mama.weekTip') }), h('p', { class: 'mama-tip-text', text: tip })) : null,
      h('p', { class: 'setting-label', text: t('mama.plansTitle') }),
      plans,
    );

    const notes = fold(
      t('mama.phaseNotes'),
      'mama-notes',
      h('p', { class: 'mama-focus', text: phase.focus }),
      list(phase.notes),
      mama.mode === 'post' && mama.cesarean && phase.csection_notes ? [h('p', { class: 'setting-label', text: t('mama.csection') }), list(phase.csection_notes)] : null,
      phase.return_to_running_criteria ? [h('p', { class: 'setting-label', text: t('mama.running') }), list(phase.return_to_running_criteria)] : null,
    );

    replace(el, head, resume, prompt, today, weekCard, notes, safetyCard(), fold(t('mama.editTitle'), 'mama-edit', setupForm(ctx)), sources());
  }, 'mama-view');
  view.append(part.el);
  return () => part.destroy?.();
}
