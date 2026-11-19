// Risk 2 probe: where does A2UI code land in a buzz-app Vite build?
// Usage: node chunk-weight.mjs <dist/assets dir>
// Prints gzip size of every chunk that carries an A2UI/antlr marker, and
// whether the entry chunk (main-*.js) carries any of them.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dir = process.argv[2];
const markers = {
  antlr4ng: /ATNDeserializer|PredictionContext/,
  expressFormat: /ExpressFormat|already exists/,
  a2uiCatalog: /a2ui-action|DateTimeInput/,
  lit: /lit-html|_\$litType\$/,
  zod: /ZodError|invalid_type/,
};
const rows = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".js")) continue;
  const src = readFileSync(join(dir, f));
  const text = src.toString();
  const hits = Object.entries(markers)
    .filter(([, re]) => re.test(text))
    .map(([k]) => k);
  if (!hits.length && !f.startsWith("main-")) continue;
  rows.push({
    file: f,
    rawKB: +(src.length / 1024).toFixed(1),
    gzipKB: +(gzipSync(src).length / 1024).toFixed(1),
    hits: hits.join(","),
  });
}
rows.sort((a, b) => b.gzipKB - a.gzipKB);
console.table(rows);
