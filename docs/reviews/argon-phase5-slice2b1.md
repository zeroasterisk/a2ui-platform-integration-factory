### 1. Verdict
**Cut the seam before the 2b CUJ.** `A2uiBlock.tsx` grew by 76 lines, pushing total host-file additions to 144 (nearly double the ~80 stop-line) because `A2uiBlock.tsx` acts as a "host file" in the diff measurement and absorbed panel-routing, zustand selector plumbing, and per-surface row rendering.

*(Note: `A2uiBlock.tsx` is our own file from Slice 1, not an upstream t3code file! True upstream host files—`rightPanelStore.ts`, `RightPanelTabs.tsx`, `RightPanelSurfaceContent.tsx`, `reopenClosedView.ts`—total **58 lines**, well under the 80-line stop-line. However, if the metric counts `A2uiBlock.tsx` as non-new in 2b.1, extracting its panel/row logic cleanly fixes both the metric and component cohesion.)*

---

### 2. Seam Options

- **Option A: Extract per-surface row + panel hook into `A2uiPanel.tsx` (or new `A2uiSurfaceCard.tsx`).**
  Move the `parseScopedThreadKey` / `useRightPanelStore` selector / `openA2uiSurface` plumbing and the per-surface JSX (`inPanel` stub, "Open in panel" button, `inert` wrapper, per-surface `sent`/`failed` footer—which is duplicated in `A2uiPanel.tsx` anyway) out of `A2uiBlock.tsx` into `A2uiPanel.tsx` as a named export `<A2uiSurfaceRow>` + shared `<A2uiSentNotice sent={sent} />`.
  - *Files moved:* `A2uiBlock.tsx` → `A2uiPanel.tsx`.
  - *Estimated host lines saved:* **~65 lines** in `A2uiBlock.tsx` (total diff outside new files drops from 144 to ~79; true upstream host diff remains 58).
  - *Recommend:* **Yes.** Deduplicates the `inert` wrapper and `sent`/`failed` footer between timeline and panel, and restores `A2uiBlock.tsx` to a 50-line block coordinator.

- **Option B: Inline `withoutA2uiSurfaces` and `a2uiSurface` in `rightPanelStore.ts` (or move `withoutA2uiSurfaces` to `a2uiPanel.ts`).**
  In `rightPanelStore.ts`, `a2uiSurface` is only needed externally by tests; `withoutA2uiSurfaces` (14 lines) can be a 5-line inline filter inside `partialize` or imported from `components/chat/A2uiPanel.tsx` (or `a2uiThread.ts`). Also, if `partialize` strips `"a2ui"`, `migratePersistedRightPanelState` only needs the `kind === "a2ui"` guard if a pre-partialize dev build wrote to localStorage—keep that 1-token check, cut the helper.
  - *Files moved:* `rightPanelStore.ts` → inline / `A2uiPanel.tsx`.
  - *Estimated host lines saved:* **~14–20 lines** in `rightPanelStore.ts` (bringing true upstream host lines down to ~38–44, hitting the ~40 target).
  - *Recommend:* **Yes** (inline/compact in `rightPanelStore.ts`; don't import chat components into a root store).

- **Option C: Reuse an existing `RightPanelKind` (e.g. `preview` or `side-chat`) instead of adding `"a2ui"`.**
  - *Files moved:* `rightPanelStore.ts`, `RightPanelTabs.tsx`, `RightPanelSurfaceContent.tsx`, `reopenClosedView.ts`.
  - *Estimated host lines saved:* ~30 lines.
  - *Recommend:* **No (churn / hack).** Overloading `side-chat` or `preview` pollutes closed-view history, persistence, and tab icons/titles with magic string prefixes. The 4-line switches in `RightPanelTabs` and `RightPanelSurfaceContent` are idiomatic host code.

---

### 3. Findings by Severity

- **Major — `A2uiBlock.browser.test.tsx`: Missing plan-mandated round-trip & restore tests.**
  - *Issue:* The slice 2b plan requires a browser test verifying that (1) editing a field in the panel and closing the panel preserves the edit when restored to the timeline, and (2) triggering an action from the panel sends the expected `a2ui-action` payload via `onSendMessage`. Currently, the test only checks static text visibility on open (`onSendMessage={undefined}`).
  - *Fix:* Extend the browser test with the `FORM` fixture: open in panel → change `ChoicePicker` to `"revert"` → close surface via `closeSurface` → verify timeline re-renders with `"revert"` selected → re-open or click action in panel → assert `onSendMessage` receives the `"revert"` context.

- **Minor — `A2uiBlock.tsx:47-58`: Empty-string split edge case & `surfaceId` delimiter in selector.**
  - *Issue:* `"".split("\n")` produces `[""]`, so `inPanel` is `new Set([""])`. Benign unless a surface has `id: ""`, in which case it falsely renders as "Interactive reply open in panel".
  - *Fix:* `const inPanel = new Set(inPanelIds ? inPanelIds.split("\n") : []);` (and move into the extracted hook/component from Option A).

- **Minor — `A2uiPanel.tsx:25`: Side-chat / unmounted-timeline `canSend()` lock edge case.**
  - *Issue:* `store.canSend()` relies on `this.sendMessage` having been set by a rendered `A2uiBlock`. If a side-chat opens a surface into the host thread's right panel and the side-chat later closes/unmounts, or if `A2uiBlock` passes `onSendMessage={undefined}` on a later render, `this.sendMessage` stays stale or unset.
  - *Fix:* Acceptable for 2b.1 since `A2uiBlock` updates `store` on render, but ensure `a2uiThread.ts` clears or updates `sendMessage` even when `onSendMessage` becomes `undefined`.

*(Checked and verified clean: `parseScopedThreadKey` safely returns `null` on un-scoped keys; zustand `.join("\n")` selector returns a primitive string so `Object.is` prevents re-render loops; single live `SurfaceModel` holds across open/close because React commits both trees from the same synchronous zustand update; persistence & closed-view skip cover all write paths.)*

---

### 4. Must-Fix Before the 2b CUJ
1. **Execute Seam Option A (+ Option B):** Extract `<A2uiSurfaceRow>` (and shared `<A2uiSentNotice>`) into `A2uiPanel.tsx` and compact `withoutA2uiSurfaces` in `rightPanelStore.ts` to bring total non-new host lines under the 80-line stop-line (~60 lines total, ~40 in upstream host files).
2. **Add the panel edit → restore + panel action send assertions** to `A2uiBlock.browser.test.tsx`.

---

### 5. Strengths
- **Zero-leak persistence boundary:** Stripping `a2ui` in `partialize`, `migratePersistedRightPanelState`, `reopenClosedView`, and the `closedViewStore` subscriber is airtight and cleanly tested.
- **Shared model by construction:** `A2uiPanel` reading `store.panelView(surfaceId, version)` via `useSyncExternalStore` avoids state synchronization bugs between the timeline and right panel.
