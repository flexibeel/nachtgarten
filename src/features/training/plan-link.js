/**
 * Plan als Link: der Plan steckt komprimiert in der Adresse (#plan=…), kein Server.
 * Dient als persönliche Sicherung und zum Teilen mit Freunden. Öffnen bietet „Plan übernehmen“.
 */

import { decodePlan, encodePlan } from '../../domain/plan-code.js';
import { copyText, haptic } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { exerciseLookup, loadDb } from './exercises.js';

/** @typedef {import('../context.js').AppContext} AppContext */

export const PLAN_LINK_PREFIX = '#plan=';

/**
 * Link erzeugen und teilen (Teilen-Menü) oder kopieren.
 * @param {AppContext} ctx
 * @param {import('../../core/store.js').Plan} plan
 */
export async function sharePlanLink(ctx, plan) {
  const custom = new Map(ctx.store.exercises.get().custom.map((c) => [c.id, c.name]));
  const code = await encodePlan(plan, (id) => custom.get(id));
  const url = `${location.origin}${location.pathname}${PLAN_LINK_PREFIX}${code}`;
  haptic('tap');
  const nav = /** @type {any} */ (globalThis.navigator);
  if (nav?.share) {
    try {
      await nav.share({ title: plan.name, text: t('planLink.shareText', { name: plan.name }), url });
      return;
    } catch (error) {
      if (/** @type {Error} */ (error)?.name === 'AbortError') return;
    }
  }
  const ok = await copyText(url);
  toast(t(ok ? 'planLink.copied' : 'planLink.copyFailed'));
}

/**
 * Geteilten Plan zeigen und auf Wunsch übernehmen.
 * @param {AppContext} ctx
 * @param {string} code
 */
export async function offerSharedPlan(ctx, code) {
  const plan = await decodePlan(code);
  if (!plan) {
    toast(t('planLink.invalid'));
    return;
  }
  await loadDb();
  const lookup = exerciseLookup(ctx);
  const take = h('button', { type: 'button', class: 'button button-primary button-wide', text: t('planLink.take') });
  const sheet = openSheet({
    title: plan.name,
    className: 'plan-link',
    content: [
      h('p', { class: 'sheet-text', text: t('planLink.intro') }),
      h('ol', { class: 'plan-link-list' },
        plan.items.map((it) =>
          h('li', { class: 'plan-link-item' },
            h('span', { class: 'plan-link-name', text: it.name ?? lookup(it.exercise).name }),
            h('span', { class: 'plan-link-sub', text: t('planLink.item', { sets: it.sets, reps: it.reps || '–' }) }),
          ))),
    ],
    actions: take,
  });
  take.addEventListener('click', () => {
    const { store } = ctx;
    // Unbekannte (eigene) Übungen des Absenders als eigene Übung anlegen.
    const known = new Set(store.exercises.get().custom.map((c) => c.id));
    const missing = plan.items.filter((it) => it.name && !known.has(it.exercise));
    if (missing.length) {
      store.exercises.update((e) => ({ ...e, custom: [...e.custom, ...missing.map((it) => ({ id: it.exercise, name: /** @type {string} */ (it.name), gear: 'Sonstiges', muscles: [], source: 'custom' }))] }));
    }
    const id = `link-${ctx.now().toString(36)}`;
    store.plans.update((list) => [...list, { id, name: plan.name, items: plan.items.map(({ exercise, sets, reps }) => ({ exercise, sets, reps })) }]);
    haptic('success');
    sheet.close('take').then(() => toast(t('planLink.taken', { name: plan.name })));
  });
}
