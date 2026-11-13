### 1. Verdict
**Yes** — 2a satisfies binding items 1–8 and the CUJ/test gates, and is ready to proceed to 2b after addressing two small robustness fixes below.

### 2. Findings

#### Major
1. **Partial-failure corruption & mid-block unlock on multi-part blocks** — `apps/web/src/components/chat/a2uiThread.ts` (`apply`)
   - **Issue:** `parser.parseResponse(block.source, { state: this.state, wrapped: false })` mutates `this.state` / `this.processor` lazily as the generator yields each part. If a single `<a2ui>` block contains two parts/statements where the first succeeds (e.g., mutating components on `"triage"`) and the second throws (e.g., catalog validation error on `Iframe`), the `catch` records `{ ok: false }` for the block, leaving the earlier block un-superseded (`latestBlockBySurfaceId` not updated) **while its live `SurfaceModel` in `processor` is already mutated**. Conversely, if part 1 fails to parse, nothing is rolled back if prior messages in the same yield succeeded.
   - **Fix:** Either verify that `parseResponse` validates the entire block before applying to `state`, or on `catch` when `surfaceIds.size > 0` (or unconditionally on throw during `apply`), trigger a replay of `this.applied` excluding/failing the throwing block so `this.processor` stays strictly atomic per block.

2. **Streaming assistant message with multiple `<a2ui>` segments omitted until full message finishes** — `apps/web/src/components/chat/MessagesTimeline.tsx` & `TimelineAssistantRows.tsx`
   - **Issue:** `MessagesTimeline.tsx` builds `a2uiBlocks` only from `!entry.message.streaming`. However, `TimelineAssistantRows.tsx` renders `<A2uiBlock>` whenever `segment.closed` is true, even if `row.message.streaming` is still true (e.g., a closed `<a2ui>` block followed by trailing markdown that is still streaming). During that window, `A2uiBlock` calls `store.sync(ctx.a2uiBlocks)` which omits its own `blockKey`, so `view.result` is `undefined` and it renders `<A2uiPending />`, OR if a later message is streaming, an earlier closed block inside that streaming message is invisible to `a2uiBlocks`.
   - **Fix:** Drop `!entry.message.streaming` in `MessagesTimeline.tsx`—`a2uiThreadBlocks` already filters strictly for `segment.kind === "a2ui" && segment.closed`.

#### Minor
3. **Un-keyed `sent`/`failed` footer when a block renders multiple surfaces** — `apps/web/src/components/chat/A2uiBlock.tsx`
   - **Issue:** Collapse and lock (`inert`) are per-surface (binding item 5), but the status footer (`states.includes("sent")` / `states.includes("failed")`) is rendered once at the block bottom rather than inside the `live.map` per-surface wrapper.
   - **Fix:** Move the "Sent to the agent" / "Could not send" status `<p>` inside the `live.map` per-surface `<div>` alongside `inert={locked}`.

4. **Test coverage gap on lock/unlock across replay vs. fresh update** — `apps/web/src/components/chat/a2uiThread.browser.test.ts`
   - **Issue:** `seen`-based lock preservation on replay (divergence reset) and unlock on fresh `update=true` work as designed in `a2uiThread.ts`, but have no unit test in `a2uiThread.browser.test.ts`.
   - **Fix:** Add a unit test asserting that: (a) sending locks `"triage"`, (b) editing an earlier block triggers `reset()` without unlocking `"triage"`, and (c) appending a new `update=true` block unlocks `"triage"`.

5. **Skill snippet not visible in diff** — Plan item 2a.7
   - **Issue:** `docs/user/html-renders.md` was updated with `surface("<id>", update=true)`, but if there is an agent skill prompt/snippet in the repo (per 2a.7), it isn't in this diff. Verify whether t3code has a local skill file or if `docs/user/html-renders.md` is the sole doc artifact.

### 3. Must-Fix Before 2b & What 2b Should Watch For
**Must-fix before/with 2b:**
- Remove `!entry.message.streaming` from the `a2uiBlocks` filter in `MessagesTimeline.tsx` (Finding #2).
- Add the lock/replay/unlock unit test in `a2uiThread.browser.test.ts` (Finding #4).

**Watch for in 2b ("Open in panel"):**
- **Side-chat & multi-surface LRU:** If main chat and side-chat (or right panel) are mounted simultaneously, ensure `a2uiThreadStore(threadKey)` is keyed by `scopedThreadKey` consistently in both timeline and `RightPanelSurfaceContent.tsx` (binding item 6).
- **Timeline vs. panel single-live-copy stub:** When a surface is open in the right panel, the timeline block owning that surface must subscribe to `rightPanelStore` so it collapses to its panel stub immediately, and restores immediately when the panel tab closes.
- **Persistence stripping:** Double-check `rightPanelStore.ts:1200` and `partialize`/`migratePersistedRightPanelState` so `"a2ui"` tabs never survive reload as dead tabs.

### 4. Strengths
- **Clean derived state model:** `A2uiThreadStore.sync` + `seen` set handles StrictMode, out-of-order/edited history, and lock persistence across replays in under 190 LOC without React lifecycle hazards.
- **React Compiler safety:** Passing `version` into `store.view(blockKey, version)` cleanly prevents stale memoization under React Compiler.
- **Segmented `ChoicePicker` UX:** Restricting `ToggleGroup` to `≤4` options of `≤16` chars and preventing deselection (`if (next[0] !== undefined)`) matches radio semantics and mobile ergonomics.

---
## Fold-in (orchestrator, 2026-11-13)
- **Major 1 (multi-part atomicity): refuted by measurement.** `spikes/zod4-rn/multipart.mjs` on `@a2ui/agent@0.1.0`: a block of `surface("triage", update=true)` + `surface("other")` with an off-catalog `Iframe` is rejected before any part is yielded. Triage keeps `t1`, and no `other` surface is created. The same holds in reverse order, and for a runtime failure (an update to an unknown surface after a good update). A valid two-surface block applies both (control). `parseResponse` validates the whole block before applying it, so `apply` needs no rollback.
- **Major 2 (closed blocks in a streaming reply): confirmed and fixed.** `MessagesTimeline.tsx` filtered out `streaming` messages, but `TimelineAssistantRows` renders closed segments while the message streams, so they showed `A2uiPending`. `a2uiThreadBlocks` already keeps only closed segments. Dropped the filter: fork `496f6f3a`.
- **Minor 4: done.** A new store test: sending locks `triage`, an edited earlier block (replay) keeps it locked, and a fresh `update=true` unlocks it. Mutant check: with `fresh` forced true, the test fails; restored, it passes.
- **Minor 3 (per-surface footer): deferred to 2b**, which reworks `A2uiBlock` for the panel stub anyway.
- **Minor 5:** t3code ships no agent-side skill or system snippet; `docs/user/html-renders.md` is the item-7 artifact.
- The 2b watch-items (scopedThreadKey in both mounts, a stub that subscribes to the panel store, persistence strip at `rightPanelStore.ts:1200`) are already binding items 6/8 in the plan.
