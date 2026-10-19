import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID, SPECIES, SPECIES_IDS, STATES, SHARED_PALETTE, STILL_FRAME, FX, EYES, paletteCss, colorVar } from '../../../src/ui/companion/sprites.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;

test('alle sieben Arten sind da, der Elefant zuerst', () => {
  assert.deepEqual(SPECIES_IDS, ['elefant', 'igel', 'fuchs', 'otter', 'faultier', 'eule', 'keimling']);
  assert.equal(SPECIES.elefant.defaultName, 'Elli');
});

test('jede Art hat jeden Zustand mit 2–4 Bildern und positiven Dauern', () => {
  for (const id of SPECIES_IDS) {
    for (const st of STATES) {
      const frames = SPECIES[id].frames[st];
      assert.ok(Array.isArray(frames), `${id}/${st} fehlt`);
      assert.ok(frames.length >= 2 && frames.length <= 4, `${id}/${st}: ${frames.length} Bilder`);
      for (const f of frames) assert.ok(Number.isFinite(f.ms) && f.ms > 0, `${id}/${st}: Dauer`);
      assert.ok(STILL_FRAME[st] < frames.length, `${id}/${st}: Standbild außerhalb`);
    }
  }
});

test('Grundbild und alle Bilder sind 32×32', () => {
  for (const id of SPECIES_IDS) {
    const sp = SPECIES[id];
    assert.equal(sp.art.length, GRID, `${id}: Zeilen im Grundbild`);
    for (const row of sp.art) assert.equal(row.length, GRID, `${id}: Spalten im Grundbild`);
    for (const st of STATES) {
      for (const [i, f] of sp.frames[st].entries()) {
        assert.equal(f.grid.length, GRID, `${id}/${st}/${i}: Zeilen`);
        for (const row of f.grid) assert.equal(row.length, GRID, `${id}/${st}/${i}: Spalten`);
      }
    }
  }
});

test('Paletten: 5–7 eigene Farben, gültige Hex-Werte hell und dunkel', () => {
  for (const id of SPECIES_IDS) {
    const keys = Object.keys(SPECIES[id].palette);
    assert.ok(keys.length >= 5 && keys.length <= 7, `${id}: ${keys.length} Farben`);
    for (const k of keys) {
      assert.match(k, /^[a-z]$/, `${id}: Artfarben sind Kleinbuchstaben`);
      assert.match(SPECIES[id].palette[k].light, HEX, `${id}.${k} hell`);
      assert.match(SPECIES[id].palette[k].dark, HEX, `${id}.${k} dunkel`);
    }
    // Kontur, Grundton und Augen gibt es überall
    for (const k of ['o', 'b', 'e']) assert.ok(keys.includes(k), `${id}: ${k} fehlt`);
  }
  for (const [k, v] of Object.entries(SHARED_PALETTE)) {
    assert.match(k, /^[A-Z]$/);
    assert.match(v.light, HEX);
    assert.match(v.dark, HEX);
  }
});

test('jedes Pixel hat eine Farbe aus Art- oder Effektpalette', () => {
  for (const id of SPECIES_IDS) {
    const allowed = new Set(['.', ...Object.keys(SPECIES[id].palette), ...Object.keys(SHARED_PALETTE)]);
    for (const st of STATES) {
      for (const [i, f] of SPECIES[id].frames[st].entries()) {
        for (const row of f.grid) for (const c of row) assert.ok(allowed.has(c), `${id}/${st}/${i}: unbekannte Farbe „${c}“`);
      }
    }
  }
});

test('Haltungs-Flicken bleiben im Bild, Augen-Anker passen', () => {
  for (const id of SPECIES_IDS) {
    const sp = SPECIES[id];
    for (const pose of ['sit', 'up', 'alt']) assert.ok(Array.isArray(sp.poses[pose]), `${id}: Haltung ${pose}`);
    for (const list of Object.values(sp.poses)) {
      for (const p of list) {
        assert.ok(p.x >= 0 && p.y >= 0 && p.y + p.rows.length <= GRID, `${id}: Flicken außerhalb`);
        for (const r of p.rows) assert.ok(p.x + r.length <= GRID, `${id}: Flicken zu breit`);
      }
    }
    assert.equal(sp.eyes.length, 2);
    assert.ok(EYES[sp.eyeSize], `${id}: Augengröße`);
  }
});

test('Bilder eines Zustands unterscheiden sich (es bewegt sich etwas)', () => {
  for (const id of SPECIES_IDS) {
    for (const st of STATES) {
      const set = new Set(SPECIES[id].frames[st].map((f) => f.grid.join('')));
      assert.ok(set.size >= 2, `${id}/${st} steht still`);
    }
  }
});

test('Effekt-Stempel nutzen nur Effektfarben', () => {
  for (const [name, rows] of Object.entries(FX)) {
    for (const row of rows) for (const c of row) assert.ok(c === '.' || c in SHARED_PALETTE, `${name}: ${c}`);
  }
});

test('Palette als CSS: Variablen für hell, dunkel und Systemeinstellung', () => {
  const css = paletteCss();
  assert.match(css, /:root\{/);
  assert.match(css, /:root\[data-theme="dark"\]\{/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)\{:root:not\(\[data-theme="light"\]\)\{/);
  assert.ok(css.includes(`${colorVar('elefant', 'b')}:#A69DA3;`));
  assert.equal(colorVar('fuchs', 'C'), '--ng-fx-c');
});
