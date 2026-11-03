---
type: Concept
title: Riding MCP Apps for A2UI (zero t3code diff) — feasibility and drawbacks
description: Whether an external MCP server returning a ui:// app that renders A2UI can work in t3code unchanged, and why it falls short.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/docs/user/html-renders.md
tags: [t3code, mcp-apps, a2ui, iframe, codex]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# What t3code implements

MCP Apps per the `io.modelcontextprotocol/ui` extension, protocol `2026-01-26`, MIME
`text/html;profile=mcp-app`, resources under `ui://` (`packages/shared/src/mcpApp.ts:3-7`).

- **Capture (Codex only):** Codex advertises the extension in client capabilities
  (`apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:233-237`), reads the tool's
  `resourceUri` (`:493-497`), snapshots the HTML (`apps/server/src/mcpApps/McpAppSnapshot.ts:48`,
  max 5 MB `mcpApp.ts:12`) into an attachment, and writes `t3McpApp` into the tool output
  (`CodexAdapterV2.ts:3941`).
- **Runtime requests** go through the provider adapter's optional `mcpApps`
  (`packages/provider-core/src/server/ProviderAdapter.ts:550-560,655`); only Codex implements it
  (`CodexAdapterV2.ts:6945`). Missing → `provider-unsupported` (`apps/server/src/mcpApps/McpAppRequests.ts:103-104`).
- **RPC:** `mcpApps.callTool / toolInfo / readResource / updateModelContext`
  (`packages/contracts/src/rpc.ts:431-433`, schemas `packages/contracts/src/mcpApps.ts:11-58`,
  errors `:60-94`).
- **Web host:** `apps/web/src/components/chat/McpAppFrame.tsx` — iframe
  `sandbox="allow-scripts allow-forms"` without same-origin (`:465-475`), theme pushed as CSS
  variables (`:222-228`), JSON-RPC host in `packages/client-runtime/src/mcpApps/host.ts`
  (`ui/message` `:269-286`, `ui/update-model-context` `:309`).
- **Mobile host:** WebView with nested sandboxed iframe (`apps/mobile/src/features/threads/McpAppWebView.tsx:53-59`).
- **User actions:** `ui/message` → confirm dialog → web `ChatView.sendAppMessage`
  (`apps/web/src/components/ChatView.tsx:1861-1879`, `startThreadTurn` with `dispatchMode: "queue"`);
  mobile `enqueueThreadOutboxMessage` (`McpAppWebView.tsx:359-372`). Model-context notes are stored
  (`mcpApps/McpAppModelContext.ts`, migration 059) and attached to the next run
  (`orchestration-v2/RunExecutionService.ts:1681`).

# Zero-diff A2UI via MCP Apps

An MCP server (e.g. `a2ui-mcp`) exposes `render_ui({ a2ui })` whose tool metadata points at a
`ui://a2ui/renderer` HTML resource bundling an A2UI web renderer. Codex calls it, t3code snapshots
and renders the app, the app reads the tool input/result over the MCP Apps bridge and renders the
A2UI surface; button actions call `ui/message` (user confirms) or `tools/call` on its own server.

**It works today — for Codex threads only.** User docs say so explicitly: "Codex supports this
today … other providers show these calls as ordinary tool calls" (`docs/user/html-renders.md:13`).

# Drawbacks

| Issue | Evidence |
|---|---|
| Codex-only; Claude, Cursor, Grok, OpenCode, ACP, Pi get a plain tool row | `html-renders.md:13`; only Codex sets `mcpApps` |
| Not native: iframe, separate document, theme only via injected CSS vars; t3code primitives (`components/ui`) unavailable | `McpAppFrame.tsx:222-228,465-475` |
| Every message to the thread requires a confirm dialog | `McpAppFrame.tsx:304-310`; `html-renders.md:15` |
| App needs the originating agent session running; after stop it is view-only (`session-stopped`) | `mcpApps.ts:85`; `html-renders.md:15` |
| Mobile fullscreen reopens the app, losing unsaved state | `html-renders.md:17` |
| Height bounds 80–2000 px, default 320 | `mcpApp.ts:9-11` |
| User must configure the MCP server per provider themselves | `html-renders.md:13` |
| Per-render HTML snapshot (renderer bundle) stored per call, ≤5 MB each | `McpAppSnapshot.ts`, `mcpApp.ts:12` |

# Verdict

Good **demo/prototype** path (proves A2UI semantics + action round-trip with no PR), and a
reasonable fallback for third-party agents. It does not meet "native design system" or
"every provider/surface" (`AGENTS.md:65-76`). The native route reuses the same action sink
(`sendAppMessage` / thread outbox) without the iframe — see
[integration shape](./a2ui-integration-shape.md).

See also: [rich timeline items](./rich-timeline-items.md), [agent tools & actions](./agent-tools-and-actions.md).
