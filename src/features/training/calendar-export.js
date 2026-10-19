/**
 * „Wochenplan in den Kalender“: Kalender-Datei (.ics) mit wiederkehrenden Terminen je Trainingstag.
 * Die Regeln (Zeitzone, UID, Faltung) stehen in domain/ics.js.
 */

import { ICS_FILENAME, buildWeeklyCalendar, eventsFromSchedule } from '../../domain/ics.js';
import { haptic, saveFile } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { openSheet } from '../../ui/sheet.js';
import { switchRow, textField } from '../../ui/fields.js';
import { toast } from '../../ui/toast.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const ACTIVITIES = ['run', 'bike', 'swim', 'ball', 'yoga', 'hike', 'other'];

/**
 * Termine aus dem gespeicherten Wochenplan.
 * @param {AppContext} ctx
 */
export function calendarEvents(ctx) {
  const plans = ctx.store.plans.get();
  return eventsFromSchedule(ctx.store.schedule.get(), {
    plan: (id) => {
      const plan = plans.find((p) => p.id === id);
      return plan ? { name: plan.name, description: plan.items.length ? t('live.planSub', { count: plan.items.length }) : undefined } : undefined;
    },
    activity: (id) => t(`activity.${ACTIVITIES.includes(id) ? id : 'other'}`),
  });
}

/** @param {AppContext} ctx */
export function openCalendarExport(ctx) {
  const events = calendarEvents(ctx);
  if (!events.length) {
    toast(t('ics.empty'));
    return;
  }
  let time = '18:00';
  let alarm = true;
  const timeField = textField({ label: t('ics.time'), value: time, type: 'time', hint: t('ics.timeHint'), onInput: (v) => (time = v) });
  const alarmRow = switchRow({ label: t('ics.alarm'), checked: alarm, onChange: (v) => (alarm = v) });
  const save = h('button', { type: 'button', class: 'button button-primary button-wide ics-save', text: t('ics.save') });
  const sheet = openSheet({
    title: t('ics.title'),
    className: 'ics-sheet',
    content: [h('p', { class: 'card-hint', text: t('ics.intro') }), timeField, alarmRow],
    actions: save,
  });
  save.addEventListener('click', async () => {
    haptic('tap');
    const content = buildWeeklyCalendar({
      events,
      startDate: ctx.today(),
      now: ctx.now(),
      time: /^\d{2}:\d{2}$/.test(time) ? time : null,
      alarmMinutesBefore: alarm ? 30 : null,
      calendarName: t('ics.calendarName'),
    });
    const result = await saveFile({ name: ICS_FILENAME, content, type: 'text/calendar', preferShare: true });
    if (result === 'cancelled') return;
    toast(t(result === 'failed' ? 'ics.failed' : 'ics.saved'));
    if (result !== 'failed') sheet.close('done');
  });
}
