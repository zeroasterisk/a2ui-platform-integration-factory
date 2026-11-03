---
type: Guide
title: Running t3code locally for A2UI demos and e2e (Replay provider, test rules)
description: Dev runner, isolated state rules, free Replay (dev) ACP provider with hand-written transcripts, browser test conventions.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/docs/operations/development.md
tags: [t3code, testing, dev-runner, replay, e2e, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Dev runner

- `vp i` install; `vp run dev` = server + web (`package.json:7` → `scripts/dev-runner.ts`);
  `vp run dev:desktop` for Electron (`docs/operations/development.md:51-58`).
- Worktrees use their own `.t3/userdata`; main checkout defaults to `~/.t3/dev`; `--home-dir`
  wins (`development.md:60-67`; `AGENTS.md:82`). Read real ports from the `[dev-runner]` line.
- First start seeds DB from a **read-only copy** of `~/.t3/userdata/statev2.sqlite` (≤500 MiB);
  `--no-seed`/`T3CODE_DEV_SEED=0` skips; `vp run migrate-dev-db` refreshes (`AGENTS.md:89-97`).
- Three ways to hurt yourself (`AGENTS.md:59-63`): never kill by pattern; **never write to or start
  a server against `~/.t3/userdata`**; never set `VITE_HTTP_URL`/`VITE_WS_URL`.
- Remote/tailnet sharing: `vp run dev --share`, use the printed `pairingUrl:` (`AGENTS.md:84`).

# Free fake provider: `Replay (dev)`

- Dev servers from source auto-register provider instance `devReplay`, driver `acpRegistry`,
  running `apps/server/scripts/dev-replay-agent.ts`
  (`apps/server/src/provider/ProviderInstanceRegistryHydration.ts:83-120`).
- It replays ACP ndjson transcripts with simulated streaming through the **real ACP adapter,
  orchestration and UI** (`dev-replay-agent.ts:1-8`; `development.md:76-88`). Each scenario is a
  "model"; each prompt plays the next recorded turn.
- Scenarios table `dev-replay-agent.ts:44-67`; hand-written showcase
  `apps/server/scripts/dev-replay/showcase_transcript.ndjson` (18 lines). Replayed updates:
  `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan*`,
  `session_info_update`, `usage_update` (`dev-replay-agent.ts:70-80`).
- Drive it: `Ctrl+Alt+Shift+R` picker, `window.t3dev.replay("showcase")`, or
  `node apps/server/src/bin.ts thread start --base-dir .t3 --provider devReplay --model showcase <project> "go"`
  (`.agents/skills/test-t3-app/SKILL.md:24-35`).

**A2UI e2e feasibility: high.** Add `{ id: "a2ui", file: "./dev-replay/a2ui_transcript.ndjson" }`
whose turns emit `agent_message_chunk` text containing a fenced ```a2ui block (Option A) — or a
`tool_call`/`tool_call_update` pair with `_meta.is_mcp_tool_call`, `rawInput {server:"t3-code",
tool:"a2ui_render"}` and the result (Option B; identity rules
`packages/provider-acp/src/server/runtimeModel.ts:1085-1097`). Turn 2 replays on the user's action
message, showing the round-trip. No paid model, no network.

Caveat: the replay agent does not execute MCP tools; for Option B the transcript must carry the
tool result itself, so server-side handler logic is exercised only in unit tests.

# Test rules (`docs/internals/testing.md`, mirrored in `AGENTS.md:99-140`)

- Test behavior that can break (protocol translation, external-format parsing, persistence); skip
  tests for typed guarantees, copy, static markup (`testing.md:5`). **A2UI parsing/validation is
  "external-format parsing" → needs focused unit tests** in `packages/shared`.
- Extend existing tables before adding `it`; test at the lowest layer that fails on `main`
  (`testing.md:6-7`) — e.g. add a row to `packages/shared/src/toolOutput.test.ts` for a new marker.
- No sleeps/polling/timeouts; `it.effect` on `TestClock`; drain `OrchestrationEffectWorkerV2`
  (`testing.md:14-22`). Lint enforces (`t3code/no-wall-clock-in-tests`, etc.).
- Browser tests: `*.browser.test.tsx`, `await using screen = await render(...)` from
  `apps/web/test/render.tsx` (`testing.md:26-41`); assert with `expect.element`/`vi.waitFor`.
  Precedents: `HtmlRenderFrame.browser.test.tsx`, `MessagesTimeline.browser.test.tsx`.
- Before push: `vp run check:changed` (`package.json:30`); iterate with `vp test run <files>`;
  `vp run typecheck`. **No repo-wide checks** (`AGENTS.md:101-109`).
- UI changes need one integrated pass in a real client: `test-t3-app` (web, built-in Browser
  panel) / `test-t3-mobile`; PRs need before/after screenshots (`AGENTS.md:138,154`).
- Mobile: `vp run mobile:install <ios|android>` installs a cached dev client (`AGENTS.md:142`).

See also: [contribution rules](./contribution-rules.md), [integration shape](./a2ui-integration-shape.md).
