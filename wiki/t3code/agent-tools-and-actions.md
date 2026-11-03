---
type: Concept
title: Agent output flow, T3 MCP tools across providers, and user-action round-trips
description: How provider output becomes timeline items, how t3code exposes MCP tools to every provider, and how UI actions post back to a thread.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/docs/orchestration-v2/orchestrator-mcp-server.md
tags: [t3code, orchestration-v2, mcp, providers, a2ui, actions]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Pipeline

Clients send typed WS requests → commands → pure `Orchestrator`
(`apps/server/src/orchestration-v2/Orchestrator.ts`) decides events → `EventSink` commits events,
projections, receipt and outbox in one transaction → `EffectWorker` runs side effects (start provider
turn, checkpoint) → provider adapters translate native protocols into orchestration events
(`AGENTS.md:177-179`; `docs/internals/overview.md` "Durable intent and side effects").
Persisted events must stay decodable on replay — schema changes affect stored history
(`overview.md`, same section).

Assistant text arrives as `assistant_message` items (`packages/contracts/src/orchestrationV2.ts:1618-1626`:
`text`, `streaming`), tool calls as `dynamic_tool` (`:1808-1817`). Providers: Codex, Claude, Cursor,
Grok, OpenCode, Antigravity, Kiro, Pi, generic ACP registry (`AGENTS.md:3,71`;
`orchestrator-mcp-server.md` "Provider Support"). Complexity belongs in adapters
(`AGENTS.md:194`).

# T3 MCP server = cross-provider tool channel

- One authenticated HTTP endpoint `http://127.0.0.1:<port>/mcp`, provider-visible key `t3-code`
  (`docs/orchestration-v2/orchestrator-mcp-server.md` "Transport And Authentication").
- Per-provider-session bearer credential from `McpSessionRegistry`, scoped to environment, thread,
  provider instance and session; revoked on release (same section).
- Injected into **every** provider: Codex `thread/start` config (two entries, `t3-code` and
  `t3-code-direct`), Claude `mcpServers` + `allowedTools: mcp__t3-code__*`, Cursor SDK
  `mcpServers`, Grok/ACP `session/new.mcpServers`, Pi via a generated extension bridge
  ("Provider Injection" section).
- Tool set = `layerTools` in `apps/server/src/mcp/McpHttpServer.ts:1192-1204`; toolkits live in
  `apps/server/src/mcp/toolkits/*/{tools,handlers}.ts`. Transports stay thin: a tool decodes,
  calls one service method, maps errors (`AGENTS.md:196`).
- Handler gets the caller's thread through `McpInvocationContext.requireThreadScope`
  (e.g. `toolkits/html/handlers.ts:41-42`), access wrappers `McpToolAccess.readsAsCaller/actsAsCaller`.
- Tool names must be known to `packages/shared/src/t3McpToolPresentation.ts` (`T3_MCP_TOOL_NAMES`
  `:377`) — ACP identity matching uses it (`packages/provider-acp/src/server/runtimeModel.ts:1085-1130`).
- Shared model instructions: `packages/provider-core/src/server/orchestrationInstructions.ts:4-25`
  (each section < 4000 bytes for Codex, `:3`). Changing tool text requires evals
  (`AGENTS.md:144-146`, `evals/README.md`); context cost measured by
  `apps/server/src/provider/AgentContextBudget.test.ts`.

**So yes:** an `a2ui_render` tool registered in `layerTools` reaches every provider with zero
adapter work, exactly like `html_render` ("works with every provider", `docs/user/html-renders.md:3`).

# Posting user actions back to the thread

Existing sinks an A2UI action handler can reuse:

| Sink | Where | Semantics |
|---|---|---|
| Web `sendAppMessage(text)` | `apps/web/src/components/ChatView.tsx:1861-1880` | `startThreadTurn` with a user message, `dispatchMode: "queue"`; passed to rows via `timelineRowContext.ts:65` (`onSendAppMessage`) |
| Mobile outbox | `apps/mobile/src/state/thread-outbox.ts:19`, used `McpAppWebView.tsx:359-372` | queued user message with ids |
| Composer insert (no send) | `ChatView.tsx:1844-1860` (`insertArtifactTemplate`) via `timelineRowContext.ts:64` | user reviews before sending |
| `t3_thread_send` MCP tool | `orchestrator-mcp-server.md` "`t3_thread_send`" (`auto/queue/steer/restart`) | agent-side, not UI |

Dispatch modes: `auto` starts idle / steers active / queues; `queue` creates a follow-up run
("`t3_thread_send`" section). Client mutations must use `createEnvironmentRpcCommand` and guarded
scopes (`AGENTS.md:195`, `packages/contracts/src/clientRpcPermissions.ts:17`).

**A2UI mapping:** an A2UI `action` (`{name, context}`) serializes to a user message
(e.g. a fenced ```a2ui-action JSON block or plain text) sent via `onSendAppMessage`; with
`queue` it never interrupts an active turn. MCP Apps confirm every message
(`McpAppFrame.tsx:304-310`) because the iframe is untrusted; a native renderer where the click is a
real user gesture on t3code's own `Button` arguably needs no extra dialog — a maintainer decision.

# Mid-turn data / dataModel updates

There is no streaming push channel from agent to an existing UI row other than new turn items or
updated items. A2UI `updateDataModel`/`updateComponents` would arrive as later messages/tool calls
targeting the same `surfaceId`; the client merges them in derivation (web `session-logic.ts`,
mobile `threadActivity.ts`). Keep that merge in `packages/client-runtime` or `packages/shared`
(`AGENTS.md:70`, "Shared logic lives in packages/client-runtime").

See also: [rich timeline items](./rich-timeline-items.md), [MCP Apps route](./mcp-apps-route.md).
