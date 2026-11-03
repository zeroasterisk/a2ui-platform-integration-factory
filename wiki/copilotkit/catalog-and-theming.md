---
type: Guide
title: Plugging a host design system into CopilotKit A2UI
description: Catalog creation, component overrides, and theming hooks in both CopilotKit stacks; the API shape a host uses.
resource: https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/a2ui-renderer/src/react-renderer/create-catalog.tsx
tags: [copilotkit, a2ui, catalog, theming, design-system]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:45:00Z
sources:
- id: copilotkit-3a956add4
  resource: https://github.com/CopilotKit/CopilotKit/tree/3a956add4
---

# Stack A: `createCatalog` (a2ui-renderer)

Split **definitions** (platform-agnostic Zod + description) from **renderers**
(React FCs); TS enforces 1:1 keys.

- `CatalogComponentDefinition { props: ZodObject; description? }` —
  `packages/a2ui-renderer/src/react-renderer/create-catalog.tsx:15-31`
- `RendererProps { props, children(id, basePath?), dispatch? }` — `create-catalog.tsx:45-65`.
  Bound values arrive resolved; Action props arrive as functions; each bindable
  prop gets a `set<Prop>` two-way setter (`:46-52`).
- `createCatalog(defs, renderers, { catalogId, includeBasicCatalog })` wraps each
  renderer via `createReactComponent` and builds a web_core `Catalog`
  (`create-catalog.tsx:110-161`). Default id `copilotkit://custom-catalog` (`:120`).
- **Overrides = same-name redefinition**: custom entries are appended after basic
  ones so a custom `Row`/`Text` replaces the basic one
  (`create-catalog.tsx:148-150`; demo overrides Row/Column/Text to honour `gap`:
  `showcase/integrations/langgraph-python/src/app/demos/declarative-gen-ui/a2ui/definitions.ts:18-55`).
- Bindable props must use `DynamicStringSchema` etc., re-exported because the binder
  classifies dynamic props by Zod type (`packages/a2ui-renderer/src/react-renderer/index.ts:90-109`).
- `filterCatalog(catalog, predicate)` narrows components, keeps functions/themeSchema
  (`filter-catalog.ts:16-33`).
- Renderer guard: per-component `RenderBoundary` + human-readable failure asking the
  user to have the assistant fix it (`packages/a2ui-renderer/src/react-renderer/a2ui-react/adapter.tsx:46-80`).

Minimal usage (demo, `.../declarative-gen-ui/a2ui/catalog.ts:15-23`):
```ts
export const myCatalog = createCatalog(myDefinitions, myRenderers,
  { catalogId: "declarative-gen-ui-catalog", includeBasicCatalog: true });
// <CopilotKit a2ui={{ catalog: myCatalog }}>
```

**Theming (A)** is weak: `ThemeProvider` is an untyped `Record<string, unknown>`
context (`react-renderer/theme/ThemeContext.tsx:3-33`); `defaultTheme`/`viewerTheme` are `{}`
(`react-renderer/index.ts:119-121`, `src/index.ts:142-143`). Real styling is CSS:
`injectStyles()` adds one `<style id="a2ui-structural-styles">` with a
`@layer a2ui-reset` revert to survive Tailwind preflight
(`react-renderer/styles/README.md:8-30`); hosts set shadcn-style vars
(`--primary`, `--card`, `--radius`…) per docs
(`docs/src/content/docs/integrations/langgraph/generative-ui/a2ui/styling.mdx:9-39`).

# Stack B: `createGenerativeUI` (recommended shape)

`packages/react-core/src/v2/generative-ui/catalog.ts:516-547,682`:
```ts
const ui = createGenerativeUI({
  id: "acme/app@1",                        // versioned catalog id
  extends: [standardUI.omit(["Map"])],     // bases merge in order
  state: { cart: cartSchema },             // app state; same-name props auto-bind
  functions: { addToCart: { parameters } },// event onX → function x
  overrides: { Card: { component: MyCard } }, // swap React impl, model sees same schema
  components: { ProductCard: { component, props, slots, writable, events } },
});
<CopilotKitProvider generativeUI={{ ui, transport: "markdown", theme }} />
```
Component definition fields (`catalog.ts:89-126`): `component`, `description`,
`props` (any Standard Schema with JSON Schema), `bind` selectors, `events`,
`slots: single|multiple`, `writable` (→ `setValue` prop writing the data model),
`accessibility: wrapper|self`, `parameterOrder`. Bound props and matched events are
**hidden from the model** (`catalog.ts:641-652`) — keeps prompts small.
`omit()` drops components to shrink the prompt (`catalog.ts:186-205`).
`overrides` typing reuses base props exactly (`catalog.ts:533-538,555-566`).

**Theming (B)** is a typed token set: `GenerativeUIThemeVariable` lists every
`--a2ui-*` CSS var (text/background/border colours, tints, radii, 6 chart series,
shadows, font) plus `mapStyle`; a `dark` sub-object applies under `.dark`
(`packages/react-core/src/v2/generative-ui/theme.ts:15-75`). Each surface root
injects a stylesheet via `themeStyleSheet` (`generative-ui/SurfaceView.tsx:85-99`, `theme.ts:190`).

# Takeaway

Host design-system plug-in = (schema, React component) pairs + named override of
base components + CSS custom-property tokens. For Paseo/t3code we want Stack B's
shape (overrides keyed by catalog name, token map with light/dark), with RN
style tokens / Tailwind vars instead of DOM-only CSS vars.
