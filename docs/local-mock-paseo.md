# Local Paseo mock (Phase 3)

Paseo's own Playwright harness is the local mock. Each test spawns an isolated daemon (temp `PASEO_HOME`), Metro web, and a mock agent (`ten-second-stream` provider streams fixture text verbatim). No API keys, no Docker.

## Bring-up (fork `a2ui` branch, Node 22)
0. Check `command -v ps`. You need procps, because the daemon shells out to `ps`.
1. `npm ci` (set `ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`). ~4 min, 2.9 GB `node_modules`.
2. `npm run build:server`. This builds client/highlight/plugin/relay, server, and `packages/cli/dist` (the e2e teardown calls `cli/dist/index.js daemon stop`).
3. `npx playwright install chromium-headless-shell` (Playwright 1.58.2 → revision 1208).
4. `cd packages/app && E2E_WORKERS=1 npx playwright test --project=browser <spec>`.

## Gotchas (measured 2026-11-08)
- **`ps` is required.** The daemon's terminal worker shells out to `ps` (`packages/server/src/terminal/terminal-worker-process.ts`). Minimal containers without procps fail with `spawn ps ENOENT` / "Isolated host daemon exited before listening".
- **First Metro bundle is slow.** The cold `metro-warmup` fetch can exceed its 120 s timeout. Rerun and the cache makes it pass.
- Docker image path (`docker/docker-compose.example.yml`) is not needed for e2e. It is the route for real providers (Claude Code, Codex, …), which need credentials.

## Result
- `plugin-timeline.spec.ts` "assistant plugin … width 1100": **1 passed (1.7 min)**.
- Gate screenshots: a mock session with the example timeline plugin card at 1100 px and 412 px, in `docs/evidence/paseo-mock-session-{1100,412}.png`.
- Observation for Phase 4: the stock example plugin row renders as plain stacked text. It has no card chrome, and markdown is not rendered. The A2UI renderer must map to Paseo `components/ui` primitives itself and not rely on any row styling from the host.
- Not done: a second real harness (needs provider credentials). Phase 4's e2e uses the mock provider per `recipes/paseo.md`, so this does not block.
