---
type: Guide
title: t3code coding standards, contribution and docs rules
description: What a reviewable A2UI PR to pingdotgg/t3code must respect — approval, scope, evidence, taste, docs.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/CONTRIBUTING.md
tags: [t3code, contributing, standards, docs, pr]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Contribution gate (`CONTRIBUTING.md`)

- Not actively seeking outside contributions; PRs may be closed or reimplemented (`:10-13`).
- **Features need prior maintainer approval** in an Ideas discussion; link the approval itself
  (`:28-38`). A2UI rendering is a feature → open a discussion first.
- One underlying problem per PR, including the contract/server/client/test/docs changes it needs
  (`:63-71`).
- Evidence: reproduction, focused tests, manual checks, what wasn't checked; UI needs before/after
  screenshots, recordings for interaction (`:82-98`). Don't commit PR assets (`AGENTS.md:155`).
- PRs naming Gemini or "Muse Wonder" as author are closed (`:102-110`).
- Conventional commit title, plain language; body = problem, fix, then model + harness
  (`AGENTS.md:152-153`).

# Product principles (`AGENTS.md`)

- Theo: "fight for the smallest model"; measure twice + YAGNI; fight scope creep (`:35-37`).
- Performance: watch websocket payload size, GPU-heavy CSS animation, list rendering (`:15-17`);
  no continuously repainting animations (`:207`).
- Remote-ready: local, Tailscale, T3 Connect tunnel (`:19-21`); multi-surface web/desktop/mobile
  (`:23-31`).
- "Hit every surface": entry points, clients, providers (decision per adapter), agents via MCP,
  contracts, reverse states, connection modes, docs (`:65-76`).

# Taste (`AGENTS.md:192-208`)

- Complexity at adapter boundary; orchestration pure; UI dumb (`:194`).
- Server features are services; transports thin (`:196`; `docs/internals/effect-services.md`).
- `components/ui` own their look; variants not `className`; `shadcn/no-restyle` (`:197`).
- `Effect.fn("Service.op")` named spans (`:198-203`); inferred types, no `any` (`:204`).
- Default no comments; ≤4 lines for constraints only (`:205`, lint `t3code/no-low-value-comments`).
- React effects only to sync with outside world; `t3code/no-unreasoned-state-sync` (`:206`).
- Contracts in `packages/contracts` are Effect/Schema only, no heavy runtime (`:187`); shared runtime
  utils in `packages/shared` (subpath exports, no barrel, `:188`); shared client logic in
  `packages/client-runtime` (`:189`). `.repos/` vendored references, never import (`:190`).
- Web React Compiler: every file must compile; no `useMemo`/`useCallback`
  (`docs/internals/web-ui.md:57-76`).

# Docs rules (`AGENTS.md:159-169`)

- Most code changes need no internal doc. `docs/internals/` only for cross-component decisions and
  hard-to-discover traps; no feature catalogs or control-flow narration.
- `docs/user/` gets a concise section per major feature (what, how to start, unintuitive bits),
  product voice. For A2UI: extend `docs/user/html-renders.md` ("Visual replies") with a short
  section rather than a new page.
- Don't commit plans or research notes (`AGENTS.md:171-175`).

# Model-facing text

Changing agent instructions or MCP tool descriptions requires running `evals/` and adding a case
for behavior fixes (`AGENTS.md:144-146`; `evals/README.md`: `mcp-tool-use` eval measures T3 MCP
tool use). An A2UI tool or prompt section must ship with an eval case.

See also: [local dev & testing](./local-dev-and-testing.md), [extension points](./extension-points.md).
