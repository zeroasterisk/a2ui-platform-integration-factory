---
type: Guide
title: Running Paseo locally, e2e, standards, and PR bar
description: Dev daemon/web UI, Docker, mock provider, Playwright plugin e2e conventions, coding/testing standards, CONTRIBUTING QA bar, skills.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/docs/testing.md
tags: [paseo, dev, testing, e2e, qa, contributing, skills]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Local dev, e2e, standards, PR bar

## Running locally
- `npm run dev:server` → daemon on `127.0.0.1:6768`. `npm run dev:app` → Expo web at `http://localhost:8081` (docs/development.md:8-31). Keep 6767 for the packaged daemon. **Never restart the main 6767 daemon** (AGENTS.md:127).
- Bundled web UI: `paseo daemon config set features.webUi.enabled true` or `PASEO_WEB_UI_ENABLED=true` (docs/development.md:477-500).
- Docker: `docker run -p 6767:6767 -e PASEO_PASSWORD=… -v $PWD/paseo-home:/home/paseo ghcr.io/getpaseo/paseo:latest` → http://localhost:6767 (docs/docker.md:27-46). The image ships no agent CLIs; extend it (docs/docker.md:73-90).
- Plugins: `paseo plugin install /abs/dir` with `pluginsEnabled: true` (docs/plugins.md:9-30).

## Providers without paid creds
- **`mock` (Mock Load Test)** is development-only. It registers when the daemon runs with `PASEO_NODE_ENV=development` (packages/server/src/server/config.ts:634; provider-registry.ts:769-771, 227; packages/protocol/src/provider-manifest.ts:262-267). Desktop dev sets this (docs/development.md:22-24).
- It streams scripted text. `featureValues.mockStreamingAssistantResponse` and `…IntervalMs` set the exact assistant text (packages/server/src/server/agent/providers/mock-load-test-agent.ts:821-830). Prompt phrases trigger plan approval, turn failure, questions, etc. (mock-load-test-agent.ts:261-500). It **does not call plugin agent tools**, so Option A of [a2ui-integration](a2ui-integration.md) needs a real provider or a direct `timeline.append` from an RPC in tests.
- `mock-slow` is gated by `PASEO_ENABLE_MOCK_SLOW` (mock-slow-provider.ts:33). `plugin-examples/provider-direct` is a full plugin-implemented provider (README.md:1-12). Pi has a fake RPC fixture (packages/app/e2e/fixtures/fake-pi-rpc.mjs).

## Playwright e2e conventions
- Specs go in `packages/app/e2e/browser/*.spec.ts` and harness code in `e2e/support/` (docs/testing.md:171). Each worker gets an isolated daemon + `PASEO_HOME`, with one warmed Metro (docs/testing.md:192). Run targeted specs only, never the full suite (docs/testing.md:186-191).
- Model to copy: `browser/plugin-timeline.spec.ts`. It uses `seedMockAgentWorkspace` (support/helpers/mock-agent.ts:31-50, `provider:"mock"`). It writes a directory plugin (`paseo-plugin.json` + `index.client.tsx`), patches `pluginsEnabled`, `installDirectoryPlugin`, and runs at widths 1100 and 390 (support/helpers/plugin-timeline.ts:137-200; plugin-timeline.spec.ts:14-40). It even checks reload/reconnect recovery.
- Other plugin specs: plugin-workspace-panels, plugin-theme, plugin-host-ui, plugin-buttons, plugin-subscription-examples.
- Test types: `*.test.ts` unit, `*.e2e.test.ts` real daemon, `*.real.e2e.test.ts` real provider creds (docs/testing.md:162-169). Only two categories are allowed: ports/adapters unit tests and real e2e. No JSDOM or mocked transport (docs/testing.md:236-243). Real deps over mocks (docs/testing.md:68-76).

## Coding standards (docs/coding-standards.md)
Zero complexity budget, YAGNI, no drive-by cleanups, `function` declarations, `interface` over `type`, no barrel `index.ts` (coding-standards.md:7-15). No commented code, TODOs, or console.log (21-28). Always `npm run typecheck`, `npm run lint`, `npm run format` (Biome), via npm scripts only (AGENTS.md:107-146).

## PR / QA bar
- PRs are "closed by default". Discuss workflows in Discussions first. Prefer plugins. Keep changes ≲3,000 production lines (CONTRIBUTING.md:17-23, 54-75).
- Required evidence: automated tests of the changed behavior, commands and output, a recording for interactive UI, a platform table (CONTRIBUTING.md:77-90; docs/qa.md:17-63). Plugin changes need SDK boundary tests and both runtime loaders (docs/qa.md:14-15). No layout shift, glyph alignment per design.md (docs/qa.md:29-38).

## Skills
- `skills/paseo*` (paseo, paseo-advisor, paseo-committee, paseo-handoff, paseo-help, paseo-plugin) are `SKILL.md` files with `name`/`description` frontmatter (skills/paseo/SKILL.md:1-4). The daemon syncs orchestration skills into `~/.agents/skills` / Claude / `~/.codex/skills` (docs/data-model.md:184-188; packages/server/src/server/orchestration-skills/).
- **Plugins cannot ship skills.** The manifest schema has no skills field (packages/server/src/server/plugins/manifest.ts:25-37). To teach agents A2UI, use the tool `description` (Option A) or `agent.open.before` env/mcpServers, or add a repo skill in core.
