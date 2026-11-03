---
type: Concept
title: CopilotKit A2UI architecture (two stacks)
description: How CopilotKit renders A2UI today: legacy a2ui-renderer (web_core v0.9) vs the experimental generativeUI engine (A2UI v1.0 ops, tool or markdown transport).
resource: https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/react-core/src/v2/providers/CopilotKitProvider.tsx
tags: [copilotkit, a2ui, architecture, ag-ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:45:00Z
sources:
- id: copilotkit-3a956add4
  resource: https://github.com/CopilotKit/CopilotKit/tree/3a956add4
---

# Summary

At `3a956add4` CopilotKit ships **two parallel A2UI stacks**, both switched on from
`CopilotKitProvider` (`packages/react-core/src/v2/providers/CopilotKitProvider.tsx:282-328`):

| | Stack A: `a2ui` prop | Stack B: `generativeUI` prop (experimental) |
|---|---|---|
| Package | `@copilotkit/a2ui-renderer` (vendored `@a2ui/react`) | `@copilotkit/react-core/v2/generative-ui` |
| Protocol core | `@a2ui/web_core/v0_9` `MessageProcessor` (`packages/a2ui-renderer/src/react-renderer/core/A2UIProvider.tsx:3`; dep 0.10.4 at `packages/a2ui-renderer/package.json:58`) | Own engine: surface-manager, resolver, `calc`, validator in `@copilotkit/shared` |
| Catalog API | `createCatalog(defs, renderers)` → web_core `Catalog` | `createGenerativeUI({id, extends, state, functions, overrides, components})` |
| Agent emission | AG-UI `@ag-ui/a2ui-middleware`; `render_a2ui` secondary-LLM tool | `render_ui` tool **or** ```` ```a2ui ```` markdown fences |
| Wire event | AG-UI activity `a2ui-surface` | AG-UI activity `generative-ui-surface` (+ `generative-ui-function-call`) |
| Op version | v0.9 | A2UI v1.0 ops (`packages/core/src/a2ui-markdown/operations.ts:5-7`) |
| Placement | chat only | chat **and** named page targets (`<GenerativeUISurface id>`) |

Provider wiring: both register *activity-message renderers*; the chat transcript
renders an activity by its `activityType` (`CopilotKitProvider.tsx:616-637`).
Stack A is auto-enabled when the runtime reports `a2ui` or a catalog is passed
(`CopilotKitProvider.tsx:501-504`).

# Stack A data flow

1. Host passes `a2ui={{ catalog, theme }}`; catalog is filtered by per-component
   enable flags for both advertisement and render (`CopilotKitProvider.tsx:571-591`,
   [`filter-catalog.ts:16-33`](https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/a2ui-renderer/src/react-renderer/filter-catalog.ts)).
2. Catalog advertised to agent as a context entry keyed by
   `A2UI_SCHEMA_CONTEXT_DESCRIPTION` (`packages/a2ui-renderer/src/react-renderer/catalog-utils.ts:13-14`),
   rendered by `buildCatalogContextValue` (`catalog-utils.ts:52-80`) as JSON Schema.
3. Runtime `CopilotRuntime({ a2ui })` auto-applies `A2UIMiddleware`
   (`packages/runtime/src/v2/runtime/core/runtime.ts:105-119`). With `injectA2UITool`
   the agent calls a stub tool and a secondary LLM emits ops via `render_a2ui`
   (`showcase/integrations/langgraph-python/src/agents/a2ui_dynamic.py:52-68`).
4. Client `createA2UIMessageRenderer` consumes the `a2ui-surface` activity whose
   content carries `a2ui_operations` plus building/retrying/failed lifecycle
   (`packages/react-core/src/v2/a2ui/A2UIMessageRenderer.tsx:29,93-101,252`).
   The raw `render_a2ui` tool call is hidden by a no-op renderer
   (`packages/react-core/src/v2/a2ui/A2UIToolCallRenderer.tsx:9-44`).

# Stack B data flow

1. `generativeUI={{ ui, transport, theme, agentIds }}`
   (`packages/react-core/src/v2/generative-ui/runtime-context.ts:25-90`).
2. **tool** transport: runtime `generative-ui-middleware` streams `render_ui` args,
   validates each complete op, emits `ACTIVITY_SNAPSHOT/DELTA`
   (`packages/runtime/src/v2/runtime/generative-ui/generative-ui-middleware.ts:117-122,446-494`).
3. **markdown** transport: model writes fences; client splits/validates
   (`packages/react-core/src/v2/components/chat/CopilotChatAssistantMessage.tsx:668-673`).
   See [agent-emission.md](agent-emission.md).

# Implication for the factory

Stack B is the closer match to our goal (A2UI v1.0, markdown-in-text works with
any coding agent, named targets ≈ canvas). Stack A is the documented path
(docs.copilotkit.ai/*/generative-ui/a2ui) but pins to v0.9 web_core. Details:
[catalog-and-theming.md](catalog-and-theming.md),
[surfaces-and-components.md](surfaces-and-components.md),
[copy-vs-avoid.md](copy-vs-avoid.md).
