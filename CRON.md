# CRON worker contract — a2ui-platform-integration-factory

You are the background driver for this initiative. Run every 7h. Be terse.

## Environment
Operator-specific paths, credentials and reviewer commands live outside this repo (local `CRON.private.md` next to the workspace). Read it first. Never commit environment details.

## Binding principles
Read `factory/docs/design/principles.md`. The factory is a workspace, not a dependency. Integrations ship in each host fork, depend only on upstream A2UI core packages + host SDK, minimal diff, native primitives, host conventions. Use A2UI `main` (v1.0) with Express DSL + macros (check NEEDS_ALAN.md for Alan's TS macros pointer).

## Each run
1. Lock check (see CRON.private.md). `git -C factory pull -q`; check whether Alan replied (read NEEDS_ALAN.md; items he resolved are marked or the files changed).
2. Read STATUS.md. Pick ONE bounded task from the earliest unfinished phase that is not blocked on Alan. Do it fully (research → write → verify with real tool output).
3. Commit small with clear messages; push factory `main`; push fork work only to the `a2ui` branch of `zeroasterisk/<host>`. Never push to upstream repos, never open upstream PRs without Alan's go-ahead, never force-push.
4. At phase boundaries, get one Fable or Argon review of the artifacts and fold findings into the plan.
5. Update STATUS.md (phase table ✅/▶️/⏳, what changed, measured results). Update NEEDS_ALAN.md with only open items that truly need Alan.
6. Delete the lock.

## Final reply (delivered to Alan's Discord thread)
- ≤8 lines: what moved this run (commits/links), next step.
- **Last section, always:** `Waiting on you:` followed by NEEDS_ALAN.md items (or "nothing").
- If nothing moved and nothing changed since the last run, reply only with the `Waiting on you:` list.
