/**
 * Modul „Ideen-Labor“: eigener Tab, nur wenn eingeschaltet.
 */

import { placeholder } from '../placeholder/placeholder.js';

/** @type {import('../registry.js').ModuleDef} */
export const ideenModule = {
  id: 'ideen',
  labelKey: 'module.ideen.label',
  hintKey: 'module.ideen.hint',
  icon: 'ideen',
  views: [{ route: 'ideen', titleKey: 'view.ideen', tab: { labelKey: 'tab.ideen', icon: 'ideen' }, mount: placeholder('ideen', { classic: 'ideen' }) }],
};
