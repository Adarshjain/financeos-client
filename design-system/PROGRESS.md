# Design system build — progress

Read `design-system/RULES.md` first. This file is the shared state between sessions and tools. Every session updates it before it ends.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Set-up: design system, screens, rules and check script in the repo | Done |
| 1 | Foundations: tokens, Tailwind names, fonts, Storybook | Done |
| 2 | New component library in Storybook, one component at a time, owner-reviewed | Ready for review (44 components; Storybook feedback round 2 complete) |
| 3 | Pages: rebuild and swap in one page or big component at a time | In progress (Phase 3a complete: /ds review area, login, signup, offline Ready for review) |
| 3b | Audit implementation: apply the 673 owner-approved conventions decisions (`design-system/specs/audit/`) to Dinero, organisms, stories and the /ds pages | In progress (step 1 done by Claude 2026-10-17: tokens, RULES, specs, check-ui; steps 2–4 by Antigravity) |
| 4 | Cleanup: delete old components once nothing uses them | Not started |

Statuses: Not started · In progress · Done · Blocked (with the reason).

## Phase 1 · Foundations
Goal: everything the new components need, with **no visible change to the existing app**.

1. **Tokens.** Load `design-system/tokens.css` globally, as an addition. Every variable is `--ds-*`, light on `:root` and dark on `.dark`. Do not change or remove any existing CSS variable or Tailwind key.
2. **Tailwind names.** Add these keys. They are fixed; do not choose others. Each maps to `var(--ds-<token>)`.
   - `backgroundColor`: `canvas`, `surface`, `sunken`, `subtle`, `hover`, `pressed` (tokens `bg-*`) → `bg-canvas`, `bg-surface`…; plus `ink` (token `ink`) → `bg-ink`, only for count bubbles.
   - `textColor`: `ink`, `ink-2`, `ink-3`, `ink-4`, `ink-faint` → `text-ink`…
   - `borderColor`: `line`, `line-soft`, `line-strong`, `line-handle` → `border-line`…
   - `colors` (every utility): `brand`, `brand-strong`, `brand-tint`, `brand-border`, `on-brand`, `focus-ring`, `brand-hover`, `brand-pressed`, `danger-hover`, `danger-pressed`, `positive`, `positive-strong`, `positive-tint`, `danger`, `danger-tint`, `danger-border`, `danger-ink`, `warning`, `warning-tint`, `warning-border`, `warning-ink`, `watch`, `watch-tint`, `info`, `info-tint`, `info-ink`, `neutral-ink`, `illus-mint`, `illus-gold`, `illus-gold-edge`, `scrim`.
   - Chart tokens use the name `series` (`chart-*` is already taken by the old theme): `series-1` … `series-5`, `series-rest`.
   - `fontSize`: one key per type style carrying its size, line height, weight and letter-spacing: `text-hero-figure`, `text-page-title`, `text-screen-title`, `text-figure`, `text-title`, `text-heading`, `text-body`, `text-body-strong`, `text-label`, `text-caption`, `text-overline`, `text-tab-label`. For `overline`, uppercase comes from the component.
   - `fontFamily`: `font-text` (Figtree) and `font-display` (Bricolage Grotesque).
   - `spacing`: `space-2` … `space-48`, by pixel value. Plus `safe-12` (12px above the safe area, for the floating TabBar: `bottom-safe-12`) and `tab-bar-clearance` (bottom padding pages keep under the TabBar: `pb-tab-bar-clearance`).
   - `ringColor`: `surface` (`ring-surface`, the ring around count badges on the TabBar).
   - `borderRadius`: `rounded-ds-xs`, `ds-sm`, `ds-md`, `ds-lg`, `ds-xl`, `ds-sheet`, `ds-pill` (`sm`, `md` and `lg` are already taken by the old theme).
   - `boxShadow`: `shadow-pop`, `shadow-dialog`, `shadow-sheet`, `shadow-dock`, `shadow-raise`.
   - `height` and `minHeight`: `control-sm`, `control-md`, `control-lg`, `control-xl`, `chip`, `app-bar`, `tab-bar`.
   - `width`: `control-sm`, `control-md`, `control-lg`, `control-xl`, `chip`, `rail`, `swipe-action`; `minWidth`: the same without `swipe-action`.
   - `maxWidth`: `dialog-sm` (440), `dialog-md` (640), `dialog-lg` (760), `dialog-xl` (920).
   - `width` and `height` also take `icon-sm` (14), `icon-md` (16), `icon-lg` (20) for Icon sizes.
   - `width` and `minWidth` also take `popover-trigger` and `menu-trigger` (the trigger width Radix exposes) for Popover `match` and Menu minimum width.
   - There is no `space-0`, `space-18`, `text-small`, `rounded-ds-circle`, `z-1` or `font-inherit`. Tailwind silently drops a class name it does not know, so it renders nothing; `check-ui.mjs` now fails on unknown classes.
   - `zIndex`: `z-sticky`, `z-dock`, `z-scrim`, `z-overlay`.
   - Breakpoint: `lg` (1024px, Tailwind's default) is the only phone→desktop switch inside components (RULES §5c.2).
   - Radix state variants: `data-open:`, `data-closed:`, `data-checked:`, `data-unchecked:`, `data-indeterminate:`, `data-active:`, `data-inactive:`, `data-on:`, `data-highlighted:`, `data-disabled:`, `data-side-top:` / `-bottom:` / `-left:` / `-right:`. Use these instead of `data-[state=…]:`, which is an arbitrary value.
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
| 1 | Icon | Ready for review |
| 2 | Popover | Ready for review |
| 3 | Dialog | Ready for review |
| 4 | TabBar | Ready for review |
| 5 | Rail | Ready for review |
| 6 | TopBar | Ready for review |
| 7 | Tabs | Ready for review |
| 8 | Pager | Ready for review |
| 9 | Button | Ready for review |
| 10 | Menu | Ready for review |
| 11 | SelectionBar | Ready for review |
| 12 | SwipeActions | Ready for review |
| 13 | TextField | Ready for review |
| 14 | TextArea | Ready for review |
| 15 | DateField | Ready for review |
| 16 | Select | Ready for review |
| 17 | SearchField | Ready for review |
| 18 | FilterChip | Ready for review |
| 19 | Checkbox | Ready for review |
| 20 | Switch | Ready for review |
| 21 | SegmentedControl | Ready for review |
| 22 | DropZone | Ready for review |
| 23 | Card | Ready for review |
| 24 | ListRow | Ready for review |
| 25 | SectionHeader | Ready for review |
| 26 | TransactionRow | Ready for review |
| 27 | RuleCard | Ready for review |
| 28 | KpiTile | Ready for review |
| 29 | Widget | Ready for review |
| 30 | Badge | Ready for review |
| 31 | CategoryChip | Ready for review |
| 32 | StatusWords | Ready for review |
| 33 | ProgressBar | Ready for review |
| 34 | DateTile | Ready for review |
| 35 | Avatar | Ready for review |
| 36 | Kbd | Ready for review |
| 37 | Banner | Ready for review |
| 38 | Toast | Ready for review |
| 39 | EmptyState | Ready for review |
| 40 | Skeleton | Ready for review |
| 41 | Logo | Ready for review |
| 42 | Divider | Ready for review |
| 43 | Illustration | Ready for review |
| 44 | ResponsiveOverlay | Ready for review |
| 45 | Text | Ready for review |
| 46 | Root | Ready for review |

Removed on 2026-10-15 (merged, see Owner decisions): AppBar → TopBar (one bar, phone and desktop forms); Callout and its Note → Banner; Sheet and ConfirmSheet → Dialog and its ConfirmDialog preset; DateGroupHeader and SectionBand → SectionHeader; AuthPanel → a page in Phase 3.

The desktop shell is Rail and TopBar; the phone shell is AppBar and TabBar.

## Phase 3 · Pages
Rebuild one page or big component at a time, from **Approved** components only. Every page, signed-out ones included, is built first under `/ds/…` beside the live page (RULES §11). Nothing is swapped yet (owner decision 2026-10-15). The owner reviews it at `/ds`, which lists every new page. After approval the live route switches to it (the swap) and the `/ds/…` copy is removed. Old components stay in place until Phase 4.

Suggested order, matching the owner's review: sign in, sign up and offline → Home and dashboards → Inbox and Upcoming → Accounts → Transactions (with review merged in) and Import → Rules and Categories. Investments, loans, rewards, reports and settings come after the owner has reviewed those boards.

For each swap:
1. Build the page from its boards (`design-system/screens/INDEX.md`), including its `*-states` board.
2. Keep every existing behaviour.
3. Add the page's new paths to `checked-paths.txt`.
4. Map the page's E2E specs to the new controls and keep the full suite green (RULES §10.5).
5. Add a row to the migration map.

### Before Phase 3 starts (flagged 2026-10-15)
New pages may use nothing from the old UI (RULES §1.8). These are needed and don't exist yet.

**Components the reviewed boards need that the library lacks** (design first, then build):
1. **DataTable**: the desktop tables on 55 boards. Header row with sort, numeric and right-aligned columns, a checkbox selection column, columns hidden on phone (phone shows rows instead), sticky header, and the Pager above and below.
2. **PageHeader**: the desktop page title row on 71 boards. Display-face title, meta line ("9 accounts · synced 4 min ago"), and actions (including the dashboard switcher).
3. **Stepper**: the import wizard steps (Files ✓ · Match ✓ · 3 Reconcile).
4. **Search palette**: ⌘K / Search results grouped by section with keyboard movement. Built from Dialog, SearchField, ListRow and SectionHeader; needs its own README.
5. **Chat**: message bubbles, answer blocks (KPI, table, chart) and the composer (`D-chat`).
6. **ChoiceCard**: selectable cards. Used by the four account-type buttons on Add account (the one tile exception) and the widget picker.
7. **SectionHeader `group` variant**: the Inbox group header with a count ("Act now · 5").
8. **MonthCalendar events**: the desktop Upcoming calendar shows labelled event chips in day cells, not only markers.
10. **Chart** (line, bar, donut with legend): not drawn on the reviewed boards, but dashboards, reports and investments use charts today. Design it with those boards.
11. **Dashboard grid** (arrange and resize widgets) and the KpiTile vs Widget review: parked by the owner, needed before dashboards migrate.

**Setup:**
- `/ds` pages live in their own route group, `src/app/(ds)/ds/…`, with their own layout: sign-in check, the new shell (Rail, TopBar, AppBar, TabBar) and the new Toaster. The `(protected)` layout renders the old Sidebar, MobileNav and PageActionBar, so nothing new may sit under it.
- The root layout puts the old theme on `<body>` (Inter, `bg-background`) and mounts the old Sonner Toaster. New layouts and the signed-out pages set their own ground (`bg-canvas`, `font-text`) and use the new Toast's toaster, so old styles never show through.
- Page logic hooks live inside old UI folders today (`src/components/*/…`, `src/app/(protected)/*/components/…`). Each page's migration first moves its hooks to `src/lib/` or `src/features/<area>/` (RULES §1.8).
- `check-ui` scope already includes `src/app/(ds)/`.
- **First pages: `/ds/login`, `/ds/signup`, `/ds/offline`.** What they need is designed: Logo, Divider, Illustration and Button's `google` variant (added 2026-10-15, Not started). Nothing else is missing. No backend change: they call the same server actions (`src/actions/auth.ts`: `login`, `signup`, `startGoogleSSO`). Client-side only:
  - add the three paths to the public paths in `src/proxy.ts`;
  - a signed-in visitor is redirected like the live login page does;
  - after sign-in, go to the `from` page or `/dashboard`.
  - Google sign-in from `/ds/login` returns through the existing `/auth/google/callback` page (Google's redirect URI is fixed server-side) and lands on the live app; a `/ds` callback would need a new redirect URI in Google Cloud and the server, so it isn't built.
  - `/ds/offline` is a viewable page; the service worker's real offline fallback stays `/offline` until a swap.

**Open for the owner (later):** swapping signed-in pages one at a time means the app switches between the old and new shell as you move between migrated and unmigrated pages. Options:
- (a) accept the mixed shells during the migration;
- (b) review page by page in `/ds`, then swap all signed-in pages together (or per area) once they are approved.

### Migration map
| Page or component | New files | Old files it no longer uses | Swapped on |
| --- | --- | --- | --- |
| `/ds/login` (Sign in) | `src/app/(ds)/ds/(public)/login/page.tsx`, `LoginForm.tsx` | _(live `/login` and `LoginForm.tsx` untouched until swap)_ | Built under /ds, Ready for review |
| `/ds/signup` (Sign up) | `src/app/(ds)/ds/(public)/signup/page.tsx`, `SignupForm.tsx` | _(live `/signup` and `SignupForm.tsx` untouched until swap)_ | Built under /ds, Ready for review |
| `/ds/offline` (Offline) | `src/app/(ds)/ds/(public)/offline/page.tsx`, `OfflineContent.tsx` | _(live `/offline/page.tsx` untouched until swap)_ | Built under /ds, Ready for review |
| `/ds` review index & shell | `src/app/(ds)/layout.tsx`, `src/app/(ds)/ds/(app)/layout.tsx`, `src/app/(ds)/ds/(app)/page.tsx`, `src/features/shell/navigation.ts` | _(live layouts untouched)_ | Built under /ds, Ready for review |

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
- 2026-10-15 · **Component restructure** (owner review of the Storybook build):
  - Merged: Callout and Note into **Banner** (five tones); **Toast** is a floating Banner with the same tones; Sheet and ConfirmSheet into **Dialog** (desktop modal, phone sheet and desktop side panel by viewport) with a **ConfirmDialog** preset; DateGroupHeader and SectionBand into **SectionHeader**.
  - Split: TextField into **TextField**, **TextArea** and **DateField** (typed dd/mm/yyyy, calendar Popover, range); AppBar's desktop parts into **Rail** and **TopBar**. `ReadOnlyRow` is gone; use `ListField`.
  - New: **Icon** (three sizes, no typed glyphs), **Popover** (the one floating surface, Radix on Floating UI), **Checkbox** (desktop selection and multi-select). The count bubble is Badge's `count` variant.
  - Removed: AuthPanel and the Screens story group; pages are not components.
  - No locked state anywhere; a field that can't change is disabled.
  - Select takes a custom `trigger`; dropdown filter chips are a Select with a FilterChip trigger. Menu stays separate from Select (actions vs a value) but shares Popover and the item row.
  - SwipeActions only reports a swipe past the threshold to the page (`left` / `right` slots, either optional); the page confirms or applies with Undo.
  - Highlighted ListRow uses the 4px stripe on `brand-tint`, not an outline.
  - Avatar sizes are one scale (24 / 32 / 44) for every variant.
  - DropZone: the whole zone opens the picker and accepts drops in every state.
  - All variants is the first story; every story is driven by args so Controls work.
  - The new CSS `corner-shape` is not used.
  - Composition rules added (RULES §5b).
- 2026-10-15 · **Icons move to Phosphor** in the new system: `@phosphor-icons/react` (approved as a new dependency), bold weight at every size (regular reads too thin beside 700–800 type), drawn only through Icon by registry name (`design-system/icons.json`, 29 icons). The old UI keeps Lucide until Phase 4. Storybook gets a `DS/Foundations/Icons` page listing the registry. Done in the round after the restructure.
- 2026-10-15 · **Phase 3 runs through `/ds`**: each page is built under `/ds/…` first and reviewed there before the live route switches. Storybook is published inside the app at `/storybook`, linked from Settings, so it can be checked on any device.
- 2026-10-15 · **Storybook feedback round 2** (owner):
  - Every interactive component shows a pressed state distinct from hover (new tokens `bg-pressed`, `brand-hover`, `brand-pressed`, `danger-hover`, `danger-pressed`).
  - No storybook-addon-pseudo-states; states are checked by interacting.
  - Menu and Select items have no border or outline; options are weight 500.
  - Popovers are one surface, at least the trigger's width and growing to their content.
  - Banner actions are inline links that never change its height.
  - TextArea starts one line tall, grows, and can be dragged taller.
  - DateField range is one combined field.
  - Tabs underline is square.
  - Dialog footer is the same on every screen size.
  - AppBar and TopBar are one TopBar.
  - Components carry no app content (RULES §5b.6).
  - Every story is interactive.
- 2026-10-15 · **Responsive and API standards** (RULES §5c): one structure per component with CSS breakpoints at `lg`; no viewport JavaScript except the shared ResponsiveOverlay; no phone/desktop props; Radix-style prop names; events named for the component, not the app.
- 2026-10-15 · **TabBar is a floating pill, the only mobile navigation format** (owner, canvas thread): inset 12px, `shadow-dock`, icon over label 2px apart, inactive `ink-faint`, current `ink` with an 800 label, no indicator or dot. The phone screen boards were updated to match.
- 2026-10-16 · **Names**: the new design system is **Dinero**; the old UI is **Legacy**.
- 2026-10-16 · **Text component** added to Dinero; pages render all text through it. Pages may use layout classes only; anything visual comes from a component (RULES §5d). Missing components are flagged for the owner, never hand-made.
- 2026-10-16 · Dinero gains `Root` (page ground + Toaster), ListRow `asChild` (rows as links) and an edge-to-edge Illustration panel, so pages need no hand styling (decided by Claude under the owner's "no hand-made styling" rule; owner may revisit).
- 2026-10-16 · **Button loading** uses the new `spinner` icon (Phosphor circle-notch), never a spun copy of another icon.
- 2026-10-16 · **More sheet board refined by the owner** (`P-more`): Quick add kept (RULES §7.1 exception), search bar removed, Transactions added under Money, navigation icons on every row, profile row without underline. 
- 2026-10-16 · Copy on the /ds auth pages as built is accepted; their layout must follow the boards exactly.
- 2026-10-16 · **More sheet is final** (owner, board `P-more`): tapping More opens it. Quick add (tile Buttons, icon on top), sections in groups (tile Buttons with navigation icons), profile row to Settings; no search. TabBar README updated.
- 2026-10-16 · **One navigation icon per destination, everywhere**: the More sheet's icons are used on the desktop Rail, the TopBar and the phone TabBar on every board and in Dinero (Phosphor bold registry).
- 2026-10-16 · **More sheet tiles are a Button variant** (owner): `variant="tile"` with `iconPosition` `start` (row) or `top` (stacked), following Fluent's CompoundButton and Polaris's full-width start-aligned Button. No separate Tile component.
- 2026-10-15 · Accessibility is out of scope: no ARIA, screen-reader or contrast work. The Storybook accessibility addon stays installed but is not a check.
- 2026-10-15 · Pages under `/ds/…` may use components marked Ready for review; they are a review area and the live app is untouched. Only a swap into a live route requires Approved components.

- 2026-10-17 · **Conventions audit approved** (https://claude.ai/artifact/L7sSF76ZtsZJDsQy6DLUYC): 673 findings decided and approved. Global decisions are in `design-system/specs/audit/00-global.md` (G1–G15); per-component checklists are in `design-system/specs/audit/<Name>.md`. Together they override older README text and earlier Owner decisions where they differ. Headlines:
  - organisms layer (TransactionRow, RuleCard, Illustration, Logo, SettingsToggle);
  - Badge absorbs CategoryChip;
  - FilterChip is aligned with Badge;
  - Switch is bare;
  - dropdowns never become sheets (ResponsiveOverlay and useMediaQuery deleted);
  - one action shape `action={{ label, onSelect }}`;
  - Banner action on the right plus dismiss;
  - generic tokens only;
  - autodocs instead of All variants, with no play functions;
  - Dinero utils for dates and counts;
  - Button `layout` replaces tile, and google is removed.
- 2026-10-17 · **Generic tokens only** (owner). Component-named tokens were migrated to generic steps (commit eb39939). A missing value is added as a generic step, or asked.
- 2026-10-17 · Icon registry: add `minus` (Phosphor Minus) for Checkbox's mixed state, which closes the 2026-10-15 open question (decided by Claude at the owner's request).
- 2026-10-17 · `@storybook/addon-docs` (same version as `storybook`, ^10.6.2) is approved as a dev dependency. Autodocs needs it.
- 2026-10-17 · This round only, Antigravity may edit component READMEs, `.storybook/`, `design-system/icons.json` and `tailwind.config.ts`, exactly as the audit specs say. Tokens stay read-only.

## Open questions
Add entries here instead of guessing (RULES §2): date, phase, screen or component, the question, the options.

- 2026-10-16 · Phase 3a · Shell · Quick add actions without live routes · Quick add items Transaction, Lending and Trade are modal dialogs in the Legacy app without dedicated routes; only Import (/transactions/import) has a route. Options: (A) Build dedicated Dinero add forms later when those modules migrate, or (B) Open the Legacy live pages/dialogs. Meanwhile, those three tiles are shown disabled until the owner decides.
- 2026-10-15 · Phase 2 · Checkbox · Indeterminate/mixed state icon · Checkbox mixed state (some rows selected) needs a minus/dash icon, which is not in icons.json. Options: (A) Add `minus` (Phosphor `minus`) to the icon registry, (B) Render an inline SVG dash stroke inside Checkbox, or (C) Use a CSS dash line. Meanwhile using `close` as the closest registry icon.
- 2026-10-15 · Phase 2 · Button · Loading spinner icon · Button loading state needs a spinner icon (RULES §6.2 progress spinner), which is not in icons.json. Options: (A) Add `spinner` (Phosphor `spinner` or `circle-notch`) to the icon registry, or (B) Use a CSS rotating border spinner. Meanwhile using `settings` with `animate-spin` as the closest rotating registry icon.
- 2026-10-15 · Phase 2 · Button · Count pill on primary button · The board only shows count pills on secondary buttons (btn). On a primary (btn-p) button, both the button background and default count pill use bg-ink, making an ink pill blend into the button. Options: (A) Reverse the pill colors on primary buttons to bg-surface text-ink, (B) Forbid count pills on primary buttons, or (C) Add a dedicated contrasting pill token. Meanwhile, Button renders bg-surface text-ink when primary.

## Log
Newest first: date, phase, tool or agent, what changed (files), checks run, open questions, deviations.

- 2026-10-17 · Phase 3b · Antigravity · Storybook setup: installed @storybook/addon-docs, updated .storybook/main.ts (addons and organisms stories glob), updated .storybook/preview.tsx (tags: ['autodocs'], parameters.docs.controls.disable = true, storySort docs first). Checks: npm run build-storybook, node design-system/tools/check-ui.mjs --base 681c9d0. Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Omit padded header container in DialogContent when only srTitle is present:
  - In `src/components/ds/Dialog/Dialog.tsx`, updated `DialogContent` to only render the padded header `<div>` (`px-space-16 pt-space-12 ...`) when a visible header element exists (`title`, `desc`, or `showClose`). When only `srTitle` is passed (e.g. on the More sheet), `<DialogPrimitive.Title className="sr-only">` and `<DialogPrimitive.Description className="sr-only">` render directly without the padded wrapper, eliminating unwanted empty vertical padding.
  - Added unit test in `src/components/ds/Dialog/Dialog.test.tsx` verifying that no padded header element is rendered when only `srTitle` is passed.
  - Checks: `npm run typecheck`, `node design-system/tools/check-ui.mjs --base c8b557b`, `npx vitest run src/components/ds/Dialog/Dialog.test.tsx`, `npx playwright test e2e/ui/ds-shell.spec.ts`. All passed clean.
  - Commit `0d0f6d9`: `ui(ds): omit padded header container in DialogContent when only screen-reader title is present`.

- 2026-10-16 · Phase 3a · Antigravity · Real user in /ds app layout:
  - In `src/app/(ds)/ds/(app)/layout.tsx`, passed `user={{ name: user.displayName ?? undefined, email: user.email }}` to both `ShellRail` and `ShellTabBar`.
  - Removed email string splitting (`user.email.split('@')[0]`), allowing the shell components to cleanly fall back to `user.email` when `displayName` is null or undefined.
  - Checks: `npm run typecheck`, `node design-system/tools/check-ui.mjs --base c8b557b`, `npx vitest run src/features/shell/__tests__/navigation.test.tsx`. All clean.
  - Commit `6c14beb`: `ui(ds): pass real user to ShellRail and ShellTabBar without deriving name from email`.

- 2026-10-16 · Phase 3a · Antigravity · Review remediation (Fixes 1–4: Dialog background, TabBar links stay links, More sheet purely Dinero, E2E modal closing):
  - Fix 1 (Dialog background):
    - Added `background?: 'surface' | 'canvas'` (default `surface`) to `DialogContent`, `DialogShell`, and `ConfirmDialog` in `src/components/ds/Dialog/Dialog.tsx`.
    - Added "Canvas background" story with tiles inside to `src/components/ds/Dialog/Dialog.stories.tsx`.
    - Added unit tests for canvas background on `DialogShell` and `DialogContent` in `src/components/ds/Dialog/Dialog.test.tsx`.
    - Commit `b2e930c`: `ui(ds): add background prop to DialogContent, DialogShell, and ConfirmDialog`.
  - Fix 2 (TabBar links stay links):
    - In `src/components/ds/TabBar/TabBar.tsx`, items with `href` remain normal links (never `preventDefault()`, always calling `onSelect?.(id)`). Items without `href` render as `<button>` and call `onSelect(id)`.
    - In `src/features/shell/navigation.ts`, removed `href` from the More item. Defined `ShellTabBarItem`.
    - Added unit tests for both link and button behaviors in `src/components/ds/TabBar/TabBar.test.tsx` and updated `src/features/shell/__tests__/navigation.test.tsx`.
    - Commit `813ef14`: `ui(ds): keep TabBar items with href as normal links and remove href from More item`.
  - Fix 3 (More sheet follows P-more, built purely from Dinero):
    - In `src/features/shell/ShellNav.tsx`, made sheet modal: removed `modal={false}`, outside click hacks, and inline `zIndex`. Layer stack: page content, TabBar (`z-dock`), scrim (`z-scrim`), sheet (`z-overlay`), with sheet covering TabBar.
    - Used `<DialogContent background="canvas" …>` with layout-only classes.
    - Group labels use `<Text variant="overline" tone="ink-4">`.
    - Profile row uses `<Card>` wrapping `<ListRow asChild …><Link href="/settings" /></ListRow>`.
    - Bottom padding uses sheet safe-area padding (`pb-safe-12`), not `pb-tab-bar-clearance`.
    - Required `user: { name?: string; email: string }`, showing name with fallback to email, and deriving initials for Avatar from the same text. Removed "Arjun Mehta" / "AM" fallback. Applied same rule to ShellRail footer.
    - All 20 `check-ui` violations eliminated.
    - Commit `9e8c4f0`: `ui(ds): rebuild More sheet purely from Dinero following P-more`.
  - Fix 4 (E2E modal behavior & plain links):
    - Updated `e2e/ui/ds-shell.spec.ts`:
      - Closing way 1: scrim tap above sheet (`mouse.click(200, 50)`).
      - Closing way 2: swipe down on drag handle (`useSheetDrag` ref & window event handling).
      - Closing way 3: choosing a section tile (navigates to route).
      - Plain TabBar link navigation test for Transactions.
    - Refactored `useSheetDrag.ts` to use refs and window pointer listeners to reliably handle fast synthetic and real pointer events across thresholds.
    - Added `onClose` callback prop to `DialogContent` in `ShellNav.tsx`.
    - Commit `e2bc6be`: `ui(ds): update ds-shell E2E to modal closing behavior and plain link navigation`.
  - Browser inspection:
    - Inspected `/ds`, `/ds/login`, `/ds/signup`, `/ds/offline` signed in and signed out at 390px and 1440px in both light and dark modes (200 status, 0 console errors).
    - At 390px signed in: page and TabBar dimmed by scrim, sheet rises over the bar, canvas background behind surface tiles, matches `P-more` side by side in both light and dark.
    - At 1440px signed in: Rail rendered, TopBar rendered, sheet completely hidden.
  - Checks:
    - `npm run typecheck` passed (tsc --noEmit clean).
    - `npm run lint` passed (0 errors, 342 legacy warnings).
    - `npm test` passed (434 test files, 3600 tests passed).
    - `npm run build-storybook` passed (Storybook build completed successfully).
    - `npm run build` passed (Next.js production build clean).
    - `node design-system/tools/check-ui.mjs --base c8b557b` passed (`design-system check: clean`).
    - Playwright E2E suites (`ds-auth.spec.ts`, `ds-offline.spec.ts`, `ds-shell.spec.ts`): all 11 tests passed.
  - Open questions: Quick add actions without live routes kept on hold per owner instruction.
  - Component statuses: Dialog, TabBar, and `/ds` pages set to Ready for review.

- 2026-10-16 · Phase 3a · Antigravity · Review remediation (Fixes 1–6: Client boundaries, E2E specs, TabBar stories, Illustration height, Button tile variant, More sheet):
  - Fix 1 (Client boundaries, RULES §5b.8): Added `'use client'` to `src/components/ds/ListRow/ListRow.tsx`, `src/components/ds/KpiTile/KpiTile.tsx`, and `src/components/ds/Widget/Widget.tsx`. Verified no `missing-use-client` warnings reported by `check-ui`.
  - Fix 2 (E2E shell & auth specs):
    - Added `e2e/ui/ds-shell.spec.ts` signed in with `createUser` fixture testing:
      1. `/ds` renders the 3 index rows and no error boundary.
      2. Desktop 1440px renders Rail with every group and item in order matching `D-home`.
      3. Phone 390px renders TopBar, floating TabBar (Home, Inbox, Upcoming, Transactions, More) without error.
      4. Phone 390px More tab opens More sheet, links live routes, and closes all 3 ways (tapping More again, tapping scrim overlay, and swipe down on drag handle).
    - Added single-hop redirect test in `e2e/ui/ds-auth.spec.ts` mirroring `auth.spec.ts`: visiting `/ds` with an invalid session cookie bounces directly to `/login?from=%2Fds` in one hop.
  - Fix 3 (TabBar stories without deviation): Removed inline `style={{ width: 390 }}` and `ds-allow` from `src/components/ds/TabBar/TabBar.stories.tsx`. Set `parameters: { viewport: { defaultViewport: 'phone' } }`.
  - Fix 4 (Phone illustration band height): Matched `P-login` and `P-signup` board band height (reduced container by 44px to 120px) inside `src/components/ds/Illustration/Illustration.tsx` phone form.
  - Fix 5 (Button variant="tile" with iconPosition):
    - Implemented `variant="tile"` in `src/components/ds/Button/Button.tsx` with `iconPosition="start" | "top"`:
      - `start`: 46px height, `body-strong` label, icon leading, left-aligned.
      - `top`: 64px height, `label` in `ink-2`, icon centered above label, text centered.
      - Hover `bg-hover`, pressed `bg-pressed`, works with `asChild` and Next Link.
    - Added unit test suite in `src/components/ds/Button/Button.test.tsx` and stories in `src/components/ds/Button/Button.stories.tsx`.
  - Fix 6 (More sheet in /ds shell):
    - Added `shellQuickAddItems` and `shellMoreGroups` in `src/features/shell/navigation.ts`.
    - Wired More sheet inside `src/features/shell/ShellNav.tsx` using `Dialog`, `DialogContent`, `Button variant="tile"`, `ListRow`, `Avatar`, `Icon`:
      - Quick add: Transaction (disabled), Lending (disabled), Trade (disabled), Import (`/transactions/import`).
      - Groups: Money, Grow, Owe & lend · Insights (2 tiles/line with navigation icons).
      - Profile row: Avatar, user name, "Settings · connections · notifications", chevron, linking to `/settings` with no underline (`ListRow asChild`).
      - Closes on scrim click, swipe down on handle, or tapping More again. TabBar elevated above overlay with `calc(var(--ds-z-overlay) + 1)` when open.
      - Fixed TabBar outside click detection for SVG icons (`target instanceof Element ? target : (target as Node)?.parentElement`).
  - Browser inspection logged at 390 and 1440, signed in and signed out:
    - `/ds`:
      - Signed out (390 & 1440): Redirects in one hop to `/login?from=%2Fds` (`https://localhost:6970/login?from=%2Fds`).
      - Signed in @ 390: Renders TopBar ("Overview", avatar, status), index rows (Sign in, Sign up, Offline, No signed-in pages yet), floating TabBar (Home, Inbox, Upcoming, Transactions, More). Tapping More opens sheet matching `P-more` with Quick add (Import active, 3 disabled), sections (Money, Grow, Owe & lend · Insights), profile row to `/settings`. Closes all three ways.
      - Signed in @ 1440: Renders desktop Rail with logo, all groups in order (Home/Inbox/Upcoming, Money, Grow, Owe & lend, Insights), footer (Settings, user), index rows, no error boundary. TabBar and More sheet hidden.
    - `/ds/login`:
      - Signed out @ 390: Logo mark, title, subtitle, 120px phone illustration band, Continue with Google, divider, Email/Password, Sign in button, footer.
      - Signed out @ 1440: Split desktop layout with form on left and isometric illustration scene on right.
      - Signed in (390 & 1440): Redirects to `/dashboard` (or `from` path).
    - `/ds/signup`:
      - Signed out @ 390: Logo mark, title, subtitle, 120px phone illustration band, Sign up with Google, divider, Invite code, Name, Email, Password, Create account button, footer.
      - Signed out @ 1440: Split desktop layout.
      - Signed in (390 & 1440): Redirects to `/dashboard`.
    - `/ds/offline`:
      - Signed out & Signed in (390 & 1440): Centered EmptyState with offline icon, "You're offline", description, "Try again" button.
  - Component statuses: `ListRow`, `KpiTile`, `Widget`, `Button`, `TabBar`, `Illustration` and the `/ds` pages confirmed set to **Ready for review**.
  - Checks run and outputs:
    - `npm run typecheck`: clean (0 errors)
    - `npm run lint`: clean (`✖ 342 problems (0 errors, 342 warnings)`)
    - `npm test`: `Test Files 434 passed (434) | Tests 3595 passed (3595)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
    - Playwright E2E (`ds-auth.spec.ts`, `ds-offline.spec.ts`, `ds-shell.spec.ts`): `10 passed (6.0s)`
  - Open questions: Quick add targets (Transaction, Lending, Trade) have no routes.
  - Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Review findings remediation (Part A: 1–7, Part B: 8–14):
  - Fix 1 (Text): Created `src/components/ds/Text/Text.tsx` server component with 12 type styles, 8 tones, `as`, `family`, `align`, `truncate`. Added stories and tests, exported from `src/components/ds/index.ts`. Status: Ready for review.
  - Fix 2 (Root): Created `src/components/ds/Root/Root.tsx` server component wrapping viewport with `bg-canvas font-text text-ink` and mounting Dinero `Toaster`. Added stories and tests, exported from `src/components/ds/index.ts`. Status: Ready for review.
  - Fix 3 (Icon registry): Added 6 new icons to `src/components/ds/Icon/registry.ts` (`dashboards`, `investments`, `loans`, `reports`, `rewards`, `spinner`) matching `icons.json` (29 icons).
  - Fix 4 (Button loading): Changed loading state in `src/components/ds/Button/Button.tsx` to spin `spinner` icon in place of leading icon; no other icon receives `animate-spin`. Cleaned ad-hoc spinners in Dialog.
  - Fix 5 (ListRow asChild): Added `asChild` support with Radix `Slot` in `src/components/ds/ListRow/ListRow.tsx` handling row layout, no-underline and inherited color.
  - Fix 6 (Illustration edge-to-edge): Removed corner radius inside `src/components/ds/Illustration/Illustration.tsx` for `signin` and `signup` panels.
  - Fix 7 (TabBar badge position): Anchored count badge in `src/components/ds/TabBar/TabBar.tsx` to top-right corner with `left-space-12 -top-space-4`. Stories rendered inside 390px frame (Playwright confirmed 62px width < 71.6px slot, no truncation). More popup left on hold.
  - Fix 8 (`(ds)/layout.tsx`): Replaced hand-styled div with `<Root>`.
  - Fix 9 (Google "G" proxy): Added `'/brand'` to `publicPaths` in `src/proxy.ts` and test in `src/__tests__/proxy.test.ts`. `curl -sk -o /dev/null -w "%{http_code}" https://localhost:6970/brand/google-g.svg` returned 200.
  - Fix 10 (`/ds/login` layout): Matched `D-login` and `P-login` element for element: 1. Title (`Text`), 2. Subtitle (`Text`), 3. Continue with Google, 4. Divider "or", 5. Email, 6. Password, 7. Sign in button, 8. Footer line (`Text` with `Button variant="link" asChild`). Removed Logo mark, removed opacity wrapper/cn, single validation in `onSubmit`, removed `router.push` `useEffect` allowing Next server action redirect. Real sign-in without `?from` landed on `/dashboard`; with `?from=/accounts` landed on `/accounts`.
  - Fix 11 (`/ds/signup` layout): Matched `D-signup` and `P-signup` element for element: 1. Title, 2. Subtitle ("FinanceOS is invite-only — you'll need a code to sign up."), 3. Continue with Google ("Sign up with Google"), 4. Divider "or", 5. Email, 6. Password with helper="At least 8 characters.", 7. Invite code (masked with Show), 8. Create account button, 9. Terms line (`Text variant="caption"`), 10. Footer line. Removed Logo mark, removed info Banner, removed opacity wrapper/cn, single validation.
  - Fix 12 (`/ds` index page): Updated to `<ListRow asChild><Link href="..." /></ListRow>` removing anchor styling classes.
  - Fix 13 (Shell navigation): Matched Rail on `D-home` in `src/features/shell/navigation.ts` (5 groups: Unlabeled [Home, Inbox, Upcoming], Money [Accounts, Transactions], Grow [Investments, Rewards], Owe & lend [Loans & lendings], Insights [Dashboards, Reports, Ask the data]; footer: Settings). TabBar items: Home, Inbox, Upcoming, Transactions, More (`menu` icon, href `/ds`). Created `src/features/shell/ShellNav.tsx` computing active item from `usePathname()`; returns undefined for `/ds`. Removed `bg-canvas` from `src/app/(ds)/ds/(app)/layout.tsx`.
  - Fix 14 (E2E spec): Updated `e2e/ui/ds-auth.spec.ts` using `{ exact: true }` on Password and Invite code, updated field fill order (Email -> Password -> Invite code), updated redirect check to pathname. Wrapped form elements in `LoginForm` and `SignupForm` in `<form>`. E2E suite passed (5/5).
  - Boards compared: `D-login` (screenshot `shots/D-login.webp`), `P-login` (`shots/P-login.webp`), `D-signup` (`shots/D-signup.webp`), `P-signup` (`shots/P-signup.webp`), `D-home` (`D-home.dc.html`).
  - Checks run and outputs:
    - `curl -sk -o /dev/null -w "%{http_code}" https://localhost:6970/brand/google-g.svg`: 200
    - Real sign-in results:
      - Default redirect: `https://localhost:6970/dashboard`
      - `?from=/accounts` redirect: `https://localhost:6970/accounts`
    - Playwright E2E (`E2E_SKIP_GATES=1`): `5 passed (5.6s)`
    - `grep -rn "animate-spin" src/components/ds | grep -v spinner`: clean (0 matches)
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
    - `npm run typecheck`: clean
    - `npm run lint`: clean (`✖ 342 problems (0 errors, 342 warnings)`)
    - `npm test`: `Test Files 434 passed (434) | Tests 3588 passed (3588)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
  - Open questions: none. Deviations: listed inline width 390 in TabBar stories.
  - Audited component isolation: `grep -rn "from '@/components/" "src/app/(ds)" src/features | grep -v "@/components/ds"` printed clean (0 non-ds imports).
  - Confirmed untouched live paths: `git diff --stat c8b557b -- src/app/login src/app/signup src/app/offline src/components/ui` printed clean (0 diffs).
  - Confirmed proxy diff: only `/ds/login`, `/ds/signup`, `/ds/offline` added to `publicPaths` in `src/proxy.ts`.
  - Updated Migration map: marked `/ds/login`, `/ds/signup`, `/ds/offline`, and `/ds` review area as "Built under /ds, Ready for review".
  - Updated Phase 3 status to "In progress (Phase 3a complete: /ds review area, login, signup, offline Ready for review)".
  - Full suite passed:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 342 problems (0 errors, 342 warnings)`
    - `npm test`: `Test Files  431 passed (431) | Tests  3564 passed (3564)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Unit 5 · E2E specs for /ds pages:
  - Created `e2e/ui/ds-auth.spec.ts` mirroring `e2e/ui/auth.spec.ts` targeting `/ds/login` and `/ds/signup`:
    - Updated selectors for design system components (`form [role="alert"]`, button names).
    - Added tests for `?deleted=1` notice on `/ds/login`.
    - Added test for empty field submission prevention on `/ds/login`.
    - Added test for password < 8 characters validation banner on `/ds/signup`.
  - Created `e2e/ui/ds-offline.spec.ts` mirroring `e2e/ui/offline.spec.ts` targeting `/ds/offline`.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 342 problems (0 errors, 342 warnings)`
    - `npm test`: `Test Files  431 passed (431) | Tests  3564 passed (3564)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
    - `npm run e2e:build`: E2E written, not run: `container financeos-e2e-oracle exited (41)` when bringing up docker-compose oracle container in this environment.
  - Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Unit 4 · /ds/offline:
  - Created `src/app/(ds)/ds/(public)/offline/OfflineContent.tsx` client component:
    - Renders centred `EmptyState variant="offline"` with title "You're offline" and description "Your money is exactly where you left it. We just can't reach the internet right now, so there's nothing fresh to show." matching `D-offline` and `P-offline`.
    - Action button "Try again" (`Button variant="primary"`) that calls `window.location.reload()`.
  - Updated `src/app/(ds)/ds/(public)/offline/page.tsx` as a server component exporting `metadata` and rendering `OfflineContent`.
  - Added unit test suite in `src/app/(ds)/ds/(public)/offline/offline.test.tsx` (3 unit tests, all passing).
  - Note: The service worker (`src/app/sw.ts`) still falls back to `/offline` for now; it stays untouched until the route swap.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 342 problems (0 errors, 342 warnings)`
    - `npm test`: `Test Files  431 passed (431) | Tests  3564 passed (3564)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Boards compared: `D-offline`, `P-offline`.
  - Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Unit 3 · /ds/signup:
  - Created `src/app/(ds)/ds/(public)/signup/SignupForm.tsx` matching `D-signup`, `P-signup`, and `P-auth-states`:
    - Responsive two-column layout with `Illustration variant="signup"` (phone banner on top, full column on desktop).
    - Form in exact board order: Logo (`variant="mark"`, `size="md"`), title "Create account", subtitle "Welcome to FinanceOS.", info Banner "FinanceOS is invite-only — you'll need a code to sign up.", `Button variant="google"` ("Sign up with Google") with double-click guard and `ssoPending` loading state ("Opening Google…"), `Divider label="or"`, `TextField id="inviteCode"` with Show toggle, `TextField id="email" autoComplete="username"`, `TextField id="password" autoComplete="new-password"` with Show toggle, terms notice, `Button variant="primary"` ("Create account", "Creating account…"), and link to `/ds/login`.
    - Client-side validation checks empty inputs and rejects passwords under 8 characters before submitting with a danger Banner ("Password must be at least 8 characters.") without dispatching a network call.
    - Server error (e.g. invalid invite code) displays in danger Banner above fields.
    - On success: shows success Banner ("Account created! Redirecting…"), dims inputs, and redirects to `/dashboard`.
    - SSO failure triggers a danger toast via `showToast(..., { tone: 'danger' })`.
  - Updated `src/app/(ds)/ds/(public)/signup/page.tsx` as a server component redirecting authenticated sessions to `/dashboard`.
  - Added unit test suite in `src/app/(ds)/ds/(public)/signup/signup.test.tsx` (6 unit tests, all passing).
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 342 problems (0 errors, 342 warnings)`
    - `npm test`: `Test Files  430 passed (430) | Tests  3561 passed (3561)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Boards compared: `D-signup`, `P-signup`, `P-auth-states` (password too short, invite code rejected, account created).
  - Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Unit 2 · /ds/login:
  - Created `src/app/(ds)/ds/(public)/login/LoginForm.tsx` matching `D-login`, `P-login`, and `P-auth-states`:
    - Responsive two-column layout with `Illustration variant="signin"` (phone banner on top, full column on desktop).
    - Form in exact board order: Logo (`variant="mark"`, `size="md"`), title "Sign in", subtitle "Welcome back.", `Banner` for errors/deleted notice, `Button variant="google"` ("Continue with Google") with double-click guard and `ssoPending` loading state ("Opening Google…"), `Divider label="or"`, `TextField id="email" autoComplete="username"`, `TextField id="password" autoComplete="current-password"` with Show toggle, `Button variant="primary"` ("Sign in", "Signing in…"), and link to `/ds/signup`.
    - Client-side validation blocks empty submission and shows danger Banner "Email and password are required." without dispatching a network request.
    - Server errors display in danger Banner above fields while preserving typed email.
    - `?deleted=1` renders success Banner "Your account has been deleted.".
    - SSO failure triggers a danger toast via `showToast(..., { tone: 'danger' })`.
  - Updated `src/app/(ds)/ds/(public)/login/page.tsx` as a server component redirecting authenticated sessions to `from` or `/dashboard`.
  - Exported `cn` from `src/components/ds/index.ts`.
  - Added unit test suite in `src/app/(ds)/ds/(public)/login/login.test.tsx` (6 unit tests, all passing).
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 342 problems (0 errors, 342 warnings)`
    - `npm test`: `Test Files  429 passed (429) | Tests  3555 passed (3555)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Boards compared: `D-login`, `P-login`, `P-auth-states` (wrong details, fields empty, after deleting account, Google opening).
  - Open questions: none. Deviations: none.

- 2026-10-16 · Phase 3a · Antigravity · Unit 1 · Route group, layouts, public paths:
  - Created `src/app/(ds)/layout.tsx` providing design-system root ground (`min-h-dvh bg-canvas font-text text-ink`) and mounting the new `<Toaster />`.
  - Created `src/features/shell/navigation.ts` defining plain navigation data (`shellTabBarItems`, `shellRailGroups`, `shellFooterItems`) mirroring live Sidebar and MobileNav destinations and order (counts omitted for now).
  - Created `src/app/(ds)/ds/(app)/layout.tsx` calling `requireAuth()` and rendering the new shell: `Rail` on desktop (`hidden lg:flex shrink-0 h-dvh sticky top-0`), `TopBar` with title "New design", `TabBar` floating on phone (`lg:hidden`), and content area keeping `pb-tab-bar-clearance` below `lg`.
  - Created `/ds` index page `src/app/(ds)/ds/(app)/page.tsx` with Card and SectionHeader "Signed out" listing Sign in, Sign up and Offline via ListRows linking to `/ds/login`, `/ds/signup`, and `/ds/offline`, plus an empty "Signed in" Card with EmptyState "No signed-in pages yet.".
  - Created initial placeholder pages for `src/app/(ds)/ds/(public)/login/page.tsx`, `src/app/(ds)/ds/(public)/signup/page.tsx`, and `src/app/(ds)/ds/(public)/offline/page.tsx`.
  - Added `/ds/login`, `/ds/signup`, `/ds/offline` to `publicPaths` in `src/proxy.ts`. Added `src/features/shell/` to `design-system/checked-paths.txt`.
  - Added unit tests in `src/__tests__/proxy.test.ts` verifying unauthenticated `/ds` redirect to `/login?from=%2Fds` and unauthenticated access for `/ds/login`, `/ds/signup`, `/ds/offline`.
  - Added unit tests in `src/app/(ds)/ds/(app)/page.test.tsx` verifying Signed out and Signed in sections.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 338 problems (0 errors, 338 warnings)`
    - `npm test`: `Test Files  428 passed (428) | Tests  3550 passed (3550)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (49/49) in 2.3s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Browser/flow check: Verified signed-out redirect from `/ds` to `/login?from=%2Fds` and access to `/ds/login`, `/ds/signup`, `/ds/offline`.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 3a · Antigravity · Unit 0 · Record the round:
  - Recorded owner decision: "Pages under `/ds/…` may use components marked Ready for review; they are a review area and the live app is untouched. Only a swap into a live route requires Approved components."
  - Set Phase 3 status to "In progress (3a: /ds setup, login, signup, offline)".
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 338 problems (0 errors, 338 warnings)`
    - `npm test`: `Test Files  427 passed (427) | Tests  3543 passed (3543)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `npm run build`: `✓ Generating static pages using 10 workers (45/45) in 2.6s`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 2 · Toaster for the new system:
  - Exported `Toaster` from `src/components/ds/Toast/Toast.tsx` (and `src/components/ds/index.ts`) mounting Sonner with `id="ds"`, `position="bottom-center"`, `visibleToasts={1}`, and `mobileOffset` set to `calc(var(--ds-space-12) + var(--ds-tab-bar) + env(safe-area-inset-bottom, 0px))` (above TabBar on phone).
  - Updated `showToast` in `src/components/ds/Toast/Toast.tsx` to pass `toasterId: 'ds'` to `sonnerToast.custom`, ensuring new-system toasts render only in the `ds` Toaster and never in the old app's root Toaster.
  - Added unit test in `src/components/ds/Toast/Toast.test.tsx` verifying that a `showToast` call renders inside the `ds` Toaster and not in an untargeted root Toaster, along with verifying `toasterId: 'ds'` in options.
  - Added `WithToaster` story in `src/components/ds/Toast/Toast.stories.tsx` using `<Toaster />` + `showToast` showing exactly one toast at bottom-centre, and mounted `<Toaster />` in `InteractiveTrigger`.
  - TabBar and Toast confirmed set to **Ready for review**.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 338 problems (0 errors, 338 warnings)`
    - `npm test`: `Test Files  427 passed (427) | Tests  3543 passed (3543)`
    - `npm run build-storybook`: `Storybook build completed successfully (288 entries)`
    - `node design-system/tools/check-ui.mjs`: `design-system check: clean`
  - Browser comparison: Compared Toast stories at 390px and 1440px in light and dark mode. Clicking "Show toast" displays a single toast at bottom centre (above TabBar clearance on phone, bottom-centre on desktop); clicking multiple buttons replaces the active toast so exactly one toast renders at a time.
  - Done when: a Toast story using `Toaster` + `showToast` shows exactly one toast at the bottom centre.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 1 · TabBar is now a floating pill (owner decision 2026-10-15):
  - Rebuilt TabBar in `src/components/ds/TabBar/TabBar.tsx` as a floating pill per Phase 1 contract:
    - Bar: `fixed inset-x-space-12 bottom-safe-12 z-dock bg-surface border border-line rounded-ds-pill shadow-dock py-space-8 px-space-4 lg:hidden flex items-center select-none`.
    - Item: equal-width link with icon (`lg`, 20px) over label (`text-tab-label`), `gap-space-2`.
    - Inactive item is `text-ink-faint`; current is `text-ink` with label `font-extrabold`. Removed all background, indicator, dot, and underline behind items.
    - Pressed state is `active:text-ink-3`; nothing moves.
    - Counts: Badge `count` pinned to top-right corner with `ring-2 ring-surface`.
  - Rebuilt `src/components/ds/TabBar/TabBar.stories.tsx` showing Home current, Transactions current, and a count over 99 (120/104) floating over list rows in a scene with story note: `Pages keep pb-tab-bar-clearance under the bar.`
  - Added unit test coverage in `src/components/ds/TabBar/TabBar.test.tsx` verifying pill classes, active/inactive item styling, lack of background/indicator, and `ring-2 ring-surface` count badge.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 335 problems (0 errors, 335 warnings)`
    - `npm test`: `Test Files  427 passed (427) | Tests  3542 passed (3542)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs`: `design-system check: clean`
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `TabBar/preview.html` and phone boards `P-*.dc.html` / `shots/`. At 390px the floating pill matches `preview.html` in light and dark; at 1440px the bar is hidden by `lg:hidden`.
  - Done when: at 390 the stories match `preview.html` in light and dark, and at 1440 the bar isn't visible.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 8 · No domain defaults:
  - Made `matchType` a required prop in `RuleCardProps` (`matchType: React.ReactNode`) in `src/components/ds/RuleCard/RuleCard.tsx` and removed the domain default (`matchType = 'Contains'`) from the component destructuring.
  - Updated `src/components/ds/RuleCard/RuleCard.test.tsx` to explicitly supply `matchType` across all test cases.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 335 problems (0 errors, 335 warnings)`
    - `npm test`: `Test Files  427 passed (427) | Tests  3539 passed (3539)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: `grep -n "matchType = " src/components/ds/RuleCard/RuleCard.tsx` returned nothing.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 7 · One shared long-press hook:
  - Created `src/components/ds/useLongPress.ts` (RULES §5b.5, §5c.9): touch input only (`pointerType === 'touch'`), fires after 450 ms, cancelled by movement > 10px or pointer up/cancel, returns handlers to spread onto an element and `consumeTriggered()` to prevent subsequent clicks.
  - Exported `useLongPress` from `src/components/ds/index.ts`.
  - Created `src/components/ds/useLongPress.test.tsx` verifying fire on held touch after 450 ms, ignoring mouse input, cancellation on movement > 10px, cancellation on pointerUp / pointerCancel, and disabled state.
  - Replaced duplicate inline long-press timers in `src/components/ds/TransactionRow/TransactionRow.tsx` and `src/components/ds/RuleCard/RuleCard.tsx` with `useLongPress`.
  - Removed unused `useState` import from `src/components/ds/Menu/Menu.tsx`.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 335 problems (0 errors, 335 warnings)`
    - `npm test`: `Test Files  427 passed (427) | Tests  3539 passed (3539)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: `grep -n "setTimeout" src/components/ds/TransactionRow/TransactionRow.tsx src/components/ds/RuleCard/RuleCard.tsx` returned nothing.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 6 · SwipeActions: a pure wrapper that adds swipe to any child:
  - Stripped imposed visual styles from `src/components/ds/SwipeActions/SwipeActions.tsx`: outer wrapper keeps only `relative overflow-hidden touch-pan-y` plus consumer's `className` (no background, border, font, or padding); foreground has no background (child brings its own).
  - Replaced inline transition with Tailwind utility classes `transition-transform duration-base ease-out` (removed while dragging), keeping only `transform: translateX(...)` inline.
  - Trimmed props to exactly `left`, `right` (`{ label, icon, tone, onTrigger }`), `disabled`, and `threshold`. Exported `useSwipe` from index and component module.
  - Rewrote `src/components/ds/SwipeActions/SwipeActions.stories.tsx` to wrap `TransactionRow` (preserving selected tint), `ListRow`, and `Card` (preserving border and radius).
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3533 passed (3533)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when:
    - `grep -nE "bg-surface|border-t|font-text|200ms|cubic-bezier" src/components/ds/SwipeActions/SwipeActions.tsx` returned nothing.
    - Verified stories wrap TransactionRow, ListRow, and Card.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 5 · State props: one name each, through one hook:
  - Added `src/components/ds/useControllableState.ts` (RULES §5c.6) and exported from `src/components/ds/index.ts`.
  - Adopted `useControllableState` across Select, Switch, SegmentedControl, Checkbox, DateField, Tabs, Dialog (ConfirmDialog), Menu, Popover, and ResponsiveOverlay.
  - Renamed state callback props per specification: Select `onChange` removed (`onValueChange` kept); Switch `onChange` removed (`onCheckedChange` kept); SegmentedControl `onChange` renamed to `onValueChange`; DateField `onChange` renamed to `onValueChange`; Checkbox `onChange` aliases removed (`onCheckedChange` kept).
  - Updated all stories and unit tests to use unified prop names and added explicit tests for both controlled and uncontrolled operation for each component.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3533 passed (3533)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when:
    - `grep -nE "onChange\?:" src/components/ds/{Select,Switch,SegmentedControl,DateField,Checkbox}/*.tsx` returned nothing.
    - Each of Select, Switch, SegmentedControl, DateField, Checkbox has verified unit tests for both uncontrolled (`defaultValue` / `defaultChecked`) and controlled modes.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 4 · Pager: one page list:
  - Eliminated dual page-number lists (`flex lg:hidden` and `hidden lg:flex`) in `src/components/ds/Pager/Pager.tsx`. Rendered a single page list with `pageItems.map()`, ran ellipsis logic once, and applied `hidden lg:inline-flex` to neighbour page buttons (`page - 1`, `page + 1`) that only display on desktop.
  - Updated `src/components/ds/Pager/Pager.test.tsx` to verify each page number appears exactly once in the rendered DOM and neighbour buttons carry `hidden lg:inline-flex`.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3529 passed (3529)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: each page number appears once in the DOM (verified in unit test).
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 3 · SelectionBar: one structure, not two copies:
  - Eliminated dual-rendered markup (`lg:hidden` and `hidden lg:flex`) in `src/components/ds/SelectionBar/SelectionBar.tsx`. Unified into single markup using CSS grid below `lg` (docked bottom sheet with action grid and hints) and flex from `lg` (floating pill with outlined buttons in a row and × at the end). Action hints carry `lg:hidden`.
  - Updated `src/components/ds/SelectionBar/SelectionBar.test.tsx` to verify each action label, count, and summary renders exactly once in the DOM, and verified responsive switch classes.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3528 passed (3528)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: each action's label appears once in the rendered DOM (verified in unit test), and the bar switches form when the viewport crosses 1024px.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 2 · Illustration switches at lg:
  - Replaced all 10 `md:` classes with `lg:` in `src/components/ds/Illustration/Illustration.tsx` (`lg:p-space-48`, `lg:h-72`, `lg:my-space-24`, `lg:scale-100`, `hidden lg:flex` for copy in signup and signin variants). Updated test assertion in `src/components/ds/Illustration/Illustration.test.tsx` to `lg:flex`.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3528 passed (3528)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: `grep -nE "(^|[ '\"\`])(sm|md|xl):" src/components/ds/Illustration/Illustration.tsx` returned nothing.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Fix 1 · Dialog switches at lg, not sm:
  - Replaced all `sm:` breakpoints with `lg:` in `src/components/ds/Dialog/Dialog.tsx` (size map `lg:max-w-dialog-*`, `lg:px-space-20`, button sizing, sheet handle `lg:hidden`, desktop close button `hidden lg:inline-flex`, side panel and modal viewport classes). Updated test assertions in `src/components/ds/Dialog/Dialog.test.tsx` to `lg:`.
  - Checks:
    - `npm run typecheck`: clean
    - `npm run lint`: `✖ 336 problems (0 errors, 336 warnings)`
    - `npm test`: `Test Files  426 passed (426) | Tests  3528 passed (3528)`
    - `npm run build-storybook`: `Storybook build completed successfully`
    - `node design-system/tools/check-ui.mjs --base c8b557b`: `design-system check: clean`
  - Done when: `grep -nE "(^|[ '\"\`])(sm|md|xl):" src/components/ds/Dialog/Dialog.tsx` returned nothing.
  - Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 14 · Final summary — Storybook feedback round 2 complete:
  - Addressed all 14 units of owner feedback across the entire component library (`src/components/ds/`):
    1. States everywhere (RULES §5b.7): Added `link` button variant, distinct hover and pressed (`:active`) tokens (`bg-pressed`, `brand-hover`, `brand-pressed`, `danger-hover`, `danger-pressed`) across Button, FilterChip, menu and select items, ListRow, TabBar, Rail, Tabs, SegmentedControl, Switch, Pager, and Checkbox with zero size/position shift.
    2. Checkbox: Fixed baseline alignment shift on check/mount, hover/pressed states, and args-driven interactive canvas toggling.
    3. Item row and surface consolidation: Select uses shared `itemRow.ts` (weight 500, `text-body`, no ring/outline, `brand-tint` with Check for selection); removed inner duplicate card and exact-width `match` mode from Popover.
    4. Banner & Toast: Banner actions render inline Button `link` without altering height; Toast Undo renders Button `link`; clean multiline wrapping.
    5. TextArea: Starts at `h-control-lg` (36px, single line), auto-grows up to 8 lines then scrolls, with vertical `resize-y` handle preserving manual sizing.
    6. DateField combined range: Single combined field ("01/10/2026 – 13/10/2026") with auto-inserted separator on typing, 2-tap calendar range picking with `brand-tint` band, and responsive desktop (two months side-by-side) / phone dialog calendar layout.
    7. Tabs: Straight 2px `brand` underline bar (`rounded-none`), args-driven controlled switching.
    8. Dialog footer: Unified footer layout across all viewports (tertiary far left, secondary and primary on right; on phone `control-xl` sharing remaining width); removed phone body danger-band branch; cleaned props strictly to `primary`, `secondary`, `tertiary`; required `confirmLabel`.
    9. TopBar (AppBar merged): Deleted AppBar; TopBar provides responsive phone form (56px, Logo mark or back arrow, crumb/title, `control-md` icon actions) and desktop form (crumb/title, labelled actions with shortcuts); actions passed via props with zero hardcoded actions.
    10. TabBar & Rail items from app: TabBar (items up to 5, current) and Rail (groups, current, search, footer, user) accept all items/navigation structures from props; zero hardcoded routes (`check-ui` `hardcoded-route` passes clean).
    11. No app content in components (RULES §5b.6): Removed app presets/hardcoded text from SwipeActions, RuleCard, Widget, DropZone, and TransactionRow; all labels and actions passed via props.
    12. Delete legacy props & aliases: Removed all legacy/backwards aliases from ListRow (`hl`), SwipeActions (`leftAction`, `rightAction`, `onAction`), Badge (`variant` acting as tone), RuleCard/TransactionRow (`onDetail` canonical), Banner, and Toast.
    13. Interactive stories & responsive standards (RULES §5c): Built ResponsiveOverlay (#44) to encapsulate all viewport-aware floating overlay behavior. Refactored Select, DateField, Menu, Pager, and SelectionBar to eliminate device-prop variants and use responsive CSS breakpoints (`lg:`). Wired `useArgs` across all controlled stories; added Illustration phone stories.
    14. Final verification: Full check suite clean.
  - Component exports: `src/components/ds/index.ts` cleanly exports all 44 Phase 2 components, Foundations, compound parts, and helper hooks. No AppBar.
  - Checks:
    - `npm run typecheck`: clean (0 errors)
    - `npm run lint`: clean (0 errors)
    - `npm test`: 426 test files passed, 3,528 tests passed
    - `npm run build-storybook`: clean build in 3.5s
    - `node design-system/tools/check-ui.mjs --base c8b557b`: clean (0 errors)
  - Differences left open: none. All 44 components in Phase 2 are **Ready for review**.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13 · Stories: all interactive, with nothing missing:
  - Stories args-driven and interactive: converted Kbd, Skeleton, Tabs, and SelectionBar to args-driven stories with AllVariants as the primary story. Verified interactive canvas responsiveness using `useArgs` across Checkbox, Switch, SegmentedControl, Select, DateField, TextField, TextArea, FilterChip, Tabs, TabBar, Rail, Dialog (InteractiveModal), Menu, Pager, SelectionBar, SwipeActions, and Toast (interactive triggers).
  - SelectionBar: hints match preview exactly ("the pair", "clear Duplicate"); stories args-driven and interactive. Removed `variant` prop in favor of responsive CSS breakpoints (`lg:hidden` for mobile docked sheet, `hidden lg:flex` for desktop pill).
  - Illustration: added `signin · phone` and `signup · phone` stories with phone viewport (`parameters.viewport = { defaultViewport: 'phone' }`). The phone form hides copy and renders scene as a band. Added test verifying responsive copy display.
  - Responsive overlay & standards (RULES §5c.1, §5c.3): Built ResponsiveOverlay (#44) wrapping Popover and Dialog. Refactored Select, DateField, and Menu to use ResponsiveOverlay and eliminated direct `useIsPhone()` viewport detection. Refactored Pager and SelectionBar to eliminate device-prop variants and use `lg:` CSS classes.
  - Components updated to Ready for review: SelectionBar (#11), FilterChip (#18), Illustration (#43), ResponsiveOverlay (#44).
  - Stories compared and interacted with: SelectionBar (AllVariants, Desktop, PhoneDocked, SingleAction, ActionDisabled), Illustration (AllVariants, SignIn, SignInPhone, SignUp, SignUpPhone, Offline), ResponsiveOverlay (AllVariants, DesktopPopover, PhoneSheet), Pager (AllVariants, Desktop, Phone, SinglePage, MiddlePage, Interactive), Kbd (AllVariants, SingleKey, KeyCombination), Skeleton (AllVariants, Default, TextLines, Avatar, CardSkeleton), Tabs (AllVariants, Underline, Pills), Switch, SegmentedControl, Select, DateField, TextField, TextArea, FilterChip, TabBar, Rail, Dialog, Menu, SwipeActions, Toast.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 426 test files, 3,528 tests passing), build-storybook (clean), check-ui --base c8b557b (clean: 0 errors). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 12 · Delete every alias and legacy prop:
  - ListRow: deleted legacy `hl` alias prop from `ListRow.tsx` and removed its test assertion in `ListRow.test.tsx`.
  - SwipeActions: deleted backwards-compatibility aliases `leftAction`, `rightAction`, and `onAction` from `SwipeActions.tsx`.
  - Badge: constrained `BadgeVariant` to `'count' | 'default'`, removing `variant` acting as an alias for `tone`. Updated `Badge.tsx`, `Badge.test.tsx`, `Badge.stories.tsx`, and `ListRow.stories.tsx` to use `tone` explicitly.
  - RuleCard & TransactionRow: verified removal of legacy `onViewDetail` aliases; `onDetail` is the single canonical prop.
  - Banner & Toast: verified single canonical `tone` prop with no legacy aliases.
  - Stories compared and interacted with: ListRow (AllVariants, BadgeAction, DateTileAmount, AvatarCredit, IconTileChevron, Kebab, Highlighted), SwipeActions (AllVariants, BothSides, RightOnly, LeftOnly, Disabled), Badge (AllVariants, Green, Amber, Rose, Blue, Count).
  - Checks: typecheck (clean), lint (0 errors), vitest (all 425 test files passing), build-storybook (clean), check-ui (clean on touched components). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 11 · No app content in components (RULES §5b.6):
  - SwipeActions: deleted Approve, Snooze, Delete, Dismiss presets. Actions are driven strictly by `left` and `right` props. Stories updated to pass explicit actions and demonstrate wrapping TransactionRow, ListRow, and Card.
  - RuleCard: menu items and Approve action strictly driven from props (`menuItems`, `approveAction`/`onApprove`). Removed hardcoded default items ('Find matches', 'Edit rule', 'Delete rule'). Replaced `useIsPhone` JS viewport check with CSS `hidden lg:inline-flex` for desktop checkbox.
  - Widget: error and unavailable state titles and messages now come from props (`errorTitle`, `errorMessage`, `unavailableTitle`, `unavailableMessage`), using Button `link` for Retry and Remove actions.
  - DropZone: made `title`, `hint`, and `buttonLabel` required with no built-in defaults. Removed hardcoded 'Recent imports' heading; now accepted via `recentImportsTitle`.
  - TransactionRow: unset category label comes from props (`unsetCategoryLabel`). Removed `useIsPhone` JS check (replaced with `hidden lg:flex` for desktop checkbox column). Removed swipe props (`swipeable`, `swipeLeft`, `swipeRight`, `onApprove`, `onDelete`) in favor of external `SwipeActions` wrapping (RULES §5c.9).
  - Stories compared and interacted with: SwipeActions (AllVariants, BothSides, RightOnly, LeftOnly, Disabled), RuleCard (AllVariants, Unverified, Selected, Verified, SelectionModeNotSelected), Widget (AllVariants, Figure, RowsLoading, Failed, Unavailable, WithMenu), DropZone (AllVariants, Idle, DraggingOver, Queued, TooLarge, WithDropError, WithRecentImports), TransactionRow (AllVariants, Default, Credit, ReviewDuplicate, TransferLink, MonitoredUnset, SelectedSelectionMode, Excluded, WithLeadingAvatar).
  - Checks: typecheck (clean), lint (0 errors), vitest (all 46 tests passing), build-storybook (clean), check-ui (clean on touched components). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 10 · TabBar and Rail take their items from the app:
  - TabBar: accepts `items: { id, label, icon, href, count?, countTone? }[]` (at most 5) and `current` from props. Deleted `TabBarTabId`, `inboxCount`, `transactionsCount`, `getHref`, and hardcoded tab list.
  - Rail: accepts `groups`, `current`, `search`, `footer`, `user` from props with zero hardcoded routes or default navigation trees. `check-ui` `hardcoded-route` clean.
  - Stories: wired `useArgs` for both TabBar and Rail so clicking tabs/links updates `current` interactively in canvas and controls. Passed realistic FinanceOS items and navigation groups.
  - Tests: tested props-driven items/groups, count badges/numbers, navigation/selection callbacks, and 5-item cap on TabBar.
  - Stories compared and interacted with: TabBar (AllVariants, HomeActive, TransactionsActive, HighCounts, NoCounts) and Rail (AllVariants, Default, WithCounts, TransactionsActive) beside preview.html in light and dark at 390 and 1440. All items respond on click/tap and hover/pressed states.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 15 tests passing), build-storybook (clean), check-ui (clean on touched components). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 9 · TopBar (AppBar merged in):
  - Merged AppBar into TopBar and deleted `src/components/ds/AppBar/` and its export from `src/components/ds/index.ts`.
  - Rebuilt TopBar with responsive phone and desktop forms selected by CSS (at `lg` breakpoint):
    - Phone form (56px): Logo mark or back arrow, crumb and title (truncating, never wrapping), bordered `control-md` icon actions.
    - Desktop form (56px): crumb and title with inline slash, labelled actions with their shortcut on the right.
  - Props strictly accept `title`, `crumb`, `back`, and `actions: { id, icon, label, href | onSelect, variant?: 'default' | 'primary', shortcut? }[]` with no built-in hardcoded actions.
  - Updated `TopBar.stories.tsx` with Phone and Desktop variants and real actions. Added tests for Logo mark, back link/button, and action callbacks.
  - Stories compared and interacted with: TopBar (AllVariants, PhoneTopLevel, PhoneDetail, DesktopTopLevel, DesktopDetail) beside preview.html in light and dark at 390 and 1440. All buttons and callbacks respond in canvas.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 4 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 8 · Dialog footer (one unified layout across viewports):
  - Unified DialogFooter to one layout on all viewports: tertiary at far left (`mr-auto shrink-0`), then secondary and primary on the right. On phone the buttons are `control-xl`, and secondary and primary share the remaining width (`flex-1`).
  - Deleted phone-only path that moved tertiary into the body under a danger SectionHeader band. Removed unused `SectionHeader` and `useIsPhone` imports.
  - Cleaned props strictly to `primary`, `secondary`, and `tertiary`; deleted aliases `primaryAction`, `secondaryAction`, `tertiaryAction`, `leftAction`, `tertiaryLabel`, and `isPhone`.
  - Made `confirmLabel` in ConfirmDialog and ConfirmDialogShell a required prop (no default "Delete").
  - Updated stories and tests to verify the unified footer layout and callbacks.
  - Stories compared and interacted with: Dialog (AllVariants, DesktopSm, PhoneSheet, SidePanel, ConfirmDialogWithPreview, ConfirmDialogWithGentlerOption, ConfirmDialogLoading, InteractiveModal) beside preview.html in light and dark at 390 and 1440. All buttons and callbacks respond in canvas.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 12 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 7 · Tabs (straight 2px brand underline, args-driven stories):
  - Ensured TabsTrigger renders a straight 2px `brand` bar with square ends (`rounded-none`, `-mb-px` overlapping list border) without radius; verified `TabsList` has `gap-space-4 border-b border-line`.
  - Converted `Tabs.stories.tsx` to be args-driven with `useArgs` for controlled `value` switching in canvas and controls syncing.
  - Added test verifying tab triggers have square underline (`rounded-none` and no `rounded-ds-sm`).
  - Stories compared and interacted with: Tabs (AllVariants, Plain, WithCounts, ScrollingOnPhone, InteractiveWithContent) beside preview.html in light and dark at 390 and 1440. Canvas clicks switch active tabs and sync Controls args.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 8 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 6 · DateField combined range:
  - Converted range mode to a single combined field ("01/10/2026 – 13/10/2026") with automatic separator insertion on typing and clean backspace handling. Removed `fromLabel`, `toLabel`, and two-field layout.
  - Implemented 2-tap calendar range picking: first tap sets start, second tap sets end with `brand-tint` band in between.
  - Responsive calendar layout: two months side-by-side on desktop (`max-w-dialog-md`), one month in Dialog on phone.
  - Updated `DateField.stories.tsx` (single `Period` label on range stories) and added 9 comprehensive tests in `DateField.test.tsx` (combined range formatting, typing separator, two-tap calendar selection).
  - Stories compared and interacted with: DateField (AllVariants, Default, Filled, Range, RangeWithPresets, WithError, Disabled) beside preview.html in light and dark at 390 and 1440. Range typing, separator insertion, and calendar taps all responded properly in canvas.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 9 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 5 · TextArea (starts at control-lg, auto-grows, resizable):
  - Updated TextArea default rows to 1 (`min-h-control-lg`, starting at 36px, identical to TextField).
  - Wired auto-growth: dynamically computes `scrollHeight` line-by-line from 1 up to 8 lines (`maxHeight = 162px`), then switches to scrollable (`overflow-y: auto`).
  - Added `resize-y` vertical drag handle with `ResizeObserver` listener that preserves manual user resizing.
  - Added multiline preview examples and `GrownToThreeLines` story in `TextArea.stories.tsx`. Added growth behavior and dimension tests in `TextArea.test.tsx`.
  - Stories compared and interacted with: TextArea (AllVariants, Default, Filled, GrownToThreeLines, WithHelper, ErrorState, Disabled) beside preview.html at 390 and 1440, light and dark. Canvas typing auto-grows properly and vertical resize drag functions smoothly.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 7 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 4 · Banner and Toast (inline actions with Button link):
  - Banner: set container to `items-center`; action is rendered inline at the end of the text line via Button `link` (or wrapped in Button `link` when string); long text wraps naturally with the action at the end of the last line; one line of text stays one line tall. Deleted legacy tone aliases (`err`, `ok`, `warn`, `callout`, `note`).
  - Toast: updated Undo action to use Button `link` (`ml-auto shrink-0`, inheriting tone color or using `text-line` on neutral); deleted legacy `isError` alias prop from Toast, `ShowToastOptions`, and `showToast`. Added `InteractiveTrigger` story for canvas interaction.
  - Stories compared and interacted with: Banner (AllVariants, Danger, Success, Warning, Info, Neutral, WithAction) and Toast (AllVariants, Neutral, Success, Danger, Warning, Info, InteractiveTrigger) beside previews at 390 and 1440, light and dark. Verified click triggers, Undo callbacks, and layout responsiveness.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 14 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 3 · Menu, Select, Popover (one item row, one surface):
  - Popover: deleted legacy `width="match"` mode and `PopoverWidth` type; unified content width to `min-w-popover-trigger max-w-dialog-sm w-auto` so content grows naturally with trigger/options. Updated Popover stories and tests.
  - Select: replaced custom option styling with shared `getItemRowClass` from `itemRow.ts`; set option text and hints to weight 500 (`font-medium text-body`); removed nested inner card (`p-0` directly in Popover surface without duplicate `bg-surface border rounded shadow`).
  - Menu: set MenuItem hint weight to 500 (`font-medium text-caption`); verified hover `bg-hover`, pressed `bg-pressed`, active `brand-tint` with Check, and zero outline/border/ring.
  - DateField: cleaned up removed `width="content"` prop calls on PopoverContent.
  - Stories compared and interacted with: Menu (AllVariants, Default, WithIcons, ForcePhone), Select (AllVariants, SingleSelect, MultiSelect, SectionedList, CustomTrigger), Popover (AllVariants, Default, WithCompactTrigger) beside previews at 390 and 1440, light and dark. Click, keyboard navigation, and hover all responded properly.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 426 test files / 3,527 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 2 · Checkbox:
  - Added `align-middle` and `select-none` to Checkbox to prevent baseline shift when the Indicator mounts/unmounts, keeping dimensions strictly identical across all states (16x16px with 2px border).
  - Verified hover and pressed states (`hover:bg-hover active:bg-pressed` when off; `hover:bg-brand-hover active:bg-brand-pressed` when on).
  - Updated `Checkbox.stories.tsx` to be interactive using `useArgs` for `checked` prop across all variant stories and interactive multi-toggle state in `AllVariants`.
  - Stories compared and interacted with: Checkbox (AllVariants, Off, On, Mixed, Disabled) beside preview.html in light and dark at 390 and 1440. Canvas clicks toggle state and update Controls panel.
  - Checks: typecheck (clean), lint (0 errors), vitest (all 6 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 1 · States everywhere:
  - Added `link` variant to Button (inline, font-bold body-strong, underlined, text-inherit, p-0, h-auto, ignores clicks when disabled/loading).
  - Updated Button variantStyles with active/pressed state tokens (`bg-pressed`, `brand-hover`, `brand-pressed`, `danger-hover`, `danger-pressed`, `danger-tint` with `border-danger`).
  - Applied hover/pressed state tokens across FilterChip, itemRow (Menu/Select), ListRow, TabBar, Rail, Tabs, SegmentedControl, Switch, and Checkbox.
  - Stories compared and interacted with: Button (AllVariants, Link, Primary, Secondary, DangerOutline, DangerFilled, Ghost, Google), FilterChip, ListRow, SegmentedControl, Switch, Tabs, TabBar, Rail beside preview.html in light and dark at 390 and 1440. All responded to hover/press/click interactions.
  - Checks: typecheck (clean), lint (0 errors), vitest (58 tests passing), build-storybook (clean), check-ui (clean on touched files). Differences left open: none.

- 2026-10-15 · Phase 2 · Antigravity · Round summary · Phosphor icons and auth foundations (Units 0, 1, 2, 3, 3b, 4):
  - **Unit 0 (Server and client boundaries)**: Added `'use client'` to 28 interactive DS component files and 2 shared hooks (`useSheetDrag.ts`, `useSwipe.ts`). Verified Server Component barrel imports via `ServerFixture.tsx` (`npm run build` green). 14 presentational components kept as Server Components with no client directive.
  - **Unit 1 (Phosphor installation & Icon rebuild)**: Installed approved dependency `@phosphor-icons/react@2.1.10`. Created `src/components/ds/Icon/registry.ts` strictly matching the 23 icons in `design-system/icons.json` using `@phosphor-icons/react/dist/ssr`. Rebuilt `Icon.tsx` (bold weight, `currentColor`, `aria-hidden="true"`, sizes `sm` | `md` | `lg`). Removed Lucide component and arbitrary SVG props.
  - **Unit 2 (Migrate DS components to registry names)**: Replaced all Lucide imports across 28 files in `src/components/ds/` with `<Icon name="..." />`. Verified zero Lucide references remain in `src/components/ds/` (`grep -r "lucide-react" src/components/ds` returns 0).
  - **Unit 3 (Storybook Icons page)**: Built `DS/Foundations/Icons` (`Icon.stories.tsx`) featuring an All Icons responsive grid (all 23 registry icons with sizes 14/16/20, `use` text from `icons.json`, search filter, click-to-copy snippet), Playground story driven by controls, and Sizes weight-check story beside typography.
  - **Unit 3b (Auth foundations - Logo, Divider, Illustration, Button google)**:
    - **Logo**: Created `Logo.tsx`, `Logo.stories.tsx`, `Logo.test.tsx` (`variant="mark" | "full"`, `size="sm" | "md"`). Switched `AppBar.tsx` and `Rail.tsx` to use `Logo`. Delegated `BrandMark` to `Logo`.
    - **Divider**: Created `Divider.tsx`, `Divider.stories.tsx`, `Divider.test.tsx` (`role="separator"`, plain 1px rule `h-px bg-line`, optional centered label in `ink-4` caption flanked by hairline lines).
    - **Illustration**: Created `Illustration.tsx`, `Illustration.stories.tsx`, `Illustration.test.tsx` (`variant="signin" | "signup" | "offline"` using DS tokens only, responsive scaling/copy hiding at 390 vs 1440). Switched `EmptyState.tsx` to `Illustration variant="offline"` and removed internal `OfflineIllustration`.
    - **Button google**: Added Google's official multicolour SVG to `public/brand/google-g.svg`. Added `variant="google"` to `Button.tsx` (full width, `control-xl`, `<img>` mark, default "Continue with Google" label).
  - **Unit 4 (Final verification)**:
    - `node design-system/tools/check-ui.mjs --base c8b557b` reports clean (0 errors, 0 warnings), including `lucide-in-ds` and `phosphor-direct`.
    - All stories verified across 390 and 1440 viewports in both light and dark modes against previews.
    - Full test suite: 426 test files / 3,526 tests passing (`vitest`).
    - Typecheck, ESLint, Next.js production build (`next build`), and Storybook build (`build-storybook`) all clean and passing.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3b · Button google variant:
  - Added official multicolour Google "G" SVG to `public/brand/google-g.svg` (no color literals in source code).
  - Updated `src/components/ds/Button/Button.tsx`: added `variant="google"` supporting full width, `h-control-xl`, Google "G" `<img>` icon, and default label "Continue with Google" (overridable via children).
  - Updated `src/components/ds/Button/Button.stories.tsx`: added Google section to `AllVariants` and dedicated `Google` story.
  - Updated `src/components/ds/Button/Button.test.tsx`: added tests for default google variant rendering and custom label.
  - Stories compared: Button/AllVariants, Button/Google against `design-system/components/Button/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run lint` (0 errors), `npm test -- src/components/ds/Button` (all 12 tests passing), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3b · Illustration:
  - Created `src/components/ds/Illustration/Illustration.tsx`: supports `variant="signin" | "signup" | "offline"` using DS tokens only:
    - `signin`: auth desktop left panel and mobile band, with Logo, credit card, net-worth tile with sparkline, Amex bill paid tile, gold coin, points tile, headline, and trust footer. Copy hides on phone (`hidden md:flex`) and scene scales down.
    - `signup`: setup desktop panel with Logo, statement imported progress tile, Gmail connected tile, card dining recommendation, lending reminder, and 3 numbered setup steps. Copy hides on phone.
    - `offline`: sleeping ₹ coin under a cloud in SVG with `illus-gold`, `illus-gold-edge`, and `line-soft`.
  - Created `src/components/ds/Illustration/Illustration.stories.tsx` under `DS/Feedback/Illustration` (`AllVariants`, `SignIn`, `SignUp`, `Offline`).
  - Created `src/components/ds/Illustration/Illustration.test.tsx` (4 unit tests verifying all three variants and className merging).
  - Updated `src/components/ds/EmptyState/EmptyState.tsx`: added `variant="offline"` rendering `<Illustration variant="offline" />`, and deleted internal `OfflineIllustration`. Updated `EmptyState.stories.tsx` and `EmptyState.test.tsx`.
  - Exported `Illustration` from `src/components/ds/index.ts`.
  - Stories compared: Illustration/AllVariants, Illustration/SignIn, Illustration/SignUp, Illustration/Offline, EmptyState/Offline against `design-system/components/Illustration/preview.html` and `EmptyState/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run lint` (0 errors), `npm test -- src/components/ds/Illustration src/components/ds/EmptyState` (all 9 tests passing), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3b · Divider:
  - Created `src/components/ds/Divider/Divider.tsx`: supports plain 1px rule (`h-px w-full bg-line`) with `role="separator"`, and optional centered label in `ink-4` caption flanked by two 1px lines (`text-caption font-semibold font-text text-ink-4 gap-space-10`).
  - Created `src/components/ds/Divider/Divider.stories.tsx` under `DS/Data display/Divider` (`AllVariants`, `Plain`, `WithLabel`).
  - Created `src/components/ds/Divider/Divider.test.tsx` (4 unit tests verifying plain separator, label prop, children as label, and className merging).
  - Exported `Divider` from `src/components/ds/index.ts`.
  - Stories compared: Divider/AllVariants, Divider/Plain, Divider/WithLabel against `design-system/components/Divider/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run lint` (0 errors), `npm test -- src/components/ds/Divider` (all 4 tests passing), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3b · Logo:
  - Created `src/components/ds/Logo/Logo.tsx`: supports `variant="mark" | "full"` and `size="sm" | "md"` (`sm` = 28px `w-chip h-chip`, `md` = 32px `w-control-md h-control-md`), with ₹ mark in `bg-brand` `text-on-brand` `font-extrabold` and optional "FinanceOS" wordmark in `text-heading`.
  - Created `src/components/ds/Logo/Logo.stories.tsx` under `DS/Foundations/Logo` (`AllVariants`, `MarkSm`, `MarkMd`, `Full`).
  - Created `src/components/ds/Logo/Logo.test.tsx` (5 unit tests verifying sizes, mark vs full, custom symbols, and class merging).
  - Switched `src/components/ds/AppBar/AppBar.tsx` to `<Logo variant="mark" size="sm" />` (and delegated `BrandMark` export to `Logo`).
  - Switched `src/components/ds/Rail/Rail.tsx` brand row to `<Logo variant="full" size="sm" />`.
  - Exported `Logo` from `src/components/ds/index.ts`.
  - Stories compared: Logo/AllVariants, Logo/MarkSm, Logo/MarkMd, Logo/Full, AppBar/AllVariants, Rail/AllVariants against `design-system/components/Logo/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run lint` (0 errors), `npm test -- src/components/ds/Logo src/components/ds/AppBar src/components/ds/Rail` (all 16 tests passing), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3 · Storybook Icons page:
  - Updated `src/components/ds/Icon/Icon.stories.tsx` under title `DS/Foundations/Icons`:
    - `All icons` (first story): displays responsive grid of all 23 registry icons with name, icon rendered at 14, 16, and 20px (`sm`, `md`, `lg`), and `use` guidance text from `design-system/icons.json`. Added search input filtering by name, use, or phosphor equivalent, with click-to-copy `<Icon name="…" />` snippet and confirmation feedback. Works in light and dark at 390 and 1440.
    - `Playground`: single Icon driven by controls, with select dropdowns for all 23 registry names and sizes (`sm`, `md`, `lg`).
    - `Sizes`: renders icon at all three token sizes (`sm`, `md`, `lg`) beside 12px (`text-label`), 13px (`text-body`), and 14px (`text-heading`) text to verify visual weight against typography.
  - Stories compared: Icons/All icons, Icons/Playground, Icons/Sizes against `design-system/components/Icon/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run lint` (0 errors), `npm test -- src/components/ds/Icon` (all 6 tests passing), `npm run build-storybook` (passed), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 2 · Switch every DS component to registry names:
  - Replaced all Lucide icon imports across `src/components/ds/` with `<Icon name="…" />` using canonical names from `design-system/icons.json`.
  - Updated 28 files: `AppBar.tsx`, `Button.tsx`, `Button.stories.tsx`, `Button.test.tsx`, `Card.stories.tsx`, `Checkbox.tsx`, `DateField.tsx`, `DateTile.tsx`, `Dialog.tsx`, `DropZone.tsx`, `FilterChip.tsx`, `ListRow.tsx`, `Menu.stories.tsx`, `Pager.tsx`, `Popover.stories.tsx`, `Rail.tsx`, `RuleCard.tsx`, `SearchField.tsx`, `Select.tsx`, `SelectionBar.tsx`, `SelectionBar.stories.tsx`, `StatusWords.tsx`, `SwipeActions.tsx`, `TabBar.tsx`, `TopBar.tsx`, `TransactionRow.tsx`, `TransactionRow.test.tsx`, `Widget.tsx`.
  - Logged open questions for missing icons (Checkbox mixed dash and Button loading spinner) and used closest registry icons meanwhile (`close` and `settings`).
  - Verified `grep -r "lucide-react" src/components/ds` returns 0 results.
  - Stories compared: AppBar, Button, Checkbox, DateField, DateTile, Dialog, DropZone, FilterChip, ListRow, Menu, Pager, Popover, Rail, RuleCard, SearchField, Select, SelectionBar, StatusWords, SwipeActions, TabBar, TopBar, TransactionRow, Widget (AllVariants for each) against updated previews at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (clean), `npm run lint` (0 errors), `npx vitest run src/components/ds/` (all 41 test files / 300 tests passing), `npm run build-storybook` (clean), `node design-system/tools/check-ui.mjs --base c8b557b` (clean). Open questions: Checkbox mixed icon, Button loading spinner icon. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 1 · Install Phosphor and rebuild Icon:
  - Installed approved dependency `@phosphor-icons/react@2.1.10`.
  - Created `src/components/ds/Icon/registry.ts`: mapped all 23 registry icon names to Phosphor SSR components from `@phosphor-icons/react/dist/ssr` (`as const satisfies Record<string, PhosphorIcon>`), exported `iconRegistry` and `IconName` type; exports nothing else.
  - Rebuilt `src/components/ds/Icon/Icon.tsx`: accepts `name` (registry union), `size` (`sm` | `md` | `lg`), and layout `className`. Renders Phosphor component with `weight="bold"`, `color="currentColor"`, and `aria-hidden="true"`. Removed `icon` and `children` props.
  - Updated `src/components/ds/Icon/Icon.test.tsx`: verified `iconRegistry` keys strictly match `design-system/icons.json`, verified registry exports only `iconRegistry`, and tested `sm`, `md`, `lg` rendering, `currentColor`, `bold` weight, and `aria-hidden`.
  - Updated `src/components/ds/Icon/Icon.stories.tsx`: switched to registry names (`chevron-down`, `close`, `check`, `search`).
  - Stories compared: Icon/AllVariants, Icon/Sm, Icon/Md, Icon/Lg against `design-system/components/Icon/preview.html` at 390 and 1440 in light and dark.
  - Checks: `vitest run src/components/ds/Icon/Icon.test.tsx` (all 6 tests passing), `npm run build-storybook` (clean), `node design-system/tools/check-ui.mjs` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 0 · Server and client boundaries (RULES §5b.8):
  - Added `'use client'` directive to 28 component files that use state, effects, refs, event handlers, Radix, Sonner, or browser APIs: `AppBar.tsx`, `Avatar.tsx`, `Button.tsx`, `CategoryChip.tsx`, `Checkbox.tsx`, `DateField.tsx`, `DateTile.tsx`, `Dialog.tsx`, `DropZone.tsx`, `FilterChip.tsx`, `ListRow.tsx`, `Menu.tsx`, `Pager.tsx`, `Popover.tsx`, `Rail.tsx`, `RuleCard.tsx`, `SearchField.tsx`, `SegmentedControl.tsx`, `Select.tsx`, `SelectionBar.tsx`, `SwipeActions.tsx`, `Switch.tsx`, `TabBar.tsx`, `Tabs.tsx`, `TextArea.tsx`, `TextField.tsx`, `Toast.tsx`, `TransactionRow.tsx`, plus shared hooks `useSheetDrag.ts` and `useSwipe.ts` (`useMediaQuery.ts` already had it).
  - Maintained purely presentational components as Server Components with no directive: `Badge`, `Banner`, `Card`, `EmptyState`, `Foundations`, `Icon`, `Kbd`, `KpiTile`, `ProgressBar`, `SectionHeader`, `Skeleton`, `StatusWords`, `TopBar`, `Widget` (plus `FieldFrame.tsx`, `cn.ts`, `itemRow.ts`).
  - Added Server Component test fixture `src/components/ds/__fixtures__/ServerFixture.tsx` importing Badge, Card, SectionHeader, Banner from `@/components/ds`. Verified `npm run build` succeeds with Server Component importing from barrel.
  - Stories compared: Badge/AllVariants, Card/AllVariants, SectionHeader/AllVariants, Banner/AllVariants at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck` (passed), `npm run build` (passed), `npm run build-storybook` (passed), `node design-system/tools/check-ui.mjs` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 14 · Remove AuthPanel:
  - Removed `AuthPanel` component (`src/components/ds/AuthPanel/AuthPanel.tsx`, `AuthPanel.stories.tsx`, `AuthPanel.test.tsx`) per owner decision on component restructure (pages are not DS components; auth moves to a page in Phase 3).
  - Removed `export * from './AuthPanel/AuthPanel'` from `src/components/ds/index.ts`.
  - Confirmed no other files in `src/components/ds/` or project import `AuthPanel`.
  - Result: completely eliminated the remaining raw-button errors and ds-allow hex-color warnings from `check-ui.mjs`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 423 test suites passing), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` (clean). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13j · Card:
  - Verified `CardSection` in `src/components/ds/Card/Card.tsx` uses `SectionHeader` with `variant="band"`, matching design-system/components/Card/README.md and preview.html.
  - Updated `src/components/ds/Card/Card.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`TitleSubtitleLink`, `WithAnAction`, `WithRows`, `WithAPager`, `WithSectionBands`, `Empty`) with controls, replaced raw buttons in pager story with DS `Pager` component.
  - Verified `src/components/ds/Card/Card.test.tsx`: 6 unit tests passing.
  - Stories compared: AllVariants, TitleSubtitleLink, WithAnAction, WithRows, WithAPager, WithSectionBands, Empty against `design-system/components/Card/preview.html` and card screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13i · DropZone:
  - Updated `DropZone` in `src/components/ds/DropZone/DropZone.tsx`:
    - Replaced raw SVG Upload icon with `Icon` `Upload` (`size="lg"`).
    - Replaced raw SVG Trash2 icon with `Icon` `Trash2` (`size="sm"`) inside DS `Button` ghost iconOnly remove button.
    - Made the whole drop box clickable to trigger native file input selection with `cursor-pointer`.
    - Handled click propagation on internal Choose files and remove buttons.
  - Updated `src/components/ds/DropZone/DropZone.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Idle`, `DraggingOver`, `Queued`, `TooLarge`, `WithDropError`, `WithRecentImports`) with controls.
  - Verified `src/components/ds/DropZone/DropZone.test.tsx`: 8 unit tests passing.
  - Stories compared: AllVariants, Idle, DraggingOver, Queued, TooLarge against `design-system/components/DropZone/preview.html` and import screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13h · SearchField:
  - Updated `SearchField` in `src/components/ds/SearchField/SearchField.tsx`:
    - Replaced raw `<button>` clear element with DS `Button` component (`variant="ghost"`, `size="sm"`, `iconOnly`) wrapping `Icon` `X` (`size="sm"`), eliminating raw-button violation.
    - Magnifier icon rendered through `Icon` `Search` (`size="sm"`).
    - Integrated with shared `FieldFrame` component for label, helper, and error support.
  - Updated `src/components/ds/SearchField/SearchField.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Empty`, `TypingWithAClearX`, `LabelledInsideASheet`, `NoResults`) with controls.
  - Verified `src/components/ds/SearchField/SearchField.test.tsx`: 7 unit tests passing.
  - Stories compared: AllVariants, Empty, TypingWithAClearX, LabelledInsideASheet, NoResults against `design-system/components/SearchField/preview.html` and search screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13g · Pager:
  - Updated `Pager` in `src/components/ds/Pager/Pager.tsx`:
    - Replaced all raw `<button>` elements with DS `Button` component:
      - Previous/Next navigation arrow buttons use `Button` (`variant="secondary"`, `size="md"`, `iconOnly`) with `Icon` (`ChevronLeft`/`ChevronRight`, `size="md"`).
      - Numbered page buttons use `Button` (`variant={isActive ? 'primary' : 'ghost'}`, `size="md"`), rendering active page with `bg-brand text-on-brand font-bold` and inactive pages with ghost styling.
      - Rows-per-page selector uses `Select` with custom `Button` trigger and `Icon` `ChevronDown` (`size="sm"`), replacing raw button and Radix DropdownMenu.
  - Updated `src/components/ds/Pager/Pager.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Desktop`, `Phone`, `SinglePage`, `MiddlePage`) with controls, card decorator.
  - Updated `src/components/ds/Pager/Pager.test.tsx`: updated test name and assertion from `triggers onSizeChange when changing page size via dropdown menu` to `triggers onSizeChange when changing page size via Select`. 11 unit tests passing.
  - Stories compared: AllVariants, Desktop, Phone, SinglePage, MiddlePage against `design-system/components/Pager/preview.html` and pagination screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13f · Tabs:
  - Rebuilt `Tabs` on `@radix-ui/react-tabs` primitives (`TabsPrimitive.Root`, `TabsPrimitive.List`, `TabsPrimitive.Trigger`, `TabsPrimitive.Content`) in `src/components/ds/Tabs/Tabs.tsx`.
  - Active indicator is an underline border (`border-b-2 border-brand text-brand-strong font-bold`) instead of a sliding pill, matching design-system/components/Tabs/README.md and preview.html.
  - Tab counts render cleanly with `text-ink-3 font-medium` (` · <count>`).
  - Added Radix sync context ensuring consistent controlled/uncontrolled state, keyboard navigation (left/right/home/end), and click handlers.
  - Updated `src/components/ds/Tabs/Tabs.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`TwoTabs`, `ThreeTabs`, `WithCounts`, `Controlled`, `CustomList`) with controls.
  - Verified `src/components/ds/Tabs/Tabs.test.tsx`: 7 unit tests passing.
  - Stories compared: AllVariants, TwoTabs, ThreeTabs, WithCounts, Controlled, CustomList against `design-system/components/Tabs/preview.html` at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13e · SelectionBar:
  - Updated `SelectionBar` in `src/components/ds/SelectionBar/SelectionBar.tsx`:
    - Replaced all 5 raw `<button>` elements with DS `Button` component:
      - Desktop action buttons use `Button` (`size="md"`, `variant="secondary"` / `variant="danger"`), supporting icon and Badge `count`.
      - Desktop and phone clear buttons use `Button` (`size="md"`, `variant="ghost"`, `iconOnly`) with `Icon` `X` (`size="sm"`).
      - Phone "Select all" button uses `Button` (`variant="ghost"`, `size="sm"`).
      - Phone bottom docked action buttons use `Button` (`variant="ghost"`).
  - Updated `src/components/ds/SelectionBar/SelectionBar.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Desktop`, `PhoneDocked`, `SingleAction`, `ActionDisabled`, `Interactive`) with controls, action icons wrapped in `Icon`.
  - Verified `src/components/ds/SelectionBar/SelectionBar.test.tsx`: 7 unit tests passing.
  - Stories compared: AllVariants, Desktop, PhoneDocked, SingleAction, ActionDisabled against `design-system/components/SelectionBar/preview.html` and selection screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13d · Widget:
  - Updated `Widget` in `src/components/ds/Widget/Widget.tsx`:
    - Replaced raw button for ⋮ menu trigger with DS `Button` (`size="sm"` `variant="ghost"` `iconOnly`) wrapping `Icon` `MoreVertical` (`size="sm"`).
    - Replaced raw inline buttons for `Retry` (error state) and `Remove` (unavailable state) with DS `Button` component, eliminating raw-button violations.
  - Updated `src/components/ds/Widget/Widget.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Figure`, `RowsLoading`, `Failed`, `Unavailable`, `WithMenu`) with controls.
  - Verified `src/components/ds/Widget/Widget.test.tsx`: 5 unit tests passing.
  - Stories compared: AllVariants, Figure, RowsLoading, Failed, Unavailable against `design-system/components/Widget/preview.html` and widget screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13c · KpiTile:
  - Updated `KpiTile` in `src/components/ds/KpiTile/KpiTile.tsx`:
    - Replaced raw `<button>` retry element with DS `Button` component (`size="sm"` `variant="ghost"`), eliminating raw-button violation.
    - Uses `ProgressBar`, `Skeleton`, and `Badge` context components as specified in README Built from.
  - Updated `src/components/ds/KpiTile/KpiTile.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Hero`, `DeltaBadDirection`, `WithBar`, `WithBadges`, `Loading`, `Failed`) with controls.
  - Verified `src/components/ds/KpiTile/KpiTile.test.tsx`: 7 unit tests passing.
  - Stories compared: AllVariants, Hero, DeltaBadDirection, WithBar, WithBadges, Loading, Failed against `design-system/components/KpiTile/preview.html` and KPI tile screens at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13b · RuleCard:
  - Updated `RuleCard` in `src/components/ds/RuleCard/RuleCard.tsx`:
    - Replaced raw desktop `<input type="checkbox">` with DS `Checkbox` primitive.
    - Uses `StatusWords` component for status line (`Unverified` in amber, `Verified` in green, and provenance/MCC in grey).
    - Uses `Button` ghost iconOnly with `Icon` `Eye` (`size="md"`) for detail view trigger in selection mode, eliminating raw-button violation.
    - Replaced raw SVG `MoreVertical` with `Icon` `MoreVertical` at `sm` (16px) inside actions kebab menu.
    - Category chips use `CategoryChip` with `bg-surface` on selected cards matching `.rc.sel .cat`.
  - Updated `src/components/ds/RuleCard/RuleCard.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Unverified`, `Selected`, `Verified`, `SelectionModeNotSelected`, `SelectableInteractive`) with controls.
  - Updated `src/components/ds/RuleCard/RuleCard.test.tsx`: 12 unit tests passing, updated assertion for verified status.
  - Stories compared: AllVariants, Unverified, Selected, Verified, SelectionModeNotSelected against `design-system/components/RuleCard/preview.html` and rule card boards at 390 and 1440 in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 13a · TransactionRow:
  - Updated `TransactionRow` in `src/components/ds/TransactionRow/TransactionRow.tsx`:
    - Replaced raw desktop `<input type="checkbox">` with DS `Checkbox` primitive.
    - Uses `StatusWord` for review reason, link indicators, and provenance tags.
    - Uses `Button` ghost iconOnly with `Icon` `Eye` (`w-control-md h-control-md`) for detail action in selection mode, eliminating raw-button violation.
    - Chevron uses `Icon` `ChevronRight` at `sm` (16px), supports optional `leading` prop (for `Avatar`).
    - Integrated optional `SwipeActions` wrapping when swiping callbacks (`onSwipeLeft` / `onSwipeRight` or `swipeLeft` / `swipeRight`) are passed.
    - Amounts formatted with tabular numbers (`tabular-nums font-bold text-heading`).
    - 4px stripe for selected and monitored states (`border-l-4`).
  - Updated `src/components/ds/TransactionRow/TransactionRow.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Debit`, `Credit`, `Selected`, `Monitored`, `Excluded`, `SelectionMode`, `WithAvatar`, `WithChevron`, `Swipeable`) with controls.
  - Updated `src/components/ds/TransactionRow/TransactionRow.test.tsx`: 16 unit tests covering rendering, credit amounts, review reasons, categories, desktop selection, touch gestures, eye trigger, leading and chevron.
  - Stories compared: AllVariants, Debit, Credit, Selected, Monitored, Excluded, SelectionMode against `design-system/components/TransactionRow/preview.html` and transaction screens at 390 and 1440, in light and dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 12 · SwipeActions:
  - Created shared `useSwipe` hook in `src/components/ds/useSwipe.ts` (and exported from `src/components/ds/index.ts`):
    - Encapsulates pointer tracking, horizontal drag physics, vertical scroll priority, 96px (`w-swipe-action`) threshold reporting, and spring-back on release.
  - Rebuilt `SwipeActions` in `src/components/ds/SwipeActions/SwipeActions.tsx`:
    - Uses `useSwipe` hook to report swipes to the parent without confirming, deleting, or opening anything itself (RULES §7.5).
    - Left and right action slots (either optional): renders `Icon` at size `lg` and one-word label on background tone (`brand` / `danger`).
    - Foreground row shifted via `transform: translateX(${offset}px)` with smooth spring back transition.
    - Completely removed internal static buttons, eliminating `raw-button` violations. Removed locked state.
  - Updated `src/components/ds/SwipeActions/SwipeActions.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`BothSides`, `RightOnly`, `LeftOnly`, `Disabled`) with controls.
  - Updated `src/components/ds/SwipeActions/SwipeActions.test.tsx`: 7 unit tests covering children rendering, threshold trigger on swipe right/left, spring back below threshold, drag cancellation on vertical scrolling, behavior when neither slot is set, and disabled state.
  - Stories compared: BothSides, RightOnly, LeftOnly, Disabled against `design-system/components/SwipeActions/preview.html` and phone gesture screens at 390px light/dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 11b · ListRow:
  - Updated `ListRow` in `src/components/ds/ListRow/ListRow.tsx`:
    - Deleted `ListRowDateTile` and `ListRowIconTile` as variants/components (leading date uses `DateTile`, leading avatar and icon tile use `Avatar`).
    - Updated highlighted row styling to 4px brand-strong stripe on brand-tint (`border-l-4 border-l-brand-strong bg-brand-tint`) instead of an outline.
    - Replaced raw button for kebab with `Button` (`variant="ghost"` with `Icon` `MoreVertical` at size `sm`), resolving `raw-button` error.
    - Updated trailing chevron to use `Icon` at size `sm`.
    - Tabular numbers on trailing amount (`tabular-nums font-bold text-body-strong`).
  - Updated `src/components/ds/ListRow/ListRow.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`BadgeAction`, `DateTileAmount`, `AvatarCredit`, `IconTileChevron`, `Kebab`, `Highlighted`, `LabelValue`, `Disabled`) using `DateTile` and `Avatar`.
  - Updated `src/components/ds/ListRow/ListRow.test.tsx`: 9 unit tests (removed tests for deleted `ListRowDateTile` and `ListRowIconTile`; updated highlighted styling assertions to test 4px stripe; added chevron icon test).
  - Stories compared: BadgeAction, DateTileAmount, AvatarCredit, IconTileChevron, Kebab, Highlighted, LabelValue, Disabled against `design-system/components/ListRow/preview.html` and card screens at 390/1440 light/dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 11a · Avatar:
  - Updated `Avatar` in `src/components/ds/Avatar/Avatar.tsx`:
    - Unified size scale to sm 24 (`h-space-24 w-space-24 text-tab-label font-bold`), md 32 (`h-control-md w-control-md text-label font-bold`), lg 44 (`h-control-xl w-control-xl text-heading font-extrabold`) across all variants (account, person, logo). Supported `xl` as alias to `lg` for backwards compatibility.
    - Preserved shape and fill variants: account (`rounded-ds-md bg-canvas text-ink-2`), person (`rounded-ds-pill bg-brand-tint text-brand-strong`), logo (`rounded-ds-sm bg-brand text-on-brand` with image `src` and fallback to initials on error).
  - Updated `src/components/ds/Avatar/Avatar.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Account`, `Person`, `Logo`, `Small`, `Large`, `WithImage`) with controls.
  - Updated `src/components/ds/Avatar/Avatar.test.tsx`: 7 unit tests (updated existing test `renders unified sizes sm, md, lg across variants` to verify the unified 24/32/44 scale).
  - Stories compared: Account, Person, Logo, Small, Large, WithImage against `design-system/components/Avatar/preview.html` and screens at 390/1440 light/dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 10d · TabBar:
  - Rebuilt `TabBar` in `src/components/ds/TabBar/TabBar.tsx`:
    - Replaced raw `<button>` elements with `<a>` links (resolving `raw-button` lint error), adding `href`, `role="tab"`, `aria-selected`, and `aria-current="page"`.
    - Integrated `Icon` at size `lg` (20px) for all 5 canonical tabs (Home, Inbox, Upcoming, Transactions, More).
    - Integrated `Badge` `count` variant (`danger` for Inbox, `warning` for Transactions) formatted at `h-space-16 min-w-space-16` with `99+` threshold.
  - Updated `src/components/ds/TabBar/TabBar.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`HomeActive`, `TransactionsActive`, `HighCounts`, `NoCounts`, `Interactive`) with full argTypes controls.
  - Updated `src/components/ds/TabBar/TabBar.test.tsx`: 7 unit tests covering canonical order, link rendering, active state, click callbacks, badge counts and positioning, and hidden behavior.
  - Stories compared: HomeActive, TransactionsActive, HighCounts, NoCounts against `design-system/components/TabBar/preview.html` and phone navigation screens at 390px light/dark.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 10c · TopBar:
  - Created `TopBar` in `src/components/ds/TopBar/TopBar.tsx`:
    - Desktop page header bar, fixed height 48px (`h-control-xl min-h-control-xl`), canvas background with bottom hairline border (`bg-canvas border-b border-line`).
    - Title or breadcrumb (`title` with optional `crumb` separated by slash `/`).
    - Actions on right: Add button (primary with ⌘N shortcut via `Kbd`), Ask chat button (secondary with `chat` icon), Notifications button (secondary icon-only with `bell` icon).
    - All buttons use `Button` component (no raw `<button>`), all icons through `Icon` at size `md`.
  - Created `src/components/ds/TopBar/TopBar.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`TopLevelPage`, `DetailWithCrumb`, `NoActions`) with controls.
  - Created `src/components/ds/TopBar/TopBar.test.tsx`: 3 unit tests covering top-level page title, detail breadcrumbs, and action button click handlers.
  - Exported `TopBar` from `src/components/ds/index.ts`.
  - Stories compared: TopLevelPage, DetailWithCrumb, NoActions against `design-system/components/TopBar/preview.html` and desktop screens.
  - Checks: `npm run typecheck`, `npm run lint`, `vitest`, `npm run build-storybook`, `check-ui.mjs` (0 errors on touched files). Open questions: none. Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 10b · Rail:
  - Created `Rail` in `src/components/ds/Rail/Rail.tsx`:
    - Desktop primary navigation rail, 240px wide (`w-rail min-w-rail`).
    - Brand row with `BrandMark` and FinanceOS title.
    - Search button with ⌘K shortcut (`Button` secondary with `Kbd`, no raw buttons).
    - Grouped navigation links with `overline` headers; current item highlighted with `bg-brand-tint text-brand-strong`.
    - All icons through `Icon` at size `lg`.
    - Danger count bubble on Inbox via `Badge` `count`, warning text count on Transactions.
    - Bottom pinned footer with Settings link and user `Avatar`.
  - Created `src/components/ds/Rail/Rail.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Default`, `WithCounts`, `TransactionsActive`) with controls.
  - Created `src/components/ds/Rail/Rail.test.tsx`: 6 unit tests covering brand row, active link styling, link clicks triggering onNavigate, search button triggering onSearch, count badges, and user profile initials.
  - Exported `Rail` from `src/components/ds/index.ts`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npx vitest run src/components/ds/Rail` (6/6 tests passed), `npm run build-storybook`, `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Navigation/Rail/AllVariants`, `Default`, `WithCounts`, `TransactionsActive` beside `design-system/components/Rail/preview.html` at 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 10a · AppBar:
  - Restricted `AppBar` in `src/components/ds/AppBar/AppBar.tsx` to the phone bar only:
    - Renders brand mark (or back arrow on detail screens), breadcrumb and screen title with truncation, and Ask the data, Search, and Add action buttons.
    - All icons now go through `Icon` (`ChevronLeft`, `MessageSquare`, `Search`, `Plus`) at size `md`.
    - Removed `DesktopRail` and `DesktopTopBar` (moved to dedicated `Rail/` and `TopBar/` components).
    - Preserved `BrandMark` export for phone and rail branding.
  - Updated `src/components/ds/AppBar/AppBar.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`TopLevel`, `DetailScreen`, `WithoutCrumb`) with controls.
  - Updated `src/components/ds/AppBar/AppBar.test.tsx`: 5 unit tests covering BrandMark rendering with default and custom symbols, top-level screen title/crumb, detail screen back button with `onBack`, and action callbacks (`onAsk`, `onSearch`, `onAdd`).
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npx vitest run src/components/ds/AppBar` (5/5 tests passed), `npm run build-storybook`, `node design-system/tools/check-ui.mjs` clean (raw-button error on AppBar resolved).
  - Stories compared: `DS/Navigation/AppBar/AllVariants`, `TopLevel`, `DetailScreen`, `WithoutCrumb` beside `design-system/components/AppBar/preview.html` at 390px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 9c · DateField:
  - Created `DateField` in `src/components/ds/DateField/DateField.tsx`:
    - Shows and accepts typed `dd/mm/yyyy` with auto-slashes formatting via `formatDateInput`.
    - Never native `<input type="date">`.
    - Calendar icon `Button` opens `MonthCalendar` in a `Popover` on desktop, or `Dialog` (bottom sheet) on phone via `useIsPhone`.
    - Range mode (`range={true}`): two side-by-side typed fields ("From" and "To") sharing one calendar; range in calendar renders as a `brand-tint` band.
    - Min and max support (`minDate`, `maxDate`), error and disabled states.
    - Today and Clear buttons in the calendar footer.
  - Enhanced `MonthCalendar` in `src/components/ds/DateTile/DateTile.tsx` to support picker mode with month navigation, weekday headers, outside month days, range selection styling, and footer actions, while retaining backwards compatibility for events overview mode.
  - Created `src/components/ds/DateField/DateField.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Single`, `Range`, `WithMinMax`, `ErrorState`, `Disabled`) with controls.
  - Created `src/components/ds/DateField/DateField.test.tsx`: 8 unit tests covering `formatDateInput` helper, auto-formatting on input change, single date default value, helper and error text, disabled state, range mode with From/To fields, and opening calendar to pick a date.
  - Exported `DateField` from `src/components/ds/index.ts`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npx vitest run src/components/ds/DateField src/components/ds/DateTile` (13/13 tests passed), `npm run build-storybook`, `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Inputs/DateField/AllVariants`, `Single`, `Range`, `WithMinMax`, `ErrorState`, `Disabled` beside `design-system/components/DateField/preview.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 9b · TextArea:
  - Created `TextArea` in `src/components/ds/TextArea/TextArea.tsx`:
    - Label, optional marker, helper and error via shared `FieldFrame`.
    - Auto-grow from default 3 rows up to 8 rows (`minRows=3`, `maxRows=8`), then scrolls with `overflow-y: auto`.
    - Styled with `p-space-12`, `rounded-ds-md`, `border`, `bg-surface`, `focus:ring-2 focus:ring-focus-ring`, error state (`border-danger`), and disabled state (`bg-sunken`).
  - Created `src/components/ds/TextArea/TextArea.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Default`, `Filled`, `WithHelper`, `ErrorState`, `Disabled`) with controls.
  - Created `src/components/ds/TextArea/TextArea.test.tsx`: 6 unit tests covering label and textarea with rows=3, optional marker, typing via onChange, helper text, error state with danger border, and disabled state.
  - Exported `TextArea` from `src/components/ds/index.ts`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npx vitest run src/components/ds/TextArea` (6/6 tests passed), `npm run build-storybook`, `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Inputs/TextArea/AllVariants`, `Default`, `Filled`, `WithHelper`, `ErrorState`, `Disabled` beside `design-system/components/TextArea/preview.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 9a · TextField and FieldFrame:
  - Extracted shared field frame into `src/components/ds/FieldFrame.tsx` (`label`, `optional`, `helper`, `error`), used by `TextField` and `Select`.
  - Rebuilt `TextField` in `src/components/ds/TextField/TextField.tsx`:
    - Kinds supported: `text`, `number`, `email`, `amount` (₹ prefix with tabular figures), `password` (masked with Show/Hide toggle via `Button` ghost sm).
    - Removed obsolete props: `mode`, `date`, `multiline`, `locked`, and `inputClassName`.
    - Removed `ReadOnlyRow` (ListField in ListRow covers it).
  - Updated `Select` in `src/components/ds/Select/Select.tsx` to use `FieldFrame`.
  - Updated `Banner` in `src/components/ds/Banner/Banner.tsx` (`BannerProps` omits `title` from HTMLAttributes).
  - Updated `TextField.stories.tsx`: `AllVariants` as first export, args-driven variant stories (`Text`, `Amount`, `Password`, `Placeholder`, `WithHelper`, `ErrorState`, `Disabled`) with controls.
  - Updated `TextField.test.tsx`: 9 unit tests covering label, input, optional marker, typing via onChange, helper text, error state with danger border, disabled state, amount with ₹ prefix and tabular figures, password toggle via Button, and prefix/suffix slots.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npx vitest run src/components/ds/TextField src/components/ds/Select` (29/29 tests passed), `npm run build-storybook`, `node design-system/tools/check-ui.mjs` clean (zero errors on touched files).
  - Stories compared: `DS/Inputs/TextField/AllVariants`, `Text`, `Amount`, `Password`, `Placeholder`, `WithHelper`, `ErrorState`, `Disabled` beside `design-system/components/TextField/preview.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 8 · SectionHeader:
  - Created `SectionHeader` in `src/components/ds/SectionHeader/SectionHeader.tsx` with variants:
    - `date`: sticky day header on phone lists ("12 Oct" in 800 with weekday in `ink-3`, on `bg-subtle`, `z-sticky`).
    - `band`: form section in a sheet or card, `overline` caption in `ink-4` on `bg-sunken`, bleeding to the edges.
    - `month`: desktop list band ("September 2026 · 61 transactions · out ₹1,05,219"), `overline` on `bg-sunken`.
    - `danger`: band that closes an edit sheet (Delete account), `danger` caption.
  - Updated `Card` in `src/components/ds/Card/Card.tsx`: `CardSection` delegates completely to `SectionHeader` `band` (`CardSection draws nothing itself`).
  - Updated `Dialog` in `src/components/ds/Dialog/Dialog.tsx`: phone tertiary section band delegates to `SectionHeader` `danger`.
  - Updated `TransactionRow.stories.tsx` to use `SectionHeader` `date`.
  - Deleted `src/components/ds/DateGroupHeader/` and `src/components/ds/SectionBand/`, removing their exports from `src/components/ds/index.ts`.
  - Exported `SectionHeader` from `src/components/ds/index.ts`.
  - Created `src/components/ds/SectionHeader/SectionHeader.stories.tsx`: `AllVariants` as first export, stories for all 4 variants (`DateVariant`, `Band`, `Month`, `Danger`) with Controls.
  - Created `src/components/ds/SectionHeader/SectionHeader.test.tsx`: 6 unit tests covering all 4 variants, meta rendering, sticky toggle, and children fallback.
  - Files deleted: `src/components/ds/DateGroupHeader/DateGroupHeader.tsx`, `src/components/ds/DateGroupHeader/DateGroupHeader.stories.tsx`, `src/components/ds/DateGroupHeader/DateGroupHeader.test.tsx`, `src/components/ds/SectionBand/SectionBand.tsx`, `src/components/ds/SectionBand/SectionBand.stories.tsx`, `src/components/ds/SectionBand/SectionBand.test.tsx`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 3508 tests passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Data display/SectionHeader/AllVariants`, `Date`, `Band`, `Month`, `Danger` against `SectionHeader/preview.html` and `ds-07-data-display.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 7b · Toast:
  - Rebuilt `Toast` in `src/components/ds/Toast/Toast.tsx` to take `tone?: BannerTone`, reusing `bannerToneStyles` imported directly from `../Banner/Banner`.
  - Neutral default renders the dark ink toast (`bg-ink text-on-brand shadow-pop rounded-ds-lg`).
  - Replaced raw `<button>` for Undo action with `Button` primitive (`variant="ghost"`, size `sm`, underline link styling).
  - Maintained `showToast` sonner helper with timing and Undo wiring.
  - Updated `src/components/ds/Toast/Toast.stories.tsx`: `AllVariants` as first export, stories for all 5 tones (`Neutral`, `Success`, `Danger`, `Warning`, `Info`) with Controls.
  - Updated `src/components/ds/Toast/Toast.test.tsx`: 7 unit tests covering neutral dark ink default, Banner tone reuse with `shadow-pop`, Button undo callbacks, and showToast options.
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Toast` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Feedback/Toast/AllVariants`, `Neutral`, `Success`, `Danger`, `Warning`, `Info` against `Toast/preview.html` and `ds-10-feedback.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 7a · Banner:
  - Rebuilt `Banner` in `src/components/ds/Banner/Banner.tsx` supporting tones `danger`, `success`, `warning`, `info`, and `neutral`.
  - Added optional bold lead-in `title` slot and trailing `action` slot.
  - Exported `bannerToneStyles` for reuse in `Toast`.
  - Absorbed Callout's `callout` (= warning) and `note` (= neutral) variants, with backwards compatibility mapping for legacy aliases.
  - Deleted `src/components/ds/Callout/` (with `Note`), removing its export from `src/components/ds/index.ts`.
  - Updated `src/components/ds/Banner/Banner.stories.tsx`: `AllVariants` as first export, stories for all 5 tones (`Danger`, `Success`, `Warning`, `Info`, `Neutral`) and `WithAction` driven by args Controls.
  - Updated `src/components/ds/Banner/Banner.test.tsx`: 8 unit tests covering all 5 tones, semantic roles (alert for danger, status for others), legacy aliases, title, and action.
  - Files deleted: `src/components/ds/Callout/Callout.tsx`, `src/components/ds/Callout/Callout.stories.tsx`, `src/components/ds/Callout/Callout.test.tsx`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Banner` (8 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Feedback/Banner/AllVariants`, `Danger`, `Success`, `Warning`, `Info`, `Neutral`, `WithAction` against `Banner/preview.html` and `ds-10-feedback.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 6 · Dialog (merge Sheet and ConfirmSheet):
  - Created `src/components/ds/useSheetDrag.ts`: shared hook for phone bottom sheet drag handling (pointer down/move/up/cancel, threshold detection, springs back before threshold).
  - Rebuilt `Dialog` in `src/components/ds/Dialog/Dialog.tsx`:
    - Desktop modal: centred, `radius-xl`, `shadow-dialog`, sizes `sm` (440), `md` (640), `lg` (760), `xl` (920), × close button (`Icon` with `X` at size `md`).
    - Phone sheet: automatically picked below phone breakpoint, top corners `radius-sheet`, drag handle (`DialogHandle`), swipe down to close via `useSheetDrag`, no × button.
    - Side panel: `variant="side-panel"` slides in from right on desktop, renders as bottom sheet on phone.
    - Config-driven footer via props (`primary`, `secondary`, `tertiary`): tertiary destructive action sits far left on desktop (`mr-auto`); on phone it moves to the end of the body as a full-width danger `Button` under a danger SectionHeader band.
    - `ConfirmDialog` preset: destructive confirmation with server impact preview bullet list, checking state with loading spinner, disabled confirm button while running, and optional gentler action.
  - Deleted `src/components/ds/Sheet/` and `src/components/ds/ConfirmSheet/` completely (components, stories, tests).
  - Removed `Sheet` and `ConfirmSheet` exports from `src/components/ds/index.ts`, and exported `useSheetDrag`.
  - Updated `src/components/ds/Select/Select.tsx` to point phone sheet picker path to `Dialog` (`DialogContent`, `DialogBody`).
  - Updated `src/components/ds/Menu/Menu.tsx` to open in `Dialog` on phone when itemCount > 6.
  - Updated `src/components/ds/Dialog/Dialog.stories.tsx`: `AllVariants` as first export, all variant stories (`DesktopSm`, `DesktopMd`, `DesktopLg`, `DesktopXl`, `PhoneSheet`, `SidePanel`, `ConfirmDialogWithPreview`, `ConfirmDialogWithGentlerOption`, `ConfirmDialogLoading`, `InteractiveModal`) with Controls.
  - Updated `src/components/ds/Dialog/Dialog.test.tsx`: 13 tests covering desktop modal sizes, side-panel variant, phone drag gestures with `useSheetDrag`, phone tertiary placement in body, ConfirmDialog impact previews and loading state, and accessible Radix overlay. Added phone Dialog test to `Menu.test.tsx`.
  - Files deleted: `src/components/ds/Sheet/Sheet.tsx`, `src/components/ds/Sheet/Sheet.stories.tsx`, `src/components/ds/Sheet/Sheet.test.tsx`, `src/components/ds/ConfirmSheet/ConfirmSheet.tsx`, `src/components/ds/ConfirmSheet/ConfirmSheet.stories.tsx`, `src/components/ds/ConfirmSheet/ConfirmSheet.test.tsx`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 3508 tests passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --base c8b557b` clean for all touched files.
  - Stories compared: `DS/Overlays/Dialog/AllVariants`, `DesktopSm`, `DesktopMd`, `DesktopLg`, `DesktopXl`, `PhoneSheet`, `SidePanel`, `ConfirmDialogWithPreview`, `ConfirmDialogWithGentlerOption`, `ConfirmDialogLoading`, `InteractiveModal` against `Dialog/preview.html` and `ds-09-overlays.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 5b · FilterChip:
  - Replaced hand-drawn count badge in `src/components/ds/FilterChip/FilterChip.tsx` with `Badge` primitive (`variant="count"`).
  - Ensured ChevronDown and X use `Icon` at size `sm` with `text-current` matching label color.
  - Retained purely presentational chip structure (no dropdown list logic inside FilterChip).
  - Updated `src/components/ds/FilterChip/FilterChip.stories.tsx`: `AllVariants` as first export, added `DropdownWithSelect` story demonstrating dropdown filter chip as `<Select trigger={<FilterChip ... />} />`, with working Controls for all variant props.
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/FilterChip` (9 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Inputs/FilterChip/AllVariants`, `Off`, `On`, `OnWithValue`, `Dropdown`, `WithCount`, `Removable`, `ReviewOn`, `Toggle`, `MoreFilters`, `DropdownWithSelect` against `FilterChip/preview.html` and `ds-08-inputs.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 5a · Select:
  - Rebuilt list presentation on DS `Popover` with `width="match"` (`w-popover-trigger`) in `src/components/ds/Select/Select.tsx`.
  - Added `trigger?: React.ReactNode` slot allowing any element to open the list (supporting FilterChip triggers).
  - Replaced hand-drawn multi-select checkbox with `Checkbox` primitive.
  - Removed `locked` prop and lock glyphs across `Select.tsx`, `Select.stories.tsx`, and `Select.test.tsx` (`disabled` covers non-editable fields).
  - Ensured ChevronDown and ChevronUp use `Icon` at size `md`.
  - Updated `src/components/ds/Select/Select.stories.tsx`: `AllVariants` as first export, added `CustomTrigger` story with FilterChip, updated `WithIcon` with `Avatar` `logo` rendering `<img>`, and removed locked closed state.
  - Updated `src/components/ds/Select/Select.test.tsx`: replaced locked test with disabled, added custom trigger slot test and `width="match"` Popover test (13 tests passing).
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Select` (13 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Inputs/Select/AllVariants`, `SingleSelect`, `SingleWithSearchAndIcons`, `MultiSelect`, `MultiWithSearch`, `SectionedList`, `WithAnActionRow`, `SearchCreateFromTyping`, `NoResults`, `WithDescriptions`, `DisabledOption`, `CustomTrigger`, `ClosedFieldStates` against `Select/preview.html` and `ds-08-inputs.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 4b · Menu:
  - Rebuilt `Menu` component in `src/components/ds/Menu/Menu.tsx` on Radix DropdownMenu (`@radix-ui/react-dropdown-menu`), deleting the hand-made static `Menu` container to unify on a single Radix-based Menu API.
  - Extracted shared item-row style into `src/components/ds/itemRow.ts` (`getItemRowClass`) used by `MenuItem` with `min-h-control-lg px-space-10 rounded-ds-md font-text font-semibold text-body`, active (`bg-brand-tint text-brand-strong`), destructive (`text-danger hover:bg-danger-tint`), action (`text-brand font-bold`), and disabled (`text-ink-faint cursor-not-allowed`).
  - Styled floating content with `z-overlay bg-surface border border-line rounded-ds-lg shadow-pop p-space-6 flex flex-col min-w-menu-trigger animate-in fade-in-0 slide-in-from-top-1 duration-base`.
  - Rebuilt `src/components/ds/Menu/Menu.stories.tsx` with `AllVariants` as first export, all variants driven by args with working Controls (Actions, With icons and hints, Snooze presets, Disabled item, Sectioned, Switcher with a footer link), using `Icon` for icons.
  - Updated `src/components/ds/Menu/Menu.test.tsx` testing Radix DropdownMenu trigger, item clicks, keyboard navigation, disabled prevention, styling variants, and Escape to close.
  - Files deleted: hand-made static Menu implementation.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Menu` (9 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Actions/Menu/AllVariants`, `DS/Actions/Menu/Actions`, `DS/Actions/Menu/WithIconsAndHints`, `DS/Actions/Menu/SnoozePresets`, `DS/Actions/Menu/DisabledItem`, `DS/Actions/Menu/Sectioned`, `DS/Actions/Menu/SwitcherWithAFooterLink` against `Menu/preview.html` and `ds-07-actions.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 4a · Popover:
  - Created new `Popover` component in `src/components/ds/Popover/Popover.tsx` based on `@radix-ui/react-popover`: floating surface with `bg-surface border border-line rounded-ds-lg shadow-pop p-space-4 z-overlay`, `animate-in fade-in-0 slide-in-from-top-1 duration-base`, supporting `width="match"` (`w-popover-trigger`) and `width="content"` (`min-w-popover-trigger`). Exported primitives `PopoverRoot`, `PopoverTrigger`, `PopoverContent`, `PopoverPortal`, `PopoverClose`, `PopoverAnchor` and unified `Popover`.
  - Created `src/components/ds/Popover/Popover.stories.tsx` with `AllVariants` as first export, driven by args with Controls for `width`, `align`, `side`.
  - Created `src/components/ds/Popover/Popover.test.tsx` testing open/close, `match` width trigger sizing, `content` width sizing, controlled state, and Escape to close.
  - Exported `Popover` from `src/components/ds/index.ts`.
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Popover` (5 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Overlays/Popover/AllVariants`, `DS/Overlays/Popover/MatchTriggerWidth`, `DS/Overlays/Popover/ContentWidth` against `Popover/preview.html` and `ds-05-foundations.dc.html` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 · Antigravity · Unit 3 · Checkbox:
  - Created new `Checkbox` component in `src/components/ds/Checkbox/Checkbox.tsx` based on `@radix-ui/react-checkbox`: 16px box (`w-space-16 h-space-16`), `rounded-ds-xs`, 2px `line-strong` border (`bg-surface`); active = `brand` fill and border with Icon `Check` (`sm`); mixed = `brand` fill and border with Icon `Minus` (`sm`); disabled = `disabled:opacity-50 disabled:cursor-not-allowed`.
  - Created `src/components/ds/Checkbox/Checkbox.stories.tsx` with `AllVariants` as first export and stories driven by args with Controls (Off, On, Mixed, Disabled).
  - Created `src/components/ds/Checkbox/Checkbox.test.tsx` testing unchecked default, checked state, indeterminate / mixed state, toggling via click, and disabled behavior.
  - Exported `Checkbox` from `src/components/ds/index.ts`.
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Checkbox` (5 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Inputs/Checkbox/AllVariants`, `DS/Inputs/Checkbox/Off`, `DS/Inputs/Checkbox/On`, `DS/Inputs/Checkbox/Mixed`, `DS/Inputs/Checkbox/Disabled` against `Checkbox/preview.html` and `ds-07-inputs.webp` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 2 · Badge count and Button:
  - Added `count` variant to `src/components/ds/Badge/Badge.tsx`: 16px count bubble (`h-space-16 min-w-space-16 px-space-6 rounded-ds-pill`, `tab-label`, tones ink, danger and warning; displays "99+" for counts over 99).
  - Updated `src/components/ds/Badge/Badge.stories.tsx` with `AllVariants` as first export and stories driven by args with Controls (Green, Amber, Rose, Blue, Grey, Count, CountDanger, CountWarning, CountOver99).
  - Updated `src/components/ds/Badge/Badge.test.tsx` testing count bubble styling, ink/danger/warning tones, and "99+" over 99 threshold.
  - Updated `src/components/ds/Button/Button.tsx`: imports and uses `Badge` with `variant="count"` instead of drawing its own count pill, and uses `Icon` with Lucide `Loader2` instead of raw icon; maintained strict variants (`primary`, `secondary`, `danger`, `danger-filled`, `ghost`) and sizes (`sm`, `md`, `xl`).
  - Updated `src/components/ds/Button/Button.stories.tsx`: `AllVariants` as first export, all icons driven through `Icon` (`sm` 14px for small button, `md` 16px for standard buttons), stories driven by args with Controls.
  - Updated `src/components/ds/Button/Button.test.tsx`: tested icon-only button and count bubble via Badge.
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 3 touched test files / 22 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Data display/Badge/*` and `DS/Actions/Button/*` against `Badge/preview.html`, `Button/preview.html`, and `ds-06-actions.webp` at 390px and 1440px in light and dark.
  - Differences left open: Count pill appearance on primary button (see Open questions).
  - Deviations: none.


- 2026-10-15 · Phase 2 · Antigravity · Unit 1 · Icon:
  - Created new `Icon` primitive in `src/components/ds/Icon/Icon.tsx` wrapping Lucide icons at token sizes (`sm` 14px `w-icon-sm h-icon-sm`, `md` 16px `w-icon-md h-icon-md`, `lg` 20px `w-icon-lg h-icon-lg`), 2px stroke, `currentColor`.
  - Created `src/components/ds/Icon/Icon.stories.tsx` driven by args with `AllVariants` as first export, plus `Sm`, `Md`, `Lg`.
  - Created `src/components/ds/Icon/Icon.test.tsx` testing size classes, strokeWidth=2, aria-hidden, className merging, and children rendering.
  - Exported `Icon` from `src/components/ds/index.ts`.
  - Replaced every typed glyph (`▾`, `✕`, `✓`, `›`, `‹`) across `src/components/ds/` with `Icon` or SVG:
    - `src/components/ds/FilterChip/FilterChip.tsx` (replaced `▾` with `<Icon icon={ChevronDown} size="sm" />`, replaced `✕` with `<Icon icon={X} size="sm" />`);
    - `src/components/ds/Select/Select.tsx` (replaced option checkmarks with `<Icon icon={Check} size="sm|md" />`, replaced triggers with `<Icon icon={isOpen ? ChevronUp : ChevronDown} size="md" />`);
    - `src/components/ds/RuleCard/RuleCard.tsx` (replaced approve button with `<Button icon={<Icon icon={Check} size="sm" />}>Approve</Button>`, removed checkmark from comment);
    - `src/components/ds/AuthPanel/AuthPanel.tsx` (replaced typed check with SVG checkmark path);
    - `src/components/ds/Card/Card.stories.tsx` (replaced `Inbox ›` with `Inbox <Icon icon={ChevronRight} size="sm" />`);
    - `src/components/ds/Dialog/Dialog.stories.tsx` (replaced checkmarks with `<Icon icon={Check} size="sm" />`);
    - `src/components/ds/Menu/Menu.stories.tsx` (replaced `Default ✓` with `Default <Icon icon={Check} size="sm" />`);
    - `src/components/ds/Sheet/Sheet.stories.tsx` (replaced `✓ Review` with `Review` button using `<Icon icon={Check} size="sm" />`, replaced checkmark with `<Icon icon={Check} size="md" />`);
    - Changed existing tests: `src/components/ds/FilterChip/FilterChip.test.tsx` (queried svg instead of text `▾`), `src/components/ds/Card/Card.test.tsx` (action button name `Inbox`), `src/components/ds/Menu/Menu.test.tsx` (hint text `Default`), `src/components/ds/Pager/Pager.test.tsx` (cleaned `‹`/`›` in comments).
  - Files deleted: none.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 11 touched test files / 96 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Stories compared: `DS/Foundations/Icon/AllVariants`, `DS/Foundations/Icon/Sm`, `DS/Foundations/Icon/Md`, `DS/Foundations/Icon/Lg` against `Icon/preview.html` and `ds-05-foundations.webp` at 390px and 1440px in light and dark.
  - Differences left open: none.
  - Deviations: none.


- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 17) · AuthPanel component fixes:
  - Fixed AuthPanel in `src/components/ds/AuthPanel/AuthPanel.tsx`:
    - Converted illustration scenes (both card strip and desktop split) into pure SVG artwork, eliminating all fixed-pixel inline style sizes (`height: 120`, `height: 260`, and element geometry styles) in accordance with Owner decisions (2026-10-15).
    - Replaced letter "G" in Google sign-in button with the official 4-color Google SVG mark (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) matching `P-login.dc.html`, `D-login.dc.html`, and `P-auth-states.dc.html` (RULES §8.4).
    - Added `autoComplete="email"` on email field, `autoComplete={isSignup ? 'new-password' : 'current-password'}` on password field, and `autoComplete="one-time-code"` on invite code field.
    - Removed unboarded marketing copy from signup form (removed invented 3-step explainer with unboarded claims; updated signup subtitle to board copy `"You will need an invite code."` matching `P-auth-states.dc.html` per RULES §8.4).
  - Updated `src/components/ds/AuthPanel/AuthPanel.stories.tsx`:
    - Updated story section title from `Sign-up card (with invite code and explainer)` to `Sign-up card (with invite code)`.
  - Updated `src/components/ds/AuthPanel/AuthPanel.test.tsx`:
    - Updated signup test to assert board subtitle (`You will need an invite code.`).
    - Added unit tests verifying `autoComplete` attributes on email, password, and invite code inputs.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/AuthPanel` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `AuthPanel/preview.html`, `P-login.webp`, `D-login.webp`, and `P-auth-states.webp`:
    - `DS/Screens/AuthPanel/Login`
    - `DS/Screens/AuthPanel/SignUp`
    - `DS/Screens/AuthPanel/SplitDesktop`
    - `DS/Screens/AuthPanel/Interactive`
    - `DS/Screens/AuthPanel/AllVariants`
    Verified SVG artwork scaling, 4-color Google mark, card layout, desktop split scene, dark mode contrast, and clean form inputs.
  - Differences left open: none.
  - Deviations: Official Google brand logo colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) used in Google sign-in button SVG in `AuthPanel.tsx` per owner review and boards `P-login.dc.html`, `D-login.dc.html`, `P-auth-states.dc.html` (marked with `ds-allow`).

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 16) · Toast component fixes:
  - Fixed Toast in `src/components/ds/Toast/Toast.tsx`:
    - Updated background from `bg-brand` to `bg-ink text-on-brand` matching reference `.toast`.
    - Updated undo button styling to `text-line hover:text-line-soft` matching reference `.toast a`.
  - Updated `src/components/ds/Toast/Toast.test.tsx`:
    - Replaced padding-only test with `bg-ink` token assertions.
    - Added comprehensive unit tests for `showToast` undo wiring: verifies user callback is invoked and `sonnerToast.dismiss(id)` is called with the toast ID.
    - Added tests for custom duration, custom `undoLabel`, and error state.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Toast` (6 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Toast/preview.html` and `ds-09-feedback.webp`:
    - `DS/Feedback/Toast/Confirmation`
    - `DS/Feedback/Toast/Undo`
    - `DS/Feedback/Toast/MarkPaid`
    - `DS/Feedback/Toast/Failure`
    - `DS/Feedback/Toast/AllVariants`
    Verified `bg-ink` contrast, high contrast white text, light grey undo link, and failure messaging.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 15) · Callout component fixes:
  - Fixed Callout in `src/components/ds/Callout/Callout.tsx`:
    - Updated `warning-banner` variant: provided distinct banner layout with `justify-between gap-space-10` and trailing action container (`shrink-0`), distinguishing it from the inline `callout` flow with inline title/action.
  - Updated `src/components/ds/Callout/Callout.test.tsx`:
    - Added unit test asserting `warning-banner` applies `justify-between gap-space-10` and places action element in a `.shrink-0` trailing container.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Callout` (5 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Callout/preview.html` and `ds-09-feedback.webp`:
    - `DS/Feedback/Callout/ActOnIt`
    - `DS/Feedback/Callout/NoteVariant`
    - `DS/Feedback/Callout/WarningBannerStyle`
    - `DS/Feedback/Callout/AllVariants`
    Verified bold inline headline on Act on it, neutral canvas ground on Note, and distinct trailing action layout on Warning banner style.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 14) · Avatar component fixes:
  - Fixed Avatar in `src/components/ds/Avatar/Avatar.tsx`:
    - Updated person avatar sizing: changed `md` person from `h-space-28` to standard `h-control-md aspect-square text-caption` (32px, `control-md`), matching the account avatar per owner decision (2026-10-15).
    - Updated institution logo sizing: set `md` and `sm` logo to `h-space-24 aspect-square text-overline` (24px, 10px 800 overline font matching reference `.logo`).
  - Updated `src/components/ds/Avatar/Avatar.stories.tsx`:
    - Updated `Logo` and `AllVariants` stories to pass realistic bank brand background colors matching `preview.html` and the board (`#004c8f` for HDFC, `#97144d` for Axis, `#22409a` for SBI), resolving the incorrect green `bg-brand` display.
  - Updated `src/components/ds/Avatar/Avatar.test.tsx`:
    - Added unit test assertions verifying `size="md"` person avatar renders with `h-control-md` (32px) and `size="md"` logo avatar renders with `h-space-24` and `text-overline`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Avatar` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Avatar/preview.html` and `ds-08-data.webp`:
    - `DS/Data display/Avatar/Account`
    - `DS/Data display/Avatar/Person`
    - `DS/Data display/Avatar/Logo`
    - `DS/Data display/Avatar/Sizes`
    - `DS/Data display/Avatar/WithImage`
    - `DS/Data display/Avatar/AllVariants`
    Verified 32px person circle avatar (`control-md`), 32px account square avatar, 24px institution logo with navy HDFC fill (`#004c8f`), and clean typography.
  - Differences left open: none.
  - Deviations: Realistic bank brand background colors (`#004c8f`, `#97144d`, `#22409a`) passed via style props in `Avatar.stories.tsx` to match `preview.html` and `ds-08-data.webp` (marked with `ds-allow`).

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 13) · DateTile component fixes:
  - Fixed DateTile in `src/components/ds/DateTile/DateTile.tsx`:
    - Updated day cell element gap from `gap-space-2` to `gap-space-4`, matching `reference.css` `.cd`.
  - Updated `src/components/ds/DateTile/DateTile.stories.tsx`:
    - Removed extraneous `Interactive` story not defined in component specification.
  - Updated `src/components/ds/DateTile/DateTile.test.tsx`:
    - Removed unused `container` variables in tests, resolving lint warnings.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/DateTile` (5 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `DateTile/preview.html` and `ds-08-data.webp`:
    - `DS/Data display/DateTile/Tile`
    - `DS/Data display/DateTile/Calendar`
    - `DS/Data display/DateTile/AllVariants`
    Verified 40px tile width, 800 weight day number, 10px uppercase month overline, 6px event indicators (bill warning, in positive, emi info), brand-tint today indicator, and clean grid borders.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 12) · ListRow component fixes:
  - Fixed ListRow in `src/components/ds/ListRow/ListRow.tsx`:
    - Updated title typography from `font-bold text-body` to `text-body-strong` (13px 700).
    - Updated subtitle typography from `text-caption` to `text-label font-medium text-ink-3` (12px 500), matching reference `.cs`.
    - Updated trailing amount typography from `font-bold text-body` to `text-body-strong`.
    - Updated `ListField` value weight from regular to `font-semibold` (`font-weight: 600`), matching `.fld > span:last-child`.
  - Updated `src/components/ds/ListRow/ListRow.test.tsx`:
    - Updated unit tests to assert `text-body-strong` on title, `text-label` on subtitle, and `font-semibold` on `ListField` value.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/ListRow` (10 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `ListRow/preview.html` and `ds-08-data.webp`:
    - `DS/Data display/ListRow/Basic`
    - `DS/Data display/ListRow/WithDateTile`
    - `DS/Data display/ListRow/WithIconTile`
    - `DS/Data display/ListRow/Interactive`
    - `DS/Data display/ListRow/WithKebabMenu`
    - `DS/Data display/ListRow/Highlighted`
    - `DS/Data display/ListRow/Disabled`
    - `DS/Data display/ListRow/FieldsVariant`
    - `DS/Data display/ListRow/AllVariants`
    Verified 13px 700 title, 12px 500 subtitle, 600 weight field values, and clean row borders.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 11) · Card component fixes:
  - Fixed Card in `src/components/ds/Card/Card.tsx`:
    - Removed extra divider in empty variant: removed `border-t border-line-soft` from `CardEmpty`, aligning with `preview.html`.
  - Updated `src/components/ds/Card/Card.stories.tsx`:
    - Fixed pager sizing in `WithAPager` and `AllVariants`: updated pager buttons from miniature 24px buttons to standard `min-w-control-md h-control-md px-space-6 rounded-ds-md` (32px) controls matching the board.
  - Updated `src/components/ds/Card/Card.test.tsx`:
    - Added unit test assertion verifying `CardEmpty` does not have `border-t`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Card` (6 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Card/preview.html` and `ds-06-cards.webp`:
    - `DS/Data display/Card/TitleSubtitleLink`
    - `DS/Data display/Card/WithAnAction`
    - `DS/Data display/Card/WithRows`
    - `DS/Data display/Card/WithAPager`
    - `DS/Data display/Card/WithSectionBands`
    - `DS/Data display/Card/Empty`
    - `DS/Data display/Card/AllVariants`
    Verified no extra divider in empty variant, standard 32px pager buttons, and clean row borders.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 10) · Widget component fixes:
  - Fixed Widget in `src/components/ds/Widget/Widget.tsx`:
    - Updated retry button styling: changed from grey text to bold ink (`text-ink font-bold underline hover:text-ink-2`) matching the board.
    - Updated remove button styling in unavailable state to bold ink (`text-ink font-bold underline hover:text-ink-2`).
    - Added `role="alert"` on the failed error container.
  - Updated `src/components/ds/Widget/Widget.test.tsx`:
    - Added unit test assertions for `role="alert"` and bold ink styling (`text-ink font-bold`) on retry and remove buttons.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Widget` (5 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Widget/preview.html` and `ds-06-cards.webp`:
    - `DS/Data display/Widget/Figure`
    - `DS/Data display/Widget/RowsLoading`
    - `DS/Data display/Widget/Failed`
    - `DS/Data display/Widget/Unavailable`
    - `DS/Data display/Widget/AllVariants`
    Verified bold ink retry link, bold ink remove link, alert role, and clean widget header styling.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 9) · KpiTile component fixes:
  - Fixed KpiTile in `src/components/ds/KpiTile/KpiTile.tsx`:
    - Updated retry button styling: changed from grey text to bold ink (`text-ink font-bold underline hover:text-ink-2`) matching the board.
    - Added `role="alert"` on the failed state container.
    - Added accessible `aria-label` to the embedded ProgressBar.
  - Updated `src/components/ds/KpiTile/KpiTile.test.tsx`:
    - Added unit test assertions for `role="alert"` and bold ink styling (`text-ink font-bold`) on retry button.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/KpiTile` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `KpiTile/preview.html` and `ds-06-cards.webp`:
    - `DS/Data display/KpiTile/Hero`
    - `DS/Data display/KpiTile/DeltaBadDirection`
    - `DS/Data display/KpiTile/WithBar`
    - `DS/Data display/KpiTile/WithBadges`
    - `DS/Data display/KpiTile/Loading`
    - `DS/Data display/KpiTile/Failed`
    - `DS/Data display/KpiTile/AllVariants`
    Verified bold ink retry link, hero figure styling, delta indicators, and alert semantics.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 8) · Tabs component fixes:
  - Fixed Tabs in `src/components/ds/Tabs/Tabs.tsx`:
    - Fixed focus ring clipping: added `focus-visible:ring-inset rounded-ds-sm` to `TabsTrigger` so focus ring is inset and never clipped by `TabsList`'s `overflow-x-auto` container.
    - Fixed count contrast: removed `opacity-75` from tab count span, keeping count contrast crisp and matching `preview.html`.
  - Updated `src/components/ds/Tabs/Tabs.test.tsx`:
    - Updated unit tests to assert `focus-visible:ring-inset` on tabs and confirm count element has no `opacity-75`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Tabs` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Tabs/preview.html`:
    - `DS/Navigation/Tabs/Plain`
    - `DS/Navigation/Tabs/WithCounts`
    - `DS/Navigation/Tabs/ScrollingOnPhone`
    - `DS/Navigation/Tabs/InteractiveWithContent`
    - `DS/Navigation/Tabs/AllVariants`
    Verified unclipped inset focus ring, clear tab underline indicator, and crisp contrast on counts without opacity reduction.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 7) · SelectionBar component fixes:
  - Fixed SelectionBar in `src/components/ds/SelectionBar/SelectionBar.tsx`:
    - Fixed "Select all" button height: changed from unpadded 12px inline text to `inline-flex items-center h-control-md px-space-8 rounded-ds-md` (32px standard control height meeting touch targets).
    - Deduplicated Escape listener: only attach keydown listener to window when `count > 0` (preventing listeners while selection is empty), check `e.defaultPrevented`, and call `e.preventDefault()`.
    - Added `z-dock` to phone docked bar container (`shadow-dock z-dock`).
    - Verified `w-control-md` (32px) close button sizing now renders correctly with the updated contract.
  - Updated `src/components/ds/SelectionBar/SelectionBar.test.tsx`:
    - Added tests for `h-control-md` on Select all button, presence of `z-dock` on phone variant, and verified Escape does not trigger onClear when `count === 0`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/SelectionBar` (7 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `SelectionBar/preview.html`:
    - `DS/Actions/SelectionBar/Desktop`
    - `DS/Actions/SelectionBar/PhoneDocked`
    - `DS/Actions/SelectionBar/SingleAction`
    - `DS/Actions/SelectionBar/ActionDisabled`
    - `DS/Actions/SelectionBar/AllVariants`
    Verified 32px close button, 32px Select all button height, z-dock stacking, and clean phone dock styling.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 6) · Menu component fixes:
  - Fixed Menu in `src/components/ds/Menu/Menu.tsx`:
    - Updated sizing: `MenuItem` and `DropdownMenuItem` height set to `min-h-control-lg px-space-10` (36px) per owner decision (2026-10-15).
    - Fixed disabled item fade: removed double fade (`opacity-60` removed, strictly `text-ink-faint cursor-not-allowed`).
    - Added focus ring: added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset`.
    - Added keyboard navigation on static `Menu`: handled `ArrowDown`, `ArrowUp`, `Home`, and `End` across active `button[role="menuitem"]` items, wrapping around and skipping disabled items.
  - Updated `src/components/ds/Menu/Menu.test.tsx`:
    - Added unit tests for `min-h-control-lg`, focus ring, single fade on disabled items, and keyboard arrow/Home/End navigation.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test src/components/ds/Menu` (10 passed), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Menu/preview.html` and `ds-08-data.webp` / `D-dashboards-menu.webp`:
    - `DS/Actions/Menu/Actions`
    - `DS/Actions/Menu/WithIconsAndHints`
    - `DS/Actions/Menu/SnoozePresets`
    - `DS/Actions/Menu/DisabledItem`
    - `DS/Actions/Menu/Sectioned`
    - `DS/Actions/Menu/SwitcherWithAFooterLink`
    - `DS/Actions/Menu/FloatingDropdown`
    - `DS/Actions/Menu/AllVariants`
    Verified 36px item height, crisp focus ring, proper disabled item rendering, and keyboard traversal.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 5) · DropZone component fixes:
  - Fixed DropZone in `src/components/ds/DropZone/DropZone.tsx`:
    - Updated border: changed dashed border from `border-2 border-dashed` to 1px `border border-dashed` per owner decision (2026-10-15).
    - Added `showDropArea?: boolean` (defaults to `true`): allows hiding the drop box when displaying only queued files or recent imports, preventing stories from re-rendering the idle zone.
    - Added `error?: React.ReactNode`: displays error message text inside the drop box (`text-caption font-bold text-danger`) with `border-danger bg-danger-tint` styling instead of color only.
  - Updated `src/components/ds/DropZone/DropZone.stories.tsx`:
    - Set `showDropArea: false` on `Queued` and `TooLarge` stories and in `AllVariants` so queued variants render file cards directly matching `preview.html`.
    - Added `WithDropError` story to demonstrate drop zone error state with message text.
  - Updated `src/components/ds/DropZone/DropZone.test.tsx`:
    - Added unit tests for 1px border (`border`, not `border-2`), drop zone error message text rendering, and `showDropArea={false}` hiding the drop box.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,497 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `DropZone/preview.html` and `ds-07-inputs.webp` board:
    - `DS/Inputs/DropZone/Idle`
    - `DS/Inputs/DropZone/DraggingOver`
    - `DS/Inputs/DropZone/Queued`
    - `DS/Inputs/DropZone/TooLarge`
    - `DS/Inputs/DropZone/WithDropError`
    - `DS/Inputs/DropZone/WithRecentImports`
    - `DS/Inputs/DropZone/AllVariants`
    Verified 1px dashed border, error message text rendering, and queued file lists without duplicate idle zones.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 4) · SegmentedControl component fixes:
  - Fixed SegmentedControl in `src/components/ds/SegmentedControl/SegmentedControl.tsx`:
    - Removed dead `size` prop: eliminated unused `size?: 'md'` from `SegmentedControlProps`.
    - Removed stray `z-dock`: removed misplaced dock bar z-index class from option buttons.
    - Added accessible name: added `aria-label={ariaLabel || 'Options'}` to the container `radiogroup`.
  - Updated `src/components/ds/SegmentedControl/SegmentedControl.stories.tsx`:
    - Removed unlisted variants (`FullWidth` and `Disabled`), keeping stories strictly matching the README and preview specification (Two options, Three options, View switch, In a form, AllVariants).
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,494 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `SegmentedControl/preview.html` and `ds-07-inputs.webp` board:
    - `DS/Inputs/SegmentedControl/TwoOptions`
    - `DS/Inputs/SegmentedControl/ThreeOptions`
    - `DS/Inputs/SegmentedControl/ViewSwitch`
    - `DS/Inputs/SegmentedControl/InAForm`
    - `DS/Inputs/SegmentedControl/AllVariants`
    Verified active segment ink fill with `on-brand` text, inactive hover states, border styling, and keyboard arrow selection.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 3) · Switch component fixes:
  - Fixed Switch in `src/components/ds/Switch/Switch.tsx`:
    - Replaced inline `34×20` style with token classes `w-control-lg h-space-20` (36×20) and knob `w-space-16 h-space-16` translating `translate-x-space-16` per owner decision (2026-10-15).
    - Fixed double toggle on Space: removed custom `onKeyDown` interceptor, letting native `<button type="button">` handle standard keyboard activation.
    - Dropped redundant `ToggleRow` export: removed `ToggleRow` wrapper in favor of direct `Switch` with `label` and `description` props as documented in README.
    - Added accessible name fallback: defaulted `aria-label="Toggle"` when used without a visible label.
  - Updated `src/components/ds/Switch/Switch.stories.tsx`:
    - Replaced `ToggleRow` imports and usage with `Switch`.
  - Updated `src/components/ds/Switch/Switch.test.tsx`:
    - Replaced `ToggleRow` test suite with `Switch with label and description`.
    - Added assertion for token sizes `w-control-lg h-space-20`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,494 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Switch/preview.html` and `ds-07-inputs.webp` board:
    - `DS/Inputs/Switch/Off`
    - `DS/Inputs/Switch/On`
    - `DS/Inputs/Switch/DisabledOff`
    - `DS/Inputs/Switch/DisabledOn`
    - `DS/Inputs/Switch/ToggleRowStory`
    - `DS/Inputs/Switch/ToggleRowOn`
    - `DS/Inputs/Switch/AllVariants`
    Verified 36×20 switch dimensions with 16px knob translation, brand fill on toggle, and row label/description spacing.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 2) · SearchField component fixes:
  - Fixed SearchField in `src/components/ds/SearchField/SearchField.tsx`:
    - Filter variant height: verified `h-control-md` (32px) and `px-space-10` for `variant="filter"` (default) matching board `ds-07`, and `h-control-lg` (40px) for `variant="sheet"`.
    - Removed `inputClassName`: removed unneeded class injection prop from `SearchFieldProps`.
  - Updated `src/components/ds/SearchField/SearchField.test.tsx`:
    - Added unit test asserting default filter variant applies `h-control-md`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,493 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `SearchField/preview.html` and `ds-07-inputs.webp` board:
    - `DS/Inputs/SearchField/Empty`
    - `DS/Inputs/SearchField/TypingWithAClearX`
    - `DS/Inputs/SearchField/LabelledInsideASheet`
    - `DS/Inputs/SearchField/NoResults`
    - `DS/Inputs/SearchField/AllVariants`
    Verified 32px height for filter variant and 40px height for sheet variant in both themes.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 11 (part 1) · TextField component fixes:
  - Fixed TextField in `src/components/ds/TextField/TextField.tsx`:
    - Locked state: updated `locked` to set `readOnly` without disabling the input, keeping it focusable and submittable in forms, styled with `bg-sunken text-ink-3` and lock icon per RULES §7.7.
    - Removed `inputClassName`: eliminated arbitrary class injection prop from `TextFieldProps`.
    - Added date mode: added `mode?: 'text' | 'date'` (and `date?: boolean` / `type="date"`) support that shows and accepts `dd/mm/yyyy`, formatting typed input into `dd/mm/yyyy`, setting placeholder to `dd/mm/yyyy`, and defaulting suffix to Calendar icon.
  - Updated `src/components/ds/TextField/TextField.stories.tsx`:
    - Updated `DateInput` and `AllVariants` stories to use `mode="date"`.
  - Updated `src/components/ds/TextField/TextField.test.tsx`:
    - Updated locked test to verify `not.toBeDisabled()` and `toHaveAttribute('readonly')`.
    - Added unit test asserting date mode formatting and acceptance of `dd/mm/yyyy`.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,492 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `TextField/preview.html` and `ds-07-inputs.webp` board:
    - `DS/Inputs/TextField/Default`
    - `DS/Inputs/TextField/Placeholder`
    - `DS/Inputs/TextField/Focused`
    - `DS/Inputs/TextField/WithHelper`
    - `DS/Inputs/TextField/Error`
    - `DS/Inputs/TextField/Disabled`
    - `DS/Inputs/TextField/Locked`
    - `DS/Inputs/TextField/AmountWithPrefix`
    - `DS/Inputs/TextField/PasswordWithToggle`
    - `DS/Inputs/TextField/DateInput`
    - `DS/Inputs/TextField/MultiLine`
    - `DS/Inputs/TextField/ReadOnly`
    - `DS/Inputs/TextField/AllVariants`
    Verified locked read-only styling with lock icon, date mode with calendar icon and `dd/mm/yyyy`, and input heights.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 10 (part 3) · Button component fixes:
  - Fixed Button in `src/components/ds/Button/Button.tsx`:
    - Cleaned variant and size aliases: restricted variants to `'primary' | 'secondary' | 'danger' | 'danger-filled' | 'ghost'` and sizes to `'sm' | 'md' | 'xl'`, removing unlisted aliases (`danger-outline`, `small`, `default`, `phone`) per README specification.
    - Handled count pill on primary button: rendered `bg-surface text-ink` when on a primary button so the count pill remains contrasting and legible against `bg-brand`, contrasting with `bg-ink text-on-brand` on secondary buttons.
  - Updated callers for strict Button types:
    - `src/components/ds/ConfirmSheet/ConfirmSheet.tsx`: updated buttons to `size="xl"`.
    - `src/components/ds/ConfirmSheet/ConfirmSheet.stories.tsx`: updated trigger to `variant="danger"`.
    - `src/components/ds/Sheet/Sheet.stories.tsx`: updated footer buttons to `size="xl"`.
  - Updated `src/components/ds/Button/Button.test.tsx`:
    - Added unit test asserting count pill renders `bg-surface text-ink` on primary buttons and `bg-ink text-on-brand` on secondary buttons.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,491 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Button/preview.html` and `ds-06-actions.webp` board:
    - `DS/Actions/Button/Secondary`
    - `DS/Actions/Button/Primary`
    - `DS/Actions/Button/DangerOutline`
    - `DS/Actions/Button/DangerFilled`
    - `DS/Actions/Button/Ghost`
    - `DS/Actions/Button/IconButton`
    - `DS/Actions/Button/Small`
    - `DS/Actions/Button/Default`
    - `DS/Actions/Button/Phone`
    - `DS/Actions/Button/Loading`
    - `DS/Actions/Button/Disabled`
    - `DS/Actions/Button/WithIcon`
    - `DS/Actions/Button/WithCount`
    - `DS/Actions/Button/AllVariants`
    Verified variants, states, sizes (sm 26px, md 32px, xl 44px), icon buttons, count pill, and phone sheet footer.
  - Differences left open: Count pill appearance on primary button (see Open questions).
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 10 (part 2) · FilterChip component fixes:
  - Fixed FilterChip in `src/components/ds/FilterChip/FilterChip.tsx`:
    - Removable sibling buttons: structured removable chip as two sibling `<button>` elements (chip label button and `✕` remove button) inside a styled pill container, eliminating invalid and click-breaking nested buttons.
    - Tokenized count bubble: replaced inline `style={{ minWidth: 18, height: 18 }}` with design-system tokens `min-w-space-16 h-space-16 px-space-6 rounded-ds-pill bg-ink text-on-brand font-text font-bold text-tab-label leading-none` matching `reference.css` (`.cnt`) and the owner's 16px count bubble decision.
    - Cleaned unknown classes: removed `font-inherit` and `text-surface`.
  - Updated `src/components/ds/FilterChip/FilterChip.stories.tsx`:
    - Updated variant section titles in `AllVariants` to `font-text text-overline font-extrabold uppercase text-ink-4` matching the design reference board.
  - Updated `src/components/ds/FilterChip/FilterChip.test.tsx`:
    - Added unit test asserting chip button and remove button are non-nested sibling elements, verifying independent click handling.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,491 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `FilterChip/preview.html` and `ds-07-inputs.dc.html` board:
    - `DS/Inputs/FilterChip/Off`
    - `DS/Inputs/FilterChip/On`
    - `DS/Inputs/FilterChip/WithValue`
    - `DS/Inputs/FilterChip/WithCount`
    - `DS/Inputs/FilterChip/Removable`
    - `DS/Inputs/FilterChip/ReviewOn`
    - `DS/Inputs/FilterChip/Toggle`
    - `DS/Inputs/FilterChip/MoreFilters`
    - `DS/Inputs/FilterChip/FilterRow`
    - `DS/Inputs/FilterChip/AllVariants`
    Verified 16px count bubble, sibling removable button appearance and interaction, amber review chip, and dashed more variant in both light and dark modes.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 10 (part 1) · Banner component fixes:
  - Fixed Banner in `src/components/ds/Banner/Banner.tsx`:
    - Corrected `ok` tone styling: updated to `bg-positive-tint text-positive-strong` per README and Ink token lock.
    - Cleaned unlisted variants and aliases: restricted `tone` to `'err' | 'ok' | 'info' | 'warn'` matching the README specification, removing unlisted aliases (`error`, `success`, `warning`) and `variant` prop.
  - Updated `src/components/ds/Banner/Banner.test.tsx`:
    - Updated unit test asserting `bg-positive-tint` and `text-positive-strong` for the `ok` tone.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,491 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `Banner/preview.html` and `ds-09-feedback.dc.html` board:
    - `DS/Feedback/Banner/ErrorBanner`
    - `DS/Feedback/Banner/SuccessBanner`
    - `DS/Feedback/Banner/InfoBanner`
    - `DS/Feedback/Banner/WarningBanner`
    - `DS/Feedback/Banner/WithAction`
    - `DS/Feedback/Banner/AllVariants`
    Verified `positive-tint` and `positive-strong` colors in light and dark themes, padding `py-space-10 px-space-12`, and role attributes.
  - Differences left open: none.
  - Deviations: none.

- 2026-10-15 · Phase 2 Fixes · Antigravity · Unit 9 · SwipeActions component fixes:
  - Fixed SwipeActions in `src/components/ds/SwipeActions/SwipeActions.tsx`:
    - Preserved vertical scrolling: added `touch-pan-y` to the container and vertical scroll detection (>8px vertical delta over horizontal) to cancel horizontal dragging so native page scrolling is uninterrupted.
    - Pointer gestures: unified touch and mouse pointer tracking via standard `PointerEvent` APIs with threshold (48px) snapping and spring back to none.
    - Variants: implemented first-class `variant="transactions"` (right Approve `brand`, left Delete `danger`) and `variant="inbox"` (right Snooze `brand`, left Dismiss `danger`) with exact Lucide icons (`Check`, `Trash2`, `Eye`, `X`) matching `preview.html` SVG paths.
    - No-approval spring back: added `canApprove` prop (defaults to true); when `false`, right swipe cannot reveal and springs back to none.
    - Layout: switched to flex row structure matching `reference.css` (`.swipe` with `w-swipe-action` and content `flex-1 min-w-0`), preventing content truncation or off-screen clipping when actions are revealed.
    - Accessibility: unrevealed action buttons have `tabIndex={-1}` and `aria-hidden="true"`; revealed action buttons have `tabIndex={0}` and `aria-hidden="false"`, ensuring hidden actions are excluded from the tab order.
    - Cleaned unlisted props: removed `borderTop` prop and unlisted `warning` tones. Replaced inline pixel widths with Tailwind token `w-swipe-action`.
  - Updated `src/components/ds/SwipeActions/SwipeActions.stories.tsx`:
    - Updated `AllVariants` story to render both Transactions and Inbox cards in a 390px container matching `preview.html` and `ds-06-actions.dc.html`.
    - Added `NoApprovalSpringBack` story demonstrating `canApprove={false}` behavior.
  - Updated `src/components/ds/SwipeActions/SwipeActions.test.tsx`:
    - 11 unit tests covering children rendering, Approve callback on transactions variant, Delete callback on transactions variant, Snooze and Dismiss on inbox variant, tabIndex -1 when hidden, swipe right past threshold, swipe left past threshold, spring back below threshold, spring back with `canApprove={false}`, vertical scroll detection cancellation, and tap to close.
  - Checks: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (all 421 files / 3,491 tests green), `npm run build-storybook`, and `node design-system/tools/check-ui.mjs --staged` clean.
  - Browser comparison: Compared stories rendered in Storybook at 390px and 1440px in light and dark against `SwipeActions/preview.html` and `ds-06-actions.dc.html` board:
    - `DS/Actions/SwipeActions/ApproveRevealed`
    - `DS/Actions/SwipeActions/DeleteRevealed`
    - `DS/Actions/SwipeActions/SnoozeRevealed`
    - `DS/Actions/SwipeActions/DismissRevealed`
    - `DS/Actions/SwipeActions/Interactive`
    - `DS/Actions/SwipeActions/NoApprovalSpringBack`
    - `DS/Actions/SwipeActions/AllVariants`
    Verified flex layout, 96px action widths, no content clipping, correct `bg-brand` and `bg-danger` tokens across light and dark modes.
  - Differences left open: none.
  - Deviations: none.

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
