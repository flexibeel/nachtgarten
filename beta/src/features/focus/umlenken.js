/**
 * Fokus: „Wirklich jetzt?“ (Instagram-Bremse) und die Übersicht dazu.
 *
 * #umlenken?von=instagram → ruhiger Vollbild-Zwischenschritt mit drei Möglichkeiten.
 * #fokus / #umlenken       → Woche, Zeitkonto, Einrichtung des iPhone-Kurzbefehls.
 */

import { clock } from '../../core/format.js';
import { copyText, haptic, openExternal, prefersReducedMotion } from '../../core/platform.js';
import { monday } from '../../core/dates.js';
import { balance, recordDetour, recordTry } from '../../domain/account.js';
import { BREATH_SECONDS, MOVE_SECONDS, TAKE_MINUTES, automationUrl, graceMinutesLeft, inGrace, openAnyway, recordChoice, weekStats } from '../../domain/gate.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { card } from '../../ui/card.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { companionSpeech } from '../../ui/companion.js';
import { isPlain, lineFor } from '../companion/companion-state.js';
import { reactivePart } from '../part.js';
import { stepIllustration } from './guide-art.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const APP_URL = 'instagram://app';
const WEB_URL = 'https://www.instagram.com/';

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {import('../../core/router.js').Route} route
 */
export function mountFokus(ctx, view, route) {
  if (route.params.von) return mountGate(ctx, view, { demo: route.params.von === 'probe' });
  return mountOverview(ctx, view);
}

/* ------------------------------------------------------------ Übersicht */

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 */
function mountOverview(ctx, view) {
  const head = h('header', { class: 'page-head' }, h('h1', { class: 'page-title', text: t('view.fokus') }), h('p', { class: 'page-intro', text: t('gate.intro') }));
  const stats = reactivePart(ctx, ['gate', 'account'], (el) => {
    const now = ctx.now();
    const w = weekStats(ctx.store.gate.get(), now);
    const left = balance(ctx.store.account.get(), ctx.today());
    replace(
      el,
      card({ title: t('gate.weekTitle'), className: 'gate-week' },
        h('div', { class: 'gate-numbers' },
          h('p', { class: 'gate-number' }, h('span', { class: 'gate-number-value', text: String(w.redirected) }), h('span', { class: 'gate-number-label', text: t('gate.redirectedLabel') })),
          h('p', { class: 'gate-number' }, h('span', { class: 'gate-number-value', text: String(left) }), h('span', { class: 'gate-number-label', text: t('gate.accountLabel') })),
        ),
        h('p', { class: 'card-hint', text: t('gate.earnHint') }),
      ),
    );
  }, 'gate-stats');
  const actions = h('div', { class: 'gate-overview-actions' },
    h('button', { type: 'button', class: 'button button-primary button-wide', on: { click: () => openGuide(ctx) } }, icon('phone'), h('span', { text: t('gate.setup') })),
    h('a', { class: 'button button-quiet button-wide', href: '#umlenken?von=probe' }, h('span', { text: t('gate.preview') })),
  );
  view.append(head, stats.el, actions);
  return () => stats.destroy?.();
}

/* ------------------------------------------------------------ Zwischenschritt */

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {{demo: boolean}} options   demo: nur ansehen, nichts zählen, nichts öffnen
 */
function mountGate(ctx, view, { demo }) {
  const { store } = ctx;
  const root = h('div', { class: 'gate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gate-title' });
  view.append(root);
  /** @type {(() => void)[]} */
  const cleanups = [];
  let timer = 0;
  cleanups.push(() => clearInterval(timer));

  const now = ctx.now();
  // Schonfrist nach „Trotzdem öffnen“: gleich weiter, ohne erneut zu fragen.
  if (!demo && inGrace(store.gate.get(), now)) {
    replace(root, h('p', { class: 'gate-forward', text: t('gate.forwarding') }));
    toast(t('gate.graceToast', { minutes: graceMinutesLeft(store.gate.get(), now) }));
    openExternal(APP_URL, WEB_URL);
    return () => cleanups.forEach((fn) => fn());
  }
  if (!demo) store.account.set(recordTry(store.account.get(), ctx.today()));

  const choose = (choice) => {
    haptic('select');
    if (demo || choice === 'open') return;
    const n = ctx.now();
    store.gate.set(recordChoice(store.gate.get(), choice, n));
    store.account.set(recordDetour(store.account.get(), ctx.today()));
    store.redirects.update((r) => ({ ...r, [monday(n)]: (r[monday(n)] ?? 0) + 1 }));
  };

  const close = () => ctx.go('heute');

  const paintAsk = () => {
    clearInterval(timer);
    const live = store.live.get();
    const left = balance(store.account.get(), ctx.today());
    const w = weekStats(store.gate.get(), ctx.now());
    /** @type {{destroy: () => void}|null} */
    let speech = null;
    if (!isPlain(ctx)) {
      const { species, name } = ctx.companion();
      speech = companionSpeech({ species, name, mood: 'calm', line: lineFor(ctx, 'gateAsk'), size: 'small' });
      cleanups.push(() => speech?.destroy());
    }
    const big = (cls, ic, label, sub, onClick) =>
      h('button', { type: 'button', class: ['gate-choice', cls], on: { click: onClick } },
        h('span', { class: 'gate-choice-icon', 'aria-hidden': 'true' }, icon(ic, { size: 24 })),
        h('span', { class: 'gate-choice-texts' }, h('span', { class: 'gate-choice-label', text: label }), sub ? h('span', { class: 'gate-choice-sub', text: sub }) : null),
      );
    const first = live
      ? big('is-primary', 'training', t('gate.backToTraining'), t('gate.trainingState', { n: live.sets.length + 1 }), () => {
          choose('training');
          ctx.go('live');
        })
      : big('is-primary', 'walk', t('gate.move'), t('gate.moveSub'), () => {
          choose('move');
          paintTimer('move');
        });
    replace(
      root,
      h('div', { class: 'gate-inner' },
        h('h1', { class: 'gate-title', id: 'gate-title', text: t('gate.title') }),
        speech?.el ?? h('p', { class: 'gate-calm', text: t('gate.calmLine') }),
        h('div', { class: 'gate-choices' },
          first,
          big('', 'wind', t('gate.breathe'), t('gate.breatheSub'), () => {
            choose('breath');
            paintTimer('breath');
          }),
          big('is-quiet', 'phone', left > 0 ? t('gate.open', { minutes: Math.min(TAKE_MINUTES, left) }) : t('gate.openEmpty'), demo ? t('gate.demo') : t('gate.openSub', { minutes: left }), () => {
            choose('open');
            if (demo) return toast(t('gate.demoToast'));
            const r = openAnyway({ account: store.account.get(), gate: store.gate.get(), today: ctx.today(), now: ctx.now() });
            store.account.set(r.account);
            store.gate.set(r.gate);
            toast(r.minutes ? t('gate.opened', { minutes: r.minutes }) : t('gate.openedEmpty'));
            openExternal(APP_URL, WEB_URL);
          }),
        ),
        h('p', { class: 'gate-stat', text: w.redirected ? t('gate.weekStat', { count: w.redirected }) : t('gate.weekStatNone') }),
        h('button', { type: 'button', class: 'link-button gate-close', text: t('gate.close'), on: { click: close } }),
      ),
    );
  };

  /** Atmen (60 s) oder bewegen (2 min). @param {'breath'|'move'} kind */
  const paintTimer = (kind) => {
    const total = kind === 'breath' ? BREATH_SECONDS : MOVE_SECONDS;
    const start = ctx.now();
    const reduced = prefersReducedMotion();
    const circle = h('div', { class: ['breath', reduced && 'is-still', kind === 'move' && 'is-move'] });
    const phase = h('p', { class: 'breath-phase', 'aria-live': 'polite' });
    const time = h('p', { class: 'breath-time' });
    const steps = tList('gate.moveSteps');
    const done = h('div', { class: 'gate-done', hidden: true },
      h('p', { class: 'gate-done-text', text: t(kind === 'breath' ? 'gate.breathDone' : 'gate.moveDone') }),
      h('button', { type: 'button', class: 'button button-primary button-wide', text: t('gate.toHeute'), on: { click: close } }),
    );
    replace(
      root,
      h('div', { class: 'gate-inner gate-timer' },
        h('div', { class: 'breath-wrap' }, circle, h('div', { class: 'breath-center' }, phase, time)),
        done,
        h('button', { type: 'button', class: 'link-button gate-close', text: t('gate.stop'), on: { click: close } }),
      ),
    );
    const tick = () => {
      const s = (ctx.now() - start) / 1000;
      const left = Math.max(0, total - s);
      time.textContent = clock(Math.ceil(left));
      if (kind === 'breath') {
        const inhale = s % 10 < 4;
        phase.textContent = t(inhale ? 'gate.inhale' : 'gate.exhale');
        circle.classList.toggle('is-in', inhale);
      } else {
        phase.textContent = steps[Math.min(steps.length - 1, Math.floor(s / (total / steps.length)))] ?? '';
      }
      if (left <= 0) {
        clearInterval(timer);
        phase.textContent = '';
        time.textContent = '';
        circle.classList.remove('is-in');
        done.hidden = false;
        haptic('success');
      }
    };
    tick();
    timer = window.setInterval(tick, 250);
  };

  paintAsk();
  return () => cleanups.forEach((fn) => fn());
}

/* ------------------------------------------------------------ Anleitung */

/**
 * „Instagram-Bremse einrichten“ (iPhone, Kurzbefehle-Automation).
 * @param {AppContext} ctx
 */
export function openGuide(ctx) {
  const url = automationUrl(globalThis.location);
  const copy = h('button', { type: 'button', class: 'button button-primary guide-copy' }, icon('copy', { size: 20 }), h('span', { text: t('guide.copy') }));
  copy.addEventListener('click', async () => {
    const ok = await copyText(url);
    haptic(ok ? 'success' : 'warning');
    toast(t(ok ? 'guide.copied' : 'guide.copyFailed'));
  });
  const steps = tList('guide.steps');
  const sheet = openSheet({
    title: t('guide.title'),
    size: 'tall',
    className: 'guide',
    content: [
      h('p', { class: 'guide-intro', text: t('guide.intro') }),
      h('ol', { class: 'guide-steps' },
        steps.map((text, i) =>
          h('li', { class: 'guide-step' },
            h('span', { class: 'guide-num', 'aria-hidden': 'true', text: String(i + 1) }),
            h('div', { class: 'guide-body' },
              h('p', { class: 'guide-text', text }),
              i === steps.length - 2 ? h('div', { class: 'guide-url' }, h('code', { class: 'guide-url-text', text: url }), copy) : null,
            ),
            stepIllustration(i),
          )),
      ),
      h('p', { class: 'guide-note', text: t('guide.honest') }),
      h('p', { class: 'guide-note', text: t('guide.android') }),
    ],
  });
  return sheet;
}
