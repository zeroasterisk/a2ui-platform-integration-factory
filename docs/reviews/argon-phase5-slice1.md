### 1. Verdict
**No** — do not proceed to slice 2 yet. Fix the render-time `MessageProcessor` lifecycle bug (causing Vision A) and the prohibited `/catalogs/basic/v1` import first; the branch is otherwise clean and well-structured.

---

### 2. Findings by Severity

#### Critical
* **`apps/web/src/components/chat/A2uiBlock.tsx` — Processor lifecycle resets form state on every render (Root cause of Vision A)**
  * **Issue:** `compile(source, ...)` runs unconditionally inside the component body on every render. When the user clicks Apply, `setSent("sending")` and `setSent("sent")` trigger re-renders. Each re-render instantiates a fresh `MessageProcessor`, re-parses `source`, and overwrites the user's edited data-model state (`$/note`, `$/pr415`) back to the initial DSL defaults. Furthermore, in slice 2 (live same-surface updates), recreating the processor per render will destroy incremental surface state.
  * **Fix:** Memoize compilation on `[source]` (`useMemo`), using a stable `useRef` for the `onSendMessage` callback so state transitions (`sent`) never recreate `MessageProcessor` or `SurfaceModel`.

#### Major
* **`apps/web/src/components/chat/a2uiCatalog.tsx` — Violates recipe ban on `@a2ui/web_core/catalogs/basic/v1` (Bundle weight)**
  * **Issue:** Line 16 imports `BASIC_COMPONENTS`, `BASIC_FUNCTIONS`, and `BasicCatalogThemeSchema` from `@a2ui/web_core/catalogs/basic/v1`. The recipe explicitly states: *"Never import `@a2ui/web_core/v1_0`, `/catalogs/basic/v1` or `/universal` on the client (they pull lit). Use `/catalog` and the root."* Even if tree-shaking strips Lit in production builds, `@a2ui/web_core/catalogs/basic/v1` is explicitly listed in `vite.config.ts` `optimizeDeps.include` and risks bundling Lit alongside the ~323 KB `antlr4ng` + `@a2ui/agent` chunk.
  * **Fix:** Load the catalog definitions via `Catalog.fromJson(v1 basic JSON)` and `@a2ui/web_core` root exports as specified in the recipe, and remove `/catalogs/basic/v1` from `vite.config.ts`.
* **`packages/shared/src/a2uiMessage.ts` — Fragile streaming/fence parsing in `splitA2uiSegments`**
  * **Issue:** (1) Fence tracking (`if (line.startsWith("```") || line.startsWith("~~~")) inFence = !inFence;`) toggles `inFence` off if a `~~~` line appears inside a ```` ``` ```` block, or if a 3-backtick line appears inside a 4-backtick outer fence. (2) If `</a2ui>` appears inside an Express string literal or inside a fenced code block after an unclosed `<a2ui>`, `text.indexOf(CLOSE_TAG, next)` prematurely terminates the A2UI segment. (3) If `<a2ui>` has trailing text on the same line (e.g. `<a2ui>root = ...`), `line === OPEN_TAG` misses it and renders raw Express DSL in markdown.
  * **Fix:** Track fence character (`~` vs `` ` ``) and minimum fence length per CommonMark rules; require `</a2ui>` to appear on its own trimmed line (`\n</a2ui>`) rather than arbitrary substring `indexOf`.
* **`apps/web/src/components/chat/A2uiBlock.tsx` — `<fieldset disabled>` does not disable Base UI custom controls (Root cause of Vision B)**
  * **Issue:** `<fieldset disabled className="contents">` only disables native HTML form elements (`<input>`, `<button>`). Base UI primitives (`Checkbox`, `RadioGroup`/`Radio`) render `<span role="checkbox">` / `<button>` or custom ARIA elements that ignore ancestor `<fieldset disabled>` unless passed `disabled` props or styled via group/inert attributes, leaving them interactive and visually enabled after submission.
  * **Fix:** Add `inert={ isDisabled }` and `className={cn("contents", isDisabled && "pointer-events-none opacity-60")}` on the wrapper (or pass disabled context down to catalog components).

#### Minor
* **`packages/shared/src/a2uiMessage.test.ts` & `A2uiBlock.browser.test.tsx` — Test coverage gaps**
  * **Issue:** Missing tests for: state preservation after submit (Vision A/B), failed send recovery (`sent === "failed"`), `</a2ui>` inside fenced blocks, and `sanitizeMediaUrl` blocking `javascript:`/`data:` URLs in `Image`.
  * **Fix:** Add unit cases in `a2uiMessage.test.ts` for mismatched fences and an assertion in `A2uiBlock.browser.test.tsx` that the edited radio/input values remain visible and disabled after clicking Apply.
* **`apps/server/scripts/dev-replay/a2ui_transcript.ndjson` — Turn 2 does not update the same `surfaceId`**
  * **Issue:** Recipe item 4 specifies *"turn 2 (after action) = same surfaceId updated"*, which sets up slice 2's same-surface canvas story. Both turns currently emit anonymous default surfaces.
  * **Fix:** Pass an explicit matching `surfaceId` (if supported in Express block options/declarations) or wire it in slice 2.

---

### 3. Vision Findings Triage (A–E)

* **A (Submitted form resets note field to empty):** **Fix now in slice 1.** Direct regression caused by `compile()` re-running on `setSent` re-render; memoizing the `MessageProcessor` instance per `source` fixes it immediately.
* **B (Checkbox and text field still look enabled when locked):** **Fix now in slice 1.** Security/UX bug allowing post-submit mutation of custom Base UI controls; apply `inert` + `pointer-events-none opacity-60` on the locked container.
* **C (User bubble shows raw `a2ui-action` JSON wrapping mid-token on mobile):** **Fix now in slice 1.** Breaks mobile readability; format a compact human-readable key-value summary line above a collapsible `<details>` block (or compact markdown) while keeping the ```a2ui-action fence parseable.
* **D (Choice groups render as vertical radios, reading long on mobile):** **Defer to slice 2.** Visual polish; swap `ChoicePicker` (`mutuallyExclusive` with ≤3 short options) to horizontal segmented chips (`ToggleGroup` or flex-row pill labels) during the UI pass.
* **E (Small stray glyph in left gutter near messages):** **Drop (after 1-minute verification).** Almost certainly stock t3code timeline chrome (`AssistantTimelineRow` gutter/fork icon); do not touch host files unrelated to A2UI (Principle 3).

---

### 4. Strengths
* **Defense-in-depth off-catalog & XSS blocking:** Off-catalog `Iframe` is rejected before DOM creation, `<script>` text payloads stay safely escaped via React text nodes, and `Image` uses `sanitizeMediaUrl`.
* **Host-native look and minimal diff:** `TimelineAssistantRows.tsx` adds just 25 lines, lazy-loads the heavy Express parser behind `<Suspense>`, and maps cleanly onto t3code's `components/ui` and user docs voice.
