// Checks a host's agent prompt against prompt.json. No imports: the host's own test runner loads
// this file and the fixture, and passes an adapter built on the host's real tools.
// adapter = {
//   pointer: string,                     // always-on instructions text
//   toolNames: { rules, send },          // the host's tool names
//   rules(): string | Promise<string>,   // what the rules tool returns
//   send({ text, earlier, agentId }): Promise<{ posted: boolean, error?: string }>,
//     // earlier = thread messages [{id, authorId, authorKind: "agent"|"person", text}], oldest first;
//     // posted = the host's send tool really posted (not just returned ok)
//   capabilities: string[]               // "ownership" (multi-agent), "authorKind" (person text in thread)
// }
export async function checkPrompt(fx, a) {
  const pass = [], fail = [], skip = [];
  const check = async (id, fn) => { try { await fn(); pass.push(id); } catch (e) { fail.push(`${id}: ${e.message}`); } };
  const bytes = (s) => new TextEncoder().encode(s).length;
  const p = fx.pointer;
  await check("pointer/size", () => { if (bytes(a.pointer) > p.maxBytes) throw new Error(`${bytes(a.pointer)} B > ${p.maxBytes}`); });
  for (const alts of p.mustMention) await check(`pointer/mentions:${alts[0]}`, () => {
    if (!alts.some((s) => a.pointer.toLowerCase().includes(s.toLowerCase()))) throw new Error(`none of ${JSON.stringify(alts)}`);
  });
  for (const s of p.mustNotContain) await check(`pointer/not:${s}`, () => { if (a.pointer.includes(s)) throw new Error("present"); });
  for (const k of p.mustNameTools) await check(`pointer/names-tool:${k}`, () => {
    const name = a.toolNames?.[k]; if (!name || !a.pointer.includes(name)) throw new Error(`tool ${name} not named`);
  });
  const rules = String(await a.rules());
  await check("rules/size", () => { if (bytes(rules) < fx.rules.minBytes) throw new Error(`${bytes(rules)} B < ${fx.rules.minBytes}`); });
  for (const s of fx.rules.mustContain) await check(`rules/contains:${s}`, () => { if (!rules.includes(s)) throw new Error("missing"); });
  for (const c of fx.send) {
    const missing = (c.requires ?? []).filter((r) => !(a.capabilities ?? []).includes(r));
    if (missing.length) { skip.push(`send/${c.id}`); continue; }
    await check(`send/${c.id}`, async () => {
      const r = await a.send({ text: c.text, earlier: c.earlier, agentId: fx.agentId });
      if (r.posted !== c.expect.posted) throw new Error(`posted=${r.posted} (${r.error ?? ""})`);
      if (c.expect.errorMatches && !new RegExp(c.expect.errorMatches).test(r.error ?? "")) throw new Error(`error ${JSON.stringify(r.error)}`);
    });
  }
  return { pass, fail, skip };
}
