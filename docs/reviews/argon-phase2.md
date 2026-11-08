### 1. Verdict
**No.** Ready for a targeted **Phase 2 dependency/Hermes spike**, not Phase 3/4 build—the unverified Zod v3/v4 conflict in Paseo and undecided cross-message surface state semantics will force a rewrite if discovered mid-build.

---

### 2. Findings

#### Critical
* **`recipes/paseo.md` — Unresolved Zod v3 vs v4 blocker**
  * **Issue:** Paseo forces `zod` external (`^4.4.3`), while `@a2ui/web_core@0.15.0` has 162 `zod` v3 imports and `zod-to-json-schema`. If `MessageProcessor` or catalog validation hits v3 internals at runtime, the plugin crashes immediately.
  * **Fix:** Gate Phase 3 on the dependency spike mentioned in your risk section. Alias `zod` to v4 in a minimal node/esbuild harness running all conformance demos through `ExpressFormat` + `MessageProcessor`. If it fails, patch `@a2ui/web_core` upstream to import `zod/v3` before touching Paseo UI.
* **`docs/design/factory.md` & `recipes/*.md` — Surface update semantics (`surfaceId`) contradict isolated row rendering**
  * **Issue:** `factory.md` states *"the same `surfaceId` in a later message... replaces the surface"*. Yet Paseo Slice 1 (`recipes/paseo.md`) and `recipes/t3code.md` instantiate `MessageProcessor` per timeline segment/row. A new message creates a second isolated component instance rather than updating the earlier surface in place (or hiding the stale one).
  * **Fix:** Specify whether a `MessageProcessor` store is scoped per-thread (so message $N$ mutates surface $S$ rendered in message $M$, or deduplicates older rows with the same `surfaceId`) or strictly per-message (only message edits replace). Document the exact UX in `factory.md`.

#### Major
* **`recipes/paseo.md` & `recipes/t3code.md` — Principle 5 violation (`splitA2uiSegments` & `a2uiActionMessage` duplication)**
  * **Issue:** Both recipes implement identical pure functions (`splitA2uiSegments`, `a2uiActionMessage`). `principles.md` #2 & #5 state that identical non-trivial code needed by 2+ integrations must go upstream into `@a2ui/*` or trigger an escalation decision, not silently duplicate.
  * **Fix:** Upstream the streaming `<a2ui>` tag splitter and action block serializer into `@a2ui/agent` (or `@a2ui/web_core`), or explicitly record a Principle 5 waiver in `factory.md` because the functions are <40 LOC.
* **`recipes/paseo.md` & `recipes/t3code.md` — Streaming parser boundary & false-positive splits**
  * **Issue:** Splitting raw text on `<a2ui>` before markdown parsing means `<a2ui>` inside an agent's fenced code block (e.g., explaining A2UI syntax) will be hijacked as live UI. Additionally, `t3code.md` says an unclosed tag *"stays markdown/pending"*, whereas `paseo.md` emits `{kind:"a2ui", closed:false}` to render a `Loading` spinner.
  * **Fix:** Make `splitA2uiSegments` ignore tags inside markdown code fences, and align both recipes on emitting an unclosed `a2ui` segment so both hosts show a loading skeleton instead of flashing raw `<a2ui>...` DSL text during streaming.
* **`recipes/paseo.md` & `recipes/t3code.md` — Unbounded agent-authored UI & Markdown XSS/injection**
  * **Issue:** Agent-authored Express DSL can nest arbitrarily deep `Row`/`Column`/`Card` trees, pass `javascript:`/`data:` URIs to actions or links, or inject nested `<a2ui>` tags inside Markdown components.
  * **Fix:** Enforce a max component depth/count in the catalog renderer, sanitize URLs in button/link actions, and disable recursive A2UI splitting inside nested `Markdown` primitives.
* **`recipes/paseo.md` — Hermes bundle size & CJS/ESM lit leakage**
  * **Issue:** `@a2ui/agent` pulls `antlr4ng` (~1.45 MB raw) into Paseo's single-file CJS client plugin bundle, and `recipes/t3code.md` warns that certain `@a2ui/web_core` subpaths leak `lit` (DOM-dependent, fatal in RN Hermes). `recipes/paseo.md` does not enforce a bundle check against `lit` or DOM globals.
  * **Fix:** Add an automated esbuild metafile check in the Paseo recipe asserting zero `lit`/`window`/`document` imports and measuring Hermes bytecode parse time before building `client/catalog.tsx`.

#### Minor
* **`recipes/paseo.md` — E2E only tests RN-Web, not RN Hermes**
  * **Issue:** Playwright against the Docker web UI runs in Chromium (V8), hiding RN layout bugs, `unistyles` native differences, and Hermes runtime crashes.
  * **Fix:** Add at least one Jest/RNTL test or Expo native smoke check for the Paseo renderer alongside Playwright.
* **`docs/design/factory.md` — Action round-trip lacks a formal schema**
  * **Issue:** The ` ```a2ui-action ` user message format isn't taught in the upstream `SkillGenerator` prompt, so agents may not know how to parse `sourceComponentId` or `context`.
  * **Fix:** Include the `a2ui-action` response schema in the skill snippet or upstream `SkillGenerator`.

---

### 3. Open Decisions: Recommendations

1. **Client compile vs. server compile per host:** **Recommend Client compile everywhere initially, gated by a 50ms Hermes parse budget.** It keeps Paseo Slice 1 server-free (`index.client.tsx` only) and avoids the 64 KiB `timeline.append` cap and daemon-restart data loss noted in Slice 2. Fall back to a stateless plugin RPC compiler only if Hermes fails the spike.
2. **First host to build (t3code vs. Paseo):** **Recommend t3code first.** It uses standard web Vite bundling (dodging Paseo's external Zod v4 CJS bundler constraint and RN Hermes limits) and has a deterministic `dev-replay` harness. Proving the Express → `MessageProcessor` → action loop in t3code first isolates A2UI v1.0 wire issues from Paseo plugin/RN environment issues.
3. **Older surfaces after thread moves on:** **Recommend Live with a busy/disabled guard while the agent is streaming, plus auto-collapse/disable if superseded by a newer message with the same `surfaceId`.** Leaving superseded surfaces active lets users submit stale `context` payloads from old turns.

---

### 4. Strengths
* **Sharp architectural boundary:** Treating the factory as a conformance + recipe workspace rather than a shared wrapper library completely avoids cross-repo dependency hell and makes upstream PRs genuinely reviewable.
* **Host-grounded recipes:** Both recipes cite exact file paths, line numbers, bundler quirks (e.g., lit-free subpaths, Paseo's 64 KiB cap, Zod externals), and existing host test harnesses (`seedMockAgentWorkspace`, `dev-replay`).
