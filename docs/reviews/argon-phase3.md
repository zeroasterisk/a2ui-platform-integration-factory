### 1. Verdict
**Phase 5 (t3code) now:** **Yes** — t3code is a standalone web target with no Zod 4 or React Native dependencies and is completely unblocked.
**Phase 4 (Paseo) once upstream Zod fix lands:** **No** — the Phase 2b Metro+Hermes spike is still open (`STATUS.md`), and the `ten-second-stream` mock is only proven for a single static response, leaving multi-turn surface updates and Slice 2 tool calls (`a2ui_render`) untestable.

---

### 2. Findings

#### Critical
* **`recipes/paseo.md` & `docs/local-mock-paseo.md` | Single-response mock cannot test multi-turn updates or Slice 2 tools:** `seedMockAgentWorkspace` configures a single static string (`mockStreamingAssistantResponse`). It cannot natively test multi-turn round-trips (Action → Agent responds with updated `surfaceId` → earlier row collapses per `factory.md` Fold-in §2) or Slice 2 server tool invocations (`a2ui_render`), which real providers drive via tool-call turns.
  * *Fix:* Verify/extend `ten-second-stream` to accept an array of turn responses (or prompt-keyed responses) and mock tool-call emission; otherwise, use Playwright/client RPC to inject a second assistant turn and direct `a2ui_render` tool calls during the spec.
* **`STATUS.md` & `recipes/paseo.md` | Deferred Metro + Hermes spike and RNTL test:** Phase 2b left Metro/Hermes open ("esbuild ≠ Metro, so a Metro+Hermes run is required before Paseo"), and `factory.md` Fold-in §7 requires a Jest/RNTL native renderer smoke test alongside Playwright web.
  * *Fix:* Complete the Metro+Hermes bundle/runtime check on `@a2ui/agent` (`antlr4ng`) + `@a2ui/web_core` before starting Phase 4 UI work, and add the Jest/RNTL test target to `recipes/paseo.md`.

#### Major
* **`docs/local-mock-paseo.md` | Flaky cold Metro warmup (>120s timeout):** Relying on "Rerun and the cache makes it pass" is unacceptable for a deterministic Phase 4 e2e gate.
  * *Fix:* Add a pre-test warmup step (`expo export` or bundle curl before Playwright starts) or increase the harness warmup timeout in the e2e config.
* **`recipes/paseo.md` vs `docs/design/factory.md` | Missing Fold-in requirements in Paseo recipe:** `recipes/paseo.md` omits four binding rules from `factory.md` Fold-in §2, §4, §5, §7: per-thread `MessageProcessor` with "updated below" stub collapse, depth (12) / component (200) / URL (`https:`/`mailto:`) guards, appending the `a2ui-action` schema to the generated skill, and the Jest/RNTL smoke test.
  * *Fix:* Update `recipes/paseo.md` (`client/surface.tsx`, `shared/a2ui.ts`, and Slice 2 skill install) to explicitly include these constraints.

#### Minor
* **`docs/local-mock-paseo.md` | Undocumented `procps` prerequisite:** Minimal containers crash with `spawn ps ENOENT`.
  * *Fix:* Add `procps` (`ps` binary check) as Step 0 in `docs/local-mock-paseo.md` bring-up.
* **`docs/design/factory.md` | Stale e2e table:** The per-host table still says "Docker daemon + web UI" for Paseo, contradicting `local-mock-paseo.md`.
  * *Fix:* Update the table to specify Paseo's native Playwright harness (`ten-second-stream`).

---

### 3. Concrete Phase 4 E2E Assertions
1. **Streaming & Guarded Split:** While `ten-second-stream` streams an unclosed `<a2ui>` tag, the host `Loading` primitive renders (zero raw DSL leaked); `<a2ui>` inside markdown code fences stays literal code; original `assistant-message` row is replaced by split `a2ui-markdown` + `a2ui` items.
2. **Native Primitive & Theme Mapping:** Conformance surface renders interactive elements via `getByRole` (heading, button, input, chips) with host `theme.colors.*` card chrome at 1100px and 390px, and zero "unsupported: X" placeholders for basic catalog items.
3. **Action Round-Trip:** Mutating local state (TextField/ChoicePicker) and clicking the primary Button posts a visible user message containing a valid ```` ```a2ui-action ```` JSON block (`surfaceId`, `name`, `sourceComponentId`, populated `context`).
4. **Same-`surfaceId` Update & Collapse:** A second assistant turn with the same `surfaceId` updates the live surface and collapses the earlier row into a read-only "updated below" stub.
5. **Adversarial & Error Fallback:** Malformed Express DSL, depth >12, or >200 components cleanly fall back to a raw source code block; non-`https:`/`mailto:` URLs are neutralized.
6. **Slice 2 Tool & Canvas:** Invoking `a2ui_render` appends/updates the timeline surface in place, and clicking "Open in panel" renders the active surface inside the `a2ui-canvas` agent panel.

---

### 4. Strengths
* **Zero-Docker, zero-credential e2e:** Reusing Paseo's native Playwright harness with `ten-second-stream` and `copyPluginExample` eliminates credential friction and matches upstream conventions.
* **Crucial UI discovery:** Identifying early that stock plugin rows lack card chrome or markdown rendering prevented broken styling assumptions in Phase 4.
* **Disciplined architecture:** Holding the line on Principle 2 (fixing Zod 4 upstream in A2UI and shifting build order to t3code first) prevented tech-debt vendoring.
