/**
 * Nachtgarten – der kleine Garten als Pixel-Bild.
 *
 * Ein schmaler Streifen (128×44 Pixel): Abendhimmel mit tief stehender Sonne
 * (hell) bzw. Mondnacht mit Sternen (dunkel), zwei Hügelketten, Gras und Erde.
 * Mit dem Fortschritt (Stufe 0–4) wächst der Garten: erst Saathügel, dann
 * Keimlinge, Blätter, Knospen, zuletzt Blüten, ein Bäumchen und Glühwürmchen.
 * Die Jahreszeit färbt Laub und Blüten um (Frühling, Sommer, Herbst, Winter).
 * Der gewählte Begleiter sitzt mittendrin (companion.js → mountSprite).
 */

import { adoptCss } from '../adopt-css.js';
import { mountSprite, gridToRects, ensurePalette } from './companion.js';

export const GARDEN_W = 128;
export const GARDEN_H = 44;
export const GROUND_Y = 36;
export const SEASONS = ['fruehling', 'sommer', 'herbst', 'winter'];
export const STAGE_LABELS = ['Saat', 'Keimlinge', 'erstes Grün', 'Knospen', 'Blüte'];

/* Farbschlüssel der Szene → CSS-Variablen-Namen */
const KEY_NAMES = {
  1: 'sky1', 2: 'sky2', 3: 'sky3', 4: 'sun', 5: 'halo', m: 'moon', s: 'star',
  6: 'hill1', 7: 'hill2', 8: 'grass', 9: 'blade', j: 'soil', k: 'soil2', n: 'trunk',
  B: 'bloom', L: 'bloom2', V: 'leaf', U: 'leaf2', F: 'glow', f: 'lamp',
};
export const gardenVar = (key) => `--ng-gd-${KEY_NAMES[key]}`;

/** Abend (hell) und Nacht (dunkel). Mit data-time lässt sich die Tageszeit erzwingen. */
const TIME = {
  abend: {
    sky1: '#E8DEDA', sky2: '#EDD8CF', sky3: '#F1D1C1', sun: '#EBC79A', halo: '#F2DBC6', moon: '#E8DEDA', star: '#E8DEDA',
    hill1: '#CBCFBE', hill2: '#B0BAA2', grass: '#97A488', blade: '#7F8F71', soil: '#BBA391', soil2: '#A68D7B', trunk: '#8C7563', glow: '#F2D9A8', lamp: '#F0D3BE', shade: '#7F8F71',
  },
  nacht: {
    sky1: '#1E1B1B', sky2: '#242020', sky3: '#2C2625', sun: '#2C2625', halo: '#2C2625', moon: '#E6DDD3', star: '#CFC6BF',
    hill1: '#2C302A', hill2: '#353C31', grass: '#45503E', blade: '#56634D', soil: '#3A302C', soil2: '#312825', trunk: '#5A4A3F', glow: '#E6C58F', lamp: '#433631', shade: '#2E3829',
  },
};
/** Jahreszeiten: nur Laub und Blüten (Mitteltöne, die hell wie dunkel tragen). */
const SEASON = {
  fruehling: { bloom: '#C9958B', bloom2: '#EBCBC2', leaf: '#8FA27F', leaf2: '#6E8060' },
  sommer: { bloom: '#DDB47D', bloom2: '#F0DCB8', leaf: '#7E9470', leaf2: '#5F7251' },
  herbst: { bloom: '#C98A68', bloom2: '#E2B48F', leaf: '#C49A66', leaf2: '#9E7A55' },
  winter: { bloom: '#B97A72', bloom2: '#F4EFEB', leaf: '#8A9883', leaf2: '#677462' },
};

const decl = (obj, suffix = '') => Object.entries(obj).map(([k, v]) => `--ng-gd-${k}${suffix}:${v};`).join('');
const SEASON_KEYS = ['bloom', 'bloom2', 'leaf', 'leaf2'];
/* Laub und Blüten: abends direkt, nachts mit dem Himmel verschattet */
const seasonUse = (night) => SEASON_KEYS.map((k) => `--ng-gd-${k}:${night ? `color-mix(in srgb, var(--ng-gd-${k}-base) 74%, #1E1B1B)` : `var(--ng-gd-${k}-base)`};`).join('');

/** CSS der Szene (Farben + sanftes Funkeln, das bei reduzierter Bewegung ruht). */
export function gardenCss() {
  const seasons = Object.entries(SEASON).map(([s, v]) => `.ng-garden[data-season="${s}"]{${decl(v, '-base')}}`).join('\n');
  return `.ng-garden{--ng-fx-d:var(--ng-gd-shade);${decl(TIME.abend)}${decl(SEASON.fruehling, '-base')}${seasonUse(false)}display:block;width:100%;height:auto;image-rendering:pixelated}
:root[data-theme="dark"] .ng-garden:not([data-time="abend"]),.ng-garden[data-time="nacht"]{${decl(TIME.nacht)}${seasonUse(true)}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .ng-garden:not([data-time="abend"]){${decl(TIME.nacht)}${seasonUse(true)}}}
${seasons}
.ng-garden .ng-twinkle{animation:ng-twinkle 3.2s ease-in-out infinite}
.ng-garden .ng-twinkle:nth-of-type(2n){animation-delay:-1.3s;animation-duration:4.1s}
.ng-garden .ng-twinkle:nth-of-type(3n){animation-delay:-2.2s}
@keyframes ng-twinkle{0%,100%{opacity:1}50%{opacity:.25}}
@media (prefers-reduced-motion: reduce){.ng-garden .ng-twinkle{animation:none}}`;
}

/* ---------- Pflanzen (unten verankert) ---------- */
export const PLANTS = {
  mound: ['.jj.', 'jkjj'],
  sprout: ['V.V', '.U.'],
  leafy: ['.V.V.', 'VVUVV', '.VUV.', '..U..'],
  bud: ['..L..', '.VBV.', 'V.U.V', '.VUV.', '..U..', '..U..'],
  flower: ['.B.B.', 'BBLBB', '.BBB.', 'V.U..', 'VUU.V', '..UVV', '..U..'],
  tall: ['.BB.', 'BLLB', '.BB.', '..U.', 'VVU.', '.VUV', '..U.', '.VU.', '..U.'],
  foxglove: ['..L..', '..B..', '.BU..', '..UB.', '.BU..', '.LUB.', '..UL.', '.BU..', 'V.U..', 'VVU.V', '.VUVV', '..U..'],
  daisies: ['B.....L.', 'LB...LBL', '.U.B..U.', 'VU.LB.UV', '.UVU..U.', '..U..VU.'],
  fern: ['V...V', '.V.V.', 'V.U.V', '.VUV.', '..U..'],
  tuft: ['9.9.9', '.999.'],
  mushroom: ['.BBB.', 'BLBLB', '..n..'],
  bush: ['...VVV...', '..VVVVV..', '.VVUVVVV.', 'VVVVVUVVV', 'VUVVVVVUV', '.VVUVVVV.', '..VVVUV..'],
  bushBloom: ['...VBV...', '..VLVVB..', '.BVUVBVV.', 'VVVBVUVLV', 'VUVVVBVUV', '.VLUVVVB.', '..VVVUV..'],
  sapling: ['.VV.', 'VVUV', '.n..', '.n..'],
  treeYoung: ['...VVV...', '.VVVVVV..', 'VVUVVVUV.', '.VVUVVVV.', '..VVnVV..', '....n....', '....n....', '....n....', '...nn....'],
  tree: [
    '.....VVVV.....', '...VVVVVVVV...', '..VVBVVVVLVV..', '.VVVVVUVVVBVV.', 'VVLVUVVVVVVUVV', 'VVVVVVBVVLVVVV',
    'VUVVBVVVUVVVUV', '.VVUVVVVVBVVV.', '..VVVnVVnVV...', '.....nnn......', '......n.......', '......n.......',
    '......n.......', '......nn......', '.....nnn......',
  ],
  // Gartenlaterne – das Licht im Nachtgarten
  lantern: ['.nnn.', 'nFFFn', 'nFFFn', '.nnn.', '..n..', '..n..', '..n..', '..n..', '..n..', '.nnn.'],
};

/** Was an welchem Beet je Stufe wächst: [x, [stufe0…stufe4]]. */
const BEDS = [
  [3, ['mound', 'sprout', 'leafy', 'tall', 'foxglove']],
  [10, [null, 'tuft', 'fern', 'bush', 'bushBloom']],
  [21, ['mound', 'sprout', 'leafy', 'bud', 'flower']],
  [28, [null, null, 'tuft', 'mushroom', 'mushroom']],
  [36, [null, 'tuft', 'sprout', 'leafy', 'daisies']],
  [83, ['lantern', 'lantern', 'lantern', 'lantern', 'lantern']],
  [90, ['mound', 'sprout', 'sapling', 'treeYoung', 'tree']],
  [106, ['mound', 'sprout', 'leafy', 'tall', 'foxglove']],
  [113, [null, 'tuft', 'fern', 'bud', 'flower']],
  [121, [null, null, 'sprout', 'leafy', 'tall']],
];

/* deterministische Pseudozufallszahlen, damit das Bild immer gleich ist */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * Baut die Szene (ohne Begleiter) als Zeichenraster.
 * @param {{stage?: number, season?: string}} [o]
 * @returns {{grid: string[], twinkles: Array<[number, number]>}}
 */
export function buildGarden({ stage = 0, season = 'fruehling' } = {}) {
  stage = Math.max(0, Math.min(4, Math.round(stage)));
  const W = GARDEN_W;
  const H = GARDEN_H;
  const g = Array.from({ length: H }, () => Array(W).fill('1'));
  const set = (x, y, c) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  };

  // Himmel: drei Bänder mit Schachbrett-Übergängen (die einzige Rasterung im Bild)
  for (let y = 0; y < GROUND_Y; y++) {
    for (let x = 0; x < W; x++) {
      let c = y < 12 ? '1' : y < 23 ? '2' : '3';
      if (y === 12 || y === 13) c = (x + y) % 2 ? '1' : '2';
      if (y === 23 || y === 24) c = (x + y) % 2 ? '2' : '3';
      g[y][x] = c;
    }
  }
  // Sonne tief über dem Horizont (nur abends sichtbar) mit weichem Hof
  const [sx, sy] = [97, 29];
  for (let y = 14; y < GROUND_Y; y++) {
    for (let x = 82; x < 114; x++) {
      const d = Math.hypot(x + 0.5 - sx, (y + 0.5 - sy) * 1.1);
      if (d < 5.2) set(x, y, '4');
      else if (d < 7.4 && (x + y) % 2 === 0) set(x, y, '5');
      else if (d < 9.5 && (x + y) % 4 === 0) set(x, y, '5');
    }
  }
  // Mondsichel (nur nachts sichtbar)
  const [mx, my] = [112, 7];
  for (let y = 1; y < 14; y++) {
    for (let x = 104; x < 121; x++) {
      const inMoon = Math.hypot(x + 0.5 - mx, y + 0.5 - my) < 4.2;
      const cut = Math.hypot(x + 0.5 - (mx + 2.2), y + 0.5 - (my - 1.4)) < 3.7;
      if (inMoon && !cut) set(x, y, 'm');
    }
  }
  // Sterne (abends unsichtbar, gleiche Farbe wie der Himmel)
  const stars = [[8, 3], [19, 8], [31, 2], [44, 6], [57, 1], [66, 9], [78, 4], [90, 2], [97, 10], [124, 5], [14, 14], [39, 12], [72, 15]];
  const twinkles = [];
  for (const [x, y] of stars) {
    set(x, y, 's');
    twinkles.push([x, y]);
  }
  // Hügel: fern und nah
  for (let x = 0; x < W; x++) {
    const far = Math.round(27 + 2.6 * Math.sin(x / 13 + 0.6) + 1.4 * Math.sin(x / 5.3));
    const near = Math.round(32 + 1.6 * Math.sin(x / 9 + 2.1) + 0.8 * Math.sin(x / 3.7));
    for (let y = far; y < GROUND_Y; y++) set(x, y, '6');
    for (let y = near; y < GROUND_Y; y++) set(x, y, '7');
  }
  // ferne Bäumchen auf dem Hügelkamm (Tiefe)
  for (const [x, h] of [[16, 3], [19, 2], [58, 3], [68, 4], [72, 2], [122, 3]]) {
    let top = 0;
    while (top < GROUND_Y && g[top][x] !== '6' && g[top][x] !== '7') top++;
    for (let y = top - h; y < top; y++) for (let dx = -1; dx <= 1; dx++) if (y > top - h || dx === 0) set(x + dx, y, '7');
  }
  // Boden: Grasnarbe, Erde mit Krümeln
  const r = rng(7);
  for (let x = 0; x < W; x++) {
    set(x, GROUND_Y, '8');
    set(x, GROUND_Y + 1, (x % 2) ? '8' : '9');
    set(x, GROUND_Y + 2, r() < 0.55 ? '8' : 'j');
    for (let y = GROUND_Y + 3; y < H; y++) set(x, y, r() < 0.06 ? 'k' : 'j');
  }
  // Trittsteine unter dem Begleiter
  for (const [x, y] of [[52, 40], [61, 41], [70, 40]]) {
    for (let dx = 0; dx < 4; dx++) set(x + dx, y, 'k');
    for (let dx = 1; dx < 3; dx++) set(x + dx, y + 1, 'k');
  }
  // Grashalme
  const blades = rng(11);
  for (let x = 1; x < W; x += 3) {
    if (blades() < 0.45) set(x, GROUND_Y - 1, '9');
    if (blades() < 0.2) set(x + 1, GROUND_Y - 1, '8');
  }
  // Winter: Schneekappen auf der Grasnarbe
  if (season === 'winter') {
    const sn = rng(5);
    for (let x = 0; x < W; x++) if (sn() < 0.7) set(x, GROUND_Y, 'L');
  }
  // Beete
  for (const [x, steps] of BEDS) {
    const name = steps[stage];
    if (!name) continue;
    const rows = PLANTS[name];
    rows.forEach((row, j) => {
      [...row].forEach((c, i) => {
        if (c !== '.') set(x + i, GROUND_Y + (name === 'mound' ? 1 : 0) - rows.length + j, c);
      });
    });
  }
  // Winter: Schnee auf Baumkronen und Büschen
  if (season === 'winter') {
    for (let x = 0; x < W; x++) {
      for (let y = 1; y < GROUND_Y; y++) {
        if ((g[y][x] === 'V' || g[y][x] === 'U') && !'VUBLn'.includes(g[y - 1][x])) g[y][x] = 'L';
      }
    }
  }
  // Herbst: ein paar fallende Blätter
  if (season === 'herbst' && stage >= 2) {
    for (const [x, y] of [[80, 18], [95, 24], [74, 27], [112, 20]]) set(x, y, 'V');
  }
  // Laternenschein: weicher, gerasterter Hof (abends kaum, nachts warm)
  for (let y = GROUND_Y - 14; y < GROUND_Y - 4; y++) {
    for (let x = 79; x < 92; x++) {
      const d = Math.hypot(x + 0.5 - 85.5, (y + 0.5 - (GROUND_Y - 7.5)) * 1.2);
      if (!'12356s'.includes(g[y][x])) continue;
      if (d < 3.6 || (d < 5 && (x + y) % 2 === 0) || (d < 6.2 && (x + y) % 4 === 0)) set(x, y, 'f');
    }
  }
  // Glühwürmchen ab Stufe 3
  if (stage >= 3) {
    const flies = stage >= 4
      ? [[8, 22], [19, 17], [33, 25], [44, 19], [76, 18], [104, 14], [118, 24], [126, 18]]
      : [[19, 21], [44, 22], [118, 20]];
    for (const [x, y] of flies) {
      set(x, y, 'F');
      twinkles.push([x, y]);
    }
  }
  return { grid: g.map((row) => row.join('')), twinkles };
}

/** SVG-Markup der Szene (Begleiter kommt per mountSprite dazu). */
export function gardenMarkup(opts = {}) {
  const { grid, twinkles } = buildGarden(opts);
  // Funkelnde Pixel bleiben einzeln (eigene Animation), alles andere wird zusammengefasst
  const tw = twinkles.map(([x, y]) => [x, y, grid[y][x]]);
  const flat = grid.map((row) => [...row]);
  for (const [x, y] of tw) flat[y][x] = '.';
  const rects = [`<rect x="0" y="0" width="${GARDEN_W}" height="${GARDEN_H}" fill="var(${gardenVar('2')})"/>`];
  for (const r of gridToRects(flat.map((row) => row.join('')))) {
    rects.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="var(${gardenVar(r.key)})"/>`);
  }
  for (const [x, y, key] of tw) {
    rects.push(`<rect class="ng-twinkle" x="${x}" y="${y}" width="1" height="1" fill="var(${gardenVar(key)})"/>`);
  }
  return rects.join('');
}

const GARDEN_STYLE_ID = 'ng-garden-style';
function ensureGardenCss(doc) {
  adoptCss(GARDEN_STYLE_ID, gardenCss(), doc);
}

/** Jahreszeit aus dem Datum (meteorologisch). */
export function seasonFor(date = new Date()) {
  const m = date.getMonth();
  return m >= 2 && m <= 4 ? 'fruehling' : m >= 5 && m <= 7 ? 'sommer' : m >= 8 && m <= 10 ? 'herbst' : 'winter';
}

/**
 * Garten rendern.
 * @param {HTMLElement} el
 * @param {{species?: string, state?: string, stage?: number, season?: string, time?: 'auto'|'abend'|'nacht', name?: string}} opts
 */
export function renderGarden(el, opts = {}) {
  const doc = el.ownerDocument || globalThis.document;
  ensurePalette(doc);
  ensureGardenCss(doc);
  let current = { species: 'elefant', state: 'idle', stage: 0, season: seasonFor(), time: 'auto', ...opts };
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${GARDEN_W} ${GARDEN_H}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.classList.add('ng-garden');
  const scene = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(scene);
  el.appendChild(svg);
  const sprite = mountSprite(svg, { species: current.species, state: current.state, x: 48, y: GROUND_Y - 30, width: 32, height: 32 });

  function paint() {
    svg.dataset.season = SEASONS.includes(current.season) ? current.season : 'fruehling';
    if (current.time === 'abend' || current.time === 'nacht') svg.dataset.time = current.time;
    else delete svg.dataset.time;
    scene.innerHTML = gardenMarkup(current);
    const stage = Math.max(0, Math.min(4, Math.round(current.stage)));
    svg.setAttribute('aria-label', `Garten, Stufe ${stage} von 4: ${STAGE_LABELS[stage]}`);
  }
  paint();

  return {
    el: svg,
    update(next = {}) {
      const before = current;
      current = { ...current, ...next };
      if (next.species || next.state) sprite.update({ species: current.species, state: current.state });
      if (current.stage !== before.stage || current.season !== before.season || current.time !== before.time) paint();
    },
    destroy() {
      sprite.destroy();
      svg.remove();
    },
  };
}

export { TIME as GARDEN_TIME, SEASON as GARDEN_SEASON, KEY_NAMES as GARDEN_KEYS };
