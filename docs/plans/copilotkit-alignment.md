# Phase 5c: CopilotKit alignment (factory-side draft)

Status: draft for Alan. No contact with CopilotKit has been made. The Phase 5c gate ("agreed plan with CopilotKit") needs a person-to-person step, which is NEEDS_ALAN #3.

Source: CopilotKit `main` @ `c17ce2d49` (2026-11-28, monorepo v1.90.2). The wiki snapshot is `3a956add4` (2026-11-02), 998 commits older. Re-checked below. Where this file disagrees with `wiki/copilotkit/`, this file is newer.

## 1. What changed since the wiki snapshot

| Area | Wiki (`3a956add4`) | Now (`c17ce2d49`) | Evidence |
|---|---|---|---|
| Stack A `@copilotkit/a2ui-renderer` | web_core 0.10.4, v0.9 ops only | web_core **0.15.0** pinned; renders native **1.0** surfaces alongside v0.9; explicit 1.0 custom catalogs | `656efa78f`, `c344c3106`; `packages/a2ui-renderer/package.json:58` |
| Stack A replay | n/a | 1.0 snapshot replay keeps the user's edits | `812f343c8`, `8075d73f7` |
| Stack A 1.0 prompt | v0.9 guidelines | separate 1.0 JSON guidelines (`@path`, `@call`) | `packages/react-core/src/v2/a2ui/generation-guidelines.ts` |
| Stack B generative UI | experimental, own engine | still its own engine (`A2UI_VERSION = "1.0"`, own validator); added a DOM-free entry + pluggable surface host | `packages/shared/src/generative-ui/types.ts:2`; `b9b7a8a2f` |
| AG-UI middleware | 0.0.x | `@ag-ui/a2ui-middleware` 0.0.16 "A2UI 1.0 Direct JSON" | `f85722213` |
| Express | none | **examples only**, nothing in `packages/` (grep `a2ui-express` hits only `examples/showcases/a2ui`) | see §2 |

## 2. Express today

- `examples/showcases/a2ui` ("A2UI Playground", ADK + Gemini, `729ded32c`): the model writes ```` ```a2ui-express target=<id> ```` fences. The **Python** server (`a2ui-agent-sdk` 0.9.0, `a2ui-core` 0.4.0) recompiles each growing prefix and streams JSON ```` ```a2ui ```` fences to the client. The client never sees Express.
- Its prompt teaches `surface("existing-id", update=true)` itself (`agent/src/research_desk/transport.py:56`). That is the same gap as our NEEDS_ALAN #2 ask 3: upstream `EXPRESS_RULES` doesn't teach it, so every host adds it.
- Its README names 2 SDK gaps it works around: no incremental Express parse (it recompiles and diffs snapshots), and structured-prop schemas missing from generated signatures (it appends them).
- `examples/showcases/a2ui-playground` uses TS `@a2ui/agent` **0.1.0** for skill generation and an Express decompile view. Our forks are on 0.2.1.

## 3. Wire and contract differences vs the factory

| | Factory (t3code, Buzz, Paseo plan) | CopilotKit |
|---|---|---|
| Block delimiter | `<a2ui>`…`</a2ui>` sentinel, Express source inside | ```` ```a2ui ```` fence (JSON ops, one per line) or ```` ```a2ui-express ```` (examples) |
| Placement | inline; panel via host UI ("Open in panel") | `target=<id>` info token → named page target, else chat |
| Compile | in the client, from the thread (`MessageProcessor` replay) | Stack A: web_core in the client; Express: server-side Python |
| Validation tier | `a2ui_check` / `send_a2ui` tool before posting | runtime middleware validates each op; `render_ui` tool or fences |
| Prompt | two tier: ≤1 KB pointer + `a2ui_rules` tool | full guide as a context entry each run |
| Double send | one send per surface before lock | `agent_busy` drop while the agent runs (`use-generative-ui-root.ts:240-252`) |
| Action → chat | `a2uiActionMessage` visible user message | visible user message (same idea) |

## 4. Conformance group fit (no CopilotKit code run yet)

| Group | Applies? | Adapter needed |
|---|---|---|
| `wire/` | concept yes, fixtures no | their lexer is `splitA2UIMarkdown` (`packages/core/src/a2ui-markdown/fence-parser.ts:96`). A fence-flavoured variant of `lexer.json` (same cases: streaming, fenced other-language, prose mention, spoof in action payload) would need a delimiter parameter in `gen` |
| `thread/` | yes for Stack A replay | `createStore` over `A2UIProvider`'s processor; ownership: `agentIds` may map to our `ownership` capability (unverified) |
| `prompt/` | partly | pointer-size checks don't fit (no pointer tier); the `send` validation table maps to their op validator |
| `trust/` | yes | `unknown component` render (`SurfaceView.tsx:336`), unsafe URL scheme block (`shared/src/generative-ui/standard/url.ts:40`); source disclosure unknown |
| `visual/` | yes | Playwright in their showcase; DOM markers differ: they set `data-a2ui-theme`, `-accessibility`, `-markdown-surface`; ours need `data-a2ui-surface`, `-locked`, `-pending`, `-error` |

## 5. Proposed asks (draft, for Alan to raise or drop)

1. **Express in a package, not only an example.** An `a2ui-express` fence in the markdown transport, compiled by `@a2ui/agent` (TS) so non-Python agents get it. Depends on upstream: browser-safe `@a2ui/agent` entry and incremental parse.
2. **Bump `@a2ui/web_core` 0.15.0 → 0.16.x** in `a2ui-renderer`, `core`, `react-core`, matching both factory forks. Their zod is `^3.25` (unaffected today); `react-core` peers `zod >=3.25`, so a zod 4 app hits the same `_def.typeName` break as Paseo (NEEDS_ALAN #2).
3. **Share conformance data.** Offer `conformance/` fixtures as data (no import), plus a delimiter-parametrised `wire/` set, so CopilotKit, t3code and Buzz report the same counts.
4. **Co-sign the upstream asks** in NEEDS_ALAN #2 (zod/v3, lit-free basic catalog, `update=true` in `EXPRESS_RULES`): their showcase already works around the third.

## 6. Factory work possible without contact

- 5c.1: delimiter-parametrised `wire/` cases (`gen` emits a fence flavour). Bounded, data only.
- 5c.2: throwaway local run of `trust/` + `thread/` against Stack A in a detached CopilotKit worktree, to replace the "unverified" cells in §4 with numbers. Nothing pushed anywhere.

Both are optional. Neither closes the gate.
