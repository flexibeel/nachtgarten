/**
 * Nachtgarten – Begleiter als Pixel-Figuren (Daten).
 *
 * Jede Art hat
 *   - eine Palette aus 5–7 eigenen Farben (hell/dunkel),
 *   - ein Grundbild („art“, 32×32, ein Zeichen pro Pixel, „.“ = durchsichtig),
 *   - Haltungen („poses“) als kleine Flicken auf dem Grundbild,
 *   - Ankerpunkte für Augen, Bäckchen, Mund und Effekte.
 * Die Bilder der Zustände (idle, happy, cheer, calm, proud) werden daraus beim
 * Laden einmalig zusammengesetzt (buildFrames). Gemeinsame Effektfarben (Herz,
 * Blatt, Wasser, Glühen, Bäckchen …) stehen in SHARED_PALETTE und tragen
 * Großbuchstaben, damit sie nie mit Artfarben kollidieren.
 *
 * Gestaltung: Konturen sind ein dunkles, warmes Ton-in-Ton der Fellfarbe
 * (nie Schwarz), Licht kommt immer von oben links, alle Bäckchen sind dasselbe
 * Altrosa – das ist die gemeinsame Handschrift der Figuren.
 */

export const GRID = 32;
export const STATES = /** @type {const} */ (['idle', 'happy', 'cheer', 'calm', 'proud']);
export const STATE_LABELS = { idle: 'ruhig da', happy: 'freut sich', cheer: 'feuert an', calm: 'ruht', proud: 'ist stolz' };

/** Gemeinsame Effekt- und Akzentfarben (Großbuchstaben). */
export const SHARED_PALETTE = {
  H: { light: '#FFFCF8', dark: '#F6EFEA' }, // Glanzpunkt im Auge
  C: { light: '#E3A196', dark: '#D99C91' }, // Bäckchen (Altrosa)
  D: { light: '#E6DED9', dark: '#171515' }, // Bodenschatten
  G: { light: '#8FA07F', dark: '#9DB08D' }, // Blatt (Salbei)
  T: { light: '#6F7F60', dark: '#7F9170' }, // Stiel / Zweig
  P: { light: '#C48F85', dark: '#D3A99F' }, // Blüte / Herz (Altrosa)
  Q: { light: '#E8C7BE', dark: '#EBCBC2' }, // Blüte hell
  W: { light: '#9DB4BA', dark: '#A9C1C6' }, // Wasser (gedämpftes Graublau)
  Y: { light: '#E0BC86', dark: '#E6C58F' }, // warmes Glühen / Funkeln
  Z: { light: '#B3A7A1', dark: '#7D7470' }, // Schlaf-z
};

/* Effekt-Stempel: kleine Bildchen für Herzen, Tropfen, Funkeln, z und Pflanzen. */
export const FX = {
  heartS: ['P.P', 'PPP', '.P.'],
  heart: ['.PP.PP.', 'PQPPPPP', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...'],
  drops: ['W...W', '.W.W.', '..W..'],
  splash: ['.W...W.', 'W.....W', '...W...', '.W...W.', '.......', 'W.....W'],
  spark: ['.Y.', 'YYY', '.Y.'],
  sparkS: ['Y'],
  zS: ['ZZ', '.Z', 'ZZ'],
  zL: ['ZZZ', '..Z', '.Z.', 'Z..', 'ZZZ'],
  lines: ['Y.', '.Y', 'Y.'],
  // Pflänzchen neben der Figur (unten verankert), wächst in drei Stufen
  plant1: ['G.G', '.T.'],
  plant2: ['GG...', 'GT.GG', '.TGG.', '.T...', '.T...'],
  plant3: ['..PP...', '.PQPP..', '..PPT..', 'GG..TGG', 'GTG.TGG', '..GTT..', '...T...', '...T...'],
};

/**
 * Augen-Stempel je Größe. Ein Leerzeichen lässt das Grundbild stehen.
 * „open“ hat links oben den Glanzpunkt; Bögen sind 3 Pixel breit und werden
 * je Seite nach außen versetzt, damit das Gesicht symmetrisch bleibt.
 */
export const EYES = {
  m: { w: 2, open: ['He', 'ee', 'ee'], half: ['  ', 'ee', 'ee'], blink: ['  ', '  ', 'ee'], happy: ['    ', ' ee ', 'e  e'], sleep: ['    ', 'e  e', ' ee '], wide: ['He', 'eH', 'ee'] },
  s: { w: 2, open: ['He', 'ee'], half: ['  ', 'ee'], blink: ['  ', 'ee'], happy: [' ee ', 'e  e'], sleep: ['e  e', ' ee '], wide: ['HH', 'ee'] },
  l: { w: 3, open: ['Hee', 'eee', 'eee'], half: ['   ', 'eee', 'eee'], blink: ['   ', '   ', 'eee'], happy: ['     ', ' eee ', 'e   e'], sleep: ['     ', 'e   e', ' eee '], wide: ['Hee', 'eeH', 'eee'] },
};

/**
 * Arten. Palette: Schlüssel → {light, dark}. Haltungen: Liste von Flicken
 * {x, y, rows}. Ankerpunkte in Pixeln (links oben).
 */
const SPECIES_DATA = {
  elefant: {
    label: 'Elefant',
    defaultName: 'Elli',
    note: 'Ein Ohr hängt immer ein bisschen tiefer.',
    palette: {
      o: { light: '#5E5157', dark: '#4D4247' }, // Kontur
      b: { light: '#A69DA3', dark: '#B3AAAF' }, // Haut
      s: { light: '#8B8188', dark: '#968C92' }, // Schatten
      h: { light: '#BEB6BA', dark: '#C9C1C5' }, // Licht
      l: { light: '#E2BDB4', dark: '#E2BFB6' }, // Ohr innen, Zehennägel
      e: { light: '#2E2A28', dark: '#231E1F' }, // Augen
    },
    art: [
      '................................',
      '................................',
      '.................o..............',
      '...............oo...............',
      '............oooooooo............',
      '..........oohhhhbbbboo..........',
      '.........ohhhbbbbbbbbbo.ooooo...',
      '........ohhbbbbbbbbbbbbohhbbbo..',
      '...ooooohhbbbbbbbbbbbbbbobbbbbo.',
      '..ohhbbohbbbbbbbbbbbbbbbohbbbbo.',
      '.ohbbbbobbbbbbbbbbbbbbbbollbbbo.',
      '.obblllobbbbbbbbbbbbbbbbolllbbo.',
      '.obblllobbbbbbbbbbbbbbbbolllbso.',
      '.obblllobbbbbbbbbbbbbbbbolllbso.',
      '.obblllobbbbbbbbbbbbbbbsolllsso.',
      '.obblllobbbbbbbbbbbbbbssollssso.',
      '.obblllobbbbbbbbbbbbbsssolssso..',
      '.obbllllobbbbbbbbbbssssosssso...',
      '.obssllssobbbbbbbbssssossso.....',
      '..ossssssooossssssssoossso......',
      '...ossssoohboooooooossooo.......',
      '....ooooohbbssssssssbsso........',
      '........ohbbbbbbbbbbbbso........',
      '........obbbbbbbbbbbbsso........',
      '........obbbbbbbbbbbbsso........',
      '........obbbbbbbbbbbssso........',
      '........obbbbbbbbbbbbsso........',
      '........obbbbbboobbbbsso........',
      '........oblblbsooblblbso........',
      '.........oooooooooooooo.........',
      '................................',
      '................................',
    ],
    poses: {
      sit: [{ x: 14, y: 15, rows: ['bbbb', 'obbo', 'obso', 'obbo.o', 'obboobo', 'obbbbbo', '.ooooo'] }],
      up: [
        { x: 14, y: 7, rows: ['ohbo', 'ohso', 'ohbo', 'ohbo', 'ohso', 'ohbo', 'ohbo', 'ohso'] },
        { x: 14, y: 6, rows: ['ohbbo'] },
        { x: 14, y: 5, rows: ['.ohbbo'] },
        { x: 15, y: 4, rows: ['.ohbbo'] },
        { x: 16, y: 3, rows: ['.ohbbo'] },
        { x: 17, y: 2, rows: ['.ollo'] },
        { x: 18, y: 1, rows: ['oooo'] },
        { x: 14, y: 15, rows: ['oCCo', '.oo.'] },
      ],
      // Ohr-Flop: das linke Ohr sackt kurz nach unten
      alt: [
        { x: 14, y: 15, rows: ['bbbb', 'obbo', 'obso', 'obbo.o', 'obboobo', 'obbbbbo', '.ooooo'] },
        { x: 1, y: 19, rows: ['.osssssso', '.osssssoo', '..osssso', '...oooo'] },
      ],
    },
    eyeSize: 'm',
    eyes: [[11, 12], [19, 12]],
    cheeks: [[9, 15], [21, 15]],
    mouth: null,
    neck: 19,
    shadow: [10, 21],
    emit: [22, 0], // aus der Rüsselspitze
    zAt: [20, 1],
    plantAt: [25, 29],
    cheerFx: 'splash',
    sideFx: [[2, 22], [28, 22]],
  },

  igel: {
    label: 'Igel',
    defaultName: 'Ida',
    note: 'Trägt ein Blatt im Stachelkleid, ganz aus Versehen.',
    palette: {
      o: { light: '#5A4842', dark: '#4A3B37' },
      b: { light: '#8F7468', dark: '#9C8174' }, // Stacheln
      s: { light: '#735C52', dark: '#7D665B' },
      h: { light: '#B49A8B', dark: '#BFA596' },
      l: { light: '#EBD9C8', dark: '#E6D3C2' }, // Gesicht
      m: { light: '#D9C4B1', dark: '#D2BDAA' }, // Schnauze, Schatten im Gesicht
      e: { light: '#2E2A28', dark: '#231E1F' },
    },
    art: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...............oo...............',
      '............o.ohho.o............',
      '.........o.ohohhhhobo.o.........',
      '........ohohhhhhhhhbsobo........',
      '.......ohhhhhhbhhsbbbsbbo.......',
      '.....ohhhhhhhhhhbbbbbbsbbbo.....',
      '......ohhoohooooooooboobbo......',
      '.....ohhholollobbollolosbbo.....',
      '....ohhhhholllloollllobbsbbo....',
      '.....ohhbollllllllllllobbbo.....',
      '....ohhbbollllllllllllobbsso....',
      '....ohhbbollllllllllllobssso....',
      '....obbbollllllllllllllososo....',
      '.....obbollllllllllllllosso.....',
      '....obbsollllllllllllllossso....',
      '.....obbollllllmmllllllooso.....',
      '.....obbbollllmeemllllossso.....',
      '.....obbbollllllolllllossso.....',
      '......obbollllllllllllosso......',
      '.......obolllllllllllloso.......',
      '........oolllllllllmmmoo........',
      '.........olllllllllmmmo.........',
      '..........olllloollllo..........',
      '..........ooooo..ooooo..........',
      '................................',
      '................................',
    ],
    poses: {
      sit: [{ x: 21, y: 5, rows: ['..TG', '.GGG', 'GGG.', 'GG..'] }],
      up: [
        { x: 21, y: 4, rows: ['..TG', '.GGG', 'GGG.', 'GG..'] },
        { x: 4, y: 17, rows: ['.oo', 'ollo', 'ollo', '.oo'] },
        { x: 24, y: 17, rows: [' oo.', 'ollo', 'ollo', ' oo'] },
      ],
      // Schnüffeln: Nase zuckt nach oben, das Blatt wippt
      alt: [
        { x: 22, y: 5, rows: ['.TG', 'GGG', 'GG.', 'G..'] },
        { x: 14, y: 20, rows: ['.mm.', 'meem', 'lmml', 'lllo'] },
      ],
    },
    eyeSize: 's',
    eyes: [[12, 18], [18, 18]],
    cheeks: [[10, 21], [20, 21]],
    mouth: { open: { x: 15, y: 23, rows: ['oo', 'CC'] } },
    neck: 20,
    shadow: [10, 21],
    emit: [21, 1],
    zAt: [24, 4],
    plantAt: [26, 29],
    cheerFx: 'spark',
  },

  fuchs: {
    label: 'Fuchs',
    defaultName: 'Fili',
    note: 'Der Schwanz denkt manchmal schneller als der Kopf.',
    palette: {
      o: { light: '#5E4237', dark: '#4E362D' },
      b: { light: '#C98A68', dark: '#D29573' }, // Fell (gedämpftes Terrakotta)
      s: { light: '#A96F52', dark: '#B57B5C' },
      h: { light: '#DDA383', dark: '#E2AC8D' },
      l: { light: '#F2E6DA', dark: '#EDE0D3' }, // Creme
      k: { light: '#6E4E43', dark: '#5A3F35' }, // Ohrspitzen, Pfoten
      e: { light: '#2E2A28', dark: '#231E1F' },
    },
    art: [
      '................................',
      '................................',
      '....oo....................oo....',
      '...okko..................okko...',
      '...okkkoo..............ookkko...',
      '...okkkkkoo..........ookkkkko...',
      '....ohlbbbbo.oooooo.obbbblbo....',
      '....ohlllbboohhhhbboobblllbo....',
      '....obllloohhhhbbbbbboolllso....',
      '....obllohhhhhbbbbbbbbbollso....',
      '....obllohhhbbbbbbbbbbbollso....',
      '....oblohhbbbbbbbbbbbbbbolso....',
      '....obohbbbbbbbbbbbbbbbbboso....',
      '.....obbbllbbbbbbbbbbllbbso.....',
      '....obbllllllbbbbbbllllllsso....',
      '...obllllllllllllllllllllllso...',
      '....oollllllllleelllllllllooo...',
      '......ooolllllo..olllllooolllo..',
      '.........ollllloolllllo.olllllo.',
      '..........oolllllllloo..obllllo.',
      '...........oooooooooooooobbbbbo.',
      '..........obbbllllbbbobbbbbbbbo.',
      '.........obbbllllllbbbobbbbbsso.',
      '.........obbbllllllbbbobbbbssso.',
      '.........obbbllllllbbsobbsssso..',
      '.........obbbllllllbssobssssso..',
      '.........obbbllllllsssossssso...',
      '..........obbbllllsssossssso....',
      '...........okkollokkossssso.....',
      '...........oooossooooooooo......',
      '.............oooooo.............',
      '................................',
    ],
    poses: {
      sit: [],
      up: [
        { x: 5, y: 17, rows: ['.oo', 'olko', 'olko', '.oo'] },
        { x: 23, y: 16, rows: ['.oo', 'oklo', 'oklo', '.oo'] },
      ],
      // Schwanz-Schwung: die Spitze wandert nach außen
      alt: [{ x: 24, y: 17, rows: ['o.olllo.', '.olllllo', '.obllllo', 'obbbbbbo'] }],
    },
    eyeSize: 'm',
    eyes: [[11, 12], [19, 12]],
    cheeks: [[9, 15], [21, 15]],
    mouth: { open: { x: 14, y: 17, rows: ['o..o', '.oo.', '.CC.'] } },
    neck: 20,
    shadow: [10, 25],
    emit: [16, 0],
    zAt: [13, 1],
    plantAt: [1, 29],
    cheerFx: 'spark',
    sideFx: [[3, 21], [5, 12]],
  },

  otter: {
    label: 'Otter',
    defaultName: 'Otto',
    note: 'Hat seinen Lieblingsstein immer dabei.',
    palette: {
      o: { light: '#4E3C33', dark: '#45362D' },
      b: { light: '#9A7B66', dark: '#A88A74' },
      s: { light: '#7D6352', dark: '#88705F' },
      h: { light: '#B39782', dark: '#BEA28D' },
      l: { light: '#E2CFBC', dark: '#DDCAB7' }, // Schnauze, Bauch
      p: { light: '#AEB5A6', dark: '#B9C0AF' }, // der Stein
      e: { light: '#2E2A28', dark: '#231E1F' },
    },
    art: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '............oooooooo............',
      '.........ooohhhhbbbbooo.........',
      '....ooooohhhhhhbbbbbbbbooooo....',
      '....osobhhhhhhbbbbbbbbbbboso....',
      '....osobhhhhhbbbbbbbbbbbboso....',
      '.....oobhhhhbbbbbbbbbbsssoo.....',
      '......obbbbbbbbbbbbbbbssso......',
      '......obbblllleeeellllssso......',
      '......obbllsllleelllsllsso......',
      '......obblslllloollllslbso......',
      '.......obbllllollollllbbo.......',
      '........obbbllllllllbbbo........',
      '..........oooooooooooo..........',
      '.........obbssssssssbbo.........',
      '........obbbllllllllbsso........',
      '........obooloooooolooso........',
      '........oohsohpppppossoo........',
      '........oossopppppsossoo........',
      '........obooloooooolooso........',
      '........obbbllllllllbsso........',
      '........obbbllllllllbsso........',
      '........obbbllllllllbsso........',
      '.........obbllllllllsso.........',
      '..........osssllllssss..........',
      '...........oooooooooo...........',
      '................................',
      '................................',
    ],
    poses: {
      sit: [],
      // zeigt den Stein stolz unterm Kinn her
      up: [
        { x: 8, y: 18, rows: ['obooloooooolooso', 'oohsohpppppossoo', 'oossopppppsossoo', 'obooloooooolooso', 'obbbllllllllbsso', 'obbbllllllllbsso'] },
      ],
      // Stein reiben: die Pfoten rutschen einen Pixel
      alt: [{ x: 9, y: 21, rows: ['osso', 'ohso'] }, { x: 13, y: 21, rows: ['phpppp', 'pppppp'] }],
    },
    eyeSize: 's',
    eyes: [[11, 10], [19, 10]],
    cheeks: [[8, 12], [22, 12]],
    mouth: { open: { x: 15, y: 15, rows: ['CC'] } },
    neck: 17,
    shadow: [10, 21],
    emit: [17, 0],
    zAt: [22, 1],
    plantAt: [25, 29],
    cheerFx: 'drops',
  },

  faultier: {
    label: 'Faultier',
    defaultName: 'Fritzi',
    note: 'Lächelt immer. Blinzelt in Zeitlupe.',
    palette: {
      o: { light: '#4E4036', dark: '#46392F' },
      b: { light: '#A89683', dark: '#B5A390' },
      s: { light: '#8A7A69', dark: '#95856F' },
      h: { light: '#C2B19F', dark: '#CBBBA9' },
      l: { light: '#E3D6C6', dark: '#E1D3C3' }, // Gesichtsmaske
      m: { light: '#6F5A4B', dark: '#76604F' }, // Augenstreifen
      e: { light: '#2A2522', dark: '#1F1A18' },
    },
    art: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '............oooooooo............',
      '..........oohhhhhbbboo..........',
      '.........ohhhhhbbbbbbbo.........',
      '........ohhhhbbbbbbbbbbo........',
      '.......ohhhbbllllllbbbbbo.......',
      '.......ohbbllllllllllbbbo.......',
      '.......obbllmmllllmmllbbo.......',
      '......obmmmmmmllllmmmmmmbo......',
      '......obbmmmmmllllmmmmmbbo......',
      '.......obmmmmmllllmmmmmso.......',
      '.......obmllllleelllllmso.......',
      '.......obblllollllolllsso.......',
      '........obbllloooolllsso........',
      '......oooobbbbbbbbbbssoooo.GG...',
      '.....obbbbobbbbbbbbbbobbbbGGT...',
      'oooooobbbbbobbbbbbbbbobbbbooTooo',
      'sssssolollosssssssssssollolososs',
      'mmmomommmmmmmommmmmommmmmmmmommm',
      'mmmmmmmmmmmmmmmmmmoommmmmmmommmm',
      'oooooooooooooooooooooooooooooooo',
      '........obbbbbbbbbbbbsso........',
      '........obbbbbbbbbbsssso........',
      '.........obbbbbbbssssso.........',
      '..........obbbbbssssso..........',
      '............oooooooo............',
      '................................',
      '................................',
    ],
    poses: {
      sit: [],
      // ein Arm winkt gemächlich (hinter dem Kopf hervor)
      up: [
        { x: 5, y: 18, rows: ['....ob', '...obb', 'oooobb', 'ssssss'] },
        { x: 2, y: 7, under: true, rows: ['.l.l', 'olllo', 'obbo', 'obbbo', 'obbbo', 'obbbo', '.obbbo', '.obbbo', '..obbbo', '..obbbbo', '...obbbb', '...obbbb'] },
      ],
      // das Blättchen am Ast bewegt sich im Wind
      alt: [{ x: 26, y: 17, rows: ['..G', '.GG', 'GGT', '..T'] }],
    },
    eyeSize: 's',
    eyes: [[11, 12], [19, 12]],
    cheeks: [[9, 15], [21, 15]],
    mouth: { open: { x: 14, y: 17, rows: ['oCCo'] } },
    neck: 17,
    shadow: [10, 21],
    emit: [16, 2],
    zAt: [24, 4],
    plantAt: [2, 29],
    cheerFx: 'spark',
    slowBlink: true,
  },

  eule: {
    label: 'Eule',
    defaultName: 'Ella',
    note: 'Blinzelt langsam, ein Auge nach dem anderen.',
    palette: {
      o: { light: '#4F4038', dark: '#463A33' },
      b: { light: '#A38F7D', dark: '#B09C8A' },
      s: { light: '#85705F', dark: '#8F7B69' },
      h: { light: '#BCA996', dark: '#C6B4A2' },
      l: { light: '#EADFD2', dark: '#E5D9CB' }, // Gesichtsschleier, Bauch
      k: { light: '#CFAE80', dark: '#D4B587' }, // Schnabel, Krallen (Honig)
      e: { light: '#2E2A28', dark: '#231E1F' },
    },
    art: [
      '................................',
      '................................',
      '................................',
      '........o..............o........',
      '.......oho............obo.......',
      '.......ohhoo........oobbo.......',
      '.......obbbbo..oo..obbsso.......',
      '.......obbbbooohhooosssso.......',
      '........oboooohhhhooooso........',
      '........oolllloooolllloo........',
      '.......olllllllollllllllo.......',
      '.......olllllllollllllllo.......',
      '......olllllllollllllllllo......',
      '......olllllllollllllllllo......',
      '......oolllllllolllllllloo......',
      '......oolllllllkkllllllloo......',
      '.....ossollllllkkllllllosso.....',
      '....ossssoollooo.oolloosssso....',
      '....osssssooollllllooossssso....',
      '....osssssobllllllllbossssso....',
      '....osssssolhllhllhllossssso....',
      '....osssssolsllsllsllossssso....',
      '....osssssollllllllllossssso....',
      '....osssssolhllhllhllossssso....',
      '....osssssolsllsllsllossssso....',
      '.....osssobllllllllllsossso.....',
      '......ossoblhllhllhllsosso......',
      '.......oo.oosllsllsloo.oo.......',
      '............k.kllk.k............',
      '...............oo...............',
      '................................',
      '................................',
    ],
    poses: {
      sit: [],
      up: [
        { x: 1, y: 13, rows: ['..oo', '.osso', 'osssso', 'ossssso', '.ossssso', '..osssso', '...oooo'] },
        { x: 24, y: 13, rows: ['  oo..', ' osso.', 'osssso', 'ossssso'.slice(0, 7), 'osssssso'.slice(0, 7), 'ossssso', 'oooo'] },
      ],
      alt: [{ x: 7, y: 3, rows: ['.', '.o', 'oho'] }],
    },
    eyeSize: 'l',
    eyes: [[10, 12], [19, 12]],
    cheeks: [[7, 16], [23, 16]],
    mouth: { open: { x: 15, y: 15, rows: ['kk', 'oo'] } },
    neck: 17,
    shadow: [9, 22],
    emit: [16, 2],
    zAt: [25, 1],
    plantAt: [26, 29],
    cheerFx: 'spark',
    winkBlink: true,
  },

  keimling: {
    label: 'Keimling',
    defaultName: 'Keimi',
    note: 'Der erste Bewohner des Gartens.',
    palette: {
      o: { light: '#556449', dark: '#46513B' },
      b: { light: '#A9B79B', dark: '#AFBCA2' },
      s: { light: '#8C9B7E', dark: '#93A186' },
      h: { light: '#C3CFB6', dark: '#C7D2BB' },
      g: { light: '#7F9471', dark: '#93A884' }, // Blätter
      e: { light: '#2E2A28', dark: '#231E1F' },
    },
    art: [
      '................................',
      '................................',
      '................................',
      '..................ooooo.........',
      '........ooooooo.oohhhhhoo.......',
      '.......ohhhhhhhohhhhhggggo......',
      '......ohhhhhgggohhgggggggo......',
      '......ohhgggggggogggggggo.......',
      '.......ogggggggogogggggo........',
      '........oogggooogoooooo.........',
      '..........ooo..ogo..............',
      '...............ooo..............',
      '...........oooohhoooo...........',
      '..........ohhhhhhhbbbo..........',
      '.........ohhhhhhbbbbbbo.........',
      '........ohhhhhbbbbbbbbbo........',
      '.......ohhhhhbbbbbbbbbbbo.......',
      '.......ohhhbbbbbbbbbbbbbo.......',
      '......ohhbbbbbbbbbbbbbbbbo......',
      '......ohbbbbbbbbbbbbbbbbbo......',
      '......obbbbbbbbbbbbbbbbbbo......',
      '......obbbbbbbbbbbbbbbbsso......',
      '......obbbbbbbbbbbbbbbssso......',
      '.......obbbbbbbbbbbbsssso.......',
      '.......obbbbbbbbbbsssssso.......',
      '........obbbbbbbbsssssso........',
      '.........obbbbbssssssso.........',
      '..........obbbssssssso..........',
      '...........ooossssooo...........',
      '..............oooo..............',
      '................................',
      '................................',
    ],
    poses: {
      sit: [],
      up: [{ x: 6, y: 2, rows: ['..ooooo.......ooooo...', '.ohhhhhoo....ohhhhgo..', 'ohhhgggggo..ogggggggo.', '.oggggggggoogggggggo..', '..ooooooogogooooooo...'] }],
      alt: [{ x: 7, y: 3, rows: ['.........ooooo', '.ooooooo.ohhhhh'] }],
    },
    eyeSize: 'm',
    eyes: [[12, 18], [18, 18]],
    cheeks: [[9, 21], [21, 21]],
    mouth: { open: { x: 15, y: 22, rows: ['oo', 'CC'] } },
    neck: 13,
    shadow: [9, 22],
    emit: [16, 1],
    zAt: [24, 8],
    plantAt: [26, 29],
    cheerFx: 'spark',
  },
};

export const SPECIES_IDS = Object.keys(SPECIES_DATA);

/* ---------- Zusammensetzen ---------- */

const toGrid = (rows) => rows.map((r) => r.split(''));
const fromGrid = (g) => g.map((r) => r.join(''));

/**
 * Stempelt rows bei (x, y). „ “ lässt das Bild stehen; „.“ radiert nur mit clearDots;
 * mit under wird nur auf leere Pixel gemalt (z. B. ein Arm hinter dem Kopf).
 */
export function stamp(g, x, y, rows, { clearDots = false, under = false } = {}) {
  rows.forEach((row, j) => {
    [...row].forEach((c, i) => {
      const yy = y + j;
      const xx = x + i;
      if (yy < 0 || yy >= GRID || xx < 0 || xx >= GRID) return;
      if (c === ' ') return;
      if (c === '.' && !clearDots) return;
      if (under && g[yy][xx] !== '.') return; // hinter die Figur malen
      g[yy][xx] = c;
    });
  });
}

/** Zeile um Zeile nach unten schieben (Ausatmen: der Kopf sinkt einen Pixel). */
function breathe(g, neck) {
  const old = g.map((r) => [...r]);
  for (let y = 1; y <= neck; y++) {
    g[y] = old[y - 1].map((c, x) => (c !== '.' ? c : y === neck ? old[y][x] : '.'));
  }
  g[0] = g[0].map(() => '.');
}

/** Ganze Figur um dy Pixel anheben. */
function lift(g, dy) {
  if (!dy) return g;
  const out = g.map((r) => r.map(() => '.'));
  for (let y = 0; y < GRID; y++) {
    const src = y + dy;
    if (src < GRID) out[y] = [...g[src]];
  }
  return out;
}

function eyeStamp(sp, kind) {
  return EYES[sp.eyeSize][kind] || EYES[sp.eyeSize].open;
}

/** Setzt Augen; Bögen (happy/sleep) werden nach außen versetzt. */
function drawEyes(g, sp, kinds) {
  sp.eyes.forEach(([x, y], side) => {
    const kind = Array.isArray(kinds) ? kinds[side] : kinds;
    const rows = eyeStamp(sp, kind);
    // Bögen sind breiter als das offene Auge und werden mittig darübergelegt
    const dx = -Math.floor((rows[0].length - EYES[sp.eyeSize].w) / 2);
    stamp(g, x + dx, y, rows);
  });
}

/**
 * Ein Bild zusammensetzen.
 * @param {object} sp Artdaten
 * @param {{pose?: string, eyes?: string|string[], mouth?: string|null, hop?: number, breathe?: boolean, fx?: Array<[string, number, number]>, blush?: boolean}} f
 */
export function composeFrame(sp, f) {
  let g = toGrid(sp.art);
  for (const p of sp.poses[f.pose || 'sit'] || []) stamp(g, p.x, p.y, p.rows, { clearDots: !p.under, under: !!p.under });
  drawEyes(g, sp, f.eyes || 'open');
  if (f.blush !== false) for (const [x, y] of sp.cheeks) stamp(g, x, y, ['CC']);
  if (f.mouth && sp.mouth && sp.mouth[f.mouth]) {
    const m = sp.mouth[f.mouth];
    stamp(g, m.x, m.y, m.rows);
  }
  if (f.breathe) breathe(g, sp.neck);
  g = lift(g, f.hop || 0);
  // Bodenschatten: wird beim Hüpfen kleiner
  const [s0, s1] = sp.shadow;
  const shrink = Math.min(f.hop || 0, 2) * 2;
  for (let x = s0 + shrink; x <= s1 - shrink; x++) if (g[30][x] === '.') g[30][x] = 'D';
  for (const [name, x, y] of f.fx || []) {
    const rows = FX[name];
    // Pflanzen sind unten verankert
    const yy = name.startsWith('plant') ? y - rows.length + 1 : y;
    stamp(g, x, yy, rows);
  }
  return fromGrid(g);
}

/** Bildfolgen je Zustand (Rezepte). */
function recipes(sp) {
  const [ex, ey] = sp.emit;
  const [zx, zy] = sp.zAt;
  const [px, py] = sp.plantAt;
  const left = px < 16; // Pflanze links → Funken links daneben
  const sx = left ? px + 1 : px + 2;
  const idleEyes = sp.winkBlink
    ? [['open', 'open'], ['open', 'half'], ['open', 'blink'], ['open', 'half']]
    : sp.slowBlink
      ? [['open'], ['half'], ['blink'], ['half']]
      : [['open'], ['open'], ['blink'], ['open']];
  const pick = (a) => (a.length === 1 ? a[0] : a);
  const cheerFx = sp.cheerFx;
  const [[l1x, l1y], [l2x, l2y]] = sp.sideFx || [[1, 9], [29, 9]];
  return {
    idle: [
      { pose: 'sit', eyes: pick(idleEyes[0]), ms: 1500 },
      { pose: 'sit', eyes: pick(idleEyes[1]), breathe: true, ms: sp.slowBlink ? 520 : 1100 },
      { pose: 'alt', eyes: pick(idleEyes[2]), breathe: true, ms: sp.slowBlink || sp.winkBlink ? 620 : 160 },
      { pose: 'alt', eyes: pick(idleEyes[3]), ms: sp.slowBlink || sp.winkBlink ? 520 : 1200 },
    ],
    happy: [
      { pose: 'sit', eyes: 'happy', ms: 420 },
      { pose: 'up', eyes: 'happy', hop: 1, fx: [['heartS', ex, ey + 3]], ms: 360 },
      { pose: 'up', eyes: 'happy', hop: 1, fx: [['heart', ex + 1, ey]], ms: 640 },
      { pose: 'sit', eyes: 'happy', fx: [['heartS', ex + 3, ey]], ms: 520 },
    ],
    cheer: [
      { pose: 'up', eyes: 'wide', mouth: 'open', hop: 1, fx: [[cheerFx, ex - 1, ey]], ms: 340 },
      { pose: 'sit', eyes: 'happy', fx: [['lines', l1x, l1y], ['lines', l2x, l2y]], ms: 300 },
      { pose: 'up', eyes: 'wide', mouth: 'open', hop: 1, fx: [[cheerFx, ex - 2, ey + 1]], ms: 340 },
      { pose: 'sit', eyes: 'happy', fx: [['sparkS', l1x + 1, l1y - 3], ['sparkS', l2x, l2y - 4]], ms: 300 },
    ],
    calm: [
      { pose: 'sit', eyes: 'sleep', fx: [['zS', zx, zy + 1]], ms: 1700 },
      { pose: 'sit', eyes: 'sleep', breathe: true, fx: [['zS', zx + 1, zy], ['zL', zx + 4, zy - 1]], ms: 1900 },
      { pose: 'sit', eyes: 'sleep', breathe: true, fx: [['zL', zx + 4, zy - 1]], ms: 1500 },
    ],
    proud: [
      { pose: 'sit', eyes: 'open', fx: [['plant1', px, py]], ms: 700 },
      { pose: 'sit', eyes: 'happy', fx: [['plant2', px, py]], ms: 700 },
      { pose: 'sit', eyes: 'happy', breathe: true, fx: [['plant3', px - 1, py], ['spark', sx, py - 12]], ms: 1700 },
    ],
  };
}

/** Welches Bild bei reduzierter Bewegung stehen bleibt. */
export const STILL_FRAME = { idle: 0, happy: 2, cheer: 0, calm: 0, proud: 2 };

/** Baut alle Bilder einer Art: {state: [{grid: string[], ms}]} */
export function buildFrames(sp) {
  const out = {};
  for (const [state, list] of Object.entries(recipes(sp))) {
    out[state] = list.map((f) => ({ grid: composeFrame(sp, f), ms: f.ms }));
  }
  return out;
}

/** Fertige Arten inkl. Bilder. */
export const SPECIES = Object.fromEntries(
  Object.entries(SPECIES_DATA).map(([id, sp]) => [id, { id, ...sp, frames: buildFrames(sp) }]),
);

/** CSS-Variablenname einer Farbe. */
export const colorVar = (speciesId, key) =>
  /[A-Z]/.test(key) ? `--ng-fx-${key.toLowerCase()}` : `--ng-${speciesId}-${key}`;

/**
 * CSS mit allen Farbvariablen (hell + dunkel). Dunkel greift bei
 * :root[data-theme="dark"] und – solange nicht ausdrücklich hell gewählt –
 * bei prefers-color-scheme: dark.
 */
export function paletteCss() {
  const decl = (mode) => {
    const lines = [];
    for (const [k, v] of Object.entries(SHARED_PALETTE)) lines.push(`${colorVar('', k)}:${v[mode]};`);
    for (const [id, sp] of Object.entries(SPECIES_DATA)) {
      for (const [k, v] of Object.entries(sp.palette)) lines.push(`${colorVar(id, k)}:${v[mode]};`);
    }
    return lines.join('');
  };
  return `:root{${decl('light')}}\n:root[data-theme="dark"]{${decl('dark')}}\n@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${decl('dark')}}}`;
}
