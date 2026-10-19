/**
 * Der Begleiter auf Bildschirmen: liest die nötigen Bereiche, rechnet über domain/buddy.js
 * und vermerkt Besuch/Wachstum im Speicher. Ausgeschaltete Module fließen nicht ein
 * (z. B. keine Umlenk-Sprüche ohne „Weniger Handy“).
 */

import { buddySnapshot } from '../../domain/buddy.js';
import { monday, toDate, todayIdx } from '../../core/dates.js';
import { companionLine } from '../../data/texts/companion.js';
import { tList } from '../../data/texts/i18n.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * Momentaufnahme ohne zu speichern.
 * @param {AppContext} ctx
 * @param {() => number} random
 */
function snapshot(ctx, random) {
  const { store } = ctx;
  const now = ctx.now();
  const state = store.buddy.get();
  const snap = buddySnapshot({
    state,
    today: ctx.today(),
    hour: toDate(now).getHours(),
    sessionDates: store.sessions.get().map((s) => s.date),
    prDates: store.prs.get().map((p) => p.date),
    habitDays: ctx.hasModule('habits') ? store.habit.get().days : {},
    accountDays: ctx.hasModule('handy') ? store.account.get().days : {},
    plannedToday: ctx.hasModule('train') && !!store.schedule.get()[String(todayIdx(now))],
    redirectsThisWeek: ctx.hasModule('handy') ? store.redirects.get()[monday(now)] ?? 0 : 0,
    random,
  });
  return { snap, changed: JSON.stringify(snap.state) !== JSON.stringify(state) };
}

/**
 * Zustand für „Heute“; vermerkt Besuch und höchste Stufe.
 * @param {AppContext} ctx
 * @param {{random?: () => number}} [options]
 */
export function visitCompanion(ctx, { random = Math.random } = {}) {
  const { snap, changed } = snapshot(ctx, random);
  if (changed) ctx.store.buddy.set(snap.state);
  return snap;
}

/**
 * Aktuelle Wachstumsstufe, ohne etwas zu speichern (Avatar, Profil, Platzhalter).
 * @param {AppContext} ctx
 */
export const companionStage = (ctx) => snapshot(ctx, () => 0).snap.stage;

/**
 * Name der Stufe für die eingestellte Art („Keimling“, „Knospe“ …).
 * @param {AppContext} ctx
 * @param {number} stage
 */
export const stageName = (ctx, stage) => tList(`species.${ctx.companion().species}.stages`)[stage - 1] ?? '';

/**
 * Satz in eingestellter Art und Tonlage.
 * @param {AppContext} ctx
 * @param {string} context
 * @param {{count?: number, random?: () => number}} [extra]
 */
export function lineFor(ctx, context, extra = {}) {
  const { species, name } = ctx.companion();
  return companionLine(context, {
    species,
    name,
    tone: ctx.store.buddy.get().tone,
    user: ctx.store.profile.get()?.name ?? '',
    ...extra,
  });
}

/**
 * „Schlicht“: Begleiter, Garten und Sätze ausgeblendet. Ohne eigene Einstellung gilt
 * der alte Schalter „Begleiter zeigen“ (buddy.on, auch aus v1).
 * @param {AppContext} ctx
 */
export function isPlain(ctx) {
  const plain = ctx.store.settings.get().plain;
  return typeof plain === 'boolean' ? plain : !ctx.store.buddy.get().on;
}

/**
 * @param {AppContext} ctx
 * @param {boolean} plain
 */
export function setPlain(ctx, plain) {
  ctx.store.settings.update((s) => ({ ...s, plain }));
  ctx.store.buddy.update((b) => ({ ...b, on: !plain }));
}
