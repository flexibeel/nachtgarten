/**
 * Sätze des Begleiters – je Sprache, Tonlage und Situation. Regeln siehe docs/TONE.md
 * (nie über Figur, Gewicht oder Essen; kein Druck, keine Schuld).
 *
 * Allgemeine Sätze passen zu jeder Art. Was nur zu einer Art passt (Blätter, Gießen …),
 * steht unter `species.<art>` und kommt für diese Art dazu.
 *
 * Platzhalter:
 *   {name}    → Name des Begleiters        {count}  → Zahl (z. B. Umlenkungen)
 *   {user}    → Name der Person oder „du“  {, user} → „, Lena“ oder nichts
 */

import { getLang, t } from './i18n.js';
import { COMPANION_DE } from './companion-de.js';
import { COMPANION_EN } from './companion-en.js';

/** @typedef {'ruhig'|'motiv'|'frech'} Tone */
/**
 * @typedef {object} CompanionTexts
 * @property {Record<Tone, Record<string, string[]>>} lines        allgemeine Sätze
 * @property {Record<string, string>} onboarding                    je Onboarding-Schritt
 * @property {Record<string, Partial<Record<Tone, Record<string, string[]>>>>} species  Zusätze je Art
 */

/** Tonlagen; Beschriftung über t(`tone.<id>`). */
export const TONES = Object.freeze(['ruhig', 'motiv', 'frech']);

/** @type {Readonly<Record<string, CompanionTexts>>} */
export const COMPANION_TEXTS = Object.freeze({ de: COMPANION_DE, en: COMPANION_EN });

/** @param {string} [lang] */
const textsFor = (lang = getLang()) => COMPANION_TEXTS[lang] ?? COMPANION_DE;

/** @param {unknown[]} list @param {() => number} random */
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

/**
 * Platzhalter füllen.
 * @param {string} template
 * @param {{name: string, user?: string, count?: number, you?: string}} params  name = Begleiter
 */
export function fillLine(template, { name, user = '', count = 0, you = t('companion.you') }) {
  const u = user.trim();
  return template
    .replaceAll('{, user}', u ? `, ${u}` : '')
    .replaceAll('{user}', u || you)
    .replaceAll('{name}', name)
    .replaceAll('{count}', String(count));
}

/**
 * Alle Sätze einer Situation für Art und Ton (allgemein + Art).
 * @param {string} context
 * @param {string} tone
 * @param {string} species
 * @param {string} [lang]
 */
export function linePool(context, tone, species, lang) {
  const texts = textsFor(lang);
  const t2 = /** @type {Tone} */ (TONES.includes(tone) ? tone : 'motiv');
  const general = texts.lines[t2];
  const extra = texts.species[species]?.[t2] ?? {};
  const key = context in general ? context : 'tap';
  return [...general[key], ...(extra[key] ?? [])];
}

/**
 * Ein passender Satz für die Situation. Unbekannte Situationen fallen auf „tap“ zurück,
 * unbekannte Tonlagen auf „motiv“.
 * @param {string} context
 * @param {{name: string, species: string, tone?: string, user?: string, count?: number, random?: () => number, lang?: string}} options
 */
export function companionLine(context, { species, tone = 'motiv', random = Math.random, lang, ...params }) {
  return fillLine(pick(linePool(context, tone, species, lang), random), params);
}

/**
 * Satz des Begleiters zu einem Onboarding-Schritt.
 * @param {string} step
 * @param {{name: string, user?: string}} params
 */
export const onboardingLine = (step, params) => fillLine(textsFor().onboarding[step] ?? '', params);
