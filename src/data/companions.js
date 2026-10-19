/**
 * Begleiter-Arten. Die Zeichnung je Art liegt in src/ui/companions/<id>.js,
 * ihre Bezeichnung und Stufen-Namen in den Texten (`species.<id>`, `species.<id>.stages`),
 * eigene Sätze in companion-<sprache>.js unter `species.<id>`.
 * Weitere Arten (z. B. Pixel-Tiere, zuerst ein Elefant) werden hier ergänzt.
 */

/**
 * @typedef {object} SpeciesInfo
 * @property {string} id
 * @property {string} defaultName   Eigenname, in allen Sprachen gleich
 */

/** @type {readonly SpeciesInfo[]} */
export const SPECIES = Object.freeze([{ id: 'keimling', defaultName: 'Keimi' }]);

export const DEFAULT_SPECIES = 'keimling';

/**
 * Art nachschlagen; Unbekanntes fällt auf den Standard zurück.
 * @param {string|undefined} id
 * @returns {SpeciesInfo}
 */
export const speciesInfo = (id) => SPECIES.find((s) => s.id === id) ?? SPECIES.find((s) => s.id === DEFAULT_SPECIES);
