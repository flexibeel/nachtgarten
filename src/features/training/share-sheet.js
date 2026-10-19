/**
 * Teilen nach dem Training: Vorschläge (suggestCards) zum Durchwischen, Kompakt/Detailliert,
 * Story/Feed. „Teilen“ (Teilen-Menü mit Bild), „Als Sticker kopieren“ (PNG mit Transparenz
 * in die Zwischenablage), „Bild sichern“ (Download). Das Siegel trägt den eigenen Begleiter.
 */

import { trainingDaysThisMonth } from '../../domain/garden.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { segmented } from '../../ui/chips.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { ensureFonts, renderCard, suggestCards, toBlob } from '../../ui/share/cards.js';
import { sealForSpecies } from '../../ui/share/seal.js';
import { copyImage, haptic, saveFile, shareImage } from '../../core/platform.js';
import { isPlain } from '../companion/companion-state.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * Zusammenfassung (summarizeLive) → Daten der Teilen-Karten.
 * @param {AppContext} ctx
 * @param {any} summary
 */
export function shareData(ctx, summary) {
  const sessions = ctx.store.sessions.get();
  const start = summary.start ? new Date(summary.start).toISOString() : `${summary.date}T12:00:00`;
  return {
    type: 'kraft',
    title: summary.title,
    start,
    durationS: (summary.minutes ?? 0) * 60,
    edition: sessions.length || undefined,
    garden: { count: trainingDaysThisMonth(sessions, summary.date) },
    exercises: summary.items.map((it) => ({
      name: it.name,
      muscles: it.muscles?.length ? it.muscles : [],
      pr: !!it.pr,
      sets: it.sets.map((s) => ({ reps: Number(s.reps) || 0, kg: s.weight || 0 })),
    })),
  };
}

/**
 * @param {AppContext} ctx
 * @param {any} summary
 */
export function openShare(ctx, summary) {
  const data = shareData(ctx, summary);
  const suggestions = suggestCards(data);
  const seal = isPlain(ctx) ? { seal: 'mond' } : { sealRows: sealForSpecies(ctx.companion().species) ?? undefined };
  const state = { index: 0, detail: /** @type {'kompakt'|'detailliert'} */ ('kompakt'), format: /** @type {'story'|'feed'} */ ('story') };
  const rail = h('div', { class: 'share-rail', role: 'listbox', 'aria-label': t('share.choose') });
  const reason = h('p', { class: 'share-reason', 'aria-live': 'polite' });
  /** @type {string[]} */
  let urls = [];

  const optsFor = (s, extra = {}) => ({ ...s.opts, detail: state.detail, format: state.format, ...seal, ...extra });
  const render = (s, extra) => renderCard(data, s, optsFor(s, extra));

  const paint = async () => {
    await ensureFonts();
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
    const cards = await Promise.all(
      suggestions.map(async (s, i) => {
        const blob = await toBlob(render(s));
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return h('button', {
          type: 'button',
          role: 'option',
          class: ['share-card', `is-${state.format}`],
          'aria-selected': String(i === state.index),
          'aria-label': s.name,
          dataset: { index: String(i) },
          on: { click: () => select(i) },
        }, h('img', { class: 'share-img', src: url, alt: s.reason }), h('span', { class: 'share-name', text: s.name }));
      }),
    );
    replace(rail, cards);
    select(state.index, false);
  };

  /** @param {number} i @param {boolean} [scroll] */
  const select = (i, scroll = true) => {
    state.index = i;
    rail.querySelectorAll('.share-card').forEach((c, j) => c.setAttribute('aria-selected', String(j === i)));
    reason.textContent = suggestions[i]?.reason ?? '';
    if (scroll) rail.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Wischen: die Karte in der Mitte ist gewählt.
  let scrollTimer = 0;
  rail.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0;
      [...rail.children].forEach((c, j) => {
        const el = /** @type {HTMLElement} */ (c);
        if (Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid) < Math.abs(/** @type {HTMLElement} */ (rail.children[best]).offsetLeft + /** @type {HTMLElement} */ (rail.children[best]).offsetWidth / 2 - mid)) best = j;
      });
      if (best !== state.index) select(best, false);
    }, 90);
  });

  const toggles = h('div', { class: 'share-toggles' },
    segmented({ label: t('share.detail'), options: [{ value: 'kompakt', label: t('share.compact') }, { value: 'detailliert', label: t('share.detailed') }], value: state.detail, onChange: (v) => { state.detail = v; paint(); } }),
    segmented({ label: t('share.format'), options: [{ value: 'story', label: t('share.story') }, { value: 'feed', label: t('share.feed') }], value: state.format, onChange: (v) => { state.format = v; paint(); } }),
  );

  const current = () => suggestions[state.index];
  const fileName = () => `nachtgarten-${summary.date}.png`;

  const shareBtn = h('button', { type: 'button', class: 'button button-primary share-action', dataset: { action: 'share' } }, icon('share', { size: 20 }), h('span', { text: t('share.share') }));
  const stickerBtn = h('button', { type: 'button', class: 'button button-quiet share-action', dataset: { action: 'sticker' } }, icon('copy', { size: 20 }), h('span', { text: t('share.sticker') }));
  const saveBtn = h('button', { type: 'button', class: 'button button-quiet share-action', dataset: { action: 'save' } }, icon('download', { size: 20 }), h('span', { text: t('share.save') }));

  shareBtn.addEventListener('click', async () => {
    const blob = await toBlob(render(current()));
    const result = await shareImage(blob, fileName(), summary.title);
    if (result === 'downloaded') toast(t('share.saved'));
    else if (result === 'failed') toast(t('share.failed'));
  });
  stickerBtn.addEventListener('click', async () => {
    const blob = await toBlob(render(current(), { transparent: true }));
    const ok = await copyImage(blob);
    haptic(ok ? 'success' : 'warning');
    toast(t(ok ? 'share.copied' : 'share.copyFailed'));
  });
  saveBtn.addEventListener('click', async () => {
    const blob = await toBlob(render(current()));
    const result = await saveFile({ name: fileName(), content: blob, type: 'image/png' });
    toast(t(result === 'failed' ? 'share.failed' : 'share.saved'));
  });

  const sheet = openSheet({
    title: t('share.title'),
    size: 'tall',
    className: 'share',
    content: [rail, reason, toggles],
    actions: [h('div', { class: 'share-actions' }, shareBtn, h('div', { class: 'share-actions-row' }, stickerBtn, saveBtn))],
    onClose: () => urls.forEach((u) => URL.revokeObjectURL(u)),
  });
  paint();
  return sheet;
}
