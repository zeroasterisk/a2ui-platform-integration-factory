---
okf_version: "0.2"
type: Index
title: Paseo section
description: Paseo (getpaseo/paseo @ 3857ed3) plugin system, design system and dev/QA notes for adding A2UI generative UI.
status: draft
---

## paseo
- [Design system](paseo/design-system.md): tokens, primitives, and the 11-color `PluginTheme` + `client/ui` that plugins actually get.
- [Plugin system](paseo/plugin-system.md): layout, esbuild compiler, host modules, npm deps (bundled; not in built-ins).
- [Client contracts](paseo/plugin-client-contracts.md): timeline transformer/renderer, panels, slash commands, pills, `agents.send`.
- [Server contracts](paseo/plugin-server-contracts.md): RPC, subscriptions, `timeline.append` (64 KiB), agent tools, hooks.
- [Plugin examples](paseo/plugin-examples.md): timeline-items, inline-thinking, agent-tools, markdown-panel, local-plugin….
- [A2UI integration](paseo/a2ui-integration.md): emit options A/B/C, action round-trip, recommended layout.
- [Dev & QA](paseo/dev-and-qa.md): dev daemon, Docker, mock provider, Playwright plugin e2e, PR bar, skills.
