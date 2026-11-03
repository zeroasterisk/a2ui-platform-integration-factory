---
type: Component
title: "@a2ui/web_core 0.15: framework-agnostic use from React Native"
description: Which web_core subpaths are DOM/lit-free (safe for RN/Hermes) and which pull lit/HTMLElement; verified by import-closure scan and runtime test.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/typescript/core/web_core/src
tags: [a2ui, web_core, react-native, signals, state, renderer]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:00:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# web_core in React Native

**Verdict:** the state, processing and resolution layer is DOM-free and works with no DOM. The v1.0 basic catalog **implementation** subpaths and `/v1_0` itself pull in lit, which extends `HTMLElement`, and they crash on load outside Node or a browser.

## How this was checked
1. **Static check.** I computed the transitive import closure (value imports only) of each export entry in `typescript/core/web_core/src` and scanned it for `document.`, `window.`, `customElements`, `HTMLElement`, `ShadowRoot` and `CSSStyleSheet`.
2. **Runtime check.** I ran npm `@a2ui/web_core@0.15.0` under Node 22 with `--conditions=browser`, which skips lit's Node SSR shim (lit's `@lit/reactive-element` exports a `node` condition that imports `@lit-labs/ssr-dom-shim`). Metro/RN resolves `react-native`/`browser`/`default` and never `node`, so this mimics RN.

## Subpath table (package.json `exports`, v0.15.0)
| Subpath | Third-party deps in closure | DOM / lit | RN |
|---|---|---|---|
| `.` (root) | `@preact/signals-core`, `zod`, `zod-to-json-schema`, `redos-detector` | none | **safe** (loads under the browser condition) |
| `./state`, `./processing`, `./resolution`, `./catalog`, `./rpc` | signals, zod, zod-to-json-schema | none | **safe** |
| `./reactivity` | signals | none | safe |
| `./expressions` | zod | none | safe |
| `./validation` | n/a | none | safe (runtime OK) |
| `./v1_0` | **lit, @lit/context**, validate-color, … | `universal/a2ui-lit-element.ts:119`, `register_universal_element.ts:34`, `render-a2ui-node.ts:39` | **unsafe**: `HTMLElement is not defined` |
| `./catalogs/basic/v1` | **lit** (via `universal/basic_catalog/components`) | same files | **unsafe**: same error |
| `./universal`, `./v0_9`, `./v0_9/universal`, `./v0_9/basic_catalog` | lit | lit elements | unsafe |

`v1_0/index.ts` re-exports `../catalogs/basic/v1/index.js` and `../universal/index.js` (`v1_0/index.ts:39-40`). It also imports JSON with `with {type:'json'}` (`:45`), and Metro/Babel may need a plugin for that (**unknown**, untested).

## Lit-free modules reachable by deep path only (no `exports` entry)
| Module | Closure | Use |
|---|---|---|
| `catalogs/basic/v1/components/basic_components.ts` | zod, `catalog/spec_annotations`, `v1_0/schema/common-types` | `TextApi` … `DateTimeInputApi`, `BASIC_COMPONENTS` (`:44-600`), as zod `ComponentApi`s |
| `catalogs/basic/v1/functions/basic_functions.ts` | signals, zod, redos-detector (no lit) | `BASIC_FUNCTIONS` implementations. **Verified:** `formatString` resolves to "Hi Ada" under the browser condition |
| `v1_0/schema/index.ts` | zod | v1.0 message zod schemas |

Because `exports` is strict, deep imports such as `@a2ui/web_core/src/...` are blocked unless Metro has `unstable_enablePackageExports: false`. They also aren't a stable API. Options are to vendor these files, contribute a `./catalogs/basic/v1/api` export upstream, or build the catalog from JSON (below).

## Known DOM-ish code in the safe closure
`common/basic_functions.ts:590-600` (`openUrl`) is guarded by `typeof window === 'undefined'` and becomes a no-op on RN. Replace it with a `Linking.openURL` implementation. The regex code uses `\p{XID_Start}` Unicode property escapes (`common/uax31.ts:30`, `expressions/expression_parser.ts:359`). Hermes supports the `u` flag, but property-escape support in your Hermes version is **unknown** and needs testing.

## Core API usable headless (verified in Node, no DOM)
```ts
import {Catalog, MessageProcessor, NodeResolver, isComponentNode} from '@a2ui/web_core';
const api = Catalog.fromJson(catalogJson);                 // schema-only CatalogApi (types.ts:864)
const cat = new Catalog(api.id, api.protocolVersion, [...api.components.values()], BASIC_FUNCTIONS /* or [] */);
const mp  = new MessageProcessor([cat], action => send(action), {/* outboundListener, errorHandler */});
mp.processMessagesWithErrors(envelopes);                   // returns RendererErrorMessage[] (message-processor.ts:609)
const surface = mp.getSurface('s1');                       // SurfaceModel: dataModel, componentsModel, onAction…
const r = new NodeResolver(surface);                       // resolution/node-resolver.ts:77
r.rootNode.value.props.value; // resolved props; child nodes inline; bindings {value,set,path}; action → fn()
mp.getClientCapabilities({version: '1.0'}); // {"1.0":{supportedCatalogIds:[…]}}
```
What the runtime test confirmed:
- Changing data with `surface.dataModel.set('/user/name','Bob')` updates the props signal.
- Calling a resolved `action()` emits `{name, surfaceId, sourceComponentId, timestamp, context}` with the bindings resolved.
- The `processMessagesWithErrors` error list was empty for valid input.

Key classes:
- `MessageProcessor` (`processing/message-processor.ts:197`): `processMessages`, `getSurface`, `onSurfaceCreated/Deleted`, `getClientCapabilities`, `getClientDataModel`, and `rpc`.
- `SurfaceModel` (`state/surface-model.ts:161`).
- `DataModel.set/subscribe` (`state/data-model.ts:59,112,364`).
- `GenericBinder` (`resolution/generic-binder.ts:484`) has `subscribe` and `snapshot`, the per-component binding that React uses.
- Signals are `@preact/signals-core`, and `setSignalImplementation` is exported for swapping them.

Related: [react renderer](react-renderer-and-rn-design.md) · [protocol](protocol-v1.md) · [catalogs](catalogs.md)
