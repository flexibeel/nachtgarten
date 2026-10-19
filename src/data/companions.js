/**
 * Begleiter-Arten: Pixel-Tiere aus src/ui/companion/sprites.js (Zeichnung und Farben)
 * plus der Keimling. Bezeichnung und Stufen-Namen stehen in den Texten
 * (`species.<id>`, `species.<id>.stages`), eigene Sätze in companion-<sprache>.js unter `species.<id>`.
 * Neue Art = Eintrag in sprites.js (SPECIES_DATA) + hier + Texte.
 */

/**
 * @typedef {object} SpeciesInfo
 * @property {string} id
 * @property {string} defaultName   Eigenname, in allen Sprachen gleich
 * @property {boolean} [featured]   in der Auswahl hervorgehoben
 */

/** @type {readonly SpeciesInfo[]} Reihenfolge = Reihenfolge in der Auswahl */
export const SPECIES = Object.freeze([
  { id: 'elefant', defaultName: 'Elli', featured: true },
  { id: 'igel', defaultName: 'Ida' },
  { id: 'fuchs', defaultName: 'Fili' },
  { id: 'otter', defaultName: 'Otto' },
  { id: 'faultier', defaultName: 'Fritzi' },
  { id: 'eule', defaultName: 'Ella' },
  { id: 'keimling', defaultName: 'Keimi' },
]);

/** Rückfall für Profile ohne Angabe (v1 kannte nur den Keimling). */
export const DEFAULT_SPECIES = 'keimling';
/** Vorauswahl für neue Profile. */
export const FEATURED_SPECIES = 'elefant';

/**
 * Art nachschlagen; Unbekanntes fällt auf den Standard zurück.
 * @param {string|undefined} id
 * @returns {SpeciesInfo}
 */
export const speciesInfo = (id) => SPECIES.find((s) => s.id === id) ?? SPECIES.find((s) => s.id === DEFAULT_SPECIES);
