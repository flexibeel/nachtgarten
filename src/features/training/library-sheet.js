/**
 * Übungsbibliothek als Sheet: Suche, Hauptkategorien, Gerät, Favoriten.
 * Modus „pick“ wählt eine Übung (Live-Training), „view“ zeigt, wie sie geht.
 */

import { haptic } from '../../core/platform.js';
import { CATEGORIES, filterExercises, toggleFavorite } from '../../domain/library.js';
import { GEAR } from '../../data/gear.js';
import { mapExercise } from '../../data/exercise-map.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { createExerciseAnim } from '../../ui/anim/player.js';
import { DEFAULT_FAVORITES } from '../../data/library.js';
import { curatedList, dbReady, exerciseInstructions, findExercise, loadDb } from './exercises.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('./exercises.js').LibExercise} LibExercise */

const PAGE = 40;
const GEAR_FILTERS = [...GEAR.map((g) => g.id), 'Sonstiges'];

/** @param {string} gear */
export const gearLabel = (gear) => {
  const g = GEAR.find((x) => x.id === gear);
  return g ? t(g.key) : t('gear.other');
};
/** @param {string[]} muscles */
export const muscleLabel = (muscles) => muscles.slice(0, 2).map((m) => t(`muscle.${m}`)).join(', ');

/** @param {AppContext} ctx */
export function favoritesOf(ctx) {
  const ex = ctx.store.exercises.get();
  return ex.favoritesSet ? ex.favorites : ex.favorites.length ? ex.favorites : [...DEFAULT_FAVORITES];
}

/**
 * Favorit umschalten; eine Datenbank-Übung wird dabei übernommen.
 * @param {AppContext} ctx
 * @param {string} id
 */
export function toggleFav(ctx, id) {
  importExercise(ctx, id);
  const favs = favoritesOf(ctx);
  ctx.store.exercises.update((e) => ({ ...e, favorites: toggleFavorite(favs, id), favoritesSet: true }));
  return favoritesOf(ctx).includes(id);
}

/**
 * Datenbank-Übung in die eigenen Übungen übernehmen (wie v1), damit sie ohne Datenbank auflösbar bleibt.
 * @param {AppContext} ctx
 * @param {string} id
 */
export function importExercise(ctx, id) {
  if (!/^db\d+$/.test(id)) return;
  const { custom } = ctx.store.exercises.get();
  if (custom.some((c) => c.id === id)) return;
  const ex = findExercise(ctx, id);
  if (!ex) return;
  const saved = { id, name: ex.name, gear: ex.gear, muscles: ex.muscles, source: /** @type {const} */ ('db') };
  if (ex.attachment) saved.attachment = ex.attachment;
  ctx.store.exercises.update((e) => ({ ...e, custom: [...e.custom, saved] }));
}

/**
 * Alle Übungen der Bibliothek (kuratiert + übernommene/eigene + Datenbank, ohne Doppelte).
 * @param {AppContext} ctx
 * @returns {LibExercise[]}
 */
export function allExercises(ctx) {
  const seen = new Set();
  /** @type {LibExercise[]} */
  const out = [];
  const add = (ex) => {
    if (ex && !seen.has(ex.id)) {
      seen.add(ex.id);
      out.push(ex);
    }
  };
  curatedList().forEach((c) => add(findExercise(ctx, c.id)));
  ctx.store.exercises.get().custom.forEach((c) => add(findExercise(ctx, c.id) ?? c));
  if (dbReady()) for (let i = 0; i < 700; i++) add(findExercise(ctx, `db${i}`));
  return out;
}

/**
 * Zeile mit Stern.
 * @param {AppContext} ctx
 * @param {LibExercise} ex
 * @param {(id: string) => void} onOpen
 */
function row(ctx, ex, onOpen) {
  const fav = favoritesOf(ctx).includes(ex.id);
  const star = h('button', {
    type: 'button',
    class: 'icon-button lib-star',
    'aria-pressed': String(fav),
    'aria-label': t('library.favorite', { name: ex.name }),
  }, icon(fav ? 'starFilled' : 'star', { size: 20 }));
  star.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = toggleFav(ctx, ex.id);
    star.setAttribute('aria-pressed', String(on));
    replace(star, icon(on ? 'starFilled' : 'star', { size: 20 }));
    haptic('select');
  });
  const sub = [gearLabel(ex.gear), ex.attachment, muscleLabel(ex.muscles)].filter(Boolean).join(' · ');
  return h(
    'li',
    { class: 'lib-row' },
    h('button', { type: 'button', class: 'lib-open', dataset: { id: ex.id }, on: { click: () => onOpen(ex.id) } },
      h('span', { class: 'lib-name', text: ex.name }),
      h('span', { class: 'lib-sub', text: sub }),
    ),
    star,
  );
}

/**
 * @param {AppContext} ctx
 * @param {{mode?: 'pick'|'view', onPick?: (id: string) => void, title?: string}} [options]
 */
export function openLibrary(ctx, { mode = 'view', onPick, title } = {}) {
  const state = { query: '', category: /** @type {any} */ (null), gear: /** @type {string|null} */ (null), onlyFav: false, limit: PAGE };
  const list = h('ul', { class: 'lib-list' });
  const count = h('p', { class: 'lib-count', 'aria-live': 'polite' });
  const more = h('button', { type: 'button', class: 'button button-quiet lib-more' });
  const search = h('input', { class: 'input lib-search', type: 'search', placeholder: t('library.search'), 'aria-label': t('library.search'), enterkeyhint: 'search' });

  const chipRow = (label, options, get, set) => {
    const el = h('div', { class: 'lib-chips', role: 'group', 'aria-label': label });
    const paint = () =>
      replace(
        el,
        options.map((o) =>
          h('button', {
            type: 'button',
            class: 'chip chip-small',
            'aria-pressed': String(get() === o.value),
            text: o.label,
            on: {
              click: () => {
                set(get() === o.value ? null : o.value);
                haptic('select');
                paint();
                state.limit = PAGE;
                paintList();
              },
            },
          }),
        ),
      );
    paint();
    return el;
  };

  const own = ctx.store.gear.get();
  const gearOptions = [...own, ...GEAR_FILTERS.filter((g) => !own.includes(g))].map((g) => ({ value: g, label: gearLabel(g) }));
  const favChip = h('button', { type: 'button', class: 'chip chip-small lib-fav', 'aria-pressed': 'false' }, icon('star', { size: 16 }), h('span', { text: t('library.favorites') }));
  favChip.addEventListener('click', () => {
    state.onlyFav = !state.onlyFav;
    favChip.setAttribute('aria-pressed', String(state.onlyFav));
    haptic('select');
    paintList();
  });

  const open = (id) => {
    if (mode === 'pick') {
      importExercise(ctx, id);
      sheet.close('pick').then(() => onPick?.(id));
    } else openExerciseDetail(ctx, id);
  };

  const paintList = () => {
    const results = filterExercises(allExercises(ctx), {
      query: state.query,
      category: state.category,
      gear: state.gear,
      favorites: favoritesOf(ctx),
      onlyFavorites: state.onlyFav,
      ownGear: own,
    });
    count.textContent = t(results.length === 1 ? 'library.countOne' : 'library.count', { count: results.length });
    replace(list, results.slice(0, state.limit).map((ex) => row(ctx, ex, open)));
    if (!results.length) list.append(h('li', { class: 'lib-empty', text: t(state.onlyFav ? 'library.noFavorites' : 'library.nothing') }));
    more.hidden = results.length <= state.limit;
    more.textContent = t('library.more', { count: results.length - state.limit });
  };
  more.addEventListener('click', () => {
    state.limit += PAGE;
    paintList();
  });
  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.query = search.value;
      state.limit = PAGE;
      paintList();
    }, 90);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search.blur();
  });

  const sheet = openSheet({
    title: title ?? t('library.title'),
    size: 'tall',
    className: 'library',
    content: [
      search,
      chipRow(t('library.category'), CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) })), () => state.category, (v) => (state.category = v)),
      h('div', { class: 'lib-chips' }, favChip, chipRow(t('library.gear'), gearOptions, () => state.gear, (v) => (state.gear = v))),
      count,
      list,
      more,
    ],
  });
  paintList();
  if (!dbReady()) loadDb().then(() => sheet.el.isConnected && paintList());
  return sheet;
}

/**
 * „So geht’s“: Animation, Name, Gerät (mit Kabel-Aufsatz und Rollenhöhe), Muskeln, Hinweise.
 * @param {AppContext} ctx
 * @param {string} id
 * @param {{onPick?: () => void}} [options]
 */
export function openExerciseDetail(ctx, id, { onPick } = {}) {
  const ex = findExercise(ctx, id);
  if (!ex) return null;
  const prefs = ctx.store.exercises.get().prefs[id] ?? {};
  const cable = ex.gear === 'Kabelzug';
  const attachment = prefs.attachment ?? ex.attachment;
  const height = cable ? prefs.height ?? 'mittel' : null;
  const stage = h('div', { class: 'ex-anim' });
  const facts = [
    gearLabel(ex.gear),
    cable && attachment ? t('library.attachment', { value: attachment }) : null,
    height ? t('library.height', { value: t(`height.${height}`) }) : null,
    ...ex.muscles.slice(0, 3).map((m) => t(`muscle.${m}`)),
  ].filter(Boolean);
  const cues = ex.cues?.length ? ex.cues : [t('library.defaultCue')];
  const steps = h('details', { class: 'ex-steps', hidden: true });
  exerciseInstructions(ex).then((list) => {
    if (!list?.length) return;
    replace(steps, h('summary', { class: 'ex-steps-summary', text: t('library.steps') }), h('ol', { class: 'ex-steps-list' }, list.map((x) => h('li', { text: x }))));
    steps.hidden = false;
  });
  const pick = onPick ? h('button', { type: 'button', class: 'button button-primary button-wide', text: t('library.take') }) : null;
  const sheet = openSheet({
    title: ex.name,
    className: 'exercise-detail',
    content: [
      stage,
      h('ul', { class: 'ex-facts' }, facts.map((f) => h('li', { class: 'ex-fact', text: f }))),
      h('ol', { class: 'ex-cues' }, cues.map((c) => h('li', { text: c }))),
      steps,
    ],
    actions: pick ?? undefined,
    onClose: () => anim?.destroy(),
  });
  let anim = null;
  try {
    const map = ex.pattern
      ? { pattern: ex.pattern, equipment: mapExercise(ex).equipment, options: {} }
      : mapExercise({ ...ex, name: [ex.name, ex.en].filter(Boolean).join(' ') }, { handle: attachment, height: height ?? undefined });
    anim = createExerciseAnim(stage, { ...map, size: 200, label: t('library.animLabel', { name: ex.name }), muscles: ex.muscles });
  } catch {
    stage.hidden = true;
  }
  pick?.addEventListener('click', () => sheet.close('pick').then(() => onPick?.()));
  return sheet;
}

