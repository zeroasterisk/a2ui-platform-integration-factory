---
type: Guide
title: CopilotKit A2UI: what to copy vs avoid for a small-footprint factory
description: Recommendations for Paseo (Expo RN) and t3code (React+BaseUI+Tailwind) A2UI integration based on CopilotKit's design.
resource: https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/core/src/a2ui-markdown/fence-parser.ts
tags: [copilotkit, a2ui, recommendations, factory, paseo, t3code]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:45:00Z
sources:
- id: copilotkit-3a956add4
  resource: https://github.com/CopilotKit/CopilotKit/tree/3a956add4
---

# Copy

1. **Markdown-fence transport**: ```` ```a2ui target=<id> ```` in plain assistant text
   works with any coding agent (Claude Code, Codex…) without tool plumbing. Port
   `splitA2UIMarkdown` as-is (~180 LOC, no deps;
   `packages/core/src/a2ui-markdown/fence-parser.ts:96-176`). The Express DSL can use
   the same fence scheme with its own info token.
2. **Partial-JSON repair ideas**: complete-items-so-far + structural-key brace repair
   (`packages/core/src/a2ui-markdown/operations.ts:110-164`). If the Express DSL is
   line-oriented, streaming gets simpler; keep the "one bad node can't eat the rest" rule.
3. **Catalog shape**: `id` (versioned) + `extends` + `overrides` + `omit`
   (`packages/react-core/src/v2/generative-ui/catalog.ts:186-205,516-547`). Overrides keyed
   by catalog name are exactly the "native look" hook: Paseo maps `Button` → its RN
   button, t3code maps `Button` → its BaseUI button; the schema the model sees stays the same.
4. **Definitions vs renderers split** (`packages/a2ui-renderer/src/react-renderer/create-catalog.tsx:15-31,79-81,110`):
   one shared schema module, per-platform renderer maps type-checked against it.
5. **Hide bound props/matched events from the model** (`catalog.ts:641-652`) and
   prompt only for features in use (`packages/shared/src/a2ui-prompts.ts:250-272`).
6. **Typed theme tokens with a `dark` override** (`packages/react-core/src/v2/generative-ui/theme.ts:15-75`):
   map them to Tailwind CSS vars on t3code and a JS token object on RN.
7. **Named targets with description + component whitelist + fallback**
   (`.../generative-ui/GenerativeUISurface.tsx:1-60`) = our "canvas/app" surface;
   plus a chat-card slot with `isStreaming/error/rejected` (`.../generative-ui/chat.tsx:20-35`).
8. **Action → visible user message** fallback (`.../generative-ui/action-message.ts:26-40`)
   and the `agent_busy` double-click guard (`.../generative-ui/use-generative-ui-root.ts:579-590`).
9. **Error UX**: a per-component boundary that tells the user to ask the assistant to fix it
   (`packages/a2ui-renderer/src/react-renderer/a2ui-react/adapter.tsx:46-80`); feed
   validator rejections back to the model.
10. The "when to show UI" prompt playbook (`packages/shared/src/generative-ui/prompt-spec.ts:82-87`).

# Avoid

- **Two stacks.** CopilotKit keeps Stack A (web_core v0.9, untyped `Theme`,
  `defaultTheme = {}`, deprecated `createA2UICatalog`) next to Stack B
  (`packages/a2ui-renderer/src/react-renderer/index.ts:51-56,111-121`). Pick one.
- **Secondary-LLM `render_a2ui` planner** (`showcase/integrations/langgraph-python/src/agents/a2ui_dynamic.py:52-68`):
  an extra model call, more latency, and a stub tool that throws if the middleware is missing.
- **Runtime middleware dependency** on the tool path (AG-UI activities, server-side
  validation). Coding-agent surfaces (Paseo/t3code) don't own the agent runtime, so
  client-side parse + validate is enough.
- **Kitchen-sink standard catalog** (~80 components, ~9.2k LOC, recharts + maplibre +
  streamdown deps; `packages/react-core/package.json:107-156`). Start with ~12 core
  components; ship Chart/Map as opt-in, lazy-loaded macros.
- **Global DOM CSS injection** (`injectStyles`, `@layer a2ui-reset`;
  `packages/a2ui-renderer/src/react-renderer/styles/README.md:8-30`): useless on RN, fights Tailwind
  on web; use host tokens instead.
- **Zod-specific binder heuristics** (dynamic props detected by Zod type;
  `react-renderer/index.ts:90-95`): a known footgun, since a raw `{path}` object can reach React.
- **DOM-only renderers**: CopilotKit has no RN A2UI renderer
  (`packages/react-native/src/index.ts:51-66`), so Paseo needs its own. Keep renderer
  maps thin per platform over a shared pure-TS core (parser, model, resolver, validator).

# Suggested minimal footprint

`core` (pure TS: fence split, DSL/JSON parse with repair, surface model, binding, validation,
prompt builder) + `catalog-schema` (shared) + `renderers-rn` / `renderers-web` (override
maps over host components) + `<A2uiSurface target>` + chat card. See
[architecture.md](architecture.md), [catalog-and-theming.md](catalog-and-theming.md).
