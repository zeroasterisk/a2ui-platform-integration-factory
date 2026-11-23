// Checks a host's renderer against trust.json. No imports: the host's own test runner (jsdom or
// browser) loads this file and the fixture, and passes an adapter built on the host's real
// components, so @a2ui packages and host aliases resolve as in production.
// adapter = {
//   block(source): Promise<Element>          // one closed block through the host's real block
//                                             // component (thread store + catalog); resolves once settled
//   message({ author, text }): Promise<Element>  // a whole message through the host's real dispatch
//                                             // (matcher -> interactive renderer, else plain text)
//   capabilities: string[]                    // "authorKind" (a person can post text in the thread)
//   attrs?: { surface, error, pending }       // state markers; default data-a2ui-surface/-error/-pending
// }
export async function checkTrust(fx, a) {
  const pass = [], fail = [], skip = [];
  const at = { surface: "[data-a2ui-surface]", error: "[data-a2ui-error]", pending: "[data-a2ui-pending]", ...(a.attrs ?? {}) };
  const check = async (id, fn) => { try { await fn(); pass.push(id); } catch (e) { fail.push(`${id}: ${e.message}`); } };
  const text = (el) => el.textContent ?? "";
  const state = (el) => (el.querySelector(at.error) ? "error" : el.querySelector(at.surface) ? "surface" : el.querySelector(at.pending) ? "pending" : "none");
  const common = (el, ex) => {
    for (const sel of fx.forbidden) if (el.querySelector(sel)) throw new Error(`forbidden ${sel}`);
    for (const s of ex.textContains ?? []) if (!text(el).includes(s)) throw new Error(`text lacks ${JSON.stringify(s)}`);
    for (const s of ex.textExcludes ?? []) if (text(el).includes(s)) throw new Error(`text shows ${JSON.stringify(s)}`);
    for (const sel of ex.present ?? []) if (!el.querySelector(sel)) throw new Error(`missing ${sel}`);
    for (const sel of ex.absent ?? []) if (el.querySelector(sel)) throw new Error(`unexpected ${sel}`);
    for (const [attr, re] of Object.entries(ex.attrNever ?? {}))
      for (const node of el.querySelectorAll(`[${attr}]`))
        if (new RegExp(re, "i").test(node.getAttribute(attr) ?? "")) throw new Error(`${attr}=${node.getAttribute(attr)}`);
  };
  for (const c of fx.render) await check(`render/${c.id}`, async () => {
    const el = await a.block(c.source);
    const s = state(el);
    if (s !== c.expect.state) throw new Error(`state ${s}, want ${c.expect.state}`);
    common(el, c.expect);
  });
  for (const c of fx.messages) {
    const missing = (c.requires ?? []).filter((r) => !(a.capabilities ?? []).includes(r));
    if (missing.length) { skip.push(`message/${c.id}`); continue; }
    await check(`message/${c.id}`, async () => {
      const el = await a.message({ author: c.author, text: c.text });
      const interactive = !!el.querySelector(at.surface);
      if (interactive !== c.expect.interactive) throw new Error(`interactive=${interactive}`);
      if (c.expect.pending && !el.querySelector(at.pending)) throw new Error("no pending state");
      common(el, c.expect);
    });
  }
  return { pass, fail, skip };
}
