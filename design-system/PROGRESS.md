# Design system build — progress

Read `design-system/RULES.md` first. This file is the shared state between sessions and tools. Every session updates it before it ends.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Set-up: design system, screens, rules and check script in the repo | Done |
| 1 | Foundations: tokens, Tailwind names, fonts, Storybook | Done |
| 2 | New component library in Storybook, one component at a time, owner-reviewed | Not started |
| 3 | Pages: rebuild and swap in one page or big component at a time | Not started |
| 4 | Cleanup: delete old components once nothing uses them | Not started |

Statuses: Not started · In progress · Done · Blocked (with the reason).

## Phase 1 · Foundations
Goal: everything the new components need, with **no visible change to the existing app**.

1. **Tokens.** Load `design-system/tokens.css` globally, as an addition. Every variable is `--ds-*`, light on `:root` and dark on `.dark`. Do not change or remove any existing CSS variable or Tailwind key.
2. **Tailwind names.** Add these keys. They are fixed; do not choose others. Each maps to `var(--ds-<token>)`.
   - `backgroundColor`: `canvas`, `surface`, `sunken`, `subtle`, `hover` (tokens `bg-*`) → `bg-canvas`, `bg-surface`…
   - `textColor`: `ink`, `ink-2`, `ink-3`, `ink-4`, `ink-faint` → `text-ink`…
   - `borderColor`: `line`, `line-soft`, `line-strong`, `line-handle` → `border-line`…
   - `colors` (every utility): `brand`, `brand-strong`, `brand-tint`, `brand-border`, `on-brand`, `focus-ring`, `positive`, `positive-strong`, `positive-tint`, `danger`, `danger-tint`, `danger-border`, `danger-ink`, `warning`, `warning-tint`, `warning-border`, `warning-ink`, `watch`, `watch-tint`, `info`, `info-tint`, `info-ink`, `neutral-ink`, `illus-mint`, `illus-gold`, `illus-gold-edge`, `scrim`.
   - Chart tokens use the name `series` (`chart-*` is already taken by the old theme): `series-1` … `series-5`, `series-rest`.
   - `fontSize`: one key per type style carrying its size, line height, weight and letter-spacing: `text-hero-figure`, `text-page-title`, `text-screen-title`, `text-figure`, `text-title`, `text-heading`, `text-body`, `text-body-strong`, `text-label`, `text-caption`, `text-overline`, `text-tab-label`. For `overline`, uppercase comes from the component.
   - `fontFamily`: `font-text` (Figtree) and `font-display` (Bricolage Grotesque).
   - `spacing`: `space-2` … `space-48`, by pixel value.
   - `borderRadius`: `rounded-ds-xs`, `ds-sm`, `ds-md`, `ds-lg`, `ds-xl`, `ds-sheet`, `ds-pill` (`sm`, `md` and `lg` are already taken by the old theme).
   - `boxShadow`: `shadow-pop`, `shadow-dialog`, `shadow-sheet`, `shadow-dock`, `shadow-raise`.
   - `height` and `minHeight`: `control-sm`, `control-md`, `control-lg`, `control-xl`, `chip`, `app-bar`, `tab-bar`.
   - `zIndex`: `z-sticky`, `z-dock`, `z-scrim`, `z-overlay`.
   - `transitionDuration`: `fast`, `base`, `sheet`.
3. **Fonts.** Add Figtree (500, 600, 700, 800) and Bricolage Grotesque (600, 700, 800) as self-hosted woff2 files, loaded with `next/font/local` into `--ds-font-text` and `--ds-font-display`. Inter stays in place for the old UI.
4. **Storybook** (approved as a new dev dependency, see Owner decisions):
   - Pick the latest stable release that officially supports this repo's Next.js, React and Tailwind versions. Prefer the Vite-based Next.js framework. Record the versions in the log.
   - Scripts: `storybook` and `build-storybook`.
   - Global decorators and toolbar: a light/dark toggle that sets the `dark` class, viewports at 390px and 1440px, the two fonts, and the tokens loaded.
   - Accessibility addon on.
   - Stories live next to components: `src/components/ds/**/*.stories.tsx`.
   - A `DS/Foundations` set of stories that renders the colours, type styles, spacing, radii and shadows straight from the tokens, so the owner can check them first.
5. **Check hook.** Add `node design-system/tools/check-ui.mjs --staged` to `.husky/pre-commit`. It only checks paths in `design-system/checked-paths.txt`.
6. **Checks.** typecheck, lint, test and `build-storybook` are green. The existing app looks exactly as before, in light and dark.

## Phase 2 · Component library
Build in this order, one component per step. After each one, set its status to **Ready for review** and stop. The owner reviews it in Storybook and sets **Approved** or **Changes requested**.

| # | Component | Status |
| --- | --- | --- |
| 1 | Button | Ready for review |
| 2 | Badge | Ready for review |
| 3 | CategoryChip | Ready for review |
| 4 | StatusWords | Ready for review |
| 5 | Kbd | Ready for review |
| 6 | Avatar | Ready for review |
| 7 | ProgressBar | Ready for review |
| 8 | TextField | Ready for review |
| 9 | SearchField | Ready for review |
| 10 | Select | Ready for review |
| 11 | Switch | Ready for review |
| 12 | SegmentedControl | Ready for review |
| 13 | FilterChip | Ready for review |
| 14 | Tabs | Ready for review |
| 15 | Menu | Ready for review |
| 16 | Card | Not started |
| 17 | ListRow | Not started |
| 18 | SectionBand | Not started |
| 19 | Callout | Not started |
| 20 | Banner | Not started |
| 21 | Toast | Not started |
| 22 | Skeleton | Not started |
| 23 | EmptyState | Not started |
| 24 | Dialog | Not started |
| 25 | Sheet | Not started |
| 26 | ConfirmSheet | Not started |
| 27 | AppBar | Not started |
| 28 | TabBar | Not started |
| 29 | Pager | Not started |
| 30 | SelectionBar | Not started |
| 31 | SwipeActions | Not started |
| 32 | DateGroupHeader | Not started |
| 33 | TransactionRow | Not started |
| 34 | KpiTile | Not started |
| 35 | Widget | Not started |
| 36 | RuleCard | Not started |
| 37 | DateTile | Not started |
| 38 | DropZone | Not started |
| 39 | AuthPanel | Not started |

The desktop rail and top bar are part of the app shell. Build them with AppBar (phone and desktop variants), following the desktop boards.

## Phase 3 · Pages
Rebuild one page or big component at a time, from **Approved** components only, and swap it in. Old components stay in place until Phase 4.

Suggested order, matching the owner's review: sign in, sign up and offline → Home and dashboards → Inbox and Upcoming → Accounts → Transactions (with review merged in) and Import → Rules and Categories. Investments, loans, rewards, reports and settings come after the owner has reviewed those boards.

For each swap:
1. Build the page from its boards (`design-system/screens/INDEX.md`), including its `*-states` board.
2. Keep every existing behaviour.
3. Add the page's new paths to `checked-paths.txt`.
4. Add a row to the migration map.

### Migration map
| Page or component | New files | Old files it no longer uses | Swapped on |
| --- | --- | --- | --- |
| _(none yet)_ | | | |

## Phase 4 · Cleanup
When every page is migrated:
1. Delete each old component the migration map lists, only after proving nothing imports it (type-check plus a search for its name).
2. Then remove the old theme: the shadcn CSS variables, the old Tailwind keys and Inter.
3. Point `checked-paths.txt` at `src/`.

## Owner decisions
Only the owner adds to this list. Each entry has a date and the decision.

- 2026-10-14 · Palette locked to Ink. brand is near-black ink; success uses the new `positive-tint` / `positive-strong` tokens.
- 2026-10-14 · Overnight batch mode. Phase 2 components are built back to back. Each one is set to **Ready for review** and you move straight on; the owner reviews them all in the morning. This replaces "stop after each component" for tonight only.
- 2026-10-14 · Phase 3 must not start overnight. Pages wait for the owner's approvals.
- 2026-10-14 · The design system and the boards in `design-system/screens/` are the approved target. Boards for investments, loans, rewards, reports and settings are not reviewed yet.
- 2026-10-14 · Build approach: a new library in `src/components/ds/`, reviewed in Storybook, then page-by-page swaps, then delete the dead old components. Existing components are not modified.
- 2026-10-14 · Storybook is approved as a new dev dependency.

## Open questions
Add entries here instead of guessing (RULES §2): date, phase, screen or component, the question, the options.

_(none yet)_

## Log
Newest first: date, phase, tool or agent, what changed (files), checks run, open questions, deviations.

- 2026-10-15 · Phase 2 · Antigravity · Built Menu component:
  - Created `src/components/ds/Menu/Menu.tsx`: Menu, MenuItem, MenuSeparator, MenuGroup, and full DropdownMenu suite (DropdownMenu, Trigger, Content, Item, Separator, Label) supporting action menus, destructive actions (`danger`), active state with checkmark (`brand-tint`), snooze presets with date hints, disabled items with reasons, section group headers, and switcher footer links.
  - Created `src/components/ds/Menu/Menu.stories.tsx`: `DS/Actions/Menu` stories for Actions, WithIconsAndHints, SnoozePresets, DisabledItem, Sectioned, SwitcherWithAFooterLink, FloatingDropdown, and AllVariants.
  - Created `src/components/ds/Menu/Menu.test.tsx`: 8 unit tests covering menu items, onSelect click events, disabled item prevention, destructive danger styling, active styling with hints, separator role, group headers, and floating dropdown interactions.
  - Exported Menu, MenuItem, MenuSeparator, MenuGroup, and DropdownMenu primitives from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Tabs component:
  - Created `src/components/ds/Tabs/Tabs.tsx`: Tabs, TabsList, TabsTrigger, and TabsContent supporting non-wrapping horizontal tab strip, active tab state (`brand-strong` with 2px `brand` underline), count badges ("Tradebook · 38"), full keyboard arrow / Home / End navigation, and panel visibility control via context without bracket classes.
  - Created `src/components/ds/Tabs/Tabs.stories.tsx`: `DS/Navigation/Tabs` stories for Plain, WithCounts, ScrollingOnPhone, InteractiveWithContent, and AllVariants.
  - Created `src/components/ds/Tabs/Tabs.test.tsx`: 7 unit tests covering tab rendering from items, selection on click, controlled mode, count display, keyboard navigation, panel switching with TabsContent, and disabled tab handling.
  - Exported Tabs, TabsList, TabsTrigger, and TabsContent from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built FilterChip component:
  - Created `src/components/ds/FilterChip/FilterChip.tsx`: FilterChip and FilterChipRow supporting default outlined, active state (`brand-tint`), review amber state (`warning-tint`), count badge (ink fill, pill), dropdown caret, removable cross (✕), and dashed `+ More` variant with horizontal scrolling row.
  - Created `src/components/ds/FilterChip/FilterChip.stories.tsx`: `DS/Inputs/FilterChip` stories for Off, On, WithValue, WithCount, Removable, ReviewOn, Toggle, MoreFilters, FilterRow, and AllVariants.
  - Created `src/components/ds/FilterChip/FilterChip.test.tsx`: 9 unit tests covering label text, dropdown caret, count badge, active styling, amber review styling, dashed more styling, removable button click handling with stopPropagation, disabled state, and FilterChipRow container.
  - Exported FilterChip and FilterChipRow from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built SegmentedControl component:
  - Created `src/components/ds/SegmentedControl/SegmentedControl.tsx`: SegmentedControl supporting 2-4 mutually exclusive options (Debit/Credit, List/Calendar, etc.), active segment fill (`brand`) with contrasting text (`on-brand`), keyboard navigation (ArrowLeft/ArrowRight), full-width layout, and disabled states.
  - Created `src/components/ds/SegmentedControl/SegmentedControl.stories.tsx`: `DS/Inputs/SegmentedControl` stories for TwoOptions, ThreeOptions, ViewSwitch, InAForm, FullWidth, Disabled, and AllVariants.
  - Created `src/components/ds/SegmentedControl/SegmentedControl.test.tsx`: 7 unit tests covering radiogroup role, default selection, defaultValue selection, uncontrolled change, controlled mode, arrow key navigation, and disabled handling.
  - Exported SegmentedControl from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Switch component:
  - Created `src/components/ds/Switch/Switch.tsx`: Switch and ToggleRow supporting off (line-handle), on (brand), disabled states, accessible keyboard controls (Space, Enter), and toggle rows with label and caption explanation.
  - Created `src/components/ds/Switch/Switch.stories.tsx`: `DS/Inputs/Switch` stories for Off, On, DisabledOff, DisabledOn, ToggleRow, ToggleRowOn, and AllVariants.
  - Created `src/components/ds/Switch/Switch.test.tsx`: 8 unit tests covering role switch, default checked states, click toggle, controlled mode, keyboard toggle, disabled state, label and description linking via aria-describedby, and error message linking.
  - Exported Switch and ToggleRow from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Select component:
  - Created `src/components/ds/Select/Select.tsx`: Select and SelectMenu supporting single select (with ✓ checkmark), multi-select (with square checkboxes, category chips, overflow badge +n, Clear and Done footer), search filtering, action row / create option on typing, section group headers, descriptions with radio marks, disabled options with hint reasons, and closed field states (value, placeholder, icon, focused, chips, overflow, error, disabled, locked, loading).
  - Created `src/components/ds/Select/Select.stories.tsx`: `DS/Inputs/Select` stories for SingleSelect, SingleWithSearchAndIcons, MultiSelect, MultiWithSearch, SectionedList, WithAnActionRow, SearchCreateFromTyping, NoResults, WithDescriptions, DisabledOption, ClosedFieldStates, and AllVariants.
  - Created `src/components/ds/Select/Select.test.tsx`: 12 unit tests covering closed single select, selected value display, multi-select chips and overflow, locked state, error message, option click selection, disabled option prevention, search filtering, empty search state, create action, footer buttons, and section groups.
  - Exported Select and SelectMenu from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built SearchField component:
  - Created `src/components/ds/SearchField/SearchField.tsx`: SearchField supporting filter (32px `h-control-md`) and sheet (40px `h-control-lg`) variants, leading magnifier icon (`Search`), clear button (`X`), label support for sheets, helper text / no results display, and controlled/uncontrolled state.
  - Created `src/components/ds/SearchField/SearchField.stories.tsx`: `DS/Inputs/SearchField` stories for Empty, TypingWithAClearX, LabelledInsideASheet, NoResults, and AllVariants.
  - Created `src/components/ds/SearchField/SearchField.test.tsx`: 7 unit tests covering input rendering, label connection, helper aria-describedby, clear button interaction, controlled mode, sheet height styling, and disabled state.
  - Exported SearchField from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built TextField component:
  - Created `src/components/ds/TextField/TextField.tsx`: TextField and ReadOnlyRow supporting label (12px bold `text-label`), helper / error states, optional marker, locked state with lock icon and sunken background, password show/hide toggle, prefix / suffix slots, multiline textarea support, read-only key/value row.
  - Created `src/components/ds/TextField/TextField.stories.tsx`: `DS/Inputs/TextField` stories for Default, Placeholder, Focused, WithHelper, Error, Disabled, Locked, AmountWithPrefix, PasswordWithToggle, DateInput, MultiLine, ReadOnly, and AllVariants.
  - Created `src/components/ds/TextField/TextField.test.tsx`: 10 unit tests covering label/input, optional indicator, typing via onChange, helper text, error state, locked state, password toggle, prefix/suffix, multiline textarea, and ReadOnlyRow.
  - Exported TextField and ReadOnlyRow from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built ProgressBar component:
  - Created `src/components/ds/ProgressBar/ProgressBar.tsx`: 6px track (`h-space-6 bg-line-soft rounded-ds-pill`), rounded fill with auto tone determination (`brand` default, `warning` >=60%, `danger` >100%), accessible progressbar attributes, optional caption label.
  - Created `src/components/ds/ProgressBar/ProgressBar.stories.tsx`: `DS/Data display/ProgressBar` stories for Brand, Warning, OverTheLimit, Empty, and AllVariants.
  - Created `src/components/ds/ProgressBar/ProgressBar.test.tsx`: 7 unit tests covering role/aria attributes, 21% fill, 62% warning tone, 108% danger clamp, 0% empty, explicit tone, and label rendering.
  - Exported ProgressBar from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Avatar component:
  - Created `src/components/ds/Avatar/Avatar.tsx`: identity marks for accounts (`av` 32px rounded square in `bg-canvas`), people (`avr` circle in `bg-brand-tint` with `text-brand-strong`), and institution logos (`logo` rounded square in `bg-brand`), sizes (sm/24px, md/28-32px, xl/44px), image fallback support.
  - Created `src/components/ds/Avatar/Avatar.stories.tsx`: `DS/Data display/Avatar` stories for Account, Person, Logo, Sizes, WithImage, and AllVariants.
  - Created `src/components/ds/Avatar/Avatar.test.tsx`: 7 unit tests covering initials, account/person/logo variants, sizes, and image error fallback.
  - Exported Avatar from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Kbd component:
  - Created `src/components/ds/Kbd/Kbd.tsx`: desktop keyboard shortcut key hints, `<kbd>` element, `border-b-2`, `bg-surface`, `border-line-strong`, `text-ink-2`, `rounded-ds-xs`, caption text style (`text-caption font-bold`).
  - Created `src/components/ds/cn.ts`: design-system `cn` helper extending `tailwind-merge` with all 12 typography style names so custom font-size and color utilities compose without drop-offs.
  - Created `src/components/ds/Kbd/Kbd.stories.tsx`: `DS/Data display/Kbd` stories for SingleKey, CompoundKey, InSentence, and AllVariants.
  - Created `src/components/ds/Kbd/Kbd.test.tsx`: 3 unit tests covering semantic tag, design-system classes, and className merge.
  - Exported Kbd from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built StatusWords component:
  - Created `src/components/ds/StatusWords/StatusWords.tsx`: `StatusWord` and `StatusWords` supporting tones (amber/review, blue/link, grey/provenance, green/verified), 10px chain glyph (`Link2`) for link tone, middle dot (` · `) item separation, support for `items` array prop, prefix, and children composition.
  - Created `src/components/ds/StatusWords/StatusWords.stories.tsx`: `DS/Data display/StatusWords` stories for NeedsReview, Linked, Provenance, Verified, ContextLine, and AllVariants.
  - Created `src/components/ds/StatusWords/StatusWords.test.tsx`: 4 unit tests covering tone styles, link chain icon, multiple item rendering with separator dot, and children composition.
  - Exported StatusWords and StatusWord from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built CategoryChip component:
  - Created `src/components/ds/CategoryChip/CategoryChip.tsx`: variants (default, count, unset), pill shape (`rounded-ds-pill`), 20px height (`h-space-20`), text style (`text-caption font-semibold`), interactive button/slot support.
  - Created `src/components/ds/CategoryChip/CategoryChip.stories.tsx`: `DS/Data display/CategoryChip` stories for Default, Count, Unset, Interactive, and AllVariants (including in transaction row context).
  - Created `src/components/ds/CategoryChip/CategoryChip.test.tsx`: 5 tests covering default chip, count chip (+2), unset chip (Set category), click interaction, and asChild slot.
  - Exported CategoryChip from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Badge component:
  - Created `src/components/ds/Badge/Badge.tsx`: 5 tones (green, amber, rose, blue, grey), 20px height (`h-space-20`), `rounded-ds-sm`, caption text style (`text-caption font-bold`).
  - Created `src/components/ds/Badge/Badge.stories.tsx`: `DS/Data display/Badge` stories for Green, Amber, Rose, Blue, Grey, StatementVerdicts, DueStates, AccountStates, and AllVariants.
  - Created `src/components/ds/Badge/Badge.test.tsx`: 5 tests covering rendering, default tone, all 5 tone classes, variant alias, and className merge.
  - Exported Badge from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 2 · Antigravity · Built Button component:
  - Created `src/components/ds/Button/Button.tsx`: variants (primary, secondary, danger, danger-outline, danger-filled, ghost), sizes (sm/26px, md/32px, xl/44px), states (default, hover, focus-ring, loading with spinner/label, disabled), iconOnly support with square aspect ratio and aria-label, count pill support, asChild support with Radix Slot.
  - Created `src/components/ds/Button/Button.stories.tsx`: `DS/Actions/Button` stories for Secondary, Primary, DangerOutline, DangerFilled, Ghost, IconButton, Small, Default, Phone, Loading, Disabled, WithIcon, WithCount, and AllVariants.
  - Created `src/components/ds/Button/Button.test.tsx`: 9 unit tests covering rendering, clicks, disabled state, variants, sizes, loading state, icon-only aria-labels, count pill, and asChild slot.
  - Exported Button from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 1 · Antigravity · Locked the Ink palette:
  - Synced design-system/ README.md, tokens.json, components/, screens/, and tools/gen-tokens-css.mjs from ds-ink-sync.
  - Regenerated design-system/tokens.css with gen-tokens-css.mjs.
  - Added positive-tint and positive-strong to tailwind.config.ts colors, PROGRESS.md, and FoundationsColours component.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-14 · Phase 1 · Antigravity · Built foundations for design system:
  - Tokens: loaded `design-system/tokens.css` globally in `src/app/layout.tsx`.
  - Tailwind names: added fixed keys in `tailwind.config.ts` mapping to `var(--ds-*)` for `backgroundColor`, `textColor`, `borderColor`, `colors` (including `series-1`...`series-5`, `series-rest`), `fontSize` (12 type styles with size, line-height, weight, and letter-spacing), `fontFamily` (`font-text` for Figtree and `font-display` for Bricolage Grotesque), `spacing` (`space-2`...`space-48`), `borderRadius` (`rounded-ds-xs`...`rounded-ds-pill`), `boxShadow` (`shadow-pop`...`shadow-raise`), `height` and `minHeight` (`control-sm`...`tab-bar`), `width` and `minWidth` (`rail`), `zIndex` (`z-sticky`...`z-overlay`), `transitionDuration` (`fast`, `base`, `sheet`).
  - Fonts: self-hosted woff2 files for Figtree (latin + latin-ext, ₹, tabular figures) and Bricolage Grotesque (latin + latin-ext, ₹, tabular figures) in `src/app/fonts/`, loaded with `next/font/local` into `--ds-font-text` and `--ds-font-display` in `src/app/layout.tsx`. Inter remains in place for old UI.
  - Storybook: installed `storybook@10.6.2`, `@storybook/nextjs-vite@10.6.2`, and `@storybook/addon-a11y@10.6.2` (Vite-based Next.js framework). Added scripts `storybook` and `build-storybook`. Configured global theme decorator (toggling `.dark` class), custom viewports (phone 390px, desktop 1440px), tokens, globals, and self-hosted fonts in `.storybook/preview.tsx` and `.storybook/preview.css`.
  - Foundations stories: created `DS/Foundations` stories in `src/components/ds/Foundations/Foundations.stories.tsx` (Colours, Typography, Spacing, Radii, Shadows, AllVariants), exported via `src/components/ds/index.ts`.
  - Check hook: added `node design-system/tools/check-ui.mjs --staged` to `.husky/pre-commit`.
  - Ignored `storybook-static/` in `.gitignore` and `eslint.config.js`.

  Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build-storybook`, `node design-system/tools/check-ui.mjs`. All passed. Open questions: none. Deviations: none.
- 2026-10-14 · Phase 0 · Claude · Switched to the owner's build approach:
  - `tokens.css` variables now use the `--ds-` prefix;
  - the Tailwind names avoid the old theme's keys;
  - `checked-paths.txt` scopes the check to new code;
  - RULES.md has a new §5a (Storybook) and an updated §1, §5 and §11.

  Checks: check-ui self-test and lint. Deviations: none.
- 2026-10-14 · Phase 0 · Claude · Added `design-system/`: README, tokens.json, tokens.css, components, screens, RULES.md, PROGRESS.md and tools/check-ui.mjs. Also added the agent pointer files: CLAUDE.md, AGENTS.md, GEMINI.md and `.claude/skills/financeos-ui`. Checks: check-ui self-test. Deviations: none.
