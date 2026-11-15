You are an adversarial reviewer closing Phase 5 of a project building a native A2UI v1.0 (Express DSL) integration into t3code (React web app, pingdotgg/t3code) as a minimal-diff fork (`zeroasterisk/t3code@a2ui`, head 8dba076b). Attached: the full fork diff vs upstream base (lockfile excluded), binding principles, the t3code recipe, the slice-2 plan, and CUJ evidence notes for slices 1, 2a and 2b.

Scope delivered across slices:
- Slice 1: `<a2ui>` blocks in assistant markdown are split out (`splitA2uiSegments`), parsed client-side via `@a2ui/agent` Express → MessageProcessor → `@a2ui/react`, drawn with a host-`components/ui` catalog; off-catalog components blocked; actions go back as a visible user message with an `a2ui-action` fence (collapsed disclosure); sent surface is locked (inert, dimmed); dev-replay scenario; user doc.
- Slice 2a: per-thread derived store (`a2uiThread.ts`) so `surface("id", update=true)` in a later reply updates an earlier reply's surface; earlier row collapses to "updated below".
- Slice 2b: in-memory right-panel kind "a2ui" + "Open in panel"; one live copy at a time; shared `A2uiSurfaceRow`.
Known open items: `@a2ui/agent` still 0.1.0 (no TS macros yet); ~17 KB lit remains via upstream `catalogs/basic/v1` barrel (upstream ask pending); upstream zod-4 fix pending (blocks Paseo, not t3code); CUJ minors: turn-1 row says "updated below" while the live copy is in the panel, and the "Show" link still renders while the panel tab is already active. Upstream host-file lines added outside new files/tests: ~58 in store/panel files plus small wiring in TimelineAssistantRows, MessagesTimeline, ChatMarkdown, vite.config, package.json.

THIS IS THE PHASE CLOSE GATE. Decide whether Phase 5 (t3code) can close and the project can move to the next phase (Paseo integration is blocked upstream; Buzz research is next), or what must be fixed first. Judge against the principles: minimal diff, native host primitives, host conventions (React Compiler: no manual useMemo; zustand; host components/ui; fmt/lint/knip), depend only on upstream A2UI core packages + host SDK. Also judge whether the fork is in a state that could be offered upstream to t3code maintainers later (do not recommend opening a PR now).

Review only; do not write code. Output (markdown, under 800 words):
1. Verdict: close Phase 5 now / close after must-fixes / not closable. One line.
2. Findings by severity (Critical / Major / Minor): file, issue, concrete fix. Only real issues you can point to in the diff.
3. Must-fix before close (may be empty), each ≤1 line.
4. Upstream-readiness: what a t3code maintainer would push back on (diff size, deps, bundle weight, conventions), with concrete trims.
5. Carry-forward lessons for the recipe template (Phase 6) and for Paseo/Buzz, ≤6 bullets.
6. Strengths (short, genuine).
