### 1. Verdict
**Close Phase 5 now** — all binding principles, CUJ gates, and Argon fold-ins are met; remaining findings are minor polish or upstream-PR prep.

---

### 2. Findings by Severity

**Critical / Major:** None.

**Minor:**
* **`apps/web/src/components/chat/a2uiCatalog.tsx:10-16` — Transitive Lit import (~17 KB):** `from "@a2ui/web_core/catalogs/basic/v1"` violates the recipe's rule against importing `/catalogs/basic/v1` on the client because that barrel pulls Lit element definitions into the lazy chunk.
  * *Fix:* Switch to a Lit-free schema subpath once upstream lands NEEDS_ALAN #2, or construct from raw JSON via `Catalog.fromJson`.
* **`apps/web/src/components/chat/A2uiBlock.tsx:27-33` — Render-phase side effects and standalone store allocation:** `new A2uiThreadStore()` runs on every mount even when `thread` is provided (`useState` initializer), and `store.sync()` / `store.setSendMessage()` mutate external state during render (requiring `queueMicrotask` in `a2uiThread.ts:68` to avoid React warnings).
  * *Fix:* Make `ownStore` lazy (`useRef` initialized only when `!thread`); move `sync` and `setSendMessage` into `useEffect` (or drive `sync` from `MessagesTimeline`).
* **`apps/web/src/components/chat/A2uiPanel.tsx:17-24` — Unsynced store when panel mounts before timeline row:** `A2uiPanel` reads `store.panelView()` without calling `store.sync()`. If the virtualized timeline hasn't mounted any `A2uiBlock` yet (or LRU evicted the thread while in another tab), `surface` is `undefined` and shows "no longer in memory".
  * *Fix:* Call `store.sync(a2uiBlocks)` at the `ConversationTimeline` level rather than inside individual `A2uiBlock` renders.
* **`apps/web/src/components/chat/A2uiSurfaceRow.tsx:18-36` — Redundant "Show" button when panel tab is already active:** `useA2uiPanel` doesn't check `state.isOpen && state.activeSurfaceId === a2uiSurface(threadKey, surfaceId).id`, so "Show" renders even when the surface tab is currently focused.
  * *Fix:* Return an `activeId` from the selector and hide `<Button>Show</Button>` when `activeId === surfaceId`.
* **`docs/user/html-renders.md:21` & `:25` — Doc drift vs implementation:** Line 21 claims *"on mobile the reply shows as text"*, contradicting the 412 px mobile CUJs where forms and sheets render natively. Line 25 omits the Slice 2b "Open in panel" feature.
  * *Fix:* Update line 21 to state mobile works natively, and add a sentence on "Open in panel".

---

### 3. Must-Fix Before Close
*(Empty — Phase 5 can close immediately.)*

---

### 4. Upstream-Readiness (What t3code Maintainers Would Push Back On)
1. **Bundle weight & Lit leakage (`a2uiCatalog.tsx`, `package.json`):** Maintainers will push back on ~300 KB of `@a2ui/agent` parser + ~17 KB of unused Lit in a React/Base-UI app. *Trim:* Land the upstream Lit-free catalog export before proposing a PR; keep the `lazy(() => import("./A2uiBlock"))` split strict.
2. **`rightPanelStore.ts` diff size (+43 lines):** Adding an ephemeral surface kind that requires special-case filtering in `partialize` (lines 1189–1203), `migratePersistedRightPanelState` (line 506), and closed-view subscriptions (line 1235) touches high-traffic core state. *Trim:* Extract a 3-line `isEphemeralSurface(s)` predicate shared by `partialize`, migration, and closed-view tracking, cutting ~15 lines in `rightPanelStore.ts`.
3. **Custom `useSyncExternalStore` class vs Zustand (`a2uiThread.ts`):** t3code standardizes on Zustand (`rightPanelStore`, `closedViewStore`), whereas `A2uiThreadStore` is a 200-line custom pub/sub class with render-phase `queueMicrotask` notification. *Trim:* Wrap the per-thread `MessageProcessor` map in a small Zustand store or drive `sync()` from a single timeline-level `useEffect`.
4. **Unconditional timeline scan (`MessagesTimeline.tsx:1053-1061`):** Scanning all `timelineEntries` on every render of `ConversationTimeline`. *Trim:* Already fast-pathed with `.includes("<a2ui>")`, which is good for React Compiler, but moving `a2uiThreadBlocks` into a module helper keeps `MessagesTimeline.tsx` down to a 1-line addition.

---

### 5. Carry-Forward Lessons (Phase 6 Recipe Template & Paseo/Buzz)
* **Verify "Lit-free" subpaths in the bundler before writing the catalog:** `@a2ui/web_core/catalogs/basic/v1` looked pure in types but pulled Lit at runtime; recipes must mandate checking the built chunk or using JSON schemas until upstream separates them.
* **Drive thread-store `sync()` from the timeline container, not leaf blocks:** Syncing inside leaf `<A2uiBlock>` components creates render-phase side effects and leaves side panels (`A2uiPanel`) unsynced if virtualized rows haven't mounted.
* **Never put `opacity` / lock styles on `display: contents` wrappers:** As caught in Slice 1 CUJ B, `inert` + dimming needs a layout box (`flex flex-col`), and `inert` is required because Base UI / Radix primitives ignore `<fieldset disabled>`.
* **Human-readable action summaries + collapsed `a2ui-action` fences are the right wire pattern:** They keep mobile chat bubbles scannable while preserving exact JSON for the agent and replay harness.
* **Ephemeral panel tabs beat persisted tabs for in-memory surfaces:** Filtering `a2ui` out of persistence and `closedViewStore` avoided touching 3+ extra host files and prevented broken "reopen closed tab" states after reload.

---

### 6. Strengths
* **Genuinely native feel:** `a2uiCatalog.tsx` maps all 13 basic components cleanly onto t3code's `components/ui` (including smart `ToggleGroup` promotion for short exclusive choices) with zero custom CSS files.
* **Bulletproof streaming & fence lexer:** `splitA2uiSegments` handles CommonMark backtick/tilde fence pairing, Express comments, and triple-quoted strings in ~100 LOC with zero dependencies.
* **Rigorous test & CUJ discipline:** Every slice is backed by unit tests, Vitest browser tests, a deterministic 3-turn `dev-replay` transcript, and verified 1100 px / 412 px Playwright journeys.
