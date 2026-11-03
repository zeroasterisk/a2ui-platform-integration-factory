# Factory principles

The factory is a **workspace**, not a dependency.

1. **Nothing ships from here.** No host integration imports a factory package. Each integration lives in its host's repo/fork and reads as if the host's own team wrote it.
2. **Depend only on upstream A2UI core packages** (`@a2ui/web_core`, `@a2ui/agent`, …) plus the host's own SDK and primitives. Where a core package is missing something (e.g. RN-safe entry, TS macros), fix it upstream in A2UI. Don't vendor or wrap it here.
3. **Thin and native.** Each integration maps A2UI components onto the host's existing primitives and tokens, follows the host's conventions (file layout, docs voice, tests), and adds the smallest diff a reviewer can scan.
4. **The factory holds the repeatable *method*, not runtime code:**
   - research (OKF wiki), designs and plans
   - a conformance checklist + shared demo scripts/fixtures (Express samples) that every integration must pass
   - a per-host recipe ("adapter spec": contribution points, component mapping table, action round-trip, e2e harness)
   - review tooling (Fable / Argon prompts)
   - optionally, scaffolding that *generates* host-native code once (copied in, never imported)
5. **Escalation:** if two or more integrations need identical non-trivial code that upstream A2UI won't take, raise it as a decision (new standalone package vs upstream vs duplicate). Don't create the package by default.
