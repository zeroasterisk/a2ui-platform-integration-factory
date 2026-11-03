# Status

| Phase | State | Gate |
|---|---|---|
| 0. Intent review, repos, forks, branches | ✅ | factory repo + `a2ui` branches on both forks |
| 1. Deep research → OKF wiki (A2UI, Paseo, t3code, CopilotKit) | ▶️ | pages in `wiki/<topic>/`, index merged, `index.md` lists all |
| 2. Fable + Argon review of research; factory design (`docs/design/factory.md`), per-host recipes (`recipes/paseo.md`, `recipes/t3code.md`) | ⏳ | both reviews folded in |
| 3. Local mock: Paseo daemon + web UI (Docker) with ≥2 harnesses; e2e harness | ⏳ | screenshot of an agent session in local Paseo |
| 4. Paseo integration (plugin on `a2ui` branch): chat renderer + canvas panel + agent tool + demos + core tests + e2e | ⏳ | e2e green, CUJ GIF, diff small |
| 5. t3code integration | ⏳ | same bar |
| 5b. Buzz integration (research → recipe → `a2ui` branch) | ⏳ | same bar |
| 5c. CopilotKit alignment (partner): v1.0 + Express in `@copilotkit/a2ui-renderer`, shared conformance demos | ⏳ | agreed plan with CopilotKit |
| 6. Factory retro: conformance fixtures + recipe template generalised | ⏳ | |

## Log
- 2026-11-03: Buzz added as target (fork zeroasterisk/buzz@a2ui); CopilotKit = core team + first-class; README 4 sections.
- 2026-11-03: repos/forks created; 4 research subagents launched; principles doc (factory = workspace, not dependency).
