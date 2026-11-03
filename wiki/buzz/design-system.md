---
type: Concept
title: Buzz design system (desktop, web, mobile)
description: Tailwind v4 + shadcn/Radix tokens on desktop/web and a Material 3 ThemeData + ThemeExtension stack on Flutter mobile, plus the places an A2UI catalog maps onto.
resource: https://github.com/block/buzz/blob/ff6ab96/desktop/components.json
tags: [buzz, design-system, tailwind, shadcn, flutter, theming, a2ui]
status: draft
generated:
  by: agent:a2ui-pif-researcher/claude-opus
  at: 2026-11-03T03:25:00Z
sources:
- id: buzz-main-ff6ab96
  resource: https://github.com/block/buzz/tree/ff6ab96
---

# Surfaces and status

- `desktop/` is **legacy**: a Tauri 2 + React 19 app "being replaced by block/buzz-app" (`AGENTS.md:133`, `AGENTS.md:622-624`). AGENTS.md says it must never be used as a design reference for mobile, which is the current app (`AGENTS.md:623-624`).
- `web/` is a browser client (repo browser plus invite) served by the relay (`AGENTS.md:134`). Its features are `web/src/features/{invite,repos}`, and it does **not** render channel timelines.
- `mobile/` is the Flutter app (`AGENTS.md:135`).
- **Unknown:** block/buzz-app is not in this repo, so its design system is not visible here.

# Desktop (React)

**Stack**
- React `^19.1.0`, Radix primitives (`@radix-ui/react-*`), `class-variance-authority`, `lucide-react`, `react-markdown ^10`, `zod ^4.4.3` (`desktop/package.json:36-90`).
- Tailwind `^4.3.0` via `@tailwindcss/postcss`, Vite `^8`, Playwright `^1.58` (`desktop/package.json:94-109`).

**shadcn config** (`desktop/components.json:1-19`)
- Style `new-york`, `baseColor: zinc`, `cssVariables: true`.
- Aliases: `@/shared/ui` for components and `@/shared/lib/cn` for `cn()`.

**Primitives**
- `desktop/src/shared/ui/`: `button`, `card`, `badge`, `checkbox`, `switch`, `tabs`, `input`, `textarea`, `dialog`, `popover`, `tooltip`, `progress`, `separator`, `segmented-control`, `calendar`, `carousel`, `alert`, `avatar`, `skeleton`, `spinner`, `sonner`.
- `button.tsx:7-30` uses cva variants `default|destructive|outline|secondary|ghost|link` and sizes `default|sm|xs|lg|icon|icon-xs`.

**Tokens**
- `globals.css:1-20` runs `@import "tailwindcss"` and then imports the files in `./globals/*.css`. Line 22 has `@config "../../../tailwind.config.js"`, so v4 still reads a JS config.
- Dark mode is class-based, not system-based: `@custom-variant dark (&:where(.dark, .dark *))` (`globals.css:47`).
- `globals/theme.css` holds the HSL shadcn variables:
  - `:root` (`theme.css:2-…`): `--radius: 0.625rem`, `--background`, `--card`, `--primary: 266 85% 58%`, `--muted`, and so on.
  - `.dark` (`theme.css:68-…`).
  - Buzz sidebar gradient: `:root[data-buzz-sidebar]` (`theme.css:196-252`).

**Typography**
- `tailwind.config.js:1-40` adds rem tokens: `2xs`, `3xs`, `badge`, `message`, `message-timestamp`, `title`.
- Rule: text must use rem tokens and never `text-[13px]` or arbitrary rem literals.
- `pnpm check:px-text` (`desktop/scripts/check-px-text.mjs`) fails CI on any new arbitrary size (`AGENTS.md:633-668`). An A2UI renderer on desktop **must** follow this, e.g. map the `Text` `variant` values to `text-message`, `text-sm` and so on.

**Themes**
- `desktop/src/shared/theme/` holds `ThemeProvider.tsx`, `theme-loader.ts`, `adaptive-theme.ts`, `communityThemeSync.ts` and `terminal-palette.ts`.
- `theme-loader.ts:1-20` takes key colors from Shiki theme JSON. The first-party `buzz` theme reuses GitHub Light with a branded sidebar gradient.
- Community themes are synced across clients (`communityThemeSync.ts`). The mobile counterpart is `community_theme_sync.dart`.

**Inline card precedent**
- `desktop/src/shared/ui/config-nudge-attachment.tsx` (`ConfigNudgeCard`) is an agent-authored card built from these primitives. It is the template for an A2UI surface frame.

# Mobile (Flutter)

**Packages**
- Dart `sdk ^3.11.4`, Flutter `>=3.47.7` (`mobile/pubspec.yaml:7-8`).
- Riverpod 3 + hooks, `gpt_markdown ^1.2.1`, `highlight` (`pubspec.yaml:18-34`).
- No A2UI or genui dependency today.

**Theme files** (`mobile/lib/shared/theme/`, 21 files)
- `app_theme.dart` builds `ThemeData` for `light()` and `dark()` (`:34`, `:58`) and attaches `extensions: [appColors]` (`:97`). It also defines `Radii` with `xs 4`, `sm 6`, `md 8`, `lg 10` and `container` (`:13-21`).
- `app_colors.dart:4-10` declares `AppColors extends ThemeExtension<AppColors>` with `success`, `warning`, `accent` and huddle surfaces.
- `theme_extensions.dart:11-21` adds the `context.theme`, `context.colors`, `context.textTheme` and `context.appColors` accessors.
- `grid.dart:1-42` has the spacing tokens `Grid.half` (4), `xxs` (8), `twelve`, `xs` (16), `gutter` (20), `sm` (24), `md` (32), `lg`, `xl`, `xxl`, `xxxl`.
- `theme_catalog.dart`: Catppuccin variants and more (`:80-88`). `README.md:323-329` says the theme is "Catppuccin Latte/Macchiato — matches desktop".
- Also present: `chat_colors.dart`, `message_typography.dart`, `app_markdown_theme.dart`, `code_style.dart`, `community_theme_*`.

**Widgets**
- `mobile/lib/shared/widgets/` holds `buzz_action_tile`, `app_list_card`, `buzz_sheet_header`, `confirmation_dialog`, `filter_chip_bar`, `buzz_toast`, `frosted_*`, `ios_native_segmented_control`, and others.
- Feature isolation rule: no cross-feature imports except `shared/` (`mobile/README.md:331`).

# A2UI basic catalog → Buzz mapping

| A2UI basic | Desktop (`@/shared/ui`) | Mobile (Flutter) |
|---|---|---|
| Text | `<p className="text-message">` / Markdown | `Text` + `context.textTheme` / `message_typography` |
| Button | `Button` (variant from `primary`/`borderless`) | `FilledButton`/`TextButton` (themed in `app_theme.dart:139-160`) |
| Card | `card.tsx` | `Material` + `Radii.container` (pattern at `manage_channel_sheet.dart:357-361`) |
| CheckBox / Switch | `checkbox.tsx` / `switch.tsx` | `Checkbox` / `Switch` |
| TextField | `input.tsx` / `textarea.tsx` | `TextField` |
| Tabs | `tabs.tsx` | `ios_native_segmented_control` / `TabBar` |
| Modal | `dialog.tsx` | `showModalBottomSheet` + `buzz_sheet_header` |
| Row/Column/List | flex + `gap-*` | `Row`/`Column` + `Grid.*` gaps |
| Slider, DateTimeInput, ChoicePicker | **no primitive**: `calendar.tsx` exists; slider/select not present | Material `Slider`, `showDatePicker`, `DropdownMenu` |
| Image / Icon / Video / AudioPlayer | `<img>`, lucide, `VideoPlayer.tsx` | `Image.network`, `BuzzIcons`, `video_player`, `just_audio` |

**Unknowns**
- Whether maintainers would accept new shadcn primitives (slider, select) in legacy desktop.
- Whether buzz-app reuses these tokens.

Related: [rich content](message-model-and-rich-content.md), [integration shape](a2ui-integration-shape.md), [index](index-fragment.md)
