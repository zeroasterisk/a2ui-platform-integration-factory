---
type: Concept
title: How rich inline timeline items flow end-to-end (html_render, MCP Apps)
description: Contracts → server → wire projection → shared parser → web/mobile rows, traced for html-render and mcp-app.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/packages/shared/src/toolOutput.ts
tags: [t3code, timeline, html-render, mcp-apps, orchestration-v2, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Key insight

Neither "visual replies" nor MCP Apps added a new turn-item type to contracts. Both are ordinary
`dynamic_tool` turn items (`packages/contracts/src/orchestrationV2.ts:1808-1817`: `toolName`,
`input`, `output: Unknown`, `outputOmitted`). Clients *derive* a dedicated row kind by recognizing
a marker key in the tool output. That is the template for an A2UI row.

# html_render pipeline (works on every provider)

1. **Tool** — `apps/server/src/mcp/toolkits/html/tools.ts:73-106` (`html_render`: `html`, `title`,
   `height`; success `{ htmlRender: {attachmentId,title,height,heights?}, message }`), annotated
   read-only so plan mode can call it (`tools.ts:72`). `html_preview` (`:26-70`) returns a PNG.
2. **Handler** — `toolkits/html/handlers.ts:39-53` uses `McpToolAccess.actsAsCaller`, resolves the
   caller thread via `McpInvocationContext.requireThreadScope`, calls `HtmlRender.publish` (service,
   `apps/server/src/htmlRender/HtmlRender.ts:412`), which writes `<attachmentId>.html` to the
   attachment store. The tool result tells the model not to restate the page (`handlers.ts:49-50`).
3. **Registration** — `apps/server/src/mcp/McpHttpServer.ts:1093-1096` (`layerHtmlToolkit`) added to
   `layerTools` (`:1192-1204`). `AgentContextBudget.test.ts` measures this set's token cost.
4. **Model guidance** — shared instructions `packages/provider-core/src/server/orchestrationInstructions.ts:21-24`
   ("### Visuals and preview"); evals in `evals/mcp-tool-use` guard this text (`evals/README.md`).
5. **Provider adapters** emit `turn_item.updated` with `type: "dynamic_tool"`,
   `toolName: "<server>.<tool>"`. ACP has html-render-specific recovery
   (`packages/provider-acp/src/server/adapter.ts:3989-4026`, `McpProviderSessions.takeHtmlRender`
   in `packages/provider-core/src/server/McpProviderSessions.ts:136`) because some agents
   summarize MCP results.
6. **Wire projection** — `apps/server/src/orchestration-v2/WireProjection.ts:191-199` replaces raw
   output with `compactDynamicToolOutput(rawOutput)` and sets `outputOmitted`. Only whitelisted keys
   survive: `htmlRender`, `t3McpApp`, ids (`packages/shared/src/toolOutput.ts:113-160`), with
   budgets 16 KB parse / 8 KB metadata (`toolOutput.ts:15-16`). **A new marker key must be added
   here or it is dropped before it reaches clients.**
7. **Shared recognizer** — `htmlRenderFromToolItem` (`toolOutput.ts:185-192`, matches tool id via
   `resolveT3McpToolId`), `mcpAppFromToolItem` (`:195-202`, requires `toolName === server.tool`).
8. **Web** — `apps/web/src/session-logic.ts:130-145` (timeline entry union `html-render`,
   `mcp-app`), derivation `:698-727`; row union `components/chat/MessagesTimeline.logic.ts:628-643`,
   row build `:1952-1973`, equality `:2442-2455`; render switch `MessagesTimeline.tsx:1499-1500`;
   row components `TimelineAssistantRows.tsx:248-292` (`HtmlRenderFrame`, `McpAppFrame`).
9. **Mobile** — feed entry union `apps/mobile/src/lib/threadActivity.ts:174-191`, derivation
   `:2087-2118`, render `apps/mobile/src/features/threads/ThreadFeed.tsx:1755-1779`, row height
   estimate `:3665-3666`; WebViews `HtmlRenderWebView.tsx`, `McpAppWebView.tsx`.
10. **Persistence/cleanup** — `ProjectionStore.ts:1893,5456` LIKE-scans payloads for
    `htmlRender`/`t3McpApp` to GC attachments when a thread is deleted.
11. **Tool presentation** — `packages/shared/src/t3McpToolPresentation.ts:373-374` (labels).

# Other inline precedents

- **Assistant citations** keep all data in plain message text via a shared format
  (`docs/internals/assistant-citations.md:1-7`, `packages/shared/src/assistantCitations.ts`) — no
  separate store; same idea as A2UI-in-text.
- **Question attachments** (`user_input_request` item, `orchestrationV2.ts:1647-1654`;
  `UserInputAttachmentAnswerPayload` in `packages/contracts/src/providerPolicy.ts:90-95`) are a
  first-class contract item answered via RPC — heavier, provider-protocol-bound.
- **Proposed plans** — dedicated `proposed_plan` item and `proposed-plan` row
  (`session-logic.ts:124-128`, `:678-695`).

# Adding a genuinely new item kind (if ever needed)

contracts union member in `orchestrationV2.ts:1595+` (must stay decodable on replay —
`docs/internals/overview.md` "Durable intent"), adapter emission per provider, `WireProjection`
case, `session-logic.ts`, `MessagesTimeline.logic.ts`, `MessagesTimeline.tsx`, mobile
`threadActivity.ts` + `ThreadFeed.tsx`. The `dynamic_tool`-marker route avoids the contract and
every adapter.

See also: [extension points](./extension-points.md), [agent tools](./agent-tools-and-actions.md).
