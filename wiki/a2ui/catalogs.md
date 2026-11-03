---
type: Component
title: A2UI basic catalog v1 and custom catalog definitions
description: The 18 basic v1.0 components with props, 14 functions, and how custom catalogs are declared via catalog_definition.json.
resource: https://github.com/a2ui-project/a2ui/blob/80aaef0/catalogs/basic/v1/catalog.json
tags: [a2ui, catalog, basic-catalog, components, functions, custom-catalog]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:05:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# Catalogs

## Basic catalog v1 (`catalogs/basic/v1/catalog.json`)
- **id:** `catalogId` and `$id` are both `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`, with `protocolVersion: "1.0"` (catalog.json:1-7).
- Catalogs are identified by `$id` / `catalogId`, not by their path, and are versioned separately from the protocol (`catalogs/README.md`).
- The `instructions` field (catalog.json:8) is prompt text the agent SDK injects. It says to use `formatString` for string concatenation, to follow the requested hierarchy strictly, and to put validation messages in `checks`.

All components accept `weight` (`$defs/Weight`, flex-grow, only allowed inside a Row or Column) plus the common accessibility attributes. Components marked ✓ are `Checkable` and take `checks[]`.

| Component (line) | Props (required in **bold**) |
|---|---|
| Text (:10) | **text** DynamicString (simple Markdown), variant `caption`/`body` |
| Image (:32) | **url**, description, fit `contain`/`cover`/`fill`/`none`/`scaleDown`, variant `icon`/`avatar`/`smallFeature`/`mediumFeature`/`largeFeature`/`header` |
| Icon (:64) | **name**: an enum of Material-style names (`accountCircle`, `add`, `arrowBack`, …) or a binding |
| Video (:158) | **url**, posterUrl |
| AudioPlayer (:178) | **url**, description |
| Row (:198) | **children** ChildList, justify `start`/`center`/`end`/`spaceBetween`/`spaceAround`/`spaceEvenly`/`stretch`, align `start`/`center`/`end`/`stretch` |
| Column (:235) | **children**, justify, align (same values as Row) |
| List (:272) | **children**, direction `vertical`/`horizontal`, align |
| Card (:300) | **child** |
| Tabs (:316) | **tabs**: `[{title: DynamicString, child}]`, at least 1 |
| Modal (:348) | **trigger** Child, **content** Child |
| Divider (:368) | axis `horizontal`/`vertical` |
| Button ✓ (:386) | **child** (normally a Text), **action**, variant `default`/`primary`/`borderless` |
| TextField ✓ (:419) | **label**, **value** DynamicString, placeholder, variant `shortText`/`longText`/`number`/`obscured` |
| CheckBox ✓ (:457) | **label**, **value** DynamicBoolean |
| ChoicePicker ✓ (:485) | label, **options** `[{label, value}]`, **value** DynamicStringList, variant `multipleSelection`/`mutuallyExclusive`, displayStyle `checkbox`/`chips`, filterable |
| Slider ✓ (:550) | label, min, **max**, **value** DynamicNumber, steps |
| DateTimeInput ✓ (:592) | **value** (RFC 3339 string), enableDate, enableTime, min, max, label |

**Functions** (catalog.json:683-1092; protocol table at `a2ui_protocol.md:1255-1284`):
- Validators: `required`, `regex`, `length`, `numeric`, `email`.
- Formatters: `formatString`, `formatNumber`, `formatCurrency`, `formatDate`, `pluralize`.
- Logic: `and`, `or`, `not`.
- `openUrl` (`requiresUserActivation: true`).
- The system function `@index` is also available inside templates.

`formatString` uses `${/path}` and `${fn(...)}` interpolation (`a2ui_protocol.md:1285-1338`). `regex` uses an A2UI dialect with a ReDoS safety check (`:1339-1368`).

There is a renderer implementation guide at `catalogs/basic/v1/basic_catalog_implementation_guide.md`, which I didn't read in detail, and example messages under `catalogs/basic/v1/examples/`. Other catalogs: `catalogs/mcp/v1` (MCP apps) and `catalogs/vegachart/v1`.

## Defining a custom catalog (`specification/v1_0/json/catalog_definition.json`)
- **Top level:** the only required field is `catalogId`. Optional fields are `$schema`, `$id`, `protocolVersion`, `title`, `description`, `metadata`, `instructions`, `components`, `functions` and `$defs`.
- **`components`** maps a name to a `ComponentDefinition`, which is a JSON Schema plus optional `allowedParents` and `allowedChildren`. The name `Surface` is reserved.
- **`functions`** maps a name to a `FunctionDefinition`, which requires `returnType` and optionally has `allowedCallers` (`rendererOnly` / `agentOnly` / `rendererOrAgent`) and `requiresUserActivation`. A function with `requiresUserActivation: true` must be `rendererOnly`.
- **`$defs`** must contain the unions `anyComponent` and `anyFunction` (`oneOf` lists of `$ref`s). Only components that appear in those unions are loaded (`conformance/README.md:11`, from_json cases).

Spec rules (`a2ui_protocol.md:534-777`):
- Entity names are UAX #31 identifiers (`:547-569`).
- Each component's properties include `"component": {"const": "Name"}`. Shared types come in through `$ref` to `common_types.json#/$defs/...`: `DynamicString`, `Child`, `ChildList`, `Action`, `Checkable`, and so on.
- There is a template at `:648` and deprecation rules at `:773`.
- `ComponentCommon` (id, accessibility) is applied by the envelope schema.

Ways to deliver a custom catalog:
- **Well-known `catalogId`**, which both sides know ahead of time. The renderer lists it in `supportedCatalogIds`. This is the recommended route for Paseo and t3code.
- **Inline**, via renderer capabilities `inlineCatalogs[]`. This only works if the agent declares `acceptsInlineCatalogs: true` (`a2ui_protocol.md:1613-1633`).
- Several catalogs can be mixed in one surface by setting a per-component `catalogId` (`:508-519`).

### SDK side
- **TS:** `Catalog.fromJson(doc)` (`web_core/src/catalog/types.ts:864`) gives a schema-only `CatalogApi`. There are also `catalog.derive(...)`, `withEntries` and `toJson` (`:568-616`).
- **Agent:** `CatalogConfig.fromPath(path)` reads `protocolVersion` and `catalogId` from the file (`express-and-agent-sdk.md`).
- **Renderer:** the React path uses `ComponentApi` objects with **zod** schemas (`catalogs/basic/v1/components/basic_components.ts:44-600`), not JSON Schema. A native renderer can take the APIs from `Catalog.fromJson`. Whether `fromJson` builds zod schemas good enough for `GenericBinder` is **unknown**. In my tests, `NodeResolver` resolved props correctly for a catalog built with `fromJson`.

Related: [protocol](protocol-v1.md) · [macros](macros.md) · [web_core](web-core-rn-safety.md)
