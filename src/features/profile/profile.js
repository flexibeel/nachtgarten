/**
 * Profil-Sheet (über den Avatar auf „Heute“): Name, Ziel, Module, Reihenfolge auf „Heute“,
 * Begleiter, Ansicht, Daten. Änderungen werden sofort gespeichert.
 */

import { haptic } from '../../core/platform.js';
import { moveTile, toggleModule } from '../../domain/modules.js';
import { COMPANION_NAME_MAX, withCompanion } from '../../domain/companion.js';
import { SPECIES, speciesInfo } from '../../data/companions.js';
import { GOALS, goalLabel } from '../../data/goals.js';
import { TONES, companionLine } from '../../data/texts/companion.js';
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
import { settingRow, startViewControl, themeControl } from '../settings/controls.js';

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
  const save = h('button', { type: 'button', class: 'button button-primary button-wide', text: 'Speichern' });
  const sheet = openSheet({ title: 'Schwangerschaft & Rückbildung', content: form.el, actions: save });
  save.addEventListener('click', () => {
    const result = form.result();
    if (!result.ok) return haptic('warning');
    ctx.store.mama.set(result.state);
    haptic('success');
    sheet.close('save').then(() => toast('Gespeichert'));
  });
}

/**
 * „Heute anordnen“: sichtbare Kacheln mit Hoch/Runter.
 * @param {AppContext} ctx
 */
function tileOrderList(ctx) {
  const list = h('ol', { class: 'order-list', 'aria-label': 'Reihenfolge auf Heute' });
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
          'aria-label': `${tile.title} ${delta < 0 ? 'nach oben' : 'nach unten'}`,
          disabled: delta < 0 ? i === 0 : i === tiles.length - 1,
          on: { click: () => move(tile.id, delta) },
        },
        icon(delta < 0 ? 'chevronUp' : 'chevronDown', { size: 20 }),
      );
    replace(
      list,
      tiles.map((tile, i) => h('li', { class: 'order-item' }, h('span', { class: 'order-title', text: tile.title }), arrow(tile, -1, i), arrow(tile, 1, i))),
    );
  };
  paint();
  return { el: list, destroy: ctx.watch(['settings'], paint) };
}

/** @param {AppContext} ctx */
export function openProfile(ctx) {
  const { store, registry } = ctx;
  const profile = store.profile.get() ?? emptyProfile();
  const buddy = store.buddy.get();
  const companion = ctx.companion();
  /** @type {(() => void)[]} */
  const cleanups = [];

  const updateProfile = (patch) => store.profile.update((p) => ({ ...(p ?? emptyProfile()), ...patch }));
  const updateCompanion = (patch) => store.profile.update((p) => ({ ...(p ?? emptyProfile()), companion: withCompanion(p, patch) }));

  const hello = h('strong', { class: 'profile-hello' });
  const goalLine = h('span', { class: 'profile-goal' });
  const figure = h('span', { class: 'profile-figure' });
  const paintHead = () => {
    const p = store.profile.get() ?? emptyProfile();
    hello.textContent = p.name ? `Hi ${p.name}!` : 'Hi!';
    goalLine.textContent = p.goal ? goalLabel(p.goal) : 'Kein Ziel gewählt, auch okay.';
    const c = ctx.companion();
    replace(figure, companionFigure({ species: c.species, mood: 'happy', stage: companionStage(ctx), label: c.name }));
  };
  paintHead();
  cleanups.push(ctx.watch(['profile'], paintHead));

  const sample = h('p', { class: 'tone-sample' });
  const paintSample = () => {
    const c = ctx.companion();
    sample.textContent = `„${companionLine('liveSet3', { species: c.species, name: c.name, tone: store.buddy.get().tone, user: store.profile.get()?.name ?? '', random: () => 0 })}“`;
  };
  paintSample();

  const mamaEdit = h('button', { type: 'button', class: 'link-button', text: 'Angaben zu Schwangerschaft & Rückbildung', on: { click: () => openMamaSheet(ctx) } });
  const paintMamaLink = () => (mamaEdit.hidden = !ctx.hasModule('mama'));
  paintMamaLink();

  const theme = themeControl(ctx);
  const start = startViewControl(ctx);
  const order = tileOrderList(ctx);
  cleanups.push(theme.destroy, start.destroy, order.destroy);

  const modules = chipGroup({
    label: 'Was ist dir wichtig?',
    variant: 'card',
    multiple: true,
    options: registry.list().map((m) => ({ value: m.id, label: m.label, hint: m.hint, icon: m.icon })),
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

  const content = [
    h('div', { class: 'profile-head' }, figure, h('div', { class: 'profile-head-text' }, hello, goalLine)),
    section(
      'Du',
      textField({
        label: 'Name',
        value: profile.name,
        placeholder: 'Dein Name oder Spitzname',
        maxlength: 24,
        autocomplete: 'given-name',
        onInput: (v) => updateProfile({ name: v.trim() }),
      }),
      settingRow(
        'Ziel',
        chipGroup({
          label: 'Ziel',
          options: GOALS.map((g) => ({ value: g.id, label: g.label })),
          selected: profile.goal ? [profile.goal] : [],
          onChange: ([v]) => updateProfile({ goal: v ?? '' }),
        }),
      ),
    ),
    section('Was ist dir wichtig?', modules, mamaEdit),
    section('Heute anordnen', order.el),
    section(
      'Begleiter',
      switchRow({
        label: 'Begleiter zeigen',
        hint: 'Auf „Heute“ und ab und zu im Training.',
        checked: buddy.on,
        onChange: (on) => store.buddy.update((b) => ({ ...b, on })),
      }),
      SPECIES.length > 1
        ? settingRow(
            'Art',
            chipGroup({
              label: 'Art',
              options: SPECIES.map((sp) => ({ value: sp.id, label: sp.label })),
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
        label: 'Name',
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
        h('p', { class: 'setting-label', text: 'Ton' }),
        segmented({
          label: 'Ton',
          options: TONES.map((t) => ({ value: t.id, label: t.label })),
          value: buddy.tone,
          onChange: (tone) => {
            store.buddy.update((b) => ({ ...b, tone }));
            paintSample();
          },
        }),
        sample,
      ),
    ),
    section('Ansicht', theme.el, start.el),
    section('Deine Daten', privacyPanel(ctx)),
    h('button', {
      type: 'button',
      class: 'link-button profile-restart',
      text: 'Einrichtung noch einmal durchgehen',
      on: {
        click: async () => {
          await sheet.close('restart');
          openOnboarding(ctx);
        },
      },
    }),
  ];

  const sheet = openSheet({
    title: 'Dein Profil',
    content,
    size: 'tall',
    className: 'profile',
    onClose: () => cleanups.forEach((fn) => fn()),
  });
  return sheet;
}
