## copilotkit

Reference implementation: CopilotKit @ `3a956add4` ([tree](https://github.com/CopilotKit/CopilotKit/tree/3a956add4)).

- [Architecture: two A2UI stacks](copilotkit/architecture.md): `a2ui` (web_core v0.9) vs experimental `generativeUI` (v1.0 ops, tool/markdown).
- [Catalog & theming](copilotkit/catalog-and-theming.md): `createCatalog`, `createGenerativeUI` extends/overrides/omit, `--a2ui-*` tokens.
- [Agent emission](copilotkit/agent-emission.md): ```` ```a2ui ```` fences, `render_ui`, partial-JSON repair, prompts, action round-trip.
- [Surfaces & components](copilotkit/surfaces-and-components.md): chat vs `<GenerativeUISurface>` targets, standardUI (Chart/Map/Form), no RN, demos.
- [Copy vs avoid](copilotkit/copy-vs-avoid.md): recommendations for the factory.
