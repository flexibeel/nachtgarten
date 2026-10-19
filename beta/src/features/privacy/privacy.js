/**
 * Daten & Privatsphäre: Sicherung speichern/laden, alles löschen.
 * Wird auf „Heute“ und im Profil gleich verwendet.
 */

import { backupFilename, createBackup, parseBackup, restoreBackup } from '../../domain/backup.js';
import { pickTextFile, saveFile, haptic } from '../../core/platform.js';
import { text } from '../../data/texts/de.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

/** @typedef {import('../context.js').AppContext} AppContext */

export const PRIVACY_LINE = 'Alles bleibt nur auf diesem Gerät. Kein Konto, kein Upload.';

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

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
    toast('Sicherung gespeichert');
  } else if (result === 'failed') {
    toast('Speichern hat nicht geklappt. Bitte noch einmal versuchen.');
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
    toast(text(parsed.error));
    return;
  }
  const when = parsed.created ? ` vom ${dateFormat.format(parsed.created)}` : '';
  const ok = await confirmSheet({
    title: 'Sicherung laden?',
    message: `Die Sicherung${when} ersetzt alles, was gerade in der App gespeichert ist.`,
    confirmLabel: 'Sicherung laden',
  });
  if (!ok) return;
  restoreBackup(ctx.store, parsed.data, ctx.now());
  haptic('success');
  ctx.reload();
  toast('Sicherung geladen');
}

/**
 * Alles löschen (nach Bestätigung). v1-Daten („lab.*“) bleiben unberührt und werden
 * nicht erneut übernommen.
 * @param {AppContext} ctx
 */
export async function wipeAll(ctx) {
  const hasLegacy = Object.keys(ctx.store.readLegacy()).length > 0;
  const ok = await confirmSheet({
    title: 'Alles löschen?',
    message:
      'Profil, Trainings, Gewohnheit, Notizen und Einstellungen werden von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen. Speichere vorher eine Sicherung, wenn du etwas behalten willst.' +
      (hasLegacy ? ' Die Daten der bisherigen Nachtgarten-Version bleiben unberührt.' : ''),
    confirmLabel: 'Alles löschen',
    danger: true,
  });
  if (!ok) return;
  ctx.store.clearAll();
  const stamp = new Date(ctx.now()).toISOString();
  ctx.store.meta.set({ ...ctx.store.meta.get(), createdAt: stamp, migratedFromV1: hasLegacy ? stamp : null });
  ctx.reload();
  toast('Alles gelöscht');
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
    h('p', { class: 'privacy-line' }, icon('lock', { size: 18 }), h('span', { text: PRIVACY_LINE })),
    h(
      'div',
      { class: 'list-buttons' },
      action('Sicherung speichern', 'download', () => saveBackup(ctx)),
      action('Sicherung laden', 'upload', () => loadBackup(ctx)),
      action('Alles löschen', 'trash', () => wipeAll(ctx), true),
    ),
  );
}
