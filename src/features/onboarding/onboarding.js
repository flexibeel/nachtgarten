/**
 * Onboarding im Sheet: der Begleiter stellt wenige Fragen, jeder Schritt ist überspringbar,
 * der Datenschutz-Satz ist immer sichtbar. Gespeichert wird erst am Ende.
 */

import { haptic } from '../../core/platform.js';
import { BODYWEIGHT, GEAR } from '../../data/gear.js';
import { GOALS } from '../../data/goals.js';
import { SPECIES, speciesInfo } from '../../data/companions.js';
import { ONBOARDING_LINES, TONES, companionLine, fillLine } from '../../data/texts/companion.js';
import { COMPANION_NAME_MAX, companionOf } from '../../domain/companion.js';
import { h, replace } from '../../ui/dom.js';
import { chipGroup, segmented } from '../../ui/chips.js';
import { switchRow, textField } from '../../ui/fields.js';
import { icon } from '../../ui/icons.js';
import { companionSpeech } from '../../ui/companion.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { mamaForm } from '../mama/mama-setup.js';
import { PRIVACY_LINE } from '../privacy/privacy.js';
import { neighbourStep, onboardingSteps } from './steps.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('./steps.js').StepId} StepId */

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6];
const NAME_MAX = 24;

/** Überschrift und Stimmung des Begleiters je Schritt. */
const STEP_COPY = /** @type {const} */ ({
  hello: { title: 'Wie heißt du?', mood: 'happy' },
  modules: { title: 'Was ist dir wichtig?', mood: 'cheer' },
  mama: { title: 'Bist du gerade schwanger oder hast du vor Kurzem entbunden?', mood: 'calm' },
  goal: { title: 'Was möchtest du für dich?', mood: 'calm' },
  days: { title: 'Wie viele Tage pro Woche?', mood: 'happy' },
  gear: { title: 'Was hast du da?', mood: 'proud' },
  companion: { title: 'Dein Begleiter', mood: 'happy' },
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
    species: companion.species,
    companionName: companion.name,
    tone: buddy.tone,
    companionOn: buddy.on,
    /** @type {import('../../core/store.js').MamaState|null} */
    mama: store.mama.get(),
  };

  /** @type {StepId} */
  let step = 'hello';
  /** @type {ReturnType<typeof mamaForm>|null} */
  let mama = null;

  const back = h('button', { type: 'button', class: 'button button-quiet', text: 'Zurück' });
  const next = h('button', { type: 'button', class: 'button button-primary' });
  const progress = h('div', { class: 'onboarding-progress', 'aria-hidden': 'true' });
  const privacy = h('p', { class: 'privacy-line privacy-line-small' }, icon('lock', { size: 16 }), h('span', { text: `Freiwillig. ${PRIVACY_LINE}` }));

  const sheet = openSheet({
    title: 'Willkommen',
    hideTitle: true,
    dismissible: false,
    size: 'tall',
    className: 'onboarding',
    actions: [h('div', { class: 'onboarding-actions' }, back, next), privacy],
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
    next.textContent = last ? 'Los geht’s' : answered() ? 'Weiter' : 'Überspringen';
    replace(
      progress,
      list.map((id) => h('span', { class: ['onboarding-dot', id === step && 'is-current', list.indexOf(id) < list.indexOf(step) && 'is-done'] })),
    );
  };

  /** @param {StepId} id */
  const content = (id) => {
    switch (id) {
      case 'hello':
        return textField({
          label: 'Dein Name oder Spitzname',
          value: draft.name,
          placeholder: 'Optional',
          maxlength: NAME_MAX,
          autocomplete: 'given-name',
          hideLabel: true,
          onInput: (v) => {
            draft.name = v;
            paintButtons();
          },
        });
      case 'modules':
        return [
          chipGroup({
            label: 'Was ist dir wichtig?',
            variant: 'card',
            multiple: true,
            options: ctx.registry.list().map((m) => ({ value: m.id, label: m.label, hint: m.hint, icon: m.icon })),
            selected: draft.modules,
            onChange: (v) => {
              draft.modules = v;
              paintButtons();
            },
          }),
          h('p', { class: 'field-hint', text: 'Die App zeigt dann nur das. Du kannst es jederzeit im Profil ändern.' }),
        ];
      case 'mama':
        mama = mamaForm({ initial: draft.mama, today: ctx.today(), onChange: paintButtons });
        return mama.el;
      case 'goal':
        return chipGroup({
          label: 'Was möchtest du für dich?',
          variant: 'card',
          options: GOALS.map((g) => ({ value: g.id, label: g.label, hint: g.hint })),
          selected: draft.goal ? [draft.goal] : [],
          onChange: ([v]) => {
            draft.goal = v ?? '';
            paintButtons();
          },
        });
      case 'days':
        return [
          segmented({
            label: 'Trainingstage pro Woche',
            options: DAY_OPTIONS.map((n) => ({ value: n, label: String(n) })),
            value: draft.days,
            onChange: (v) => (draft.days = v),
          }),
          h('p', { class: 'field-hint', text: 'Das wird dein Wochenziel. Ausgelassene Tage sind kein Drama.' }),
        ];
      case 'gear':
        return [
          chipGroup({
            label: 'Geräte',
            multiple: true,
            options: GEAR.map((g) => ({ value: g, label: g })),
            selected: draft.gear,
            onChange: (v) => (draft.gear = v.length ? v : [BODYWEIGHT]),
          }),
          h('p', { class: 'field-hint', text: 'Übungen mit Körpergewicht gehen immer.' }),
        ];
      case 'companion': {
        const sample = h('p', { class: 'tone-sample' });
        const paintSample = () =>
          (sample.textContent = `„${companionLine('liveSet3', { species: draft.species, tone: draft.tone, user: draft.name, name: cName(), random: () => 0 })}“`);
        paintSample();
        return [
          SPECIES.length > 1
            ? chipGroup({
                label: 'Begleiter',
                options: SPECIES.map((sp) => ({ value: sp.id, label: sp.label })),
                selected: [draft.species],
                allowEmpty: false,
                onChange: ([v]) => {
                  draft.species = v;
                  paint();
                },
              })
            : null,
          textField({
            label: 'Name deines Begleiters',
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
            h('p', { class: 'setting-label', text: 'Wie soll ich mit dir reden?' }),
            segmented({
              label: 'Ton',
              options: TONES.map((t) => ({ value: t.id, label: t.label })),
              value: draft.tone,
              onChange: (v) => {
                draft.tone = /** @type {any} */ (v);
                paintSample();
              },
            }),
            sample,
          ),
          switchRow({
            label: 'Begleiter zeigen',
            hint: 'Auf „Heute“ und ab und zu im Training. Jederzeit abschaltbar.',
            checked: draft.companionOn,
            onChange: (v) => (draft.companionOn = v),
          }),
        ];
      }
      default:
        return [];
    }
  };

  const paint = () => {
    const copy = STEP_COPY[step];
    const speech = companionSpeech({
      species: draft.species,
      name: cName(),
      stage: 1,
      mood: copy.mood,
      line: fillLine(ONBOARDING_LINES[step], { user: draft.name, name: cName() }),
      size: 'large',
    });
    replace(sheet.body, progress, speech.el, h('h1', { class: 'onboarding-title', tabindex: '-1', text: copy.title }), h('div', { class: 'onboarding-content' }, content(step)));
    sheet.setTitle(copy.title);
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
    store.settings.update((s) => ({ ...s, enabledModules: modules }));
    store.gear.set(draft.gear);
    store.buddy.update((b) => ({ ...b, tone: draft.tone, on: draft.companionOn }));
    if (draft.mama && modules.includes('mama')) store.mama.set(draft.mama);
    haptic('success');
    const name = draft.name.trim();
    sheet.close('done').then(() => toast(name ? `Willkommen, ${name}.` : 'Willkommen.'));
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
