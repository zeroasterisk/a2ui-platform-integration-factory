---
type: Guide
title: "@a2ui/react architecture and a minimal React Native renderer design"
description: How @a2ui/react 0.15 maps catalog entries to React components (via custom-element hosts), why it cannot run on RN, and the smallest RN renderer on web_core.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/typescript/renderers/react/src
tags: [a2ui, react, react-native, renderer, catalog, design]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:03:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# @a2ui/react, and what RN needs

## @a2ui/react 0.15.0 (`typescript/renderers/react/src`, ~1.7k LOC)
- **Dependencies:** `@a2ui/web_core ^0.15.0`, `@a2ui/markdown-it`, `markdown-it`, `clsx` and `zod`. Peer dependencies are `react` and `react-dom` 18 or 19 (npm package.json). The source imports `@a2ui/web_core/v0_9`, whose `SurfaceModel` and `NodeResolver` are the same shared classes, and `v0_9/universal`.
- **Public API** (`index.ts`): `A2uiSurface`, `useA2uiSurface`, `createComponentImplementation`, `createBinderlessComponentImplementation`, `useNodeView`, `useSignalValue`, markdown contexts, and the types `ReactComponentImplementation` and `ReactCatalogComponent`.

### Data flow
1. The host creates a `MessageProcessor` (web_core) with a catalog whose entries are React implementations, then feeds it messages.
2. `<A2uiSurface surface={…}/>` (`A2uiSurface.tsx:55`) calls `prepareCatalogs(surface)` (`:91`), creates `new NodeResolver(surface, surface.defaultCatalog)` (`:95`), and subscribes to `resolver.rootNode` through `effect()` and `useSyncExternalStore` (`:116`). It then renders `ChildElement` for the root.
3. **Catalog mapping:**
   - `ReactComponentImplementation = ComponentApi & {render: React.FC<{context, buildChild, metadata}>, view?}` (`react_component_implementation.ts:56`).
   - `ReactCatalogComponent` is that type or a web_core `WebComponentImplementation` (`:71`).
   - `createComponentImplementation(api, Render)` (`adapter.tsx:63`) wraps a presentational component that receives `{props, buildChild, context, metadata}`, where `props` is typed from the zod schema by `ResolveA2uiProps`. It binds through `GenericBinder(context, api.schema)` and `useSyncExternalStore`, and memoises on props identity.
   - `createBinderlessComponentImplementation` (`adapter.tsx:188`) skips the binder and works directly from the resolved `ComponentNode` (`useNodeView`, `node-view.tsx:205`).
4. **DOM coupling.** `prepareCatalogs` turns each React implementation into a web component with `toWebComponent()` (`catalog/to_web_component.tsx:46-62`). That assigns a tag `a2ui-react-<name>` and `element: class extends ReactWcHost`, where `ReactWcHost extends HTMLElement` (`catalog/react_host_element.ts:35`).
   - `ChildElement` (`node-view.tsx:363`) renders a `WebComponentNode`, which is a custom element, and portals the React content into it. `host_registry.ts` keeps track of which element owns which React host (`HostOwner`, `markReactRendered(element: Element)`, `:32-57`).
   - The reason is that React and Lit components can then be mixed in one tree. The cost is that it **requires `customElements` and the DOM**.

**Conclusion:** `@a2ui/react` **cannot run on React Native**. It is fine for t3code web, where it is the native React path, but you should still style the catalog components with BaseUI and Tailwind yourself.

### Custom catalog in @a2ui/react (web)
```tsx
const MyCard = createComponentImplementation(MyCardApi /* {name, schema: zod} */, ({props, buildChild}) =>
  <Card title={props.title}>{props.child && buildChild(props.child)}</Card>);
const catalog = new Catalog('my:catalog', '1.0', [MyCard, ...], BASIC_FUNCTIONS);
const mp = new MessageProcessor([catalog], onAction);
<A2uiSurface surface={mp.getSurface(id)!}/>
```

## Smallest RN renderer (proposed design, not upstream)
I verified the pieces headless in Node: see [web-core-rn-safety](web-core-rn-safety.md).
1. **Model:** import `MessageProcessor`, `Catalog`, `NodeResolver`, `effect` and `isComponentNode` from `@a2ui/web_core` (root) only. Never import `/v1_0`, `/catalogs/basic/v1` or `/universal`.
2. **Catalog:** use `Catalog.fromJson(basicCatalogJson)` for the component APIs, then build `new Catalog(id, '1.0', [...components], fns)`. For `fns`, vendor `basic_functions.ts`, or start with `[]` and add `formatString` and the validators later. Replace `openUrl` with `Linking`.
3. **Surface hook** (~40 LOC): `useSyncExternalStore` over `effect(() => resolver.rootNode.value)`, one `NodeResolver` per surface, disposed on unmount. Mirror `A2uiSurface.tsx:85-116`.
4. **Node view** (~40 LOC): `useSignalValue(node.props)` (`node-view.tsx:108`). Look up `registry[node.type]` (a plain `Record<string, React.FC<{node, props}>>`) and render it. Child props come back as resolved `ComponentNode`s, or arrays of them, so render them recursively. In the verified output, `children` was an array of nodes and `child` was a node.
5. **Props shape:**
   - Dynamic values resolve to `{value, set?, path?}`. Inputs call `prop.set(v)` for two-way binding, which was verified.
   - `action` resolves to a function. Calling it emits the spec `action` through the `MessageProcessor` handler, which was verified.
   - Check results decide whether a component is disabled. How the resolved `checks` result is shaped needs reading in `generic-binder.ts` (**unknown**).
6. **Components:** 18 basic components ([catalogs](catalogs.md)) mapped to Paseo's unistyles primitives, at roughly 20-60 LOC each. `Modal`, `Tabs`, `DateTimeInput`, `Video` and `AudioPlayer` are the heavy ones and can ship as fallbacks first.
7. **Size:** the core is about 150 LOC, plus the component library. web_core supplies validation, binding, templates and actions.
8. **Sharing between web and RN:** write the surface/node-view core once on web_core's root and swap only the registry (RN primitives vs BaseUI/Tailwind). That gives one renderer for t3code web, t3code mobile and Paseo, instead of `@a2ui/react` on web plus a custom RN renderer.

Related: [web_core RN safety](web-core-rn-safety.md) · [conformance](conformance-fixtures.md)
