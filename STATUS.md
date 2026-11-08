# Status

| Phase | State | Gate |
|---|---|---|
| 0. Intent review, repos, forks, branches | ✅ | factory repo + `a2ui` branches on both forks |
| 1. Deep research → OKF wiki (A2UI, Paseo, t3code, CopilotKit, Buzz) | ✅ | pages in `wiki/<topic>/`, index merged, `index.md` lists all |
| 2. Research review; factory design (`docs/design/factory.md`), recipes (`recipes/paseo.md`, `recipes/t3code.md`) | ✅ | Argon review folded (factory.md fold-in); gate narrowed to one review per CRON.md §4 |
| 2b. ▶️ Dependency spike: zod-4-aliased harness runs conformance demos via ExpressFormat→MessageProcessor; RN bundle has no lit/DOM; size measured | ⏳ | harness output in `spikes/zod4-rn/` |
| 3. Local mock: Paseo daemon + web UI (Docker) with ≥2 harnesses; e2e harness | ⏳ | screenshot of an agent session in local Paseo |
| 4. Paseo integration (plugin on `a2ui` branch): chat renderer + canvas panel + agent tool + demos + core tests + e2e | ⏳ | e2e green, CUJ GIF, diff small |
| 5. t3code integration (built first, per factory.md fold-in §6) | ⏳ | same bar |
| 5b. Buzz integration (research → recipe → `a2ui` branch) | ⏳ | same bar |
| 5c. CopilotKit alignment (partner): v1.0 + Express in `@copilotkit/a2ui-renderer`, shared conformance demos | ⏳ | agreed plan with CopilotKit |
| 6. Factory retro: conformance fixtures + recipe template generalised | ⏳ | |

## Log
- 2026-11-08: `recipes/paseo.md` (plugin-example slice 1 chat + slice 2 tool/canvas, Playwright e2e on mock `ten-second-stream`). Measured risk: Paseo's plugin compiler externalises `zod` (host ^4.4.3) while `@a2ui/web_core@0.15.0` needs zod ^3.25 + zod-to-json-schema → spike before UI. `@a2ui/agent` still 0.1.0 (no TS macros). Argon Phase 2 review → `docs/reviews/argon-phase2.md`.
- 2026-11-03: TS macros confirmed coming upstream in `@a2ui/agent` (~next week). No port; check npm `@a2ui/agent` each run and adopt when released.
- 2026-11-03: Buzz added as target (fork zeroasterisk/buzz@a2ui); CopilotKit = core team + first-class; README 4 sections.
- 2026-11-03: repos/forks created; 4 research subagents launched; principles doc (factory = workspace, not dependency).
