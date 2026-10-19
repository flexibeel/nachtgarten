/**
 * Keimling „Keimi“: Zeichnung je Stimmung und Wachstumsstufe (Keimling, zwei Blätter,
 * Knospe, Blüte). Farben aus tokens.css (--keimling-*), Bewegung in components.css.
 */

/** @typedef {import('../../domain/buddy.js').BuddyMood} BuddyMood */

const EYE = 'var(--keimling-eye)';
const stroke = (d, width = 2.2) => `<path d="${d}" stroke="${EYE}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;

/** Augen je Stimmung. */
const EYES = {
  calm: `<circle cx="25" cy="47" r="2.5" fill="${EYE}"/><circle cx="39" cy="47" r="2.5" fill="${EYE}"/><circle cx="25.8" cy="46.2" r=".8" fill="var(--keimling-body)"/><circle cx="39.8" cy="46.2" r=".8" fill="var(--keimling-body)"/>`,
  happy: stroke('M22.4 48 Q25 44.4 27.6 48') + stroke('M36.4 48 Q39 44.4 41.6 48'),
  cheer: `<circle cx="25" cy="47.4" r="2.7" fill="${EYE}"/><circle cx="39" cy="47.4" r="2.7" fill="${EYE}"/><circle cx="25.9" cy="46.5" r=".85" fill="var(--keimling-body)"/><circle cx="39.9" cy="46.5" r=".85" fill="var(--keimling-body)"/>`,
  tired: stroke('M22.4 47.6 Q25 49.4 27.6 47.6', 2) + stroke('M36.4 47.6 Q39 49.4 41.6 47.6', 2),
  proud: stroke('M22.4 47.6 Q25 44.6 27.6 47.6') + stroke('M36.4 47.6 Q39 44.6 41.6 47.6'),
};

/** Mund je Stimmung. */
const MOUTHS = {
  calm: stroke('M29.2 53 Q32 55.6 34.8 53', 1.9),
  happy: `<path d="M28 52.2 Q32 59 36 52.2 Z" fill="${EYE}"/>`,
  cheer: `<path d="M27.6 52.4 Q32 59.6 36.4 52.4 Z" fill="${EYE}"/>`,
  tired: `<ellipse cx="32" cy="54" rx="1.6" ry="1.3" fill="${EYE}"/>`,
  proud: stroke('M28.4 52.4 Q32 57.4 35.6 52.4', 2),
};

const LEAF_LEFT = '<path d="M32 24 C27 19 21 19.5 19.5 22.5 C23 26.5 28.5 26.5 32 24Z" fill="var(--keimling-leaf)"/>';
const LEAF_RIGHT = '<path d="M32 21.5 C37 16.5 43 17 44.5 20 C41 24 35.5 24 32 21.5Z" fill="var(--keimling-leaf)"/>';
const STEM = (top) =>
  `<path d="M32 32 C31 27 32.2 ${top + 5} 32 ${top}" stroke="var(--keimling-stem)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

/**
 * Trieb je Wachstumsstufe: Keimling, zwei Blätter, Knospe, Blüte.
 * @param {number} stage
 */
function sprout(stage) {
  if (stage <= 1) {
    return '<path d="M32 32 C32 28 32.3 25.5 33 23.5" stroke="var(--keimling-stem)" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M33 24 C36.5 20.5 41.5 21 42.8 23.3 C40 26.3 36 26.2 33 24Z" fill="var(--keimling-leaf)"/>';
  }
  const top = stage === 2 ? 20 : stage === 3 ? 14 : 12;
  let out = STEM(top) + LEAF_LEFT + LEAF_RIGHT;
  if (stage === 3) {
    out +=
      '<path d="M32 15 C28.6 12.2 29 7.4 32 4.8 C35 7.4 35.4 12.2 32 15Z" fill="var(--keimling-bloom)"/><path d="M29.6 13.4 C30.6 15 33.4 15 34.4 13.4" stroke="var(--keimling-stem)" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  }
  if (stage >= 4) {
    out += [0, 72, 144, 216, 288]
      .map((deg) => {
        const r = (deg * Math.PI) / 180;
        return `<circle cx="${(32 + Math.sin(r) * 4.4).toFixed(2)}" cy="${(8.5 - Math.cos(r) * 4.4).toFixed(2)}" r="3.4" fill="var(--keimling-bloom)"/>`;
      })
      .join('');
    out += '<circle cx="32" cy="8.5" r="2.4" fill="var(--keimling-stem)"/>';
  }
  return out;
}

/** Zusätze je Stimmung (Ärmchen, Funkeln, Zzz). */
function extras(mood) {
  if (mood === 'cheer') {
    return '<path d="M14 49 L7.5 41.5" stroke="var(--keimling-body)" stroke-width="3.6" stroke-linecap="round"/><path d="M50 49 L56.5 41.5" stroke="var(--keimling-body)" stroke-width="3.6" stroke-linecap="round"/>';
  }
  if (mood === 'proud') {
    return '<path d="M53 28 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2Z" fill="var(--keimling-bloom)"/><path d="M10 33 l.9 2 2 .9 -2 .9 -.9 2 -.9 -2 -2 -.9 2 -.9Z" fill="var(--keimling-bloom)"/>';
  }
  if (mood === 'tired') {
    return '<text class="keimling-z" x="47" y="30" font-family="var(--font-body)" font-size="8" font-weight="700" fill="var(--muted)">z</text><text class="keimling-z keimling-z-late" x="52" y="23" font-family="var(--font-body)" font-size="6" font-weight="700" fill="var(--muted)">z</text>';
  }
  return '';
}

/**
 * SVG-Markup der Figur (wird nur über ui/companion.js aufgerufen).
 * @param {{mood: BuddyMood, stage: number, a11y: string}} options
 */
export function keimlingMarkup({ mood, stage, a11y }) {
  const m = mood in EYES ? mood : 'calm';
  const cheek = m === 'tired' ? '.2' : '.45';
  return `<svg class="companion-figure keimling is-${m}" viewBox="0 0 64 72" ${a11y}>
<ellipse cx="32" cy="68" rx="17" ry="2.8" fill="var(--keimling-ground)"/>
<g class="keimling-all">${extras(m)}<g class="keimling-sprout">${sprout(stage)}</g>
<g class="keimling-body"><path d="M32 31 C45 31 52 40 52 50 C52 61 44 66 32 66 C20 66 12 61 12 50 C12 40 19 31 32 31Z" fill="var(--keimling-body)"/>
<path d="M14 54 C16 62 23 66 32 66 C41 66 48 62 50 54 C46 60.5 40 62.5 32 62.5 C24 62.5 18 60.5 14 54Z" fill="var(--keimling-shade)" opacity=".55"/>
<ellipse cx="21.5" cy="39.5" rx="4" ry="2.2" transform="rotate(-32 21.5 39.5)" fill="var(--keimling-shine)"/>
<ellipse cx="19.6" cy="53" rx="3.2" ry="1.9" fill="var(--keimling-cheek)" opacity="${cheek}"/><ellipse cx="44.4" cy="53" rx="3.2" ry="1.9" fill="var(--keimling-cheek)" opacity="${cheek}"/>
${EYES[m]}${MOUTHS[m]}</g></g></svg>`;
}
