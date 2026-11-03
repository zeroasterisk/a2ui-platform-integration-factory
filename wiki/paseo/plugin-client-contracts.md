---
type: Component
title: Paseo plugin client contracts
description: PluginClientContext registrations relevant to A2UI: timeline transformer/renderer, agent/workspace panels, slash commands, composer pills.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/packages/plugin/src/client/contracts.ts
tags: [paseo, plugins, client, timeline, panels]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Client contracts (`@getpaseo/plugin/client`)

`PluginClientContext` (packages/plugin/src/client/contracts.ts:182-222) extends `PluginCommandCapabilities`. Those capabilities are `paseo: PaseoApi`, `rpc(contract,input)`, `openScreen`, and `openSettings` (contracts.ts:310-320).

| Method | Line | Use for A2UI |
|---|---|---|
| `addTimelineTransformer({id, query:{itemType}, transform({item, phase})})` | 205-207, 277-290 | Recognize A2UI in `assistant_message` / `tool_call` and replace it with a plugin item |
| `addTimelineRenderer({kind, version, schema, Component})` | 208-210, 303-308 | Render `type:"plugin"` items (from a transformer or a server `timeline.append`) |
| `addAgentPanel` / `addWorkspacePanel` | 190-191, 226-244 | Canvas surface (tab in workspace/explorer) |
| `openPanel(id, {workspaceId, agentId?, location?})` | 211, 169-172 | Open the canvas from a renderer or command |
| `addSlashCommand` | 195, 366-374 | e.g. `/a2ui` to open the canvas |
| `addComposerPill` | 199-201 | Per-agent composer button |
| `subscribe(contract, input, onEvent)` | 216-221 | Live canvas updates from the server |

Also available: `addScreen`, `addCommandCenterItem`, `addHeaderButton`, `addFilePanel`, `addTheme`, `addAttachmentSource`, `playAudio`, and `i18n` (contracts.ts:183-204).

## Timeline transformer
- `query.itemType` must be one `AgentTimelineItem.type`: `user_message`, `assistant_message`, `reasoning`, `tool_call`, `todo`, `error`, `notification`, compaction, or `plugin` (packages/protocol/src/agent-types.ts:376-388).
- Return `undefined` to keep the item, `{items:[…]}` to replace it, or `[]` to remove it. Items are `{type:"plugin", kind, version, data, id?}` with JSON-compatible data (docs/plugins.md:667-673).
- `phase` is `"streaming"` for the live assistant message, running tools, and loading reasoning. It is `"complete"` once committed or fetched. Assistant callbacks get the **full accumulated text** on each update. Transformers run before Markdown splitting and tool grouping (public-docs/plugins/reference.md:1166-1176; docs/plugins.md:659-665).
- Must be synchronous and deterministic. Memoized per source-item reference + phase, and identity is preserved across streaming updates so renderers don't remount. First matching transformer wins (docs/plugins.md:664-676).
- To split assistant text into an A2UI part plus prose, return several items (e.g. `kind:"markdown"` + `kind:"a2ui"`) with stable `id`s. Chat find only indexes text that matches the original message (reference.md:1184-1189).

## Timeline renderer
`PluginTimelineItemProps<Data>` = `PluginHostProps` + `agentId`, `item {type:"plugin",kind,version,data}`, `timestamp` (contracts.ts:292-301). Paseo validates `data` with the Zod `schema` before mount and wraps the component in an error boundary (docs/plugins.md:669-671). An item with no installed renderer shows "unavailable" (docs/plugins.md:694).

## Panels (canvas)
`PluginPanelProps` = host props + `navigation?`, `workspaceId`, `params`, `revision`, `tab {setModified, state, setState(json)}` (contracts.ts:120-133). Agent panels get `params.agentId` (contracts.ts:135-137, 148-155). `locations: ["workspace","explorer"]` opts into Explorer (contracts.ts:107-118; docs/plugins.md:428-431). Tab state persists as opaque JSON. Panels must not fetch context through RPC; they use `useAgent`/`useWorkspace` selectors (docs/plugins.md:419-427; packages/plugin/src/client/index.ts:73).

## Hooks exported
`usePaseo`, `useAgent`, `useWorkspace`, `useRpc`, `useSubscription`, `useSettings`, `useHosts`, `getPaseoClient`, `openExternalUrl`, `useTabState`, `useTranslation` (packages/plugin/src/client/index.ts:72-104). Use host `@tanstack/react-query` for request state (docs/plugins.md:361-362).

## Sending to the agent from client code
`usePaseo().agents.ref(agentId).send(text, options?)` (packages/client/src/index.ts:378) or `.run(text)` (index.ts:381). This is the path for A2UI user actions: serialize the action as a prompt. Slash command `onSubmit` receives `{args, agent, paseo, rpc, openPanel}`. Paseo never sends the command text to the agent (docs/plugins.md:701-721).

Related: [plugin-server-contracts](plugin-server-contracts.md), [design-system](design-system.md), [a2ui-integration](a2ui-integration.md).
