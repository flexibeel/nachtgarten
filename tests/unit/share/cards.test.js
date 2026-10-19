import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAME, H, SAFE, TEMPLATES, W, detailRows, kraftKarte, laufKarte, laufSticker, minimalTypo, pixelStempel,
  programmKarte, renderCard, suggestions, tempoWelle,
} from '../../../src/ui/share/cards.js';
import { figureSize, rasterFigure } from '../../../src/ui/share/figur.js';
import { LEG_DAY, PUSH_DAY, RUN } from './fixtures.js';

/**
 * Aufzeichnender Canvas-Ersatz: merkt sich jeden fillText-Aufruf mit
 * der echten Position (inkl. translate/rotate/scale/setTransform).
 */
function mockFactory({ tracking = true } = {}) {
  const canvases = [];
  const create = (w, h) => {
    const texts = [];
    let m = [1, 0, 0, 1, 0, 0];
    const stack = [];
    const mul = (n) => {
      const [a, b, c, d, e, f] = m;
      m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
    };
    const state = { font: '10px sans-serif', globalAlpha: 1, textAlign: 'left' };
    if (tracking) state.letterSpacing = '0px';
    const px = () => Number((/([\d.]+)px/.exec(state.font) || [0, 10])[1]);
    const api = {
      save: () => stack.push([...m]),
      restore: () => { m = stack.pop() || [1, 0, 0, 1, 0, 0]; },
      translate: (x, y) => mul([1, 0, 0, 1, x, y]),
      scale: (x, y) => mul([x, 0, 0, y, 0, 0]),
      rotate: (r) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
      setTransform: (...t) => { m = t.length === 6 ? t : [1, 0, 0, 1, 0, 0]; },
      resetTransform: () => { m = [1, 0, 0, 1, 0, 0]; },
      measureText: (t) => ({ width: [...String(t)].length * px() * 0.5 }),
      fillText: (t, x, y) => {
        assert.equal(typeof t, 'string');
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `Position für „${t}“`);
        const k = Math.hypot(m[0], m[1]);
        texts.push({ t, x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5], px: px() * k, rotated: Math.abs(m[1]) > 1e-6 });
      },
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({}),
      createImageData: (iw, ih) => ({ width: iw, height: ih, data: new Uint8ClampedArray(iw * ih * 4) }),
    };
    const ctx = new Proxy(state, {
      get: (target, key) => (key in api ? api[key] : key in target ? target[key] : () => {}),
      set: (target, key, v) => { target[key] = v; return true; },
      has: (target, key) => key in target || key in api,
    });
    const canvas = { width: w, height: h, texts, getContext: () => ctx };
    canvases.push(canvas);
    return canvas;
  };
  return { create, canvases };
}

/** Alle Texte der Hauptfläche liegen in der sicheren Zone. */
function assertInside(canvas, top, bottom, label) {
  assert.ok(canvas.texts.length > 0, `${label}: es wurde geschrieben`);
  for (const t of canvas.texts) {
    if (t.rotated) continue; // Poststempel-Schrift läuft im Kreis – liegt mitten auf der Marke
    const capTop = t.y - t.px * 0.78;
    const descent = t.y + t.px * 0.24;
    assert.ok(capTop >= top - 1, `${label}: „${t.t}“ ragt oben heraus (${capTop.toFixed(0)} < ${top})`);
    assert.ok(descent <= bottom + 1, `${label}: „${t.t}“ ragt unten heraus (${descent.toFixed(0)} > ${bottom})`);
    assert.ok(t.x >= 40 && t.x <= W - 40, `${label}: „${t.t}“ seitlich außerhalb (${t.x.toFixed(0)})`);
  }
}

const SESSIONS = { lauf: RUN, kraft: LEG_DAY };
const ALL = [];
for (const [id, t] of Object.entries(TEMPLATES)) {
  for (const type of t.for) {
    for (const v of t.variants) {
      for (const detail of ['kompakt', 'detailliert']) {
        for (const format of ['story', 'feed']) ALL.push({ id, type, opts: { ...v, detail, format } });
      }
    }
  }
}

test('jede Vorlage × Variante × Detailgrad × Format: richtige Größe, Text in der sicheren Zone', () => {
  assert.ok(ALL.length >= 60);
  for (const { id, type, opts } of ALL) {
    const { create, canvases } = mockFactory();
    const c = renderCard(SESSIONS[type], { template: id, opts }, { createCanvas: create });
    const label = `${id}/${type}/${JSON.stringify(opts)}`;
    const fmt = opts.format === 'feed' ? 'feed' : 'story';
    assert.equal(c.width, W, label);
    assert.equal(c.height, fmt === 'feed' ? 1350 : H, label);
    assert.equal(canvases[0], c, 'die Hauptfläche wird zuerst angelegt');
    if (fmt === 'story') assertInside(c, SAFE.top, SAFE.bottom, label);
    else assertInside(c, Math.min(FRAME.feed.top, 76) - 12, FRAME.feed.bottom + 12, label);
  }
});

test('Push-Tag und Kraft-Varianten rendern ebenso sauber', () => {
  for (const detail of ['kompakt', 'detailliert']) {
    for (const format of ['story', 'feed']) {
      for (const fn of [kraftKarte, pixelStempel, minimalTypo]) {
        const { create } = mockFactory();
        const c = fn(PUSH_DAY, { theme: 'dunkel', detail, format, createCanvas: create });
        const fr = format === 'feed' ? [64, 1292] : [SAFE.top, SAFE.bottom];
        assertInside(c, fr[0], fr[1], `${fn.name}/${detail}/${format}`);
      }
    }
  }
});

test('Programmheft: jede Übung mit Sätzen steht auf dem Bild, in Story und Feed', () => {
  for (const format of ['story', 'feed']) {
    const { create } = mockFactory();
    const c = programmKarte(LEG_DAY, { theme: 'hell', format, createCanvas: create });
    const all = c.texts.map((t) => t.t);
    for (const ex of LEG_DAY.exercises) assert.ok(all.includes(ex.name), `${format}: ${ex.name}`);
    for (const s of ['3 × 8', '100 kg', '10 · 10 · 8', '80 · 80 · 85 kg', '16 kg je Seite', '4 × 15', '15.920', '19', '58']) {
      assert.ok(all.includes(s), `${format}: „${s}“ fehlt`);
    }
    assert.ok(all.includes('Bestwert'));
    assert.ok(all.includes('nachtgarten'), 'Signatur');
  }
  // kraftKarte detailliert = Programmheft
  const a = mockFactory(); const b = mockFactory();
  const x = kraftKarte(LEG_DAY, { detail: 'detailliert', createCanvas: a.create });
  const y = programmKarte(LEG_DAY, { createCanvas: b.create });
  assert.deepEqual(x.texts.map((t) => t.t), y.texts.map((t) => t.t));
});

test('kompakte Karten zeigen höchstens drei Kennzahlen', () => {
  const nums = (c) => c.texts.map((t) => t.t).filter((t) => /^\d[\d.,:]*$/.test(t) && t.length > 1);
  const { create } = mockFactory();
  const st = nums(laufSticker(RUN, { createCanvas: create }));
  assert.deepEqual(st, ['7,42', '41:18', '5:34']);
  const ty = nums(minimalTypo(RUN, { theme: 'hell', createCanvas: mockFactory().create }));
  assert.deepEqual(ty, ['7,42', '41:18', '5:34']);
  const kr = nums(kraftKarte(LEG_DAY, { theme: 'hell', createCanvas: mockFactory().create }));
  assert.deepEqual(kr, ['15.920', '19', '100']);
});

test('Sticker: kompaktes Format ist eng zugeschnitten; Signatur ist kleingeschrieben', () => {
  const { create } = mockFactory();
  const c = laufSticker(RUN, { format: 'kompakt', createCanvas: create });
  assert.equal(c.width, 1080);
  assert.ok(c.height < 1300 && c.height > 800, `${c.height}`);
  const sig = c.texts.find((t) => t.t === 'nachtgarten');
  assert.ok(sig, 'Signatur vorhanden');
  for (const t of c.texts) assert.ok(t.y > 0 && t.y < c.height);
  // keine Großbuchstaben-Etiketten
  for (const t of c.texts) assert.doesNotMatch(t.t, /[A-ZÄÖÜ]{3,}/);
});

test('ohne letterSpacing (älteres Safari): Zeichen werden einzeln gesetzt, nichts bricht', () => {
  const a = mockFactory({ tracking: false });
  const c = laufSticker(RUN, { createCanvas: a.create });
  const digits = c.texts.filter((t) => ['7', ',', '4', '2'].includes(t.t));
  assert.ok(digits.length >= 4, 'Heldenzahl zeichenweise gesetzt');
  assertInside(c, SAFE.top, SAFE.bottom, 'sticker ohne tracking');
  const b = mockFactory({ tracking: true });
  assert.ok(laufSticker(RUN, { createCanvas: b.create }).texts.some((t) => t.t === '7,42'));
});

test('gleiche Daten → gleiches Bild (reproduzierbarer Zufall)', () => {
  const a = mockFactory(); const b = mockFactory();
  const x = laufKarte(RUN, { theme: 'dunkel', createCanvas: a.create });
  const y = laufKarte(RUN, { theme: 'dunkel', createCanvas: b.create });
  assert.deepEqual(x.texts, y.texts);
});

test('Sternbild und Welle: ohne Route bzw. ohne Splits kein Absturz', () => {
  const run = { ...RUN, route: [], splits: undefined };
  assert.doesNotThrow(() => laufKarte(run, { createCanvas: mockFactory().create }));
  assert.doesNotThrow(() => laufSticker(run, { createCanvas: mockFactory().create }));
  assert.doesNotThrow(() => tempoWelle({ ...run, distanceM: 800, durationS: 300 }, { createCanvas: mockFactory().create }));
});

test('detailRows: Kraft je Übung, Lauf je Kilometer mit schnellstem markiert', () => {
  const k = detailRows(LEG_DAY);
  assert.equal(k.length, 6);
  assert.deepEqual(k[0], { left: 'Kniebeuge', right: '3 × 8', sub: 'Beine vorn · Po', subRight: '100 kg', mark: true });
  const l = detailRows(RUN);
  assert.equal(l.length, 8);
  assert.equal(l[0].left, '1. Kilometer');
  assert.equal(l[7].left, 'letzte 420 m');
  assert.equal(l.filter((r) => r.mark).length, 1);
  assert.equal(l[7].mark, true);
});

test('suggestions: rendert jeden Vorschlag', () => {
  for (const s of [RUN, LEG_DAY, PUSH_DAY]) {
    for (const sug of suggestions(s, { createCanvas: mockFactory().create })) {
      const c = sug.render({ detail: 'detailliert' });
      assert.equal(c.width, 1080);
    }
  }
});

test('Körperbeet: Pixel-Mannequin – heller Kopf mit Rand, Muskeln je Ansicht, symmetrisch', () => {
  const front = rasterFigure('vorn');
  const back = rasterFigure('hinten');
  const cells = (r) => r.grid.flat().filter(Boolean);
  const head = cells(front).filter((c) => c.part === 'head');
  const edge = cells(front).filter((c) => c.part === 'edge');
  assert.ok(head.length > 10, 'der Kopf ist innen hell, nicht nur Rand');
  assert.ok(edge.length > 10 && edge.length < head.length * 2);
  const muscles = (r) => new Set(cells(r).map((c) => c.muscle).filter(Boolean));
  assert.ok(muscles(front).has('chest') && muscles(front).has('quads') && muscles(front).has('abs'));
  assert.ok(!muscles(front).has('glutes') && !muscles(front).has('hams'));
  assert.ok(muscles(back).has('glutes') && muscles(back).has('hams') && muscles(back).has('back') && muscles(back).has('calves'));
  assert.ok(!muscles(back).has('chest'));
  for (const row of front.grid) {
    for (let i = 0; i < row.length; i++) assert.equal(!!row[i], !!row[row.length - 1 - i], 'spiegelsymmetrisch');
  }
  const fs = figureSize(9);
  assert.equal(fs.w, front.cols * 9);
});

test('Siegel aus dem Begleiter: 9 × 9, je Art eigenes Motiv', async () => {
  const { sealForSpecies, sealFromGrid } = await import('../../../src/ui/share/seal.js');
  const elli = sealForSpecies('elefant');
  assert.equal(elli.length, 9);
  assert.ok(elli.every((r) => r.length === 9 && /^[#.]+$/.test(r)));
  const filled = elli.join('').split('#').length - 1;
  assert.ok(filled > 20 && filled < 75, `Elli: ${filled} Punkte`);
  assert.notDeepEqual(sealForSpecies('eule'), elli);
  assert.equal(sealForSpecies('drache'), null);
  assert.deepEqual(sealFromGrid(['...', '.D.']), Array(9).fill('.........'), 'nur Schatten → leer');
});
