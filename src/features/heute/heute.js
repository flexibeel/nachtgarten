/**
 * „Heute“: fester Rahmen (Begrüßung, Begleiter, Einstellungen & Daten) und dazwischen
 * die Kacheln der eingeschalteten Module – aus der Registry, in gespeicherter Reihenfolge.
 * Kleine Kacheln, die aufeinander folgen, stehen nebeneinander.
 */

import { h } from '../../ui/dom.js';
import { headerPart } from './header.js';
import { companionPart } from './companion-row.js';
import { settingsPart } from './settings.js';

/** @typedef {import('../context.js').AppContext} AppContext */
/** @typedef {import('../part.js').Part} Part */

/**
 * Kacheln der Module, kleine in Zweier-Rastern gruppiert.
 * @param {AppContext} ctx
 * @returns {{nodes: HTMLElement[], parts: Part[]}}
 */
function moduleTiles(ctx) {
  const { enabledModules, tileOrder, hiddenTiles = [] } = ctx.store.settings.get();
  const parts = [];
  const nodes = [];
  /** @type {HTMLElement|null} */
  let grid = null;
  for (const tile of ctx.registry.tiles(enabledModules, tileOrder).filter((x) => !hiddenTiles.includes(x.id))) {
    const part = tile.render(ctx);
    parts.push(part);
    if (!part.el) continue;
    part.el.dataset.tile = tile.id;
    if (tile.size === 'small') {
      if (!grid) nodes.push((grid = h('div', { class: 'heute-tiles' })));
      grid.append(part.el);
    } else {
      grid = null;
      nodes.push(part.el);
    }
  }
  return { nodes, parts };
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 */
export function mountHeute(ctx, view) {
  const head = [headerPart(ctx), companionPart(ctx)];
  const tail = [settingsPart(ctx)];
  const slot = h('div', { class: 'heute-modules' });
  /** @type {Part[]} */
  let tileParts = [];

  const paintTiles = () => {
    tileParts.forEach((p) => p.destroy?.());
    const { nodes, parts } = moduleTiles(ctx);
    tileParts = parts;
    slot.replaceChildren(...nodes);
  };
  paintTiles();

  // Module an/aus oder neue Reihenfolge: Kacheln neu zusammenstellen.
  const key = () => {
    const { enabledModules, tileOrder, hiddenTiles } = ctx.store.settings.get();
    return JSON.stringify([enabledModules, tileOrder, hiddenTiles]);
  };
  let last = key();
  const off = ctx.watch(['settings'], () => {
    const next = key();
    if (next !== last) {
      last = next;
      paintTiles();
    }
  });

  view.append(...head.map((p) => p.el), slot, ...tail.map((p) => p.el));
  return () => {
    off();
    [...head, ...tileParts, ...tail].forEach((p) => p.destroy?.());
  };
}
