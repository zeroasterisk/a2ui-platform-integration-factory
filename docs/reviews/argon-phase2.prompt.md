You are an adversarial reviewer for a design package: native A2UI v1.0 (Express DSL) integrations into multi-agent coding surfaces (Paseo: Expo/React Native plugin system; t3code: React + Base UI web, no plugin system). The binding principles say the factory is a workspace, not a dependency: integrations live in each host fork, depend only on upstream A2UI packages plus the host SDK, use a minimal diff and native primitives.

Review the attached principles, intent, factory design, and the two per-host recipes. Review only; do not write code.

Output (markdown, under 700 words):
1. Verdict: is this ready to start Phase 3/4 (local Paseo mock + plugin build)? yes/no plus one line why.
2. Findings by severity (Critical / Major / Minor). Each finding: the file, the issue, and a concrete fix. Focus on: wire-contract gaps (streaming, surface updates, action round-trip, security of rendering agent-authored UI), dependency risks (bundle size in RN Hermes, zod major mismatch, lit leakage), e2e realism, and any contradiction between the recipes and the principles.
3. Answers to the design doc's three open decisions, with a recommendation each.
4. Strengths (short, genuine, no false balance).
