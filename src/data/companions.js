/**
 * Begleiter-Arten. Die Zeichnung je Art liegt in src/ui/companions/<id>.js,
 * eigene Sätze je Art in src/data/texts/companion.js (SPECIES_LINES).
 * Weitere Arten (z. B. Pixel-Tiere, zuerst ein Elefant) werden hier ergänzt.
 */

/**
 * @typedef {object} SpeciesInfo
 * @property {string} id
 * @property {string} label          Art, wie sie in der Auswahl heißt
 * @property {string} defaultName
 * @property {readonly string[]} stageNames  vier Wachstumsstufen (domain/buddy.js)
 */

/** @type {readonly SpeciesInfo[]} */
export const SPECIES = Object.freeze([
  { id: 'keimling', label: 'Keimling', defaultName: 'Keimi', stageNames: Object.freeze(['Keimling', 'Zwei Blätter', 'Knospe', 'Blüte']) },
]);

export const DEFAULT_SPECIES = 'keimling';

/**
 * Art nachschlagen; Unbekanntes fällt auf den Standard zurück.
 * @param {string|undefined} id
 * @returns {SpeciesInfo}
 */
export const speciesInfo = (id) => SPECIES.find((s) => s.id === id) ?? SPECIES.find((s) => s.id === DEFAULT_SPECIES);
