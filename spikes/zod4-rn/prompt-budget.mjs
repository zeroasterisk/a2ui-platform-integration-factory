// Measures A2UI Express prompt sizes against buzz-app's ctx.agents.addInstructions cap
// (4096 UTF-8 bytes, docs/plugin-architecture.md:1020-1029 @ buzz-app ff8415d).
// Run: node prompt-budget.mjs   (uses @a2ui/agent 0.1.0 + @a2ui/web_core 0.15.0 from ./node_modules)
import { ExpressPromptGenerator } from '@a2ui/agent';
import { basicCatalog } from '@a2ui/web_core/v1_0';
const { EXPRESS_RULES } = await import(
  new URL('./node_modules/@a2ui/agent/src/inference-formats/express/prompt-generator.js', import.meta.url)
);
const b = (s) => Buffer.byteLength(s, 'utf8');
const CAP = 4096;
const fit = (v) => (v <= CAP ? 'fits' : `over by ${v - CAP}`);
const row = (k, v) => console.log(k.padEnd(28), String(v).padStart(6), fit(v));

const g = new ExpressPromptGenerator([basicCatalog]);
const base = g.generateBaseRules();
const helper = g.getHelper(basicCatalog);
const comp = g.generateComponentSignatures(helper);
const fn = g.generateFunctionSignatures(helper);
const BULLET = '\u2022 ';
const compHead = comp.split('\n').filter((l) => l.startsWith(BULLET)).join('\n');
const fnHead = fn.split('\n').filter((l) => l.startsWith(BULLET)).join('\n');

row('EXPRESS_RULES', b(EXPRESS_RULES));
row('generateBaseRules()', b(base));
row('generate() full prompt', b(g.generate()));
row('renderCatalogInstructions', b(g.renderCatalogInstructions(basicCatalog)));
row('componentSignatures', b(comp));
row('functionSignatures', b(fn));
row('component headers only', b(compHead));
row('function headers only', b(fnHead));
row('base + component headers', b(base) + 1 + b(compHead));

// Chat subset that the t3code catalog maps natively.
const SUBSET = ['Text', 'Row', 'Column', 'Card', 'Button', 'TextField', 'CheckBox', 'ChoicePicker', 'Divider'];
const subHead = compHead.split('\n').filter((l) => SUBSET.some((n) => l.startsWith(`${BULLET}${n}(`))).join('\n');
row('chat-subset headers', b(subHead));
row('base + chat-subset headers', b(base) + 1 + b(subHead));

// Per-component cost (header + its "  - arg:" detail lines).
const per = {};
let cur = null;
for (const l of comp.split('\n')) {
  const m = l.match(/^\u2022 ([A-Z][A-Za-z]+)\(/);
  if (m) cur = m[1];
  if (cur) per[cur] = (per[cur] || 0) + b(l) + 1;
}
console.log('per-component:', Object.entries(per).sort((a, z) => z[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' '));
