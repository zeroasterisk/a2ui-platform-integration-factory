# Spike 2b: zod 4 + RN-shaped bundle (2026-11-08)

Question (factory.md §29, Argon Phase 2): can a host that resolves `zod` to v4 (Paseo: `^4.4.3`) run `@a2ui/agent@0.1.0` + `@a2ui/web_core@0.15.0` Express parse → `MessageProcessor`, and does an RN-shaped bundle stay free of lit/DOM?

## Results (measured, `bash run.sh && bash variants.sh`)

Conformance: upstream `conformance/agent/express/compiler.yaml` (121 compile cases, A2UI `main` @ 078b3d5), each successful `createSurface` fed into a fresh `MessageProcessor`.

| zod resolved as | compile pass | MessageProcessor (64 cases) | `parseResponse` (72 non-error cases) | RN entry (basic catalog) |
|---|---|---|---|---|
| zod 3.25.76 (declared) | 115/121 | 0 errors, 0 throws | 68/72 | ✅ 1 surface |
| **zod 4.6.7 aliased** (Paseo) | 115/121 (same 6) | 0 errors, 0 throws | **46/72** (22 new "Component X is not reachable from 'root'") | ❌ `A2uiIntegrityError` orphaned `root_children_0` |
| zod 4.6.7 via `zod/v3` compat | 115/121 (same 6) | 0 errors, 0 throws | 68/72 | ✅ 1 surface |

The 4 `parseResponse` failures on zod 3 are data-model-only blocks with no surface (expected without a session).

- **zod 4 breaks the renderer-state topology check**, not compile or processing. `web_core/src/catalog/reference-map.ts` (9 sites) and `resolution/ref-fields.ts` (6 sites) walk `schema._def.typeName` (`'ZodArray'`, `'ZodObject'`, …). zod 4 has no `_def.typeName`, so child-ref discovery finds no children, and every nested component looks orphaned. Any real surface with children fails in `parseResponse`. zod 4 also adds catalog defaults on parse (`Column` → `justify:"start", align:"stretch"`).
- **Upstream fix (principle 2):** make `web_core` import `zod/v3`. Both `zod@3.25.x` and `zod@4.x` export `./v3`, so one change works on either host zod. Variant 3 proves it, with no other change. Related upstream threads (all open): issue #3812 (`error.errors` under zod 4), PR #3825 (`.issues` fix), PR #2753 (zod-agnostic GenericBinder), #2002 (zod as peer dep), #2160 (abstract zod). None of them covers `reference-map`/`ref-fields`.
- **The 6 failing compile cases are harness limits, the same on every zod:** per-case surface catalog targeting (2), check-message presence (1), renderer-only/user-activation function rules (2), and a map-binding rejection (1). They are not zod-related.

RN-shaped bundle (`--platform=neutral`, `react-native,browser` conditions, minified, `fs`/`path` external; `rn-entry.mjs` = parse + process):

| variant | raw | gzip | lit bytes in output | `customElements` / `document.` |
|---|---|---|---|---|
| zod 3 | 636 KB | 172 KB | 0 (57 KB in graph, tree-shaken) | 0 / 0 |
| zod 4 aliased | 1.09 MB | 263 KB | 0 | 0 / 0 |
| zod 4 `/v3` compat | 636 KB | 172 KB | 0 | 0 / 0 |

- Lit is *imported* by `web_core/src/universal/*` (root and `/processing` entries both reach it) but esbuild drops all of it. Metro has weaker tree-shaking, so treat it as a risk: a `sideEffects:false`/RN-safe entry upstream would make this explicit. The only `window` hit is the antlr string "token buffer window".
- Earlier browser spike: 305 KB gzip, unminified. Minified neutral is 172 KB.
- **Not measured: Hermes.** There's no Hermes engine in this sandbox. The 50 ms parse budget (Argon) is still open for Paseo mobile.

## Verdict
Gate met, with a blocking finding. Paseo (zod 4 external) **cannot** use `parseResponse` until upstream `web_core` moves to `zod/v3` (or zod-agnostic introspection). Don't bundle a second zod and don't vendor (recipe §2). t3code: only `apps/server` declares zod (`^4.6.5`). The web app has none, so `@a2ui/*` brings its own zod 3 there and nothing conflicts. Server-side compile in t3code would hit the same zod 4 bug. t3code-first (factory.md §6) is unblocked.

## Argon review (folded)
`docs/reviews/argon-phase2b.md`. Conclusions hold; t3code slice 1 is OK to start. Gaps before Paseo:
1. **esbuild tree-shaking ≠ Metro.** Lit-free output is unproven for RN. Needs a Metro (`expo export`) and Hermes run, plus an upstream lit-free subpath / `sideEffects:false` in `web_core`.
2. `fs`/`path` were externalised. Metro has no Node built-ins, so `@a2ui/agent` `skill.js` and `catalog-providers.js` must not be reachable from the browser entry (upstream).
3. `zod/v3` is the tactical fix. `zod` as a peer dependency (#2002) plus zod-agnostic introspection (#2753/#2160) is the durable one.
4. Fixed in this run: the harness now runs `parseResponse` on every case (row above).

## Files
`harness.mjs` (conformance runner), `rn-entry.mjs` (RN-shaped entry), `run.sh` (zod3/zod4 runs + bundles), `variants.sh` (`zod/v3` compat + `/processing` subpath), `litcheck.mjs` (lit bytes in the output, from the esbuild metafile). `out/` and `shims/` are generated.
