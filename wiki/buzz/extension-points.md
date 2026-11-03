---
type: Concept
title: Buzz extension points and the smallest A2UI touch points
description: No plugin or extension mechanism exists in Buzz; this page ranks the real seams for an inline `a2ui` message and a canvas surface by diff size.
resource: https://github.com/block/buzz/blob/ff6ab96/docs/buzz-v1-extension-design.md
tags: [buzz, extension, plugin, a2ui, canvas, integration]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# There is no plugin system

- **`docs/buzz-v1-extension-design.md`** is 21 lines long. It covers **read-state accessory extension constraints** only: thread previews, revision tokens, and mute overrides. It describes itself as "design guidance for follow-up work, not implemented wire capabilities" (`:1-4`, `:20-21`). It has nothing to do with UI or message plugins.
- **`docs/MCP_DRIVEN_HOOKS.md`** defines lifecycle hooks for **buzz-agent**. These are MCP tools whose names start with `_`, such as `_Stop` and `_PostCompact`. They are hidden from the LLM and called by the agent loop (`:1-40`). This is an agent-side extension point and has no effect on rendering.
- **Preview feature flags** live in `preview-features.json`. Each entry has `id`, `name`, `description`, `platforms`, and an optional `defaultEnabled` field, validated with zod in `desktop/src/shared/features/manifest.ts:1-25`. Read flags with `useFeatureEnabled` from `desktop/src/shared/features/useFeatureEnabled.ts`.
  - This is the sanctioned way to ship off-by-default UI.
  - **Unknown:** no Dart consumer of this file was found under `mobile/lib`. The mobile flag mechanism is unverified.
- **BYOH harness presets** (`crates/buzz-acp/README.md:315-371`) let users plug in agent *runtimes*, not renderers.
- **No dynamic renderer registry.** Desktop dispatches on hard-coded `switch (message.kind)` (`MessageRow.tsx:385-417`) plus content sniffers (wave, config-nudge). Mobile uses `if` chains in `timeline_message.dart:522-524`.

# Candidate seams, smallest first

| # | Seam | Wire change | Files (approx.) | Precedent |
|---|---|---|---|---|
| A | **Fenced ```` ```a2ui ```` block inside a kind:9 body**, intercepted by the markdown `code` renderer | none | desktop 3–5 + mobile 2–3 (+ deps) | config-nudge (`setup_mode.rs:308`, `markdown.tsx:1729`, `:1839`), wave marker |
| B | New `KIND_A2UI` (e.g. 400xx) with own timeline row | relay, sdk, cli, both clients | ~15 | diff 40008 (see [message model](message-model-and-rich-content.md)) |
| C | A2UI JSON as `imeta`-style attachment / tag | tags on kind 9 | ~6 | NIP-92 `imeta` |
| D | Canvas (40100) content holds A2UI instead of markdown | none (content is opaque text; 256 KB cap `ingest.rs:2648`) | desktop 2 (`ChannelCanvas.tsx`) + mobile 2 | canvas is markdown today |

**Recommendation: A for inline messages, A-in-canvas for the canvas surface.**

## Seam A: inline message

- Content is plain text, so it already works for:
  - every agent runtime: goose, claude, codex, buzz-agent (agents post with `buzz messages send`);
  - search;
  - edits (40003);
  - threads;
  - replay;
  - non-supporting clients, which show the prose plus a code block.
- **Desktop hook:** `markdown.tsx` `code` component at `:1409-1420`. Add an `a2ui` language branch there. Alternatively, follow the config-nudge pattern: detect at `MarkdownInner` and render `<A2uiCard>` next to the prose.
- **Mobile hook:** `codeBuilder` at `message_content.dart:388`, which receives `name`, the fence language.
- **Trust gate:** reuse `getConfigNudgeAuthorPubkey` (`features/messages/ui/configNudgeAuthPubkey.ts`). It requires `kind === 9` and a signer that is a known agent. Without this gate, any human could post a card that impersonates agent UI.

## Seam D: canvas surface

- Canvas content is free text rendered by `<Markdown>` (`ChannelCanvas.tsx:10`). If the markdown renderer gains the `a2ui` fence handler from Seam A, a canvas containing an ```` ```a2ui ```` block renders natively for free on desktop.
- Agents already have `buzz canvas set` (`buzz-cli/src/lib.rs:842-850`, which reads markdown or stdin).
- **Mobile canvas is preview-only:** `manage_channel_sheet.dart:356-372` shows a 4-line `Text`. A real canvas surface on mobile needs a new full-screen view. That is net-new UI.
- Canvas is "one live head per channel" with optimistic concurrency (`build_set_canvas_after_head`, `builders.rs:622`). It suits a persistent dashboard surface where the agent rewrites the whole thing. Do not use it for streaming deltas.
- **Edit conflict:** desktop canvas editing is a markdown `Textarea`. A human editing a canvas that contains A2UI JSON sees raw JSON. That is acceptable for v1, but say so in the PR.

## Why not a new kind first

- `CONTRIBUTING.md:435-449` lists "entirely new features with no prior discussion" as unlikely to merge.
- A new kind spans relay scope, validation, SDK, CLI, both clients, and integration tests.
- Seam A is reversible and has no protocol commitment. A kind can follow once maintainers agree.

## Streaming / updateComponents

- The v1.0 messages `updateComponents` and `updateDataModel` must apply to an *existing* surface.
- With Seam A, the agent edits the original message (kind 40003, via `buzz messages edit`) with the full new JSONL. The client re-renders, and the edit overlay already exists on both clients (aux kinds, `kinds.ts:125-130`, `nostr_models.dart:81-87`).
- True incremental deltas across messages, keyed by `surfaceId`, would need cross-message state. **Defer this.**

Related: [integration shape](a2ui-integration-shape.md), [agent posting](agent-posting-and-actions.md), [index](index-fragment.md)
