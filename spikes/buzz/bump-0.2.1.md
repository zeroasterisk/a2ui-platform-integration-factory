# Buzz bump trial: `@a2ui/agent` 0.2.1 + `@a2ui/react`/`web_core` 0.16.1

Date: 2026-11-24. Base: `zeroasterisk/buzz-app@a2ui` `bf2c07a` (pinned 0.1.0 / 0.15.0 / 0.15.0). Throwaway detached worktree. Nothing was committed or pushed to the fork.

## Change
- `package.json`: the 3 pins bumped. `pnpm install --no-frozen-lockfile`: the lockfile diff is +37/−57 across 3 files.
- pnpm 11 adds `minimumReleaseAgeExclude` for `@a2ui/{agent,react,web_core,markdown-it}`, because the releases are under a day old.
- The existing `@a2ui/react>zod: 3.25.76` override still applies; 0.16.1 still declares the `zod ^3.25.76` peer. Resolved zod 3.25.76 + 4.6.5, the same as before.

## Results (identical to the 0.1.0/0.15.0 baseline)
| Gate | Bump |
|---|---|
| a2ui vitest (`src/bundled/a2ui`) | 57/57 |
| `tsc --noEmit` (whole app) | 0 errors |
| `conformance/wire` (`run.mjs` on `a2uiMessage.ts`) | 23/23 |
| `conformance/thread` (real `A2uiThreadStore`, ownership) | 13/13 |
| `conformance/prompt` (real `addA2uiTools`, ownership + authorKind) | 26/26 |
| `conformance/trust` (jsdom, real `createA2uiMessage` + `isA2uiMessage`) | 13/13 |

Mutant check on the bump: removing the blocked-note source `<pre>` makes trust fail 3, the same as at baseline, so the harness still discriminates.

## Bundle (`vite build`, `spikes/buzz/chunk-weight.mjs`, same worktree)
| Chunk | Baseline gz KB | Bump gz KB |
|---|---|---|
| main | 1370.3 | 1370.3 |
| `a2uiThread` (antlr4ng, ExpressFormat, zod) | 189.6 | 188.6 |
| `A2uiBlock` (catalog, lit) | 18.6 | 22.7 |
| A2UI lazy total | 214.6 | 217.7 (+3.1) |

The Vite `fs`/`path` externalization warnings are unchanged (3 in both builds).

## Reading
- The spike-2b "0.2.0 is breaking for v1.0" risk (`@`-prefixed envelope keys, prompt layout, `callRendererFunction` checks, required `TextField.value`) doesn't reach Buzz. Buzz only goes through `ExpressFormat` → `MessageProcessor` → `@a2ui/react` plus `ExpressPromptGenerator`, and every host-facing behaviour is unchanged.
- `update=true` is still absent from upstream rules. Buzz passes `prompt/` only because its own pointer teaches it (NEEDS_ALAN #2, ask 3).
- The zod 4 break (spike 2b) is still masked here by the zod-3 override, so it remains a Paseo blocker, not a Buzz one.
- Bump verdict: safe to land on the fork as a deps-only commit. Gates: the 4 groups + vitest + tsc + the browser spec (the browser spec was not run in this trial).
