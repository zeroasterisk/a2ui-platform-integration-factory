---
type: Guide
title: Recommended A2UI integration shape for Buzz (minimal PR plan)
description: Fenced ```a2ui blocks inside agent-signed kind:9 messages (and canvases) rendered natively, with actions sent back as p-tagged thread replies; exact files, desktop vs mobile plan, and phasing.
resource: https://github.com/block/buzz/blob/ff6ab96/desktop/src/shared/lib/configNudge.ts
tags: [buzz, a2ui, integration, pr-plan, generative-ui, flutter, react]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
- id: pub-dev-a2ui-2026-11-03
  resource: https://pub.dev/packages/a2ui_core
- id: goose-12703
  resource: https://github.com/aaif-goose/goose/issues/12703
---

# Shape

**Wire format.** No new kind and no relay change. An agent puts prose plus a fenced block in an ordinary **kind:9** body:

````md
Here's the deploy checklist.
```a2ui
{"version":"v1.0","createSurface":{"surfaceId":"deploy-1","catalogId":"https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json", ...}}
{"version":"v1.0","updateComponents":{...}}
```
````

- The body is JSONL v1.0 messages, the output of Express `parseResponse` (see [../a2ui/express-and-agent-sdk.md](../a2ui/express-and-agent-sdk.md)).
- This copies the shipped `buzz:config-nudge` contract: fenced JSON appended to prose, with the prose as fallback for clients that cannot render it (`crates/buzz-acp/src/setup_mode.rs:308`, `desktop/src/shared/lib/configNudge.ts:1-16`).

**Trust.** Render only when **kind == 9** and the **event signer is a known agent**. Reuse `getConfigNudgeAuthorPubkey` (`desktop/src/features/messages/ui/configNudgeAuthPubkey.ts`). In every other case, show it as a code block.

**Updates.** The agent edits its message (kind 40003, `buzz messages edit`) with the full new JSONL. Both clients already overlay edits.

**Canvas.** The same fence inside a canvas (40100) body renders, on desktop, in `ChannelCanvas` for free, because that view uses `<Markdown>` (`ChannelCanvas.tsx:10`). Agents use `buzz canvas set`.

**Actions back.** On an `event` action, the client sends a kind:9 **thread reply** (`parentEventId` = surface message) that `p`-mentions the surface signer. Its body is the readable `userMessage` (or "Clicked <label>") plus ```` ```a2ui-action ```` JSON `{action, dataModel?}`.
- Kind 9 with a `p` tag is in the harness's default wake set (`crates/buzz-acp/src/config.rs:1373-1380`).
- The agent gets the raw content and tags (`queue.rs:1632-1650`).
- This works with goose, claude, codex, and buzz-agent unchanged.

**Agent side.** Add a prompt snippet through `BUZZ_ACP_SYSTEM_PROMPT_FILE` (`config.rs:290-298`). Optionally, a later PR adds `buzz messages send-a2ui`, which validates input and adds the fallback prose; it would mirror `send-diff` (`buzz-cli/src/commands/messages.rs:727`).

**Gate.** Add a preview flag `a2ui` to `preview-features.json` and read it with `useFeatureEnabled`.

# PR 1: desktop renderer

Desktop is legacy (`AGENTS.md:622`), but it has the e2e harness and the precedent code.

New files, so the file-size gate stays clean. `markdown.tsx` is at 1861/1200 lines and may not grow (see [standards](contribution-standards.md)).

| File | Change |
|---|---|
| `desktop/package.json`, `pnpm-lock.yaml` | `@a2ui/react@0.15.0`, `@a2ui/web_core@0.15.0` (exact pins). Note: they bring `zod@^3` while desktop uses `zod@^4.4.3` (`package.json:90`), so both get installed; acceptable but call it out |
| `desktop/src/shared/lib/a2uiBlock.ts` (+`.test.mjs`) | `extractA2uiBlock(content)` → `{prose, messages[]}` or null; size and line caps (rule R4) |
| `desktop/src/shared/ui/a2ui/A2uiCard.tsx` | frame (`card.tsx`), `MessageProcessor` from web_core, error fallback to code block |
| `desktop/src/shared/ui/a2ui/buzzCatalog.tsx` | basic-catalog components mapped to `@/shared/ui` primitives (see [design system](design-system.md)); `data-a2ui-surface` attribute |
| `desktop/src/shared/ui/a2ui/sendA2uiAction.ts` | builds the reply and calls `sendChannelMessage(…, parentEventId, …, [signer])` (`shared/api/tauriMessages.ts:5`) |
| `desktop/src/shared/ui/markdown.tsx` | **net ≤0 lines**: in the `code` component (`:1409-1420`), route `language === "a2ui"` to `<A2uiCard>` when the trusted-author prop is set (mirror the `configNudge` memo `:1729`) |
| `preview-features.json` | `{"id":"a2ui", "platforms":["desktop","mobile"]}` |
| `desktop/tests/e2e/a2ui-card.spec.ts` + `playwright.config.ts` smoke `testMatch` | copy of `doctor-cta-screenshots.spec.ts` (inject via `send_managed_agent_channel_message`, assert card, click, assert outbound kind-9 send) |

**Open question.** `@a2ui/react` hosts components in custom elements (see [../a2ui/recommended-packages.md](../a2ui/recommended-packages.md)). If that conflicts with Radix portals or styling, use only `web_core` plus a roughly 150-LOC React node view.

# PR 2: mobile renderer (the current app)

| File | Change |
|---|---|
| `mobile/pubspec.yaml`/`.lock` | `a2ui_core: 0.4.0`. It is framework-agnostic and supports v1.0 and `BasicCatalog.v1_0()`. **Not `genui` 0.10.4:** its README says it is "being redesigned" into `a2ui_core`/`a2ui_agent`/`a2ui_flutter`, and `a2ui_flutter` is `0.0.1-wip003`. Dart `^3.11.4`/Flutter `>=3.47.7` satisfies a2ui_core |
| `mobile/lib/features/channels/message_content/a2ui_block.dart` | parse plus trust |
| `mobile/lib/features/channels/message_content/a2ui_surface.dart` (+ `part` files) | widget registry on `context.colors`, `Grid`, `Radii`, `FilledButton` |
| `mobile/lib/features/channels/message_content.dart` | in `codeBuilder` (`:388`), branch on `name == 'a2ui'`. About 80 lines of headroom (1120/1200) |
| send path | reply through `SendMessage` (`send_message_provider.dart:16`) with the `p` tag |
| `mobile/test/features/channels/message_content_a2ui_test.dart` | journey: render → tap → outbound event captured by the relay fake |

**Unknown.** Mobile's `codeBuilder` does not currently know the event signer. Threading `signerPubkey` and `isKnownAgent` into `MessageContent` may touch `timeline_message.dart`.

**Mobile canvas.** Today it is a 4-line text preview (`manage_channel_sheet.dart:356-372`). A rendered canvas surface is a separate, later PR.

# Deferred

- New `KIND_A2UI` / `KIND_A2UI_ACTION`.
- Cross-message `surfaceId` deltas.
- Custom Buzz catalog.
- `a2uiRendererCapabilities` advertisement to agents, e.g. through the prompt `<context>`.
- web/ client: it renders no timelines.
- buzz-app port.

# goose alignment

- goose#12703 renders `application/a2ui+json` MCP resources in **goose desktop** (off by default, basic catalog). Under Buzz, goose runs headless (`goose acp`), so Buzz must render A2UI itself.
- Share the basic catalog id and the v1.0 JSONL shape so the same agent output renders in both clients.

Related: [extension points](extension-points.md), [agent posting](agent-posting-and-actions.md), [local e2e](local-dev-and-e2e.md), [index](index-fragment.md)
