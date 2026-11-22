// Replays factory conformance fixtures against a host's a2uiMessage module.
// Usage: node --experimental-strip-types run.mjs <path/to/a2uiMessage.ts> [fixtureDir]
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict"; import { pathToFileURL } from "node:url";
const [modPath, dir = path.dirname(new URL(import.meta.url).pathname)] = process.argv.slice(2);
const m = await import(pathToFileURL(path.resolve(modPath)).href);
const lexer = JSON.parse(fs.readFileSync(path.join(dir, "lexer.json"), "utf8"));
const action = JSON.parse(fs.readFileSync(path.join(dir, "action.json"), "utf8"));
let pass = 0, fail = 0;
const check = (id, fn) => { try { fn(); pass++; } catch (e) { fail++; console.log(`FAIL ${id}: ${e.message.split("\n")[0]}`); } };
check("maxSourceLength", () => assert.equal(m.A2UI_MAX_SOURCE_LENGTH, lexer.maxSourceLength));
for (const c of lexer.cases) check(`lexer/${c.id}`, () => {
  const text = typeof c.text === "string" ? c.text : c.text.wrap[0] + c.text.repeat.repeat(c.text.count) + c.text.wrap[1];
  const got = m.splitA2uiSegments(text);
  if (c.expect) assert.deepEqual(got, c.expect);
  if (c.expectKinds) assert.deepEqual(got.map((s) => s.kind), c.expectKinds);
});
for (const c of action.messageCases) check(`action/${c.id}`, () => {
  const t = m.a2uiActionMessage(c.action, c.label);
  if (c.expect !== undefined) assert.equal(t, c.expect);
  if (c.expectFirstLine !== undefined) assert.equal(t.split("\n")[0], c.expectFirstLine);
  if (c.expectPrefix !== undefined) assert.ok(t.startsWith(c.expectPrefix), JSON.stringify(t));
  if (c.expectNoA2uiSegment) assert.ok(!m.splitA2uiSegments(t).some((s) => s.kind === "a2ui"), JSON.stringify(t));
});
for (const c of action.summaryCases) check(`summary/${c.id}`, () => {
  const t = m.a2uiActionSummary(c.context);
  if (c.expect !== undefined) assert.equal(t, c.expect);
  if (c.expectSuffix !== undefined) assert.ok(t.endsWith(c.expectSuffix), JSON.stringify(t));
});
console.log(`${path.basename(path.dirname(path.resolve(modPath)))}: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
