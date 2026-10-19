/**
 * Live-Training: ein Bildschirm ohne Scrollen. Oben die Übung, in der Mitte Vorschlag oder
 * Pausen-Ring, darunter Gewicht, Wiederholungen und Reserve, unten fest „Satz fertig“.
 * Während eines Satzes keine Animationen und keine Sätze des Begleiters – nur bei einer
 * neuen Bestleistung ein kurzer Zuruf (außer im Modus „Schlicht“).
 */

import { clock, formatNumber } from '../../core/format.js';
import { haptic, keepAwake } from '../../core/platform.js';
import { dateKey } from '../../core/dates.js';
import { liveReducer, initialUi, nextQueueExercise, prefill, queueFromPlan, queueProgress, restLeft, restProgress, setsDone } from '../../domain/live-session.js';
import { logSet, rebuildExercise, shouldAutoFinish, startLive, validateSet } from '../../domain/training.js';
import { repRangeOrDefault, stepOrDefault, suggest } from '../../domain/progression.js';
import { todayPlan } from '../../domain/week.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { stepper } from '../../ui/stepper.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { companionSprite } from '../../ui/companion.js';
import { exerciseLookup, loadDb } from './exercises.js';
import { openExerciseDetail, openLibrary } from './library-sheet.js';
import { finishTraining } from './finish.js';
import { isPlain, lineFor } from '../companion/companion-state.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../../core/store.js').LiveSession} LiveSession */

const RIR_OPTIONS = [0, 1, 2, 3];
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Vergessenes Training (3 h ohne Satz) still abschließen.
 * @param {AppContext} ctx
 */
export function autoFinishIfStale(ctx) {
  const live = ctx.store.live.get();
  if (!shouldAutoFinish(live, ctx.now())) return false;
  finishTraining(ctx, { auto: true });
  return true;
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {import('../../core/router.js').Route} route
 */
export function mountLive(ctx, view, route) {
  const root = h('div', { class: 'live' });
  view.append(root);
  let disposed = false;
  /** @type {(() => void)[]} */
  const cleanups = [];
  loadDb().finally(() => {
    if (disposed) return;
    autoFinishIfStale(ctx);
    const planId = route.params.plan;
    if (!ctx.store.live.get() && planId) {
      const plan = ctx.store.plans.get().find((p) => p.id === planId);
      if (plan) start(ctx, plan);
    }
    if (ctx.store.live.get()) cleanups.push(liveScreen(ctx, root));
    else startScreen(ctx, root, () => cleanups.push(liveScreen(ctx, root)));
  });
  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    keepAwake(false);
  };
}

/**
 * Training beginnen (optional mit Plan).
 * @param {AppContext} ctx
 * @param {import('../../core/store.js').Plan|null} plan
 */
function start(ctx, plan) {
  const live = startLive(ctx.now());
  if (plan?.items.length) live.queue = queueFromPlan(plan);
  ctx.store.live.set(live);
}

/**
 * Noch kein Training: Plan von heute, eigene Pläne oder frei.
 * @param {AppContext} ctx
 * @param {HTMLElement} root
 * @param {() => void} onStart
 */
function startScreen(ctx, root, onStart) {
  const plans = ctx.store.plans.get().filter((p) => p.items.length);
  const { slot } = todayPlan({ sessions: ctx.store.sessions.get(), schedule: ctx.store.schedule.get(), now: ctx.now() });
  const today = slot?.kind === 'plan' ? plans.find((p) => p.id === slot.id) : null;
  const go = (plan) => {
    haptic('select');
    start(ctx, plan);
    onStart();
  };
  const planButton = (plan, primary = false) =>
    h(
      'button',
      { type: 'button', class: ['live-plan', primary && 'is-today'], on: { click: () => go(plan) } },
      h('span', { class: 'live-plan-texts' },
        primary ? h('span', { class: 'live-plan-eyebrow', text: t('live.today') }) : null,
        h('span', { class: 'live-plan-name', text: plan.name }),
        h('span', { class: 'live-plan-sub', text: t('live.planSub', { count: plan.items.length }) }),
      ),
      icon('play', { size: 22 }),
    );
  replace(
    root,
    h('header', { class: 'live-top' }, backLink()),
    h(
      'div',
      { class: 'live-start' },
      h('h1', { class: 'live-start-title', text: t('live.startTitle') }),
      today ? planButton(today, true) : null,
      plans.filter((p) => p !== today).slice(0, 6).map((p) => planButton(p)),
      h('button', { type: 'button', class: 'button button-quiet button-wide live-free', text: t('live.free'), on: { click: () => go(null) } }),
      plans.length ? null : h('a', { class: 'link-button live-find', href: '#training', text: t('live.findPlan') }),
    ),
  );
}

const backLink = () => h('a', { class: 'back-link', href: '#training' }, icon('arrowLeft', { size: 20 }), h('span', { text: t('tab.training') }));

/**
 * Der eigentliche Live-Bildschirm.
 * @param {AppContext} ctx
 * @param {HTMLElement} root
 * @returns {() => void} aufräumen
 */
function liveScreen(ctx, root) {
  const { store } = ctx;
  const lookup = exerciseLookup(ctx);
  let ui = initialUi();
  let restTimer = 0;
  let clockTimer = 0;
  let restDoneAt = 0;
  keepAwake(true);

  const live = () => /** @type {LiveSession} */ (store.live.get());
  const dispatch = (action) => {
    ui = liveReducer(ui, action);
    // Die Pause steht mit im gespeicherten Training: sie überlebt Neuladen und Sperrbildschirm.
    if (['logged', 'restAdd', 'restSkip'].includes(action.type) && store.live.get()) store.live.update((l) => ({ ...l, rest: ui.rest }));
  };
  ui.rest = live().rest ?? null;

  /** Übung wählen und vorbelegen. @param {string} id */
  const select = (id) => {
    const ex = lookup(id);
    const prefs = store.exercises.get().prefs[id] ?? {};
    const item = live().queue?.items.find((it) => it.exercise === id);
    const sameToday = live().sets.filter((s) => s.exercise === id);
    const base = prefill({
      history: store.history.get()[id] ?? [],
      gear: ex.gear,
      target: item?.reps ?? null,
      repRange: prefs.repRange,
      goal: store.profile.get()?.goal,
      step: prefs.step,
    });
    // Innerhalb des Trainings: Werte des letzten Satzes dieser Übung übernehmen.
    const last = sameToday[sameToday.length - 1];
    dispatch({ type: 'select', exercise: id, weight: last ? last.weight : base.weight, reps: last ? last.reps : base.reps });
    if (live().queue) {
      const index = live().queue.items.findIndex((it) => it.exercise === id);
      if (index >= 0) store.live.update((l) => ({ ...l, queue: { ...l.queue, index } }));
    }
  };

  // Erste Übung: aktuelle des Plans oder letzte benutzte.
  const first = live().queue ? nextQueueExercise(live(), live().queue.items[live().queue.index]?.exercise ?? null) ?? live().queue.items[0]?.exercise : live().sets[live().sets.length - 1]?.exercise;
  if (first) select(first);

  /* ------------------------------------------------------------ Gerüst */
  const title = h('p', { class: 'live-title' });
  const elapsed = h('span', { class: 'live-elapsed' });
  const timeButton = h('button', { type: 'button', class: 'icon-button live-time' }, icon('clock', { size: 22 }));
  const finishButton = h('button', { type: 'button', class: 'button button-quiet live-finish', text: t('live.finish') });
  const top = h('header', { class: 'live-top' }, backLink(), h('div', { class: 'live-top-mid' }, title, elapsed), timeButton, finishButton);

  const head = h('section', { class: 'live-ex' });
  const stage = h('section', { class: 'live-stage' });
  const inputs = h('section', { class: 'live-inputs' });
  const rir = h('section', { class: 'live-rir' });
  const cheer = h('div', { class: 'live-cheer', 'aria-live': 'polite' });

  const switchButton = h('button', { type: 'button', class: 'icon-button icon-button-filled live-switch', 'aria-label': t('live.switch') }, icon('list'));
  const doneButton = h('button', { type: 'button', class: 'button button-primary live-done', text: t('live.setDone') });
  const bar = h('div', { class: 'action-bar live-bar', 'data-toast-avoid': '' }, h('div', { class: 'action-bar-inner' }, switchButton, doneButton));

  replace(root, top, h('div', { class: 'live-main' }, head, stage, inputs, rir), cheer, bar);

  /* ------------------------------------------------------------ Malen */
  const paintTop = () => {
    const l = live();
    const p = queueProgress(l);
    title.textContent = l.queue ? `${l.queue.name}` : t('live.freeTitle');
    const timing = store.settings.get().timeTracking;
    timeButton.setAttribute('aria-pressed', String(timing));
    timeButton.setAttribute('aria-label', t(timing ? 'live.timeOff' : 'live.timeOn'));
    const parts = [l.queue ? t('live.progress', { done: p.done, total: p.total }) : t(l.sets.length === 1 ? 'live.setsOne' : 'live.sets', { count: l.sets.length })];
    if (timing) parts.push(clock((ctx.now() - l.start) / 1000));
    elapsed.textContent = parts.join(' · ');
  };

  const paintHead = () => {
    const l = live();
    if (!ui.exercise) {
      replace(head, h('p', { class: 'live-eyebrow', text: t('live.noExercise') }));
      return;
    }
    const ex = lookup(ui.exercise);
    const item = l.queue?.items.find((it) => it.exercise === ui.exercise);
    const done = setsDone(l, ui.exercise);
    const index = l.queue ? l.queue.items.findIndex((it) => it.exercise === ui.exercise) : -1;
    const eyebrow = item
      ? [t('live.exerciseOf', { i: index + 1, n: l.queue.items.length }), done >= item.sets ? t('live.allSets') : t('live.setOf', { k: done + 1, s: item.sets })]
      : [t('live.setN', { k: done + 1 })];
    const hist = (store.history.get()[ui.exercise] ?? []).filter((x) => x.session !== l.start);
    const last = hist[hist.length - 1];
    const meta = [
      item?.reps ? t('live.target', { reps: item.reps }) : null,
      last ? t('live.last', { weight: formatNumber(last.weight, 2), reps: last.reps }) : null,
    ].filter(Boolean);
    replace(
      head,
      h('p', { class: 'live-eyebrow', text: eyebrow.join(' · ') }),
      h('div', { class: 'live-name-row' },
        h('button', { type: 'button', class: 'live-name', on: { click: openSwitcher } }, h('span', { text: ex.name }), icon('chevronDown', { size: 20 })),
        h('button', { type: 'button', class: 'icon-button live-info', 'aria-label': t('live.howTo', { name: ex.name }), on: { click: () => openExerciseDetail(ctx, ui.exercise) } }, icon('info', { size: 22 })),
      ),
      meta.length ? h('p', { class: 'live-meta', text: meta.join(' · ') }) : null,
    );
  };

  const paintStage = () => {
    clearInterval(restTimer);
    const now = ctx.now();
    if (ui.rest && (restLeft(ui.rest, now) > 0 || now - restDoneAt < 1400)) {
      paintRest();
      restTimer = window.setInterval(tickRest, 250);
      return;
    }
    if (ui.rest) dispatch({ type: 'restSkip' });
    if (!ui.exercise) {
      replace(stage, h('button', { type: 'button', class: 'button button-primary live-pick', on: { click: openSwitcher } }, icon('plus'), h('span', { text: t('live.pick') })));
      return;
    }
    const ex = lookup(ui.exercise);
    const prefs = store.exercises.get().prefs[ui.exercise] ?? {};
    const s = suggest({
      history: (store.history.get()[ui.exercise] ?? []).filter((x) => x.session !== live().start),
      today: dateKey(ctx.now()),
      bodyweight: ex.gear === 'Körpergewicht',
      repRange: repRangeOrDefault(prefs.repRange, store.profile.get()?.goal),
      step: stepOrDefault(prefs.step),
    });
    const todaySets = live().sets.filter((x) => x.exercise === ui.exercise);
    replace(
      stage,
      s
        ? h('div', { class: 'live-suggest' },
            icon('sparkle', { size: 18 }),
            h('p', { class: 'live-suggest-text', text: t(s.key, s.params) }),
            s.weight != null || s.reps != null
              ? h('button', {
                  type: 'button',
                  class: 'link-button live-suggest-take',
                  text: t('live.take'),
                  on: {
                    click: () => {
                      if (s.weight != null) dispatch({ type: 'weight', value: s.weight });
                      if (s.reps != null) dispatch({ type: 'reps', value: s.reps });
                      haptic('select');
                      paintInputs();
                    },
                  },
                })
              : null,
          )
        : null,
      todaySets.length
        ? h('ol', { class: 'live-sets', 'aria-label': t('live.setsToday') },
            todaySets.map((x, i) => h('li', { class: 'live-set', text: t('live.setChip', { n: i + 1, weight: formatNumber(x.weight, 2), reps: x.reps }) })))
        : h('p', { class: 'live-hint', text: t('live.firstSet') }),
    );
  };

  /** Pausen-Ring. */
  const ringValue = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const restNumber = h('span', { class: 'rest-time' });
  const restLabel = h('span', { class: 'rest-label' });
  const paintRest = () => {
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('viewBox', '0 0 120 120');
    ring.setAttribute('class', 'rest-svg');
    ring.setAttribute('aria-hidden', 'true');
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const c of [track, ringValue]) {
      c.setAttribute('cx', '60');
      c.setAttribute('cy', '60');
      c.setAttribute('r', String(RING_R));
      c.setAttribute('fill', 'none');
    }
    track.setAttribute('class', 'rest-track');
    ringValue.setAttribute('class', 'rest-value');
    ringValue.setAttribute('transform', 'rotate(-90 60 60)');
    ring.append(track, ringValue);
    replace(
      stage,
      h('div', { class: 'rest', role: 'timer', 'aria-label': t('live.rest') },
        h('div', { class: 'rest-ring' }, ring, h('div', { class: 'rest-center' }, restNumber, restLabel)),
        h('div', { class: 'rest-actions' },
          h('button', { type: 'button', class: 'button button-quiet rest-add', text: t('live.restAdd'), on: { click: () => { dispatch({ type: 'restAdd' }); haptic('tap'); tickRest(); } } }),
          h('button', { type: 'button', class: 'button button-quiet rest-skip', text: t('live.restSkip'), on: { click: () => { dispatch({ type: 'restSkip' }); haptic('tap'); paintStage(); } } }),
        ),
      ),
    );
    tickRest();
  };
  const tickRest = () => {
    const now = ctx.now();
    const left = restLeft(ui.rest, now);
    const progress = restProgress(ui.rest, now);
    ringValue.setAttribute('stroke-dasharray', `${(RING_C * (1 - progress)).toFixed(2)} ${RING_C.toFixed(2)}`);
    if (left > 0) {
      restNumber.textContent = clock(left);
      restLabel.textContent = t('live.rest');
      return;
    }
    if (!restDoneAt) {
      restDoneAt = now;
      restNumber.textContent = t('live.restDone');
      restLabel.textContent = '';
      stage.querySelector('.rest')?.classList.add('is-done');
      haptic([30, 60, 30]);
    }
    if (now - restDoneAt > 1400) {
      dispatch({ type: 'restSkip' });
      paintStage();
    }
  };

  const paintInputs = () => {
    const ex = ui.exercise ? lookup(ui.exercise) : null;
    const prefs = ui.exercise ? store.exercises.get().prefs[ui.exercise] ?? {} : {};
    const body = ex?.gear === 'Körpergewicht';
    replace(
      inputs,
      h('div', { class: 'live-field' },
        h('p', { class: 'live-field-label', text: t(body ? 'live.extraWeight' : 'live.weight') }),
        stepper({ label: t('live.weight'), value: ui.weight, min: 0, max: 500, step: stepOrDefault(prefs.step), decimals: 2, unit: 'kg', onChange: (v) => dispatch({ type: 'weight', value: v }) }),
      ),
      h('div', { class: 'live-field' },
        h('p', { class: 'live-field-label', text: t('live.reps') }),
        stepper({ label: t('live.reps'), value: ui.reps, min: 1, max: 100, onChange: (v) => dispatch({ type: 'reps', value: v }) }),
      ),
    );
    inputs.classList.toggle('is-off', !ui.exercise);
  };

  const paintRir = () => {
    replace(
      rir,
      h('p', { class: 'live-field-label', id: 'rir-label', text: t('live.rir') }),
      h('div', { class: 'live-rir-chips', role: 'group', 'aria-labelledby': 'rir-label' },
        RIR_OPTIONS.map((v) =>
          h('button', {
            type: 'button',
            class: 'chip live-rir-chip',
            'aria-pressed': String(ui.rir === v),
            'aria-label': t('live.rirValue', { value: v === 3 ? '3+' : v }),
            text: v === 3 ? '3+' : String(v),
            on: { click: () => { dispatch({ type: 'rir', value: v }); haptic('select'); paintRir(); } },
          })),
      ),
    );
  };

  const paint = () => {
    paintTop();
    paintHead();
    paintStage();
    paintInputs();
    paintRir();
    doneButton.disabled = !ui.exercise;
  };

  /* ------------------------------------------------------------ Aktionen */
  const showCheer = () => {
    if (isPlain(ctx)) return;
    const { species, name } = ctx.companion();
    const slot = h('span', { class: 'live-cheer-figure' });
    const sprite = companionSprite(slot, { species, mood: 'proud' });
    replace(cheer, h('div', { class: 'live-cheer-card' }, slot, h('p', {}, h('strong', { text: name }), h('span', { text: lineFor(ctx, 'livePr') }))));
    cheer.classList.add('is-visible');
    window.setTimeout(() => {
      cheer.classList.remove('is-visible');
      window.setTimeout(() => sprite.destroy(), 400);
    }, 2600);
  };

  const saveSet = () => {
    if (!ui.exercise) return;
    const error = validateSet(ui.weight, ui.reps);
    if (error) {
      haptic('warning');
      toast(t(error));
      return;
    }
    const exercise = ui.exercise;
    const prefs = store.exercises.get().prefs[exercise] ?? {};
    const now = ctx.now();
    const result = logSet(
      { live: live(), history: store.history.get(), prs: store.prs.get() },
      { exercise, weight: ui.weight, reps: ui.reps, rir: ui.rir, attachment: prefs.attachment, height: prefs.height },
      now,
    );
    store.live.set(result.live);
    store.history.set(result.history);
    store.prs.set(result.prs);
    if (ui.rir != null) store.exercises.update((e) => ({ ...e, lastRir: ui.rir }));
    haptic(result.pr ? [20, 60, 20, 60, 60] : 'success');
    restDoneAt = 0;
    dispatch({ type: 'logged', at: now, restSeconds: store.settings.get().restSeconds || 90 });
    const k = setsDone(result.live, exercise);
    // Soll erreicht: gleich die nächste Übung des Plans vorbereiten (die Pause läuft weiter).
    const item = result.live.queue?.items.find((it) => it.exercise === exercise);
    if (item && k >= item.sets) {
      const next = nextQueueExercise(result.live, exercise);
      if (next && next !== exercise) select(next);
    }
    paint();
    toast(t(result.pr ? 'live.savedPr' : 'live.saved', { n: k, weight: formatNumber(result.live.sets.at(-1).weight, 2), reps: result.live.sets.at(-1).reps }), {
      action: { label: t('common.undo'), onClick: () => undoLast(exercise) },
    });
    if (result.pr) showCheer();
  };

  /** Letzten Satz zurücknehmen. @param {string} exercise */
  const undoLast = (exercise) => {
    const l = live();
    const idx = l.sets.map((s) => s.exercise).lastIndexOf(exercise);
    if (idx < 0) return;
    const sets = l.sets.filter((_, i) => i !== idx);
    const nextLive = { ...l, sets };
    const rebuilt = rebuildExercise({ live: nextLive, history: store.history.get(), prs: store.prs.get() }, exercise);
    store.live.set(nextLive);
    store.history.set(rebuilt.history);
    store.prs.set(rebuilt.prs);
    dispatch({ type: 'restSkip' });
    select(exercise);
    paint();
    toast(t('live.removed'));
  };

  function openSwitcher() {
    const l = live();
    const items = l.queue?.items ?? [];
    const extra = [...new Set(l.sets.map((s) => s.exercise))].filter((id) => !items.some((it) => it.exercise === id));
    const choose = (id) => {
      sheet.close('pick').then(() => {
        select(id);
        paint();
      });
    };
    const line = (id, sub) =>
      h('button', { type: 'button', class: ['switch-row-item', id === ui.exercise && 'is-current'], on: { click: () => choose(id) } },
        h('span', { class: 'switch-name', text: lookup(id).name }),
        h('span', { class: 'switch-sub', text: sub }),
      );
    const add = h('button', { type: 'button', class: 'button button-quiet button-wide', on: { click: () => {
      sheet.close('add').then(() =>
        openLibrary(ctx, {
          mode: 'pick',
          title: t('live.addTitle'),
          onPick: (id) => {
            if (live().queue && !live().queue.items.some((it) => it.exercise === id)) {
              store.live.update((x) => ({ ...x, queue: { ...x.queue, items: [...x.queue.items, { exercise: id, sets: 3, reps: '' }] } }));
            }
            select(id);
            paint();
          },
        }),
      );
    } } }, icon('plus'), h('span', { text: t('live.add') }));
    const sheet = openSheet({
      title: t('live.switchTitle'),
      className: 'live-switcher',
      content: [
        items.length || extra.length
          ? h('div', { class: 'switch-list' },
              items.map((it) => line(it.exercise, t('live.queueItem', { done: setsDone(l, it.exercise), sets: it.sets, reps: it.reps || '–' }))),
              extra.map((id) => line(id, t(setsDone(l, id) === 1 ? 'live.setsOne' : 'live.sets', { count: setsDone(l, id) }))),
            )
          : null,
        add,
      ],
    });
  }

  const finish = async () => {
    const l = live();
    if (!l.sets.length) {
      const ok = await confirmSheet({ title: t('live.discardTitle'), message: t('live.discardText'), confirmLabel: t('live.discard') });
      if (!ok) return;
      store.live.set(null);
      ctx.go('training');
      return;
    }
    finishTraining(ctx, {});
  };

  doneButton.addEventListener('click', saveSet);
  switchButton.addEventListener('click', openSwitcher);
  finishButton.addEventListener('click', finish);
  timeButton.addEventListener('click', () => {
    const on = !store.settings.get().timeTracking;
    store.settings.update((s) => ({ ...s, timeTracking: on }));
    haptic('select');
    toast(t(on ? 'live.timeOnToast' : 'live.timeOffToast'));
    paintTop();
  });
  clockTimer = window.setInterval(() => {
    if (store.settings.get().timeTracking) paintTop();
  }, 1000);

  const onVisible = () => {
    if (document.visibilityState === 'visible' && ui.rest) tickRest();
  };
  document.addEventListener('visibilitychange', onVisible);

  paint();
  return () => {
    clearInterval(restTimer);
    clearInterval(clockTimer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
