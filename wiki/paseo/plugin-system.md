---
type: Concept
title: Paseo plugin system architecture
description: Plugin layout, runtimes, compiler, host-provided modules, npm dependency rules, sources and lifecycle.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/docs/plugins.md
tags: [paseo, plugins, architecture, bundling]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Paseo plugin system

## Shape
- Two runtime entries. `index.client.tsx` runs in the Paseo app on each client and receives `PluginClientContext`. `index.server.ts` runs in a daemon subprocess and receives `PluginServerContext`. At least one is required (public-docs/plugins/reference.md:129-137).
- Other modules must live in `client/`, `server/`, or `shared/`. A module at the root is a compile error (reference.md:146-153; docs/plugins.md:240-249).
- Manifest `paseo-plugin.json` fields: `id`, `name`, `description`, `icon` (PNG), `media`, `requirements` (e.g. `{"paseo": ">=0.13.0"}`), `build` (packages/server/src/server/plugins/manifest.ts:25-37). There is no skills or MCP field.
- Each entry default-exports `contribute(ctx)` and returns cleanup (docs/plugins.md:305-343).

## SDK entries and import boundaries
docs/plugins.md:270-277: `@getpaseo/plugin` is shared (schemas, `defineRpc`). `/server` holds contexts, `defineAgentTool`, and hooks. `/client` holds contexts, `usePaseo`, `useRpc`, and `useSubscription`. `/client/ui` holds host components. `/client/host` is private to the app. The compiler rejects cross-runtime imports, React in server code, Node in client code, and shared→runtime imports (docs/plugins.md:290-296).

## Compiler (daemon side)
- esbuild, `bundle: true`, `format: cjs`, `jsx: automatic`, `.svg` loaded as text. Client target is `neutral`/es2020 with `mainFields: ["module","main"]` and async-await lowered for Hermes. Server target is node20 (packages/server/src/server/plugins/compiler-build.ts:346-366).
- **Externals.** Client: SDK specifiers + `@tanstack/react-query`, `react`, `react/jsx-runtime`, `react-native`, `zod`. Server: SDK specifiers + `zod` (compiler-build.ts:367-377; compiler-esbuild.ts:6; plugin-sdk-specifiers.ts:1-20). **Everything else is bundled into the plugin bundle.** The client bundle is minified (compiler-build.ts:389).
- At runtime the app evaluator resolves only those host modules and throws `Module "<name>" is not available in plugin client code` for anything else (packages/app/src/plugins/evaluate.ts:516-533; reference.md:240-259).
- Do not import `lucide-react-native`, `react-native-svg`, or DOM libraries (reference.md:261).

## Can a plugin use npm deps (e.g. `@a2ui/web_core`)?
- **Directory/npm/Git plugins: yes, bundled.** `markdown-panel` lists five `@codemirror/*` packages as `dependencies` (plugin-examples/markdown-panel/package.json:6-12). Its README says "Paseo bundles the editor dependencies into this plugin" (README.md:21-22). The user runs `npm install` before `paseo plugin install` (README.md:3-9).
- Publishing: host libraries go in `devDependencies` and runtime libs in `dependencies` with `npm-shrinkwrap.json`. Alternatively bundle the lib and drop the dependency (public-docs/plugins/publishing.md:137-158). Git sources may declare `build: [["npm","ci"],…]` argv arrays (docs/plugins.md:202-224).
- **Built-in plugins (`plugins/<id>/`): no.** They "can import only host modules (`@getpaseo/plugin/*`, `zod`) and Node built-ins" (docs/plugins.md:107-112). They need registration in `packages/server/src/server/plugins/builtin/index.ts` (docs/plugins.md:97-100).
- Caveat: a bundled dep must run in Hermes/RN (no DOM, ES2020). A pure-TS A2UI core (message parsing, data model, JSON pointer) is fine. Any web-components or Lit renderer is not.

## Sources and lifecycle
- `paseo plugin init|install <abs dir>|ls`; the daemon config needs `pluginsEnabled: true` (docs/plugins.md:9-30). Other sources: registry and Git (docs/plugins.md:134-200). npm publishing is at reference.md:2595.
- Each server subprocess owns a `plugin:<id>` session (docs/plugins.md:400-404). Client bundles are cached per host by SHA-256 (docs/plugins.md:406-413).
- RPC/subscription payloads are Zod-validated on both sides. `usePaseo()` and server `{ paseo }` expose the same `PaseoApi` (docs/plugins.md:360-392).
- Logs: `paseo plugin logs <id>` (docs/plugins.md:228-235).

Related: [plugin-client-contracts](plugin-client-contracts.md), [plugin-server-contracts](plugin-server-contracts.md), [plugin-examples](plugin-examples.md).
