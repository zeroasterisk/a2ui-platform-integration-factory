# t3code A2UI slice 2a CUJ (same-surface update)

GIFs: `t3code-a2ui-slice2a-cuj-1100.gif`, `t3code-a2ui-slice2a-cuj-412.gif`.

Setup: fork `zeroasterisk/t3code@a2ui` `037aceb5`, stock `vp run dev`, the `Replay (dev)` "Interactive reply" scenario, headless Playwright. No keys. In dev-replay turn 1 the reply is `surface("triage")`, and turn 2 is `surface("triage", update=true)`.

Flow: the form streams in. The user picks Revert for #415, types a note and presses Apply. The form locks. Turn 2 updates the same surface, and turn 1 collapses. Turn 3 is the off-catalog `Iframe`, which is blocked.

Measured at both widths (1100 and 412 px):
- after turn 2, `[data-a2ui-superseded]` = 1 and `[data-a2ui-surface]` = 1 (one live copy)
- "Triage applied" appears once and the "Apply triage" buttons count 0
- 0 iframes and 0 page errors
- the action summary line is `pr412: retry · pr415: revert · pr419: retry · notify: yes · note: Reverting 415, see thread`

Vision at 412 px:
- Turn 1 shows the muted line "Interactive reply updated below". There is no duplicate form, and nothing is clipped or overlapping.
- At 1100 px, before turn 2 the locked form is dimmed and keeps the note.
- Nit: the gaps around the user bubble are a little large. That spacing is stock t3code.
- Content nit: the turn-2 card's canned note text doesn't echo the user's note. This is expected, because the replay is scripted.

Ops:
- `/pair#token=` from the dev log was rejected (401 on `browser-session`).
- A token that works: `node src/bin.ts auth pairing create --dev-url http://localhost:5733` from `apps/server`, typed into `/pair`. The script is `~/agent/a2ui-pif/cuj/pair.py`.
- A stale `src/bin.ts` from an earlier run (holding `~/.t3`) has to be killed first.
