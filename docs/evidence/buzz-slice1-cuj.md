# Buzz A2UI slice 1 CUJ (2026-11-19)

Fork: `zeroasterisk/buzz-app@a2ui` `0a9df17`. Harness: `spikes/buzz/cuj.mjs` (copied into the buzz-app root and run there, never committed to the fork). It uses the host message gallery `?group=a2ui`, the real bundled renderer and a stub relay. Headless Chromium. No keys.

GIFs: `buzz-a2ui-slice1-cuj-1100.gif` (light) and `buzz-a2ui-slice1-cuj-412.gif` (dark, Narrow preview).

Journey: agent triage form → pick Quarantine → type a note → tick "Tell #release" → Apply → "Sent to the agent" with the form locked → the person's copy, the streaming block and the off-catalog `Iframe` reply.

Measured, identical at 1100 and 412 px:
- After Apply: 1 "Sent to the agent", 1 inert wrapper. Quarantine stays checked, the note is kept, the checkbox is kept, and the form doesn't overflow.
- The person's copy has 0 controls. The streaming block shows no `surface(`. The `Iframe` reply is blocked, with 0 iframes.
- No page overflow, 0 page errors.

Scope: the gallery's relay `reply` is a no-op, so the round trip (action → threaded reply text with edited context) is covered by Vitest (`A2uiMessage.test.tsx`), not this CUJ. A live-relay CUJ needs a Buzz relay plus an agent identity, deferred to slice 2.

Vision findings:
- A (fixed in `0a9df17`): the first shoot showed the sent form at full contrast. The wrapper was inert but unstyled, so Apply still looked live (the same issue as t3code slice-1 finding B). The locked wrapper now uses opacity 0.5, the host's disabled look for buttons. A new browser test checks inert, opacity < 1 and the kept values; the mutant without the class fails it. The re-shoot confirms the dimmed controls with the values kept.
- B (host, out of scope): the gallery intro and the hover toolbar crowd the edges at 412 px. The note value is truncated inside its input (normal input behaviour).
- C (carried): the title is barely heavier than the labels, because v1 basic `Text` has no heading variant (task 8 finding).

Gates after the fix: browser spec 4/4 (chromium, `--no-deps`), a2ui vitest 38/38, biome clean. tsc and `design:check` exit 0.
