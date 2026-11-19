### 1. Verdict
**Close after must-fixes** (two trivial defects in the action reply path; slice 1 architecture and boundaries are otherwise sound).

### 2. Findings by Severity

#### Major
* **`src/bundled/a2ui/A2uiMessage.tsx:104-114` — Unawaited send/reply promises break failure detection and race lock state.**
  `sendMessage` is `async`, but calls `session.messages.send(...)` and `session.messages.reply(...)` without `return` or `await`. Consequently, `sendMessage` resolves immediately on the microtask tick before the relay operation finishes, and any asynchronous rejection becomes an unhandled promise rejection instead of triggering `catch` in `a2uiThread.ts:126` (`"failed"` state).
  *Fix:* `await` (or `return`) the `session.messages.send(...)` and `session.messages.reply(...)` calls.

* **`src/bundled/a2ui/a2uiThread.ts:119-129` — No guard against double-send or programmatic dispatch after lock.**
  `send()` does not check `this.sentBySurfaceId.get(action.surfaceId)` before dispatching. While `A2uiBlock.tsx` sets `inert={locked}` after React re-renders, rapid synchronous double-clicks before commit, programmatic `surface.dispatchAction(...)` calls, or multi-block shared-store edge cases can fire duplicate replies.
  *Fix:* Guard the top of `send()`: `const cur = this.sentBySurfaceId.get(action.surfaceId); if (cur === "sending" || cur === "sent") return;`.

* **`src/bundled/a2ui/a2uiThread.ts:32` & `A2uiMessage.tsx:104-114` — Multi-agent surface update hijacking / mention misrouting.**
  `A2uiThreadStore` scopes surfaces to `channelId:rootId` across *all* agents in the thread, and `store.setSendMessage(onSendMessage)` in `A2uiBlock.tsx:26` overwrites the store-wide callback inside `useEffect` (meaning the last-mounted block in the thread wins). If Agent B posts `surface("triage", update=true)` on Agent A's surface, or two agents post different surfaces in the same thread, `this.sendMessage` will always mention whichever block's `useEffect` ran last (`[message.authorId]`). Furthermore, any profile with self-declared `isAgent: true` (`trust.ts:13`) can overwrite another agent's surface in the same thread.
  *Fix (Slice 2 / quick fix):* Key `sendMessage` (or authorId) by `surfaceId` or `latestBlockBySurfaceId` so actions always reply to the author of the block that owns that surface.

#### Minor
* **`src/bundled/a2ui/A2uiMessage.tsx:125` — Links in markdown segments around `<a2ui>` blocks are broken.**
  `<MessageMarkdown ... onOpenLink={() => false} />` drops the `canOpen` and `open` props passed to `A2uiMessage` (`TargetOpener`), blackholing link clicks in prose accompanying an A2UI block.
  *Fix:* Destructure `{ message, canOpen, open }` in `A2uiMessage`, pass to `SessionMessage`, and wire `onOpenLink` the same way host message components do.

* **`src/bundled/a2ui/trust.ts:7` vs `a2uiMessage.ts:88` — Loose substring match in `isA2uiMessage`.**
  `trust.ts` checks `message.content.includes("<a2ui>")`, whereas `splitA2uiSegments` only splits when `<a2ui>` starts a line outside a code fence. If an agent mentions `<a2ui>` inline or inside a code fence, `isA2uiMessage` still claims the message and renders it via `A2uiMessage` (falling through to a single `MessageMarkdown` segment). Harmless visually once `onOpenLink` is fixed, but slightly over-matches.
  *Fix:* Check `splitA2uiSegments(message.content).some((s) => s.kind === "a2ui")`.

* **`src/bundled/a2ui/catalog.tsx` vs `recipes/buzz.md` — Minor recipe drift on `Card`, `ChoicePicker`, and heading `Text`.**
  The recipe specifies `PreviewCard` for `Card` and `ChoiceRow` chips for $\le 4$ short options; `catalog.tsx` uses a custom `.card` CSS class (well-justified in comments for `--surface-inset` contrast) and always renders `RadioGroup`/`Checkbox`. `Text` also only checks `variant === "caption"`, ignoring `h1`–`h5` variants (causing Vision Finding C).
  *Fix:* Map heading variants in `Text` (`h1`–`h5` / `title`) to host heading typography classes.

### 3. Must-Fix Before Close
1. **`src/bundled/a2ui/A2uiMessage.tsx:108-113`**: Add `await` before `session.messages.send(...)` and `session.messages.reply(...)` so rejections reach `a2uiThread.ts` and `"sending"` reflects actual promise lifecycle.
2. **`src/bundled/a2ui/a2uiThread.ts:119`**: Early-return in `send()` if `this.sentBySurfaceId.get(action.surfaceId)` is already `"sending"` or `"sent"`.

### 4. Slice-2 Plan Inputs
1. **Fix per-surface author routing** in `A2uiThreadStore`/`A2uiMessage` so multi-agent threads mention the author of the specific surface being acted upon, not the last-mounted `A2uiBlock`.
2. **Ship `a2ui_rules` and `send_a2ui` tools** (`ctx.agents.addTool`) and update `A2UI_POINTER` to instruct agents to call `a2ui_rules` before their first interactive reply.
3. **Wire `TargetOpener` (`open`/`canOpen`)** into `A2uiMessage`'s `MessageMarkdown` and evaluate using `open` for canvas/panel surface expansion.
4. **Verify thread-panel / full-thread hydration**: ensure `useThreadBlocks` sees messages when opened in a thread view or when the root surface scrolls out of `session.channels.window`.
5. **Run the live-relay end-to-end CUJ** with a real Buzz relay and agent identity to prove the full action reply + `update=true` round trip.
6. **Eliminate transitive `lit` from the lazy chunk** once upstream `@a2ui/web_core` separates schema exports from Lit element registration.

### 5. Upstream-Readiness (Buzz Maintainer Pushback & Trims)
* **`pnpm-workspace.yaml` override (`"@a2ui/react>zod": 3.25.76`):** Maintainers dislike workspace overrides for third-party peer conflicts. *Trim:* Have `@a2ui/react` widen its peer dependency to `zod: "^3.25.0 || ^4.0.0"` (or drop the unused peer dep upstream since `@a2ui/react` has 0 runtime zod imports), then delete the override.
* **207.6 KB gzip lazy chunk (including dead `lit` and `fs`/`path` warnings):** Pulling Lit into a React app and emitting Vite `fs`/`path` externalization warnings from `@a2ui/agent` (`skill.js`/`catalog-providers.js`) will draw scrutiny. *Trim:* Split `@a2ui/agent` browser parser entry from Node skill/fs helpers upstream, and tree-shake Lit out of `@a2ui/web_core/catalogs/basic/v1`.
* **Duplicated parser/store code (`a2uiMessage.ts`, `a2uiThread.ts`):** If maintainers ask why 440 LOC of Express tag-splitting and thread state live in `src/bundled/a2ui/` instead of `@a2ui/agent` or `@a2ui/react`, consider upstreaming `splitA2uiSegments` and `A2uiActionEvent` formatting into `@a2ui/agent`.
* **`check-icons.mjs` additions:** This is Buzz's standard closed-policy allowlist; maintainers will expect it.

### 6. Strengths
* **Zero core intrusion:** Outside `package.json`, `pnpm-workspace.yaml`, and the mandatory `check-icons.mjs` allowlist, 100% of production code lives cleanly in `src/bundled/a2ui/`.
* **By-construction security & streaming UX:** Trust gating via `registerMessage`, `sanitizeMediaUrl`, off-catalog blocking with `<details>` source inspection, and lexer-aware `findCloseTag` prevent both human spoofing and streaming DSL leaks.
* **Host-native look and test discipline:** Token-only CSS (`--surface-panel` vs `--surface-inset` contrast tested in light/dark mode and 360px @ 1.5x zoom) and focused Vitest + Playwright specs match Buzz's own `charts` and `diffs` plugins.
