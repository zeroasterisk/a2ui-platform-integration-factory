# Recipe: Paseo (fork zeroasterisk/paseo @ a2ui)

Grounded in paseo `3857ed3`. Zero core diff: everything is a plugin example under `plugin-examples/a2ui/`, following `timeline-items` (transformer + renderer) and `local-plugin` (panel + RPC).

## Wire
Same as every host: the agent emits prose + `<a2ui>…Express…</a2ui>` (upstream `SkillGenerator` contract, no fences). Actions go back as a visible user message via `usePaseo().agents.ref(agentId).send(text)` (packages/client/src/index.ts:378):
````
Applied triage.
```a2ui-action
{"surfaceId":"…","name":"apply","sourceComponentId":"…","context":{…}}
```
````

## Files (slice 1: chat-inline, client only)
1. `paseo-plugin.json`: `{"id":"a2ui","requirements":{"paseo":">=0.15.0"}}`. The e2e `copyPluginExample` rewrites requirements to the checkout version.
2. `package.json`: private, `dependencies` exact `@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0` (bundled by the plugin compiler, like `markdown-panel`'s `@codemirror/*`).
3. `shared/a2ui.ts`: the Zod schema for the plugin item `{kind:"a2ui", version:1, data:{source, closed, phase}}`, plus `splitA2uiSegments(text)` (same contract as t3code's: streaming-safe, an unclosed tag stays pending) and `a2uiActionMessage(action)`. Pure, no deps.
4. `index.client.tsx`: `addTimelineTransformer({id:"a2ui", query:{itemType:"assistant_message"}, transform})`. It returns `undefined` when the text has no `<a2ui`, so the host keeps its own row. Otherwise it returns one item per segment: `kind:"a2ui-markdown"` (rendered with host `Markdown` from `@getpaseo/plugin/client/ui`) or `kind:"a2ui"`, with stable `id`s (`<segment index>`). `addTimelineRenderer` for both kinds.
5. `client/surface.tsx`: compiles with `ExpressFormat([catalog]).createParser().parseResponse(source)` → `MessageProcessor` (web_core root/state/processing subpaths) → RN component map over `react-native` `View`/`Text`/`Pressable` + host `TextInput`, `Icon`, `Markdown`, styled only with `theme.colors.*` from `PluginHostProps` (like `pi-tasks.tsx`). While `phase === "streaming"` and the tag is unclosed, show host `Loading`. On a parse or validation error, render the raw source in a code block.
6. `client/catalog.tsx`: the basic catalog mapped to RN: Text, Row, Column, Card (`surface1` + `border`), Button (accent only for `primary`, one per surface), TextField, CheckBox, ChoicePicker (chips), Divider, Icon. Mark unsupported components as a visible "unsupported: X" placeholder; never drop them silently.
7. `a2ui.test.ts`: vitest, colocated like `pi-tasks.test.ts`. A transformer table covering none / complete / unclosed-streaming / two surfaces / adversarial; a compile smoke test for each conformance demo.
8. `README.md`: in the voice of the other examples (what it recognises, what it renders, no server entry).

## Slice 2 (agent tool + canvas)
- `index.server.ts`: `defineAgentTool` `a2ui_render` attached through `agent.open.before`, gated by label `a2ui/enabled` (template: `agent-tools`). It validates Express, then `timeline.append({type:"plugin", id:surfaceId, kind:"a2ui", …})`. The same id replaces the surface in place. Known limits: 64 KiB `data` cap, rows lost on daemon restart.
- `addAgentPanel({id:"a2ui-canvas"})` plus an "Open in panel" button on the surface (`openPanel`). The panel reads the latest `a2ui` rows through `usePaseo().agents.ref(id).timeline`. `tab.setState` stores the last surfaceId.
- Skill install: the plugin ships the generated skill text, and the server hook appends it for labelled agents.

## e2e (Playwright, existing harness)
`packages/app/e2e/browser/plugin-a2ui-example.spec.ts`, modelled on `viewInlineThinkingExample`:
`copyPluginExample("a2ui")` → `patchDaemonConfig({pluginsEnabled:true})` → `installDirectoryPlugin` → `seedMockAgentWorkspace({model:"ten-second-stream", featureValues:{mockStreamingAssistantResponse: <demo text>, mockStreamingAssistantIntervalMs: 300}})` → send a prompt → assert the card heading/button render natively (`getByRole`) and `assistant-message` count is 0 for that row → click the button → assert the next user message contains `a2ui-action` → screenshot at widths 1100 and 390. No real model is needed: the mock provider streams the demo text verbatim.

## Risks to measure first (before writing UI)
1. **Bundle in Hermes.** The plugin client bundle is esbuild cjs, es2020, minified, with async lowered. `@a2ui/agent` pulls antlr4ng (~1.45 MB raw / 305 KB gzip in the web spike). Must load in RN Hermes; on web it is fine. If Hermes fails or is too slow, fall back to compiling on the plugin server (`a2ui_compile` RPC) for native only.
2. **zod major mismatch (measured 2026-11-08).** The plugin compiler marks `zod` external, so it resolves to Paseo's `zod ^4.4.3` (packages/app, packages/plugin). `@a2ui/web_core@0.15.0` depends on `zod ^3.25.76`: 162 `from 'zod'` imports, plus `zod-to-json-schema` (v3 internals) in `catalog/{schema_generator,schema_serializer,spec_shape,exclusive_union}.js`. Whether the paths the renderer actually needs (parse + MessageProcessor) run on zod 4 is **unverified**. Spike first: bundle with zod 4 aliased in and run the conformance demos. If it breaks, the fix belongs upstream in A2UI (import `zod/v3` or migrate to v4; principle 2). Don't vendor and don't bundle a second zod.
3. **Transformer must be sync + deterministic.** Do the split in the transformer and the Express compile in the renderer (memoised on `source`), never in `transform`.

## Conventions (from Paseo docs)
`function` declarations, `interface` over `type`, no barrel files, no TODO/console.log, Biome format; run `npm run typecheck && npm run lint && npm run format`. Fallible actions show pending / success / failure states (docs/testing.md:26-34). Screenshots go in `screenshots/` as QA evidence, like `modal-ui`.
