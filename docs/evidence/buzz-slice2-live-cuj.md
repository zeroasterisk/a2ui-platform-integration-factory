# Buzz slice 2.5: live round-trip CUJ

Commit: `zeroasterisk/buzz-app@a2ui` `68be1ee`. Spec: `tests/browser/a2ui-live.spec.mjs` (Playwright, chromium, `--workers 1`).
GIFs: `buzz-a2ui-slice2-live-cuj-1100.gif` (light) and `buzz-a2ui-slice2-live-cuj-412.gif` (dark). Frames come from `A2UI_CUJ_DIR=<dir>`.

## Relay
`block/buzz` `just relay` needs docker. The sandbox's docker CLI is blocked here, so this runs the plan's fallback, which is stronger than the `createRelaySession` unit harness: the real app build behind the **production broker**, with the fixture's modeled upstream WS/HTTP relay (`productionBroker: true`). The agent identity signs real kind 9 events (nostr-tools) and the relay delivers them live. The person's Apply goes out through the app's real outbox and lands in `report.publications`. A docker `just relay` run is still open, and it does not block.

## Journey (both viewports pass)
1. Agent turn 1 posts the triage form at top level. It renders as native controls.
2. The person picks Quarantine, types a note and clicks Apply. The result is "Sent to the agent" with an inert lock.
3. The published kind 9 has `["p", agent]`, `["e", turn1, "", "reply"]` and the a2ui-action payload `{surfaceId: "triage", name: "apply", context: {choice: ["quarantine"], note: "Quarantining until #415 lands"}}`.
4. Agent turn 2 posts `surface("triage", update=true)` in the thread. Turn 1 collapses to "Updated below" in the channel.
5. The thread panel shows "Quarantined: flaky-login". It is live: Release can be picked.
6. Gate: 0 iframes, 0 `[data-a2ui-locked]`, exactly one live triage `[data-a2ui-surface]`, 0 unexplained page errors.

## Bug found and fixed
The channel window holds only top-level rows. A root whose surface was updated by a thread reply never saw the update and stayed live, which left two live surfaces for one id. A root with `replyCount > 0` now opens the bounded thread reader too. It keeps drawing while the reader loads (only a reply waits for its root). Vitest covers this, and the mutant (`needed = false` for roots) fails the test.

## Setup note (test, not product)
Mentions are validated against channel membership, so the posting agent is served as an `alpha` member. Without that, Apply shows "Couldn't send. Try again." This is correct host behavior: an agent that posts in a channel is a member.

## Vision pass (2 frames)
- 1100 `updated`: updated card at full contrast with Release selected. Turn 1 shows "Updated below" in both the channel and the thread root. Nits are host-owned: the hover toolbar covers the agent timestamp, and the action reply's JSON fence clips at the bubble edge.
- 412 `sent`: Quarantine is selected, the controls are dimmed, and "Sent to the agent" shows. No horizontal overflow. Nits: the locked note field clips "Quarantining un…" without an ellipsis (TextField single-line), and the dimmed Apply label is low-contrast on dark (borderline).

## Measured
- a2ui vitest 54/54, `tsc --noEmit` 0, biome clean, pre-commit hooks pass.
- Browser: `a2ui-live.spec.mjs` + `a2ui.spec.mjs` 6/6.
- Diff: +13/-3 in `A2uiMessage.tsx`, +41 test, +~160 spec, 0 host lines.
- Two workers with `--repeat-each 2` crashed Chromium (SIGKILL, sandbox memory). Run with one worker.
