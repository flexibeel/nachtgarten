/**
 * Onboarding im Sheet: der Begleiter stellt wenige Fragen, jeder Schritt ist überspringbar,
 * der Datenschutz-Satz ist immer sichtbar. Gespeichert wird erst am Ende.
 */

import { haptic } from '../../core/platform.js';
import { BODYWEIGHT, gearOptions } from '../../data/gear.js';
import { goalOptions } from '../../data/goals.js';
import { FEATURED_SPECIES, speciesInfo } from '../../data/companions.js';
import { TONES, companionLine, onboardingLine } from '../../data/texts/companion.js';
import { t } from '../../data/texts/i18n.js';
import { COMPANION_NAME_MAX, companionOf } from '../../domain/companion.js';
import { h, replace } from '../../ui/dom.js';
import { chipGroup, segmented } from '../../ui/chips.js';
import { textField } from '../../ui/fields.js';
import { icon } from '../../ui/icons.js';
import { companionSpeech } from '../../ui/companion.js';
import { openSheet } from '../../ui/sheet.js';
import { mamaForm } from '../mama/mama-setup.js';
import { languageControl } from '../settings/controls.js';
import { neighbourStep, onboardingSteps } from './steps.js';
import { PLAIN, companionPicker } from '../companion/picker.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('./steps.js').StepId} StepId */

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6];
const NAME_MAX = 24;

/** Stimmung des Begleiters je Schritt (Überschrift: t(`onboarding.title.<schritt>`)). */
const STEP_MOOD = /** @type {const} */ ({
  hello: 'happy',
  modules: 'cheer',
  mama: 'calm',
  goal: 'calm',
  days: 'happy',
  gear: 'proud',
  companion: 'happy',
});

/**
 * @param {AppContext} ctx
 * @param {{onDone?: () => void}} [options]
 */
export function openOnboarding(ctx, { onDone } = {}) {
  const { store } = ctx;
  const profile = store.profile.get();
  const buddy = store.buddy.get();
  const settings = store.settings.get();
  const companion = companionOf(profile);

  /** Entwurf: wird erst bei „Los geht’s“ gespeichert. */
  const draft = {
    name: profile?.name ?? '',
    /** @type {string[]} leer = noch nichts gewählt (dann gilt der Standard) */
    modules: settings.enabledModules ? ctx.registry.enabled(settings.enabledModules) : [],
    goal: profile?.goal ?? '',
    days: profile?.days || 3,
    gear: store.gear.exists() ? store.gear.get() : [BODYWEIGHT],
    // Neue Profile starten mit Elli; bestehende behalten ihren Begleiter.
    species: profile?.companion ? companion.species : FEATURED_SPECIES,
    companionName: profile?.companion ? companion.name : '',
    tone: buddy.tone,
    plain: typeof settings.plain === 'boolean' ? settings.plain : !buddy.on,
    /** @type {import('../../core/store.js').MamaState|null} */
    mama: store.mama.get(),
  };

  /** @type {StepId} */
  let step = 'hello';
  /** @type {ReturnType<typeof mamaForm>|null} */
  let mama = null;

  const back = h('button', { type: 'button', class: 'button button-quiet' });
  const next = h('button', { type: 'button', class: 'button button-primary' });
  const progress = h('div', { class: 'onboarding-progress', 'aria-hidden': 'true' });
  const privacyText = h('span');
  const privacy = h('p', { class: 'privacy-line privacy-line-small' }, icon('lock', { size: 16 }), privacyText);

  const sheet = openSheet({
    title: t('onboarding.label'),
    hideTitle: true,
    dismissible: false,
    size: 'tall',
    className: 'onboarding',
    actions: [h('div', { class: 'onboarding-actions' }, back, next), privacy],
    onClose: () => {
      offLang();
      speech?.destroy();
    },
  });

  const steps = () => onboardingSteps(ctx.registry.enabled(draft.modules.length ? draft.modules : null));
  const cName = () => draft.companionName.trim() || speciesInfo(draft.species).defaultName;

  /** Hat der Schritt eine Eingabe? Sonst heißt der Knopf „Überspringen“. */
  const answered = () => {
    switch (step) {
      case 'hello':
        return !!draft.name.trim();
      case 'modules':
        return draft.modules.length > 0;
      case 'mama':
        return !!mama?.touched();
      case 'goal':
        return !!draft.goal;
      default:
        return true;
    }
  };

  const paintButtons = () => {
    const list = steps();
    const last = list[list.length - 1] === step;
    back.hidden = step === list[0];
    back.textContent = t('common.back');
    next.textContent = t(last ? 'onboarding.start' : answered() ? 'common.next' : 'common.skip');
    replace(
      progress,
      list.map((id) => h('span', { class: ['onboarding-dot', id === step && 'is-current', list.indexOf(id) < list.indexOf(step) && 'is-done'] })),
    );
  };

  /** Sprachwahl auf dem ersten Schritt; ein Wechsel zeichnet das Onboarding neu. */
  const languageSwitch = () => {
    const control = languageControl(ctx);
    control.el.classList.add('onboarding-lang');
    return control.el;
  };
  const offLang = ctx.bus.on('lang', () => paint());

  /** @param {StepId} id */
  const content = (id) => {
    switch (id) {
      case 'hello':
        return [
          textField({
            label: t('onboarding.nameLabel'),
            value: draft.name,
            placeholder: t('common.optional'),
            maxlength: NAME_MAX,
            autocomplete: 'given-name',
            hideLabel: true,
            onInput: (v) => {
              draft.name = v;
              paintButtons();
            },
          }),
          languageSwitch(),
        ];
      case 'modules':
        return [
          chipGroup({
            label: t('onboarding.title.modules'),
            variant: 'card',
            multiple: true,
            options: ctx.registry.list().map((m) => ({ value: m.id, label: t(m.labelKey), hint: t(m.hintKey), icon: m.icon })),
            selected: draft.modules,
            onChange: (v) => {
              draft.modules = v;
              paintButtons();
            },
          }),
          h('p', { class: 'field-hint', text: t('onboarding.modulesHint') }),
        ];
      case 'mama':
        mama = mamaForm({ initial: draft.mama, today: ctx.today(), onChange: paintButtons });
        return mama.el;
      case 'goal':
        return chipGroup({
          label: t('onboarding.title.goal'),
          variant: 'card',
          options: goalOptions(),
          selected: draft.goal ? [draft.goal] : [],
          onChange: ([v]) => {
            draft.goal = v ?? '';
            paintButtons();
          },
        });
      case 'days':
        return [
          segmented({
            label: t('onboarding.daysLabel'),
            options: DAY_OPTIONS.map((n) => ({ value: n, label: String(n) })),
            value: draft.days,
            onChange: (v) => (draft.days = v),
          }),
          h('p', { class: 'field-hint', text: t('onboarding.daysHint') }),
        ];
      case 'gear':
        return [
          chipGroup({
            label: t('onboarding.gearLabel'),
            multiple: true,
            options: gearOptions(),
            selected: draft.gear,
            onChange: (v) => (draft.gear = v.length ? v : [BODYWEIGHT]),
          }),
          h('p', { class: 'field-hint', text: t('onboarding.gearHint') }),
        ];
      case 'companion': {
        const sample = h('p', { class: 'tone-sample' });
        const paintSample = () =>
          (sample.textContent = t('common.quote', { text: companionLine('liveSet3', { species: draft.species, tone: draft.tone, user: draft.name, name: cName(), random: () => 0 }) }));
        paintSample();
        const picker = companionPicker({
          value: draft.plain ? PLAIN : draft.species,
          withPlain: true,
          onChange: (v) => {
            draft.plain = v === PLAIN;
            if (!draft.plain) draft.species = v;
            paint();
          },
        });
        if (draft.plain) return [picker, h('p', { class: 'field-hint plain-note', text: t('companion.plainOnboarding') })];
        return [
          picker,
          textField({
            label: t('companion.name'),
            value: draft.companionName,
            placeholder: speciesInfo(draft.species).defaultName,
            maxlength: COMPANION_NAME_MAX,
            onInput: (v) => {
              draft.companionName = v;
              sheet.body.querySelectorAll('.companion-who').forEach((n) => (n.textContent = cName()));
            },
          }),
          h(
            'div',
            { class: 'setting' },
            h('p', { class: 'setting-label', text: t('companion.toneQuestion') }),
            segmented({
              label: t('companion.tone'),
              options: TONES.map((id) => ({ value: id, label: t(`tone.${id}`) })),
              value: draft.tone,
              onChange: (v) => {
                draft.tone = /** @type {any} */ (v);
                paintSample();
              },
            }),
            sample,
          ),
        ];
      }
      default:
        return [];
    }
  };

  /** @type {{destroy: () => void}|null} */
  let speech = null;
  const paint = () => {
    const title = t(`onboarding.title.${step}`);
    speech?.destroy();
    speech = companionSpeech({
      species: draft.species,
      name: cName(),
      stage: 1,
      mood: STEP_MOOD[step],
      line: onboardingLine(step, { user: draft.name, name: cName() }),
      size: 'large',
    });
    const quiet = draft.plain && step === 'companion';
    replace(sheet.body, progress, quiet ? null : speech.el, h('h1', { class: 'onboarding-title', tabindex: '-1', text: title }), h('div', { class: 'onboarding-content' }, content(step)));
    sheet.setTitle(title);
    privacyText.textContent = t('privacy.optional');
    paintButtons();
    sheet.body.scrollTop = 0;
    const field = /** @type {HTMLElement|null} */ (sheet.body.querySelector('.onboarding-content input[type="text"]'));
    /** @type {HTMLElement|null} */ (field ?? sheet.body.querySelector('.onboarding-title'))?.focus({ preventScroll: true });
  };

  /** Eingaben des Mama-Schritts übernehmen; false = auf dem Schritt bleiben. */
  const commitMama = () => {
    if (step !== 'mama' || !mama?.touched()) return true;
    const result = mama.result();
    if (!result.ok) {
      haptic('warning');
      return false;
    }
    draft.mama = result.state;
    return true;
  };

  const finish = () => {
    const modules = ctx.registry.enabled(draft.modules);
    store.profile.set({
      name: draft.name.trim(),
      goal: draft.goal,
      age: profile?.age ?? null,
      weight: profile?.weight ?? null,
      days: draft.days,
      companion: { species: draft.species, name: cName() },
    });
    store.settings.update((s) => ({ ...s, enabledModules: modules, plain: draft.plain }));
    store.gear.set(draft.gear);
    store.buddy.update((b) => ({ ...b, tone: draft.tone, on: !draft.plain }));
    if (draft.mama && modules.includes('mama')) store.mama.set(draft.mama);
    haptic('success');
    // Kein „Willkommen“-Hinweis: Er lag oft noch über dem nächsten Bildschirm. Begrüßt wird auf „Heute“.
    sheet.close('done');
    onDone?.();
  };

  next.addEventListener('click', () => {
    if (!commitMama()) return;
    const target = neighbourStep(steps(), step, 1);
    if (!target) return finish();
    step = target;
    haptic('tap');
    paint();
  });
  back.addEventListener('click', () => {
    step = neighbourStep(steps(), step, -1) ?? step;
    paint();
  });

  paint();
  return sheet;
}
