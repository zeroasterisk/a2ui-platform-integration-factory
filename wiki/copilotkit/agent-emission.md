---
type: Concept
title: How agents emit A2UI in CopilotKit
description: Markdown fences vs render_ui tool vs AG-UI a2ui middleware; streaming/partial JSON handling, prompting, and the action round-trip.
resource: https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/core/src/a2ui-markdown/fence-parser.ts
tags: [copilotkit, a2ui, streaming, prompting, actions, markdown]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:45:00Z
sources:
- id: copilotkit-3a956add4
  resource: https://github.com/CopilotKit/CopilotKit/tree/3a956add4
---

# Three emission paths

1. **Markdown fences (Stack B, `transport: "markdown"`)** — model writes
   ```` ```a2ui target=<id> ```` fences inside a normal reply; the client renders.
   No runtime middleware (`packages/runtime/src/v2/runtime/core/runtime.ts:124-133`).
2. **`render_ui` tool (Stack B default)** — runtime injects tool + guide, validates
   ops server-side, streams AG-UI activities
   (`packages/shared/src/generative-ui/types.ts:4-11`,
   `packages/runtime/src/v2/runtime/generative-ui/generative-ui-middleware.ts:117-122`).
3. **AG-UI `A2UIMiddleware` (Stack A)** — `injectA2UITool` + secondary LLM
   `render_a2ui`, or fixed-schema where a Python tool returns ops wrapped in
   `a2ui_operations` (`packages/react-core/src/v2/a2ui/A2UIMessageRenderer.tsx:25-29`;
   `showcase/integrations/langgraph-python/src/agents/a2ui_fixed.py:1-60`).

# Fence parser (copy this)

`splitA2UIMarkdown(markdown)` → ordered `markdown | a2ui` segments; each a2ui
segment has `index`, `text`, `closed`, optional `target`
(`packages/core/src/a2ui-markdown/fence-parser.ts:10-18,96-176`).
- Column-0 fences only; first info token must be exactly `a2ui`; `target=<id>`
  routes to a named surface, absent → chat (`:1-26,70-80,141-149`).
- Non-a2ui fences pass through byte-for-byte; CRLF preserved (`:115-118`).
- Streaming: an open fence yields `closed:false` and strips a half-streamed closer
  like "``" (`:159-170`). ~180 lines, zero deps.

# Partial-JSON handling

`packages/core/src/a2ui-markdown/operations.ts` (1.5k lines):
- `extractStringField(partial, key)` reads `surfaceId` before JSON closes (`:74-86`).
- `extractCompleteArrayItems(partial, "components")` returns every complete array
  item so far + `closed`, with **structural-key depth repair**: if `id`,
  `component`, `child`, `children` appear nested, the missing closing braces are
  synthesized (`:110-164,241-247`). One malformed component can't swallow the rest.
- `getMarkdownOperationSurfaceId` tolerates the top-level `surfaceId` models write (`:350-367`).
- `extractFenceOperations` / `prepareSurfaceOperations` / `flattenInformationalCards`
  (`:803,902,1133`) — the last turns text-only "cards" back into prose.

Tool path: incremental `RenderUIArgsStream` scanner, each byte scanned once
(`packages/shared/src/generative-ui/render-ui-args.ts:1-50,170`); ops buffered until
`target` is known; JSON.parse fallback if streaming found nothing
(`generative-ui-middleware.ts:359-419`). Ops validated by `validateOperation`
(`packages/shared/src/generative-ui/validate-operation.ts:169`); rejections are
reported back and shown on the chat card (`packages/react-core/src/v2/generative-ui/chat.tsx:20-35`).
UX: streamed components fade in once per id (`.../generative-ui/markdown/MarkdownSurfaces.tsx:26-37`).

# Prompting

- Markdown guide: `buildGenerativeUIMarkdownGuidelines(features)` emits only rules for
  features the manifest uses (`packages/shared/src/a2ui-prompts.ts:150-272`).
  Schema goes in a separate context entry with a *different* description so
  LangGraph/Strands adapters don't move it into tool state (`a2ui-prompts.ts:132-147`).
- "When to show UI" playbook (calculator for numbers, Table/EntityCard for options,
  Chart for trends, Map for places, Form for side effects, "never pretend an action
  happened") — `packages/shared/src/generative-ui/prompt-spec.ts:82-87`. Worth adapting.
- Tool guide lists targets (chat vs named area, allowed components), functions with
  caller permissions, and existing surfaces with status
  (`packages/shared/src/generative-ui/prompt.ts:26-80`).
- A compact schema renderer hoists repeated props (`packages/shared/src/generative-ui/compact-schema.ts`).

# Action round-trip

- **Stack B**: an event is handled by a declared function (`useGenerativeUIFunction`) or
  forwarded: a *visible user message* is synthesised from `userMessage`/`label`/the
  humanized event name + context lines (`packages/react-core/src/v2/generative-ui/action-message.ts:26-40`),
  the A2UI action is attached, then `runAgent`. Clicks while the agent runs return
  `agent_busy` (`.../generative-ui/use-generative-ui-root.ts:559-612`).
- **Stack A**: `A2UIProvider.onAction` → `runA2UIAction` sets
  `copilotkit.properties.a2uiAction` and reruns the agent; a host `A2UIActionInterceptor`
  can return `null` (handled locally), a modified action, or void
  (`A2UIMessageRenderer.tsx:53-72,445-496`).
