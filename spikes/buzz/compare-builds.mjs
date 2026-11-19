// Compare entry-chunk and total JS weight of two buzz-app Vite builds.
// Usage: node compare-builds.mjs <base/assets> <a2ui/assets>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

function measure(dir) {
  let raw = 0, gz = 0, files = 0, main = null;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const b = readFileSync(join(dir, f));
    const g = gzipSync(b).length;
    raw += b.length; gz += g; files++;
    if (f.startsWith("main-")) main = { raw: b.length, gz: g };
  }
  return { files, raw, gz, main };
}
const [baseDir, newDir] = process.argv.slice(2);
const a = measure(baseDir), b = measure(newDir);
const kb = (n) => (n / 1024).toFixed(1);
console.log(`base: ${a.files} js, main ${kb(a.main.raw)} KB raw / ${kb(a.main.gz)} KB gz, all ${kb(a.gz)} KB gz`);
console.log(`a2ui: ${b.files} js, main ${kb(b.main.raw)} KB raw / ${kb(b.main.gz)} KB gz, all ${kb(b.gz)} KB gz`);
console.log(`delta main: +${kb(b.main.raw - a.main.raw)} KB raw / +${kb(b.main.gz - a.main.gz)} KB gz; delta all: +${kb(b.gz - a.gz)} KB gz`);
