# Recipe template: <Host> (fork zeroasterisk/<host> @ a2ui)

Copy this file to `recipes/<host>.md` and fill in every `<…>`. Delete a section only when the host truly has no counterpart, and say why in one line. Derived from the shipped t3code and Buzz integrations and the Paseo plan (Phase 6, `docs/reviews/argon-phase5b-close.md` §5). Principles (`docs/design/principles.md`) bind: the code lives in the fork, depends only on upstream `@a2ui/*` + the host SDK, and reads as if the host team wrote it.

Grounded in <host> `<base sha>`. Re-check the seams below on every rebase.

## 0. Fit check (answer before writing code)

| Question | Answer (cite file:line) |
|---|---|
| Extension point: plugin API (zero core diff) or core edit? | <e.g. Buzz `registerMessage`; t3code has none → small core edit in `ChatMarkdown`/`TimelineAssistantRows`> |
| Is that API marked unstable? | <e.g. Buzz `docs/plugin-architecture.md:20`> |
| UI stack and primitives dir | <React DOM + Base UI `components/ui` / RN + unistyles / …> |
| Does the matcher see the author, or only the text? | <it must see the author for the trust gate, §3> |
| Agent side: can the host add instructions and tools for agents? Instruction byte cap? | <Buzz `addInstructions` ≤4096 B + `addTool`; t3code: none, so `prompt/` can't run> |
| Multi-agent threads (surface ownership needed)? | <yes → `ownership` capability> |
| zod major in the host, and how `@a2ui/react`'s zod peer resolves | <run `pnpm why zod`> |
| Dependency policy (release-age gate, icon/dep allowlists) | <e.g. pnpm `minimumReleaseAgeExclude`, Buzz `check-icons.mjs`> |
| Does the bundler split a lazy chunk with no config change? | <measure, §9> |
| Host e2e harness and its gallery/replay fixture | <Buzz `message-gallery` + Playwright; t3code dev-replay ndjson; Paseo mock provider> |

No-go signals: the matcher can't see the author and there is no other seam; or the host is zod 4 only and can't pin `@a2ui/*`'s zod 3 (blocked on upstream `zod/v3`, NEEDS_ALAN #2).

## 1. Wire (fixed, copy verbatim)

The agent emits prose plus `<a2ui>…Express…</a2ui>` (upstream `SkillGenerator` contract; never a ```` ```a2ui ```` fence). Hosts without the integration show the raw text. Actions go back as a visible person message <how: thread reply that tags the surface author / user message / `agents.ref(id).send`>:
````
Applied triage.
```a2ui-action
{"surfaceId":"…","name":"apply","sourceComponentId":"…","context":{…}}
```
````
Split the **raw** message text before markdown rendering (sanitizers strip the tag otherwise).

## 2. Files (slice 1: chat-inline)

| # | File (host path) | What | Origin |
|---|---|---|---|
| 1 | `<…>/a2uiMessage.ts` + test | `splitA2uiSegments`, `a2uiActionMessage`, `a2uiActionSummary`, `A2UI_MAX_SOURCE_LENGTH` | copy t3code `packages/shared/src/a2uiMessage.ts` (identical in Buzz); reformat to host style; never import across repos |
| 2 | `<…>/a2uiThread.ts` + test | one `MessageProcessor` + `RendererState` per thread; replay in order inside `transaction()`; supersede → "Updated below"; single-flight action lock (`sending`→`sent`/`failed`, unlocked by a fresh agent update); per-surface author ownership if multi-agent | port Buzz `src/bundled/a2ui/a2uiThread.ts` |
| 3 | `<…>/A2uiBlock.tsx` | lazy chunk: `ExpressFormat([catalog]).createParser().parseResponse` → processor → `@a2ui/react` surface (or RN map). Open block → host loading look, never raw DSL. Parse/validation error or off-catalog → source in the host code frame | t3code `A2uiBlock.tsx` / Buzz `A2uiBlock.tsx` |
| 4 | `<…>/catalog.tsx` | the component map (§4) | new, host primitives only |
| 5 | registration | <plugin `register…` call ≤20 lines / the minimal core hook> | host precedent: <…> |
| 6 | trust predicate | §3 | |
| 7 | docs | <host doc voice: README "Getting started" / user doc section> | |
| 8 | fixture | <gallery group / replay transcript>: agent form, person-authored copy (stays text), streaming block, off-catalog reply, turn 2 `update=true` | |
| 9 | tests | unit (lexer, thread store, action round-trip with a fake sender) + one browser spec for what needs real layout | host test conventions |

Files 2–4 may be renamed or merged per host convention (Paseo plan: `shared/a2ui.ts` + `client/surface.tsx` + `client/catalog.tsx`).

**Conformance markers (required by `trust/` and `visual/`):** the block root carries `data-a2ui-surface` when drawn, `data-a2ui-error` when blocked/failed (with the source shown), `data-a2ui-pending` while streaming; a sent surface carries `data-a2ui-locked`, is `inert`, paints a dimmed box (opacity < 1) and keeps typed values. Other names are allowed via the checkers' `attrs` option. RN: lock with `pointerEvents="none"` + `accessibilityState={{disabled:true}}` + reduced opacity; `visual/` only runs on the RN-web build.

**Transformer-style plugin APIs** (Paseo `addTimelineTransformer` + `addTimelineRenderer`): split with `splitA2uiSegments` in the transformer (sync, deterministic, stable ids, returns `undefined` when there is no `<a2ui`) and compile Express in the renderer, memoised on `source`. Never compile in `transform`.

Budget: <target host lines outside the integration dir>. Measured: Buzz +22 host lines in 4 files (`package.json`, `pnpm-workspace.yaml`, `check-icons.mjs`, `bundled/index.ts`); t3code +157/−21 in 13 host files outside its a2ui files and tests (no plugin API).

## 3. Trust gate (by construction)

Render a block only when the message is agent-authored per the host's own predicate: <cite the predicate the host already uses for its agent badge>. A person-authored `<a2ui>` stays plain text. A tag in prose or a fenced example stays text: match on a real `a2ui` segment from `splitA2uiSegments`, not on `includes("<a2ui>")` alone. Never use a code-block hook that can't see the author.

## 4. Component map (basic catalog v1)

| A2UI | Host primitive | Notes |
|---|---|---|
| Text | <…> | break long tokens (DOM: `overflow-wrap:anywhere`; RN `Text` wraps by default, check unbroken tokens); markup stays inert; `variant` is caption/body only |
| Row / Column | flex + spacing tokens | Row wraps (`flexWrap:"wrap"` on RN) |
| Card | <…> | |
| Button | <…> | primary only for `variant:"primary"`, one per surface; caps at column width and wraps |
| TextField | <…> inside the host field | must stand off the card (fill or border), light and dark |
| CheckBox | <…> | |
| ChoicePicker | <radio group / chips ≤4 short options> | segmented groups wrap at 360 px + 150% text |
| Divider / Icon / Image | <…> | `Image` keeps https only (drop `javascript:` and protocol-relative) |
| anything else | visible "unsupported: X" / blocked note with source | never drop silently |

Tokens only, no raw colors (run the host's design checks if any). Never import `@a2ui/web_core/v1_0`, `/catalogs/basic/v1` render code or `/universal` on the client (they pull lit); use `/catalog` APIs and the root.

## 5. Agent side (two-tier prompt)

- **Pointer** (always on, ≤1 KB): when to use an interactive reply, the sentinel, no fence, basic catalog, `surface("<id>", update=true)` for follow-ups (not in upstream `EXPRESS_RULES`), the `a2ui-action` reply, and the two tool names.
- **`a2ui_rules`** (no args): `ExpressPromptGenerator.generate()` for the catalog (~22 KB; never in the always-on prompt).
- **`send_a2ui`**: replays the thread's earlier agent blocks (filtered by the §3 predicate) into a scratch thread store, validates the new block with the same store the renderer uses, posts only when valid, else returns the errors.
- No agent side in the host? Record it as a gap and a later slice (t3code: provider developer instructions).

## 6. Deps and host config

- Exact pins: `@a2ui/agent@<x>`, `@a2ui/web_core@<y>`, plus `@a2ui/react@<y>` on React DOM hosts only (RN maps components itself over `web_core` root/state/processing subpaths and subscribes to `RendererState` directly). Current forks: 0.2.1 / 0.16.1.
- zod 4 hosts whose bundler marks `zod` external (Paseo plugin compiler): an override can't help, because `web_core` runtime code reads zod 3 internals. Blocked on upstream `zod/v3` (NEEDS_ALAN #2); never bundle a second zod.
- Release-age gate: add the `@a2ui/*` versions to `minimumReleaseAgeExclude` (pnpm) or the host equivalent.
- zod: if `@a2ui/react` binds the host's zod 4, add an override to 3.25.x (Buzz: `"@a2ui/react>zod": 3.25.76`); drop it once upstream widens the peer.
- Dep/icon allowlists: classify `@a2ui/*` (Buzz `check-icons.mjs`).

## 7. Slice 2

- Same-surface update (`update=true`) across turns, with the earlier row collapsed.
- Canvas only if inline + update + the host's thread view don't cover the CUJ (Buzz skipped it; t3code "Open in panel" right-panel tab). <decide>

## 8. Conformance (factory `conformance/`, run as throwaway host tests)

| Group | Host adapter | Capabilities | Expected |
|---|---|---|---|
| `wire/` | `run.mjs <host>/a2uiMessage.ts` | — | 23/23 |
| `thread/` | `{ createStore, capabilities }` over the real thread store | `ownership` if multi-agent | 13/13, or 10/10 + 3 skips |
| `prompt/` | `{ pointer, toolNames, rules, send }` over the real tools | `ownership`, `authorKind` | 26/26, or "no agent side" gap |
| `trust/` | `{ block, message }` over the real block + real message dispatch | `authorKind` | 13/13, or 12/12 + 1 skip |
| `visual/` | `{ block, viewport, textScale, theme }` in a real browser at chat width | — | 12/12 |

Each group needs a mutant that fails it (e.g. fence tracking off, ownership off, source disclosure removed, `inert` off). Every real gap gets a fork fix plus a ported host test that fails on the unfixed code.

## 9. Evidence gate (slice close)

- CUJ GIF at 1100 light and 412 dark (`docs/evidence/<host>-slice<N>-cuj.md`): agent form draws natively, edit + primary sends the `a2ui-action` reply, turn 2 updates in place, 0 iframes, 0 page errors.
- Host checks green (typecheck, lint/format, design checks); diff stat inside budget.
- Lazy chunk measured vs the base build (`main` delta and A2UI chunk gzip; Buzz: +2.0 KB main, ~208–218 KB lazy).
- One Argon boundary review per slice, folded by hand (refute or fix each finding, pin refutations with a test).

## 10. Risks to measure first

1. zod resolution and the conformance harness inside the host's own build.
2. Lazy-chunk split and weight; Node-builtin warnings from `@a2ui/agent`.
3. First-match-wins or ordering in the host's renderer registry.
4. Unstable plugin API: pin the fork base, re-check seams on rebase.
5. <host-specific: RN Hermes bundle, instruction byte cap, reader caps (Buzz 64 thread views), …>

## 11. Test pitfalls seen so far

- Scaling text with an added `<style>` can lose to the host's `html` font-size rule and give a false green. Set the root `font-size` inline.
- RN hosts: add one Jest/RNTL native render smoke test (Playwright only covers RN-web), and warm Metro (`curl` the web bundle, 300 s budget) before Playwright.
- Run browser specs with `--workers 1` in the sandbox (2 workers crashed Chromium); use `--no-deps` when the host's other projects run first.
- Parallel load can make `findByText` time out; rerun before calling it a regression.

## 12. Conventions (<host>)

<formatter, lint, typecheck commands; test runner split (unit vs browser); file layout and naming; doc voice; copy that says what a person sees, not what A2UI is.>
