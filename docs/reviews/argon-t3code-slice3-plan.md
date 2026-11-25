# Argon review: t3code slice 3 plan (2026-11-25)

**Verdict:** Build after must-fixes

### Critical

1. **Task 3.4 fails `pointer/size` because it passes the entire section 3 (~1.8 KB) to `checkPrompt` instead of the A2UI pointer string.**
   - **Evidence:** `factory/docs/plans/t3code-slice3.md:45` sets `{ pointer: section text, ... }`. Section 3 (`t3code/packages/provider-core/src/server/orchestrationInstructions.ts:24-27`) is already 916 B before appending the pointer (`t3code-slice3.md:8`). `factory/conformance/prompt/check.mjs:15` asserts `bytes(a.pointer) <= p.maxBytes`, where `p.maxBytes` is `1024` (`factory/conformance/prompt/prompt.json:4`). Any pointer >108 B makes the combined section exceed 1024 B and fail `pointer/size`.
   - **Fix:** Export a dedicated `export const A2UI_POINTER = ...` constant from `orchestrationInstructions.ts`, interpolate it into `T3_CODE_ORCHESTRATION_SECTIONS[2]`, pass `A2UI_POINTER` as `a.pointer` to `checkPrompt`, and keep the separate `< 4000 B` assertion on `T3_CODE_ORCHESTRATION_SECTIONS[2]`.

### Major

2. **Eager top-level imports in `A2uiReplyCheck.ts` violate Decision 2 ("the parser never loads unless a tool is called") and penalize server startup.**
   - **Evidence:** `factory/docs/plans/t3code-slice3.md:29` promises lazy loading so the parser (measured at 453 ms warm import in `t3code-slice3.md:23`) never loads unless a tool is called. However, `buzz-app/src/bundled/a2ui/agentTools.ts:5-26` (the reference being ported) uses static top-level imports for `@a2ui/agent` and `@a2ui/web_core` and instantiates `new Catalog(...)` at module evaluation time. Because `McpHttpServer.ts` (`layerTools`) statically imports tool handlers, top-level imports in `A2uiReplyCheck.ts` will load `antlr4ng` and `@a2ui/web_core` on server boot.
   - **Fix:** In `A2uiReplyCheck.ts`, either wrap `@a2ui/agent` and `@a2ui/web_core` in a memoized `async function loadA2ui()` using dynamic `await import(...)`, or lazy-construct the `Catalog` and `RendererState` inside the tool handlers on first invocation.

3. **Tool `failureMode` and return schema mismatch `OrchestratorMcpFailure` precedent.**
   - **Evidence:** `factory/docs/plans/t3code-slice3.md:28` specifies "`a2ui_check` is `failureMode: "return"` with `{ ok: true } | { ok: false, error }`". In `t3code/apps/server/src/mcp/toolkits/html/tools.ts:96-97`, `failureMode: "return"` in `effect/ai` governs how the `failure: OrchestratorMcpFailure` channel is returned to MCP callers, whereas `{ ok: boolean, error?: Schema.optional(Schema.String) }` is a normal `success` schema payload. Returning `{ ok: false, error }` via the failure channel won't match `OrchestratorMcpFailure`, while returning `OrchestratorMcpFailure` breaks the `{ ok, error }` shape expected by the Task 3.4 adapter (`check→posted`).
   - **Fix:** Define `success: Schema.Struct({ ok: Schema.Boolean, error: Schema.optional(Schema.String) })` and `failure: OrchestratorMcpFailure`. In the `a2ui_check` handler, return `{ ok: true }` or `{ ok: false, error }` via `Effect.succeed(...)` when validation fails, reserving `failure` only for infrastructure errors (e.g., thread lookup failure).

### Minor

4. **Draft message synthetic ID in `checkA2uiReply` can collide if a thread uses numeric/simple IDs.**
   - **Evidence:** `buzz-app/src/bundled/a2ui/agentTools.ts:66` hardcodes `id: "new"` (`a2uiThreadBlocks([{ id: "new", text, authorId }])`). `t3code-slice3.md:32` notes default surface IDs are derived from block keys (`a2ui-${key}`). If an earlier message in a test or thread has `id: "new"`, its default surface key collides with the draft's default surface key.
   - **Fix:** Use a non-colliding synthetic ID such as `id: "__a2ui_draft__"` for the draft message in `checkA2uiReply`.

5. **Throwaway gate test in Task 3.4 leaves the repo without regression protection for `prompt.json`.**
   - **Evidence:** `factory/docs/plans/t3code-slice3.md:45` makes the conformance runner a "Throwaway host test (not committed)", while Task 3.1 only ports the 11 `send` cases into `A2uiReplyCheck.test.ts` and omits the `authorKind` filtering (which lives in 3.2's handler) and `pointer`/`rules` fixture checks.
   - **Fix:** Keep the full adapter test (covering `pointer`, `rules`, and `send` through the 3.2 handler with `authorKind` role filtering) committed in the server MCP test suite.
