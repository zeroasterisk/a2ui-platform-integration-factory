# a2ui-platform-integration-factory

> **⚠️ Personal Hobby Project** — This is an independent, personal project by [Alan Blount](https://github.com/zeroasterisk). It is **not affiliated with, endorsed by, or supported by any employer, company, or organization**. No warranty; use at your own risk.

Native [A2UI](https://github.com/a2ui-project/a2ui) (v1.0, Express DSL + macros) for multi-agent surfaces. Each integration ships in its host's own repo, depends only on upstream A2UI core packages and the host's SDK, and renders with the host's own design system.

**The factory is a workspace, not a dependency.** See [docs/design/principles.md](docs/design/principles.md).

## 1. Current factory targets

| Host | What it is | Native stack | Extension point | Fork / branch | Status |
|---|---|---|---|---|---|
| [CopilotKit](https://github.com/CopilotKit/CopilotKit) | Agent UI framework, A2UI partner | React (DOM), React Native | `@copilotkit/a2ui-renderer`, A2UI markdown fences | partner-owned; co-developed | first-class: align on v1.0 + Express, shared demos |
| [Paseo](https://github.com/getpaseo/paseo) | Orchestrate coding agents, desktop + mobile | Expo / React Native + unistyles | Plugins: timeline renderer, agent/workspace panels, agent tools | [zeroasterisk/paseo@a2ui](https://github.com/zeroasterisk/paseo/tree/a2ui) | research |
| [t3code](https://github.com/pingdotgg/t3code) | Minimal GUI for coding agents | React + Base UI + Tailwind v4; Expo mobile | None (core PR); MCP Apps + visual replies exist | [zeroasterisk/t3code@a2ui](https://github.com/zeroasterisk/t3code/tree/a2ui) | research |
| [Buzz](https://github.com/block/buzz) (Block) | Humans + agents in shared channels on a Nostr relay | Tauri + React + Tailwind v4 (desktop/web), Flutter (mobile) | New event `kind`s; canvas (`KIND_CANVAS` 40100) | [zeroasterisk/buzz@a2ui](https://github.com/zeroasterisk/buzz/tree/a2ui) | research |

## 2. Completed factory targets

_None yet._

## 3. Other integrations (not factory, tracking)

| Project | A2UI status | Pointer |
|---|---|---|
| [goose](https://github.com/aaif-goose/goose) (AAIF) | Building native A2UI rendering in goose desktop | [issue #12703](https://github.com/aaif-goose/goose/issues/12703) |
| A2UI community renderers | Svelte, Vue, Compose MP, SwiftUI, Ink, React Native (v0.8) | [a2ui.org/ecosystem/renderers](https://a2ui.org/ecosystem/renderers/) |

## 4. Backlog targets

High-confidence fits, to be reviewed before promotion:

| Host | Why it fits | Likely extension point |
|---|---|---|
| [Open WebUI](https://github.com/open-webui/open-webui) | ~158k★; users asked for A2UI ([discussion #20235](https://github.com/open-webui/open-webui/discussions/20235)) | Tools + Rich UI embeds (Svelte) |
| [OpenHands](https://github.com/OpenHands/OpenHands) | ~93k★ autonomous coding agent with web GUI | React web GUI |
| [LibreChat](https://github.com/LibreChat-AI/LibreChat) | ~47k★; existing Artifacts gen-UI surface | Artifacts / MCP UI |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | ~109k★; unlikely target | Ink TUI renderer |

## Workspace layout
- `docs/intent.md`: goal, questions, initial answers, open decisions
- `docs/design/`: principles, factory method, per-host designs
- `docs/plans/`: phased plans
- `recipes/<host>.md`: per-host adapter spec (extension points, component map, action round-trip, e2e). TBD
- `conformance/`: shared Express demo fixtures plus the checklist every integration must pass. TBD
- `wiki/`: OKF v0.2 knowledge bundle
- `STATUS.md` / `NEEDS_ALAN.md` / `CRON.md`: background driver state

## License

[Apache 2.0](LICENSE)
