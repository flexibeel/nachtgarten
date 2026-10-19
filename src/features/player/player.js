/**
 * Timer-Player für Heimpläne (#player?plan=t2a&kurz=1&von=mama) und „10 Minuten ohne Geräte“ (#kurz).
 *
 * Schritte und Zeit kommen aus domain/timer.js (zeitstempelbasiert). Verlässt man den Player ohne
 * „Beenden“, pausiert er; der Stand liegt in `ng2.player` und lässt sich in „Schwangerschaft &
 * Rückbildung“ fortsetzen. Am Ende: Eintrag im Protokoll (Heimplan), Zeitkonto, zurück.
 */

import { findPlan, homeSession } from '../../domain/homeplans.js';
import { buildProgram, createTimer } from '../../domain/timer.js';
import { earn } from '../../domain/account.js';
import { MAMA, BEGIN } from '../../data/homeplans.js';
import { clock } from '../../core/format.js';
import { haptic, keepAwake } from '../../core/platform.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { beep, unlockAudio } from '../../ui/beep.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const CONTENT = { mama: MAMA, begin: BEGIN };
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;
const SIDE_CUE = /,?\s*pro Satz Seite wechseln\.?/;

/**
 * Adresse zum Starten eines Heimplans.
 * @param {string} planId
 * @param {{short?: boolean, from?: 'mama'|'training'}} [options]
 */
export const playerHref = (planId, { short = false, from = 'mama' } = {}) =>
  `#player?plan=${encodeURIComponent(planId)}${short ? '&kurz=1' : ''}&von=${from}`;

/** Ist ein Heimplan pausiert? Für „Weitermachen“. @param {AppContext} ctx */
export function pausedPlayer(ctx) {
  const saved = ctx.store.player.get();
  if (!saved?.planId) return null;
  const found = findPlan(CONTENT, saved.planId);
  if (!found) return null;
  const steps = buildProgram(found.plan, { short: !!saved.short, includeScar: !!saved.scar });
  return { ...saved, plan: found.plan, step: Math.min(steps.length, (saved.timer?.index ?? 0) + 1), total: steps.length };
}

/** Warnzeichen als Sheet. */
export function openStopSigns() {
  openSheet({
    title: t('mama.stopNow'),
    content: [h('ul', { class: 'safety-list' }, tList('mama.stopSigns').map((s) => h('li', { text: s })))],
  });
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {{params: Record<string, string>}} route
 */
export function mountPlayer(ctx, view, route) {
  const { store } = ctx;
  const found = findPlan(CONTENT, route.params.plan ?? '');
  if (!found) {
    view.append(
      h('a', { class: 'back-link', href: '#heute' }, icon('arrowLeft', { size: 20 }), h('span', { text: t('tab.heute') })),
      h('p', { class: 'placeholder-intro', text: t('player.missing') }),
    );
    return undefined;
  }
  const { plan, phase } = found;
  const isMama = !!phase;
  const short = route.params.kurz === '1';
  const from = route.params.von === 'mama' || (isMama && !route.params.von) ? 'mama' : 'training';
  const mama = store.mama.get();
  const scar = isMama && mama?.mode === 'post' && !!mama.cesarean;
  const steps = buildProgram(plan, { short, includeScar: scar });

  const saved = store.player.get();
  const resume = saved && saved.planId === plan.id && !!saved.short === short && saved.timer ? { ...saved.timer, running: false, segmentStart: null } : undefined;
  const timer = createTimer(steps, { clock: () => ctx.now(), state: resume });
  let done = false;
  const persist = () => {
    if (!done) store.player.set({ planId: plan.id, short, from, scar, timer: timer.getState() });
  };
  persist();

  /* ---------------------------------------------------------- Aufbau */
  let confirmEnd = 0;
  const endButton = h('button', { type: 'button', class: 'back-link player-end' }, icon('arrowLeft', { size: 20 }), h('span', { text: t('player.end') }));
  const warnButton = isMama ? h('button', { type: 'button', class: 'button button-quiet player-warn', text: t('player.warn') }) : null;
  const counter = h('span', { class: 'player-count' });
  const bar = h('span', { class: 'player-progress-value' });
  const block = h('p', { class: 'player-block' });
  const title = h('h1', { class: 'player-title' });
  const cue = h('p', { class: 'player-cue' });
  const ringValue = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 120 120');
  ring.setAttribute('class', 'player-svg');
  ring.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const c of [track, ringValue]) {
    c.setAttribute('cx', '60');
    c.setAttribute('cy', '60');
    c.setAttribute('r', String(RING_R));
    c.setAttribute('fill', 'none');
  }
  track.setAttribute('class', 'player-track');
  ringValue.setAttribute('class', 'player-value');
  ringValue.setAttribute('transform', 'rotate(-90 60 60)');
  ring.append(track, ringValue);
  const big = h('span', { class: 'player-time' });
  const small = h('span', { class: 'player-phase' });
  const dial = h('div', { class: 'player-ring', role: 'timer' }, ring, h('div', { class: 'player-center' }, big, small));
  const avoid = h('p', { class: 'player-avoid' });
  const prev = h('button', { type: 'button', class: 'icon-button player-prev', 'aria-label': t('player.prev') }, icon('arrowLeft'));
  const main = h('button', { type: 'button', class: 'button button-primary player-main-button' });
  const next = h('button', { type: 'button', class: 'icon-button player-next', 'aria-label': t('player.next') }, icon('chevronRight'));
  const after = h('p', { class: 'player-after' });

  const root = h(
    'div',
    { class: 'player' },
    h('header', { class: 'player-top' }, endButton, h('span', { class: 'player-top-mid' }, warnButton), counter),
    h('div', { class: 'player-progress', 'aria-hidden': 'true' }, bar),
    h('section', { class: 'player-stage' }, block, title, cue, dial, avoid),
    h('div', { class: 'action-bar player-bar', 'data-toast-avoid': '' }, h('div', { class: 'action-bar-inner' }, prev, main, next), after),
  );
  replace(view, root);

  /* ---------------------------------------------------------- Zeichnen */
  let lastKey = '';
  const paint = () => {
    const snap = timer.snapshot();
    if (snap.finished || !snap.step) return;
    const step = snap.step;
    const key = `${snap.index}|${snap.running}`;
    counter.textContent = t('player.step', { step: snap.index + 1, total: snap.total });
    bar.style.setProperty('width', `${Math.round((snap.index / snap.total) * 100)}%`);
    if (key !== lastKey) {
      lastKey = key;
      const rest = step.kind === 'rest';
      root.classList.toggle('is-rest', rest);
      block.textContent = step.block ?? '';
      title.textContent = rest ? t('player.rest') : step.label;
      let text = rest ? step.nextLabel ?? '' : step.cue ?? '';
      if (!rest && step.sideSwitch) text = `${text.replace(SIDE_CUE, '').trim()} ${t('player.sideHint')}`.trim();
      cue.textContent = text;
      const warn = !rest && step.avoid ? t('player.avoid', { text: step.avoid }) : !rest && scar ? t('player.scar') : '';
      avoid.textContent = warn;
      avoid.hidden = !warn;
      after.textContent = snap.nextWork ? t('player.after', { name: snap.nextWork.label }) : t('player.last');
      prev.disabled = snap.index === 0;
      main.textContent = step.duration == null ? t('player.done') : snap.running ? t('player.hold') : snap.index === 0 && !resume ? t('player.start') : t('player.resume');
      main.classList.toggle('is-running', snap.running);
    }
    if (step.duration == null) {
      big.textContent = step.reps != null && step.reps !== '' ? `${step.reps}×` : '–';
      small.textContent = t('player.repsLabel');
      ringValue.setAttribute('stroke-dasharray', `0 ${RING_C.toFixed(2)}`);
      dial.setAttribute('aria-label', t('player.repsLabel'));
    } else {
      const left = snap.remaining ?? step.duration;
      big.textContent = clock(left);
      small.textContent = step.kind === 'rest' ? t('player.rest') : t('player.go');
      ringValue.setAttribute('stroke-dasharray', `${(RING_C * (1 - snap.stepProgress)).toFixed(2)} ${RING_C.toFixed(2)}`);
      dial.setAttribute('aria-label', t('player.timer', { time: clock(left) }));
    }
  };

  /* ---------------------------------------------------------- Ablauf */
  const finish = () => {
    if (done) return;
    done = true;
    window.clearInterval(loop);
    keepAwake(false);
    store.player.set(null);
    store.sessions.update((list) => [...list, homeSession(plan, { now: ctx.now(), short })].sort((a, b) => a.date.localeCompare(b.date)));
    store.account.set(earn(store.account.get(), ctx.today(), 'training').state);
    beep(880, 220);
    window.setTimeout(() => beep(1180, 260), 240);
    haptic([20, 50, 20, 50, 40]);
    toast(t('player.finished', { plan: plan.name }));
    ctx.go(from === 'mama' ? 'mama' : 'heute', { replace: true });
  };

  /** @param {import('../../domain/timer.js').TimerEvent[]} events */
  const handle = (events) => {
    for (const e of events) {
      if (e.type === 'countdown') beep(660, 90);
      else if (e.type === 'sideSwitch') {
        beep(740, 200);
        haptic([20, 40, 20]);
        toast(t('player.sideSwitch'));
      } else if (e.type === 'stepEnd') {
        beep(880, 300);
        haptic([30, 60, 30]);
      } else if (e.type === 'finished') finish();
    }
    if (events.length && !done) persist();
  };

  const loop = window.setInterval(() => {
    handle(timer.poll());
    if (!done) paint();
  }, 250);

  main.addEventListener('click', () => {
    unlockAudio();
    const snap = timer.snapshot();
    if (!snap.step) return;
    if (snap.step.duration == null) {
      haptic('tap');
      handle(timer.next({ run: true }));
      if (timer.snapshot().running) keepAwake(true);
    } else {
      if (!snap.running) {
        beep(520, 120);
        keepAwake(true);
      } else keepAwake(false);
      haptic('tap');
      timer.toggle();
    }
    persist();
    if (!done) paint();
  });
  prev.addEventListener('click', () => {
    haptic('tap');
    timer.prev();
    persist();
    if (!done) paint();
  });
  next.addEventListener('click', () => {
    haptic('tap');
    handle(timer.next());
    persist();
    if (!done) paint();
  });
  warnButton?.addEventListener('click', openStopSigns);
  endButton.addEventListener('click', () => {
    const now = Date.now();
    if (timer.snapshot().index > 0 && now - confirmEnd > 3000) {
      confirmEnd = now;
      endButton.querySelector('span').textContent = t('player.endConfirm');
      window.setTimeout(() => {
        if (endButton.isConnected) endButton.querySelector('span').textContent = t('player.end');
      }, 3000);
      return;
    }
    done = true;
    window.clearInterval(loop);
    keepAwake(false);
    store.player.set(null);
    ctx.go(from === 'mama' ? 'mama' : 'heute', { replace: true });
  });

  const onHide = () => {
    if (document.visibilityState === 'hidden' && !done) persist();
  };
  document.addEventListener('visibilitychange', onHide);
  paint();

  return () => {
    document.removeEventListener('visibilitychange', onHide);
    window.clearInterval(loop);
    if (!done) {
      // Verlassen ohne „Beenden“: anhalten, Stand behalten.
      timer.pause();
      persist();
      keepAwake(false);
    }
  };
}
