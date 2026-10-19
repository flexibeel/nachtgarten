/**
 * Profil-Sheet (über den Avatar auf „Heute“): Name, Ziel, Module, Reihenfolge auf „Heute“,
 * Begleiter, Ansicht, Daten. Änderungen werden sofort gespeichert.
 */

import { haptic } from '../../core/platform.js';
import { moveTile, toggleModule } from '../../domain/modules.js';
import { COMPANION_NAME_MAX, withCompanion } from '../../domain/companion.js';
import { SPECIES, speciesInfo } from '../../data/companions.js';
import { goalLabel, goalOptions } from '../../data/goals.js';
import { TONES, companionLine } from '../../data/texts/companion.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { chipGroup, segmented } from '../../ui/chips.js';
import { switchRow, textField } from '../../ui/fields.js';
import { companionFigure } from '../../ui/companion.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { companionStage } from '../companion/companion-state.js';
import { mamaForm } from '../mama/mama-setup.js';
import { openOnboarding } from '../onboarding/onboarding.js';
import { privacyPanel } from '../privacy/privacy.js';
import { languageControl, settingRow, startViewControl, themeControl } from '../settings/controls.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const emptyProfile = () => ({ name: '', goal: '', age: null, weight: null, days: 3 });

/**
 * @param {string} title
 * @param {...import('../../ui/dom.js').Child} children
 */
const section = (title, ...children) => h('section', { class: 'profile-section' }, h('h3', { class: 'profile-section-title', text: title }), children);

/**
 * Angaben für Schwangerschaft & Rückbildung in eigenem Sheet.
 * @param {AppContext} ctx
 */
export function openMamaSheet(ctx) {
  const form = mamaForm({ initial: ctx.store.mama.get(), today: ctx.today() });
  const save = h('button', { type: 'button', class: 'button button-primary button-wide', text: t('common.save') });
  const sheet = openSheet({ title: t('mama.title'), content: form.el, actions: save });
  save.addEventListener('click', () => {
    const result = form.result();
    if (!result.ok) return haptic('warning');
    ctx.store.mama.set(result.state);
    haptic('success');
    sheet.close('save').then(() => toast(t('common.saved')));
  });
}

/**
 * „Heute anordnen“: sichtbare Kacheln mit Hoch/Runter.
 * @param {AppContext} ctx
 */
function tileOrderList(ctx) {
  const list = h('ol', { class: 'order-list', 'aria-label': t('profile.orderList') });
  const paint = () => {
    const { enabledModules, tileOrder } = ctx.store.settings.get();
    const tiles = ctx.registry.tiles(enabledModules, tileOrder);
    const ids = tiles.map((t) => t.id);
    const move = (id, delta) => {
      haptic('tap');
      ctx.store.settings.update((s) => ({ ...s, tileOrder: moveTile(ids, s.tileOrder, id, delta) }));
      requestAnimationFrame(() => /** @type {HTMLElement|null} */ (list.querySelector(`[data-move="${id}:${delta}"]`))?.focus());
    };
    const arrow = (tile, delta, i) =>
      h(
        'button',
        {
          type: 'button',
          class: 'icon-button',
          dataset: { move: `${tile.id}:${delta}` },
          'aria-label': t(delta < 0 ? 'profile.up' : 'profile.down', { title: t(tile.titleKey) }),
          disabled: delta < 0 ? i === 0 : i === tiles.length - 1,
          on: { click: () => move(tile.id, delta) },
        },
        icon(delta < 0 ? 'chevronUp' : 'chevronDown', { size: 20 }),
      );
    replace(
      list,
      tiles.map((tile, i) => h('li', { class: 'order-item' }, h('span', { class: 'order-title', text: t(tile.titleKey) }), arrow(tile, -1, i), arrow(tile, 1, i))),
    );
  };
  paint();
  return { el: list, destroy: ctx.watch(['settings'], paint) };
}

/** @param {AppContext} ctx */
export function openProfile(ctx) {
  /** @type {(() => void)[]} */
  let cleanups = [];
  const sheet = openSheet({
    title: t('profile.title'),
    size: 'tall',
    className: 'profile',
    onClose: () => {
      offLang();
      cleanups.forEach((fn) => fn());
    },
  });
  const paint = () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    sheet.setTitle(t('profile.title'));
    sheet.body.replaceChildren(...buildProfile(ctx, sheet, cleanups));
  };
  // Sprache gewechselt: Inhalt neu, Bildlauf bleibt.
  const offLang = ctx.bus.on('lang', () => {
    const top = sheet.body.scrollTop;
    paint();
    sheet.body.scrollTop = top;
  });
  paint();
  return sheet;
}

/**
 * Inhalt des Profils.
 * @param {AppContext} ctx
 * @param {import('../../ui/sheet.js').Sheet} sheet
 * @param {(() => void)[]} cleanups   wird befüllt
 * @returns {Node[]}
 */
function buildProfile(ctx, sheet, cleanups) {
  const { store, registry } = ctx;
  const profile = store.profile.get() ?? emptyProfile();
  const buddy = store.buddy.get();
  const companion = ctx.companion();

  const updateProfile = (patch) => store.profile.update((p) => ({ ...(p ?? emptyProfile()), ...patch }));
  const updateCompanion = (patch) => store.profile.update((p) => ({ ...(p ?? emptyProfile()), companion: withCompanion(p, patch) }));

  const hello = h('strong', { class: 'profile-hello' });
  const goalLine = h('span', { class: 'profile-goal' });
  const figure = h('span', { class: 'profile-figure' });
  const paintHead = () => {
    const p = store.profile.get() ?? emptyProfile();
    hello.textContent = p.name ? t('profile.hi', { name: p.name }) : t('profile.hiAnon');
    goalLine.textContent = p.goal ? goalLabel(p.goal) : t('profile.noGoal');
    const c = ctx.companion();
    replace(figure, companionFigure({ species: c.species, mood: 'happy', stage: companionStage(ctx), label: c.name }));
  };
  paintHead();
  cleanups.push(ctx.watch(['profile'], paintHead));

  const sample = h('p', { class: 'tone-sample' });
  const paintSample = () => {
    const c = ctx.companion();
    sample.textContent = t('common.quote', {
      text: companionLine('liveSet3', { species: c.species, name: c.name, tone: store.buddy.get().tone, user: store.profile.get()?.name ?? '', random: () => 0 }),
    });
  };
  paintSample();

  const mamaEdit = h('button', { type: 'button', class: 'link-button', text: t('profile.mamaEdit'), on: { click: () => openMamaSheet(ctx) } });
  const paintMamaLink = () => (mamaEdit.hidden = !ctx.hasModule('mama'));
  paintMamaLink();

  const theme = themeControl(ctx);
  const start = startViewControl(ctx);
  const lang = languageControl(ctx);
  const order = tileOrderList(ctx);
  cleanups.push(theme.destroy, start.destroy, lang.destroy, order.destroy);

  const modules = chipGroup({
    label: t('profile.modules'),
    variant: 'card',
    multiple: true,
    options: registry.list().map((m) => ({ value: m.id, label: t(m.labelKey), hint: t(m.hintKey), icon: m.icon })),
    selected: ctx.modules(),
    onChange: (selected) => {
      const before = ctx.modules();
      const changed = selected.find((v) => !before.includes(v)) ?? before.find((v) => !selected.includes(v));
      if (!changed) return;
      const next = toggleModule(before, changed, registry.ids());
      store.settings.update((s) => ({ ...s, enabledModules: next }));
      modules.setSelected(next);
      paintMamaLink();
      if (changed === 'mama' && next.includes('mama') && !store.mama.get()) openMamaSheet(ctx);
    },
  });

  return [
    h('div', { class: 'profile-head' }, figure, h('div', { class: 'profile-head-text' }, hello, goalLine)),
    section(
      t('profile.you'),
      textField({
        label: t('profile.name'),
        value: profile.name,
        placeholder: t('profile.namePlaceholder'),
        maxlength: 24,
        autocomplete: 'given-name',
        onInput: (v) => updateProfile({ name: v.trim() }),
      }),
      settingRow(
        t('profile.goal'),
        chipGroup({
          label: t('profile.goal'),
          options: goalOptions().map(({ value, label }) => ({ value, label })),
          selected: profile.goal ? [profile.goal] : [],
          onChange: ([v]) => updateProfile({ goal: v ?? '' }),
        }),
      ),
    ),
    section(t('profile.modules'), modules, mamaEdit),
    section(t('profile.order'), order.el),
    section(
      t('companion.section'),
      switchRow({
        label: t('companion.show'),
        hint: t('companion.showHint'),
        checked: buddy.on,
        onChange: (on) => store.buddy.update((b) => ({ ...b, on })),
      }),
      SPECIES.length > 1
        ? settingRow(
            t('companion.species'),
            chipGroup({
              label: t('companion.species'),
              options: SPECIES.map((sp) => ({ value: sp.id, label: t(`species.${sp.id}`) })),
              selected: [companion.species],
              allowEmpty: false,
              onChange: ([species]) => {
                updateCompanion({ species });
                paintSample();
              },
            }),
          )
        : null,
      textField({
        label: t('companion.name'),
        value: companion.name,
        placeholder: speciesInfo(companion.species).defaultName,
        maxlength: COMPANION_NAME_MAX,
        onInput: (v) => {
          updateCompanion({ name: v });
          paintSample();
        },
      }),
      h(
        'div',
        { class: 'setting' },
        h('p', { class: 'setting-label', text: t('companion.tone') }),
        segmented({
          label: t('companion.tone'),
          options: TONES.map((id) => ({ value: id, label: t(`tone.${id}`) })),
          value: buddy.tone,
          onChange: (tone) => {
            store.buddy.update((b) => ({ ...b, tone }));
            paintSample();
          },
        }),
        sample,
      ),
    ),
    section(t('profile.view'), lang.el, theme.el, start.el),
    section(t('data.title'), privacyPanel(ctx)),
    h('button', {
      type: 'button',
      class: 'link-button profile-restart',
      text: t('profile.restart'),
      on: {
        click: async () => {
          await sheet.close('restart');
          openOnboarding(ctx);
        },
      },
    }),
  ];
}
