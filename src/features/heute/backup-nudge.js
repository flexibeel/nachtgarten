/**
 * „Sicherung machen?“ – sanfte Erinnerung auf „Heute“, höchstens einmal im Monat,
 * wegtippbar. Auch in „Schlicht“ sichtbar: Es geht um die eigenen Daten.
 */

import { backupDue } from '../../domain/backup.js';
import { haptic } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { saveBackup } from '../privacy/privacy.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {AppContext} ctx */
export function backupNudgePart(ctx) {
  return reactivePart(ctx, ['settings', 'plans', 'sessions'], (el) => {
    const { store } = ctx;
    const { backupAt, backupNudgeAt } = store.settings.get();
    const due = backupDue({
      backupAt,
      nudgeAt: backupNudgeAt,
      createdAt: store.meta.get().createdAt,
      today: ctx.today(),
      hasData: store.plans.get().length > 0 || store.sessions.get().length > 0,
    });
    el.hidden = !due;
    if (!due) return replace(el);
    replace(
      el,
      h('div', { class: 'backup-nudge', role: 'region', 'aria-label': t('backupNudge.title') },
        h('span', { class: 'backup-nudge-icon', 'aria-hidden': 'true' }, icon('download', { size: 22 })),
        h('div', { class: 'backup-nudge-texts' },
          h('p', { class: 'backup-nudge-title', text: t('backupNudge.title') }),
          h('p', { class: 'backup-nudge-text', text: t('backupNudge.text') }),
          h('div', { class: 'backup-nudge-actions' },
            h('button', { type: 'button', class: 'button button-primary backup-nudge-save', text: t('backupNudge.save'), on: { click: () => saveBackup(ctx) } }),
            h('button', {
              type: 'button',
              class: 'link-button backup-nudge-later',
              text: t('backupNudge.later'),
              on: { click: () => { haptic('tap'); store.settings.update((s) => ({ ...s, backupNudgeAt: ctx.today() })); } },
            }),
          ),
        ),
      ),
    );
  }, 'heute-backup');
}
