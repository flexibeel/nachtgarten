#!/usr/bin/env node
/**
 * Baut aus docs/anim-preview.html eine eigenständige Datei ohne externe Module:
 *   node src/ui/anim/build-standalone.mjs
 *   → docs/anim-preview.standalone.html
 *
 * Mini-Bündler: Jedes importierte ES-Modul wird in eine eigene Funktion gekapselt
 * (eigener Gültigkeitsbereich), Importe werden zu Destrukturierungen, Exporte zum
 * Rückgabeobjekt. Reicht für die einfachen, benannten Im-/Exporte dieser Module.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const pagePath = resolve(root, "docs/anim-preview.html");
const outPath = resolve(root, "docs/anim-preview.standalone.html");

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/gm;
const mods = new Map(); // abs path → {id, code}
const order = [];

function destructure(names) {
  return names.split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => s.replace(/\s+as\s+/, ": ")).join(", ");
}

function load(abs) {
  if (mods.has(abs)) return mods.get(abs);
  const entry = { id: "__m" + mods.size, code: "" };
  mods.set(abs, entry);
  let src = readFileSync(abs, "utf8");
  const deps = [];
  src = src.replace(IMPORT_RE, (_, names, spec) => {
    const dep = load(resolve(dirname(abs), spec));
    deps.push(dep);
    return `const { ${destructure(names)} } = ${dep.id};`;
  });
  const exported = [];
  src = src.replace(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => {
    exported.push(name);
    return `${kw} ${name}`;
  });
  src = src.replace(/^export\s*\{([^}]*)\};?/gm, (_, names) => {
    exported.push(...names.split(",").map((s) => s.trim()).filter(Boolean));
    return "";
  });
  entry.code = `/* ${relative(root, abs)} */\nconst ${entry.id} = (() => {\n${src}\nreturn { ${exported.join(", ")} };\n})();\n`;
  order.push(entry);
  return entry;
}

let html = readFileSync(pagePath, "utf8");
html = html.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, code) => {
  const body = code.replace(IMPORT_RE, (__, names, spec) => {
    const dep = load(resolve(dirname(pagePath), spec));
    return `const { ${destructure(names)} } = ${dep.id};`;
  });
  return `<script type="module">\n${order.map((m) => m.code).join("\n")}\n/* Seite */\n${body}</script>`;
});
html = html.replace("<head>", "<head>\n<!-- Automatisch erzeugt aus docs/anim-preview.html (src/ui/anim/build-standalone.mjs) – nicht von Hand bearbeiten. -->");
writeFileSync(outPath, html);
console.log(`geschrieben: ${relative(root, outPath)} (${(html.length / 1024).toFixed(1)} KB, ${order.length} Module)`);
