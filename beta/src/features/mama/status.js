/**
 * Anzeige des Schwangerschafts-/Rückbildungsstands in der aktiven Sprache.
 */

import { t } from '../../data/texts/i18n.js';

/**
 * „SSW 24+3“ / „Week 24+3“ bzw. „3 Wochen nach der Geburt“.
 * @param {import('../../domain/pregnancy.js').PregnancyStatus|import('../../domain/pregnancy.js').PostpartumStatus} status
 */
export function statusLabel(status) {
  if (status.mode === 'preg') return t('mama.labelPreg', { weeks: status.weeks, days: status.days });
  return status.weeks === 1 ? t('mama.labelPostOne') : t('mama.labelPost', { weeks: status.weeks });
}
