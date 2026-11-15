# t3code A2UI slice 2b CUJ ("Open in panel")

GIFs: `t3code-a2ui-slice2b-cuj-1100.gif`, `t3code-a2ui-slice2b-cuj-412.gif`.

Setup: fork `zeroasterisk/t3code@a2ui` `8dba076b`, stock `vp run dev`, the `Replay (dev)` "Interactive reply" scenario, headless Playwright, no keys. Script: `~/agent/a2ui-pif/cuj/cuj4.py` (operator workspace, not committed).

Flow:
1. The form streams in.
2. The user presses "Open in panel" (icon button). At 1100 px it opens as a right-panel tab; at 412 px it opens as a sheet.
3. In the panel, the user picks Revert for #415, types a note and presses Apply.
4. The panel locks and shows "Sent to the agent".
5. Turn 2 (`surface("triage", update=true)`) updates the same surface, and the panel shows "Triage applied".

Measured at both widths (1100 and 412 px), identical results:
- After open: `[data-a2ui-panel]` = 1, timeline `[data-a2ui-in-panel]` stub = 1, "Apply triage" buttons = 1 (one live copy).
- After Apply in the panel: "Sent to the agent" = 1, panel `[data-a2ui-locked]` = 1. The action line is `pr412: retry · pr415: revert · pr419: retry · notify: yes · note: Reverting 415, see thread`, so the panel edits reached the action.
- After turn 2: "Triage applied" = 1, turn-1 `[data-a2ui-superseded]` = 1, the in-panel stub = 1, the panel is still mounted (`missing` = 0), "Apply triage" buttons = 0.
- 0 iframes, 0 page errors.

Vision:
- At 412 px the "Open in panel" icon sits right-aligned on its own row above the form. It doesn't overlap anything or get clipped.
- At 412 px the sheet shows the full form, and Apply is visible. The right margin is tight (~10 px).
- After turn 2 at 412 px, the "Triage applied" card is fully visible, with nothing clipped.

Findings (minor, none block):
1. The stock "Enjoying T3 Code? Star on GitHub" toast covered the top of the panel on the first runs. That's host chrome; the CUJ now dismisses it.
2. In the timeline, turn 1 reads "Interactive reply updated below". The live copy is actually in the panel, but turn 2's row below does say "open in panel · Show", so the pointer still leads there.
3. "Show" is still rendered while the panel is already open (it refocuses the tab). Possible polish: hide it when the a2ui tab is active.
4. The turn-2 card's canned note doesn't echo the user's note. Expected, because the replay is scripted.
