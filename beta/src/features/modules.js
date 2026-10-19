/**
 * Alle Module der App, in Anzeigereihenfolge (Tabs, Auswahl, Standard-Reihenfolge der Kacheln).
 * Ein neues Modul (z. B. „Aufhören“ für Rauchen und Cannabis) wird hier angemeldet.
 */

import { createRegistry } from './registry.js';
import { trainingModule } from './training/module.js';
import { mamaModule } from './mama/module.js';
import { habitsModule } from './habits/module.js';
import { focusModule } from './focus/module.js';
import { ideenModule } from './ideen/module.js';

export const createAppRegistry = () =>
  createRegistry().register(trainingModule).register(mamaModule).register(habitsModule).register(focusModule).register(ideenModule);
