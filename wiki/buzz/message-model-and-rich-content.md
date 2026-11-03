---
type: Concept
title: Buzz message model, event kinds and how rich content renders
description: Nostr kinds in buzz-core, the end-to-end path for adding a kind (traced via diff kind 40008), and how canvases, workflows, PRs, attachments and in-band sentinels render.
resource: https://github.com/block/buzz/blob/ff6ab96/crates/buzz-core/src/kind.rs
tags: [buzz, nostr, event-kinds, relay, canvas, rendering, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# The kind registry

`crates/buzz-core/src/kind.rs` is the authoritative registry (`CONTRIBUTING.md:563-564`). `ALL_KINDS` is at `:689` and the duplicate test at `:969`. Kinds relevant to A2UI:

| Kind | Const | Line | Note |
|---|---|---|---|
| 9 | `KIND_STREAM_MESSAGE` | `:527` | the chat message (NIP-29). Doc comment `:522-526` shows conventions ride on kind 9 (`!shutdown`) "not a new event kind" |
| 40002 / 40003 | `_V2` / `_EDIT` | `:529-531` | v2 message, edit |
| 40008 | `KIND_STREAM_MESSAGE_DIFF` | `:541` | unified diff, own timeline row |
| 40100 | `KIND_CANVAS` | `:543` | one shared markdown doc per channel, revisioned |
| 40099 | `KIND_SYSTEM_MESSAGE` | `:545` | join/leave rows |
| 7 | `KIND_REACTION` | `:58` | NIP-25 |
| 43001-43006 | `KIND_JOB_*` | `:566-576` | job request/progress/result |
| 45010 | `KIND_ARTIFACT` | `:600` | |
| 46010 / 46030-1 | `WORKFLOW_APPROVAL_REQUESTED` / `APPROVAL_GRANT`/`DENY` | `:630`, `:612-614` | interactive approval round-trip |
| 1617 / 1618 | `KIND_GIT_PATCH` / `_PULL_REQUEST` | `:663-665` | NIP-34 forge |
| 24200 | `KIND_AGENT_OBSERVER_FRAME` | `:517` | encrypted agent telemetry |

# Adding a kind end to end (documented + traced)

The documented recipe is in `CONTRIBUTING.md:502-570`: kind const → payload type → `required_scope_for_kind()` → `side_effects.rs` → `buzz-db` → search → tests in `buzz-core` + `buzz-test-client` → docs.

Diff kind 40008 shows the real touch set for a channel-scoped content kind.

**Core**
- `kind.rs:541` const.
- `ALL_KINDS` entry (`:766`).

**Relay** (`crates/buzz-relay/src/handlers/`)
- Scope: `ingest.rs:589` (`Scope::MessagesWrite`). Unknown kinds are rejected with `restricted: unknown event kind` (`ingest.rs:654`).
- Requires an `h` channel tag: `requires_h_channel_scope` (`ingest.rs:827-842`).
- Content validation: `ingest.rs:3150-3152` calls `validate_diff_event` (`ingest.rs:1520-…`), which enforces a 60 KB cap and `repo`/`commit` tags. The generic cap is `MAX_EVENT_CONTENT_BYTES = 256 KB` (`ingest.rs:2648`).
- Fan-out lists: `event.rs:1532-1585`, `ingest.rs:3824-3826`.
- **Unknown:** whether `schema/` needs changes. Events go to the generic `events` table; no per-kind table was found for 40008.

**SDK / CLI**
- `buzz-sdk/src/builders.rs:357` `build_diff_message`.
- `buzz-cli/src/commands/messages.rs:727-800` `SendDiff` / `cmd_send_diff_message`.

**Desktop**
- `shared/constants/kinds.ts:23`, listed in `CHANNEL_EVENT_KINDS` (`:108`) and `CHANNEL_TIMELINE_CONTENT_KINDS` (`:141`).
- `formatTimelineMessages.ts:52-56` (`isTimelineContentEvent`).
- `MessageRow.tsx:386` switch-case renders the diff row with lazy `Suspense`.
- Also `useChannelTyping.ts:56`, `workflowMessageCandidates.ts`, `localArchiveKinds.ts:34`, and the e2e bridge (`src/testing/e2eBridge.ts:5622`, `:5901`).

**Mobile**
- `shared/relay/nostr_models.dart:39` `streamMessageDiff`, in `channelEventKinds` (`:73`) and `channelWindowPageKinds` (`:96`).
- `features/channels/timeline_message.dart:522-524` treats it like kind 9 text.

Conclusion: a new kind touches about 15 files across Rust, TS and Dart, plus an integration test. This is heavy for a "minimal" PR.

# In-band rich content on kind 9 (zero relay change)

Two shipped precedents put structured UI inside an ordinary kind:9 body, with plaintext fallback.

1. **Config nudge (agent-authored card).**
   - `buzz-acp` appends ```` ```buzz:config-nudge\n{json}\n``` ```` to its prose (`crates/buzz-acp/src/setup_mode.rs:249-308`).
   - Desktop parses it with `extractConfigNudge` (`desktop/src/shared/lib/configNudge.ts:1-16`, `:78`, `:94`).
   - It trusts the payload only if the **event signer** is a known agent and equals `payload.agent_pubkey`:
     - `computeConfigNudge` (`shared/lib/computeConfigNudge.ts`);
     - `getConfigNudgeAuthorPubkey` (`features/messages/ui/configNudgeAuthPubkey.ts`), which takes kind 9 + `signerPubkey`.
   - On success, `markdown.tsx:1729-1731` swaps the prose for `<ConfigNudgeCard>` (`markdown.tsx:1839`).
   - Mobile has **no** handler; it shows the fenced JSON as a code block.
2. **Wave.**
   - The `<!-- buzz:wave:v1 -->` marker (`features/messages/lib/waveMessage.ts:1-21`) is checked in the `MessageRow.tsx:417-429` default branch.

The generic fenced-code hook already exists on both clients:
- Desktop: `markdown.tsx:1409-1420` `code` component (`language-*`).
- Mobile: `gpt_markdown` `codeBuilder` → `_MessageCodeBlock` (`mobile/lib/features/channels/message_content.dart:388`, `:911`).

# Existing rich surfaces

**Canvas (40100)**
- Content is **markdown text**, one live head per channel, with revision history.
- Write path: CLI `buzz canvas get|set|history|restore` (`buzz-cli/src/lib.rs:832-860`, `commands/channels.rs:273-433`) → SDK `build_set_canvas*` (`builders.rs:585-643`) with head-conflict discipline.
- Relay: write scope `ChannelsWrite` (`ingest.rs:627`) and revision handling (`ingest.rs:2642`, `:3544`).
- Agents read it as `<channel-canvas>` prompt context (`buzz-acp/src/pool.rs:3842-3855`).
- Desktop renders it with `<Markdown>` in `features/channels/ui/ChannelCanvas.tsx:1-60`, inside `ChannelManagementSheet.tsx:979` (via `KeyedChannelCanvas`).
- Mobile fetches it with `channelCanvasProvider` (`channel_management_provider.dart:648-…`, filter `nostr_filters.dart:117-124`) and shows only a 4-line plaintext preview (`manage_channel_sheet.dart:356-372`).

**Workflows**
- Approval requests (46010) wake agents (`buzz-acp/src/config.rs:1373-1380`).
- Grants and denies use 46030/46031 via `build_workflow_approval` (`builders.rs:1912`).
- Desktop: `features/workflows/ui/WorkflowApprovalCard.tsx`. Mobile: activity feed only (`features/activity/feed_item.dart:57-82`).
- The feature is preview-gated, desktop only (`preview-features.json:4-8`).

**PRs / patches**
- NIP-34 kinds 1617/1618 plus status kinds.
- Desktop `features/projects/`. Gated `projects`, desktop only (`preview-features.json:10-14`).

**Attachments**
- Blossom upload produces NIP-92 `imeta` tags on kind 9 (`buzz-cli/src/commands/messages.rs:617-625`).
- Desktop builds `imetaByUrl` (`MessageRow.tsx:181`, `:300`).
- Mobile: `message_media.dart` / `message_gallery.dart`.

Related: [extension points](extension-points.md), [integration shape](a2ui-integration-shape.md), [index](index-fragment.md)
