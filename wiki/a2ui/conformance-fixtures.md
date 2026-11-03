---
type: Guide
title: A2UI conformance suites as test fixtures
description: Which language-agnostic YAML suites in conformance/ a native A2UI renderer or Express/macro pipeline can reuse, and how.
resource: https://github.com/a2ui-project/a2ui/tree/80aaef0/conformance
tags: [a2ui, conformance, testing, fixtures, renderer]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:08:00Z
sources:
- id: a2ui-main-80aaef0
  resource: https://github.com/a2ui-project/a2ui/tree/80aaef0
---

# Conformance fixtures

`conformance/` is a language-agnostic YAML suite, validated by `conformance_schema.json`. Each case has a `name`, `action` and steps, and the runner gates cases by `protocolVersion` (`README.md:1-80`). Harnesses must declare `SUPPORTED_PROTOCOL_VERSIONS` and `SKIP_TEST_NAMES` (`README.md:99-105`). Catalogs are referenced by repo path (`catalogPaths: ["catalogs/basic/v1/catalog.json"]`), so vendor the needed catalog JSON along with the suites.

## Highest value for a native (RN / web) renderer
| Suite | Cases | Action | What it checks |
|---|---|---|---|
| `core/adapter_conformance.yaml` (666 lines) | 13 | `render_surface` | Renderer-level behaviour (listed below). Assertions use `expectViewTree` `{id, type, text, children}`, `expectDataModel` and expected actions. The supported ops are `process_messages`, `user_input`, `user_gesture`, `programmatic_invoke` and `unmount_surface`. |
| `core/node_resolution.yaml` (804 lines; format in `core/node_resolution.md`) | 20 | `resolve_nodes` | The `NodeResolver` / `ComponentNode` behaviour web_core gives you: scoped binding writes, templates, placeholders, out-of-order streaming before `root`, reordering that preserves identity, cycles, metadata, and disposal on `deleteSurface` |
| `core/message_processor_v1_0.yaml` (3,246 lines) | 72 | `process_messages` | The processor state machine. Use this if you wrap or replace MessageProcessor. |
| `core/actions.yaml` | 18 | `dispatch_action` | Outbound `action` payloads |
| `core/accessibility.yaml` | 6 | `accessibility_check` | `label`/`description`/`live`/`hidden`, static and bound |
| `core/error_responses.yaml` | 23 + 1 | `validate` | Renderer→agent `error` payloads |
| `core/functions.yaml`, `expressions.yaml`, `index_function.yaml` | 73 / 92 | `evaluate_function`, `parse_expression_template` | Basic functions and `formatString` parsing. Use these if you vendor `basic_functions`. |
| `core/validator_v1_0.yaml` | (part of 145 `validate`) | `validate` | Schema, duplicate ids, missing root, dangling refs, cycles, depth |

The 13 cases in `adapter_conformance.yaml`, with their line numbers:
- `tree_hierarchy_declared_order` (:19)
- `single_message_v10_surface_render` (:83)
- `progressive_arrival_placeholder_upgrade_in_place` (:116)
- `dynamic_repeater_list_insert_delete_reorder_and_index` (:159)
- `two_way_binding_control_write_updates_dependents` (:243)
- `action_execution_event_vs_local_function_call` (:297)
- `user_activation_gated_function_gesture_vs_programmatic` (:358)
- `multi_catalog_mixed_surface_rendering` (:396)
- `validation_results_error_disables_warning_allows` (:443)
- `accessibility_attributes_and_implicit_label_override` (:507)
- `v10_theme_ignored_parity` (:568)
- `fallback_states_unknown_type_and_cyclic_diagnostics` (:596)
- `teardown_unmount_releases_subscriptions` (:635)

**Recommendation:** port `adapter_conformance.yaml` as the acceptance suite for the RN and web renderers. Build `expectViewTree` from the rendered tree: on RN, walk react-test-renderer output using `testID = component id`. On web, use DOM `data-id`. Existing harnesses to copy from:
- React: `typescript/renderers/react/tests/adapter_conformance.test.tsx` (805 lines, vitest with js-yaml and @testing-library/react; it loads `CONFORMANCE_DIR` from `:43`).
- Others: Flutter `dart/a2ui_flutter/test/adapter_conformance_test.dart` and SwiftUI `swift/swiftui/Tests/.../AdapterConformanceTests.swift` (`README.md:93-95`). Both are native, non-DOM renderers, so they make good models for RN.

## For the agent / Express / macro side
- `agent/express/compiler.yaml` (2,207 lines), `decompiler.yaml`, `prompt_generator.yaml`, `response_parser.yaml`, `response_streaming.yaml` and `scaling.yaml`. These already pass in `@a2ui/agent` (`typescript/agents/a2ui_agent/tests/conformance/`), so you only need them if you fork the SDK. Compiler cases run against `test_data/catalogs/simplified_catalog_v1_0.json` (`compiler.yaml:102-126`).
- `agent/catalog_resolution.yaml` covers capability negotiation, and `agent/catalog_transformer.yaml` covers pruning.
- `agent/macros/macros.yaml` plus `golden/*.json` give 10 golden expansions, made of macros declared as AST templates and the expected flattened output. **These are v0.9 envelopes** (`macros.yaml:2`). Use them for a TS macro port, as described in [macros](macros.md).
- `agent/streamed_answer.yaml` covers the case where the agent and renderer are the same app.

## Practical notes
- The YAML loader needs `js-yaml` or equivalent. Each case carries its own messages inline, with no external fixtures, apart from `test_data/` catalogs, examples and prompts.
- `test_data/examples/greeting_surface.json` and `chart_series.json` are small sample surfaces.
- In CI, setting `A2UI_CONFORMANCE_MANIFEST_DIR` makes each harness write JSONL records of the cases it executed (`README.md:106`). This is optional.

Related: [web_core](web-core-rn-safety.md) · [RN design](react-renderer-and-rn-design.md) · [protocol](protocol-v1.md)
