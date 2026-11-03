# Intent review

## Goal (one line)
Let any agent running inside a multi-agent surface (Paseo, then t3code, then others) emit A2UI v1.0 UI — chat-inline or canvas — rendered natively by that surface's own design system, with a small reviewable upstream PR per surface.

## Questions → initial answers (verified against source, 2026-11-03)

| Question | Answer |
|---|---|
| What UI/design system does Paseo use? | Expo / React Native (+ web via RN-web, Electron desktop). Styling via `react-native-unistyles`; tokens in `packages/app/src/styles/theme.ts`; rules in `docs/design.md` (quiet, reuse primitives in `components/ui/`, one accent CTA per surface, weight/color over size). No DOM. |
| Can we extend it with fancier components? | Yes, without core changes: Paseo has a local **plugin** system. `addTimelineRenderer` / `addTimelineTransformer` (chat), `addAgentPanel` / `addWorkspacePanel` (canvas), server `timeline.append` (agent-driven rows), agent tool attachment (server hooks). |
| Can components be optional interfaces for agents? | Yes: plugin server attaches an `a2ui_render` tool to opted-in agents (labels), plus a skill describing the catalog. Agents without it are unaffected. |
| Mock Paseo locally with several harnesses? | Likely: daemon + bundled web UI ship as a Docker image; providers incl. Claude Code, Codex, OpenCode, Pi, ACP. To verify in Phase 2. |
| CopilotKit equivalent? | `packages/a2ui-renderer` (React DOM, `@a2ui/web_core` 0.10.x) + markdown-fence parser in core. Useful reference for catalog + theming; not reusable in RN. |
| A2UI main state | `main` @ 80aaef0: v0.9.1 default, **v1.0 candidate** spec. `@a2ui/agent` (TS) has Express DSL compiler; macros are **Python-only** (`a2ui.transformers.macros`). `@a2ui/web_core` 0.15 holds framework-agnostic state; `@a2ui/react` is DOM-only. |
| t3code | React + Base UI + Tailwind v4 (web/desktop), Expo RN (mobile), Effect schemas in `packages/contracts`. **No plugin system**; it already renders MCP Apps and "visual replies" (sandboxed HTML) inline. Integration = small core PR or ride MCP Apps. |
| Factory feasible? | Yes, as: shared core (catalog + Express/macro prompt + web_core state bridge) + thin per-platform adapter (renderer map onto native primitives + host hookup). Detailed in `docs/design/factory.md`. |

## Constraints (from Alan)
- Minimal code footprint; aligned to each host's design spec + conventions.
- Demos plentiful; few core tests + e2e.
- A2UI `main` (v1.0), Express DSL + macros.
- Native feel per platform; factory for repeatability.

## Open decisions
1. Paseo: ship as plugin (zero core diff, external repo) vs built-in plugin PR in `plugins/` (upstream review). Default: develop as plugin-example inside the fork, PR as `plugin-examples/a2ui` + optional built-in later.
2. Macros: **decided**. Don't port. TypeScript macros are coming to `@a2ui/agent` upstream (expected ~mid-Nov 2026). Until they ship, integrations use the basic catalog + Express only and keep a macro slot on the agent side. Macro demos land once upstream releases.
3. t3code: core PR (new timeline item kind) vs MCP-App bridge (zero t3code diff, iframe, not native). Default: research first.
