### 1. Verdict
**Close after must-fixes** (two cross-agent surface ownership bypasses in `a2uiThread.ts` and `agentTools.ts`; slice 2 is otherwise clean and well-tested).

### 2. Findings by Severity

#### Major
* **`src/bundled/a2ui/a2uiThread.ts:111-120` — Cross-agent surface recreation (`update=false`) hijacks ownership and supersedes the original surface.**
  In `apply()`, when `kind === "createSurface"` (i.e. `surface("triage")` without `update=true`), `created.add(id)` executes unconditionally and line 120 overwrites `this.ownerBySurfaceId.set(id, block.authorId)` without checking if `this.ownerBySurfaceId.has(id)`. If Agent B posts `surface("triage")` in a thread where Agent A already created `"triage"`, `RendererState` recreates the surface, `latestBlockBySurfaceId` points to Agent B's block (collapsing Agent A's surface to "Updated below"), and Agent B takes over `ownerBySurfaceId` so future actions route to Agent B.
  *Fix:* In `apply()`, before `created.add(id)` on `createSurface`, check `const existing = this.ownerBySurfaceId.get(id); if (existing !== undefined && existing !== block.authorId) throw new Error(\`Surface \${id} belongs to another agent\`);`.

* **`src/bundled/a2ui/agentTools.ts:42-77` — `send_a2ui` replay includes human/untrusted messages, out of parity with renderer `isA2uiMessage` filtering.**
  `threadMessages` queries all kind `9` and `40002` events in the thread and passes all of them to `checkA2uiReply` without filtering through `isA2uiMessage`. In the UI (`A2uiMessage.tsx:111`), human-authored `<a2ui>` blocks are ignored. In `send_a2ui`: (1) if a human posts raw `<a2ui>\nsurface("triage")...` text in the thread, `checkA2uiReply` registers the human as owner of `"triage"` and blocks the legitimate agent from creating/updating it; (2) conversely, if a human posts a fake surface, an agent could pass `send_a2ui` validation for `update=true` against a surface that does not exist in the renderer.
  *Fix:* Filter `earlier` events in `sendA2ui` using the same agent-trust predicate as `isA2uiMessage` (via `relay.snapshot()` passed from `index.tsx`, or checking envelope/agent pubkeys) before calling `checkA2uiReply`.

#### Minor
* **`src/bundled/a2ui/A2uiMessage.tsx:50-75` — Per-message `session.thread()` allocation across simultaneously mounted thread rows.**
  `useThreadReader` is called per mounted `A2uiMessage`. When `ThreadPanel` is open and its root has scrolled out of the channel window, every `A2uiMessage` reply in that thread (plus the root if mounted with `replyCount > 0`) opens and refreshes its own `session.thread(channelId, rootId)` reader against the 64-reader session cap.
  *Fix:* Optional for now (single open thread rarely has >60 A2UI replies), or memoize/ref-count active `ThreadView` instances by `${channelId}:${rootId}` in a module-level map alongside `a2uiThreadStore`.

* **`src/bundled/a2ui/A2uiMessage.tsx:93-95` — Root with replies doesn't receive new A2UI replies if `replyCount` stays non-zero and `ThreadView` doesn't push.**
  `useThreadReader` calls `void owned.refresh()` once on mount. If `session.thread()` subscribes to live relay events, this works (as proven in `a2ui-live.spec.mjs`); however, when `message.replyCount` increments from `1` to `2` on the channel window row while `needed` is already `true`, `useEffect` does not re-trigger `owned.refresh()` if the reader is polling-only.
  *Fix:* Verify `ThreadView` receives live relay pushes; if not, trigger `view?.refresh()` when `message.replyCount` changes.

* **`src/bundled/a2ui/index.tsx:21-69` — Agent can still bypass `send_a2ui` via host `send`.**
  As noted in the prompt, `A2UI_POINTER` instructs the agent to use `send_a2ui`, which is enforced by prompt guidance rather than intercepting host `send`. Since `src/bundled/a2ui/` cannot wrap core MCP `send` without touching host files, and any malformed block sent via `send` is safely caught by `A2uiThreadStore` in the renderer, this is an acceptable boundary trade-off.

### 3. Must-Fix Before Close
1. **`src/bundled/a2ui/a2uiThread.ts:111`**: Reject `createSurface` when `this.ownerBySurfaceId.get(id)` is already set to a different `authorId`.
2. **`src/bundled/a2ui/agentTools.ts:99`**: Filter `earlier` thread events by agent authorship (`isA2uiMessage` parity) so human-authored `<a2ui>` text cannot poison `send_a2ui` validation.

### 4. Next-Step Recommendation for Phase 5b
1. **Land the two must-fixes above** with unit tests in `a2uiThread.test.ts` and `agentTools.test.ts`, then **declare the Buzz web/desktop (`buzz-app`) integration done for Phase 5b**.
2. **Skip Canvas / plugin panel (`40100` / `open` target) for now:** Chat-inline + thread superseding (`update=true`) + `ThreadPanel` already cover the full interactive triage/form CUJ cleanly with 0 host lines changed. Adding a custom panel increases surface area without a distinct user need.
3. **Log upstream A2UI items for Phase 6 (Alan gate):** (a) drop/widen unused `zod` peer dep in `@a2ui/react`, (b) split browser vs Node (`fs`/`path`) entry points in `@a2ui/agent`, (c) separate `BASIC_COMPONENTS` schema from Lit registration in `@a2ui/web_core`.
4. **Evaluate Buzz mobile (`block/buzz` Flutter) only if scheduled in the Phase 5b roadmap** as a separate PR per `wiki/buzz/a2ui-integration-shape.md`.

### 5. Upstream-Readiness (Buzz Maintainer Pushback & Trims)
* **Zero host-file footprint preserved:** Slice 2 touched 0 host files (`src/bundled/a2ui/` and `tests/browser/` only).
* **Duplicate `ThreadView` readers per thread (`A2uiMessage.tsx:49`):** A Buzz maintainer familiar with `session.thread()`'s 64-reader cap may push back on opening one reader per A2UI message row in a long thread. *Trim:* Share a ref-counted `ThreadView` per `${channelId}:${rootId}` inside `a2uiThread.ts` or `A2uiMessage.tsx`.
* **Slice-1 upstream trims remain:** The `pnpm-workspace.yaml` `"@a2ui/react>zod"` override and the 207 KB lazy chunk (transitive `lit` + Vite `fs`/`path` warnings) remain external upstream `@a2ui/*` fixes.

### 6. Strengths
* **High-signal live CUJ (`a2ui-live.spec.mjs`):** Running against the production broker with Nostr-signed events uncovered a real architectural bug (channel window only holding top-level rows so roots missed thread updates) and proved the fix end-to-end across light/dark and desktop/mobile viewports.
* **Lazy tool loading (`index.tsx:42, 65`):** Dynamic `await import("./agentTools")` inside tool `call()` handlers keeps `@a2ui/agent` and `@a2ui/web_core` completely out of the main bundle and zero-cost until an agent actually invokes a tool.
* **Transactional state safety:** Wrapping `parseResponse` inside `this.state.transaction(...)` ensures partial surface mutations roll back cleanly if a multi-statement block fails validation partway through.
