---
type: Component
title: CopilotKit surfaces (chat vs page targets) and the standard component set
description: Chat-inline vs named GenerativeUISurface targets, the ~80-component standardUI catalog incl. Chart/Map/Form, React Native status, and demo inventory.
resource: https://github.com/CopilotKit/CopilotKit/blob/3a956add4/packages/react-core/src/v2/generative-ui/standard/index.ts
tags: [copilotkit, a2ui, surfaces, canvas, components, react-native, demos]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:45:00Z
sources:
- id: copilotkit-3a956add4
  resource: https://github.com/CopilotKit/CopilotKit/tree/3a956add4
---

# Chat vs "canvas" placement

- **Chat**: default target `"chat"` (`packages/shared/src/generative-ui/types.ts:11`).
  Each surface sits in a replaceable chat-card slot
  (`GenerativeUIChatSurfaceProps { surfaceId, isStreaming, error, rejected }`,
  `packages/react-core/src/v2/generative-ui/chat.tsx:20-35`; default
  `DefaultGenerativeUIChatCard`).
- **Named page targets**: `<GenerativeUISurface id description fallback components autoScroll>`
  mounts an area the agent can fill/replace/delete; `description` is sent to the
  model, `components` whitelists what may render there (unknown names ignored),
  `fallback` shows until/after the agent uses it
  (`packages/react-core/src/v2/generative-ui/GenerativeUISurface.tsx:1-60,107`).
  Real use: shop home page "featured" slot
  (`examples/v2/generative-ui-shop/app/routes/_landing/+/index/featured-products.section.tsx:29-40`).
- Markdown transport routes via ```` ```a2ui target=<id> ```` (see
  [agent-emission.md](agent-emission.md)).
- Stack A renders only in chat, via the `a2ui-surface` activity.
- The older `examples/canvas/*` apps are shared-state demos, not A2UI.

# Standard catalog (`standardUI`, id `copilotkit/standard@1`)

Declared with `createGenerativeUI` in
`packages/react-core/src/v2/generative-ui/standard/index.ts:15-75`
(`STANDARD_CATALOG_ID` at `standard/tokens.ts:9`). ~9.2k LOC of React:

| Group | Components | File |
|---|---|---|
| layout | Box Column Row Grid GridItem Card Flow FlowItem Carousel CarouselItem CarouselMediaItem Spacer Divider Tabs | `standard/layout.tsx:1172` |
| text | Title Text Caption Label Bold Italic Underline Strikethrough Badge Blockquote Code Markdown Math ShimmerText Link Tooltip | `standard/text.tsx:662` |
| inputs | Button Pressable Form TextField TextArea Select CheckBox Radio RadioGroup Slider SegmentedControl ChoicePicker DateTimeInput | `standard/inputs.tsx:1915-2018` |
| feedback | PulseIndicator FlashcardFlip Popover(+Trigger/Content) Modal | `standard/feedback.tsx:702` |
| data | Table(+Section/Row/Cell) List ListItem **Chart** **Map** | `standard/data.tsx:749-814` |
| media | Image Icon Favicon Svg Video AudioPlayer HtmlView | `standard/media.tsx:1096` |
| composites | LinkCard Citation FollowUp EntityCard ImageGrid | `standard/composites.tsx:841-890` |

"Fancy" components are ordinary catalog entries with heavier impls:
- **Chart** lazy-loads `recharts` (`standard/Chart.tsx:3,542`; dep `packages/react-core/package.json:107`).
- **Map** uses optional peer `maplibre-gl`, inlines the few CSS rules it needs, and
  takes its style URL from theme `mapStyle` (`standard/Map.tsx:114-130`; `theme.ts:52-56`).
- **Form/inputs** use `writable` + data-model binding; `calc` expressions compute
  derived values (`generative-ui/calc.ts`; prompt `packages/shared/src/generative-ui/prompt-spec.ts:87`).

Stack A's basic catalog is the A2UI v0.9 basic set (19 files under
`packages/a2ui-renderer/src/react-renderer/a2ui-react/catalog/basic/components`).
Showcase demos add Stack A custom components (Card, Metric, PieChart/BarChart via
recharts) in `.../demos/declarative-gen-ui/a2ui/renderers.tsx`.

# React Native

**Not supported.** `@copilotkit/react-native` deliberately leaves out the renderers that
"link `@copilotkit/a2ui-renderer`" (`packages/react-native/src/index.ts:51-66`);
its `src` has no `generativeUI`/A2UI symbols. All renderers are DOM (`<div>`, CSS vars,
`injectStyles`). The only pieces reusable on RN: the `@copilotkit/core` fence/ops parsers
(pure TS) and the `@copilotkit/shared` validator/prompt builders.

# Demo inventory worth emulating

| Demo | Shows | Path |
|---|---|---|
| a2ui-markdown | `standardUI` + markdown/tool toggle, one-prop setup | `examples/v2/a2ui-markdown/app/providers.tsx:27-32` |
| generative-ui-shop | custom catalog `extends: [standardUI]`, page targets, state binding | `examples/v2/generative-ui-shop/app/generative-ui/catalog.tsx:200-240` |
| declarative-gen-ui | Stack A dynamic schema, custom renderers, shadcn tokens | `showcase/integrations/langgraph-python/src/app/demos/declarative-gen-ui/` |
| a2ui-fixed-schema | pre-authored JSON tree; agent streams only data | `showcase/integrations/langgraph-python/src/agents/a2ui_fixed.py`, `a2ui_schemas/flight_schema.json` |
| a2ui-recovery | building → retrying → failed lifecycle UX | `showcase/integrations/langgraph-python/src/app/demos/a2ui-recovery` |
| standard catalog gallery | every standard component rendered | `showcase/shell-docs/src/components/standard-catalog/catalog-runtime.tsx` |

The same demos are repeated across ~22 framework integrations under `showcase/integrations/*`.
