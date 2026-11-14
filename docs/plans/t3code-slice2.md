# t3code slice 2 plan: same-surface updates + canvas panel

Fork `zeroasterisk/t3code@a2ui`. Builds on slice 1 (closed 2026-11-12). Binding inputs: factory.md fold-in §2 (surface state per thread, superseded rows collapse), Argon slice-1 review (D deferred here, turn-2 same-surfaceId Minor).

## Precondition spike (measured 2026-11-12)
`factory/spikes/zod4-rn/same-surface.mjs`, `@a2ui/agent@0.1.0` + `@a2ui/web_core@0.15.0`:
- One `MessageProcessor` + `RendererState.of(processor)` passed as `parseResponse(text, {state})` across turns. The state applies messages to the processor itself; also calling `processMessages` double-applies (`Surface triage already exists`).
- Turn 1 `surface("triage")` creates; turn 2 `surface("triage", update=true)` emits only `updateComponents`. Same `SurfaceModel` object, new text rendered.
- Turn 2 without state is rejected (`Surface not found for message: triage`). So today's per-block compile cannot do updates. Slice 2 must hold state per thread.
- Bare `surface("triage")` on turn 2 is rejected (`already exists`). `update=true` is required, and the upstream Express rules (`EXPRESS_RULES` §15) don't teach it. So the host skill snippet has to teach it, and we file it as an upstream ask (queued with NEEDS_ALAN #2).

## Slice 2a: same-surface updates in the timeline
1. `apps/web/src/components/chat/a2uiThread.ts` (new, ~60 LOC): `useA2uiThread(threadRef)` returns one processor + `RendererState` per thread (module `Map` keyed by `scopedThreadKey`; dropped when the thread unmounts). `apply(messageId, offset, source)` runs `parseResponse(source, {state, wrapped:false})` once per (message, offset). It returns `{surfaceIds}` or `{error}`. The key is idempotent, so re-renders and StrictMode never re-apply.
2. `A2uiBlock.tsx`: compile through the thread processor instead of its own. A block whose surfaceIds were all updated by a **later** block renders a read-only stub, "Updated below" (host muted text + jump link). Fold-in §2 says stale `context` can't be submitted. A block that creates no new surface and only updates (turn 2) renders the live surface where it is. The earlier row collapses, so one live copy stays in view.
3. Lock semantics: `sent` state moves to per-surface (keyed by surfaceId) inside the thread store. An update to a sent surface unlocks it (the agent answered).
4. Failure: an update to an unknown surface (e.g. history trimmed) falls back to the existing "Interactive reply blocked" note with the error. Never raw DSL.
5. Dev replay: `a2ui_transcript.ndjson` turn 2 becomes `surface("triage", update=true)` (closes the Argon Minor). The dev-replay test asserts that turn 2's block carries `update=true` and the same id as turn 1.
6. D (segmented choice): `ChoicePicker` with `mutuallyExclusive` and ≤4 options of ≤16 chars each renders the host `ToggleGroup` (`components/ui/toggle-group.tsx`). Otherwise it renders as today. Mobile-first.
7. Skill snippet / user doc: one line on `surface("<id>", update=true)` for follow-up turns.

Tests:
- Shared/unit: thread store idempotency (apply twice → one surface), update-before-create → error.
- Browser (`A2uiBlock.browser.test.tsx`): two blocks in one thread, second `update=true` → first renders "Updated below", second shows new text, exactly one `[data-a2ui-surface]` live for `triage`. Plus the segmented `ChoicePicker` renders `role=group` with toggle buttons.
- Gate: dev-replay CUJ re-shot at 1100/412 px, 3 turns, turn 1 collapsed after turn 2, 0 iframes, 0 page errors. Web `tsc`, hooks (fmt, lint, knip).

## Slice 2b: "Open in panel" (canvas)
A right-panel tab that renders a thread surface live. MCP Apps can't do this (they're pinned to the tool row).
- Host fit (read 2026-11-12): `rightPanelStore.ts` `RIGHT_PANEL_KINDS` + `RightPanelSurface` union. Exhaustive `switch` sites for a new kind: `RightPanelTabs.tsx` (2), `chat/RightPanelSurfaceContent.tsx`, `closedViewStore.ts`, `reopenClosedView.ts`, `ReopenClosedViewShortcut.tsx`, `hooks/useRightPanelSurfaceClose.ts`. Precedent: `side-chat` (id `side-chat:<threadId>` + `openSideChat`).
- New kind `a2ui`: `{ id: "a2ui:<surfaceId>", kind: "a2ui", surfaceId }` + `openA2uiSurface(ref, surfaceId)`. Content = `<A2uiSurface>` from the same thread processor (2a), so panel and timeline share one `SurfaceModel`. Edits in one show in the other, by construction.
- Timeline row: the surface header gets an icon button "Open in panel" (host `Button` ghost/icon size). When the panel shows a surface, its timeline copy renders "Open in panel" as the stub, so one live copy stays interactive.
- Closed-view/reopen: never persisted or reopened (surface state lives in memory). See fold-in item 4 (skip at `rightPanelStore.ts:1200`).
- Diff budget: ~8 host files touched, about 40 lines outside new files. If it grows past ~80, stop and ask Argon for a smaller seam.
- Tests: browser test that opening the panel and editing a field there shows the edit in the timeline stub's restore, and the action from the panel sends the same `a2ui-action` message. CUJ at 1100 px (panel) and 412 px (the panel becomes a sheet via `RightPanelSheet`).

## Order and gates
2a.1–2a.5 (one commit) → 2a.6 D (one commit) → 2a CUJ + Argon review → 2b → 2b CUJ → phase-5 close review.

## Open / upstream asks
- Teach `update=true` in `EXPRESS_RULES`/`SkillGenerator` (agents otherwise fail turn 2 with "already exists"). Queue with NEEDS_ALAN #2 (zod/v3 + lit-free subpath). Don't file without Alan.
- `@a2ui/agent` TS macros: still 0.1.0.

## Argon plan review fold-in (2026-11-12, `docs/reviews/argon-phase5-slice2-plan.md`, go-with-changes)
Verified before folding: `parseResponse(block, {state, wrapped:false})` also updates through the state (spike re-run, same output). The closed-view skip is `rightPanelStore.ts:1200`. `browser:new` *is* remembered; the plan's "mirror browser:new" was wrong.

Binding changes:
1. **State is derived, not accumulated** (Critical). `a2uiThread.ts` replays the thread's ordered, *closed* blocks `[(messageId, offset, source)]`. If any earlier tuple changes (edit, regenerate, truncation, out-of-order load), it resets the processor and replays from the start. Streaming/unclosed blocks never apply.
2. **Observable store** (Critical). `useSyncExternalStore` with `latestBlockBySurfaceId` + `sentBySurfaceId`, so turn 1 re-renders to "Updated below" when turn 2 applies.
3. **No drop on unmount** (Major). StrictMode remounts would wipe it. Evict with the thread (LRU or the host's thread removal) instead.
4. **Panel kind stays out of persistence** (Major). Exclude `"a2ui"` from `open`/`toggle`/`singletonSurface`. Strip it in `migratePersistedRightPanelState`/`partialize` and add it to the closed-view skip at `rightPanelStore.ts:1200`. This avoids touching `closedViewStore.ts`, `reopenClosedView.ts` and `ReopenClosedViewShortcut.tsx`, so the 2b diff is about 5 host files.
5. **Collapse per surface**, not per block (Minor).
6. **Panel payload carries the thread**: `{id: "a2ui:<threadKey>:<surfaceId>", kind: "a2ui", threadKey, surfaceId}`, because side-chats route to the host panel (Minor).
7. **Action routing**: the thread store holds a mutable ref to the thread's `onSendAppMessage`. `onAction` sets `sentBySurfaceId[action.surfaceId]`.
8. **Reorder**: D (segmented `ChoicePicker`) lands first as its own commit, then 2a.1–2a.5.

## Argon 2b.1 seam review fold-in (2026-11-14, `docs/reviews/argon-phase5-slice2b1.md`, cut seam before CUJ)
Verified before folding: `git diff --numstat 496f6f3a 8b9d0c01` gives upstream host files RightPanelTabs 5, RightPanelSurfaceContent 7, reopenClosedView 3, rightPanelStore 43 = **58 added lines** (under the ~80 stop line, over the ~40 target). A2uiBlock (76) and a2uiThread (10) are our own slice-1/2a files, so the 144 figure overcounted. `a2uiThread.setSendMessage(undefined)` already clears the sender, so Argon Minor 3 is already handled.

Binding changes before the 2b CUJ:
9. **Seam A**: move the per-surface row (panel stub, "Open in panel" button, `inert` wrapper, per-surface Sent/failed footer) and the panel selector/open plumbing out of `A2uiBlock.tsx` into a new `A2uiSurfaceRow` (+ `A2uiSentNotice`) shared with `A2uiPanel`. This removes the duplicated lock wrapper and footer.
10. **Seam B**: compact `withoutA2uiSurfaces` in `rightPanelStore.ts` to an inline filter in `partialize`/migrate. Keep it in the store: never import chat components into the root store. Target ≤45 upstream host lines.
11. **Seam C** (reuse `side-chat`/`preview` kind): rejected. It would pollute closed-view history and tab chrome.
12. **Test owed**: edit in the panel → close the panel → the timeline shows the edit; an action from the panel → `onSendMessage` gets the same `a2ui-action` with the edited value.
13. Minor: `new Set(inPanelIds ? inPanelIds.split("\n") : [])`, so an empty selector doesn't yield `{""}`.
