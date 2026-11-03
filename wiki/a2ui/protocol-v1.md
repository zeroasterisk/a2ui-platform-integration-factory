---
type: Concept
title: A2UI v1.0 protocol essentials
description: Wire messages, data binding, actions, functions and capability negotiation in A2UI v1.0 (main @ 80aaef0).
resource: https://github.com/a2ui-project/a2ui/blob/80aaef0/specification/v1_0/docs/a2ui_protocol.md
tags: [a2ui, protocol, v1.0, spec, renderer]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:52:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# A2UI v1.0 protocol essentials

The spec lives at `specification/v1_0/docs/a2ui_protocol.md`, with JSON Schemas in `specification/v1_0/json/`. In this page, `P:<line>` means a line in `a2ui_protocol.md`. Every message is an envelope that carries `"version": "1.0"` and exactly one message key.

## What changed from v0.9 (P:33-43)
- **Bidirectional function calls.** v1.0 adds `callRendererFunction`, `callAgentFunction`, `rendererFunctionResponse` and `agentFunctionResponse`.
- **Single-message UI.** `createSurface` can embed `components` and `dataModel`.
- **No `theme`.** A v1.0 `createSurface` that carries `theme` is invalid, and styling is left to the host's native theme. This fits native look-and-feel.
- **Catalog changes.** Functions are now an object map, and entity names must be UAX #31 identifiers.
- **`@` namespace.** `@path`, `@call` and `@index` are reserved (P:1255-1262). Literal `@` keys are escaped by doubling them (`@@path`).

## Agent → renderer messages (P:170-420, `json/agent_to_renderer.json`)
| Message | Key fields | Notes |
|---|---|---|
| `createSurface` (P:174) | `surfaceId`, `catalogId?`, `sendDataModel?`, `components?`, `dataModel?`, `metadata?` | Re-creating an existing id is an `INTEGRITY_ERROR`. `dataModel` is applied before `components`. Creating the surface also creates an implicit `Surface` container with `child: "root"`. |
| `updateComponents` (P:221) | `surfaceId`, `components[]` | A flat adjacency list that upserts by `id`. |
| `updateDataModel` (P:258) | `surfaceId`, `path?` (JSON Pointer, default `/`), `value` | `value: null` deletes the key. |
| `deleteSurface` (P:281) | `surfaceId` | |
| `callRendererFunction` (P:300) | `functionCallId`, `callFunction{@call, catalogId, args}`, `surfaceId?` | Only functions with `allowedCallers` set to `agentOnly` or `rendererOrAgent` can be called. With no `surfaceId`, the call runs against an empty data model. |
| `agentFunctionResponse` (P:378) | reply to `callAgentFunction` | |

Envelopes are dispatched in arrival order. Surface mutations take effect before a later function call (P:318).

## Component model (P:493-860)
- A component is `{id, component, catalogId?, ...props}` (P:497). The `id` must be a UAX #31 identifier, so `user-card` is invalid.
- **Adjacency list** (P:778). Components can arrive in any order. Exactly one has `id: "root"`, and nothing renders until it arrives. Children are referenced as `Child` (a single id) or `ChildList`, which is either an id array or a template `{path, componentId}`.
- **Catalog resolution** (P:508-519). A component-level `catalogId` wins, then the surface's default `catalogId`, otherwise it is an error. There is **no fallback** to the catalogs listed in the renderer's capabilities.
- Accessibility attributes are catalog-agnostic (P:521): `label`, `description`, `live` and `hidden`, via `common_types.json#/$defs/AccessibilityAttributes`.

## Data binding (P:906-1100)
- A dynamic value is a literal, `{"@path": "/abs"}`, `{"@path": "rel"}` or `{"@call": fn, args}`. The JSON Schema types are `DynamicString`, `DynamicNumber`, `DynamicBoolean`, `DynamicStringList` and `DynamicValue` (`common_types.json`).
- Absolute paths (starting with `/`) resolve from the root (P:916). Inside a `ChildList` template, relative paths resolve against the current item (P:922). Paths may be `undefined` while data is still streaming in, and renderers must handle that (P:912).
- **Two-way binding** (P:985). Input components such as `TextField.value` write back to the bound path, and dependent components re-render reactively.
- When `sendDataModel` is true, the renderer attaches the whole data model to every outbound message in transport metadata, as `a2uiRendererDataModel` with shape `{version, surfaces{}}` (P:1635).

## Actions and renderer → agent messages (P:861-905, P:1435-1576)
- `action.event {name, context?, userMessage?}` sends an `action` message to the agent.
- `action.functionCall {@call, args}` runs a function locally.
- Functions with `requiresUserActivation` (for example `openUrl`) must be `rendererOnly` and may run only from a user gesture (P:330-336).
- Outbound messages (`json/renderer_to_agent.json`):
  - `action` (P:1439): `{name, surfaceId, sourceComponentId, timestamp, context, userMessage?, metadata?}`.
  - `callAgentFunction` (P:1471).
  - `rendererFunctionResponse` (P:1513).
  - `error` (P:1553): `{code, message, surfaceId? | functionCallId?}`. Example codes are `VALIDATION_FAILED`, `INTEGRITY_ERROR` and `INVALID_FUNCTION_CALL`.

## Validation and checks (P:1103-1227)
Components that are `Checkable`, such as `Button` and `TextField`, take `checks: [{condition: DynamicBoolean | FunctionCall, message}]`. Validation functions return a `ValidationResult` (P:1117). A failing check on a Button disables it (P:1180).

## Capabilities (P:1609-1660)
Capabilities travel in **transport metadata or a handshake**. They are not A2UI messages.
- **Agent:** `{"1.0": {supportedCatalogIds?, acceptsInlineCatalogs?}}` (`json/agent_capabilities.json`).
- **Renderer:** `a2uiRendererCapabilities = {"1.0": {supportedCatalogIds: [...], inlineCatalogs?: [catalog_definition]}}` (`json/renderer_capabilities.json`). Capabilities sent with a message apply to that turn only. Omitting them withdraws A2UI for the turn (P:1625).
- **Extensions:** `metadata.extensions` is the only escape hatch, because v1.0 schemas use `additionalProperties: false` (P:1644).
- In the TS agent SDK, the capability key is the version string returned by `toWireProtocolVersion`, which is `'1.0'` for v1.0 (`typescript/agents/a2ui_agent/src/utils/catalog-resolver.ts:33-36`). The README example uses the key `v1_0` (`typescript/agents/a2ui_agent/README.md:20`), but **that key throws at runtime**. I checked against @a2ui/agent 0.1.0: `{v1_0: …}` and `{"v1.0": …}` are rejected with "no '1.0' entry", while `{"1.0": …}` and a bare `{supportedCatalogIds}` both work (catalog-resolver.ts:44-50). **Use `"1.0"`.**

## Transports (P:81-118, P:421-480)
Bindings exist for AG-UI, A2A and MCP, plus "other". The spec describes two interaction patterns: request/response (HTTP) and bidirectional streaming. The A2A extension spec is under `specification/v1_0/extensions/a2a/`.

Related: [catalogs](catalogs.md) · [web_core RN safety](web-core-rn-safety.md) · [conformance fixtures](conformance-fixtures.md)
