---
type: Guide
title: Recommended A2UI packages and integration footprint
description: Which @a2ui packages/versions to depend on per surface (agent server, t3code web, RN mobile/Paseo) and what to write ourselves.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/typescript
tags: [a2ui, dependencies, integration, paseo, t3code, react-native]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:10:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# Recommended packages

Checked against the npm registry on 2026-11-03, with package.json from the tarballs.
- `@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0` and `@a2ui/react@0.15.0` are the latest versions. Repo `main` shows `@a2ui/react` at 0.15.0 (`typescript/renderers/react/package.json:3`) and `@a2ui/agent` at 0.1.0 (`typescript/agents/a2ui_agent/package.json:3`).
- All are pre-1.0. Pin exact versions.

| Layer | Package | Use | Notes |
|---|---|---|---|
| Agent / orchestrator (Node) | `@a2ui/agent@0.1.0` | Express prompt (`promptSnippet`), `parseResponse`, `openStream`, `RendererState` | Brings in `web_core ^0.15.0` and `antlr4ng 3.0.16`. Node only: it imports `/v1_0`, which pulls in lit, and fails under the `browser` condition. See [express](express-and-agent-sdk.md). |
| Renderer model (web and RN) | `@a2ui/web_core@0.15.0`, **root/state/processing/resolution subpaths only** | `MessageProcessor`, `NodeResolver`, signals, validation | Deps: `@preact/signals-core`, `zod@3`, `zod-to-json-schema`, `redos-detector`. lit and `@lit/context` are still installed as dependencies but never loaded if you avoid `/v1_0`, `/catalogs/basic/v1` and `/universal`. See [web-core-rn-safety](web-core-rn-safety.md). |
| t3code web (optional) | `@a2ui/react@0.15.0` | `A2uiSurface`, `createComponentImplementation` | Hosts each component in a custom element (`ReactWcHost extends HTMLElement`). Works on web only. A shared custom renderer core avoids this dependency. |
| Catalog | `catalogs/basic/v1/catalog.json` (vendored JSON) | `Catalog.fromJson`, `supportedCatalogIds` | The id is `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json` |

## What we write ourselves (minimal footprint)
1. **Shared renderer core**, about 150 LOC: surface hook plus node view over web_core root ([design](react-renderer-and-rn-design.md)).
2. **Component registries:** Paseo uses unistyles/RN, t3code web uses BaseUI and Tailwind, t3code mobile uses RN. Each is 18 basic components, with fallbacks for heavy ones.
3. **Basic functions:** vendor `web_core/src/catalogs/basic/v1/functions/basic_functions.ts` (lit-free), or ask upstream for a lit-free subpath export. Replace `openUrl` with platform linking.
4. **Macros in TS**, about 250-300 LOC, if we want domain components without client widgets ([macros](macros.md)). Upstream has Python only.
5. **Transport glue:**
   - Send `a2uiRendererCapabilities` with key `"1.0"`.
   - Forward `action` and `error` messages back to the agent.
   - Attach `a2uiRendererDataModel` when a surface has `sendDataModel: true` ([protocol](protocol-v1.md)).

## Risks and unknowns
- Metro and package `exports`: whether the deep imports and the `with {type:'json'}` import in `/v1_0` work in RN is **untested**. Avoiding `/v1_0` avoids the second problem.
- Hermes support for `\p{XID_Start}` regexes in web_core's identifier and expression parsers is **untested**.
- How fully `Catalog.fromJson` builds zod schemas for `GenericBinder` (types such as `checks`) is not verified for every component.
- Conformance's README still says Express can't stream, but streaming works in 0.1.0.
- The README's capability key (`v1_0`) is wrong at runtime.

Related: [index](index-fragment.md)
