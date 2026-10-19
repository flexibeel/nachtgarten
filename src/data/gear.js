/**
 * Geräte, die man im Onboarding und unter „Training“ auswählen kann.
 * Die Ids sind die gespeicherten Werte (aus v1, deutsch); Beschriftung über t().
 */

import { t } from './texts/i18n.js';

export const BODYWEIGHT = 'Körpergewicht';

/** @type {readonly {id: string, key: string}[]} */
export const GEAR = Object.freeze([
  { id: BODYWEIGHT, key: 'gear.bodyweight' },
  { id: 'Kurzhanteln', key: 'gear.dumbbells' },
  { id: 'Langhantel', key: 'gear.barbell' },
  { id: 'Kabelzug', key: 'gear.cable' },
  { id: 'Maschinen', key: 'gear.machines' },
  { id: 'Klimmzugstange', key: 'gear.pullupBar' },
  { id: 'Bänder', key: 'gear.bands' },
  { id: 'SZ-Stange', key: 'gear.ezBar' },
  { id: 'Kettlebell', key: 'gear.kettlebell' },
]);

/** Auswahl-Optionen in der aktiven Sprache. */
export const gearOptions = () => GEAR.map((g) => ({ value: g.id, label: t(g.key) }));
