/**
 * „Kurz abladen“: Gedanken schnell loswerden. Löschen mit „Rückgängig“.
 */

import { haptic } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { DUMP_MAX_LENGTH, addDump, removeDump, restoreDump } from '../../domain/today.js';
import { h, replace } from '../../ui/dom.js';
import { card } from '../../ui/card.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { inlineForm } from '../../ui/fields.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {AppContext} ctx */
export function dumpPart(ctx) {
  const list = h('ul', { class: 'dump-list', 'aria-label': t('dump.list') });

  const remove = (index) => {
    const dump = ctx.store.dump.get();
    const removed = dump[index];
    ctx.store.dump.set(removeDump(dump, index));
    haptic('tap');
    toast(t('dump.deleted'), {
      action: { label: t('common.undo'), onClick: () => ctx.store.dump.set(restoreDump(ctx.store.dump.get(), index, removed)) },
    });
  };

  const paint = () => {
    const dump = ctx.store.dump.get();
    list.hidden = !dump.length;
    replace(
      list,
      dump
        .map((thought, index) =>
          h(
            'li',
            { class: 'dump-item' },
            h('span', { class: 'dump-text', text: thought }),
            h('button', { type: 'button', class: 'icon-button icon-button-small', 'aria-label': t('dump.deleteLabel', { text: thought }), on: { click: () => remove(index) } }, icon('close', { size: 18 })),
          ),
        )
        .reverse(),
    );
  };

  const form = inlineForm({
    label: t('dump.inputLabel'),
    placeholder: t('dump.placeholder'),
    buttonLabel: t('dump.add'),
    maxlength: DUMP_MAX_LENGTH,
    onSubmit: (value) => {
      ctx.store.dump.set(addDump(ctx.store.dump.get(), value));
      haptic('tap');
    },
  });

  paint();
  const off = ctx.watch(['dump'], paint);
  const el = h(
    'div',
    { class: 'heute-dump' },
    card({ title: t('dump.title'), variant: 'soft', className: 'dump' }, h('p', { class: 'card-hint', text: t('dump.hint') }), form, list),
  );
  return { el, destroy: off };
}
