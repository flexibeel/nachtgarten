/**
 * Übungsbibliothek als Sheet: Suche, Hauptkategorien, Gerät, Favoriten.
 * Modus „pick“ wählt eine Übung (Live-Training), „view“ zeigt, wie sie geht.
 */

import { haptic } from '../../core/platform.js';
import { CATEGORIES, filterExercises, toggleFavorite } from '../../domain/library.js';
import { GEAR } from '../../data/gear.js';
import { mapExercise } from '../../data/exercise-map.js';
import { variantOf } from '../../domain/variants.js';
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

/** Pixel-Symbol je Kategorie: eine typische Übung als Standbild. */
const CATEGORY_ICON = Object.freeze({ push: 'pushup', pull: 'pullup', legs: 'squat', glutes: 'bridge', core: 'plank', arms: 'curl', full: 'lunge' });

/**
 * Kleine Animation als Vorschau: steht still (erstes Bild), bewegt sich, solange man drückt.
 * Wird erst gebaut, wenn sie ins Bild kommt.
 * @param {AppContext} ctx
 * @param {string} id
 * @param {{size?: number}} [options]
 */
function thumb(ctx, id, { size = 48 } = {}) {
  const slot = h('span', { class: 'lib-thumb', 'aria-hidden': 'true' });
  /** @type {any} */
  let anim = null;
  const build = () => {
    const ex = findExercise(ctx, id);
    if (!ex || anim) return;
    try {
      anim = createExerciseAnim(slot, { ...animConfig(ex, ctx.store.exercises.get().prefs[id] ?? {}), size, autoplay: false, muscles: ex.muscles });
    } catch {
      anim = null;
    }
  };
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        build();
      }
    }, { rootMargin: '120px' });
    io.observe(slot);
  } else build();
  return {
    el: slot,
    play: () => anim?.play?.(),
    pause: () => anim?.pause?.(),
  };
}

/** Bewegt die Vorschau, solange der Finger drauf ist. @param {HTMLElement} target @param {ReturnType<typeof thumb>} th */
function pressToPlay(target, th) {
  const stop = () => th.pause();
  target.addEventListener('pointerdown', () => th.play());
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) target.addEventListener(ev, stop);
}

/**
 * Zeile mit Vorschau und Stern.
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
  const sub = [gearLabel(ex.gear), muscleLabel(ex.muscles)].filter(Boolean).join(' · ');
  const th = thumb(ctx, ex.id);
  const open = h('button', { type: 'button', class: 'lib-open', dataset: { id: ex.id }, on: { click: () => onOpen(ex.id) } },
    th.el,
    h('span', { class: 'lib-texts' }, h('span', { class: 'lib-name', text: ex.name }), h('span', { class: 'lib-sub', text: sub })),
  );
  pressToPlay(open, th);
  return h('li', { class: 'lib-row' }, open, star);
}

/**
 * Bibliothek: erst Kategorien als Kacheln (mit Pixel-Symbol), dann eine ruhige Liste mit Vorschau.
 * Suche springt direkt in die Liste über alle Übungen.
 * @param {AppContext} ctx
 * @param {{mode?: 'pick'|'view', onPick?: (id: string) => void, title?: string}} [options]
 */
export function openLibrary(ctx, { mode = 'view', onPick, title } = {}) {
  const state = { query: '', category: /** @type {any} */ (null), gear: /** @type {string|null} */ (null), onlyFav: false, all: false, limit: PAGE };
  const body = h('div', { class: 'lib-body' });
  const list = h('ul', { class: 'lib-list' });
  const count = h('p', { class: 'lib-count', 'aria-live': 'polite' });
  const more = h('button', { type: 'button', class: 'button button-quiet lib-more' });
  const search = h('input', { class: 'input lib-search', type: 'search', placeholder: t('library.search'), 'aria-label': t('library.search'), enterkeyhint: 'search' });
  const own = ctx.store.gear.get();
  const gearOptions = [...own, ...GEAR_FILTERS.filter((g) => !own.includes(g))].map((g) => ({ value: g, label: gearLabel(g) }));

  const inList = () => !!(state.category || state.query.trim() || state.onlyFav || state.all);
  const resetList = () => {
    state.limit = PAGE;
    paint();
  };

  const open = (id) => {
    if (mode === 'pick') {
      importExercise(ctx, id);
      sheet.close('pick').then(() => onPick?.(id));
    } else openExerciseDetail(ctx, id);
  };

  const results = () =>
    filterExercises(allExercises(ctx), {
      query: state.query,
      category: state.category,
      gear: state.gear,
      favorites: favoritesOf(ctx),
      onlyFavorites: state.onlyFav,
      ownGear: own,
    });

  /** Startseite: Kacheln. */
  const paintHome = () => {
    const every = allExercises(ctx);
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, filterExercises(every, { category: c, ownGear: own }).length]));
    const tile = (label, sub, iconEl, onClick, cls) =>
      h('button', { type: 'button', class: ['lib-cat', cls], on: { click: () => { haptic('select'); onClick(); } } },
        iconEl,
        h('span', { class: 'lib-cat-texts' }, h('span', { class: 'lib-cat-name', text: label }), sub ? h('span', { class: 'lib-cat-sub', text: sub }) : null),
      );
    replace(
      body,
      h('div', { class: 'lib-cats', role: 'list', 'aria-label': t('library.categories') },
        tile(t('library.favorites'), null, h('span', { class: 'lib-cat-icon is-star', 'aria-hidden': 'true' }, icon('starFilled', { size: 22 })), () => { state.onlyFav = true; resetList(); }, 'is-fav'),
        CATEGORIES.map((c) => {
          const th = thumb(ctx, CATEGORY_ICON[c], { size: 44 });
          const el = tile(t(`category.${c}`), t('library.categoryCount', { count: counts[c] }), th.el, () => { state.category = c; resetList(); });
          el.dataset.category = c;
          pressToPlay(el, th);
          return el;
        }),
        tile(t('library.allExercises'), t('library.categoryCount', { count: every.length }), h('span', { class: 'lib-cat-icon', 'aria-hidden': 'true' }, icon('list', { size: 22 })), () => { state.all = true; resetList(); }, 'is-all'),
      ),
    );
  };

  /** Liste einer Kategorie / der Suche. */
  const paintList = () => {
    const found = results();
    const heading = state.onlyFav ? t('library.favorites') : state.category ? t(`category.${state.category}`) : state.query.trim() ? null : t('library.allExercises');
    const back = h('button', {
      type: 'button',
      class: 'chip chip-small lib-back',
      on: { click: () => { haptic('tap'); Object.assign(state, { category: null, onlyFav: false, all: false, gear: null, query: '' }); search.value = ''; paint(); } },
    }, icon('arrowLeft', { size: 16 }), h('span', { text: t('library.categories') }));
    const gearRow = h('div', { class: 'lib-chips', role: 'group', 'aria-label': t('library.gear') },
      gearOptions.map((o) => h('button', {
        type: 'button',
        class: 'chip chip-small',
        'aria-pressed': String(state.gear === o.value),
        text: o.label,
        on: { click: () => { state.gear = state.gear === o.value ? null : o.value; haptic('select'); resetList(); } },
      })));
    count.textContent = t(found.length === 1 ? 'library.countOne' : 'library.count', { count: found.length });
    replace(list, found.slice(0, state.limit).map((ex) => row(ctx, ex, open)));
    if (!found.length) list.append(h('li', { class: 'lib-empty', text: t(state.onlyFav ? 'library.noFavorites' : 'library.nothing') }));
    more.hidden = found.length <= state.limit;
    more.textContent = t('library.more', { count: found.length - state.limit });
    replace(
      body,
      h('div', { class: 'lib-list-head' }, back, heading ? h('h3', { class: 'lib-heading', text: heading }) : null),
      gearRow,
      count,
      list,
      more,
    );
  };

  const paint = () => (inList() ? paintList() : paintHome());

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
      paint();
    }, 90);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search.blur();
  });

  const sheet = openSheet({
    title: title ?? t('library.title'),
    size: 'tall',
    className: 'library',
    content: [search, body],
  });
  paint();
  if (!dbReady()) loadDb().then(() => sheet.el.isConnected && paint());
  return sheet;
}

/**
 * Animation zu einer Übung (Muster, Gerät, Optionen) – für „So geht’s“ und das Live-Training.
 * @param {import('./exercises.js').LibExercise} ex
 * @param {{attachment?: string, height?: string}} [prefs]
 */
export function animConfig(ex, prefs = {}) {
  const own = variantOf(ex.id)?.variant.anim;
  if (own) return { pattern: own.pattern, equipment: own.equipment, options: { ...(own.options ?? {}) } };
  const cable = ex.gear === 'Kabelzug';
  const attachment = prefs.attachment ?? ex.attachment;
  const height = cable ? prefs.height ?? 'mittel' : null;
  return ex.pattern
    ? { pattern: ex.pattern, equipment: mapExercise(ex).equipment, options: {} }
    : mapExercise({ ...ex, name: [ex.name, ex.en].filter(Boolean).join(' ') }, { handle: attachment, height: height ?? undefined });
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
    const map = animConfig(ex, prefs);
    anim = createExerciseAnim(stage, { ...map, size: 200, label: t('library.animLabel', { name: ex.name }), muscles: ex.muscles });
  } catch {
    stage.hidden = true;
  }
  pick?.addEventListener('click', () => sheet.close('pick').then(() => onPick?.()));
  return sheet;
}

