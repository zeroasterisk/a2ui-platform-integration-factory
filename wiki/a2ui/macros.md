---
type: Concept
title: A2UI macros (MacroExpander) and the TypeScript gap
description: How Python macros expand composite components into primitives server-side, and what a minimal TS port would take.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/python/a2ui_agent/src/a2ui/transformers/macros
tags: [a2ui, macros, transformer, catalog, python, typescript-gap]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:58:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# Macros

Macros let the LLM write a high-level component such as `ProductCard(...)` that the **agent** expands into basic-catalog primitives before the messages are sent. The renderer receives only primitives and needs no custom widgets (`python/.../transformers/macros/README.md:1-20`). For multi-agent surfaces this means domain components cost nothing on the client.

## Python implementation (`python/a2ui_agent/src/a2ui/transformers/macros/`, 1,044 LOC)
| File | LOC | Role |
|---|---|---|
| `macro.py` | 536 | The `@macro` decorator (`:461`). It reads type hints and the docstring and turns them into a component JSON schema. The function name is converted to PascalCase (`:51`). Google- and Sphinx-style docstrings are parsed (`:60`), and type hints are mapped to the schema by `_map_type_hint_to_schema` (`:141`). |
| `processor.py` | 214 | `_MacroProcessor.expand(name, args, instance_id)` (`:122`). It coerces JSON arguments: a string id becomes a `ComponentRef`, a list of ids becomes a list of refs, `{"path":…}` becomes a `DataBinding`, an action shorthand string or dict becomes an `Action`, and accessibility dicts are converted too (`:143-200`). It then calls the function and flattens the result (`:211`). |
| `expander.py` | 271 | `MacroExpander(macros, passthrough_components=None)` (`:32-75`), described below. |

`MacroExpander` provides three methods:
1. `transform_to_inference_catalog(base)` (`expander.py:78`) copies `base.to_json()`, optionally prunes the base components down to `passthrough_components`, and adds the macro schemas to `components` and to `$defs.anyComponent.oneOf`. A name that collides with an existing component raises `A2uiCatalogError`.
2. `transform_to_transport(msgs)` (`:175`) goes through `createSurface`, `updateComponents` and `surfaceUpdate` → `components` and expands macros recursively (`_expand_component_list`, `:217`). The maximum depth is 16, and a macro that fails to expand is **left in place and logged** (`:259-266`).
3. `transform_to_inference(msgs)` (`:211`) returns its input unchanged (identity).

Type mapping (README.md:66-74):
- `str`, `int`, `float` and `bool` map to the matching JSON types. `Enum` and `Literal` map to `enum`.
- A component type maps to `ComponentId`, and `Sequence[...]` of components maps to `ChildList`.
- `Action` maps to `#/$defs/Action`.

**Flattening** is done by `builder/core/flattener.py:26` (67 LOC) and `id_allocator.py`. The macro instance's `id` becomes the subtree root. Inner ids are namespaced as `<instanceId>__<type>_<n>`, for example `badge_1__row_1` (`id_allocator.py:34-40`, `conformance/agent/macros/golden/01_status_badge_expansion.json`). The output is post-order. Macro bodies are written with the Python typesafe builder (`a2ui.builder.v0_9` / `v1_0`, builder core plus v1_0 is about 850 LOC).

**Wiring today is manual** (README.md:94-126):
```
inference_catalog = expander.transform_to_inference_catalog(base)
ExpressFormat([inference_catalog]).create_parser().compile(llm_output)
expander.transform_to_transport(...)
```
A declarative `CatalogConfig(transformer=TransformerPipeline([...]))` form is listed as "future" (README.md:142-160).

## Sample (`samples/community/macros/`)
- A FastAPI server (`server.py`) with Python macros (`macro_definitions.py`: `UserProfile`, `TeamCard`, `EmployeeSalaryCard`, …) and a React/Vite client using the basic catalog (README.md:9-14).
- It targets **v0.9.1** (`server.py:58-59`), not v1.0.
- It demonstrates **server-side resolvers**: the model passes ids, and the macro looks up sensitive values on the server.

## TypeScript status: **no macro implementation**
I grepped `typescript/agents` and `typescript/core` for "macro" and found only test and DOM-setup files. Neither `@a2ui/agent` nor web_core has an equivalent. The TS agent does have the hook a port needs: `CatalogConfig(catalog, transformers: CatalogTransformer[])` with `transform(catalog)` (`typescript/agents/a2ui_agent/src/processor/catalog-config.ts:34-56`, `catalog-transformers/base.ts`). It has **no transport-lowering hook**, so expansion would run on `parseResponse` / stream output.

## Minimal TS port: estimate
- No reflection is needed. Each macro can be declared as `{name, description, params: JSONSchema props, expand(args, ctx) => ComponentTree}` (the conformance suite's AST `template` form, `conformance/agent/macros/README.md:9-20`).

| Piece | Est. LOC |
|---|---|
| `defineMacro` plus a schema helper (props, `ComponentId`, `ChildList`, `Action` refs) | ~60 |
| `MacroCatalogTransformer implements CatalogTransformer` (clone `toJson()`, prune, add to `components` and `anyComponent.oneOf`, `Catalog.fromJson`) | ~60 |
| Argument coercion (string action → `{event:{name}}`, `{path}` → `{"@path"}`) | ~40 |
| Nested-tree flattener with `<inst>__<type>_<n>` ids and post-order output | ~70 |
| `expandMessages(msgs)` over `createSurface` / `updateComponents`, recursion limit, failures kept in place | ~50 |
| **Total** | **~250-300 LOC** plus tests |

Run the 10 golden cases in `conformance/agent/macros/` as fixtures. The suite says `version: "v0.9"` (`macros.yaml:2`), so you would need to rewrite the envelopes to v1.0 (`@path` instead of `path` and similar). That rewrite is an **unknown** amount of work.
- **Streaming caveat:** a macro instance can only expand after its statement is complete. Expanding each streamed `updateComponents` is safe, because ids are deterministic per instance.

Related: [express](express-and-agent-sdk.md) · [catalogs](catalogs.md) · [conformance](conformance-fixtures.md)
