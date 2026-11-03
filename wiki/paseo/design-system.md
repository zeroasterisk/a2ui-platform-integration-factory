---
type: Concept
title: Paseo design system and what plugins can reach
description: Theme tokens, UI primitives, and the narrow theme DTO / host UI that plugin components receive.
resource: https://github.com/getpaseo/paseo/blob/3857ed3/docs/design.md
tags: [paseo, design-system, theme, plugins]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T02:48:00Z
sources:
- id: paseo-main-3857ed3
  resource: https://github.com/getpaseo/paseo/tree/3857ed3
---

# Paseo design system (for A2UI rendering)

## App-internal design system
- Tokens live in `packages/app/src/styles/theme.ts` (docs/design.md:3). Scales: `SPACING` 0–128 px (theme.ts:560-575), `FONT_SIZE` code/content/sm/base/lg/xl… (theme.ts:577-587), `ICON_SIZE` (theme.ts:593-598), `FONT_WEIGHT` normal/500/600/bold (theme.ts:602-607), `BORDER_RADIUS` none…full (theme.ts:609-618).
- Character: "minimal, spacious, quiet, confident" (docs/design.md:9). Consistency via component reuse; primitives live in `packages/app/src/components/ui/` (docs/design.md:21). `<Button>` (5 variants, docs/design.md:53-60), `<StatusBadge>`, `<DropdownMenu>`, `<PressHighlight>`, `<LoadingSpinner>`, `<AdaptiveModalSheet>` are canonical (docs/design.md:23, 252-271).
- Hierarchy via weight and `foreground` vs `foregroundMuted`, not size (docs/design.md:31). One accent CTA per surface (docs/design.md:47).
- Forbidden list (docs/design.md:252-271): raw `Pressable` outside `components/ui/`, hex outside palette, spacing off-scale, `ActivityIndicator`, raw DOM without `isWeb` guard, `onPointerEnter`.
- Styling uses Unistyles v3 `StyleSheet.create((theme) => …)`; `useUnistyles()` is banned (docs/unistyles.md:7-19).

None of these primitives or tokens are exported to plugins. Plugin code cannot import `@/styles/theme` or `components/ui`; the client runtime only resolves a fixed module list ([plugin-system](plugin-system.md)).

## What plugins get
### Theme DTO
`PluginTheme` has only 11 colors: `surface0/1/2`, `border`, `foreground`, `foregroundMuted`, `accent`, `accentForeground`, `statusSuccess/Warning/Danger` (packages/plugin/src/contracts.ts:6-20). The app maps it from the real theme in `toPluginTheme` (packages/app/src/plugins/theme.ts:4-20). No spacing, font, or radius tokens are passed.

Every plugin component gets `PluginHostProps`: `theme`, `host {id,label}`, `layout {compact, platform: ios|android|web}` (packages/plugin/src/client/contracts.ts:30-40). Panels also get optional `navigation` (contracts.ts:42-57). The usage table is at public-docs/plugins/reference.md:1223-1247. It says to recreate styles when `theme` or `layout.compact` changes, and never to hardcode `#000`/`#fff`.

### Host UI (`@getpaseo/plugin/client/ui`)
Declared in packages/plugin/src/client/ui.ts:
- `Icon` (Lucide name or PluginIcon), `Modal` + `Modal.Content`, `useToast` (ui.ts:24-64)
- `StreamedText`: paced assistant typography (ui.ts:65-70)
- `ScrollView`, `FlatList`, `TextInput`, `copyText` (ui.ts:75-87)
- `SettingsGroup/Section/Card/Row/Switch/Select/Input/Action` (ui.ts:89-144)
- `ExternalLink`, `SidebarRow`, `SidebarSeparator`, `Loading`, `DocumentFrame` (ui.ts:146-180)
- `Markdown` (themed, ui.ts:182-187)

There is no exported `Button`, `StatusBadge`, `Card`, chip, or spacing scale. An A2UI catalog in a plugin must compose `react-native` primitives (`View`, `Text`, `Pressable`, `TextInput`) with `theme.colors`, and mirror spacing values by hand (e.g. the 4/8/12/16 steps of `SPACING`).

### Cross-platform rules for plugin UI
public-docs/plugins/reference.md:263-277: use RN `View/Text/Pressable/ScrollView/TextInput` and never HTML elements. Styles come from `theme.colors` and `layout.compact`. Use `onPress`, never `onClick`. No `window`/`document` in components. Scaffold tsconfig omits `"DOM"` (docs/plugins.md:298-303). Web-only APIs go in `client/web.ts` behind `Platform.OS === "web"`.

## Implications for A2UI
- Map A2UI basic catalog components (Text, Row, Column, Card, Button, TextField, CheckBox, Image, Divider…) to RN primitives styled with `PluginTheme`. Use `Markdown`/`StreamedText` for rich text, `Icon` for icons, and `TextInput` from client/ui.
- Fidelity limit: plugin components can't use `<Button>` or `<StatusBadge>`. A core PR exporting more primitives would need a Discussion first (CONTRIBUTING.md:23).
- See [plugin-client-contracts](plugin-client-contracts.md) and [a2ui-integration](a2ui-integration.md).
