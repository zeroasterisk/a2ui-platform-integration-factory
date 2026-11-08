// Report lit bytes surviving in the output and the import chain that pulls lit in.
import {readFileSync} from 'fs';
const m = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const isLit = (p) => /\/lit\/|@lit\/|lit-element|lit-html|reactive-element/.test(p);
let bytesIn = 0;
for (const [p, v] of Object.entries(m.inputs)) if (isLit(p)) bytesIn += v.bytes;
let bytesOut = 0;
for (const o of Object.values(m.outputs)) for (const [p, v] of Object.entries(o.inputs)) if (isLit(p)) bytesOut += v.bytesInOutput;
const importers = new Set();
for (const [p, v] of Object.entries(m.inputs)) if (!isLit(p)) for (const i of v.imports || []) if (isLit(i.path)) importers.add(p.replace('node_modules/', ''));
console.log(JSON.stringify({lit_bytes_in_graph: bytesIn, lit_bytes_in_output: bytesOut, importers: [...importers]}));
