/**
 * Modul „Gewohnheiten & Kopf frei“: Eine Sache heute, Gewohnheit mit Wenn-Dann-Anker,
 * Kurz abladen. Nur Kacheln, keine eigene Ansicht.
 */

import { dumpPart } from './dump-tile.js';
import { habitPart } from './habit-tile.js';
import { focusPart } from './one-thing-tile.js';

/** @type {import('../registry.js').ModuleDef} */
export const habitsModule = {
  id: 'habits',
  labelKey: 'module.habits.label',
  hintKey: 'module.habits.hint',
  icon: 'leaf',
  tiles: [
    { id: 'one-thing', titleKey: 'tile.oneThing', render: focusPart },
    { id: 'habit', titleKey: 'tile.habit', render: habitPart },
    { id: 'dump', titleKey: 'tile.dump', render: dumpPart },
  ],
};
