/**
 * Daten & Privatsphäre: Sicherung speichern/laden, alles löschen.
 * Wird auf „Heute“ und im Profil gleich verwendet.
 */

import { backupFilename, createBackup, parseBackup, restoreBackup } from '../../domain/backup.js';
import { pickTextFile, saveFile, haptic, persistenceStatus, requestPersistence } from '../../core/platform.js';
import { parseKey } from '../../core/dates.js';
import { locale, t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {Date} date */
const formatDate = (date) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

/**
 * Sicherung als Datei speichern (Download, auf dem Handy wahlweise Teilen-Menü).
 * @param {AppContext} ctx
 */
export async function saveBackup(ctx) {
  const backup = createBackup(ctx.store, ctx.now());
  const result = await saveFile({
    name: backupFilename(ctx.today()),
    content: JSON.stringify(backup, null, 2),
    type: 'application/json',
  });
  if (result === 'downloaded' || result === 'shared') {
    ctx.store.settings.update((s) => ({ ...s, backupAt: ctx.today() }));
    haptic('success');
    toast(t('backup.saved'));
  } else if (result === 'failed') {
    toast(t('backup.saveFailed'));
  }
}

/**
 * Sicherung auswählen, prüfen, nach Bestätigung einspielen.
 * @param {AppContext} ctx
 */
export async function loadBackup(ctx) {
  const file = await pickTextFile();
  if (!file) return;
  const parsed = parseBackup(file.text);
  if (!parsed.ok) {
    haptic('warning');
    toast(t(parsed.error));
    return;
  }
  const ok = await confirmSheet({
    title: t('backup.confirmTitle'),
    message: parsed.created ? t('backup.confirmTextDated', { date: formatDate(parsed.created) }) : t('backup.confirmText'),
    confirmLabel: t('backup.load'),
  });
  if (!ok) return;
  restoreBackup(ctx.store, parsed.data, ctx.now());
  haptic('success');
  ctx.reload();
  toast(t('backup.loaded'));
}

/**
 * Alles löschen (nach Bestätigung). v1-Daten („lab.*“) bleiben unberührt und werden
 * nicht erneut übernommen.
 * @param {AppContext} ctx
 */
export async function wipeAll(ctx) {
  const hasLegacy = Object.keys(ctx.store.readLegacy()).length > 0;
  const ok = await confirmSheet({
    title: t('wipe.title'),
    message: hasLegacy ? `${t('wipe.text')} ${t('wipe.legacy')}` : t('wipe.text'),
    confirmLabel: t('wipe.button'),
    danger: true,
  });
  if (!ok) return;
  ctx.store.clearAll();
  await ctx.durable?.clearSnapshots();
  const stamp = new Date(ctx.now()).toISOString();
  ctx.store.meta.set({ ...ctx.store.meta.get(), createdAt: stamp, migratedFromV1: hasLegacy ? stamp : null });
  ctx.reload();
  toast(t('wipe.done'));
}

/**
 * Dauerhaft gespeichert? Zeile mit Status, bei „nein“ mit Erklärung und Nachfrage.
 * @param {AppContext} ctx
 */
function persistenceRow(ctx) {
  const row = h('div', { class: 'persist' });
  /** @param {'granted'|'denied'|'unsupported'} state */
  const paint = (state) => {
    if (state === 'granted') {
      replace(row, h('p', { class: 'persist-ok' }, icon('check', { size: 18 }), h('span', { text: t('persist.granted') })));
      return;
    }
    replace(
      row,
      h('p', { class: 'field-hint', text: t(state === 'denied' ? 'persist.denied' : 'persist.unsupported') }),
      state === 'denied'
        ? h('button', { type: 'button', class: 'link-button', text: t('persist.ask'), on: { click: () => requestPersistence().then(paint) } })
        : null,
    );
  };
  persistenceStatus().then(paint);
  return row;
}

/**
 * Automatische Tagesstände mit „Stand vom … wiederherstellen“.
 * @param {AppContext} ctx
 */
function snapshotList(ctx) {
  const list = h('div', { class: 'snapshots' });
  const day = (/** @type {string} */ key) => {
    const { year, month, day: d } = parseKey(key);
    return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, d));
  };
  ctx.durable?.snapshots().then((snaps) => {
    replace(
      list,
      h('p', { class: 'setting-label', text: t('snapshots.title') }),
      h('p', { class: 'field-hint', text: t('snapshots.hint') }),
      snaps.length
        ? h('div', { class: 'list-buttons' },
            snaps.map((snap) =>
              h('button', {
                type: 'button',
                class: 'list-button snapshot-restore',
                dataset: { day: snap.day },
                on: {
                  click: async () => {
                    const date = day(snap.day);
                    const ok = await confirmSheet({ title: t('snapshots.confirmTitle', { date }), message: t('snapshots.confirmText'), confirmLabel: t('snapshots.confirm') });
                    if (!ok || !(await ctx.durable?.restoreSnapshot(snap.day))) return;
                    haptic('success');
                    ctx.reload();
                    toast(t('snapshots.done', { date }));
                  },
                },
              }, icon('clock', { size: 20 }), h('span', { text: t('snapshots.restore', { date: day(snap.day) }) }))))
        : h('p', { class: 'field-hint', text: t('snapshots.none') }),
    );
  });
  return list;
}

/**
 * Block mit Datenschutz-Satz und den drei Aktionen; mit `details` (Profil → Deine Daten)
 * zusätzlich Speicher-Status, automatische Stände und der Hinweis zum iPhone.
 * @param {AppContext} ctx
 * @param {{details?: boolean}} [options]
 */
export function privacyPanel(ctx, { details = false } = {}) {
  const action = (label, iconName, onClick, danger = false) =>
    h('button', { type: 'button', class: ['list-button', danger && 'is-danger'], on: { click: onClick } }, icon(iconName, { size: 20 }), h('span', { text: label }));
  return h(
    'div',
    { class: 'privacy' },
    h('p', { class: 'privacy-line' }, icon('lock', { size: 18 }), h('span', { text: t('privacy.line') })),
    details ? persistenceRow(ctx) : null,
    h(
      'div',
      { class: 'list-buttons' },
      action(t('backup.save'), 'download', () => saveBackup(ctx)),
      action(t('backup.load'), 'upload', () => loadBackup(ctx)),
      action(t('wipe.button'), 'trash', () => wipeAll(ctx), true),
    ),
    details && ctx.durable?.available ? snapshotList(ctx) : null,
    details ? h('p', { class: 'field-hint privacy-device', text: t('data.iphone') }) : null,
  );
}
