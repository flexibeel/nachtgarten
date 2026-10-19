/**
 * Modul „Ideen-Labor“: eigener Tab, nur wenn eingeschaltet.
 */

import { placeholder } from '../placeholder/placeholder.js';

/** @type {import('../registry.js').ModuleDef} */
export const ideenModule = {
  id: 'ideen',
  label: 'Ideen-Labor',
  hint: 'Neue Funktionen mit ausprobieren',
  icon: 'ideen',
  views: [
    {
      route: 'ideen',
      title: 'Ideen-Labor',
      tab: { label: 'Ideen', icon: 'ideen' },
      mount: placeholder({ title: 'Ideen-Labor', intro: 'Hier sammeln wir bald Skizzen für neue Funktionen. Du entscheidest mit.' }),
    },
  ],
};
