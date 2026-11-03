---
type: Guide
title: Express DSL and @a2ui/agent (Node)
description: Express grammar, prompt contract, compiler/streaming, and how to drive @a2ui/agent 0.1.0 from Node for chat vs canvas.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/typescript/agents/a2ui_agent/src/inference-formats/express
tags: [a2ui, express, dsl, agent-sdk, llm, streaming]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:55:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# Express DSL and @a2ui/agent

Express is a compact, Python-like notation that the LLM writes instead of A2UI JSON. The agent SDK compiles it into standard v1.0 envelopes, so **the renderer never sees Express**.

## Grammar (`specification/inference_formats/express/Express.g4`, 172 lines)
- `program: statement*`, where a statement is an `assignment` (`ident|path '=' expr`) or an `expression` (g4:13-30).
- Expressions are `array | map | path | check | call | variable | literal` (g4:35-43).
- `PATH: '$' [a-zA-Z0-9_/]*` is a data binding (g4:151). `CHECK: '?ident'` is a validation rule (g4:154).
- Calls take positional, named (`k=v`) or skipped (`_`) arguments (g4:84-109).
- Strings can be standard, triple-quoted or raw (`r"…"`) (g4:145-148).
- Comments start with `#` or `//`, or use `/* */`. Semicolons are ignored (g4:169-172).

## Prompt contract (`prompt-generator.ts:31-90`, `EXPRESS_RULES`)
The model must wrap its output in literal `<a2ui>…</a2ui>` tags (`:35`). The rules it is given:
- Components are calls: `header = Text("Hi")`, and the tree hangs off the reserved variable `root` (`:41-49`).
- `$/abs` is an absolute binding. Inside templates, `$rel` is relative and a lone `$` means the current item (`:63-65`).
- Validation uses `?required` or `?regex("…", "msg")` (`:67`). Agent actions use `Event("name", {ctx: $/x})` (`:69-70`).
- `$/path = value` seeds the data model (`:74`). `_template($/list, itemVar)` builds list templates (`:76-79`).
- `deleteSurface("id")` deletes a surface (`:81`). `surface("id")` targets one (`:88-90`).
- Catalog component and function signatures are appended, rendered from the catalog JSON by `schema-helper.ts`.
- With the basic v1 catalog, `processor.promptSnippet` came to **22,208 chars** when I measured it.

## Pipeline (TS, `src/inference-formats/express/`, ~8.5k LOC excluding tests)
- `parser.ts` (149 lines): `ExpressParser` provides `unwrap`, `compile(content, isFinal)`, `decompile` and `wrap`. Its `openStream` returns an `ExpressResponseStream` (`parser.ts:96-103`).
- `visitor.ts` and `compiler.ts` (3,033 lines, `ExpressCompiler` at `:1267`) map the AST to messages. Inline children get generated ids such as `root_children_0` (verified output below).
- `response-stream.ts` (1,132 lines) handles streaming:
  - `scanExpressBlock` (`:142`) and `splitCompleteStatements` (`:288`) find complete statements.
  - `healProgressiveFragment` (`:445`) lets the keys in `DEFAULT_EXPRESS_PROGRESSIVE_KEYS` (`:63`) stream before a statement is finished.
  - `ExpressResponseStream` (`:727`) exposes `feed(chunk)` (`:793`), `close()` (`:809`) and `isInBlock`.
- `decompiler.ts` turns JSON examples back into Express for prompts.
- The conformance README (`conformance/README.md:50`) still says "the Express parser does not implement `open_stream`". **That is stale.** Streaming works in 0.1.0: in my test, 7-character chunks produced `createSurface` and then `updateComponents` messages.

## Using @a2ui/agent in Node (README.md:7-107, verified against npm 0.1.0)
```ts
import {A2uiGenerator, CatalogConfig} from '@a2ui/agent';
const cfg = CatalogConfig.fromPath('catalogs/basic/v1/catalog.json'); // id + protocolVersion "1.0" read from file
const gen = new A2uiGenerator([cfg]);            // default format = ExpressFormatFactory (generator.ts:40)
const proc = gen.createProcessor({'1.0': {supportedCatalogIds: [cfg.catalog.id]}}); // NOT 'v1_0' (throws)
system += proc.promptSnippet;
for (const part of proc.parseResponse(llmText)) part.type === 'text' ? part.text : part.a2ui; // A2UI envelopes
```
- `CatalogConfig(catalog, transformers?)` (`processor/catalog-config.ts:34-82`) applies a chain of `CatalogTransformer` (`transform(catalog): catalog`, `catalog-transformers/base.ts`). The only built-in transformer is `ComponentPruningTransformer` (`pruning.ts:23`).
- `createProcessor(caps, formatFactory?, {state?})` (`generator.ts:61`) negotiates which catalogs are active (`utils/catalog-resolver.ts:80`) and fails if the agent and renderer share none.
- **Chat vs canvas** (README.md:40-58):
  - In **chat**, pass no state. Each parse is checked against an empty `RendererState`, so updating a surface the response did not create is rejected.
  - In **canvas**, create `state = proc.createState()` and pass it every turn, or bind it with `createProcessor(caps, undefined, {state})`. A whole-response parse is applied to the state all-or-nothing.
- **Streaming** (README.md:60-86): call `s = proc.openStream({state})`, then `s.feed(chunk)` for each chunk and `s.close()` at the end. The option `afterRejectedBlock: 'continue'` yields `ErrorPart`s instead of throwing. Code fences around the tags are stripped.
- **Agent and renderer in one process** (README.md:88-107): `RendererState.of(new MessageProcessor([catalog], onAction))` (`utils/renderer-state.ts:193`) streams straight into a live renderer model. `StreamedAnswer` keeps text, surfaces and errors in the order they arrived.
- `validatePayload(catalogs, messages)` validates a single payload, for example tool-call arguments.

## Verified output (basic v1 catalog)
Input:
```
<a2ui>
surface("s1")
$/user/name = "Ada"
root = Column([Text("Hello"), TextField(label="Name", value=$/user/name), Button(Text("Go"), action=Event("submit", {n: $/user/name}))])
</a2ui>
```
This produced one `createSurface` with `components` (`root`, `root_children_0…2`, `root_children_2_child`), `dataModel: {user:{name:"Ada"}}`, bindings as `{"@path":"/user/name"}`, and the action as `{event:{name:"submit",context:{n:{"@path":…}}}}`.

## Publication status (npm, checked 2026-11-03)
- `@a2ui/agent@0.1.0` is published. Its dependencies are `@a2ui/web_core ^0.15.0` and `antlr4ng 3.0.16`, and it ships `src/inference-formats/express` and `direct-json`.
- Its README targets v0.9 and v1.0 (README.md:5). Both v1.0 and Express **are** in the published build.
- `@a2ui/agent` imports `@a2ui/web_core/v1_0`, which pulls in lit. **Under the `browser` export condition it fails with `HTMLElement is not defined`**, while under Node it works because of lit's SSR shim. Run it server-side in Node. See [web-core-rn-safety](web-core-rn-safety.md).
  - **Correction (spike 2026-11-03):** importing only the package root plus `@a2ui/web_core/catalog` bundles lit-free under the browser condition and `parseResponse` runs without a DOM (305 KB gzip). Client-side compile is viable on web; Hermes untested. See `spikes/express-client/`.

Related: [macros](macros.md) · [protocol](protocol-v1.md) · [conformance](conformance-fixtures.md)
