### 1. Verdict
**Close Phase 6b.**

### 2. Findings by severity

* **Critical:** None.
* **Major:** None.
* **Minor:**
  * **File:** `conformance/README.md` (Groups table line 13, and `prompt/` section line 57).
    * **Problem:** The factory's top-level conformance status table and `prompt/` notes still say "t3code has no agent side yet" and "`7281ea65` has no agent-side prompt or tools ... so the group can't run there yet", whereas Task 3.4 passed `25/25 + 1 skip` on `8027ff15`.
    * **Concrete fix:** Update `conformance/README.md` to record `t3code 8027ff15 25/25 + 1 skip (ownership)` alongside Buzz `26/26`.
  * **File:** `apps/server/src/mcp/toolkits/a2ui/handlers.ts:10-14, 42-45`.
    * **Problem:** `a2ui_check` reuses `loadFailure` (`"The A2UI rules could not be loaded."`) as its `Effect.tryPromise` catch handler. If `loadA2ui()` or an unexpected exception rejects during `a2ui_check`, the error message mentions "rules" instead of checking.
    * **Concrete fix:** Pass tool-specific text or a generic message (`"The A2UI runtime could not be loaded."`), though in practice `checkA2uiReply` catches parse errors internally and returns `{ ok: false, error }`.

**Verification of earlier plan-review must-fixes against `84656662..8027ff15`:**
* **C1 (Closed):** `A2UI_POINTER` is exported as a standalone constant (`531 B` UTF-8, ≤ 1,024 B) in `packages/provider-core/src/server/orchestrationInstructions.ts:4`, interpolated into `T3_CODE_ORCHESTRATION_SECTIONS[2]`, and tested in `orchestrationInstructions.test.ts:89-116` for both `<= 1024` B and section `< 4000` B.
* **M2 (Closed):** `apps/server/src/a2ui/A2uiReplyCheck.ts:26-51` has zero top-level `@a2ui/*` imports; `@a2ui/agent`, `@a2ui/web_core`, and `@a2ui/web_core/catalogs/basic/v1` are loaded only inside `importA2ui()` via dynamic `import()`, memoized by `loadA2ui()` (with cache reset on failure). Confirmed in the server bundle (+9.5 KB entry chunk; parser/catalog split into lazy chunks).
* **M3 (Closed):** `apps/server/src/mcp/toolkits/a2ui/tools.ts:32-34` defines `success: Schema.Struct({ ok: Schema.Boolean, error: Schema.optional(Schema.String) })`, `failure: OrchestratorMcpFailure`, and `failureMode: "return"`. Validation failures return on the `success` channel (`isError=false`), while infra/scope failures return `OrchestratorMcpFailure`.
* **m4 (Closed):** `apps/server/src/a2ui/A2uiReplyCheck.ts:12, 105` uses `const DRAFT_ID = "__a2ui_draft__"`, avoiding collision with simple message IDs.
* **Thread scoping & assistant-only replay (Verified):** Both tools wrap handlers in `McpToolAccess.readsAsCaller(...)`, `a2ui_check` enforces `requireThreadScope` and queries `getThreadRecords(thread.threadId, ["messages"], { messageRoles: ["assistant"] })` plus an in-memory `message.role === "assistant"` guard (`handlers.ts:28-41`).

### 3. Risks for real agents (Codex, Claude) in a live t3code thread
1. **Claude ToolSearch naming & discovery:** Claude defers T3 MCP tools behind `ToolSearch`, where the registered tool names are prefixed (`mcp__t3-code__a2ui_rules`, `mcp__t3-code__a2ui_check`, as seen in `CLAUDE_READ_ONLY_T3_MCP_ALLOWED_TOOLS`), while `A2UI_POINTER` refers to `a2ui_rules` and `a2ui_check`. This matches the existing `html_preview`/`html_render` convention in the same section, so Claude's keyword search handles it, but agents occasionally attempt to call the unprefixed name before running `ToolSearch`.
2. **Checking only the `<a2ui>` snippet instead of the whole draft:** Despite the parameter description (`"The whole draft reply, prose and blocks."`), agents frequently pass just the `<a2ui>...</a2ui>` block to `a2ui_check` or edit surrounding markdown fences when emitting the final reply. If an agent checks the raw block (`ok: true`) and then wraps it in a ``` fence in its actual reply, `a2ui_check` won't have seen the fence and the UI will render it as a code block.
3. **In-flight streaming message ordering:** If an agent calls `a2ui_check` mid-turn after already streaming text containing an `<a2ui>` tag in the *current* assistant message, and the host persists partial assistant messages to `ThreadManagementService` before the turn completes, `getThreadRecords` could include the current turn's partial message in `earlier` and cause a false `"Surface <id> already exists"` collision with the draft.
4. **Skipping `a2ui_rules` / `a2ui_check` under latency pressure:** Two extra MCP tool round-trips (especially for Claude when `ToolSearch` adds a third) increase turn latency; agents on simple confirmations may guess the syntax from `A2UI_POINTER` alone and hit the client-side error disclosure fallback (`trust/` 12/12).

### 4. Must-fix before close
None in the `t3code` fork. (Optionally update `conformance/README.md` in the factory repo as part of closing out the phase documentation.)

### 5. Strengths
* **Exemplary host fit and diff discipline:** Only ~18 lines touched across existing host files (`McpHttpServer.ts`, `ClaudeAdapterV2.ts`, `orchestrationInstructions.ts`, `agentContextBudget.json`, `package.json`, `html-renders.md`), reading indistinguishably from native `toolkits/html` and `provider-core` code.
* **Zero boot penalty verified in bundle:** Dynamic `import()` with failure-reset memoization keeps `antlr4ng` and `@a2ui/web_core` completely out of the server startup path (+3.2 KB gzip on the entry chunk).
* **Strong end-to-end evidence:** Verified both in-process (`handlers.test.ts` mocking `messageRoles` filtering and `ClaudeAdapterV2.test.ts` read-only allowlist parity) and over real HTTP JSON-RPC (`t3 serve` rejecting outside-thread tokens and accepting thread-scoped provider tokens).
