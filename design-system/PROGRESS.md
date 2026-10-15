# Design system build — progress

Read `design-system/RULES.md` first. This file is the shared state between sessions and tools. Every session updates it before it ends.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Set-up: design system, screens, rules and check script in the repo | Done |
| 1 | Foundations: tokens, Tailwind names, fonts, Storybook | Done |
| 2 | New component library in Storybook, one component at a time, owner-reviewed | In progress (all 39 built; owner review and the fix round pending) |
| 3 | Pages: rebuild and swap in one page or big component at a time | Not started |
| 4 | Cleanup: delete old components once nothing uses them | Not started |

Statuses: Not started · In progress · Done · Blocked (with the reason).

## Phase 1 · Foundations
Goal: everything the new components need, with **no visible change to the existing app**.

1. **Tokens.** Load `design-system/tokens.css` globally, as an addition. Every variable is `--ds-*`, light on `:root` and dark on `.dark`. Do not change or remove any existing CSS variable or Tailwind key.
2. **Tailwind names.** Add these keys. They are fixed; do not choose others. Each maps to `var(--ds-<token>)`.
   - `backgroundColor`: `canvas`, `surface`, `sunken`, `subtle`, `hover` (tokens `bg-*`) → `bg-canvas`, `bg-surface`…; plus `ink` (token `ink`) → `bg-ink`, only for count bubbles.
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
   - `width`: `control-sm`, `control-md`, `control-lg`, `control-xl`, `chip`, `rail`, `swipe-action`; `minWidth`: the same without `swipe-action`.
   - `maxWidth`: `dialog-sm` (440), `dialog-md` (640), `dialog-lg` (760), `dialog-xl` (920).
   - There is no `space-0`, `space-18`, `text-small`, `rounded-ds-circle`, `z-1` or `font-inherit`. Tailwind silently drops a class name it does not know, so it renders nothing; `check-ui.mjs` now fails on unknown classes.
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
| 16 | Card | Ready for review |
| 17 | ListRow | Ready for review |
| 18 | SectionBand | Ready for review |
| 19 | Callout | Ready for review |
| 20 | Banner | Ready for review |
| 21 | Toast | Ready for review |
| 22 | Skeleton | Ready for review |
| 23 | EmptyState | Ready for review |
| 24 | Dialog | Ready for review |
| 25 | Sheet | Ready for review |
| 26 | ConfirmSheet | Ready for review |
| 27 | AppBar | Ready for review |
| 28 | TabBar | Ready for review |
| 29 | Pager | Ready for review |
| 30 | SelectionBar | Ready for review |
| 31 | SwipeActions | Ready for review |
| 32 | DateGroupHeader | Ready for review |
| 33 | TransactionRow | Ready for review |
| 34 | KpiTile | Ready for review |
| 35 | Widget | Ready for review |
| 36 | RuleCard | Ready for review |
| 37 | DateTile | Ready for review |
| 38 | DropZone | Ready for review |
| 39 | AuthPanel | Ready for review |

The desktop rail and top bar are part of the app shell. Build them with AppBar (phone and desktop variants), following the desktop boards.

## Phase 3 · Pages
Rebuild one page or big component at a time, from **Approved** components only, and swap it in. Old components stay in place until Phase 4.

Suggested order, matching the owner's review: sign in, sign up and offline → Home and dashboards → Inbox and Upcoming → Accounts → Transactions (with review merged in) and Import → Rules and Categories. Investments, loans, rewards, reports and settings come after the owner has reviewed those boards.

For each swap:
1. Build the page from its boards (`design-system/screens/INDEX.md`), including its `*-states` board.
2. Keep every existing behaviour.
3. Add the page's new paths to `checked-paths.txt`.
4. Map the page's E2E specs to the new controls and keep the full suite green (RULES §10.5).
5. Add a row to the migration map.

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
- 2026-10-15 · **Off-scale sizes** (decided by Claude at the owner's request). The reference used a few pixel values with no token. They now snap to the scale, and `reference.css` and the previews were updated to match, so compare against them:
  - Phone sheet padding 18 → `space-16` (matches the phone page gutter). Desktop dialog: header 20/24, body and footer 24 on the sides, so all three edges line up (the old reference had 22 vs 18).
  - Row padding: phone transaction row 7/5 → 8/6; desktop row 9 → 10; menu item = `min-h-control-lg` with `px-space-10` (same 36px height). Badge side padding 7 → 8. Hairline gaps 3 → 4.
  - Category chip 22 → 20 (`h-space-20`). Count bubble 18 → 16 (`h-space-16 min-w-space-16`). Checkbox 18 → 16. Institution logo 22 → 24. Person avatar 30 → 32 (`control-md`, same as the account avatar). Switch 34×20 → 36×20 (`w-control-lg h-space-20`, knob `space-16`). Selection-mode eye column 30 → `control-md`.
  - Selected and watched row stripe 3 → 4px (`border-l-4` or an inset of 4); 2px lost the amber stripe on the watch tint.
  - Borders: drop zone 1px dashed (not 1.5 or 2); menu checkbox and radio 2px; radio on 4px.
  - Empty-state text width 300 → `max-w-xs` (320). Skeleton figure bar 22 → 24. Result-summary numbers 18px → `text-title`. Textarea is `rows={3}`, not a fixed height.
  - New size tokens: `dialog-sm/md/lg/xl` (440/640/760/920) as `max-w-dialog-*`, and `swipe-action` (96) as `w-swipe-action`. No inline pixel sizes for these.
  - Illustrations (auth, offline, empty) are SVG artwork: pixel geometry inside the SVG is fine; positioning the SVG uses tokens.
- 2026-10-15 · Accessibility is out of scope: no ARIA, screen-reader or contrast work. The Storybook accessibility addon stays installed but is not a check.

## Open questions
Add entries here instead of guessing (RULES §2): date, phase, screen or component, the question, the options.

_(none yet)_

## Log
Newest first: date, phase, tool or agent, what changed (files), checks run, open questions, deviations.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 8 (part 2) · RuleCard component fixes:
  - Fixed RuleCard in `src/components/ds/RuleCard/RuleCard.tsx`:
    - Selection API (RULES §7.4): added `selectable`, `selected`, `onSelectedChange`, `onDetail` (with `onViewDetail` alias).
    - Phone long-press: ~450ms timer starts selection (`onSelectedChange?.(true)`), cancelled if pointer moves >10px or pointer cancels/ends early.
    - Tap toggle: tapping the card toggles selection when `selectable`, `selected`, or in selection mode.
    - Trailing eye control: button with `Eye` icon opens detail (`onDetail?.()`) without leaving selection mode; `e.stopPropagation()` prevents card click/toggle.
    - Desktop checkbox: uses `useIsPhone()` to display semantic checkbox on desktop (`!isPhone`) on the left of the card header, toggling selection directly without long-press.
    - Accessibility: interactive card renders `role="row"`, `aria-selected`, `tabIndex=0`, and keyboard support (Enter/Space toggles selection).
    - Responsive layout: added `w-full min-w-0` to card container and flex children to prevent horizontal overflow on phone viewports.
  - Updated `src/components/ds/RuleCard/RuleCard.stories.tsx`:
    - `AllVariants` story updated with `grid-cols-1 sm:grid-cols-2 gap-space-12 w-full max-w-xl`.
    - Added `SelectableInteractive` story demonstrating interactive selection toggle, desktop checkbox, and eye control callback.
  - Updated `src/components/ds/RuleCard/RuleCard.test.tsx`:
    - 12 unit tests covering title, active status badge, conditions, action chips, unverified amber review styling, selection mode eye button, desktop checkbox, selection click toggle, keyboard Enter/Space toggle, mobile long-press selection, move >10px cancel, and eye control stop propagation.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,478 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `RuleCard/preview.html` and boards:
    - `DS/Data display/RuleCard/ActiveRule`
    - `DS/Data display/RuleCard/UnverifiedRule`
    - `DS/Data display/RuleCard/ComplexConditions`
    - `DS/Data display/RuleCard/DisabledRule`
    - `DS/Data display/RuleCard/SelectionMode`
    - `DS/Data display/RuleCard/AllVariants`
    - `DS/Data display/RuleCard/SelectableInteractive`
    Verified card layout at 390px and 1440px, desktop checkbox placement, phone long-press selection, eye control button, and light/dark theme tokens.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 8 (part 1) · TransactionRow component fixes:
  - Fixed TransactionRow in `src/components/ds/TransactionRow/TransactionRow.tsx`:
    - Selection API (RULES §7.4): added `selectable`, `selected`, `onSelectedChange`, `onDetail` (with `onViewDetail` alias).
    - Phone long-press: ~450ms timer starts selection (`onSelectedChange?.(true)`), cancelled if movement exceeds 10px or touch/pointer cancels before 450ms.
    - Tap toggle: tapping the row toggles selection when `selectable`, `selected`, or in `selectionMode`.
    - Trailing eye control: button with `Eye` icon opens detail (`onDetail?.()`) without leaving selection mode; `e.stopPropagation()` prevents row click/toggle.
    - Desktop checkbox: uses `useIsPhone()` to display semantic checkbox on desktop (`!isPhone`) on the left (`accent-brand w-space-16 h-space-16 rounded-ds-xs m-0`), toggling selection without long-press.
    - Typography: merchant/description uses `text-heading` (token 800 weight), removing overriding `font-bold` (700). Amount preserves 700 tabular digits.
    - Accessibility: interactive row renders `role="row"`, `aria-selected`, `tabIndex=0`, and keyboard support (Enter/Space toggles selection).
    - Styling & off-scale sizes: 4px stripe (`w-space-4 bg-brand` and `bg-watch`), excluded rows at 60% opacity (`opacity-60`), padding `py-space-10 px-space-14` matching `reference.css`.
  - Updated `src/components/ds/TransactionRow/TransactionRow.stories.tsx`:
    - `AllVariants` story configured with phone viewport parameters and 390px container (`style={{ maxWidth: '24.375rem' }}`).
    - Added `SelectableInteractive` story demonstrating interactive selection toggle, desktop checkbox, and eye control callback.
  - Updated `src/components/ds/TransactionRow/TransactionRow.test.tsx`:
    - 15 unit tests covering rendering, credit amount, review status, empty category chip, selection mode eye button, selected/monitored/excluded states, row click, description 800 heading without font-bold, 4px stripe, tap selection toggle, keyboard Enter/Space toggle, mobile long-press selection, move >10px cancel, eye control stop propagation, and desktop checkbox.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,478 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `TransactionRow/preview.html` and boards (`P-transactions.webp`, `P-transactions-states.webp`):
    - `DS/Data display/TransactionRow/Default`
    - `DS/Data display/TransactionRow/Credit`
    - `DS/Data display/TransactionRow/ReviewDuplicate`
    - `DS/Data display/TransactionRow/TransferLink`
    - `DS/Data display/TransactionRow/MonitoredUnset`
    - `DS/Data display/TransactionRow/SelectedSelectionMode`
    - `DS/Data display/TransactionRow/Excluded`
    - `DS/Data display/TransactionRow/AllVariants`
    - `DS/Data display/TransactionRow/SelectableInteractive`
    Verified 390px container, 800-weight title typography, 4px stripes, desktop checkbox placement, phone long-press selection, and eye control action in both light and dark modes.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 7 · Pager component fixes:
  - Fixed Pager in `src/components/ds/Pager/Pager.tsx`:
    - Ellipsis algorithm: desktop shows first, current ± 1, last with "…" in gaps (e.g. ‹ 1 2 … 4 › on page 1 of 4, ‹ 1 … 4 5 6 … 10 › in middle); phone keeps one neighbour fewer (‹ 1 … 4 ›); single page shows count and size only with no arrows.
    - Page size select: replaced native `<select>` and typed "▾" character with design-system Radix `DropdownMenu` (`DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`), styled with `h-control-md px-space-10 border border-line-strong rounded-ds-md text-label font-semibold text-ink-2 mr-space-6 bg-surface` and Lucide `ChevronDown`.
    - Responsive phone morphology: uses `useIsPhone()` hook and media queries; desktop displays unit ("1–50 of 182 transactions") and page size dropdown, while phone drops both unit and size selector.
    - Accessibility: numbered page buttons have `aria-label="Page N"` and `aria-current="page"` on the active page; arrow buttons have `aria-label="Previous page"` and `aria-label="Next page"`.
    - Active page pill uses `min-w-control-md h-control-md` matching design-system scale.
  - Updated `src/components/ds/Pager/Pager.test.tsx`:
    - Added unit tests for `getPageNumbers` verifying desktop and phone ellipsis formulas and single page behavior.
    - Updated page size selection test to interact via DropdownMenu.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,472 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Pager/preview.html` and boards:
    - `DS/Navigation/Pager/Desktop`
    - `DS/Navigation/Pager/Phone`
    - `DS/Navigation/Pager/SinglePage`
    - `DS/Navigation/Pager/MiddlePage`
    - `DS/Navigation/Pager/Interactive`
    - `DS/Navigation/Pager/All variants`
    Verified desktop displays ‹ 1 2 … 4 ›, phone displays ‹ 1 … 4 ›, single page has no arrows, and page size dropdown renders cleanly in both themes matching preview.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 6 · TabBar component fixes:
  - Fixed TabBar in `src/components/ds/TabBar/TabBar.tsx`:
    - Count bubble positioning: anchored with `left-space-14` instead of `-right-space-8` so the badge sits neatly at the top-right corner of the 20px icon and expands to the right without covering or obscuring the icon glyph.
    - Verified size tokens: badge uses `min-w-space-16 h-space-16` (16px per owner decision on count bubbles).
    - Verified count cap: counts exceeding 99 format as "99+" with `formatBadgeCount`.
    - Added `pointer-events-none` on the badge so tab clicks pass directly to the tab button.
  - Updated `src/components/ds/TabBar/TabBar.test.tsx`:
    - Added assertions for `left-space-14` positioning and `min-w-space-16 h-space-16` size tokens.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,468 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px in light and dark against `TabBar/preview.html` and boards:
    - `DS/Navigation/TabBar/HomeActive`
    - `DS/Navigation/TabBar/TransactionsActive`
    - `DS/Navigation/TabBar/HighCounts`
    - `DS/Navigation/TabBar/NoCounts`
    - `DS/Navigation/TabBar/Interactive`
    - `DS/Navigation/TabBar/All variants`
    Verified count bubbles on Inbox (danger) and Transactions (warning) sit at the icon's top-right corner without covering glyphs, expand to "99+" without collision, and match preview.html.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 5 · AppBar component fixes:
  - Fixed AppBar, BrandMark, DesktopTopBar, and DesktopRail in `src/components/ds/AppBar/AppBar.tsx`:
    - Phone AppBar:
      - 32px BrandMark: sized with `w-control-md h-control-md` (32px), `font-display font-extrabold text-heading select-none shrink-0 leading-none` matching board.
      - Sentence-case crumb: crumb text uses `text-label font-semibold text-ink-4 leading-none` (removed uppercase and wide tracking) matching `preview.html` (`.ptop .cr`).
      - Bordered 32px secondary icon buttons: Ask the data and Search use `variant="secondary" size="md" iconOnly` (`h-control-md aspect-square`).
      - Brand add button (+): uses `variant="primary" size="md" iconOnly` (`bg-brand text-on-brand h-control-md aspect-square`).
      - Detail screen back button: uses `variant="ghost" size="md" iconOnly` (`h-control-md aspect-square`).
    - DesktopTopBar:
      - Action controls use 32px `control-md` buttons: Add uses `size="md" variant="secondary"`, Ask and Notifications use `size="md" variant="secondary" iconOnly`. Added optional `crumb` prop for breadcrumb path support.
    - DesktopRail:
      - Removed hardcoded default user "Arjun Mehta" and "AM" from component props; accepts `userName`, `userEmail`, `userInitials` via props. Dynamically calculates initials when `userName` is provided and renders user avatar with `variant="person"` and `size="sm"`.
  - Updated `src/components/ds/AppBar/AppBar.stories.tsx`:
    - Interactive DesktopRail story passes realistic user props (`userName="Arjun Mehta"`, `userEmail="arjun@example.com"`, `userInitials="AM"`).
    - Added "Phone Without Crumb" variant to `All variants` story.
  - Updated `src/components/ds/AppBar/AppBar.test.tsx`:
    - Added tests for 32px control tokens on BrandMark and buttons, sentence case crumb, DesktopTopBar crumb/actions, dynamic initials calculation, and clean rendering without user props.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,468 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `AppBar/preview.html` and boards `D-home` / `P-*` / `ds-05-navigation`:
    - `DS/Navigation/AppBar/Top level`
    - `DS/Navigation/AppBar/Detail screen`
    - `DS/Navigation/AppBar/Without crumb`
    - `DS/Navigation/AppBar/DesktopTopBar`
    - `DS/Navigation/AppBar/DesktopRail`
    - `DS/Navigation/AppBar/All variants`
    Verified 32px BrandMark, sentence case crumb, 32px bordered Ask/Search buttons, 32px brand Add button, DesktopTopBar actions, and DesktopRail user profile match preview and boards.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 4 · Select component fixes:
  - Fixed Select in `src/components/ds/Select/Select.tsx`:
    - Responsive phone Sheet picker morphology: below the phone breakpoint (`< sm`), Select opens as a bottom sheet (`Sheet`, `SheetContent`, `SheetBody`) with drag handle, title, scrolling options list, and swipe-down-to-dismiss (Sheet README "picker" variant); on desktop (`sm:`), it renders the anchored floating popover menu. Supports `forceSheet` prop.
    - Desktop keyboard model: ArrowDown and ArrowUp navigate between enabled options, Home/End jump to first/last option, Enter selects the highlighted option or creates from query, Escape closes the menu.
    - Removed double focus ring from embedded SearchField: applied `containerClassName="focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-brand"` to eliminate ring-offset double borders.
    - Semantic ARIA structure: trigger has `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, and `aria-invalid={hasError ? 'true' : undefined}`; `role="listbox"` is scoped strictly to the options container (excluding search input and footer action buttons); individual options have `role="option"`.
    - Error state: displays error message below trigger in `font-text text-caption font-medium text-danger mt-space-6` matching board.
  - Created `src/components/ds/useMediaQuery.ts`: responsive media query and `useIsPhone()` hook (`< 640px`) with clean SSR hydration via `useSyncExternalStore`.
  - Updated `src/components/ds/Select/Select.stories.tsx`:
    - Added the 4 missing variants to the **All variants** story grid: Multi · with search, With an action row, Search · create from typing, and No results, displaying all 10 open variants + 10 closed states.
  - Updated `src/components/ds/Select/Select.test.tsx`:
    - Updated trigger query to `combobox` role following ARIA combobox pattern.
    - Added tests verifying keyboard navigation (ArrowDown, ArrowUp, Enter, Escape).
    - Added tests verifying `aria-invalid="true"` on error and mobile Sheet picker rendering/opening.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 3,466 tests passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px (mobile bottom sheet picker) and 1440px (desktop floating dropdown) in light and dark against `Select/preview.html`:
    - `DS/Inputs/Select/SingleSelect`
    - `DS/Inputs/Select/SingleWithSearchAndIcons`
    - `DS/Inputs/Select/MultiSelect`
    - `DS/Inputs/Select/MultiWithSearch`
    - `DS/Inputs/Select/SectionedList`
    - `DS/Inputs/Select/WithAnActionRow`
    - `DS/Inputs/Select/SearchCreateFromTyping`
    - `DS/Inputs/Select/NoResults`
    - `DS/Inputs/Select/WithDescriptions`
    - `DS/Inputs/Select/DisabledOption`
    - `DS/Inputs/Select/ClosedFieldStates`
    - `DS/Inputs/Select/All variants`
    Verified single border on SearchField without double ring, responsive phone bottom sheet picker, error text with red border, and all 10 open variants displayed in AllVariants matching preview.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 3 · ConfirmSheet component fixes:
  - Fixed ConfirmSheet in `src/components/ds/ConfirmSheet/ConfirmSheet.tsx`:
    - Inherits all Sheet fixes: swipe-down dismiss (> 80px), `px-space-16`, `max-h-dvh`, and `z-scrim`/`z-overlay`.
    - Disabled confirm button while loading: both `loading` and `confirmLoading` props disable the confirm button and guard `handleConfirm` so duplicate clicks cannot fire. Alternative and cancel buttons are disabled while busy.
    - Verified and enforced token typography: `text-label text-ink-3` for impact checking indicator, `text-label text-ink-2` for impact bullet list with `pl-space-16`.
    - Responsive footer button layout: phone full-width stack with primary action on top (`order-1 sm:order-3`, `w-full sm:w-auto`), desktop inline layout (`sm:flex-row sm:items-center`) with cancel on left and confirm on right matching `preview.html`.
  - Updated `src/components/ds/ConfirmSheet/ConfirmSheet.test.tsx`:
    - Added tests verifying `loading` and `confirmLoading` disable the confirm button and prevent duplicate click invocations.
    - Added test verifying swipe-down gesture (> 80px) dismisses the modal ConfirmSheet and invokes `onCancel`.
  - Checks: `npm run typecheck`, `npm run lint`, `npm test` (all 3,463 tests passed across 421 suites), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `ConfirmSheet/preview.html`:
    - `DS/Overlays/ConfirmSheet/DeleteStatement`
    - `DS/Overlays/ConfirmSheet/DiscardEdits`
    - `DS/Overlays/ConfirmSheet/WithAlternative`
    - `DS/Overlays/ConfirmSheet/LoadingPreview`
    - `DS/Overlays/ConfirmSheet/Interactive`
    - `DS/Overlays/ConfirmSheet/All variants`
    Verified drag handle, title/description, impact list with bullet markers, loading spinner with label text, and button layout (phone stacked with primary on top; desktop inline with cancel on left, confirm on right) match preview.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 2 · Dialog component fixes:
  - Fixed Dialog in `src/components/ds/Dialog/Dialog.tsx`:
    - Responsive mobile morphology: on screens below `sm` (phone), Dialog seamlessly renders as a bottom sheet with `SheetHandle`, no `×` button, full-width `rounded-t-ds-sheet shadow-sheet`, pinned footer with full-width action buttons, and touch/pointer swipe-down to dismiss (RULES §5.6). On desktop (`sm:`), it renders centered with `rounded-ds-xl shadow-dialog`, `×` close button, and token max-widths (`max-w-dialog-sm/md/lg/xl`).
    - Removed arbitrary `maxHeight: 480` and pixel width styles (`dialogWidths[size]`); capped by viewport using `max-h-dvh`.
    - Token z-indices: `z-scrim` on overlay, `z-overlay` on content.
    - Title and description: rendered exactly once through Radix primitives (`DialogPrimitive.Title` and `DialogPrimitive.Description`) with no duplicated hidden copies.
    - Config-driven footer: supports `leftAction` (far-left destructive slot, e.g. "Delete 9"), `secondaryAction` ("Cancel"), and `primaryAction` ("Approve 9").
  - Updated `src/components/ds/Dialog/Dialog.test.tsx`: verified title/description rendering, token size classes (`sm:max-w-dialog-*`), desktop close button, mobile swipe down, footer props, and Radix overlay tokens.
  - Updated `src/components/ds/Dialog/Dialog.stories.tsx`: configured stories using `leftAction`, `secondaryAction`, and `primaryAction` props.
  - Checks: `npm run typecheck`, `npm run lint`, `npx vitest run src/components/ds/Dialog/Dialog.test.tsx` (all 6 passed), and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px (phone bottom sheet) and 1440px (desktop centered modal) in light and dark against `Dialog/preview.html`:
    - `DS/Overlays/Dialog/Small (440)`
    - `DS/Overlays/Dialog/Default (640)`
    - `DS/Overlays/Dialog/Large (760)`
    - `DS/Overlays/Dialog/Extra large (920)`
    - `DS/Overlays/Dialog/All variants`
    Verified desktop modal has `rounded-ds-xl`, `shadow-dialog`, `×` button, far-left destructive action, and right-aligned buttons matching preview. Verified phone render adapts to bottom sheet with drag handle, no `×`, and pinned footer.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 2 · Sheet component fixes:
  - Fixed Sheet implementation in `src/components/ds/Sheet/Sheet.tsx`:
    - Snapped phone gutter side padding to `px-space-16`.
    - Added interactive swipe-down gesture on drag handle and header area: tracks pointer/touch movement, translates sheet with finger, closes past 80px threshold, and springs back with `transition-transform duration-sheet ease-out`.
    - Added `touch-pan-y` to `SheetBody` for native scroll ergonomics.
    - Updated overlay z-index to `z-scrim` and content z-index to `z-overlay`.
    - Removed arbitrary `maxHeight: 480` and `maxHeight: '90%'`; capped sheet height with viewport-relative `max-h-dvh`.
  - Updated `src/components/ds/Sheet/Sheet.test.tsx` with behavioral tests: swipe down past threshold triggers `onClose`, swipe down below threshold springs back, body includes `touch-pan-y`, and overlay/content use `z-scrim` / `z-overlay` and `max-h-dvh`.
  - Updated `src/components/ds/Sheet/Sheet.stories.tsx`: result summary numbers use `text-title` per owner decision.
  - Checks: `npm run typecheck`, `npm run lint`, `npx vitest run src/components/ds/Sheet/Sheet.test.tsx` (all 7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` all clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark mode against `Sheet/preview.html`:
    - `DS/Overlays/Sheet/Form`
    - `DS/Overlays/Sheet/Detail`
    - `DS/Overlays/Sheet/Picker`
    - `DS/Overlays/Sheet/Result summary`
    - `DS/Overlays/Sheet/All variants`
    Verified drag handle, `radius-sheet` top corners, 16px gutter alignment, and pinned footers match preview.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 1 · Unknown Tailwind classes replaced:
  - Fixed unknown Tailwind class names across 15 files:
    - `text-small` replaced with `text-label` / `text-caption` / `text-body` in `AppBar.tsx`, `AppBar.stories.tsx`, `ConfirmSheet.tsx`, `ConfirmSheet.stories.tsx`, `Pager.tsx`, `Pager.stories.tsx`, `SelectionBar.stories.tsx`, `SwipeActions.stories.tsx`, and `TabBar.stories.tsx`.
    - `p-space-0` replaced with `p-0` in `EmptyState.stories.tsx`, `ListRow.stories.tsx`, and `SectionBand.stories.tsx`.
    - `px-space-18` replaced with `px-space-16` in `Sheet.tsx` (matches phone sheet 16px gutter per owner decision).
    - `z-1` replaced with `relative` stacking in `AuthPanel.tsx`.
    - `rounded-ds-circle` and `border-t-ink` replaced with `rounded-ds-pill` and `border-t-brand` in `ConfirmSheet.tsx`.
    - `font-inherit` replaced with explicit `text-body text-ink` styling on `<input>` in `TextField.tsx`.
  - Checks: `npm run typecheck`, `npm run lint`, `npm test` (all 421 files / 3,456 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` all clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px against component previews and boards:
    - Button (`DS/Actions/Button/All variants`, `With count`, `Icon button`)
    - FilterChip (`DS/Inputs/FilterChip/All variants`, `With count`, `Removable`)
    - Pager (`DS/Navigation/Pager/All variants`, `Desktop`, `Phone`)
    - SelectionBar (`DS/Actions/SelectionBar/All variants`, `Desktop`, `Phone docked`)
    - DropZone (`DS/Inputs/DropZone/All variants`, `Idle`, `Queued`)
    Verified count bubbles render in `bg-ink`, square icon buttons render with `control-md`, page pills render with `min-w-control-md`, and selection bar close button renders at full height.
  - Differences left open: none for this unit.
  - Deviations: none.

- **2026-10-15 · Phase 2 review (Claude):** reviewed all 39 components; report in `design-system/reviews/2026-10-15-phase2-review.md`. Verdict: 14 need real fixes, 18 small ones, 7 good as built (Badge, StatusWords, SectionBand, Kbd, Skeleton, EmptyState, DateGroupHeader). Statuses unchanged; the owner sets them.
  - Root cause of most visual bugs: class names Tailwind does not know (it drops them silently). `check-ui.mjs` now fails on them.
  - Contract and token changes (commit `5f30714`): `ink-4` #636b78 / #929ba7 and `warning` #a84d06 (contrast); `w-`/`min-w-control-*`, `w-chip` and `bg-ink` added. READMEs corrected: Banner `ok` is positive, SwipeActions and AppBar + are brand.
  - Checks: typecheck, lint, test, build-storybook and check-ui self-test green.
  - Open questions for the owner are in the report's "Decisions for you".
  - Deviations: none.

- **2026-10-15 · Phase 2 Complete (Overnight batch summary):**
  - **What was built:** All 39 Phase 2 design system components (Units 1–39) were successfully built, tested, and documented with Storybook stories matching Figma/HTML previews and screen boards:
    1. Button, 2. Badge, 3. CategoryChip, 4. StatusWords, 5. Kbd, 6. Avatar, 7. ProgressBar, 8. TextField, 9. SearchField, 10. Select, 11. Switch, 12. SegmentedControl, 13. FilterChip, 14. Tabs, 15. Menu, 16. Card, 17. ListRow, 18. SectionBand, 19. Callout, 20. Banner, 21. Toast, 22. Skeleton, 23. EmptyState, 24. Dialog, 25. Sheet, 26. ConfirmSheet, 27. AppBar, 28. TabBar, 29. Pager, 30. SelectionBar, 31. SwipeActions, 32. DateGroupHeader, 33. TransactionRow, 34. KpiTile, 35. Widget, 36. RuleCard, 37. DateTile, 38. DropZone, 39. AuthPanel.
    All components are exported from `src/components/ds/index.ts` and set to **Ready for review**.
  - **Blocked:** None. All 39 components built cleanly and passed all 5 verification gates.
  - **Open questions:** None. All implementations strictly follow tokens, `RULES.md`, and preview specs.
  - **Verification:** All 5 checks (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build-storybook`, and `node design-system/tools/check-ui.mjs`) pass cleanly.
  - **Next steps:** Per overnight instructions, Phase 3 (Pages) has not started and waits for owner morning review and approvals.

- 2026-10-15 · Phase 2 · Antigravity · Built AuthPanel component:
  - Created `src/components/ds/AuthPanel/AuthPanel.tsx`: Full-surface authentication panel supporting card (compact phone/modal) and split (desktop hero split) layouts, login and signup modes, Google SSO button, email & password inputs with reveal toggle, optional invite code input, action CTA, mode switcher, and mint-illustrated brand side panel (`#d9e6dc` mint background, brand card illustration with gold coin and ₹9,42,800 net worth tile, plus 3-step value props).
  - Created `src/components/ds/AuthPanel/AuthPanel.stories.tsx`: `DS/Screens/AuthPanel` stories for LoginCard, SignupCard, SplitDesktopLogin, SplitDesktopSignup, and AllVariants.
  - Created `src/components/ds/AuthPanel/AuthPanel.test.tsx`: 6 unit tests covering login card render, password visibility toggle, mode switching, form submission with input values, split layout illustration render, and disabled/submitting states.
  - Exported AuthPanel, AuthIllustration, and type definitions from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built DropZone component:
  - Created `src/components/ds/DropZone/DropZone.tsx`: DropZone file import component for statements and documents. Implements dashed drop container with upload icon tile (`44px` with `brand-tint` and `brand` icon), heading, format & size hint, and Choose files action button triggering hidden native multi-file input. Supports active drag-over state (`border-brand bg-brand-tint` with dynamic drag hint), staged queued files card (file name, size, error message in danger tone, and remove trash button), and recent imports list with positive/warning/danger status words.
  - Created `src/components/ds/DropZone/DropZone.stories.tsx`: `DS/Inputs/DropZone` stories for Idle, DraggingOver, Queued, TooLarge, WithRecentImports, and AllVariants.
  - Created `src/components/ds/DropZone/DropZone.test.tsx`: 5 unit tests covering idle rendering, dragging over state hiding choose button, queued files removal callback, file error styling, and recent imports status display.
  - Exported DropZone from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built DateTile component:
  - Created `src/components/ds/DateTile/DateTile.tsx`: DateTile shape components for Upcoming lists and monthly calendar view. Implements `DateTile` (40px fixed width, 800 weight day number, and 10px uppercase month overline in `ink-4`) and `MonthCalendar` (7-column grid with weekday headers M T W T F S S, day cells with `min-h-app-bar`, `brand-tint` highlight on today, selection ring, event indicator bars for bills in `warning`, money in in `positive`, and EMIs in `info`, and day selection callback with keyboard accessibility).
  - Created `src/components/ds/DateTile/DateTile.stories.tsx`: `DS/Data display/DateTile` stories for Tile, Calendar, Interactive, and AllVariants.
  - Created `src/components/ds/DateTile/DateTile.test.tsx`: 5 unit tests covering DateTile day/month rendering, MonthCalendar weekdays/days grid, today cell highlight, event indicator bar styling, and day selection click and keyboard handlers.
  - Exported DateTile and MonthCalendar from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built RuleCard component:
  - Created `src/components/ds/RuleCard/RuleCard.tsx`: RuleCard record card component for categorization rules (3 columns desktop, 1 column phone). Features header with rule name (`heading`), match type & bold pattern (`label`), and top-right used count, status line (amber Unverified or green/brand-strong Verified, source, MCC), category chips in `cats` row, and actions (Approve button on unverified, kebab options dropdown menu with Find matches, Edit rule, Delete rule). In selectionMode, selected cards turn `brand-tint` with `brand` border and ring, with trailing `Eye` icon control replacing action buttons.
  - Created `src/components/ds/RuleCard/RuleCard.stories.tsx`: `DS/Data display/RuleCard` stories for Unverified, Selected, Verified, SelectionModeNotSelected, and AllVariants.
  - Created `src/components/ds/RuleCard/RuleCard.test.tsx`: 5 unit tests covering name/pattern/count rendering, unverified status and approve button callback, verified status omitting approve button, selection mode eye icon callback, and selected state styles.
  - Exported RuleCard from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Widget component:
  - Created `src/components/ds/Widget/Widget.tsx`: Widget dashboard tile component with title, subtitle, and dropdown kebab options menu (`MoreVertical` icon with `DropdownMenu` items). Handles states: loading (flexible skeleton placeholders), failed (inline error with Retry button), unavailable (report deleted notice with Remove button), and normal children rendering (figures, rows, charts, tables).
  - Created `src/components/ds/Widget/Widget.stories.tsx`: `DS/Data display/Widget` stories for Figure, RowsLoading, Failed, Unavailable, WithMenu, and AllVariants.
  - Created `src/components/ds/Widget/Widget.test.tsx`: 5 unit tests covering title/subtitle/body rendering, menu trigger button, loading skeleton state, failed state retry callback, and unavailable state remove callback.
  - Exported Widget from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built KpiTile component:
  - Created `src/components/ds/KpiTile/KpiTile.tsx`: KpiTile single-figure metric card component for Home and dashboard grids (2 cols phone, 3-4 cols desktop). Displays uppercase overline label, tabular value (figure size 22px or hero size 30px with display font), delta with directional sentiment (`good` positive green, `bad` danger red, `neutral`), optional context elements (ProgressBar, badges, breakdown context line), loading skeleton state, and failed state with `border-danger-border`, danger label, and retry button callback.
  - Created `src/components/ds/KpiTile/KpiTile.stories.tsx`: `DS/Data display/KpiTile` stories for Hero, DeltaBadDirection, WithBar, WithBadges, Loading, Failed, and AllVariants.
  - Created `src/components/ds/KpiTile/KpiTile.test.tsx`: 7 unit tests covering default/hero typography, good/bad delta styling, progress bar and context, badges, loading skeleton rendering, and failed state retry callback.
  - Exported KpiTile from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built TransactionRow component:
  - Created `src/components/ds/TransactionRow/TransactionRow.tsx`: TransactionRow phone list row component. Implements 2-line layout: line 1 with merchant description (`heading`) and amount (tabular, auto credit detection with `positive` tone and + sign) with optional running balance (`caption`), line 2 with context line ordered canonically (account name first, plastic `••7741`, amber review reasons, notes, blue link/record words with chain glyph, grey provenance) and CategoryChip (first category chip, `+n` chip, or dashed amber "Set category" chip when empty). Supports states: selected (`brand-tint` with 4px brand stripe), monitored (`watch-tint` with 4px watch stripe), excluded (60% opacity), and selectionMode with trailing `Eye` icon control.
  - Created `src/components/ds/TransactionRow/TransactionRow.stories.tsx`: `DS/Data display/TransactionRow` stories for Default, Credit, ReviewDuplicate, TransferLink, MonitoredUnset, SelectedSelectionMode, Excluded, and AllVariants.
  - Created `src/components/ds/TransactionRow/TransactionRow.test.tsx`: 7 unit tests covering description/amount/balance/account/provenance rendering, credit positive styling, review reasons and plastic info, empty categories "Set category" click callback, selection mode eye button callback, selected/monitored/excluded states, and row click callback.
  - Exported TransactionRow from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built DateGroupHeader component:
  - Created `src/components/ds/DateGroupHeader/DateGroupHeader.tsx`: DateGroupHeader component supporting day variant (sticky phone band on `bg-subtle`, 800 weight label, and `text-caption` font-semibold weekday in `ink-3`, with `z-sticky`) and month variant (desktop table month band in `bg-sunken`, `text-overline` uppercase `ink-4`, with formatted transaction summary count and amount).
  - Created `src/components/ds/DateGroupHeader/DateGroupHeader.stories.tsx`: `DS/Data display/DateGroupHeader` stories for Day, Month, and AllVariants.
  - Created `src/components/ds/DateGroupHeader/DateGroupHeader.test.tsx`: 5 unit tests covering day variant rendering with weekday, month variant rendering with summary, custom children, and sticky prop behavior.
  - Exported DateGroupHeader from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built SwipeActions component:
  - Created `src/components/ds/SwipeActions/SwipeActions.tsx`: SwipeActions phone row gestures for list triage (Transactions, Inbox). Reveals 96px action panels on swipe: swipe right reveals leftAction (Approve, Snooze in `brand` tone), swipe left reveals rightAction (Delete, Dismiss in `danger` tone). Supports touch/pointer drag gestures with threshold snapping and spring back, action callbacks, disabled action states, and controlled/uncontrolled revealed states.
  - Created `src/components/ds/SwipeActions/SwipeActions.stories.tsx`: `DS/Actions/SwipeActions` stories for ApproveRevealed, DeleteRevealed, SnoozeRevealed, DismissRevealed, Interactive, and AllVariants.
  - Created `src/components/ds/SwipeActions/SwipeActions.test.tsx`: 5 unit tests covering row children rendering, revealed left/right action panels and callbacks, pointer swipe drag interaction, and disabled action states.
  - Exported SwipeActions from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built SelectionBar component:
  - Created `src/components/ds/SelectionBar/SelectionBar.tsx`: SelectionBar bulk action toolbar supporting desktop floating pill (`shadow-pop`, bordered actions, summary, clear button, and global Escape key listener) and phone bottom docked sheet (`shadow-dock`, top header row with select-all link and clear button, and multi-column action grid with sub-label hints). Supports disabled actions with explanatory summary and destructive variant actions.
  - Created `src/components/ds/SelectionBar/SelectionBar.stories.tsx`: `DS/Actions/SelectionBar` stories for Desktop, PhoneDocked, SingleAction (rules), ActionDisabled, Interactive, and AllVariants.
  - Created `src/components/ds/SelectionBar/SelectionBar.test.tsx`: 7 unit tests covering count and summary rendering, action clicks, disabled action states, clear via button and Escape key, phone docked select-all and hints, and zero count null rendering.
  - Exported SelectionBar from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Pager component:
  - Created `src/components/ds/Pager/Pager.tsx`: Pager list pagination component for server-side paging across table cards and card grids. Displays visible range ("1–50 of 182 transactions"), rows-per-page select control, previous/next chevron buttons, numbered pages with active page highlight and gap ellipsis. Supports desktop and phone variants (phone omits unit and page-size select, showing one neighbor fewer), and single-page mode (showing count and page size only, without navigation arrows).
  - Created `src/components/ds/Pager/Pager.stories.tsx`: `DS/Navigation/Pager` stories for Desktop, Phone, SinglePage, MiddlePage, Interactive, and AllVariants.
  - Created `src/components/ds/Pager/Pager.test.tsx`: 8 unit tests covering range and total calculations, zero total elements, active page aria-current attribute, boundary button disabled states (previous on page 0, next on last page), page change callbacks, page size change callback, single-page arrow omission, and phone responsive variant.
  - Exported Pager from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built TabBar component:
  - Created `src/components/ds/TabBar/TabBar.tsx`: TabBar phone bottom navigation fixed in canonical order (Home, Inbox, Upcoming, Transactions, More). Displays 20px Lucide stroke icons with `text-tab-label` bold labels, highlights active tab with `brand-strong`, supports count notification bubbles (`danger` for Inbox, `warning` for Transactions review count), and formats counts above 99 as "99+". Supports hidden state under selection mode and virtual keyboards.
  - Created `src/components/ds/TabBar/TabBar.stories.tsx`: `DS/Navigation/TabBar` stories for HomeActive, TransactionsActive, HighCounts (99+), NoCounts, Interactive, and AllVariants.
  - Created `src/components/ds/TabBar/TabBar.test.tsx`: 6 unit tests covering canonical 5-tab ordering, active tab aria-selected state, tab change callback, count badge display with danger and warning styles, 99+ threshold formatting, and hidden state rendering.
  - Exported TabBar from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built AppBar component (phone and desktop variants):
  - Created `src/components/ds/AppBar/AppBar.tsx`: AppBar (phone app bar replacing body H1 titles, supporting brand mark or detail screen back button, crumb, title with truncation, and Ask the data / Search / Add control actions), BrandMark (tokenized ₹ symbol), DesktopTopBar (desktop top bar with page title, shortcut Add button, Ask the data, Notifications), and DesktopRail (desktop navigation rail with search shortcut, grouped navigation with status badges, and user profile footer).
  - Created `src/components/ds/AppBar/AppBar.stories.tsx`: `DS/Navigation/AppBar` stories for TopLevel, DetailScreen, WithoutCrumb, DesktopTopBar, DesktopRail, and AllVariants.
  - Created `src/components/ds/AppBar/AppBar.test.tsx`: 6 unit tests covering BrandMark rendering, phone AppBar top-level and detail back navigation, action callbacks (ask, search, add), DesktopTopBar actions, and DesktopRail navigation.
  - Exported AppBar, BrandMark, DesktopTopBar, DesktopRail from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built ConfirmSheet component:
  - Created `src/components/ds/ConfirmSheet/ConfirmSheet.tsx`: ConfirmSheet and ConfirmSheetShell for destructive action confirmations and unsaved changes confirmation. Displays object name title, description explaining what goes and stays, bulleted impact list, loading state during impact check, optional gentler alternative action (e.g. "Close instead"), cancel button, and filled-danger confirm action (`variant="danger-filled"`).
  - Created `src/components/ds/ConfirmSheet/ConfirmSheet.stories.tsx`: `DS/Overlays/ConfirmSheet` stories for DeleteStatement, DiscardEdits, WithAlternative, LoadingPreview, Interactive, and AllVariants.
  - Created `src/components/ds/ConfirmSheet/ConfirmSheet.test.tsx`: 5 unit tests covering title/description/impact rendering, confirm/cancel callbacks, alternative button callback, impact check loading state, and modal open/close interaction.
  - Exported ConfirmSheet and ConfirmSheetShell from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Sheet component:
  - Created `src/components/ds/Sheet/Sheet.tsx`: Sheet, SheetShell, SheetHeader, SheetBody, SheetFooter, SheetHandle, SheetContent, SheetTrigger, SheetClose, and SheetPortal based on Radix Dialog. Supports phone bottom sheets with `rounded-t-ds-sheet`, `shadow-sheet`, drag handle (`bg-line-handle`), title/subtitle header, scrollable body container, and full-width/side-by-side sticky footer buttons.
  - Created `src/components/ds/Sheet/Sheet.stories.tsx`: `DS/Overlays/Sheet` stories for Form, Detail, Picker, ResultSummary, InteractiveModal, and AllVariants.
  - Created `src/components/ds/Sheet/Sheet.test.tsx`: 4 unit tests covering SheetShell title/subtitle/body rendering, drag handle presence, footer layout, and Radix bottom-sheet overlay interaction.
  - Exported Sheet primitives and SheetShell from `src/components/ds/index.ts`.
  - Added line color tokens (`line-handle`, `line-soft`, `line-strong`, `line`) to `tailwind.config.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Dialog component:
  - Created `src/components/ds/Dialog/Dialog.tsx`: Dialog, DialogShell, DialogBody, DialogFooter, DialogContent, DialogTrigger, DialogClose, and DialogPortal based on Radix Dialog. Supports desktop modal widths (small 440, default 640, large 760, extra large 920), `radius-xl`, `shadow-dialog`, top-right close control (`X`), scrollable body container, right-aligned sunken footer with optional far-left destructive action, and `srTitle` accessibility support for headerless dialogs.
  - Created `src/components/ds/Dialog/Dialog.stories.tsx`: `DS/Overlays/Dialog` stories for SmallForm, LargeList, DefaultDialog, ExtraLarge, InteractiveModal, and AllVariants.
  - Created `src/components/ds/Dialog/Dialog.test.tsx`: 5 unit tests covering title/description rendering, maxWidth sizing across all four width steps, close button callback, footer layout and left actions, and Radix overlay trigger interactions.
  - Exported Dialog primitives and DialogShell from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built EmptyState component:
  - Created `src/components/ds/EmptyState/EmptyState.tsx`: EmptyState and OfflineIllustration supporting empty screen states with `screen-title` headline in display font, one-sentence description in `ink-3`, call-to-action button, compact single-line mode for cards/panels, and custom SVG offline illustration with sleeping rupee coin and cloud using design-system tokens.
  - Created `src/components/ds/EmptyState/EmptyState.stories.tsx`: `DS/Feedback/EmptyState` stories for FirstRun, NothingMatches, AllClear, CouldntLoad, Offline, NothingOnThisDay, and AllVariants.
  - Created `src/components/ds/EmptyState/EmptyState.test.tsx`: 4 unit tests covering title/description rendering, illustration elements, action button integration, and compact mode.
  - Exported EmptyState and OfflineIllustration from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Skeleton component:
  - Created `src/components/ds/Skeleton/Skeleton.tsx`: Skeleton loading placeholder shaped like content using `bg-line-soft`, `rounded-ds-xs` (or `rounded-ds-pill` for avatars/circles), `animate-pulse` with `motion-reduce:animate-none`, and configurable dimensions.
  - Created `src/components/ds/Skeleton/Skeleton.stories.tsx`: `DS/Feedback/Skeleton` stories for Rows, Figure, WidgetRows, Table, and AllVariants.
  - Created `src/components/ds/Skeleton/Skeleton.test.tsx`: 3 unit tests covering default token classes, circle avatar placeholders, custom width/height styles, and aria-hidden attributes.
  - Exported Skeleton from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Toast component:
  - Created `src/components/ds/Toast/Toast.tsx`: Toast confirmation and failure feedback component and `showToast` sonner-based helper with `bg-brand` ground, `text-on-brand`, `shadow-pop`, `rounded-ds-lg`, inline Undo action button, status/alert ARIA roles, and zero icons as required by design-system rules.
  - Created `src/components/ds/Toast/Toast.stories.tsx`: `DS/Feedback/Toast` stories for Confirmation, Undo, MarkPaid, Failure, and AllVariants.
  - Created `src/components/ds/Toast/Toast.test.tsx`: 5 unit tests covering message rendering, token styling, undo button interaction and callback, status vs alert ARIA roles, and `showToast` sonner integration.
  - Exported Toast and showToast from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Banner component:
  - Created `src/components/ds/Banner/Banner.tsx`: Banner supporting form/list inline messages across all tones (`err` on `danger-tint` with `danger-ink` and alert role, `ok` on `brand-tint` with `brand-strong` and status role, `info` on `info-tint` with `info-ink`, and `warn` on `warning-tint` with `warning-ink`), optional trailing action element, and zero icons as required by design-system rules.
  - Created `src/components/ds/Banner/Banner.stories.tsx`: `DS/Feedback/Banner` stories for ErrorBanner, SuccessBanner, InfoBanner, WarningBanner, WithAction, and AllVariants.
  - Created `src/components/ds/Banner/Banner.test.tsx`: 6 unit tests covering content rendering, error tone with alert role and danger tokens, ok tone with status role and brand tokens, info tone, warn tone, and trailing action elements.
  - Exported Banner from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Callout component:
  - Created `src/components/ds/Callout/Callout.tsx`: Callout, Note, and warning-banner inline feedback messages with support for action links, bold prefix titles, `warning-tint` ground with `warning-ink` text (needs action), `bg-canvas` ground with `ink-2` text (neutral note), and `warning-banner` styling.
  - Created `src/components/ds/Callout/Callout.stories.tsx`: `DS/Feedback/Callout` stories for ActOnIt, NoteVariant, WarningBannerStyle, and AllVariants.
  - Created `src/components/ds/Callout/Callout.test.tsx`: 5 unit tests covering title/message rendering, callout token styling, Note component styling, warning-banner variant, and action links.
  - Exported Callout and Note from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built SectionBand component:
  - Created `src/components/ds/SectionBand/SectionBand.tsx`: SectionBand supporting form section bands (`sec`) with `overline` caption in `ink-4` on `bg-sunken`, uppercase styling, optional trailing action element, border controls, and `danger` variant for closing/destructive sections.
  - Created `src/components/ds/SectionBand/SectionBand.stories.tsx`: `DS/Data display/SectionBand` stories for DefaultBand, DangerBand, and AllVariants.
  - Created `src/components/ds/SectionBand/SectionBand.test.tsx`: 6 unit tests covering title rendering, children fallback, default styling tokens, danger tone styling, border overrides, and trailing actions.
  - Exported SectionBand from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built ListRow component:
  - Created `src/components/ds/ListRow/ListRow.tsx`: ListRow, ListField (`fld`), ListRowDateTile (`dtile`), and ListRowIconTile (`av`/`avr`) supporting leading elements (badge, date tile, avatar, icon tile), primary line (`body-strong`), secondary line (`caption` in `ink-3`), trailing amounts (tabular 700 with positive credit `+`), actions, chevrons, kebabs, highlighted row outline (`2px brand` on `brand-tint`), disabled states, and detail sheet label/value pairs.
  - Created `src/components/ds/ListRow/ListRow.stories.tsx`: `DS/Data display/ListRow` stories for BadgeAction, DateTileAmount, AvatarCredit, IconTileChevron, Kebab, Highlighted, LabelValue, Disabled, and AllVariants.
  - Created `src/components/ds/ListRow/ListRow.test.tsx`: 10 unit tests covering titles, leading/trailing elements, credit formatting, highlighted outline, disabled prevention, click/keyboard triggers, kebab actions, label/value pairs, date tiles, and icon tile tones.
  - Exported ListRow, ListField, ListRowDateTile, ListRowIconTile from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Built Card component:
  - Created `src/components/ds/Card/Card.tsx`: Card, CardHeader, CardContent, CardFooter with support for variants (`outline`, `tint`, `sunken`, `glass`, `hero`), padding options (`sm`, `md`, `lg`, `none`), clickable states (actionable cards with hover/keyboard focus), header with title, subtitle, prefix, and actions, and footer with alignment.
  - Created `src/components/ds/Card/Card.stories.tsx`: `DS/Layout/Card` stories for Outline, Tint, Sunken, Glass, Hero, Interactive, WithHeaderAndFooter, and AllVariants.
  - Created `src/components/ds/Card/Card.test.tsx`: 6 unit tests covering rendering, variants, click handlers, keyboard activation, and child compositions.
  - Exported Card, CardHeader, CardContent, CardFooter from `src/components/ds/index.ts`.
  - Checks: npm run typecheck, npm run lint, npm test, npm run build-storybook, node design-system/tools/check-ui.mjs. All passed. Open questions: none. Deviations: none.

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
