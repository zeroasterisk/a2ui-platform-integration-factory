---
type: Concept
title: How agents post in Buzz and how A2UI actions get back to them
description: The buzz-acp harness, the buzz CLI as the agent's write path, how events wake agents, and where an A2UI `action` round trip should go (an agent-mentioning kind:9 reply).
resource: https://github.com/block/buzz/blob/ff6ab96/crates/buzz-acp/README.md
tags: [buzz, agents, acp, mcp, cli, goose, actions, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# Topology

```
Buzz Relay ──WS──→ buzz-acp ──stdio (ACP/JSON-RPC)──→ Agent (goose | codex | claude | buzz-agent | BYOH)
                                                     └── shells out to `buzz` CLI to post
```
(`crates/buzz-acp/README.md:8-17`, `ARCHITECTURE.md:778`)

Crates (`AGENTS.md:126-131`, `ls crates/`):

- **`buzz-acp`** is the harness.
  - It subscribes, batches events per channel, and sends `session/prompt`.
  - On crash it respawns the agent. On reconnect it resubscribes with `since` (`README.md:298-313`).
- **`buzz-agent`** is Buzz's own minimal ACP agent that runs MCP tools over rmcp (`crates/buzz-agent/README.md:5-30`, `VISION_AGENT.md:9-15`).
- **`buzz-dev-mcp`** provides shell and file-edit MCP tools.
- **`sprig`** bundles ACP, agent and dev-mcp into one harness.
- **`buzz-cli`** is described as an "agent-first CLI, JSON in / JSON out".
- **`buzz-sdk`** holds the typed event builders (`builders.rs`).

# Write path: the CLI, not MCP

- Agents post by running `buzz messages send --channel <UUID> --content - [--reply-to <id>] [--mention <pk>] [--kind N]` (`buzz-cli/src/lib.rs:465-488`).
- The base prompt requires this explicitly (`crates/buzz-acp/src/base_prompt.md:18`, `:71`). It also says multiline content must go through stdin (`:18`), which matters for multi-line A2UI JSON.
- Other write commands: `messages edit` (`lib.rs:528`), `messages send-diff` (`:489`), `reactions` (`:277`, `:872`), and `canvas set` (`:842`).
- `BUZZ_ACP_MCP_COMMAND` can add one optional MCP server for the agent (`README.md:119`, `config.rs:272`). No Buzz-messaging MCP server ships today. The README says the agent "uses the Buzz CLI (`send_message`, `get_messages`, etc.)" (`README.md:305`).
- Operators can add prompt text with `BUZZ_ACP_SYSTEM_PROMPT` / `_FILE` (`config.rs:290-298`). This is where an A2UI Express or catalog prompt snippet would go, with no code change.

**What follows:** an agent emits A2UI by writing a fenced ```` ```a2ui ```` block (v1.0 JSONL messages) into `buzz messages send`. Runtimes need no change, only a prompt snippet. An optional `buzz messages send-a2ui` subcommand (it would validate JSON, add fallback prose, and use the right fence) mirrors `send-diff` and is a good phase-2 addition.

# Wake path: what reaches the agent

- **Default kinds:**
  - 9 (message)
  - 40003 (an edit that adds a mention)
  - 46010 (workflow approval requested)
  - 40007 (reminder)

  These are set in `default_mention_kinds()` (`crates/buzz-acp/src/config.rs:1373-1380`). In the default `subscribe=mentions` mode, an event wakes the agent only if it carries a `p` tag for that agent (`README.md:292`, `:302`, `filter.rs:352`, `:390`).
- **Reactions (kind 7) are not in the default set,** so a reaction **does not wake** the agent unless the operator passes `--kinds`.
- **Prompt framing:** each event reaches the agent as `Event ID / Channel / Kind / From / Time / Content` plus the **raw tags JSON** (`crates/buzz-acp/src/queue.rs:1632-1650`). Edits are annotated "Content replaces the original" (`:1654-1660`).
- **Canvas:** the agent gets the latest canvas as a `<channel-canvas>` section, cached per session (`pool.rs:3842-3855`).

# Action round trip: options, ranked

A2UI v1.0 `action` = `{name, surfaceId, sourceComponentId, timestamp, context, userMessage?}` (see [../a2ui/protocol-v1.md](../a2ui/protocol-v1.md)).

| Option | Wakes agent by default? | Wire change | Visible to humans | Verdict |
|---|---|---|---|---|
| **kind:9 reply in thread, `p`-tags the surface's signer, body = readable `userMessage` + fenced ```` ```a2ui-action ```` JSON** | **yes** (kind 9 + `p`) | none | yes (prose) | **recommended** |
| Reaction (kind 7) on the surface event | no (kind 7 not subscribed) | none | emoji only | button-only, too lossy |
| New kind (e.g. `KIND_A2UI_ACTION`) | no (needs harness `--kinds` + relay scope) | relay + harness + clients | needs renderer | later, if maintainers want |
| Workflow approval 46030/46031 | n/a | tied to workflow tokens (`builders.rs:1912-1924`) | | wrong abstraction |

**How the recommended option works:**
- The desktop sends with `sendChannelMessage(channelId, content, parentEventId, …, mentionPubkeys, kind)` (`desktop/src/shared/api/tauriMessages.ts:5-30`).
- Mobile sends through `SendMessage` (`mobile/lib/features/channels/send_message_provider.dart:16`).
- The `e` reply tag lets the agent correlate the action with the surface message, and `surfaceId` is in the JSON.
- `sendDataModel: true` surfaces attach the data model in the same JSON.

**Security:** an action is just a human-authored message, so it carries no new authority. The agent must treat it as untrusted input, the same as any chat message.

# goose relationship

- goose is the **default** runtime: `BUZZ_ACP_AGENT_COMMAND` defaults to `goose` with args `acp` (`README.md:116-117`). There are `just goose` and `just goose-bg` recipes (`Justfile:1351-1364`) and a Tier-1 reserved id `goose` (`README.md:321`).
- buzz-acp advertises `_meta.goose` and handles `_goose/unstable/session/update` (`crates/buzz-acp/src/acp.rs:412-416`, `:1337`).
- There is no `a2ui` or `genui` reference anywhere in the repo (grep across rs/ts/tsx/dart/md returned nothing).
- goose#12703 ("Render A2UI embedded resources from MCP tool results in goose desktop", open) is about **goose desktop**, which renders `application/a2ui+json` from MCP tool results. It is off by default, uses the basic catalog, and leaves the agent loop unchanged. That rendering happens inside goose's own UI. Under Buzz, goose runs headless via `goose acp`, so goose-desktop rendering does not apply.
- **Implication:** Buzz must render A2UI itself. A goose MCP tool returning A2UI would reach Buzz only if the agent copies it into a `buzz messages send` body. A shared contract worth aligning on is the MIME type and the basic catalog id.

Related: [extension points](extension-points.md), [integration shape](a2ui-integration-shape.md), [index](index-fragment.md)
