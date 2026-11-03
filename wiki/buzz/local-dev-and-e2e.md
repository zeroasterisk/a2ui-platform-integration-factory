---
type: Guide
title: Running Buzz locally for A2UI demos and e2e
description: Docker stacks, the relay, the mock-bridge Playwright smoke suite with a ready-made "agent posts a card" template, a scriptable fake ACP agent, and mobile widget tests.
resource: https://github.com/block/buzz/blob/ff6ab96/TESTING.md
tags: [buzz, e2e, playwright, docker, harness, fake-agent, testing, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# Tier 0: desktop UI only, no relay (fastest; recommended for the A2UI PR)

The desktop Playwright **`smoke` project** runs the built web bundle against a **mock Tauri bridge**. It needs no Rust, Docker or relay.

**Config:** `desktop/playwright.config.ts`
- baseURL `http://127.0.0.1:4173`, workers 1, retries 2 in CI (`:3-17`)
- project lists: `smoke` (`:20-…`) and `integration` (`:190-210`)
- webServer is `python3 -m http.server 4173 -d dist` (`:219-224`)

**Build:** use `pnpm build:e2e` (`tsc && vite build --mode e2e`, `desktop/package.json:9`). A plain build strips the bridge, and every spec then fails with "Cannot read properties of undefined (reading 'invoke')" (`AGENTS.md:533-545`).

**Run:** `cd desktop && pnpm test:e2e:smoke` (`package.json:21`), or `just desktop-e2e-smoke` (`Justfile:370-371`).

**Mock bridge:**
- `installMockBridge(page, mock?, options?)` (`desktop/tests/helpers/bridge.ts:1001-1012`)
- options include `seedPreviewFeatures`, for gating A2UI behind a preview flag
- mock identities, channels and UUIDs live in `desktop/src/testing/e2eBridge.ts`

**Template to copy:** `desktop/tests/e2e/doctor-cta-screenshots.spec.ts` already tests "an agent posts a fenced sentinel card into #general".
1. `makeNudgeSentinel()` builds a ```` ```buzz:config-nudge ```` body (`:68-81`).
2. `invokeMockCommand(page, "send_managed_agent_channel_message", {agentPubkey, channelId, content})` live-pushes it (`:88-102`).
3. The test asserts `page.locator("[data-config-nudge]")` (`:156`).

An `a2ui-card.spec.ts` is the same file with an ```` ```a2ui ```` body and a `[data-a2ui-surface]` locator. Register it under `smoke` `testMatch` (`AGENTS.md:528-531`).

**Screenshots without a spec:** `just desktop-screenshot --name a2ui --messages /tmp/msgs.json` (`Justfile:719-730`, JSON shape at `AGENTS.md:440-452`).

**Scoping rule:** keep locators scoped. Unscoped `getByText` is a strict-mode flake (`TESTING.md:29-31`).

# Tier 1: real relay + CLI-as-fake-agent

- **Setup:** `. ./bin/activate-hermit; cp .env.example .env; just setup; just relay` serves `ws://localhost:3000` (`AGENTS.md:145-152`).
- **Default docker-compose.yml services:**
  - postgres 17
  - redis 7
  - adminer
  - keycloak
  - minio (silo) + init
  - prometheus

  Defined at `docker-compose.yml:3-160`.
- **Isolated stack:** `docker-compose.harness.yml` is a separate `buzz-harness` project with ports postgres 5471, redis 6471, minio 9471/9472. Start its relay with `scripts/start-isolated-test-relay.sh` on 3030 (`docker-compose.harness.yml:1-13`).
- **Seeding:**
  - `scripts/seed-local-community.sh` seeds host→community rows; the relay fails closed without them.
  - `just seed-long-thread`.
  - Relay-backed Playwright helpers: `desktop/tests/helpers/seedRelay.ts:683` `seedScenario`.
- **Fake agent = the CLI.** Generate a key and create a channel, then post the A2UI body as the agent identity: `printf '...```a2ui\n{...}\n```' | buzz messages send --channel $C --content -` (`TESTING.md:231-258`). This is deterministic and needs no LLM.
- **Desktop against the relay:**
  - `just dev` runs the full Tauri app.
  - `just desktop-dev` runs web only (`AGENTS.md:629-632`).
  - `pnpm test:e2e:integration` runs the relay-backed Playwright suite (`AGENTS.md:399-401`).

# Tier 2: real ACP agent loop

- `buzz-acp` runs any ACP agent: `BUZZ_ACP_AGENT_COMMAND`/`_ARGS` (`crates/buzz-acp/README.md:116-117`, `TESTING.md:320-400`).
- `just goose` needs goose plus an LLM key (`Justfile:1351`). Alternatively, use `buzz-agent` against any OpenAI-compatible endpoint (`crates/buzz-agent/README.md:34-66`).
- **Scripted fake ACP agent.** Any binary that does `initialize` → `session/new` → `session/prompt` → `stopReason` works (`README.md:373-382`). buzz-acp's own tests already spawn fake adapter scripts (`crates/buzz-acp/src/acp.rs:3239-3247`, `:3910`). A small script that answers every prompt by running `buzz messages send` with a canned A2UI block gives a deterministic action round trip:

  user clicks → kind:9 action reply with `p`-tag → harness wakes agent → agent posts an updated surface.

- **Gotcha:** the agent must be a channel member, or it "sits idle" (`TESTING.md:343-346`). Replies take 10–90 s, and stdout stays quiet (`TESTING.md:394-396`).

# Mobile

- Checks: `just mobile-check` (dart format + analyze) and `just mobile-test` (`Justfile:1038-1046`). For Dart-only changes, run `just mobile-install mobile-check mobile-test` instead of `just ci` (`AGENTS.md:163-165`).
- Widget tests for message rendering already exist in `mobile/test/features/channels/`: `message_content_*_test.dart`, `message_content_bubble_cases.dart`. Add `message_content_a2ui_test.dart` next to them.
- Mobile README favors "a few journey tests that drive real user flows" (`mobile/README.md:290-293`).
- There is no `integration_test/` dir. Simulator screenshots go through `scripts/post-screenshots.sh` (`AGENTS.md:409-416`).

# Rust e2e

- `cargo test -p buzz-test-client -- --ignored` against a running relay (`TESTING.md:5-17`).
- Suites: `crates/buzz-test-client/tests/e2e_*.rs`.
- Only needed if a new kind is added. Seam A in [extension points](extension-points.md) needs none.

# Feasibility verdict

| Goal | Feasible? | Cost |
|---|---|---|
| Desktop A2UI card e2e (render + click → outbound send captured by mock) | **yes, high** | 1 spec, mock bridge, no infra |
| Mobile render test | yes | widget test, `flutter test` |
| Full relay + scripted agent demo | yes | Docker + cargo build; no LLM needed with the CLI or a fake ACP agent |
| Live LLM demo (goose/buzz-agent) | yes | needs LLM credentials (ask user) |

**Not verified here:** none of these were executed in this research pass. No `pnpm install` or cargo build was run.

Related: [standards](contribution-standards.md), [integration shape](a2ui-integration-shape.md), [index](index-fragment.md)
