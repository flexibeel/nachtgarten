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
  label: 'Gewohnheiten & Kopf frei',
  hint: 'Eine Sache am Tag, eine Gewohnheit, Gedanken abladen',
  icon: 'leaf',
  tiles: [
    { id: 'one-thing', title: 'Eine Sache heute', render: focusPart },
    { id: 'habit', title: 'Gewohnheit', render: habitPart },
    { id: 'dump', title: 'Kurz abladen', render: dumpPart },
  ],
};
