---
type: Component
title: Paseo plugin server contracts
description: Server-side RPC, subscriptions, timeline.append (64 KiB), agent tool attachment via agent.open.before, and lifecycle hooks.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/public-docs/plugins/hooks.md
tags: [paseo, plugins, server, hooks, mcp, timeline]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Server contracts (`@getpaseo/plugin/server`)

## RPC
Define it in `shared/` with `defineRpc({name, input, output})` (plugin-examples/local-plugin/shared/increment.ts). Register with `server.handle(rpc, handler)` (local-plugin/index.server.ts). Call it from the client with `useRpc(rpc)` or `client.rpc(rpc, input)`. Inputs and outputs are validated in both processes (docs/plugins.md:360-362).

## Subscriptions
Session-owned observations: release, disconnect, and reload need no plugin code. Each subscriber gets its own handler call. There is no fan-out or replay. Pushes are buffered until the subscribe response (docs/plugins.md:364-370). Top-level `Uint8Array` travels as binary frames (docs/plugins.md:372-380). Contract: public-docs/plugins/reference.md:2229-2386. Client: `client.subscribe(...)` (packages/plugin/src/client/contracts.ts:216-221) or `useSubscription`.

## `timeline.append`, a canonical plugin row
```ts
await paseo.agents.ref(agentId).timeline.append({
  type: "plugin", id: "review", kind: "review-result", version: 1, data: {...} });
```
- Fields: `type:"plugin"`, `id` (reuse = replace), `kind`, `version`, `data` (≤ **64 KiB** serialized; larger is rejected, not truncated) (reference.md:1191-1221; docs/plugins.md:679-697).
- The daemon stamps `pluginId` and rejects calls from non-plugin sessions. The row lives in the daemon's **in-memory** timeline. It survives refetch and reconnect, **not a daemon restart** (docs/plugins.md:691-695). Feature flag: `server_info.features.pluginTimelineItems`.
- SDK type: `PaseoAgentTimelineHandle.append(item: Omit<PluginTimelineItem,"pluginId">)` → `{seq, epoch}` (packages/client/src/index.ts:329-330). Wire message `agent.timeline.append.request` (packages/client/src/daemon-client.ts:3707-3708). Protocol type `PluginTimelineItem` (packages/protocol/src/agent-types.ts:358-365).
- Same-`id` replace means a surface can be updated in place: re-append with the updated A2UI state.

## Agent tools (an MCP tool the agent can call)
- Use `defineAgentTool({name, title?, description, input: zod, execute(input, {agent, paseo, signal})})` and attach it in `server.addHook("agent.open.before", ({request}) => ({...request, tools:[...request.tools, tool]}))` (public-docs/plugins/hooks.md:342-372). Full example: plugin-examples/agent-tools/index.server.ts:1-26.
- Select agents by label, provider, workspaceId, or agentId (hooks.md:385-392). Names match `/^[a-z][a-z0-9_]*$/`, ≤64 chars, and must not collide (hooks.md:441-444).
- `execute` runs in the plugin process and returns `{text?, structuredContent?, isError?}`. Ceiling is 10 min. Input is validated first. A throw becomes `isError` (hooks.md:403-435).
- Delivered "using MCP or native registration as the provider supports" and gated like Paseo tools (hooks.md:437-438). Changes apply on the next session reopen; `agents.ref(id).reload()` forces it (hooks.md:446-453).
- `agent.open.before` may also add launch-only `env` and `mcpServers` (hooks.md:262-288, 310-340).

## Lifecycle hooks of interest
`server.addHook(name, handler)` uses `subject.operation.position` naming (docs/plugins.md:459-462). The list is at hooks.md:50-67: `workspace.create.*`, `worktree.create.*`, `agent.create.before/after`, `agent.open.before`, `agent.close.after`, `agent.archive.after`, `agent.turn.before/after`, `agent.permission.before/after`. `agent.turn.after` + `agents.ref(id).send("…")` is the documented follow-up pattern (hooks.md:486-529).

## Server `paseo` API
`PaseoAgentHandle`: `timeline {append, refetch, subscribe}`, `send`, `run`, `waitForFinish`, `reload`, `refresh`, `respondToPermission`, `commands`, `archive`, `subscribe` (packages/client/src/index.ts:348-395).

Related: [plugin-client-contracts](plugin-client-contracts.md), [a2ui-integration](a2ui-integration.md).
