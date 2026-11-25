# Recipe: t3code (fork zeroasterisk/t3code @ a2ui)

As shipped, `A2uiSurface.tsx` became `A2uiBlock.tsx` plus `a2uiCatalog.tsx`, `a2uiThread.ts` and `A2uiPending.tsx`. New hosts start from `recipes/TEMPLATE.md`.

## Wire
Agent emits prose + `<a2ui>…Express…</a2ui>` (upstream `SkillGenerator` contract; no fences). Actions return as a user message:
````
Applied triage.
```a2ui-action
{"surfaceId":"…","name":"apply","sourceComponentId":"…","context":{…}}
```
````

## Files (web slice 1)
1. `packages/shared/src/a2uiMessage.ts` (+ `.test.ts`): `splitA2uiSegments(text)` → `[{kind:"markdown"},{kind:"a2ui", source, closed}]`; streaming-safe (an unclosed tag → `closed:false`, rendered as a loading skeleton, never raw DSL; tags inside code fences/inline code are ignored; see factory.md fold-in §3); `a2uiActionMessage(action)` serializer. Pure, no deps. Tests: table of complete / unclosed / multiple / adversarial inputs.
2. `apps/web/src/components/chat/A2uiSurface.tsx`: lazy chunk. `ExpressFormat([catalog]).createParser().parseResponse(...)` → `MessageProcessor` (web_core root) → `@a2ui/react` `A2uiSurface`. Catalog = `Catalog.fromJson(v1 basic JSON)` APIs + `createComponentImplementation` render fns over `components/ui` (Button, Input, Textarea, Checkbox, RadioGroup/toggle-group chips, Switch, Separator, Badge, card classes). Parse/validation error → `MarkdownCodeBlock` fallback.
3. `ChatMarkdown.tsx` / `TimelineAssistantRows.tsx`: split assistant text before markdown; render segments; pass `ctx.onSendAppMessage` for actions. Keep the ChatMarkdown diff minimal.
4. `apps/server/scripts/dev-replay/a2ui_transcript.ndjson` + `SCENARIOS` row: turn 1 = triage card; turn 2 (after action) = same surfaceId updated; turn 3 = adversarial fallback.
5. `A2uiSurface.browser.test.tsx`: render, click → `onSendAppMessage` called with the serialized action.
6. `docs/user/html-renders.md`: an "Interactive replies (A2UI)" section.

Deps at slice 1 (apps/web, exact): `@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0`, `@a2ui/react@0.15.0`. Now `@a2ui/agent@0.2.1`, `web_core`/`react` `0.16.1` (fork `591d2338`). Never import `@a2ui/web_core/v1_0`, `/catalogs/basic/v1` or `/universal` on the client (they pull lit). Use `/catalog` and the root.

## Slice 2 (canvas)
"Open in panel" on a surface → a right-panel tab rendering the same surface live. This is something MCP Apps can't do (they're pinned to the tool row).
