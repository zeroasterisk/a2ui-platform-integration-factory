---
type: Concept
title: t3code extension points (there is no plugin system)
description: Search results for plugin/extension mechanisms and the smallest core touch points for new inline UI.
resource: https://github.com/pingdotgg/t3code/blob/c0ec87a5/AGENTS.md
tags: [t3code, architecture, extensibility, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:50:00Z
sources:
- id: t3code-main-c0ec87a5
  resource: https://github.com/pingdotgg/t3code/tree/c0ec87a5
---

# Finding

No renderer/plugin/extension registry exists in server, web, mobile, contracts or client-runtime.
A grep for `plugin|registerRenderer|customRenderer|extension point` across `apps/server/src`,
`apps/web/src`, `packages/contracts/src`, `packages/client-runtime/src` only hits:

- remark/rehype plugin lists for markdown (`packages/shared/src/markdownPipeline.ts:205-305`,
  `apps/web/src/components/ChatMarkdown.tsx:1653-1760`) — fixed module constants, not runtime hooks;
- provider-native plugin/skill discovery (Claude plugins, Cursor `~/.cursor/plugins`:
  `docs/user/cursor.md:18-26`, `docs/user/providers-claude.md:91`) — agent-side, not UI;
- the oxlint plugin (`oxlint-plugin-t3code/`).

Every rich content kind is a hard-coded branch. The only "open" extension surfaces are:

1. **MCP servers** configured for a provider — and MCP Apps (`ui://` iframes), Codex only
   ([mcp-apps route](./mcp-apps-route.md)).
2. **The T3 MCP server** (`/mcp`, key `t3-code`) — but adding a tool is a core diff
   ([agent tools](./agent-tools-and-actions.md)).
3. **Markdown** — fenced code languages and `::directive` blocks are branched in code.

# Smallest core touch points (ranked)

| Option | Where | Cross-provider | Native look | Diff size |
|---|---|---|---|---|
| A. Fenced ```a2ui block in assistant markdown | web `ChatMarkdown.tsx:1582-1630` (beside `math`/`mermaid`); mobile `ThreadFeed.tsx:1215-1260` (beside artifact-template segment split) | yes (it's text) | yes | smallest |
| B. `a2ui_render` T3 MCP tool → `dynamic_tool` output → new timeline row | mirror `html_render` ([rich items](./rich-timeline-items.md)) | all providers with T3 MCP | yes | medium |
| C. MCP App wrapping an A2UI renderer | none in t3code | Codex only | no (iframe) | zero |

## Option A precedent: fenced languages and directives

- Web code-block renderer branches on language: `math` → `MarkdownMath` (`ChatMarkdown.tsx:1582-1591`),
  `mermaid` → `MarkdownMermaidCodeBlock` (`:1614-1630`), else `MarkdownCodeBlock`.
  Streaming guard: `isClosedCodeFence(node, text, code)` (`:1588`) — use it so partial JSON is not parsed.
- Codex `::artifact-template` directive: parsed by shared `remarkCodexDirectives`
  (`packages/shared/src/codexMarkdownDirectives.ts:281`, in remark list `markdownPipeline.ts:211`),
  rendered on web via `div` override `ChatMarkdown.tsx:974-982`, on mobile via
  `splitCodexArtifactTemplateMarkdown` (`codexMarkdownDirectives.ts:366`) used in
  `ThreadFeed.tsx:1226-1253`. Its action (`onUseArtifactTemplate`) inserts text in the composer
  (`ChatView.tsx:1844-1860`) and is threaded through `timelineRowContext.ts:64`.
- This is the exact shape A2UI-in-text needs: shared parser in `packages/shared`, web renderer,
  mobile renderer, and one callback for user actions.
- Note `<a2ui>` raw HTML tags would hit `rehype-raw` + `rehype-sanitize`
  (`markdownPipeline.ts:300-305`) and be stripped; a fenced block avoids the sanitizer.

## Option B precedent: `html_render`

See [rich timeline items](./rich-timeline-items.md). Works for every provider because it rides the
T3 MCP server and the generic `dynamic_tool` turn item; no contract change was needed for the item
type (`packages/contracts/src/orchestrationV2.ts:1808-1817`).

# Constraints that shape the choice

- "Fight for the smallest model"; YAGNI (`AGENTS.md:35-37`).
- "Hit every surface": web, desktop, mobile; every provider gets a decision (`AGENTS.md:65-76`).
- Wire perf: avoid sending too much over websockets (`AGENTS.md:17`); dynamic tool output is
  compacted to 16 KB parsed / 8 KB metadata (`packages/shared/src/toolOutput.ts:15-16`).
- Features need prior maintainer approval for outside PRs (`CONTRIBUTING.md:28-38`).

See also: [integration shape](./a2ui-integration-shape.md), [contribution rules](./contribution-rules.md).
