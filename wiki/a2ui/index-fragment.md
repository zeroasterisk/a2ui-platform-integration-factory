## a2ui

Upstream: a2ui-project/a2ui main @ 80aaef0 (v1.0 candidate). npm checked 2026-11-03.

- [Protocol v1.0 essentials](a2ui/protocol-v1.md): message types, adjacency-list components, `@path`/`@call` binding, actions and errors, capabilities (use the key `"1.0"`).
- [Express DSL and @a2ui/agent](a2ui/express-and-agent-sdk.md): grammar, prompt contract, compiler and streaming, Node usage for chat vs canvas. v1.0 and Express both ship in npm 0.1.0. Verified end to end.
- [Macros](a2ui/macros.md): Python `MacroExpander` and `@macro` (1,044 LOC). There is **no TS equivalent**; a minimal port is about 250-300 LOC.
- [web_core in React Native](a2ui/web-core-rn-safety.md): the root, state, processing and resolution subpaths are DOM-free (verified). `/v1_0` and `/catalogs/basic/v1` pull in lit and crash.
- [@a2ui/react and the RN design](a2ui/react-renderer-and-rn-design.md): the React renderer hosts components in custom elements and so is web-only. Includes a minimal shared renderer core over web_core.
- [Catalogs](a2ui/catalogs.md): the 18 basic v1 components with props, 14 functions, and how to define custom catalogs (`catalog_definition.json`).
- [Conformance fixtures](a2ui/conformance-fixtures.md): `adapter_conformance.yaml` (13 cases) and `node_resolution.yaml` (20) as renderer acceptance tests, plus macro goldens.
- [Recommended packages](a2ui/recommended-packages.md): pins (`@a2ui/agent@0.1.0`, `@a2ui/web_core@0.15.0`), what we write ourselves, and risks.
