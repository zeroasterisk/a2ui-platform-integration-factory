---
type: Guide
title: Buzz coding, testing and PR standards (for an A2UI PR)
description: The quality gates, file-size gate, review-proven rules, test conventions and PR etiquette a Buzz A2UI contribution must satisfy.
resource: https://github.com/block/buzz/blob/ff6ab96/CONTRIBUTING.md
tags: [buzz, contributing, testing, pr, standards, ci]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# Before writing code

- **Open an issue first.** This applies to "anything beyond a small fix" (`CONTRIBUTING.md:44`). "Entirely new features with no prior discussion" and "dependency swaps" without an agreed issue are named as PRs that are unlikely to be merged (`CONTRIBUTING.md:435-449`).
- **Implication for A2UI.** Adding `@a2ui/*` and `genui`/`a2ui_core` dependencies plus a new message capability needs an issue that a maintainer acknowledges before any code is opened. Ship the feature off by default behind `preview-features.json` (see [extension points](extension-points.md)).
- **Target `mobile/` and keep desktop scope small.** `desktop/` is legacy and is being replaced by block/buzz-app (`AGENTS.md:622-624`).

# PR shape (`CONTRIBUTING.md:408-433`)

1. **Focused.** One logical change per PR. Split the work into separate PRs:
   - desktop renderer
   - mobile renderer
   - the optional CLI helper
2. **Tested.** New behavior needs tests. A bug fix needs a regression test.
3. **Documented.** New event kinds, tools, and config must be documented. If the A2UI fence convention is user-facing, document it in `README.md` or `AGENTS.md`.
4. **`just ci` passes** locally.
5. **Description** covers four things: the problem, how it is implemented, how to test manually, and any deferred follow-ups.
6. **Shows the UI.** Include before/after screenshots or a recording for desktop and mobile changes.
   - Upload them only with `scripts/post-screenshots.sh`. Never use relay media URLs or third-party hosts (`AGENTS.md:405-416`).
   - Check PR markdown with `scripts/check-pr-image-urls.sh`.

# Commits

- **Conventional Commits.** The squash-merge title becomes the commit subject, e.g. `feat(desktop): render a2ui fenced blocks` (`CONTRIBUTING.md:48`, `:391-406`).
- **DCO sign-off.** Use `git commit -s` on every commit. The DCO Check blocks the PR otherwise. To repair, run `git rebase --signoff main` (`AGENTS.md:197`, `CONTRIBUTING.md:50-75`).

# Gates

- **Full gate.** `just ci` = `check test-unit desktop-test desktop-build desktop-tauri-check desktop-tauri-test web-build mobile-test` (`Justfile:387`).
- **Dart-only changes.** Run `just mobile-install mobile-check mobile-test` (`AGENTS.md:163-165`).
- **Relay/db/auth changes.** Also run `just test` (needs Docker) (`AGENTS.md:167-168`).
- **Pre-commit** auto-fixes formatting: rustfmt, biome (desktop/web), dart format.
- **Pre-push** runs:
  - the differential **file-size gate**
  - clippy
  - desktop `tsc --noEmit`
  - fast unit tests

  (`AGENTS.md:171-185`)

## File-size gate: a real constraint on the hook sites

| File | Lines @ff6ab96 | Cap |
|---|---|---|
| `desktop/src/shared/ui/markdown.tsx` | 1861 | 1200 (`desktop/scripts/file-size-policy.mjs:1`) |
| `desktop/src/features/messages/ui/MessageRow.tsx` | 1005 | 1200 |
| `mobile/lib/features/channels/message_content.dart` | 1120 | 1200 (`mobile/scripts/file-size-policy.mjs:5`) |
| `mobile/lib/features/channels/timeline_message.dart` | 818 | 1200 |

- "files already over it may not grow" (`scripts/check-file-sizes-core.mjs:31-37`, `:177`).
- So `markdown.tsx` must get a **net-zero or smaller** diff. Put every A2UI line in new files (`shared/lib/a2uiBlock.ts`, `shared/ui/a2ui/*`) and make only a one-line call-site change.
- `message_content.dart` has only about 80 lines of headroom.
- The rule is to split files, never to bump a limit (`AGENTS.md:745-753`).

# Code rules

**Rust** (only if a CLI helper or kind is added)
- `rustfmt`; `clippy -D warnings`; `#![deny(unsafe_code)]`.
- No `unwrap`/`expect` in production code; use `thiserror`/`anyhow` and `tracing` structured fields (`CONTRIBUTING.md:337-389`, `AGENTS.md:198-202`).

**Desktop TS**
- Biome.
- rem-only text tokens, enforced by `pnpm check:px-text` (`AGENTS.md:633-668`).
- `React.memo` stable-prop discipline (`AGENTS.md:616`).
- Any module-level cache, for example an A2UI surface registry keyed by event id, needs a reset in `resetCommunityState()` (`AGENTS.md:676-693`).

**Mobile Dart**
- One public widget per file; use `part` files for private sub-widgets.
- No cross-feature imports.
- Use `Grid` and `Radii` tokens, and `context.colors`/`context.textTheme`.
- No `print()` (`AGENTS.md:740-756`).

**Review-proven rules** (`AGENTS.md:206-290`) that apply directly to an A2UI renderer:
- **R3: falsifiable tests on the production seam.** Test the real `markdown` code path and the trust predicate, not a test-only helper (`TESTING.md:19-33`).
- **R4: bound every resource.** Cap the parsed JSON size and the component count/depth. The relay caps content at 256 KB (`ingest.rs:2648`).
- **R7: assistive semantics.** Each interactive A2UI component needs exactly one owner per actionable label and explicit semantics.
- **R8: every input modality.** Buttons and fields must work by keyboard as well as pointer.
- **R1: errors must propagate.** If parsing or validation fails, fall back to prose or a code block and show a visible error. Never fail silently.

# Testing conventions (`AGENTS.md:788-820`)

- **Journeys first.** Use one widget test per flow, for example: agent posts a card → user clicks → an outbound message carries the action.
- **Fake only boundaries.** Fake the relay, OS, and storage. Keep notifiers and coordinators real.
- **Use table tests for pure predicates.** For example, the trust gate across kind × signer × known-agent combinations.
- **"Prove it can fail".** Break the guarded code once and watch the test fail.
- **Desktop** uses Playwright `smoke` specs with `installMockBridge`, plus `node --test` `*.test.mjs` unit tests (`desktop/package.json:17`). Scope locators.

Related: [local dev & e2e](local-dev-and-e2e.md), [integration shape](a2ui-integration-shape.md), [index](index-fragment.md)
