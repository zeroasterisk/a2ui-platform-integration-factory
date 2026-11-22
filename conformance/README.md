# Conformance

Shared fixtures every host integration must pass. Data only: hosts copy or replay them, never import them (principles §1, §4).

## Groups (from `docs/reviews/argon-phase5b-close.md` §5)

| Group | Dir | State |
|---|---|---|
| Wire + sentinel lexer (`splitA2uiSegments`, `a2uiActionMessage`, `a2uiActionSummary`) incl. trust cases: streaming, fenced/prose, size, action-payload spoof | `wire/` | ✅ 23 checks |
| Thread surface state machine (replay, ownership, supersede, action lock) incl. cross-agent hijack | `thread/` | ⏳ |
| Two-tier prompt (≤1 KB pointer + rules/send tools) | `prompt/` | ⏳ |
| Off-catalog component blocked with source disclosure; person-authored block → plain text | `trust/` | ⏳ |
| Visual gates (360/412, 150% text, field/card contrast, inert + dim) | `visual/` | ⏳ |

## wire/

- `lexer.json`: message text → expected segments (`kind`, `offset`, `source`, `closed`). `group` tags trust cases.
- `action.json`: action event → expected action message / summary text.
- `run.mjs`: replays both against a host module that exports the lexer API.

```bash
node --experimental-strip-types --no-warnings conformance/wire/run.mjs <host>/a2uiMessage.ts
```

Measured 2026-11-22: t3code `eeb2c3ec` 23/23, Buzz `bf2c07a` 23/23. Mutants on t3code: fence tracking off → 4 fail; `closed` forced true → 2 fail.
