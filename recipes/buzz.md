# Recipe: Buzz 1.0 (block/buzz-app, fork zeroasterisk/buzz-app @ a2ui)

Grounded in buzz-app `3fca452` (plugin seams unchanged since `ff8415d`, see `wiki/buzz/buzz-app-plugin-shape.md`). There is no core diff: everything is one bundled plugin, `src/bundled/a2ui/`, built on the `diffs` (`registerMessage`) and `charts` (gallery + browser test) precedents. Mobile (block/buzz Flutter) stays PR 2 of `wiki/buzz/a2ui-integration-shape.md`.

## Wire
The agent posts an ordinary kind:9 (or 40002 agent envelope) body: prose plus `<a2ui>…Express…</a2ui>`. This is the upstream `SkillGenerator` contract, the same as t3code and Paseo. Hosts without the plugin show the raw text.
- We use the sentinel, not a ```` ```a2ui ```` fence. Upstream `EXPRESS_RULES` forbids the fence, and one wire for every host keeps the shared conformance demos identical. The old Buzz wiki proposed a fence (configNudge style). This recipe supersedes that proposal.
- Actions go back as a kind:9 **thread reply** that p-tags the surface author: `session.messages.reply(channelId, rootId, text, [authorId])`. In solo chats it is `session.messages.send(channelId, text, [authorId])`. Precedent: `src/bundled/github/ResolvePull.tsx:130-131`. `rootId` is `message.threadRootId ?? message.id`. The body uses the same `a2ui-action` block as t3code:
````
Applied triage.
```a2ui-action
{"surfaceId":"…","name":"apply","sourceComponentId":"…","context":{…}}
```
````

## Trust gate (by construction)
`registerMessage` gets the whole `ChannelMessage`. Match only when all of these hold:
- the body contains `<a2ui`;
- `message.agentEnvelope`, the author is in `useKnownAgentPubkeys`, or the author's profile has `isAgent`. This is the same predicate `MessageRow.tsx:467` uses for the agent squircle (was `:399-402` at `3fca452`; moved at fork base `f307d59`);
- there is no `workflowOwnerId`.

Human-authored `<a2ui>` text stays plain text. `registerCodeBlock` is not used, because it gets only `{code, language}` and so cannot see the author.

## Files (slice 1: chat-inline, fork only)
1. `src/bundled/a2ui/manifest.json`: `{"id":"buzz.a2ui","name":"Interactive replies","apiVersion":1,"description":"Draw A2UI interactive replies from agents as native forms and cards.","discovery":{"category":"communication"}}`. Default-off, per `docs/plugin-defaults.md`.
2. `index.tsx`: `inject = ["conversation", "relay", "agents"]`. It calls `registerMessage({id:"a2ui", title:"Interactive reply", matches, component: A2uiMessage})` and `agents.addInstructions({id:"a2ui", text: A2UI_POINTER})`, and `agents.addTool` arrives in slice 2. Keep it ≤20 lines, like `diffs/index.tsx`.
3. `a2uiMessage.ts` (+ `.test.ts`): `splitA2uiSegments` + `a2uiActionMessage` with the same contract and test table as t3code's `packages/shared/src/a2uiMessage.ts`: CommonMark fence pairing, `</a2ui>` inside strings and comments, unclosed tag → `closed:false`. Copy it in; never import it (principle 1).
4. `A2uiMessage.tsx`: renders markdown segments with host `MessageMarkdown` (precedent: `watching/Activity.tsx` imports host message modules). It lazy-loads `A2uiSurface` for closed blocks. An open block shows host `LoadingRegion`/`ShimmerText`, never raw DSL. A parse or validation error shows the source in the host code frame.
5. `a2uiThread.ts`: one `MessageProcessor` + `RendererState` per `channelId:threadRootId`, LRU 8. Port t3code `a2uiThread.ts` (closed blocks applied in order, replay on edit, per-block default surface id `a2ui-<msgId>:<offset>`). So `surface("id", update=true)` updates the earlier surface, and the older row collapses to "Updated below".
6. `catalog.tsx`: the v1 basic catalog APIs (`BASIC_COMPONENTS` + theme schema, never `/catalogs/basic/v1` render code, which pulls lit) mapped onto `src/shared/design-system/ui`:
   - Button → `Button` (primary only for `variant:"primary"`, one per surface).
   - TextField → `Input`/`Textarea` inside `Field`.
   - CheckBox → `Checkbox`.
   - ChoicePicker → `RadioGroup`, or `ChoiceRow` chips for ≤4 short options.
   - Card → `PreviewCard`; Divider → host separator token; Row and Column → flex with design tokens; Text → host text styles; Icon → `icons.ts`.
   - Anything else → a visible "unsupported: X" placeholder.
   `pnpm design:check` (type, color, contrast, adoption) must pass, so use tokens only and no raw colors.
7. `README.md`: needs a "Getting started" section (`src/bundled/readmes.test.ts` enforces it), in the voice of `charts/README.md`.
8. Gallery fixture: an `a2ui` group in `tests/fixtures/message-gallery/examples.ts`. It holds an agent-authored triage form, a human-authored copy that must stay text, a streaming (unclosed) block and an off-catalog `Iframe` reply.
9. `tests/browser/a2ui.spec.mjs`, modelled on `charts.spec.mjs` (Playwright against `message-gallery.html?group=a2ui`):
   - native roles: heading, textbox, radio/checkbox and button;
   - the human copy has 0 form controls;
   - no iframes;
   - layout holds at 360 px and 1.5x text;
   - the dark color mode uses theme tokens.
   The action round-trip (`messages.reply` called with the p-tag and the edited `context`) goes in a Vitest component test with a fake session, like `DiffMessage.test.tsx`.

Deps (exact): `@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0`, `@a2ui/react@0.15.0`. buzz-app has no direct zod. At `f307d59` it carries zod 3.25.76 (tauri-mcp-server) and 4.6.5 (`@modelcontextprotocol/server`). **Verified** on fork `87cb992` (base `f307d59`):
- `pnpm why zod`: `web_core` and `agent` resolve zod 3.25.76.
- `@a2ui/react` resolves the host's zod 4.6.5 (its zod is a peer dep, and `@modelcontextprotocol/server` brings 4). It has 0 runtime zod imports, so this is types-only and harmless. `pnpm peers check` flags the mismatch (and markdown-it wanting web_core ^0.14). That's noise, not a blocker.
- Conformance harness run in-tree with buzz-app's own resolution matches the zod-3 baseline exactly: compile 115/121, MessageProcessor 0 errors over 64 cases, `parseResponse` 68/72. NEEDS_ALAN #2 does not block Buzz.

## Prompt budget (measured, `spikes/zod4-rn/prompt-budget.mjs`)
`addInstructions` throws on more than 4096 UTF-8 bytes and is sent on every turn.

| Prompt part | Bytes | vs 4096 cap |
|---|---|---|
| `EXPRESS_RULES` | 3936 | fits alone |
| `ExpressPromptGenerator.generate()`, basic catalog | 21875 | 5.3× over |
| base rules + headers for the 9 chat components | 4629 | 533 over |

Consequence: the full Express prompt **cannot** go through `addInstructions`. Split it:
- **`addInstructions`** carries a short pointer (target ≤1 KB): when to use an interactive reply, the `<a2ui>` sentinel, the `surface("id", update=true)` follow-up rule (missing from upstream `EXPRESS_RULES`, NEEDS_ALAN #2), and "call `a2ui_rules` before your first interactive reply".
- **`addTool a2ui_rules`** (no args) returns `generate()` for the active catalog. The agent pays for it once, when needed, not on every turn.
- Slice 2's **`addTool send_a2ui`** validates Express with `ExpressFormat.createParser().parseResponse` before posting and returns the compile errors to the agent.

## Slice 2
- Tools: `send_a2ui` (validate, then post via the tool's `client` as the agent) and `a2ui_rules`, if slice 1 doesn't already ship it.
- Canvas: decide after slice 1. Candidates are a plugin panel (opened via the component's `open` target) showing the live thread surface, which mirrors t3code "Open in panel", or the 40100 canvas body.

## Conventions (buzz-app)
- Biome; `pnpm check` (biome + tsc + design typecheck + design checks) and `pnpm lint` (icons) must pass.
- Tests: Vitest for logic, and Playwright `tests/browser` only for what needs real CSS or layout (the `charts.spec.mjs` header says so).
- Bundled plugins import host modules by relative path.
- Plain, user-facing copy: the README and manifest description say what a person sees, not what A2UI is.

## Risks to measure first
1. zod dedupe and the conformance demos inside the buzz-app build (above).
2. Lazy chunk weight: t3code measured 212 KB gzip, dominated by antlr4ng + `@a2ui/agent`. Check that buzz-app's Vite config splits it.
3. `registerMessage` is first-match-wins. Checked at `3fca452`: the only bundled matchers are `diffs` (`!!message.diff`) and `huddles` (`!!message.huddle`), so neither collides. Re-check on rebase.
4. The plugin API sits under "Likely to break: conversation contributions" (`docs/plugin-architecture.md:20`). Pin the fork base and re-check seams each run.
