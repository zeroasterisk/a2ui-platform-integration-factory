// Replays thread.json against a host's thread store. No imports: the host's own test runner
// loads this file and the fixture (paths outside the host tree), so the host's aliases and
// @a2ui packages resolve as in production. Usage from a throwaway host test:
//   const { replayThread } = await import(REPLAY); const r = await replayThread(fixture, adapter);
// adapter = { createStore(): store, capabilities: string[] }
// store API (as in t3code + Buzz): sync(blocks), result(key), view(key, v).live, getVersion(),
//   surface(id) (with dispatchAction), sent(id), setSendMessage((text, authorId) => Promise).
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await Promise.resolve(); };

function texts(store, id) {
  const json = JSON.stringify(store.surface(id), (_k, v) => (v instanceof Map ? Object.fromEntries(v) : v));
  return [...(json ?? "").matchAll(/"text":"([^"]*)"/g)].map((m) => m[1]);
}

function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

async function runCase(c, adapter, event) {
  const store = adapter.createStore();
  const sends = [];
  const authors = [];
  let release = () => {};
  let mark;
  const fail = (msg) => { throw new Error(msg); };
  for (const step of c.steps) {
    if (step.sender) {
      store.setSendMessage((text, authorId) => {
        sends.push(text); authors.push(authorId);
        if (step.sender === "fail") return Promise.reject(new Error("send failed"));
        if (step.sender === "hold") return new Promise((r) => { release = r; });
        return Promise.resolve();
      });
    } else if (step.sync) {
      store.sync(step.sync);
    } else if (step.dispatch) {
      void store.surface(step.dispatch)?.dispatchAction({ event: { name: event } }, "button");
      await tick();
    } else if (step.release) {
      release(); await tick();
    } else if (step.mark) {
      mark = { version: store.getVersion(), surfaces: new Map() };
      for (const k of ["triage"]) mark.surfaces.set(k, store.surface(k));
    } else if (step.expect) {
      const e = step.expect;
      for (const [k, want] of Object.entries(e.results ?? {})) {
        const got = store.result(k);
        if (!got) fail(`${k}: no result`);
        for (const [f, v] of Object.entries(want)) if (!eq(got[f], v)) fail(`${k}.${f}: ${JSON.stringify(got[f])} != ${JSON.stringify(v)}`);
      }
      for (const [k, want] of Object.entries(e.live ?? {})) {
        const got = store.view(k, store.getVersion()).live;
        if (!eq(got, want)) fail(`live ${k}: ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
      }
      for (const [id, t] of Object.entries(e.texts ?? {})) {
        const got = texts(store, id);
        for (const s of t.contains ?? []) if (!got.includes(s)) fail(`texts ${id} lacks ${s}: ${JSON.stringify(got)}`);
        for (const s of t.excludes ?? []) if (got.includes(s)) fail(`texts ${id} has ${s}`);
      }
      for (const [id, want] of Object.entries(e.sent ?? {})) {
        const got = store.sent(id) ?? null;
        if (got !== want) fail(`sent ${id}: ${got} != ${want}`);
      }
      if (e.sends !== undefined && sends.length !== e.sends) fail(`sends: ${sends.length} != ${e.sends}`);
      for (const s of e.sendContains ?? []) if (!sends.some((t) => t.includes(s))) fail(`no send contains ${s}`);
      if (e.sendAuthors && !eq(authors, e.sendAuthors)) fail(`authors: ${JSON.stringify(authors)} != ${JSON.stringify(e.sendAuthors)}`);
      if (e.versionSinceMark !== undefined && store.getVersion() - mark.version !== e.versionSinceMark) fail(`version moved by ${store.getVersion() - mark.version}`);
      for (const [id, same] of Object.entries(e.sameSurfaceAsMark ?? {})) {
        if ((store.surface(id) === mark.surfaces.get(id)) !== same) fail(`surface ${id} identity same=${!same}`);
      }
    }
  }
}

export async function replayThread(fixture, adapter) {
  const caps = new Set(adapter.capabilities ?? []);
  const out = { pass: [], fail: [], skip: [] };
  for (const c of fixture.cases) {
    if ((c.requires ?? []).some((r) => !caps.has(r))) { out.skip.push(c.id); continue; }
    try { await runCase(c, adapter, fixture.event); out.pass.push(c.id); }
    catch (e) { out.fail.push(`${c.id}: ${e.message}`); }
  }
  return out;
}
