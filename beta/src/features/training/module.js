/**
 * Modul „Training“: Tab Training, Live-Training, „10 Minuten ohne Geräte“,
 * Kacheln „Sport starten“ und „Deine Woche“ (auch für Schwangerschaft & Rückbildung).
 */

import { placeholder } from '../placeholder/placeholder.js';
import { sportPart } from './sport-tile.js';
import { weekPart } from './week-tile.js';

/** Module, für die es „Sport starten“ und den Wochenring gibt. */
const SPORT_MODULES = ['train', 'mama'];

/** @type {import('../registry.js').ModuleDef} */
export const trainingModule = {
  id: 'train',
  label: 'Training',
  hint: 'Bewegung, die dir guttut',
  icon: 'training',
  views: [
    {
      route: 'training',
      title: 'Training',
      tab: { label: 'Training', icon: 'training' },
      mount: placeholder({ title: 'Training', intro: 'Hier findest du bald deine Pläne, Übungen und deinen Wochenplan.' }),
    },
    {
      route: 'live',
      title: 'Sport starten',
      chrome: 'bare',
      aliases: ['start', 'sport'],
      modules: SPORT_MODULES,
      mount: placeholder({ title: 'Sport starten', intro: 'Hier begleitet dich bald das Live-Training: Satz für Satz, mit Pausen-Uhr.', back: true }),
    },
    {
      route: 'kurz',
      title: '10 Minuten ohne Geräte',
      chrome: 'bare',
      modules: SPORT_MODULES,
      mount: placeholder({ title: '10 Minuten ohne Geräte', intro: 'Hier wartet bald eine kurze Runde, die überall passt.', back: true }),
    },
  ],
  tiles: [
    { id: 'sport', title: 'Sport starten', render: sportPart, modules: SPORT_MODULES },
    { id: 'week', title: 'Deine Woche', render: weekPart, modules: SPORT_MODULES },
  ],
};
