**(1) Conclusions vs. Measurements & Gaps**
* **Partially supported:** The `zod@4` breakage (`_def.typeName` missing in `reference-map.ts` / `ref-fields.ts`) and the `zod/v3` fix are solidly proven by the harness.
* **Gap 1 — Metro vs. esbuild (Decision-changing for Paseo):** Using `esbuild --minify` to prove 0 `lit` bytes in an RN bundle is a false positive. Metro does not tree-shake unused ESM exports like esbuild. Since `web_core` reaches `universal/*` (57 KB of `lit` in the graph), Metro will bundle `lit` and execute its top-level `window`/`customElements` references, crashing RN startup.
* **Gap 2 — `fs`/`path` externalized:** `run.sh` passes `--external:fs --external:path` for the RN bundle. Metro has no Node core modules and fails at build time if any reachable file imports `fs`/`path`.
* **Gap 3 — `harness.mjs` skips `parseResponse`:** The 121-case loop only calls `compile()` + `MessageProcessor`. The topology failure was only caught by the 1-case `rn-entry.mjs`. Additionally, `zod@4` silently injecting default props (`justify`, `align`) during parse could break host layout expectations.
* **Gap 4 — Hermes unmeasured:** The 50ms Argon parse budget on mobile remains completely unverified (ANTLR in `@a2ui/agent` is heavy on Hermes JIT-less execution).

**(2) Upstream Fix: `zod/v3` vs. Alternatives**
* **`zod/v3` is the right *immediate* tactical fix:** 1-line import swap, works across `zod@^3.25.0` and `zod@^4.0.0`, and stops the bleeding (including issue #3812 `.errors` vs `.issues`).
* **Not the right *sole* fix:** If host plugins pass user-defined schemas created with host `import { z } from 'zod'` (v4) into `web_core`, `_def.typeName` fails again. Furthermore, `zod` *must* be declared as a `peerDependency` (#2002) to prevent dual-zod instance hazard in monorepos. Long-term, `web_core` needs zod-agnostic introspection (#2753/#2160) instead of relying on private `_def` internals.

**(3) Gate to Start t3code Slice 1 Now?**
* **YES.** t3code's web client has no `zod` dependency (isolated from `apps/server`'s `zod@4`), uses Vite/Rollup (which properly tree-shakes `lit`), and runs in a browser (where DOM globals exist anyway). 

**(4) Top 3 Changes to the Plan**
1. **Upstream lit-free subpath:** Before touching Paseo, PR `@a2ui/web_core` to add `"sideEffects": false` and a pure subpath export (e.g., `@a2ui/web_core/core`) that never transits `universal/*` or `lit`, plus strip any browser-reachable `fs`/`path` imports in `@a2ui/agent`.
2. **Test with Metro + Hermes:** Replace the esbuild RN bundle check with `npx expo export --platform ios` + headless `hermes` CLI execution before committing to Paseo client-side compile (Option B).
3. **Run `parseResponse` across all conformance cases:** Update `harness.mjs` to wrap each case in `<a2ui>...</a2ui>` and run `parseResponse()` so topology and default-injection regressions are tested against all 121 cases, not 1.
