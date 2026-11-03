---
type: Guide
title: Paseo plugin examples relevant to A2UI
description: Patterns and file layout from timeline-items, inline-thinking, agent-tools, markdown-panel, modal-ui, buttons, local-plugin, provider-direct.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/plugin-examples
tags: [paseo, plugins, examples]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Relevant plugin examples (`plugin-examples/`)

Convention: `paseo-plugin.json` + `index.client.tsx` and/or `index.server.ts` at the root. Code goes in `client/` (RN/React), `server/` (Node), or `shared/` (Zod contracts, schemas). Optional `package.json` and colocated `*.test.ts` (docs/plugins.md:243-249).

| Example | Files | Pattern |
|---|---|---|
| `timeline-items` | index.client.tsx, client/transform-pi-tasks.ts, client/pi-tasks.tsx, shared/pi-tasks.ts, pi-tasks.test.ts | Transformer on `tool_call` → `kind:"pi-task-list"`, renderer with Zod schema in shared/ (index.client.tsx:6-19). Pure transform unit-tested with vitest (pi-tasks.test.ts:1-20). Manifest requires `paseo >=0.8.0`. |
| `inline-thinking` | index.client.tsx, client/thinking.tsx | Transformer on `reasoning` passes `{text: item.text, phase}`. Renderer uses host `StreamedText` (index.client.tsx:4-26). Closest analogue for streaming text → custom UI. |
| `agent-tools` | index.server.ts only | `defineAgentTool` + `agent.open.before` label gating (index.server.ts:6-26). Template for an `a2ui_render` tool. |
| `markdown-panel` | package.json (+lock), client/rich-markdown.tsx, client/web.ts | File panel bundling npm `@codemirror/*` (package.json:6-12). DOM code isolated in `client/web.ts`, `Platform.OS === "web"` guard, lazy `require` (web.ts:11-20). Native falls back to RN. Proof that npm deps bundle. |
| `modal-ui` | client/examples.tsx, screenshots/ | Host `Modal`/`Modal.Content`, copy/paste, insets. Screenshots as QA evidence. |
| `buttons` | client/examples.tsx, screenshots/ | Header buttons, composer pills, menus, popovers (button descriptor, reference.md:1925-2020). |
| `local-plugin` | client/main.tsx, server/increment.ts, shared/increment.ts | Workspace panel (`locations: ["workspace","explorer"]`) + Command Center item calling `openPanel` + composer pill + RPC via `useRpc` and react-query `useMutation` (index.client.tsx:5-24; client/main.tsx:1-30). Canonical canvas + RPC template. |
| `provider-direct` | server/provider.ts, shared/provider-result.ts, client/provider-result.tsx | A provider emits versioned plugin timeline items, rendered by the client with a shared schema (README.md:1-12). |

Others in the folder: agent-configuration, catppuccin, diff-watch, hosts, lifecycle-actions, lifecycle-logger, linear, media-stream, pdf-panel, provider-acp-transformer, settings, translations, worktree-placement.

E2E tests copy examples straight from this folder (`copyPluginExample`, packages/app/e2e/support/helpers/plugin-fixture.ts:9-12). See [dev-and-qa](dev-and-qa.md).

Related: [plugin-system](plugin-system.md).
