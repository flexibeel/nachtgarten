/**
 * Daten & Privatsphäre: Sicherung speichern/laden, alles löschen.
 * Wird auf „Heute“ und im Profil gleich verwendet.
 */

import { backupFilename, createBackup, parseBackup, restoreBackup } from '../../domain/backup.js';
import { pickTextFile, saveFile, haptic } from '../../core/platform.js';
import { locale, t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
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
  const stamp = new Date(ctx.now()).toISOString();
  ctx.store.meta.set({ ...ctx.store.meta.get(), createdAt: stamp, migratedFromV1: hasLegacy ? stamp : null });
  ctx.reload();
  toast(t('wipe.done'));
}

/**
 * Block mit Datenschutz-Satz und den drei Aktionen.
 * @param {AppContext} ctx
 */
export function privacyPanel(ctx) {
  const action = (label, iconName, onClick, danger = false) =>
    h('button', { type: 'button', class: ['list-button', danger && 'is-danger'], on: { click: onClick } }, icon(iconName, { size: 20 }), h('span', { text: label }));
  return h(
    'div',
    { class: 'privacy' },
    h('p', { class: 'privacy-line' }, icon('lock', { size: 18 }), h('span', { text: t('privacy.line') })),
    h(
      'div',
      { class: 'list-buttons' },
      action(t('backup.save'), 'download', () => saveBackup(ctx)),
      action(t('backup.load'), 'upload', () => loadBackup(ctx)),
      action(t('wipe.button'), 'trash', () => wipeAll(ctx), true),
    ),
  );
}
