### 1. Verdict
**Close after must-fixes** (one remaining Slice 2 must-fix in `a2uiThread.ts` where cross-agent `createSurface` hijacks an existing surface; everything else is ready to close Phase 5b).

### 2. Findings by Severity

#### Major
* **`src/bundled/a2ui/a2uiThread.ts:111-120` — Cross-agent `createSurface` (`update=false`) bypasses ownership check and hijacks existing surface (Unresolved Slice 2 Must-Fix #1).**
  While Slice 2 Must-Fix #2 (`send_a2ui` trust parity) and the `ThreadView` ref-counting were landed cleanly, Must-Fix #1 was missed. In `apply()`, when `kind === "createSurface"` (i.e., `surface("triage")` without `update=true`), `if (kind === "createSurface") created.add(id)` executes without checking `this.ownerBySurfaceId`, and line 120 overwrites `this.ownerBySurfaceId.set(id, block.authorId)`. If Agent B posts `surface("triage")` in a thread where Agent A already created `"triage"`, Agent B supersedes Agent A's surface (collapsing Agent A's block to "Updated below") and steals ownership so subsequent user actions mention Agent B.
  *Fix:* In `apply()` (`a2uiThread.ts:111`), check ownership before `created.add(id)`:
  ```ts
  if (kind === "createSurface") {
    const owner = this.ownerBySurfaceId.get(id);
    if (owner !== undefined && owner !== block.authorId)
      throw new Error(`Surface ${id} belongs to another agent`);
    created.add(id);
  }
  ```

#### Minor
* **`src/bundled/a2ui/a2uiThread.ts:200-202` — Dead method `canSend()`.**
  `canSend(): boolean { return this.sendMessage !== undefined; }` is never called in production or test code across the entire diff.
  *Fix:* Delete `canSend()`.

* **`src/bundled/a2ui/agentTools.ts:19-25` & `src/bundled/a2ui/a2uiThread.test.ts:12-18` — Duplicated schema-only `Catalog` instantiation.**
  The exact 7-line `new Catalog<ComponentApi>("https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json", "1.0", BASIC_COMPONENTS, BASIC_FUNCTIONS, BasicCatalogThemeSchema)` is duplicated across `agentTools.ts`, `a2uiThread.test.ts`, and `catalog.tsx:366`.
  *Fix:* Export `buzzBasicSchemaCatalog` (or `BASIC_CATALOG_ID`) from `a2uiThread.ts` or `agentTools.ts` and reuse in `a2uiThread.test.ts`.

* **`src/bundled/a2ui/catalog.tsx:174-185` — Heading variants in `Text` still render as `text-body-sm`.**
  `Text` only checks `props.variant === "caption"`; `h1`–`h5` variants fall through to `text-body-sm` (noted in CUJ Vision Finding C).
  *Fix:* Optional polish: map `h1`–`h5` to host heading classes if present in Buzz's design system.

### 3. Must-Fix Before Close
1. **`src/bundled/a2ui/a2uiThread.ts:111`**: Throw `Surface ${id} belongs to another agent` when `kind === "createSurface"` and `this.ownerBySurfaceId.get(id)` is already set to a different `authorId` (plus add a test case in `a2uiThread.test.ts`).

### 4. Upstream-Readiness (Buzz Maintainer Pushback & Trims)
* **Host footprint (+17/-0 across 4 host files):** Remarkably small (`package.json`, `pnpm-workspace.yaml`, `check-icons.mjs`, `src/bundled/index.ts`). A Buzz maintainer will appreciate that 0 core conversation/relay files were modified.
* **`pnpm-workspace.yaml` override (`"@a2ui/react>zod": 3.25.76`):** Biggest upstream merge friction. *Trim:* Once `@a2ui/react` drops or widens its unused `zod` peer dependency upstream, remove the override from `pnpm-workspace.yaml`.
* **207.6 KB gzip lazy chunk + Vite `fs`/`path` warnings:** Acceptable because `A2uiBlock` and `agentTools` are dynamically imported (`main` grows by only +2.0 KB gzip), but pulling transitive `lit` into a React repo and emitting Node builtin warnings during `pnpm build` will draw questions. *Trim:* Upstream subpath split in `@a2ui/web_core/catalogs/basic/v1` (schemas without Lit elements) and browser-only entry in `@a2ui/agent`.
* **Dead code trim:** Remove unused `canSend()` in `a2uiThread.ts:200`.

### 5. Phase 6 Inputs (Shared Conformance & Recipe Template)
* **Wire & Sentinel Lexer (`a2uiMessage.ts`):** `splitA2uiSegments` (CommonMark fence pairing, string/comment-aware `findCloseTag`, `A2UI_MAX_SOURCE_LENGTH`, `closed: false` streaming state) and `a2uiActionMessage` (`a2ui-action` fence + human summary) are 100% identical between t3code and Buzz—prime candidates for upstreaming to `@a2ui/agent` (Principle 5 escalation) or the canonical recipe template.
* **Thread Surface State Machine (`a2uiThread.ts`):** Per-thread `MessageProcessor` + `RendererState.transaction()`, deterministic replay on edit/delete, per-surface author ownership (`createSurface` + `update=true` gating), superseding (`isSuperseded` -> "Updated below"), and single-flight action lock (`sending` -> `sent` / `failed`, unlocked on fresh agent update).
* **Two-Tier Agent Prompt & Pre-Send Validation (`index.tsx`, `agentTools.ts`):** Short always-on instruction pointer ($\le 1\text{ KB}$) paired with on-demand `a2ui_rules` tool (`ExpressPromptGenerator`) and `send_a2ui` pre-flight validation against hydrated thread state.
* **Trust & Security Conformance Matrix:** Shared test fixtures covering: (1) human spoofing -> plain text, (2) streaming unclosed `<a2ui>` -> pending skeleton (no raw DSL leak), (3) `<a2ui>` in code fences/inline prose -> ignored, (4) off-catalog `Iframe` -> blocked with source disclosure, (5) cross-agent surface hijack (`update=true` and `update=false`) -> rejected.
* **Visual & Accessibility Gates:** 360px/412px mobile viewport + 150% font zoom no-overflow checks, light/dark token contrast between card and input fields, and `inert` + dimmed opacity on locked surfaces.

### 6. Strengths
* **Exemplary host containment:** Only 17 lines touched across 4 host config/registry files; all feature logic, UI, and MCP tools live cleanly inside `src/bundled/a2ui/`.
* **Renderer-tool parity:** `send_a2ui` replays the exact same `isA2uiMessage`-filtered history through `A2uiThreadStore` that the UI renders, guaranteeing an agent cannot post a block that fails on the client.
* **Resource-conscious hydration & bundling:** Ref-counted `ThreadView` readers respect Buzz's 64-reader cap, and lazy imports keep the 207 KB parser/renderer out of `main` until an `<a2ui>` block or tool is actually used.

---
## Orchestrator fold-in (2026-11-22)
- Major (cross-agent `createSurface` hijack): **refuted again**, same as slice-2 M1. `RendererState` rejects a duplicate `createSurface` inside the transaction, so the throw aborts before `ownerBySurfaceId.set`. Now pinned by a committed test (agent-b re-creates `triage` → not ok, owner's text kept, agent-b's later `update=true` still blocked, owner's update ok). Fork `bf2c07a`.
- Minor `canSend()` dead: confirmed, deleted (`bf2c07a`).
- Minor duplicated schema catalog: confirmed; `agentTools.ts` exports it, `a2uiThread.test.ts` reuses it (`bf2c07a`). `catalog.tsx` keeps its own React catalog (different component impls).
- Minor `Text` h1–h5: refuted. v1 basic `Text` `variant` allows only caption/body.
- Measured at `bf2c07a`: a2ui vitest 57/57, `pnpm typecheck` 0, biome clean.
- Verdict after fold-in: Phase 5b closed. §5 feeds Phase 6.
