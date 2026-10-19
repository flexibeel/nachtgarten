/**
 * Training abschließen: Eintrag speichern, Zeitkonto gutschreiben, Zusammenfassung zeigen.
 * Aus der Zusammenfassung geht es zum Teilen.
 */

import { haptic } from '../../core/platform.js';
import { formatNumber } from '../../core/format.js';
import { earn } from '../../domain/account.js';
import { finishLive, summarizeLive } from '../../domain/training.js';
import { t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { companionSpeech } from '../../ui/companion.js';
import { isPlain, lineFor } from '../companion/companion-state.js';
import { exerciseLookup } from './exercises.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** Teilen-Sheet ist angeschlossen. */
const SHARE_READY = true;

/**
 * @param {AppContext} ctx
 * @param {{auto?: boolean}} options   auto: vergessenes Training still beenden
 */
export function finishTraining(ctx, { auto = false }) {
  const { store } = ctx;
  const live = store.live.get();
  if (!live) return null;
  const lookup = exerciseLookup(ctx);
  const now = ctx.now();
  const session = finishLive(live, lookup, { autoFinished: auto });
  const timing = store.settings.get().timeTracking;
  const summary = session ? { ...summarizeLive(live, { lookup, prs: store.prs.get(), now, timeTracking: timing }), start: live.start, sessionId: session.id } : null;
  store.live.set(null);
  if (!session) return null;
  store.sessions.update((list) => [...list, session].sort((a, b) => a.date.localeCompare(b.date)));
  if (auto) {
    toast(t('live.autoFinished', { count: session.setCount }));
    return summary;
  }
  store.lastCard.set(summary);
  const earned = earn(store.account.get(), ctx.today(), 'training');
  store.account.set(earned.state);
  haptic([20, 50, 20, 50, 40]);
  ctx.go('training');
  window.setTimeout(() => openSummary(ctx, summary, earned.minutes && ctx.hasModule('handy') ? earned.minutes : 0), 120);
  return summary;
}

/**
 * Zusammenfassung nach dem Training.
 * @param {AppContext} ctx
 * @param {any} summary   ShareCard aus summarizeLive (+ start)
 * @param {number} [earnedMinutes]
 */
export function openSummary(ctx, summary, earnedMinutes = 0) {
  const stats = [
    { value: String(summary.sets), label: t(summary.sets === 1 ? 'finish.set' : 'finish.sets') },
    { value: String(summary.items.length), label: t(summary.items.length === 1 ? 'finish.exercise' : 'finish.exercises') },
    summary.minutes ? { value: String(summary.minutes), label: t('finish.minutes') } : { value: formatNumber(summary.volume, 0), label: t('finish.kg') },
  ];
  const prs = summary.items.filter((i) => i.pr).map((i) => i.name);
  /** @type {{destroy: () => void}|null} */
  let speech = null;
  if (!isPlain(ctx)) {
    const { species, name } = ctx.companion();
    speech = companionSpeech({ species, name, mood: 'proud', line: lineFor(ctx, 'finish'), size: 'small' });
  }
  const share = h('button', { type: 'button', class: 'button button-primary', text: t('finish.share') });
  const done = h('button', { type: 'button', class: 'button button-quiet', text: t('finish.done') });
  const sheet = openSheet({
    title: t('finish.title'),
    className: 'finish',
    content: [
      speech?.el ?? null,
      h('ul', { class: 'finish-stats' }, stats.map((s) => h('li', { class: 'finish-stat' }, h('span', { class: 'finish-value', text: s.value }), h('span', { class: 'finish-label', text: s.label })))),
      prs.length ? h('p', { class: 'finish-pr', text: t('finish.pr', { names: prs.join(', ') }) }) : null,
      h('ol', { class: 'finish-list' },
        summary.items.map((it) =>
          h('li', { class: 'finish-item' },
            h('span', { class: 'finish-item-name', text: it.name }),
            h('span', { class: 'finish-item-sets', text: it.sets.map((s) => (s.weight ? `${formatNumber(s.weight, 2)} × ${s.reps}` : `${s.reps}`)).join(' · ') }),
          )),
      ),
      earnedMinutes ? h('p', { class: 'finish-earned', text: t('finish.earned', { minutes: earnedMinutes }) }) : null,
    ],
    actions: SHARE_READY ? [done, share] : [done],
    onClose: () => speech?.destroy(),
  });
  done.addEventListener('click', () => sheet.close('done'));
  share.addEventListener('click', async () => {
    const { openShare } = await import('./share-sheet.js');
    openShare(ctx, summary);
  });
  return sheet;
}
