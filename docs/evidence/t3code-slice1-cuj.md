# t3code A2UI slice 1 CUJ (2026-11-10)

Fork: `zeroasterisk/t3code@a2ui` `704e9ba6`. Stock `vp run dev`, `Replay (dev)` provider, model "Interactive reply" (`a2ui` dev-replay scenario). Headless Chromium (Playwright). No keys.

GIFs: `t3code-a2ui-slice1-cuj-1100.gif` (desktop), `t3code-a2ui-slice1-cuj-412.gif` (mobile).

Journey: prompt → streaming placeholder → triage form (3 radio groups, checkbox, text field, primary button) → user picks Revert for #415 and types a note → Apply → action sent as a visible user message (`a2ui-action` JSON) → turn 2 "Triage applied" card → prompt → turn 3 off-catalog `Iframe` reply shows "Interactive reply blocked" with Details.

Measured at both widths: all 3 turns rendered, `main iframe` count 0, 0 page errors. Action payload carried the edited state (`pr415:["revert"]`, the note text).

Vision findings (fix list for slice 1 review):
- A. After Apply, the sent form shows the note field empty, but the payload has the note. The locked form must keep the submitted values.
- B. Only the button locks ("Sent to the agent"). The checkbox and text field still look enabled.
- C. The user bubble shows raw action JSON. On mobile it wraps mid-token. Candidate: a one-line summary (action name + changed fields) with JSON behind a disclosure.
- D. Choice groups render as vertical radios. They read long on mobile. Segmented control is an option for ≤3 short options.
- E. A small stray glyph sits in the left gutter near messages. Not yet attributed (likely stock chrome); check before fixing.

Harness note: on mobile, t3code collapses the composer when it is unfocused (`isComposerCollapsedMobile`). That is stock behaviour, not ours. The CUJ taps the "Ask anything..." row to expand it.

## Slice-1 close re-shoot (2026-11-12)

Fork `zeroasterisk/t3code@a2ui` `11f0ddf3`. Same journey and harness (stock `vp run dev`, pairing link, `Interactive reply` dev-replay). GIFs above were replaced in place; the 2026-11-10 versions are in git history.

Measured at 1100 and 412 px: 3/3 turns render, `main iframe` 0, 0 page errors. DOM checks after Apply:
- A fixed: the locked note field still holds `Reverting 415, see thread`; checkbox stays checked.
- B fixed: the surface wrapper is `inert` and now visibly dimmed. The re-shoot showed the old wrapper was `display: contents`, so its opacity painted nothing; fixed in `11f0ddf3` with a browser assertion that fails on the old class.
- C fixed: the user bubble reads `pr412: retry · pr415: revert · pr419: retry · notify: yes · note: …`, wraps at word boundaries on mobile, payload behind a collapsed "Action payload" disclosure.
- D deferred to slice 2 (segmented control). E dropped (stock chrome).

Vision (412 px, after fix): form dimmed (subtle; host disabled token), note kept, summary clean, no clipping or overlap.
