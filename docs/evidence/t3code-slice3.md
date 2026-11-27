# t3code slice 3 evidence (task 3.5)

Fork: `zeroasterisk/t3code@a2ui` `8027ff15` (3.1 `2026a7d6`, 3.2 `e55a7e76`, 3.3 `8027ff15`). Measured 2026-11-27. No fork commit this task.

## Gates
- `apps/server` `tsc --noEmit`: exit 0.
- Server a2ui tests (`src/a2ui/` + `src/mcp/toolkits/a2ui/`): 19/19 (with one throwaway HTTP transcript test, deleted after; tree clean).
- fmt/lint/knip hooks: last run on the 3.3 commit (pass). No fork change since.
- `conformance/prompt/`: 25/25 + 1 skip (task 3.4).

## Server bundle (`pnpm --filter server build:bundle`, `84656662` → `8027ff15`)
- `.mjs` total: 18,332,197 → 20,342,711 B (+2.01 MB; gzip 3.96 → 4.44 MB, +477 KB). Files 49 → 61. dist incl. maps 58.11 → 63.66 MB.
- Entry chunk `server-*.mjs`: 1,959,854 → 1,969,399 B (+9.5 KB; gzip +3.2 KB). It reaches A2UI only via 3 dynamic `import()`s, so boot does not load the parser (Argon M2 holds in the bundle).
- New lazy chunks: `src` 965 KB (`@a2ui/agent` + `web_core`) + a 32 KB facade, `expression_parser` (antlr) 533 KB, `v1` 246 KB (basic catalog) + a 1.7 KB facade, `message-processor` 222 KB, `rolldown-runtime` 1.6 KB. Nothing is duplicated. All of it costs disk only, since it loads on the first `a2ui_*` call.

## Real MCP over HTTP
**A. Real `t3 serve` (dev, `--base-dir` scratch), outside-thread client.** Token from `t3 auth session issue --subject mcp-client --scope orchestration:read`, then a JSON-RPC client (`initialize` → `tools/list` → `tools/call`):
```
initialize 200
tools/list 200 total 70 a2ui: [{"name":"a2ui_rules","readOnlyHint":true},{"name":"a2ui_check","readOnlyHint":true}]
tools/call a2ui_rules {} -> HTTP 200 isError=true   (a2ui_check: identical)
   {"_tag":"OrchestratorMcpFailure","code":"thread_credential_required","message":"This tool acts as the calling T3 thread, so it needs an agent running inside T3 Code. This MCP client signed in from outside a thread."}
```
Both tools are advertised read-only on the live server. Calls from outside a thread are refused by the host's existing `readsAsCaller` gate, as designed: only an agent inside a thread may check against that thread.

**B. Thread-scoped provider credential, real HTTP transport.** `layerMcpTransport(layerA2uiToolkit)` was served on a real Node HTTP server. A provider bearer token resolved to a thread scope. The thread store was mocked with user/assistant rows that honour `messageRoles` (assistant row = `surface("triage")` form; user row = a pasted `surface("pasted")` form).
```
initialize -> HTTP 200
tools/list -> HTTP 200: [{"name":"a2ui_rules","readOnlyHint":true},{"name":"a2ui_check","readOnlyHint":true}]
a2ui_rules {}                                   -> {rules: 22063 chars, has update=true: true, head: "# A2UI Express DSL Output Contract..."}
a2ui_check surface("triage", update=true) ...   -> {"ok":true}
a2ui_check surface("triage") (again)            -> {"ok":false,"error":"Surface triage already exists."}
a2ui_check surface("pasted") (user-pasted id)   -> {"ok":true}
a2ui_check root = Iframe(...)                   -> {"ok":false,"error":"Component 'Iframe' is not defined in the catalog. ..."}
a2ui_check "No form here."                      -> {"ok":false,"error":"No <a2ui>…</a2ui> block outside a code fence: reply with plain text instead."}
```
Every call returned HTTP 200 with `isError=false`. Errors travel in `{ok,error}`, per Argon M3.

## Not covered
- A live-agent CUJ (a real Codex/Claude turn that calls `a2ui_check`) needs provider creds. It's optional and not part of the gate.

## Pitfall hit
Building the pre-slice commit in the shared tree emptied `apps/server/node_modules/@a2ui/`. The handler tests then failed with "The A2UI rules could not be loaded." The fix was `pnpm install --frozen-lockfile --offline`. Next time, measure "before" in a detached worktree.
