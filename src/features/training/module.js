/**
 * Modul „Training“: Tab Training, Live-Training, „10 Minuten ohne Geräte“,
 * Kacheln „Sport starten“ und „Deine Woche“ (auch für Schwangerschaft & Rückbildung).
 */

import { placeholder } from '../placeholder/placeholder.js';
import { sportPart } from './sport-tile.js';
import { weekPart } from './week-tile.js';
import { mountTraining } from './training.js';
import { mountLive } from './live.js';
import { gardenPart } from './garden-tile.js';
import { mountEditor, mountSession } from './plan-editor.js';

/** Module, für die es „Sport starten“ und den Wochenring gibt. */
const SPORT_MODULES = ['train', 'mama'];

/** @type {import('../registry.js').ModuleDef} */
export const trainingModule = {
  id: 'train',
  labelKey: 'module.train.label',
  hintKey: 'module.train.hint',
  icon: 'training',
  views: [
    { route: 'training', titleKey: 'view.training', tab: { labelKey: 'tab.training', icon: 'training' }, mount: mountTraining },
    { route: 'live', titleKey: 'view.live', chrome: 'bare', aliases: ['start', 'sport'], modules: SPORT_MODULES, mount: mountLive },
    { route: 'editor', titleKey: 'view.editor', chrome: 'bare', tabOf: 'training', mount: mountEditor },
    { route: 'einheit', titleKey: 'view.editor', chrome: 'bare', tabOf: 'training', mount: mountSession },
    { route: 'kurz', titleKey: 'view.kurz', chrome: 'bare', modules: SPORT_MODULES, mount: placeholder('kurz', { back: true, classic: 'kurz' }) },
  ],
  tiles: [
    { id: 'garden', titleKey: 'tile.garden', render: gardenPart, modules: SPORT_MODULES },
    { id: 'sport', titleKey: 'tile.sport', render: sportPart, modules: SPORT_MODULES },
    { id: 'week', titleKey: 'tile.week', render: weekPart, modules: SPORT_MODULES },
  ],
};
