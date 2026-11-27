You are Gemini 4 Argon, doing the close review of t3code slice 3 (Phase 6b) in the a2ui-platform-integration-factory: native A2UI v1.0 integrations in host forks, minimal host diff, native primitives, host conventions. Slice 3 gives t3code agents an A2UI pointer (provider developer instructions) plus two read-only MCP tools (`a2ui_rules`, `a2ui_check`), gated by the shared `conformance/prompt/` group (bar: 25/25 + 1 skip, ownership n/a because t3code has one agent per thread).

Files attached: principles, the slice-3 plan (with your earlier plan-review must-fixes folded), your plan review, the evidence doc, the t3code recipe, the prompt conformance README/check, and the fork diff `84656662..8027ff15` (lockfile excluded).

Review only. Output markdown with exactly these sections:
1. Verdict (close Phase 6b / close after must-fixes / not ready), one line.
2. Findings by severity (Critical / Major / Minor). Each: file + line/section, the problem, the concrete fix. Only real issues; verify each claim against the attached diff (e.g. that `@a2ui/*` is only reached by dynamic import, that `a2ui_check` only replays assistant messages, that the pointer is a separate constant ≤1,024 B, that thread scoping / credential checks hold, that the tool error contract matches the plan). Say explicitly whether each earlier plan-review must-fix (C1, M2, M3, m4) is actually closed in the code.
3. Risks for real agents (Codex, Claude) using this in a live t3code thread that the tests would not catch.
4. Must-fix before close (short list).
5. Strengths (brief, genuine).
Keep it under 900 words.
