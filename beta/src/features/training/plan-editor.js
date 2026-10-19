/**
 * „Eigenen Plan erstellen“: ruhige Übersicht der Einheiten (Karten mit Wochentagen),
 * je Einheit eine geordnete Übungsliste zum Verschieben (Griff, auf dem Handy lange drücken),
 * Wischen nach links löscht (mit „Rückgängig“), Antippen öffnet Sätze/Wdh./Reserve/Pause.
 * Jede Änderung wird sofort gespeichert und in Pläne + Wochenplan übertragen (domain/plan-editor.js).
 */

import { haptic } from '../../core/platform.js';
import { DEFAULT_ITEM, LIMITS, dropProgram, editProgram, itemLabel, newProgram, programFromTemplate, programHints, syncProgram } from '../../domain/plan-editor.js';
import { baseOf, siblingsOf, variantOf } from '../../domain/variants.js';
import { PLAN_TEMPLATES } from '../../data/plans.js';
import { libraryIdFor } from '../../data/plan-exercise-map.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { stepper } from '../../ui/stepper.js';
import { toast } from '../../ui/toast.js';
import { exerciseLookup, loadDb } from './exercises.js';
import { openLibrary, thumb } from './library-sheet.js';
import { sharePlanLink } from './plan-link.js';
import { shortDay, longDay } from '../days.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../../domain/plan-editor.js').Program} Program */
/** @typedef {import('../../domain/plan-editor.js').ProgramSession} ProgramSession */

/** Ab so viel Wischen nach links wird gelöscht (px). */
const SWIPE_DELETE = 96;
/** So lange drücken, bis auf dem Handy das Verschieben beginnt (ms). */
const LONG_PRESS = 380;

/* ------------------------------------------------------------ Speicher */

/** @param {AppContext} ctx @param {string} id @returns {Program|undefined} */
const findProgram = (ctx, id) => ctx.store.programs.get().find((p) => p.id === id);

/**
 * Programm speichern und in Pläne/Wochenplan übertragen.
 * @param {AppContext} ctx
 * @param {Program} program
 */
function saveProgram(ctx, program) {
  const { store } = ctx;
  store.programs.update((list) => (list.some((p) => p.id === program.id) ? list.map((p) => (p.id === program.id ? program : p)) : [...list, program]));
  const synced = syncProgram(program, { plans: store.plans.get(), schedule: store.schedule.get() });
  store.plans.set(synced.plans);
  store.schedule.set(synced.schedule);
}

/**
 * Aktion anwenden und speichern; liefert das neue Programm.
 * @param {AppContext} ctx
 * @param {string} id
 * @param {{type: string, [k: string]: any}} action
 */
function apply(ctx, id, action) {
  const cur = findProgram(ctx, id);
  if (!cur) return null;
  const next = editProgram(cur, action);
  if (next !== cur) saveProgram(ctx, next);
  return next;
}

/* ------------------------------------------------------------ Anlegen */

/**
 * Leer beginnen oder eine der zehn Vorlagen kopieren.
 * @param {AppContext} ctx
 */
export function openCreatePlan(ctx) {
  const start = (/** @type {Program} */ program) => {
    saveProgram(ctx, program);
    haptic('success');
    sheet.close('create').then(() => ctx.go('editor', { params: { id: program.id } }));
  };
  const big = (title, sub, iconName, onClick, cls) =>
    h('button', { type: 'button', class: ['editor-choice', cls], on: { click: onClick } },
      h('span', { class: 'editor-choice-icon', 'aria-hidden': 'true' }, icon(iconName, { size: 22 })),
      h('span', { class: 'editor-choice-texts' }, h('span', { class: 'editor-choice-title', text: title }), h('span', { class: 'editor-choice-sub', text: sub })),
    );
  const templates = h('ul', { class: 'editor-templates', hidden: true },
    PLAN_TEMPLATES.map((tpl) =>
      h('li', {},
        h('button', {
          type: 'button',
          class: 'editor-template',
          dataset: { template: tpl.id },
          on: { click: () => start(programFromTemplate(tpl, { now: ctx.now(), mapId: libraryIdFor })) },
        },
          h('span', { class: 'editor-template-name', text: tpl.name }),
          h('span', { class: 'editor-template-sub', text: t('editor.templateMeta', { days: tpl.daysPerWeek, focus: tpl.focusLabel }) }),
          icon('chevronRight', { size: 18 }),
        ))),
  );
  const sheet = openSheet({
    title: t('editor.createTitle'),
    className: 'editor-create',
    size: 'tall',
    content: [
      big(t('editor.blank'), t('editor.blankSub'), 'plus', () =>
        start(newProgram({ name: t('editor.defaultName'), sessionName: t('editor.defaultSession', { id: 'A' }), now: ctx.now() }))),
      big(t('editor.fromTemplate'), t('editor.fromTemplateSub'), 'sparkle', () => {
        haptic('select');
        templates.hidden = !templates.hidden;
      }, 'is-template'),
      templates,
    ],
  });
}

/* ------------------------------------------------------------ Bausteine */

/**
 * Sieben Tages-Chips Mo…So für eine Einheit.
 * @param {AppContext} ctx
 * @param {Program} program
 * @param {ProgramSession} session
 * @param {() => void} onChange
 */
function dayChips(ctx, program, session, onChange) {
  return h('div', { class: 'editor-days', role: 'group', 'aria-label': t('editor.daysFor', { name: session.name || session.id }) },
    program.week.map((sid, day) =>
      h('button', {
        type: 'button',
        class: ['editor-day', sid && sid !== session.id && 'is-other'],
        'aria-pressed': String(sid === session.id),
        'aria-label': longDay(day),
        text: shortDay(day),
        dataset: { day: String(day) },
        on: {
          click: (e) => {
            e.stopPropagation();
            haptic('select');
            apply(ctx, program.id, { type: 'toggleDay', session: session.id, day });
            onChange();
          },
        },
      })));
}

/** Kopf mit Zurück, Titel-Eingabe und „Mehr“. */
function topBar(backHref, backLabel, ...actions) {
  return h('header', { class: 'editor-top' },
    h('a', { class: 'back-link', href: backHref }, icon('arrowLeft', { size: 20 }), h('span', { text: backLabel })),
    h('span', { class: 'editor-top-space' }),
    actions,
  );
}

/* ------------------------------------------------------------ Übersicht */

/**
 * #editor?id=… – Name, Hinweise, Einheiten als Karten mit Wochentagen.
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {import('../../core/router.js').Route} route
 */
export function mountEditor(ctx, view, route) {
  const id = route.params.id;
  if (!findProgram(ctx, id)) {
    ctx.go('training', { replace: true });
    return () => {};
  }
  const root = h('div', { class: 'editor' });
  view.append(root);

  const name = h('input', { class: 'editor-name', type: 'text', maxlength: 60, 'aria-label': t('editor.namePlaceholder'), placeholder: t('editor.namePlaceholder'), enterkeyhint: 'done' });
  name.value = findProgram(ctx, id)?.name ?? '';
  name.addEventListener('input', () => apply(ctx, id, { type: 'rename', name: name.value }));
  name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());

  const hints = h('section', { class: 'editor-hints', 'aria-live': 'polite' });
  const sessions = h('ol', { class: 'editor-sessions', 'aria-label': t('editor.sessionsTitle') });
  const addSession = h('button', { type: 'button', class: 'button button-quiet button-wide editor-add-session' }, icon('plus'), h('span', { text: t('editor.addSession') }));
  const more = h('button', { type: 'button', class: 'icon-button editor-more', 'aria-label': t('live.more') }, icon('more', { size: 22 }));
  const done = h('a', { class: 'button button-primary editor-done', href: '#training', text: t('editor.done') });

  const paintHints = () => {
    const program = findProgram(ctx, id);
    const list = program ? programHints(program) : [];
    hints.hidden = !list.length;
    replace(hints, list.length
      ? [h('p', { class: 'editor-hints-title' }, icon('sparkle', { size: 16 }), h('span', { text: t('editor.hintsTitle') })),
        h('ul', { class: 'editor-hints-list' }, list.map((x) => h('li', { text: x.text }))),
        h('p', { class: 'editor-hints-sub', text: t('editor.hintsSub') })]
      : []);
  };

  const paint = () => {
    const program = findProgram(ctx, id);
    if (!program) return;
    replace(sessions, program.sessions.map((s) => {
      const count = s.items.length;
      const meta = count ? t(count === 1 ? 'editor.sessionMetaOne' : 'editor.sessionMeta', { count }) : t('editor.sessionMetaNone');
      return h('li', { class: 'editor-session', dataset: { session: s.id } },
        h('a', { class: 'editor-session-open', href: `#einheit?id=${encodeURIComponent(id)}&s=${encodeURIComponent(s.id)}` },
          h('span', { class: 'editor-session-texts' },
            // „Tag A“ nur, wenn die Einheit anders heißt (sonst stünde es doppelt da).
            h('span', { class: 'editor-session-eyebrow', text: (s.id.length <= 2 && s.name && s.name !== t('editor.defaultSession', { id: s.id }) ? [t('editor.sessionEyebrow', { id: s.id }), meta] : [meta]).join(' · ') }),
            h('span', { class: 'editor-session-name', text: s.name || t('editor.defaultSession', { id: s.id }) }),
          ),
          icon('chevronRight', { size: 20 }),
        ),
        dayChips(ctx, program, s, () => { paint(); paintHints(); }),
      );
    }));
    addSession.hidden = program.sessions.length >= 6;
  };

  addSession.addEventListener('click', () => {
    const before = findProgram(ctx, id);
    const next = apply(ctx, id, { type: 'addSession', name: '' });
    if (!next || next === before) return;
    const added = next.sessions[next.sessions.length - 1];
    apply(ctx, id, { type: 'renameSession', session: added.id, name: t('editor.defaultSession', { id: added.id }) });
    haptic('select');
    paint();
    ctx.go('einheit', { params: { id, s: added.id } });
  });

  more.addEventListener('click', () => {
    const program = findProgram(ctx, id);
    if (!program) return;
    const sheet = openSheet({
      title: program.name,
      className: 'editor-more-sheet',
      content: h('div', { class: 'list-buttons' },
        h('button', { type: 'button', class: 'list-button', on: { click: () => sheet.close('share').then(() => sharePlanLink(ctx, { name: program.name, items: program.sessions.flatMap((s) => s.items.map((it) => ({ exercise: it.exercise, sets: it.sets, reps: itemLabel(it).split(' × ')[1] }))) })) } }, icon('share', { size: 20 }), h('span', { text: t('planLink.share') })),
        h('button', { type: 'button', class: 'list-button is-danger', on: { click: () => sheet.close('delete').then(() => deletePlan(ctx, id)) } }, icon('trash', { size: 20 }), h('span', { text: t('editor.deletePlan') })),
      ),
    });
  });

  replace(root,
    topBar('#training', t('tab.training'), more),
    name,
    hints,
    sessions,
    addSession,
    h('div', { class: 'action-bar', 'data-toast-avoid': '' }, h('div', { class: 'action-bar-inner' }, done)),
  );
  paint();
  paintHints();
  loadDb();
  return () => {};
}

/** @param {AppContext} ctx @param {string} id */
async function deletePlan(ctx, id) {
  const program = findProgram(ctx, id);
  if (!program) return;
  const ok = await confirmSheet({ title: t('editor.deleteTitle', { name: program.name }), message: t('editor.deleteText'), confirmLabel: t('editor.deletePlan'), danger: true });
  if (!ok) return;
  const { store } = ctx;
  const dropped = dropProgram(program, { plans: store.plans.get(), schedule: store.schedule.get() });
  store.plans.set(dropped.plans);
  store.schedule.set(dropped.schedule);
  store.programs.update((list) => list.filter((p) => p.id !== id));
  haptic('success');
  ctx.go('training');
  toast(t('editor.deleted'));
}

/* ------------------------------------------------------------ Einheit */

/**
 * #einheit?id=…&s=A – geordnete Übungen: verschieben, wischen zum Löschen, antippen zum Bearbeiten.
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 * @param {import('../../core/router.js').Route} route
 */
export function mountSession(ctx, view, route) {
  const id = route.params.id;
  const sid = route.params.s;
  const program0 = findProgram(ctx, id);
  if (!program0 || !program0.sessions.some((s) => s.id === sid)) {
    ctx.go(program0 ? 'editor' : 'training', { replace: true, params: program0 ? { id } : undefined });
    return () => {};
  }
  const lookup = exerciseLookup(ctx);
  const session = () => /** @type {ProgramSession} */ (findProgram(ctx, id)?.sessions.find((s) => s.id === sid));
  const root = h('div', { class: 'editor editor-session-view' });
  view.append(root);

  const name = h('input', { class: 'editor-name', type: 'text', maxlength: 40, 'aria-label': t('editor.sessionName'), placeholder: t('editor.defaultSession', { id: sid }), enterkeyhint: 'done' });
  name.value = session().name;
  name.addEventListener('input', () => apply(ctx, id, { type: 'renameSession', session: sid, name: name.value }));
  name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
  const days = h('div', { class: 'editor-days-slot' });
  const list = h('ol', { class: 'editor-items' });
  const empty = h('p', { class: 'editor-empty', text: t('editor.empty') });
  const more = h('button', { type: 'button', class: 'icon-button editor-more', 'aria-label': t('live.more') }, icon('more', { size: 22 }));
  const add = h('button', { type: 'button', class: 'button button-primary editor-add' }, icon('plus'), h('span', { text: t('editor.addExercise') }));

  const paintDays = () => {
    const program = /** @type {Program} */ (findProgram(ctx, id));
    replace(days, dayChips(ctx, program, session(), paintDays));
  };

  /** Anzeige-Name ohne Varianten-Zusatz, Variante als eigenes Etikett. @param {string} exercise */
  const describe = (exercise) => {
    const hit = variantOf(exercise);
    return { name: lookup(baseOf(exercise)).name, variant: hit && siblingsOf(exercise).length > 1 ? t(hit.variant.label) : null };
  };

  const paint = () => {
    const items = session()?.items ?? [];
    empty.hidden = items.length > 0;
    replace(list, items.map((it, index) => itemRow(it, index)));
  };

  /** @param {import('../../domain/plan-editor.js').ProgramItem} it @param {number} index */
  const itemRow = (it, index) => {
    const d = describe(it.exercise);
    const th = thumb(ctx, it.exercise, { size: 44 });
    const handle = h('button', { type: 'button', class: 'editor-handle', 'aria-label': t('editor.drag', { name: d.name }) }, icon('grip', { size: 22 }));
    const content = h('div', { class: 'editor-item-content', role: 'button', tabindex: '0', 'aria-label': t('editor.editItem', { name: d.name }) },
      th.el,
      h('span', { class: 'editor-item-texts' },
        h('span', { class: 'editor-item-name', text: d.name }),
        h('span', { class: 'editor-item-sub' }, d.variant ? h('span', { class: 'editor-item-variant', text: d.variant }) : null, h('span', { text: itemLabel(it) })),
      ),
      handle,
    );
    const li = h('li', { class: 'editor-item', dataset: { index: String(index), exercise: it.exercise } },
      h('div', { class: 'editor-item-delete', 'aria-hidden': 'true' }, icon('trash', { size: 20 }), h('span', { text: t('editor.delete') })),
      content,
    );
    wireRow(li, content, handle, index);
    return li;
  };

  /* ---------------- Gesten: verschieben, wischen, antippen */
  let busy = false;

  /** @param {number} index */
  const removeAt = (index) => {
    const it = session().items[index];
    if (!it) return;
    apply(ctx, id, { type: 'removeItem', session: sid, index });
    haptic('warning');
    paint();
    toast(t('editor.removed', { name: describe(it.exercise).name }), {
      action: { label: t('common.undo'), onClick: () => { apply(ctx, id, { type: 'restoreItem', session: sid, index, item: it }); haptic('tap'); paint(); } },
    });
  };

  /** @param {number} from @param {number} to */
  const moveTo = (from, to) => {
    apply(ctx, id, { type: 'moveItem', session: sid, from, to });
    paint();
  };

  /**
   * @param {HTMLElement} li
   * @param {HTMLElement} content
   * @param {HTMLElement} handle
   * @param {number} index
   */
  function wireRow(li, content, handle, index) {
    let suppressClick = false;

    // Verschieben: Griff sofort, auf dem Handy auch langes Drücken auf die Zeile.
    const startDrag = (/** @type {PointerEvent} */ e) => {
      busy = true;
      suppressClick = true;
      haptic('tap');
      const rows = /** @type {HTMLElement[]} */ ([...list.children]);
      const from = rows.indexOf(li);
      const mids = rows.map((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; });
      const rect = li.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const slot = rect.height + gap;
      const startY = e.clientY;
      let target = from;
      li.classList.add('is-dragging');
      list.classList.add('is-sorting');
      const move = (/** @type {PointerEvent} */ ev) => {
        const dy = ev.clientY - startY;
        li.style.transform = `translateY(${dy}px)`;
        const center = mids[from] + dy;
        let next = 0;
        mids.forEach((m, j) => { if (j !== from && m < center) next += 1; });
        if (next !== target) {
          target = next;
          haptic('select');
          rows.forEach((r, j) => {
            if (j === from) return;
            const shift = from < target && j > from && j <= target ? -slot : from > target && j >= target && j < from ? slot : 0;
            r.style.transform = shift ? `translateY(${shift}px)` : '';
          });
        }
      };
      const end = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        rows.forEach((r) => (r.style.transform = ''));
        li.classList.remove('is-dragging');
        list.classList.remove('is-sorting');
        busy = false;
        if (target !== from) {
          haptic('success');
          moveTo(from, target);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    };

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startDrag(e);
    });
    handle.addEventListener('click', (e) => e.stopPropagation());
    handle.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const to = index + delta;
      if (!delta || to < 0 || to >= session().items.length) return;
      e.preventDefault();
      haptic('select');
      moveTo(index, to);
      /** @type {HTMLElement|null} */ (list.children[to]?.querySelector('.editor-handle'))?.focus();
    });
    // Während des Verschiebens nicht scrollen (Touch).
    li.addEventListener('touchmove', (e) => { if (li.classList.contains('is-dragging')) e.preventDefault(); }, { passive: false });

    // Wischen nach links löscht; langes Drücken (Touch) verschiebt.
    content.addEventListener('pointerdown', (e) => {
      if (busy || e.button > 0) return;
      const x0 = e.clientX;
      const y0 = e.clientY;
      let mode = /** @type {'?'|'swipe'|'none'} */ ('?');
      let dx = 0;
      const press = e.pointerType === 'touch' ? window.setTimeout(() => { if (mode === '?') { mode = 'none'; cleanup(); startDrag(e); } }, LONG_PRESS) : 0;
      const move = (/** @type {PointerEvent} */ ev) => {
        dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        if (mode === '?') {
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
            mode = 'swipe';
            clearTimeout(press);
            suppressClick = true;
            li.classList.add('is-swiping');
          } else if (Math.abs(dy) > 8) {
            mode = 'none';
            clearTimeout(press);
          }
        }
        if (mode === 'swipe') {
          const x = Math.min(0, dx);
          content.style.transform = `translateX(${x}px)`;
          li.classList.toggle('is-armed', x < -SWIPE_DELETE);
        }
      };
      const cleanup = () => {
        clearTimeout(press);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      const up = () => {
        cleanup();
        if (mode !== 'swipe') return;
        li.classList.remove('is-swiping', 'is-armed');
        if (dx < -SWIPE_DELETE) {
          content.style.transform = 'translateX(-110%)';
          li.classList.add('is-leaving');
          window.setTimeout(() => removeAt(index), 160);
        } else {
          content.style.transform = '';
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    const open = () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      openItem(index);
    };
    content.addEventListener('click', open);
    content.addEventListener('keydown', (e) => {
      if (e.target !== content) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(index); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAt(index); }
    });
  }

  /** Sätze, Wdh.-Bereich, Reserve und Pause mit Steppern (sofort gespeichert). @param {number} index */
  const openItem = (index) => {
    const it = session().items[index];
    if (!it) return;
    const d = describe(it.exercise);
    const patch = (p) => apply(ctx, id, { type: 'updateItem', session: sid, index, patch: p });
    const cur = () => session().items[index] ?? it;
    const pair = (labelA, labelB, key, limits) => {
      const [a, b] = cur()[key];
      return h('div', { class: 'editor-pair' },
        h('div', { class: 'editor-field' }, h('p', { class: 'live-field-label', text: labelA }),
          stepper({ label: labelA, value: a, min: limits[0], max: limits[1], onChange: (v) => patch({ [key]: [v, Math.max(v, cur()[key][1])] }) })),
        h('div', { class: 'editor-field' }, h('p', { class: 'live-field-label', text: labelB }),
          stepper({ label: labelB, value: b, min: limits[0], max: limits[1], onChange: (v) => patch({ [key]: [Math.min(v, cur()[key][0]), v] }) })),
      );
    };
    const sibs = siblingsOf(it.exercise);
    const variants = sibs.length > 1
      ? h('div', { class: 'live-variants', role: 'group', 'aria-label': t('variant.label') },
          h('span', { class: 'live-chips-label', text: t('variant.label') }),
          sibs.map((v) => h('button', {
            type: 'button',
            class: 'chip chip-small',
            'aria-pressed': String(v.id === it.exercise),
            text: t(v.label),
            on: { click: (e) => {
              haptic('select');
              patch({ exercise: v.id });
              const group = /** @type {HTMLElement} */ (e.currentTarget).parentElement;
              group?.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.currentTarget)));
            } },
          })))
      : null;
    openSheet({
      title: d.name,
      className: 'editor-item-sheet',
      content: [
        variants,
        h('div', { class: 'editor-field' }, h('p', { class: 'live-field-label', text: t('editor.sets') }),
          stepper({ label: t('editor.sets'), value: it.sets, min: LIMITS.sets[0], max: LIMITS.sets[1], onChange: (v) => patch({ sets: v }) })),
        pair(t('editor.repsFrom'), t('editor.repsTo'), 'reps', LIMITS.reps),
        pair(t('editor.rirFrom'), t('editor.rirTo'), 'rir', LIMITS.rir),
        h('p', { class: 'field-hint', text: t('editor.itemHint') }),
        h('div', { class: 'editor-field' }, h('p', { class: 'live-field-label', text: t('editor.rest') }),
          stepper({ label: t('editor.rest'), value: it.rest ?? DEFAULT_ITEM.rest, min: LIMITS.rest[0], max: LIMITS.rest[1], step: 15, format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`, onChange: (v) => patch({ rest: v }) })),
      ],
      onClose: () => paint(),
    });
  };

  add.addEventListener('click', () =>
    openLibrary(ctx, {
      mode: 'multi',
      title: t('editor.addExercise'),
      onPickMany: (ids) => {
        if (!ids.length) return;
        apply(ctx, id, { type: 'addItems', session: sid, exercises: ids });
        haptic('success');
        paint();
        toast(t(ids.length === 1 ? 'editor.addedOne' : 'editor.added', { count: ids.length }));
      },
    }));

  more.addEventListener('click', () => {
    const program = findProgram(ctx, id);
    if (!program) return;
    const sheet = openSheet({
      title: session().name || sid,
      className: 'editor-more-sheet',
      content: h('div', { class: 'list-buttons' },
        program.sessions.length > 1
          ? h('button', { type: 'button', class: 'list-button is-danger', on: { click: () => sheet.close('remove').then(() => removeSession()) } }, icon('trash', { size: 20 }), h('span', { text: t('editor.removeSession') }))
          : null,
      ),
    });
  });

  const removeSession = () => {
    const program = /** @type {Program} */ (findProgram(ctx, id));
    const index = program.sessions.findIndex((s) => s.id === sid);
    const value = program.sessions[index];
    const daysOf = program.week.map((d, i) => (d === sid ? i : -1)).filter((i) => i >= 0);
    apply(ctx, id, { type: 'removeSession', session: sid });
    haptic('warning');
    ctx.go('editor', { params: { id } });
    toast(t('editor.sessionRemoved', { name: value.name || sid }), {
      action: { label: t('common.undo'), onClick: () => { apply(ctx, id, { type: 'restoreSession', index, value, days: daysOf }); ctx.reload(); } },
    });
  };

  const program = /** @type {Program} */ (findProgram(ctx, id));
  replace(root,
    topBar(`#editor?id=${encodeURIComponent(id)}`, program.name || t('editor.back'), more),
    sid.length <= 2 && session().name && session().name !== t('editor.defaultSession', { id: sid }) ? h('p', { class: 'editor-eyebrow', text: t('editor.sessionEyebrow', { id: sid }) }) : null,
    name,
    days,
    list,
    empty,
    h('div', { class: 'action-bar', 'data-toast-avoid': '' }, h('div', { class: 'action-bar-inner' }, add)),
  );
  paintDays();
  loadDb().then(() => root.isConnected && paint());
  paint();
  return () => {};
}
