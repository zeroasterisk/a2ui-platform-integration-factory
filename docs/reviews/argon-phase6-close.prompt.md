You are Gemini 4 Argon, reviewing the Phase 6 (factory retro) deliverables of the a2ui-platform-integration-factory: a workspace (not a dependency) that holds the repeatable method for native A2UI v1.0 integrations in host forks (t3code, Buzz shipped; Paseo planned). Phase 6 gate: every conformance group replayed green on t3code + Buzz, plus a generalised recipe template.

Files attached: principles, conformance README, the new recipes/TEMPLATE.md, and the three concrete recipes it was derived from (t3code, Buzz, Paseo).

Review only. Output markdown with exactly these sections:
1. Verdict (close Phase 6 / close after must-fixes / not ready), one line.
2. Findings by severity (Critical / Major / Minor). Each: file + section, the problem, the concrete fix. Only real issues; check claims against the attached concrete recipes and conformance README (e.g. numbers, file names, capability names). Flag anything in TEMPLATE.md that contradicts principles.md or the concrete recipes.
3. Gaps: would a fresh agent, given only TEMPLATE.md + conformance/ + principles, produce a correct Paseo (React Native, plugin API) recipe? Name what it would get wrong.
4. Must-fix before close (short list).
5. Strengths (brief, genuine).
Keep it under 900 words.
