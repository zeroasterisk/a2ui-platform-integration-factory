### 1. Verdict
Close after must-fixes.

### 2. Findings by severity

#### Major
* **`recipes/TEMPLATE.md` §5 & §8 vs. `recipes/paseo.md` Slice 2 (Agent-side contract drift)**:
  * **Problem**: `TEMPLATE.md` §5 and `conformance/README.md` (`prompt/`) hardcode the two-tier agent prompt architecture (`pointer` ≤1 KB + two tools: `a2ui_rules` and `send_a2ui` that post normal `<a2ui>` chat messages). However, `recipes/paseo.md` (Slice 2) specifies an older single-tool pattern (`a2ui_render` appending a custom plugin item via `timeline.append` instead of posting message text, plus appending the full generated skill text to labelled agents). A Paseo implementation following `paseo.md` will fail the `conformance/prompt/` 26-check gate.
  * **Concrete fix**: Update `recipes/paseo.md` Slice 2 to use the two-tier pattern (`pointer` via server hook + `a2ui_rules` and `send_a2ui` tools) or document in `TEMPLATE.md` §5 & §8 how non-chat-post timeline append tools map to the `prompt/check.mjs` adapter.

* **`recipes/TEMPLATE.md` §6 vs. `recipes/{t3code,buzz,paseo}.md` (Dependency & Zod drift)**:
  * **Problem**: `TEMPLATE.md` §6 states current forks use `@a2ui/agent@0.2.1` and `@a2ui/{web_core,react}@0.16.1`, whereas all three concrete recipes (`t3code.md`, `buzz.md`, `paseo.md`) still specify `0.1.0` and `0.15.0`. Furthermore, `TEMPLATE.md` §6 always lists `@a2ui/react`, which is unused on React Native (`paseo.md` only depends on `agent` and `web_core`). Finally, `paseo.md` §Risks #2 warns against bundling a second zod when the host externalizes zod 4, while `TEMPLATE.md` §0 ("No-go signals") and §6 only mention `@a2ui/react`'s peer dep and pnpm overrides.
  * **Concrete fix**: In `TEMPLATE.md` §6, mark `@a2ui/react@<y>` as "(React DOM hosts only; omit on React Native)" and note that if a plugin compiler marks `zod` external against host zod 4 (like Paseo), pnpm overrides won't save `@a2ui/web_core`'s runtime `zod-to-json-schema` v3 calls. Update the version pins in `t3code.md`, `buzz.md`, and `paseo.md` (or mark them as historical initial slice pins).

#### Minor
* **`recipes/TEMPLATE.md` §2 & §4 vs. `conformance/README.md` (Missing DOM/test contract attributes)**:
  * **Problem**: `conformance/README.md` specifies that `trust/check.mjs` defaults to state markers `data-a2ui-surface`, `data-a2ui-error`, and `data-a2ui-pending`, and `visual/check.mjs` asserts on `[data-a2ui-locked]` (`inert`, box paint, opacity < 1). None of these required DOM attributes or `inert` behaviors are mentioned in `TEMPLATE.md` §2 (`A2uiBlock.tsx`) or §4 (Component map).
  * **Concrete fix**: In `TEMPLATE.md` §2 row 3 (`A2uiBlock.tsx`), explicitly require `data-a2ui-surface`, `data-a2ui-error`, `data-a2ui-pending`, and `[data-a2ui-locked]` with `inert` + dimmed opacity on sent/locked surfaces so `trust/` and `visual/` conformance pass out of the box.

* **`recipes/TEMPLATE.md` §2 vs. `recipes/{t3code,buzz,paseo}.md` (File naming drift vs. concrete recipes)**:
  * **Problem**: `TEMPLATE.md` §2 standardizes on `A2uiBlock.tsx` and `a2uiThread.ts`. `t3code.md` only lists `A2uiSurface.tsx` (omitting `a2uiThread.ts` and `catalog.tsx` as separate files), `buzz.md` lists `A2uiMessage.tsx` (with `A2uiBlock` only mentioned under Risks), and `paseo.md` combines thread state and surface into `client/surface.tsx`.
  * **Concrete fix**: Add a parenthetical in `TEMPLATE.md` §2 noting that files 2–4 may be named or combined per host conventions (e.g., `client/surface.tsx` + `shared/a2ui.ts` in Paseo), and update `t3code.md` / `buzz.md` to reflect their post-Phase-5b file names (`A2uiBlock.tsx`, `a2uiThread.ts`).

### 3. Gaps (Fresh Agent → Paseo Recipe)
Given only `TEMPLATE.md` + `conformance/` + `principles.md`, a fresh agent building the Paseo (React Native + plugin API) integration would get the following wrong:
1. **CSS / DOM assumptions on React Native**: `TEMPLATE.md` §4 instructs the agent to use CSS properties (`overflow-wrap:anywhere`, `flex-wrap`) and HTML `inert` (`visual/`). On React Native (`View`, `Text`, `Pressable`), CSS `overflow-wrap` and HTML `inert` do not exist (RN `<Text>` wraps by default; locking requires `pointerEvents="none"` / `disabled` + `accessibilityState`).
2. **Missing `@a2ui/web_core` subpath guidance for non-`@a2ui/react` hosts**: `TEMPLATE.md` §2 row 3 says "`@a2ui/react` surface (or RN map)", and §4 says "use `/catalog` APIs and the root." It omits that an RN host building a custom renderer without `@a2ui/react` needs `@a2ui/web_core` state/processing subpaths and must wire `RendererState` / `MessageProcessor` subscriptions manually.
3. **Transformer vs. Renderer split**: `TEMPLATE.md` assumes a single `matches` + `component` registration (`registerMessage`). In Paseo (`addTimelineTransformer` + `addTimelineRenderer`), the transformer must be synchronous and deterministic (running `splitA2uiSegments` and emitting separate `a2ui-markdown` and `a2ui` items with a Zod schema), while Express compilation must happen lazily inside the renderer, never in `transform`.
4. **RN Native smoke test & Metro warmup**: `TEMPLATE.md` §8–§11 only cover browser Playwright tests (`visual/` only runs in a DOM browser). A fresh agent would miss the Jest/RNTL native smoke test (`client/surface.tsx`) and the Metro cold-bundle warmup pitfall (`curl` before Playwright).

### 4. Must-fix before close
1. **Document DOM markers in `TEMPLATE.md` §2**: Add `data-a2ui-{surface,error,pending,locked}` and `inert`/RN-equivalent lock semantics so `trust/` and `visual/` conformance requirements are visible in the spec.
2. **Add React Native & Transformer notes to `TEMPLATE.md` (§2, §4, §6)**: Clarify that `@a2ui/react` is omitted on RN, specify RN equivalents for wrapping/locking, and note that transformer-based plugin APIs must split segments synchronously in the transformer and compile in the renderer.
3. **Align `paseo.md` Slice 2 with the `prompt/` conformance gate**: Reconcile Paseo's `a2ui_render` + full skill install with the two-tier `pointer` + `a2ui_rules` / `send_a2ui` contract tested by `conformance/prompt/`.

### 5. Strengths
* **Zero-dependency discipline holds**: `conformance/` uses pure data + dependency-free `.mjs` runners injected into the host's own test runner, honoring `principles.md` §1 & §4 without vendoring or cross-repo imports.
* **Mutation-backed verification**: Every conformance group (`wire`, `thread`, `prompt`, `trust`, `visual`) was validated by flipping real mutants on t3code and Buzz, catching genuine layout and state bugs (e.g., t3code `one-send-per-surface-before-lock` and 360px/150% text overflow on both hosts) before closing Phase 6.
* **High-signal `TEMPLATE.md`**: The Fit Check (§0), measured diff budgets (§2), and real-world test pitfalls (§11) distill hard-won lessons (zod 3/4 peer clashes, inline root `font-size` scaling, author-aware trust predicates) into a compact, actionable checklist.

---
## Orchestrator fold-in (2026-11-25)
- Checked by hand against `conformance/{trust,visual}/check.mjs` (default `data-a2ui-*` markers) and the recipes (stale 0.1.0/0.15.0 pins, `a2ui_render` in paseo.md): all findings confirmed, none refuted.
- Must-fix 1 (markers): TEMPLATE §2 now names `data-a2ui-{surface,error,pending,locked}`, `inert` + dim lock, and the `attrs` override.
- Must-fix 2 (RN + transformer): TEMPLATE §2 transformer/renderer split; §4 RN wrap notes; §6 `@a2ui/react` DOM-only, RN uses `web_core` subpaths, externalized zod 4 is blocked upstream; §11 RNTL smoke + Metro warmup.
- Must-fix 3 (paseo slice 2): `a2ui_render` + full-skill install replaced by the two-tier pointer + `a2ui_rules`/`send_a2ui`, gated by `prompt/`; `timeline.append` kept as an optional fast path.
- Minors: pins updated in all 3 recipes (slice-1 pins kept as history); t3code recipe notes the shipped file names; TEMPLATE §2 allows renamed/merged files.
- Verdict after fold-in: Phase 6 closed. Known gap: `prompt/` cannot run on t3code (no agent side) -> candidate t3code slice 3.
