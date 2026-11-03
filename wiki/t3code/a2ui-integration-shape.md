---
type: Guide
title: Recommended A2UI integration shape for t3code (minimal PR)
description: Fenced a2ui blocks in assistant markdown rendered natively on web and mobile, actions posted as queued user messages; file list and phasing.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/apps/web/src/components/ChatMarkdown.tsx
tags: [t3code, a2ui, integration, pr-plan, generative-ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Recommendation

**Phase 1 (the PR): A2UI as a fenced code block in assistant markdown, rendered natively.**
No contract, server, orchestration, adapter or persistence change. It works for every provider
(it's just text), on web/desktop/mobile, survives replay and forks, and is copyable — the same
"data lives in ordinary message text" model as assistant citations
(`docs/internals/assistant-citations.md:1-7`).

````md
```a2ui
{"version":"v1.0","createSurface":{"surfaceId":"s1","catalogId":"…basic…"}}
{"version":"v1.0","updateComponents":{"surfaceId":"s1","components":[…]}}
```
````

(Express DSL or JSONL inside the fence; the parser is the only format-specific code.)
`<a2ui>…</a2ui>` raw tags are a poor fit: chat markdown runs `rehype-raw` + `rehype-sanitize`
(`packages/shared/src/markdownPipeline.ts:300-305`) and would strip unknown elements.

# Files a minimal PR touches

| # | File | Change |
|---|---|---|
| 1 | `packages/shared/src/a2ui.ts` (new) + `package.json` subpath export | parse/validate fenced payload → typed surface tree; basic-catalog subset; action → message text serializer. Pure, no React. |
| 2 | `packages/shared/src/a2ui.test.ts` (new) | table tests for parse, invalid input, partial/streaming input (external-format parsing must be tested, `docs/internals/testing.md:5`) |
| 3 | `apps/web/src/components/ChatMarkdown.tsx` | branch `language === "a2ui"` beside `math`/`mermaid` (`:1582-1630`), gated by `isClosedCodeFence` (`:1588`) so streaming shows the code block until closed; fall back to `MarkdownCodeBlock` on parse error |
| 4 | `apps/web/src/components/chat/A2uiSurface.tsx` (new) | maps catalog → `components/ui` (`Button`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Select`, `RadioGroup`, `Separator`, `Badge`, `Alert`, `Table`); variants only, no restyle (`AGENTS.md:197`) |
| 5 | `apps/web/src/components/chat/timelineRowContext.ts` + `TimelineAssistantRows.tsx:57` | pass existing `onSendAppMessage` (`timelineRowContext.ts:65`) into markdown context like `onUseArtifactTemplate` |
| 6 | `apps/mobile/src/features/threads/ThreadFeed.tsx` | segment split beside artifact templates (`:1215-1260`), render `A2uiSurface` |
| 7 | `apps/mobile/src/features/threads/A2uiSurface.tsx` (new) | maps catalog → `apps/mobile/src/components/ui` (`Button`, `ListToggleRow`, `NativeSwitch`, `SegmentedControl`, `Notice`, `AppText`) with Uniwind classes; actions via `enqueueThreadOutboxMessage` (`apps/mobile/src/state/thread-outbox.ts:19`) |
| 8 | `apps/server/scripts/dev-replay/a2ui_transcript.ndjson` (new) + `SCENARIOS` row in `dev-replay-agent.ts:44-67` | free demo/e2e scenario (see [local dev](./local-dev-and-testing.md)) |
| 9 | `docs/user/html-renders.md` | short "Interactive replies" section (`AGENTS.md:167-168`) |
| 10 | optional: `apps/web/src/components/chat/A2uiSurface.browser.test.tsx` | one behavior test: click → `onSendAppMessage` called with serialized action |

Agent discovery for Phase 1: a skill/AGENTS.md snippet in the *user's* project, or later a short
section in `packages/provider-core/src/server/orchestrationInstructions.ts` (requires evals,
`AGENTS.md:144-146`, and costs context budget for every user — likely a maintainer call).

# User actions

A2UI `action {name, surfaceId, sourceComponentId, context}` → serialized as a fenced
```a2ui-action block (or terse text) → `onSendAppMessage(text)` → `startThreadTurn` with
`dispatchMode: "queue"` (`apps/web/src/components/ChatView.tsx:1861-1879`). Data-model edits
(text fields, checkboxes) stay client-local until an action fires. After the thread moves on,
older surfaces should render read-only or still allow actions — a "reverse state" decision
(`AGENTS.md:74`).

# Phase 2 (only if needed): `a2ui_render` T3 MCP tool

Mirror `html_render` ([rich items](./rich-timeline-items.md)): toolkit under
`apps/server/src/mcp/toolkits/a2ui/`, register in `McpHttpServer.ts:1192-1204`, name in
`t3McpToolPresentation.ts:373`, marker key in `compactDynamicToolOutput`
(`packages/shared/src/toolOutput.ts:113-160`, mind the 8 KB metadata cap or store via attachment
like `htmlRender`), new row kind in `session-logic.ts`, `MessagesTimeline.logic.ts`,
`MessagesTimeline.tsx`, mobile `threadActivity.ts`/`ThreadFeed.tsx`, instructions + eval.
Gains schema validation feedback to the model and plan-mode use; costs ~12 more files and a
context-budget increase.

# Rejected / fallback

- MCP App wrapper: zero diff, Codex-only, iframe, confirm dialogs ([MCP Apps route](./mcp-apps-route.md)).
- New contract turn-item type: touches every adapter and persisted-event decoding
  (`docs/internals/overview.md` "Durable intent") — unjustified by A2UI's needs.

See also: [extension points](./extension-points.md), [design system](./design-system.md),
[contribution rules](./contribution-rules.md).
