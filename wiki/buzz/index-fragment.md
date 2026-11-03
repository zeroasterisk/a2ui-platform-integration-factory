---
okf_version: "0.2"
type: Index
title: buzz section index fragment
description: Pages on integrating A2UI generative UI natively into block/buzz @ ff6ab96 (relay, legacy Tauri desktop, Flutter mobile, ACP agents).
resource: https://github.com/block/buzz/tree/ff6ab96
tags: [buzz, index]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

## buzz

- [Recommended A2UI integration shape](./a2ui-integration-shape.md): fenced ```a2ui blocks in agent-signed kind:9 messages and canvases; actions return as p-tagged thread replies. Includes the exact PR file lists for desktop and mobile.
- [Extension points](./extension-points.md): Buzz has no plugin system; this page ranks the seams. The config-nudge sentinel is the precedent, preview-features.json is the gate, and canvas is a markdown seam.
- [Message model and rich content](./message-model-and-rich-content.md): the kind registry, the end-to-end trace of the diff kind 40008, and how canvas, workflows, PRs and attachments render.
- [Agent posting and actions](./agent-posting-and-actions.md): buzz-acp plus the buzz CLI write path, the wake kinds, why reactions don't wake agents, and goose's role.
- [Design system](./design-system.md): Tailwind v4 + shadcn new-york with zinc HSL tokens, rem-only text, and Flutter ThemeData/AppColors/Grid/Radii. Maps the A2UI basic catalog to Buzz components.
- [Local dev and e2e](./local-dev-and-e2e.md): the mock-bridge Playwright smoke suite with a ready "agent posts a card" spec to copy, plus docker/relay setup, CLI-as-fake-agent, and the scripted ACP agent.
- [Contribution standards](./contribution-standards.md): open an issue first, DCO, Conventional Commits, `just ci`, the file-size gate (markdown.tsx is over its cap), and the review-proven rules.
