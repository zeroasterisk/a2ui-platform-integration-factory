### 1. Verdict
**Go-with-changes.**

### 2. Findings

**Critical**
* **Streaming & Regeneration State Divergence (`t3code-slice2.md` §2a.1):** Keying `apply(messageId, offset, source)` only by `(messageId, offset)` breaks during streaming (where `source` mutates in-place for the same key) and assistant regeneration/branching (where a message is replaced or truncated). Furthermore, component-level `apply` during render is fragile if the timeline virtualizes or mounts out of order.
  * *Fix:* Derive the thread’s `MessageProcessor` state from the canonical ordered `messages` array in a thread-level hook (or track the applied `[(messageId, offset, source)]` tuple log). Only call `apply` once a `<a2ui>` block is closed (`</a2ui>`). If any earlier tuple changes, gets truncated, or regenerates, reset the processor and replay the current message list from the start.
* **Earlier Row Doesn't Re-render to Collapse (`t3code-slice2.md` §2a.2):** Turn 1 (`A2uiBlock`) will not automatically re-render when Turn 2 mounts and applies an update to the module `Map`, leaving two live copies of the same `SurfaceModel` in the DOM.
  * *Fix:* Make `a2uiThread.ts` an observable store (`useSyncExternalStore` or Zustand) that tracks `latestBlockBySurfaceId: Map<string, BlockKey>` and `sentBySurfaceId: Map<string, SendStatus>`. Subscribe `A2uiBlock` to this store so Turn 1 immediately transitions to the `"Updated below"` stub when Turn 2 applies.

**Major**
* **StrictMode Unmount Wipes Thread State (`t3code-slice2.md` §2a.1):** "Dropped when the thread unmounts" in a `useEffect` cleanup will destroy the `MessageProcessor` during React 18 StrictMode's simulated unmount/remount, while child `A2uiBlock`s retain stale references or fail to re-apply.
  * *Fix:* Do not drop state on component unmount. Reconstruct deterministically from the thread’s messages on mount, or tie eviction to `useRightPanelStore`'s `removeThread` / LRU cache.
* **Persisted Panel Tabs Leak Dead `a2ui` Surfaces (`rightPanelStore.ts` / `t3code-slice2.md` §2b):** `useRightPanelStore` persists `byThreadKey` to `localStorage` and records closed tabs in `useClosedViewStore` via its subscriber (lines 740–766). Also, the plan misstates `browser:new`: `rightPanelStore.ts` line 760 skips `surface.kind === "terminal" || (surface.kind === "preview" && surface.resourceId !== null)`, meaning `browser:new` *is* remembered.
  * *Fix:* In `rightPanelStore.ts`:
    1. Exclude `"a2ui"` from `open`, `toggle`, and `singletonSurface` union types (`Exclude<RightPanelKind, ... | "a2ui">`).
    2. Strip `surface.kind === "a2ui"` in `migratePersistedRightPanelState` (like `"plan"` and `"agents"` on line 378) or in `partialize`.
    3. Add `surface.kind === "a2ui"` to the `useClosedViewStore` skip condition at line 760—this eliminates touching `closedViewStore.ts`, `reopenClosedView.ts`, and `ReopenClosedViewShortcut.tsx`, cutting the host diff in half.

**Minor**
* **Multi-Surface Block Partial Collapse (`t3code-slice2.md` §2a.2):** "A block whose surfaceIds were all updated by a later block renders a read-only stub" means if Block 1 creates surfaces `A` and `B`, and Block 2 updates only `A`, both Block 1 and Block 2 will render live `A` concurrently.
  * *Fix:* Evaluate collapse per-surface inside `compiled.surfaces.map(...)`, not per-block.
* **Side-Chat Panel Routing (`rightPanelStore.ts` line 300):** If an `A2uiBlock` renders inside a side-chat, `openA2uiSurface` will route the tab to the host thread's right panel via `panelHosts`, which won't find the surface if looked up in the host thread's processor.
  * *Fix:* Include `threadRef` (or `scopedThreadKey`) on the `RightPanelSurface` payload: `{ id: `a2ui:${string}`, kind: "a2ui", threadKey: string, surfaceId: string }`.

### 3. Upstream API vs. Spike Output
* **`wrapped: false` + `{ state }` untested in spike:** `same-surface.mjs` tests `parser.parseResponse(turn1, { state })` with `<a2ui>` tags (`wrapped: true` default), whereas `A2uiBlock.tsx` calls `parseResponse(source, { state, wrapped: false })`. Verify in unit tests that `{ state, wrapped: false }` still triggers `RendererState.of(processor)` auto-application.
* **Lock/Action handler binding:** `MessageProcessor` takes `onAction` once in its constructor. Moving `MessageProcessor` to `a2uiThread.ts` means `onAction` can no longer close over `A2uiBlock`'s per-block `onSendMessage` prop directly; the thread store must hold a mutable ref to the thread's `onSendMessage` dispatcher and update `sentBySurfaceId.set(action.surfaceId, ...)`.

### 4. Suggested Reordering
Move **2a.6 (D: segmented `ChoicePicker`)** ahead of **2a.1–2a.5** as a standalone first commit so catalog UI work is isolated from stateful processor/panel plumbing.
