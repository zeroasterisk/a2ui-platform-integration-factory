---
type: Guide
title: Integrating A2UI into Paseo via a plugin
description: Options for agents to emit A2UI into chat/canvas and for user actions to flow back, with tradeoffs.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/docs/plugins.md
tags: [paseo, a2ui, plugins, integration, design]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# A2UI in Paseo: integration options

Everything below uses existing extension points. No core change is needed for a first version (CONTRIBUTING.md:17-23 points specialized workflows at plugins).

## Option A: plugin agent tool → `timeline.append` (recommended primary)
1. `index.server.ts` attaches `a2ui_render` (and optionally `a2ui_update`) via `agent.open.before` (public-docs/plugins/hooks.md:342-372). Gate by label, e.g. `a2ui/enabled`.
2. `execute(input, {agent, paseo})` validates the A2UI messages (Zod in `shared/`). It calls `paseo.agents.ref(agent.id).timeline.append({type:"plugin", id:surfaceId, kind:"a2ui-surface", version:1, data})` (reference.md:1191-1221) and returns text such as "rendered surface X".
3. The client `addTimelineRenderer({kind:"a2ui-surface", schema, Component})` renders it with RN.
- Pros: structured input validated before the model sees success. Same `id` replaces the surface in place. Works with any provider that supports MCP/native tools.
- Cons: 64 KiB `data` cap. Rows are in-memory and lost on daemon restart (docs/plugins.md:691-695). Placement is where the tool ran, and the tool_call row also shows.

## Option B: client transformer on assistant text
`addTimelineTransformer({query:{itemType:"assistant_message"}, transform({item, phase})})` scans `item.text` for a fenced ```a2ui block or `<a2ui>…</a2ui>`. It returns `[{kind:"markdown-part"}, {kind:"a2ui", data:{messages, phase}}]` with stable ids (docs/plugins.md:659-676; reference.md:1166-1181).
- Pros: no server, no tools, works with every provider including mock. Persists with provider history. Streaming is visible (`phase:"streaming"` → partial parse; return `undefined` until recognizable).
- Cons: transform must be synchronous and deterministic. The agent needs instructions (system prompt/skill) to emit the block. Replacing the whole message means re-rendering prose yourself with `Markdown` from client/ui.
- Option B can also claim a `tool_call` item (like timeline-items) to render Option A's tool call inline instead of append.

## Option C: canvas panel
`addAgentPanel({id:"a2ui-canvas", Component})` and open it with `openPanel` from a renderer button, slash command, or composer pill (packages/plugin/src/client/contracts.ts:190-211). Feed it state by either:
- `client.subscribe`/`useSubscription` to a server subscription that the tool's `execute` pushes into (docs/plugins.md:364-370), or
- reading the latest `a2ui-surface` rows via `usePaseo().agents.ref(id).timeline.refetch/subscribe` (packages/client/src/index.ts:329-346).
Use `tab.setState` to persist the last surface per tab (contracts.ts:120-126).

## User actions back to the agent
- **Client direct:** in a renderer, `usePaseo().agents.ref(agentId).send(serializedAction)` (packages/client/src/index.ts:378). It starts a new turn with text like `[a2ui action] {"surfaceId":…,"name":…,"context":…}`. This is the same SDK path as `agent.turn.after` follow-ups (hooks.md:490-526).
- **Via server RPC:** `rpc(a2uiAction, {agentId, …})` → handler updates its data model and calls `paseo.agents.ref(id).send(...)`. Keeps action-to-prompt formatting server-side and testable.
- Local-only actions (data-model binding, toggles) update renderer state without a turn. Per docs/testing.md:26-34, fallible actions must show pending, success, and failure states in the UI.

## Recommended shape (minimal PR)
```
plugin-examples/a2ui/            (or external plugin repo)
  paseo-plugin.json              {"id":"a2ui","requirements":{"paseo":">=0.13.0"}}
  index.client.tsx               transformer + renderer (+ agent panel)
  index.server.ts                a2ui_render tool + action RPC
  shared/a2ui.ts                 Zod schemas, kind/version constants, defineRpc
  client/surface.tsx             RN catalog: Text/Row/Column/Card/Button/TextField…
  client/parse.ts                pure A2UI parser (unit-tested)
  package.json                   only if bundling an RN-safe A2UI core lib
```
Constraints: RN-only (no DOM, no Lit/web components) ([design-system](design-system.md)). Bundled deps must be ES2020/Hermes-safe ([plugin-system](plugin-system.md)). Built-in placement forbids npm deps. Theme is limited to 11 colors.
