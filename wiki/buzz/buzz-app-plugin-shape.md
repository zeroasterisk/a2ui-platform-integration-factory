---
okf_version: "0.2"
type: Guide
title: A2UI in Buzz 1.0 (block/buzz-app) as a plugin, with no core diff
description: Desktop work in block/buzz has moved to block/buzz-app, which has a real plugin API. A2UI fits as a bundled plugin built on registerCodeBlock / registerMessage plus agents.addInstructions. This page replaces the desktop half (PR 1) of a2ui-integration-shape.md.
resource: https://github.com/block/buzz-app/tree/ff8415d
tags: [buzz, buzz-app, a2ui, plugin, integration, pr-plan]
status: draft
generated:
  by: agent:a2ui-pif-cron/claude-opus
  at: 2026-11-16T00:00:00Z
sources:
- id: buzz-app-ff8415d
  resource: https://github.com/block/buzz-app/tree/ff8415d
- id: buzz-75d78ea-agents
  resource: https://github.com/block/buzz/blob/75d78ea/AGENTS.md
- id: npm-a2ui-2026-11-16
  resource: https://registry.npmjs.org/@a2ui/web_core
---

# What changed (2026-11-16)

- `block/buzz@75d78ea` `AGENTS.md:90,95,135`: `desktop/` is now "the deprecated Buzz 0.X desktop app". [block/buzz-app](https://github.com/block/buzz-app) is "Buzz 1.0 desktop and web app; all new desktop feature work".
- The relay, the Flutter mobile app, the CLI and the ACP harness stay in `block/buzz`.
- Result: **PR 1 (desktop renderer) in [a2ui-integration-shape.md](a2ui-integration-shape.md) is dead.** Its wire format still holds: a fenced block in agent-signed kind:9, with actions returned as p-tagged thread replies. The mobile half (PR 2) and the agent side also still hold.
- [extension-points.md](extension-points.md) says "Buzz has no plugin system". That is true of `block/buzz` desktop only. buzz-app has one.

# buzz-app plugin seams that fit A2UI (all at ff8415d)

- **`registerCodeBlock({ id, title, matches(language), component, action? })`** (`docs/plugin-architecture.md:2891`; type `src/features/conversation/contracts.ts:177-184`).
  - `component` receives `{ code, language }`. The host keeps the frame and the copy action.
  - Render failure or plugin removal falls back to the plain block. Non-interactive previews always show the plain block.
  - This is the configNudge-style fallback, provided by the host for free.
  - Precedents: bundled `mermaid` and `charts` (` ```buzz-chart `), with browser test `tests/browser/charts.spec.mjs` and gallery fixtures in `tests/fixtures/message-gallery/examples.ts`.
- **`registerMessage({ id, title, matches(message), component })`** (`docs/plugin-architecture.md:2733-2743`; type `contracts.ts:242-255`).
  - The callback gets the whole `ChannelMessage`, which carries `authorId`, `agentEnvelope` and `threadRootId`.
  - It renders the whole message body; the host keeps the chrome, actions and attachments.
- **`ctx.agents.addInstructions({ id, text, when? })`** (`docs/plugin-architecture.md:1020-1029`). This replaces the `BUZZ_ACP_SYSTEM_PROMPT_FILE` step for app-hosted agents.
  - It is sent with every turn and throws on text over **4096 UTF-8 bytes**.
  - Upstream `EXPRESS_RULES` must fit in that budget or be trimmed. Unmeasured.
- **`ctx.agents.addTool({ name, description, inputSchema, call })`** (`:997`). This is the natural home for a `send_a2ui` validate-then-post tool, mirroring t3code's agent tool.

# Trust gate: the one design decision

The R-trust rule says to render only kind:9 from a known agent signer. `registerCodeBlock` gets **only `{code, language}`, not the author**, so it cannot enforce that rule by itself. Options:

1. `registerMessage` matching `message.agentEnvelope` (or a known-agent author) whose body contains an ` ```a2ui ` fence. It renders the prose through the host markdown plus an `A2uiCard`.
   - Enforces trust by construction.
   - Costs: re-rendering prose, and first-match-wins against other message renderers.
2. `registerCodeBlock` for ` ```a2ui `, rendering for any author.
   - Smallest possible plugin, and it uses exactly the mermaid/charts precedent.
   - Weaker trust. The basic catalog has no script or HTML (host markdown sets `skipHtml: true`, `MessageMarkdown.tsx:832`), so the residual risk is spoofed UI from humans, not code execution.
3. Option 2 plus a host-side ask: a small upstream change passing `{ message }` (or an `author` kind) into `CodeBlockRenderer`. Needs an issue first, per contribution standards.

Recommended starting point: **option 1**. It keeps the existing invariant and needs no core change. Revisit option 3 with upstream if the duplicated prose rendering is ugly.

# Dependencies

- buzz-app `package.json` has **no direct zod**. The only copy is zod 3.25.76, which comes in transitively through `@hypothesi/tauri-mcp-server` / `@modelcontextprotocol/sdk` (`pnpm-lock.yaml:2632-2677`).
- `@a2ui/web_core@0.15.0` (zod ^3) should therefore resolve without the zod-4 `_def.typeName` breakage that blocks Paseo (NEEDS_ALAN #2). **Unverified until installed.**
- npm `latest` is still 0.15.0 for `@a2ui/web_core` and `@a2ui/react` (registry, 2026-11-16).

# Plugin packaging facts

- Bundled plugins live in `src/bundled/<id>/`: `manifest.json` + `index.tsx` + `README.md`. `src/bundled/readmes.test.ts` requires each README to have a "Getting started" section.
- `docs/plugin-defaults.md`: a newly introduced plugin's default only affects fresh installs, and default-on needs a policy decision. Ship A2UI default-off. This replaces the old `preview-features.json` gate.
- Bundled plugins already import host modules such as `features/messages/MessageMarkdown` (see `src/bundled/watching/Activity.tsx`), so reusing host markdown for option 1 has precedent.
- An external plugin (`examples/plugins/`, per `docs/plugin-authoring-guide.md`) avoids an upstream PR entirely. It is the right first slice for a fork-only `a2ui` branch.

# Revised Buzz plan

1. **Slice 1 (fork `zeroasterisk/buzz-app@a2ui`, no core diff):** `src/bundled/a2ui/` (or an external example plugin).
   - `registerMessage` gated on the agent signer, with an `A2uiCard` running `MessageProcessor` from web_core.
   - The basic catalog mapped to buzz-app design-system primitives.
   - Actions go out as a kind:9 thread reply that p-tags the signer. The send API is still to be pinned (`session` from `useRelayConnection`).
   - Express rules via `addInstructions`, plus a browser test copied from `charts.spec.mjs`.
2. **Slice 2:** `addTool` `send_a2ui`.
3. **Mobile:** unchanged, PR 2 of [a2ui-integration-shape.md](a2ui-integration-shape.md) (`block/buzz` Flutter, `a2ui_core` 0.7.0 on pub.dev now, was 0.4.0).

Open: does buzz-app need a fork, and should one be created (`zeroasterisk/buzz-app` does not exist)? The recipe step decides.

Related: [integration shape (mobile + wire)](a2ui-integration-shape.md), [extension points (0.X desktop)](extension-points.md), [index](index-fragment.md)
