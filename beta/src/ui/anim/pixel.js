/**
 * Nachtgarten – Übungsanimationen: Pixel-Look („Sprite“-Darstellung).
 *
 * Idee: Dieselbe Vektor-Szene (Figur + Geräte) wird für wenige Schlüsselbilder
 * (4–8 pro Bewegung) auf ein kleines Raster (z. B. 64×64) gerastert. Danach wird
 * jedes Pixel hart auf die begrenzte Abendruhe-Palette gerundet (keine Kanten-
 * glättung, keine Zwischentöne) und mit image-rendering: pixelated vergrößert.
 * Ergebnis: ein kleines, ruhiges Pixel-Mannequin – und weil die Bilder vorab
 * berechnet werden, kostet das Abspielen fast nichts.
 */

/** Namen der Farb-Variablen (ohne „--anim-“), die die Palette bilden. */
export const PALETTE_VARS = ["figure", "figure-far", "head", "face", "work", "sprout", "weight", "weight-back",
  "env", "env-line", "cable", "band", "floor", "mat", "hole", "move", "move-far", "ghost", "trace"];
/** Gewichte für die Mehrheitswahl: feine Details setzen sich eher durch. */
export const PALETTE_WEIGHTS = { face: 3.2, sprout: 2.2, work: 1.4, cable: 2.4, band: 1.8, weight: 1.4, "env-line": 1.3, trace: 2.6, ghost: 0.8 };

/** Liest die aktuellen Farbwerte (Theme-abhängig) am Element. */
export function resolveVars(elm) {
  const cs = getComputedStyle(elm);
  const out = {};
  for (const n of PALETTE_VARS) out[n] = cs.getPropertyValue("--anim-" + n).trim() || "#888";
  return out;
}

/** "#rgb"/"#rrggbb"/"rgb(…)" → [r,g,b] */
export function parseColor(c) {
  c = c.trim();
  if (c[0] === "#") {
    if (c.length === 4) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
    const n = parseInt(c.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
}

/** Ersetzt var(--anim-x) in CSS-Text durch feste Werte (für die SVG→Bild-Umwandlung). */
export function bakeCss(css, vars) {
  return css.replace(/var\(--anim-([a-z-]+)\)/g, (_, n) => vars[n] || "#888");
}

/** Zusätzliche Regeln, die feine Linien im Pixelraster sichtbar halten. */
export const PIXEL_CSS = `
.nga .nga-cable{stroke-width:1.7}
.nga .nga-env,.nga .nga-tower{stroke:none}
.nga .nga-plate-ring{display:none}
.nga .nga-trace{stroke-width:1.9;stroke-dasharray:2.2 2.4;stroke-linecap:butt;opacity:1}
.nga .nga-trace-head{opacity:1}
.nga .nga-floor{stroke-width:1.7}
.nga .nga-dbbar{stroke-width:2}
.nga .nga-band{stroke-width:2}
.nga .nga-handle{stroke-width:2.2}
.nga .nga-cheek{opacity:.7}
`;

/**
 * Rastert einen SVG-Text auf grid×grid Pixel und rundet auf die Palette.
 * Es wird mit SS-facher Auflösung gerastert, jedes Teilpixel hart auf die Palette
 * gerundet und dann je Block per (gewichteter) Mehrheitswahl zusammengefasst –
 * so entstehen saubere Pixelkanten ohne „fremde“ Zwischenfarben.
 * weights: optionales Gewicht je Palettenfarbe (kleine Details wie Augen gewinnen eher).
 * @returns {Promise<ImageData>}
 */
export async function rasterize(svgText, grid, palette, weights = null, SS = 4) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  await (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; }));
  const big = grid * SS;
  const cv = document.createElement("canvas");
  cv.width = cv.height = big;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0, big, big);
  const src = cx.getImageData(0, 0, big, big).data;
  // 1) Teilpixel → Palettenindex (−1 = leer)
  const idx = new Int16Array(big * big);
  for (let i = 0, j = 0; j < idx.length; i += 4, j++) idx[j] = src[i + 3] < 128 ? -1 : nearest(src[i], src[i + 1], src[i + 2], palette);
  // 2) Blöcke zusammenfassen
  const out = new ImageData(grid, grid);
  const d = out.data, cnt = new Float32Array(palette.length);
  const need = SS * SS * 0.4;
  for (let by = 0; by < grid; by++) for (let bx = 0; bx < grid; bx++) {
    cnt.fill(0);
    let opaque = 0;
    for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) {
      const k = idx[(by * SS + y) * big + bx * SS + x];
      if (k >= 0) { opaque++; cnt[k] += weights ? weights[k] : 1; }
    }
    const o = (by * grid + bx) * 4;
    if (opaque < need) { d[o + 3] = 0; continue; }
    let best = 0;
    for (let k = 1; k < cnt.length; k++) if (cnt[k] > cnt[best]) best = k;
    const p = palette[best];
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
  }
  return out;
}

function nearest(r, g, b, palette) {
  let best = 0, bd = 1e9;
  for (let k = 0; k < palette.length; k++) {
    const p = palette[k];
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (dd < bd) { bd = dd; best = k; }
  }
  return best;
}

/** Ereignis bei Theme-Wechsel (System oder data-theme/class am <html>). Gibt Abmeldefunktion zurück. */
export function onThemeChange(cb) {
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  mq && mq.addEventListener && mq.addEventListener("change", cb);
  return () => { mo.disconnect(); mq && mq.removeEventListener && mq.removeEventListener("change", cb); };
}
