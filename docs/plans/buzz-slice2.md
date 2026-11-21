# Buzz slice 2 plan: author routing, agent tools, links, thread hydration, live relay

Fork `zeroasterisk/buzz-app@a2ui` at `6c01c80` (slice 1 closed 2026-11-19 by `docs/reviews/argon-phase5b-slice1.md`). Binding inputs: that review's §4 (slice-2 inputs) and its deferred Major M3; recipe `recipes/buzz.md` §Slice 2 and §Prompt budget. Everything stays inside `src/bundled/a2ui/` unless a step says otherwise. Seams below were read at `6c01c80` (fork base `f307d59`).

## Order and gates
2.1 → 2.2 → 2.3 → 2.4 (one commit each, each with its own mutant check) → 2.5 live-relay CUJ → one Argon review at the slice-2 boundary. Canvas (recipe §Slice 2 "Canvas") is out of scope: decide after 2.5.

## 2.1 Per-surface author routing (closes Argon M3) — ✅ `6750a09`
Problem (verified): `A2uiBlock.tsx` calls `store.setSendMessage(onSendMessage)` in an effect, and `onSendMessage` closes over the block's `message.authorId`. The store has one sender, so the last-mounted block in a thread wins. In a thread with two agents, an action on agent A's surface can mention agent B.

Change:
- `a2uiMessage.ts`: `a2uiThreadBlocks` input widens from `{id, text}` to `{id, text, authorId}`, and `A2uiThreadBlock` gains `authorId` (`A2uiMessage.useThreadBlocks` already has the rows). `apply()` records `ownerBySurfaceId.set(id, block.authorId)` for every surface the block emits.
- The store-wide sender becomes `setSendMessage((text, authorId) => …)`; `send(action)` passes `ownerBySurfaceId.get(action.surfaceId)`. The sender set by any block now replies to the surface's owner, not its own author.
- Ownership rule: a surface is owned by the author of the block that **created** it. An `update=true` from a different author is rejected in `apply()` (result `{ok:false, error:"Surface <id> belongs to another agent"}` → the existing blocked note). Self-declared `isAgent` stays a valid trust signal (host squircle rule), but it can no longer take over another agent's surface.
- Tests (`a2uiThread.test.ts`): (a) two authors, two surfaces, action on A's surface → sender gets A; (b) B's `update=true` on A's surface → B's block blocked, A's surface unchanged. Mutant: owner lookup replaced by the block author → (a) fails.

## 2.2 Agent tools: `a2ui_rules` + `send_a2ui` — ✅ `b40398e` (validation via a scratch `A2uiThreadStore` replay; no `final` arg; posts via the agent relay session)
Seam: `ctx.agents.addTool(AddedTool)` (`src/buzz-mcp/session-tools.ts:46`); plugin tools are `load: "search"`, so they cost nothing per turn until found. Precedent: `github/index.tsx:157` (`github_link_pr`) posts through `ctx.agents.relay(client.key)` as the agent, using `context.channel` / `context.root`.
- `a2ui_rules` (no args): returns `ExpressPromptGenerator.generate()` for the basic catalog (21 875 B, measured). Built lazily on first call (dynamic import, so the 207 KB chunk never joins `main`).
- `send_a2ui` `{text, reply?, final?}`: splits `text` with `splitA2uiSegments`; every closed block is compiled with `ExpressFormat.createParser().parseResponse(source, {wrapped:false})` against a scratch `A2uiThreadStore` hydrated with the thread's existing closed blocks (so `update=true` validates against real state). On error it throws the compile error (a tool error the agent corrects). On success it posts with `session.messages.reply(context.channel, reply ?? context.root, text, [])`, or `send` at top level, and returns the message id. Unclosed blocks or zero blocks → error.
- `A2UI_POINTER` (`index.tsx`): add "Search for a2ui_rules before your first interactive reply; post with send_a2ui to have it checked." Must stay ≤1 KB (test asserts `Buffer.byteLength ≤ 1024`).
- Tests (Vitest, fake client + relay like `pull-state-tool.ts` tests): valid triage form → one `reply` call with the exact text; `Iframe` → throws, 0 posts; `update=true` on an unknown surface → throws. Mutant: skip validation → the Iframe case posts and fails.
- Open (record, don't guess): whether `send_a2ui` should honour `audience` / `request` like the host `send`. Default: omit; the agent can still use host `send` for plain text.

## 2.3 Links + strict matcher (two Argon minors) — ✅ `b9d521f` (also passes `canOpenLink={canOpen}`)
- `A2uiMessage`: take `{message, canOpen, open}` from `TargetOpener`; pass `onOpenLink={(url) => open(url)}` to `MessageMarkdown` (replaces `() => false`).
- `trust.ts`: `isA2uiMessage` requires `splitA2uiSegments(content).some((s) => s.kind === "a2ui")` instead of `includes("<a2ui>")`, so an inline mention or a fenced example stays a normal message. Cheap pre-check `includes("<a2ui")` kept first.
- Tests: `A2uiMessage.test.tsx` link click calls `open` with the URL; `trust` table: inline `<a2ui>` in prose and inside a ```` ``` ```` fence → false. Mutant: revert to `includes` → fence case fails.

## 2.4 Thread-view hydration (Argon §4.4) — ✅ `6035547` (0 host lines)
Problem: `useThreadBlocks` reads only `session.channels.window(channelId).rows`. In `ThreadPanel` (`features/messages/ThreadPanel.tsx`) replies come from a `ThreadView` (`relay/threads.ts:90`, `snapshot().replies`), which the channel window may not hold, and an old root scrolls out of the window. Then an `update=true` reply fails with "Surface not found".
Change:
- `useThreadBlocks` merges two sources, deduped by id: the channel window rows and, when `message.threadRootId` is set, an owned `session.thread(channelId, rootId)` reader (`relay/session.ts:2831`; capacity 64, dispose on unmount). Only opened when the window lacks the root.
- Missing earlier blocks while the reader loads → keep the `A2uiPending` look, never the blocked note; the store's replay (`sync` divergence) already rebuilds when earlier blocks arrive.
- Tests: a thread whose root is outside the window → the reply's `update=true` renders after the reader resolves; reader disposed on unmount. Mutant: no reader → blocked note shown.
- Budget check: if this needs a host-file change (e.g. ThreadPanel passing its view), stop and ask Argon for the seam; target 0 host lines.

## 2.5 Live-relay CUJ
Goal: prove the full round trip that slice 1 covered only in Vitest (gallery relay `reply` is a no-op).
- Relay: `block/buzz` `just relay` (local `ws://localhost:3000`, `docker-compose.yml`), via the persistent docker CLI. If it can't run in this sandbox, fall back to the in-process `createRelaySession` harness used by `relay/diff-messages.test.ts` and say so in the notes.
- Script `spikes/buzz/live-cuj.mjs`: a scripted agent identity posts via `send_a2ui` (turn 1 triage form); the person edits and applies in the app; the agent sees the `a2ui-action` reply with the edited `context` and the p-tag; agent turn 2 posts `surface("triage", update=true)`; turn 1 collapses to "Updated below" and the surface unlocks.
- Gate: GIF at 1100 light / 412 dark, 0 page errors, 0 iframes, exactly one live `[data-a2ui-surface]` for `triage`, the action reply's tags include the agent pubkey. Vision pass on 2 frames.

## Out of scope / upstream (queued on NEEDS_ALAN #2)
- Lit in the lazy chunk, `@a2ui/react` zod peer override, `@a2ui/agent` browser entry without `fs`/`path`, `update=true` in `EXPRESS_RULES`.
- Upstreaming `splitA2uiSegments` / action formatting into `@a2ui/agent` (Argon §5): raise with Alan at Phase 6 (principle 5), not now.
- `@a2ui/agent` TS macros: still 0.1.0 on npm; a2ui `main` @ `289923cb` has no macro commits.
