/**
 * Nachtgarten – Begleiter-Figur: Pixel-Sprite als SVG, mit kleiner Animationsschleife.
 *
 *   const c = render(el, { species: 'elefant', state: 'happy', name: 'Elli' });
 *   c.update({ state: 'calm' });
 *   c.destroy();
 *
 * Farben kommen ausschließlich aus CSS-Variablen (siehe sprites.js → paletteCss),
 * damit Hell/Dunkel ohne neues Zeichnen wechselt. Die Schleife ist zeitstempel-
 * basiert (requestAnimationFrame), ändert das DOM nur beim Bildwechsel und steht
 * bei „Bewegung reduzieren“ still auf einem ausgewählten Schlüsselbild.
 */

import { adoptCss } from '../adopt-css.js';
import { GRID, SPECIES, STATES, STATE_LABELS, STILL_FRAME, colorVar, paletteCss } from './sprites.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'ng-companion-palette';

/** Fügt die Farbvariablen einmal pro Dokument ein. */
export function ensurePalette(doc = globalThis.document) {
  adoptCss(STYLE_ID, paletteCss(), doc);
}

/**
 * Zerlegt ein Bild in waagrechte Läufe gleicher Farbe (weniger Elemente).
 * @param {string[]} grid
 * @returns {Array<{x:number,y:number,w:number,key:string}>}
 */
export function gridToRuns(grid) {
  const runs = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === key) w++;
      if (key !== '.') runs.push({ x, y, w, key });
      x += w;
    }
  });
  return runs;
}

/**
 * Fasst gleichfarbige Flächen gierig zu Rechtecken zusammen. Weniger Elemente –
 * und vor allem keine Haarlinien zwischen Zeilen, wenn das Bild nicht in ganzen
 * Vielfachen skaliert wird.
 * @param {string[]} grid
 * @returns {Array<{x:number,y:number,w:number,h:number,key:string}>}
 */
export function gridToRects(grid) {
  const H = grid.length;
  const W = H ? grid[0].length : 0;
  const used = grid.map((row) => new Uint8Array(row.length));
  const rects = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = grid[y][x];
      if (key === '.' || used[y][x]) continue;
      let w = 1;
      while (x + w < W && grid[y][x + w] === key && !used[y][x + w]) w++;
      let h = 1;
      grow: while (y + h < H) {
        for (let i = 0; i < w; i++) if (grid[y + h][x + i] !== key || used[y + h][x + i]) break grow;
        h++;
      }
      for (let j = 0; j < h; j++) used[y + j].fill(1, x, x + w);
      rects.push({ x, y, w, h, key });
    }
  }
  return rects;
}

/** SVG-Markup (als Text) für ein einzelnes Bild – z. B. für statische Stellen. */
export function frameMarkup(speciesId, grid) {
  return gridToRects(grid)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="var(${colorVar(speciesId, r.key)})"/>`)
    .join('');
}

/** Komplettes <svg> als Text für Art/Zustand/Bild. */
export function spriteSvg(speciesId = 'elefant', state = 'idle', frame = STILL_FRAME[state] ?? 0, size = 128) {
  const sp = SPECIES[speciesId] || SPECIES.elefant;
  const frames = sp.frames[state] || sp.frames.idle;
  const f = frames[Math.min(frame, frames.length - 1)];
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${GRID} ${GRID}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${frameMarkup(sp.id, f.grid)}</svg>`;
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hängt eine animierte Figur als <svg> in ein Elternelement (HTML oder SVG).
 * In SVG-Eltern (z. B. die Gartenszene) gibt man x/y/width/height in deren
 * Koordinaten an.
 * @param {Element} parent
 * @param {{species?: string, state?: string, x?: number, y?: number, width?: number|string, height?: number|string, reducedMotion?: boolean}} opts
 */
export function mountSprite(parent, opts = {}) {
  const doc = parent.ownerDocument || globalThis.document;
  ensurePalette(doc);
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${GRID} ${GRID}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ng-sprite');
  for (const k of ['x', 'y', 'width', 'height']) if (opts[k] != null) svg.setAttribute(k, String(opts[k]));
  parent.appendChild(svg);

  let current = { species: 'elefant', state: 'idle', ...opts };
  let groups = [];
  let frames = [];
  let total = 0;
  let shown = -1;
  let start = 0;
  let raf = 0;
  let seen = false;
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => (current.reducedMotion ?? (mq ? mq.matches : false));

  function show(i) {
    if (i === shown) return;
    if (groups[shown]) groups[shown].setAttribute('display', 'none');
    groups[i].removeAttribute('display');
    shown = i;
  }

  function build() {
    const sp = SPECIES[current.species] || SPECIES.elefant;
    const state = STATES.includes(current.state) ? current.state : 'idle';
    frames = sp.frames[state];
    total = frames.reduce((s, f) => s + f.ms, 0);
    svg.textContent = '';
    groups = frames.map((f) => {
      const g = doc.createElementNS(SVG_NS, 'g');
      g.innerHTML = frameMarkup(sp.id, f.grid);
      g.setAttribute('display', 'none');
      svg.appendChild(g);
      return g;
    });
    shown = -1;
    start = 0;
    svg.dataset.species = sp.id;
    svg.dataset.state = state;
    loop();
  }

  function tick(now) {
    // Aus dem Dokument entfernt (Ansicht gewechselt): Schleife beenden statt weiterzulaufen.
    if (svg.isConnected) seen = true;
    else if (seen) {
      raf = 0;
      return;
    }
    if (!start) start = now;
    let t = (now - start) % total;
    let i = 0;
    while (t >= frames[i].ms) {
      t -= frames[i].ms;
      i++;
    }
    show(i);
    raf = requestAnimationFrame(tick);
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (reduced() || typeof requestAnimationFrame !== 'function') {
      show(Math.min(STILL_FRAME[svg.dataset.state] ?? 0, frames.length - 1));
      return;
    }
    show(0);
    raf = requestAnimationFrame(tick);
  }

  const onMotionChange = () => loop();
  mq?.addEventListener?.('change', onMotionChange);
  build();

  return {
    el: svg,
    update(next = {}) {
      const rebuild = (next.species && next.species !== current.species) || (next.state && next.state !== current.state);
      current = { ...current, ...next };
      if (rebuild) build();
      else loop();
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      mq?.removeEventListener?.('change', onMotionChange);
      svg.remove();
    },
  };
}

/**
 * Figur mit Namensschild in ein HTML-Element rendern.
 * @param {HTMLElement} el
 * @param {{species?: string, state?: string, name?: string, size?: number}} opts
 */
export function render(el, opts = {}) {
  let current = { species: 'elefant', state: 'idle', size: 128, ...opts };
  el.classList.add('ng-companion');
  el.setAttribute('role', 'img');
  const sprite = mountSprite(el, { species: current.species, state: current.state });
  sprite.el.style.width = `${current.size}px`;
  sprite.el.style.height = `${current.size}px`;
  sprite.el.style.display = 'block';
  sprite.el.style.imageRendering = 'pixelated';

  const label = () => {
    const sp = SPECIES[current.species] || SPECIES.elefant;
    const name = (current.name || sp.defaultName || sp.label).trim();
    el.setAttribute('aria-label', `${name}, ${sp.label}, ${STATE_LABELS[current.state] || STATE_LABELS.idle}`);
  };
  label();

  return {
    el,
    sprite: sprite.el,
    update(next = {}) {
      current = { ...current, ...next };
      sprite.update({ species: current.species, state: current.state });
      if (next.size) {
        sprite.el.style.width = `${current.size}px`;
        sprite.el.style.height = `${current.size}px`;
      }
      label();
    },
    destroy() {
      sprite.destroy();
      el.removeAttribute('aria-label');
      el.removeAttribute('role');
      el.classList.remove('ng-companion');
    },
  };
}

export { prefersReducedMotion };
