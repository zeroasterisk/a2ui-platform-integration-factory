---
okf_version: "0.2"
type: Index
title: A2UI Platform Integration Knowledge
description: OKF v0.2 bundle on A2UI v1.0 and the multi-agent surfaces it integrates with (Paseo, t3code) plus reference implementations (CopilotKit).
status: draft
---

# Overview

Source-verified notes compiled from upstream repos (commit SHAs in each page's `sources`).

# Sections

## a2ui

- [Protocol v1.0 essentials](a2ui/protocol-v1.md): message types, adjacency-list components, `@path`/`@call` binding, actions and errors, capabilities (use the key `"1.0"`).
- [Express DSL and @a2ui/agent](a2ui/express-and-agent-sdk.md): grammar, prompt contract, compiler and streaming, Node usage for chat vs canvas. v1.0 and Express both ship in npm 0.1.0. Verified end to end.
- [Macros](a2ui/macros.md): Python `MacroExpander` and `@macro` (1,044 LOC). There is **no TS equivalent**; a minimal port is about 250-300 LOC.
- [web_core in React Native](a2ui/web-core-rn-safety.md): the root, state, processing and resolution subpaths are DOM-free (verified). `/v1_0` and `/catalogs/basic/v1` pull in lit and crash.
- [@a2ui/react and the RN design](a2ui/react-renderer-and-rn-design.md): the React renderer hosts components in custom elements and so is web-only. Includes a minimal shared renderer core over web_core.
- [Catalogs](a2ui/catalogs.md): the 18 basic v1 components with props, 14 functions, and how to define custom catalogs (`catalog_definition.json`).
- [Conformance fixtures](a2ui/conformance-fixtures.md): `adapter_conformance.yaml` (13 cases) and `node_resolution.yaml` (20) as renderer acceptance tests, plus macro goldens.
- [Recommended packages](a2ui/recommended-packages.md): pins (`@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0`), what we write ourselves, and risks.

## paseo

- [Design system](paseo/design-system.md): tokens, primitives, and the 11-color `PluginTheme` + `client/ui` that plugins actually get.
- [Plugin system](paseo/plugin-system.md): layout, esbuild compiler, host modules, npm deps (bundled; not in built-ins).
- [Client contracts](paseo/plugin-client-contracts.md): timeline transformer/renderer, panels, slash commands, pills, `agents.send`.
- [Server contracts](paseo/plugin-server-contracts.md): RPC, subscriptions, `timeline.append` (64 KiB), agent tools, hooks.
- [Plugin examples](paseo/plugin-examples.md): timeline-items, inline-thinking, agent-tools, markdown-panel, local-plugin….
- [A2UI integration](paseo/a2ui-integration.md): emit options A/B/C, action round-trip, recommended layout.
- [Dev & QA](paseo/dev-and-qa.md): dev daemon, Docker, mock provider, Playwright plugin e2e, PR bar, skills.

## t3code

- [Recommended A2UI integration shape](t3code/a2ui-integration-shape.md) — fenced ```a2ui blocks rendered natively on web + mobile; exact PR file list; Phase 2 MCP tool.
- [Extension points](t3code/extension-points.md) — no plugin system exists; ranked smallest core touch points.
- [Rich timeline items](t3code/rich-timeline-items.md) — html_render / MCP Apps traced contracts → server → wire → web → mobile.
- [MCP Apps route](t3code/mcp-apps-route.md) — zero-diff A2UI via ui:// apps; Codex-only, iframe, confirm dialogs.
- [Agent tools and actions](t3code/agent-tools-and-actions.md) — T3 MCP server reaches every provider; posting user actions back to a thread.
- [Design system](t3code/design-system.md) — Tailwind v4 tokens, base-ui primitives, no-restyle rule, mobile Uniwind.
- [Local dev and testing](t3code/local-dev-and-testing.md) — dev runner, never touch ~/.t3/userdata, free Replay (dev) ACP provider for e2e.
- [Contribution rules](t3code/contribution-rules.md) — prior approval for features, one problem per PR, evidence, docs rules.

## copilotkit

- [Architecture: two A2UI stacks](copilotkit/architecture.md): `a2ui` (web_core v0.9) vs experimental `generativeUI` (v1.0 ops, tool/markdown).
- [Catalog & theming](copilotkit/catalog-and-theming.md): `createCatalog`, `createGenerativeUI` extends/overrides/omit, `--a2ui-*` tokens.
- [Agent emission](copilotkit/agent-emission.md): ```` ```a2ui ```` fences, `render_ui`, partial-JSON repair, prompts, action round-trip.
- [Surfaces & components](copilotkit/surfaces-and-components.md): chat vs `<GenerativeUISurface>` targets, standardUI (Chart/Map/Form), no RN, demos.
- [Copy vs avoid](copilotkit/copy-vs-avoid.md): recommendations for the factory.

## buzz

- [Recommended A2UI integration shape](buzz/a2ui-integration-shape.md): fenced ```a2ui blocks in agent-signed kind:9 messages and canvases, with p-tagged thread-reply actions; PR file lists for desktop and mobile.
- [Extension points](buzz/extension-points.md): no plugin system; config-nudge sentinel precedent; preview-features gate; canvas seam.
- [Message model and rich content](buzz/message-model-and-rich-content.md): kind registry; diff kind 40008 traced end to end; canvas/workflow/PR/attachment rendering.
- [Agent posting and actions](buzz/agent-posting-and-actions.md): buzz-acp + CLI write path, wake kinds, goose's role.
- [Design system](buzz/design-system.md): Tailwind v4 + shadcn tokens, Flutter theme, mapping to the basic catalog.
- [Local dev and e2e](buzz/local-dev-and-e2e.md): mock-bridge Playwright template, relay, CLI or scripted fake agent.
- [Contribution standards](buzz/contribution-standards.md): issue-first, DCO, `just ci`, file-size gate, review-proven rules.

## comparisons

_TBD._
