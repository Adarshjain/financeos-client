# Design system build — progress

Read `design-system/RULES.md` first. This file is the shared state between sessions and tools. Every session updates it before it ends.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Set-up: design system, screens, rules and check script in the repo | Done |
| 1 | Foundations: tokens, Tailwind names, fonts, Storybook | Done |
| 2 | New component library in Storybook, one component at a time, owner-reviewed | Done (all components approved by the owner 2026-10-18) |
| 3 | Pages: rebuild and swap in one page or big component at a time | In progress (Phase 3a complete: login, signup, offline approved 2026-10-18, swap pending; Accounts: boards and Dinero changes approved, server changes done; `/ds/accounts` list, account pages and Add/Edit dialogs approved 2026-10-20, swap pending; Settings: boards approved 2026-10-20, `/ds/settings` built 2026-10-20, Ready for review; Inbox & Upcoming: `/ds/inbox`, `/ds/upcoming`, `/ds/upcoming/calendar` built 2026-10-20, Ready for review; Notifications: bell + `/ds/notifications` built 2026-10-21, Ready for review) |
| 3b | Audit implementation: apply the 673 owner-approved conventions decisions (`design-system/specs/audit/`) to Dinero, organisms, stories and the /ds pages | Done (all 673 decisions executed across Rounds A–F; all audit specs completed, all unit and E2E tests passing, builds and check-ui clean) |
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
   - `fontFamily`: `font-text` (Figtree), `font-display` (Bricolage Grotesque) and `font-mono` (system monospace, Text `mono`).
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
| 1 | Icon | Approved |
| 2 | Popover | Approved |
| 3 | Dialog | Approved |
| 4 | TabBar | Approved |
| 5 | Rail | Approved |
| 6 | TopBar | Approved |
| 7 | Tabs | Approved (2026-10-19: route tabs as links, counts that load on their own) |
| 8 | Pager | Approved |
| 9 | Button | Approved |
| 10 | Menu | Approved |
| 11 | SelectionBar | Approved |
| 12 | SwipeActions | Approved |
| 13 | TextField | Approved |
| 14 | TextArea | Approved |
| 15 | DateField | Approved |
| 16 | Select | Approved (2026-10-19: create clears the search and is not offered for an existing option) |
| 17 | SearchField | Merged into TextField (see B2) |
| 18 | FilterChip | Approved |
| 19 | Checkbox | Approved |
| 20 | Switch | Approved |
| 21 | SegmentedControl | Approved |
| 22 | DropZone | Approved |
| 23 | Card | Approved |
| 24 | ListRow | Approved |
| 25 | SectionHeader | Approved |
| 26 | TransactionRow | Approved |
| 27 | RuleCard | Approved |
| 28 | KpiTile | Approved |
| 29 | Widget | Approved |
| 30 | Badge | Approved |
| 32 | StatusWords | Approved |
| 33 | ProgressBar | Approved |
| 34 | DateTile | Approved |
| 35 | Avatar | Approved |
| 36 | Kbd | Approved |
| 37 | Banner | Approved |
| 38 | Toast | Approved |
| 39 | EmptyState | Approved (2026-10-19: optional second action) |
| 40 | Skeleton | Approved |
| 41 | Logo | Approved |
| 42 | Divider | Approved |
| 43 | Tooltip | Approved |
| 43 | Illustration | Approved |
| 45 | Text | Approved |
| 46 | Root | Approved |
| 47 | DataTable | Approved |
| 48 | Stepper | Approved |
| 49 | MonthCalendar (events mode) | Approved |
| 50 | SearchPalette | Approved |
| 51 | ErrorState (organism) | Approved (2026-10-19) |

Removed on 2026-10-15/2026-10-17 (merged, see Owner decisions): AppBar → TopBar (one bar, phone and desktop forms); Callout and its Note → Banner; Sheet and ConfirmSheet → Dialog and its ConfirmDialog preset; DateGroupHeader and SectionBand → SectionHeader; SearchField → TextField (merged in B2, search variant with clearable icon and embedded style); AuthPanel → a page in Phase 3.

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

**Components the reviewed boards need that the library lacks** (design first, then build; owner, 2026-10-18):
1. **DataTable**: built 2026-10-17, Approved.
2. **SearchPalette**: built 2026-10-18, Approved.
3. **Stepper**: built 2026-10-18, redesigned the same day (owner: "can look better", "not mobile responsive"), Approved.
4. **MonthCalendar events**: built 2026-10-18, Approved.
5. ~~**ProgressBar markers**~~: dropped by the owner 2026-10-18; ProgressBar stays as it is. The loan page lays out its own start / today / end captions under the bar.

Later: Chat (`D-chat`), DashboardGrid and the KpiTile vs Widget review. Built in the app, not Dinero: ChoiceCard (widget picker). Candidate rows in the link and rule-match dialogs use ListRow with a Checkbox or radio in `leading`.

**Lost with the page title row** (owner: the row goes, but these are needed later; each page's migration decides where they live):
- `D-home`: dashboard switcher (Home ▾ + ⋯ menu), "synced 4 min ago", "2 things need you".
- `D-investments`: "prices as of 13 Oct 15:30 · refresh".
- `D-report-view`, `D-report-breakdown`: report type, datasource, range, "excluded hidden", "on Money overview", "updated just now"; actions Underlying data, Add to dashboard, Edit, ⋯.
- `D-report-builder`: "unsaved changes", Cancel, Save report. `D-report-underlying`: "KPI · Transactions · October · compare previous month".
- `D-import-wizard`: broker and files ("Zerodha · tradebook-FY26-27.csv + tax P&L.xlsx"), "step 3 of 4", Back, Commit 14 trades.
- `D-import-job`: file name, account, started at, took 3.8 s, "Done · 1 failed line".
- `D-upcoming-calendar`: month, "₹1,05,219 due · 4 overdue", ‹ Today ›, List. `D-upcoming`: "next 3 months", 3 months ▾, Calendar.
- `D-holding`: "Stock NSE · INE009A01021 · Zerodha · long term since 11 Mar 25", current value with gain and today's change.
- `D-loan-detail`: Active, Floating 8.25%, bank, loan number, start and end, paid from account, "EMI #14 overdue ₹36,603 · was due 5 Oct". `D-loan-pay`: "EMI #14 overdue by 8 days".
- `D-lending-person`: relation, UPI id, "3 entries since Aug", "Owes you ₹15,000 · expected 28 Oct". `D-lending-add`: "Owes you ₹15,000 · expected 28 Oct".
- `D-dashboard-edit`, `D-dashboard-new`: dashboard name field, help line, Add header, Add widget, Discard/Cancel, Save/Create. `D-dashboard-view`, `D-widget-settings`: "17 widgets", Set as default, Edit. `D-dashboards`: "Home is your default", Restore default.
- `D-dividends`: "FY 26-27 · ₹3,975 declared · ₹3,865 received · 1 not yet in the bank", Detect from holdings. `D-fno`: "5 trades this FY · 1 open · net −₹1,062 after ₹717 charges".
- `D-rewards-rules`: "2 rules · 1 cap · 1 milestone · points worth ₹0.50", Milestone, Cap. `D-rewards`: "₹1,502 earned this year · 1 milestone on track", Which card should I use?
- `D-settings-debug`: Admin badge. `D-settings-activity`: Pause worker. `D-settings-connections`: Sync now. `D-settings-notifications`: "Push on 2 devices · reminders at 09:00 IST", Send a test.
- Single actions: `D-instruments` Refresh prices, `D-lendings` Export ledger, `D-reports` Ask the data, `D-import` Gmail connections, `D-chat` History · 12.
- Counts and descriptions (likely shown elsewhere, check per page): `D-inbox`, `D-reports`, `D-lendings`, `D-loans`, `D-tradebook`, `D-instruments`, `D-corporate-actions`, `D-account-add`, `D-trade-record`, and the one-line descriptions on Import, Chat, Dashboards, Rewards picker, Upcoming and Settings.

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

**Decided 2026-10-20 (one system per page, see Owner decisions):** swapping signed-in pages one at a time means the app switches between the old and new shell as you move between migrated and unmigrated pages. Options:
- (a) accept the mixed shells during the migration;
- (b) review page by page in `/ds`, then swap all signed-in pages together (or per area) once they are approved.

### Migration map
| Page or component | New files | Old files it no longer uses | Swapped on |
| --- | --- | --- | --- |
| `/ds/login` (Sign in) | `src/app/(ds)/ds/(public)/login/page.tsx`, `LoginForm.tsx` | _(live `/login` and `LoginForm.tsx` untouched until swap)_ | Approved 2026-10-18; swap pending |
| `/ds/signup` (Sign up) | `src/app/(ds)/ds/(public)/signup/page.tsx`, `SignupForm.tsx` | _(live `/signup` and `SignupForm.tsx` untouched until swap)_ | Approved 2026-10-18; swap pending |
| `/ds/offline` (Offline) | `src/app/(ds)/ds/(public)/offline/page.tsx`, `OfflineContent.tsx` | _(live `/offline/page.tsx` untouched until swap)_ | Approved 2026-10-18; swap pending |
| `/ds` review index & shell | `src/app/(ds)/layout.tsx`, `src/app/(ds)/ds/(app)/layout.tsx`, `src/app/(ds)/ds/(app)/page.tsx`, `src/features/shell/navigation.ts` | _(live layouts untouched)_ | Built under /ds, Ready for review |
| `/ds/accounts` (Accounts list) | `src/app/(ds)/ds/(app)/accounts/(list)/page.tsx`, `loading.tsx`; `src/features/accounts/list/*`; `src/features/shell/ShellPage.tsx` (per-page top bar; layout no longer renders it) | _(live `/accounts` untouched until swap; will drop `AccountsView`, the tiles, `ClosedAccountsSection`, `AccountMetadataBadges`)_ | Approved 2026-10-20; swap pending |
| `/ds/accounts/[id]` (account pages + Add/Edit dialogs) | `src/app/(ds)/ds/(app)/accounts/[id]/**` (layout with route tabs, Overview, `statements/`, `cards/`, `rewards/`, loading, error), `accounts/not-found.tsx`; `src/features/accounts/detail/**`, `src/features/accounts/form/ds/*`, `src/features/bills/MarkPaidDialog.tsx`, `src/features/accounts/statements/deletionImpact.ts` | _(live `/accounts/[id]` untouched until swap; will drop `StatementsDialog`, `CardsDialog`, `AccountForm`/`AccountFormWrapper` (except the transaction-form use, owner 32), the account header and detail sections)_ | Approved 2026-10-20; swap pending |
| `/ds/settings/**` (Profile, Connections, AI, Notifications, Activity, Debug) | `src/app/(ds)/ds/(app)/settings/**` (layout with route tabs, six tabs, loading); `src/features/settings/{SettingsShell,settingsTabs}`, `src/features/settings/{profile,connections,ai,notifications,activity,debug}/**`, `src/features/jobs/**` (job hooks, `ds/` JobBox, Gmail sync and per-type results) | _(live `/settings`, `/settings/activity`, `/debug` untouched until swap; will drop `GmailConnect`, `settings/gmail/*`, `llm-keys/*`, `notifications/components/*`, `activity/components/*`, `DeleteAccountCard`, `ThemeSettingsCard`, `debug/*` UI, `src/components/jobs/**` UI)_ | Built 2026-10-20, Ready for review |
| `/ds/inbox`, `/ds/upcoming`, `/ds/upcoming/calendar` | `src/app/(ds)/ds/(app)/{inbox,upcoming}/**`; `src/features/inbox/**` (shell, tabs, rows, snooze, moved actions/helpers), `src/features/upcoming/**` (list, totals, calendar, moved obligations helpers), `src/features/lendings/**` (Settle sheet, createLending), `src/features/bills/StatementDetailsDialog` | _(live `/inbox`, `/upcoming` untouched until swap; will drop `src/components/{inbox,upcoming,obligations}/**` UI)_ | Built 2026-10-20, Ready for review |
| `/ds/notifications` + top-bar bell | `src/app/(ds)/ds/(app)/notifications/**`; `src/features/notifications/**`; `src/lib/query/hooks/useNotifications.ts` | _(new; no Legacy page)_ | Built 2026-10-21, Ready for review |

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
- 2026-10-17 · **Storybook review round** (owner, after testing Storybook by hand):
  - Storybook group "Inputs" is renamed **Form fields**; Switch moves into it. Popover keeps its story (Overlays). Foundations stays.
  - **Dialog footer:** actions are data and Dialog draws them. One row, left to right tertiary, secondary, primary. Only primary is filled (`primary` or `danger-filled`); secondary and tertiary are `link`. Equal widths on phone only; natural widths aligned right on desktop. Replaces the "tertiary far left / end of body on phone" rule.
  - **SearchField merges into TextField**, no alias: the search form is a TextField with a search icon and a clear button.
  - **TextArea** grows with its text; no max height by default (`maxRows` stays as an option).
  - **MonthCalendar:** month and year are picked **inside the same calendar popup**, CoreUI style (owner 2026-10-17, replacing dropdowns). Tap the month name for a 3×4 month grid; tap the year for a 3×4 grid of 12 years; picking a year opens the month grid, picking a month returns to the days. No double arrows. min/max apply to the arrows, the months and the years.
  - **Rail footer:** one row linking to Settings: avatar, name, and the email under it.
  - **No "Recent imports"** anywhere: the app doesn't store import history.
  - **TransactionRow** shows the eye only in selection mode.
  - **ProgressBar indeterminate** is a calm sweep; one cycle is the new generic token `dur-loop` (1600ms).
  - **DataTable** (the desktop form of TransactionRow and every desktop table) waits for its own round: design first, then build.
- 2026-10-17 · **DataTable uses TanStack Table** (`@tanstack/react-table` v9, owner). It is headless: TanStack holds sort, selection and column state; every visual comes from Dinero. Pin an exact release at least two weeks old when installing.
- 2026-10-17 · **DataTable requirements review** (owner): v1 includes expandable rows; `sortMode="client"` is allowed only for lists the server returns whole (never with a Pager, never slicing). Pinned `@tanstack/react-table` **9.2.4**. Out of v1: pivot tables, drag-to-reorder rows, several tables sharing one Pager.
- 2026-10-17 · **Long-press and selection** (owner): long-press (500ms, touch or mouse) enters selection while still held, and the release does nothing; outside selection mode a tap opens the item and never selects it; swipe stays phone-only and desktop keeps checkboxes. Use an industry-standard hook: **`@react-aria/interactions` 3.28.1 and its core `react-aria` 3.52.1 approved** (exact pins), behind Dinero's `useSelectableItem`.
- 2026-10-17 · **One working TransactionRow story** (owner, recorded by Claude at the owner's request): `Organisms/TransactionRow/Transactions list` is a full, working list, so it may keep in-story state (through `useArgs` only), simulate the server (sort, paging, approve, delete, set category) and fill the canvas width (`globals.viewport` locked to `100pct-100pct`) so it switches phone ↔ desktop as the window is resized. This overrides §5a.2 (no data processing in stories) and §5a.7 (viewport toolbar) for this one story only.
- 2026-10-18 · **Gestures belong to the phone layout** (owner, correcting an earlier "touch only" reading): long-press, swipe and tap-to-toggle work only in the phone layout (below `lg`), with any pointer, touch or mouse. In the desktop layout a press always opens the item, even in selection mode, and the checkbox selects; Enter/Space also open there. Ds code reads the layout when the gesture starts, through `isPhoneLayout()`, never the pointer type. RULES §5c.3 (one event-time exception, approved by the owner), §5c.4 and §7.5 updated.
- 2026-10-18 · **Pager `compact` variant** (owner): small controls and tight padding for dense lists. A one-page gap shows the page, never an ellipsis.
- 2026-10-18 · **No "bal" prefix** on running balances (owner): the balance is the bare amount, "₹2,95,030".
- 2026-10-18 · **TransactionRow phone: categories on their own line under the context line** (owner), not under the amount. Amount and balance stay top-right.
- 2026-10-18 · **One working story per component** (owner): gather every requirement first, then build. Each component gets one story that works as it would in the app when interacted with (in-story state through `useArgs` only), instead of one story per variant (§5a.1).
- 2026-10-18 · **All Phase 2 components approved** (owner). Issues found while building pages are flagged as we go.
- 2026-10-18 · **Component gap review** (owner). Build in Dinero: **SearchPalette**, **Stepper** (import wizard), **MonthCalendar event chips**, **ProgressBar markers**. Not in Dinero:
  - Chat: later.
  - ChoiceCard: built inside the app (widget picker), not a Dinero component.
  - SectionHeader count: none; the app passes it through `meta`.
  - CategoryChip: already removed; categories are Badges.
  - No PageHeader: the TopBar carries the title, and the in-page title row is removed from every page. What that loses is listed under "Lost with the page title row" below, for the page work.
  - Charts already exist. No CodeBlock or LogView (the Debug page draws its log block). DashboardGrid: later.
  - No typed glyphs (⠿ ▾ ✓ × ⋯ ‹ ›) anywhere: always Icon.
  - Account types on Add account are a SegmentedControl with icons.

- 2026-10-19 · **Accounts decisions** (owner, Accounts gap review; recorded by Claude at the owner's request):
  - **One layout switch at 640px** (final): 640px and below is the phone layout, above it the desktop layout. Dinero gets its own Tailwind screen `desk` (641px) and every Dinero, organism and `/ds` class moved from `lg:` to `desk:`; Legacy keeps `lg:` untouched (RULES §1.6). `isPhoneLayout()` reads `(min-width: 641px)`. RULES §5c.2 updated; `check-ui` fails on any other breakpoint in checked paths.
  - **Tabs on an object page are real routes** (`/accounts/[id]`, `/statements`, `/cards`, `/rewards`): a shared layout holds the header and the tab strip, each tab fetches only its own data, choices inside a tab live in URL params (`?fy=&statement=`), and tab counts load on their own after the tab renders (a small server addition returns them). This applies to every tabbed page.
  - **Identifiers are saved with the form** (Add/Edit account), not on each add or remove.
  - **Add links per section on Accounts** (owner answer 39), an exception to §7.1 and the §9 header-button removal for that page.
- 2026-10-19 · **Accounts list review answers** (owner):
  - DataTable status cells sit where `meta.align` puts them on desktop; the right pin is phone only (fix A).
  - Add `file-text` and `pencil-simple` to the icon registry; the list rows get Statements and Edit icon buttons.
  - Brokers "Today" and net worth "excl. home loan": not needed on this page.
  - Add and Edit account are dialogs over the page, as the boards draw them, not routes. The + and the "Add …" links open Add on the list (`?add=<type>`); Edit opens over the account page (`?edit=1`).

- 2026-10-19 · **Account pages review answers** (owner):
  - DateField reports an empty value when its text is cleared by keyboard (approved change to DateField).
  - The Statements list keeps ListRow's chevron on phone.
  - Card running balances in Recent transactions stay signed, as in the live app.
  - The Cards tab keeps its in-tab button to add an add-on card.
  - A Tooltip component is to be built (owner request; overrides the "no tooltips" line in RULES §1.2 for that component). Desktop only, no tooltip on phone. Look: dark ink surface, light caption text, small radius.
  - **Bank field.** Bank accounts and credit cards get a `bank` (internal id); server and client share the same ids. The server stores it (nullable; old accounts may have none) and checks ids; the client owns display names and logos. The new Add/Edit dialogs require it, so editing an old account needs a bank; the server will require it too once the live form is replaced. The list covers the Indian banks and the card issuers in India (one bank per card, e.g. a Scapia card picks Axis, BOBCARD or Federal Bank); fintech brands that aren't banks (Jupiter) aren't on it; slice is a bank. Searchable Select, no create option. Every bank has a logo. When two accounts share an alert's last 4 digits, the server matches a bank name found in the email's text against the list (never the sender address).
  - Bank accounts keep joint holders (as live).
  - Financial position defaults: Liability for a credit card, Asset for every other type.
  - The account boards' items with no data (N need a category, Reminders, "+N transactions since", etc.) are dropped.
  - Top-bar actions (Ask the data, Search, Chat, Notifications) are wired once in the /ds shell.
  - New dependency `@radix-ui/react-tooltip` approved for the Tooltip component.

- 2026-10-19 · **UAT round 2** (owner): Tooltip approved (dark theme inverts, as built). All controls 32px (`control-md`), replacing 36. New token `icon-xs` 10px: every icon beside button text; link icon gap `space-2`. RULES §5.5 phone footer = `control-md`. `/bills?accountId` computes only that card. Write decisions tersely.
- 2026-10-19 · **UAT round 4** (owner): SectionHeader + DataTable band take `action` (right end); closed toggle uses it. Brokers card: no total, no Investments link. Card table Next bill/Outstanding/Rewards `sm`. ~~Button sizes svgs xs by CSS~~ (reverted 2026-10-20).
- 2026-10-19 · **UAT round 5** (owner): closed toggle `ghost`. Card header text actions `link`. Pager `compact` by default. Dialogs open from state, never the URL; cross-page opening = ask owner. Statement bills in one request.
- 2026-10-20 · **Bank display** (owner): Option A on Accounts pages: BankLogo before the name (list rows, page title). `short_name` in banks.ts: owner's, use only where told. Other pages decided when we reach them.
- 2026-10-20 · **One system per page** (owner): two root layouts, `(legacy)` and `(ds)`, each with its own fonts, CSS build and toaster; crossing systems = full page load. No Legacy shell re-skin (owner, 2026-10-20). Overrides "never modify Legacy" for the root split only. Answers the mixed-shell question.
- 2026-10-20 · **Accounts approved** (owner). Cards page `?add=cardholder` link stays as is. `short_name` use: owner says when.
- 2026-10-20 · **Icon size is the app's** (owner): app passes `size="xs"` beside button text; Dinero forces nothing (sheet icons were shrunk). No-bank account: filled amber `warning` mark at the tile's top right, like a count badge (new registry icon + Icon `weight`).
- 2026-10-20 · **Settings gap review** (owner; boards redrawn, awaiting look): tabs are routes, flush under the top bar (no subtitle line); tab actions sit inside the tab (Sync now, Send a test), no Admin badge, no Pause worker. Profile read-only with Sign out in its row (no Security card); theme is a SegmentedControl with sun/moon/monitor icons; Storybook a row of its own in Appearance; no locale/FY/timezone, density, hide balances, password, sessions, your-data, export; "Delete my account" (no ellipsis); Connections: no top banner, no 30-day stats, no identifiers card; Recent sync jobs card keeps every field of today's panel (Live, progress, Cancel/Retry, expandable Gmail summary, emails by outcome, error details, old result format); OAuth return banners; senders without parsed-as/count; confirm dialogs for disconnect and sender delete. AI: keys table per key (⋯ Test/Move/Delete), Health card, no usage, no shared-key copy. Notifications: master switch first, reminder days a multi-select, This browser row in Devices, Remove without confirm, no own-tab mute note. Activity: Status and Type dropdown filters (all statuses and types kept), result card via `?job=`, compact Pager. Debug: tab for everyone, lookup admins only, local failures for all. Text gets a `mono` variant. Re-upload corrects the matched statement's period.
- 2026-10-20 · Link buttons underline in `line-heavy`, not the text colour (owner).
- 2026-10-20 · Card gets an `inset` variant (job boxes, email groups, counter tiles); icons `sun`, `moon`, `monitor` join the registry for the theme control (owner).
- 2026-10-20 · Legacy Settings gets a "Dinero" row opening `/ds`; `/ds` index links Settings; Card gets `tone="danger"` (Delete account); ListRow gets `wrap` (owner).
- 2026-10-20 · **Inbox & Upcoming gap review** (owner; boards redrawn, awaiting look): one page, route tabs Inbox · Upcoming · Calendar; no summary lines; range Select at the end of the filter row (chevron icon); calendar month, total and prev · Today · next arrows in the calendar card header; no leading squares on Inbox rows (owner 10-20, replaces words-only squares); no Inbox row for finished manual statement imports, failed ones stay (server); Settle on lending rows opens the Settle up sheet; totals follow the filter, empty tiles hide; no Pager on either list; calendar chips = name cut to fit + short amount; review row gets × and returns when its count changes (server). Inbox row buttons one step quieter: main action secondary, others link, snooze and dismiss ghost icons. Clock icon added for snooze; SwipeActions fills its moving row with surface (owner 10-20).

- 2026-10-19 · **Accounts UAT round 1** (owner; approves the Dinero changes it names):
  - Banks: only Amex, AU, Axis, Bank of Baroda, Canara, CSB, Equitas, Federal, HDFC, HSBC, ICICI, IDFC First, Indian Bank, IndusInd, SBI, Slice, Unity, Yes (plus one more, to confirm); logos from one sprite.
  - Select: padding around the option list (not between items); the list scrolls; pinned action buttons at natural width, right-aligned.
  - TopBar shows the back button on desktop too.
  - Fields, DateField and buttons share one height; DateField is built on TextField. Focus never changes border width; one focus indicator.
  - Switch rows lose their extra side padding. Dialog × must close. Dialog phone footer is shorter (overrides `control-xl` in RULES §5.5 once the owner edits it).
  - Buttons never use `caption`; every button uses `label`.
  - Accounts page: `+` icon before each "Add <account>"; Add defaults to Bank; no statement action on rows; Edit is a ghost icon button that opens the Edit dialog; no "Rewards" link on Credit cards; closed accounts expand below "Closed" without a URL change; Add dialog has no subtitle; "Own limit" only when the card has its own limit; "Email identifiers" is "Account identifiers" with a helper about matching with the last 4 digits; no Notifications action in the top bar.
  - "As of" shows the date the balance is current to, not only the last statement date.
  - Account pages: statement details carry everything live shows; no Import or Transactions in the menu (all types); no Delete statement / Set due date buttons under the statement (menu only); every reward rule type shows (milestones included); card details show own or shared limit, never both; closed accounts open; no Details card on wallets.


- 2026-10-21 · **Notifications** (owner): one Inbox nav entry (Upcoming, Calendar are its tabs; phone tab bar Home · Inbox · Accounts · Transactions · More); bell + dot in top bar, dropdown latest 10 + See all, opening marks read; `/ds/notifications` page, clear one (Undo) / clear all (confirm); kept until cleared or 90 days; events: failures always, successes only when something changed, no manual-import successes, no sign-ins; Dinero Inbox drops Updates (server keeps them for Legacy until swap). Badge/Button `dot`, TopBar action `dot` + `popover` added.
- 2026-10-21 · **Settings answers** (owner): failed manual imports keep their Inbox row; "Overdue nags" dropped, notification settings to be regrouped; AI key ⋯ ghost, status badge beside the provider name; item 32 kept (remove device without confirm, "added <date>").
- 2026-10-21 · **Swap** (owner): all pages at once (big bang), not page by page. Until then Dinero links go to the Dinero page wherever one is built. Next page: Loans & lendings.
- 2026-10-21 · **Loans & lendings gap review** (owner): tabs Lendings · Loans, Lendings first and the nav default; closed loans as a "Closed · n · Show" line, settled people via the Settled filter; build all-loans EMI matching and all-people transfer matching (server); Interest this FY tile only, no tax lines/card; no Payoff order (parked) or Lendings card on Loans; loan page one page, no tabs; no per-person reminders (Expected return = date + Share); delete person any time with confirm; + adds loan/lending/entry, Quick add Lending enabled; Settle up gets an optional Pick a transaction field; no All time picker (owner plans "cycles", later); only today's per-person export; Part 2 accepted. Overpaid EMI (7): record what was paid, no choice; Mark paid shows the difference as words; loan EMI matching tolerance = max(₹100, 1% of EMI) (lendings stay ₹20, owner). Export ledger: per-person only, form drawn as {D,P}-lending-export; "money due back" push keeps `?export=1` to open it (one exception to dialogs-no-URL); export include options are switches. Boards approved 10-21.

## Open questions
Add entries here instead of guessing (RULES §2): date, phase, screen or component, the question, the options.



- 2026-10-16 · Phase 3a · Shell · Quick add actions without live routes · Quick add items Transaction, Lending and Trade are modal dialogs in the Legacy app without dedicated routes; only Import (/transactions/import) has a route. Options: (A) Build dedicated Dinero add forms later when those modules migrate, or (B) Open the Legacy live pages/dialogs. Meanwhile, those three tiles are shown disabled until the owner decides.
- 2026-10-15 · Phase 2 · Checkbox · Indeterminate/mixed state icon · Checkbox mixed state (some rows selected) needs a minus/dash icon, which is not in icons.json. Options: (A) Add `minus` (Phosphor `minus`) to the icon registry, (B) Render an inline SVG dash stroke inside Checkbox, or (C) Use a CSS dash line. Meanwhile using `close` as the closest registry icon.
- 2026-10-15 · Phase 2 · Button · Loading spinner icon · Button loading state needs a spinner icon (RULES §6.2 progress spinner), which is not in icons.json. Options: (A) Add `spinner` (Phosphor `spinner` or `circle-notch`) to the icon registry, or (B) Use a CSS rotating border spinner. Meanwhile using `settings` with `animate-spin` as the closest rotating registry icon.
- 2026-10-15 · Phase 2 · Button · Count pill on primary button · The board only shows count pills on secondary buttons (btn). On a primary (btn-p) button, both the button background and default count pill use bg-ink, making an ink pill blend into the button. Options: (A) Reverse the pill colors on primary buttons to bg-surface text-ink, (B) Forbid count pills on primary buttons, or (C) Add a dedicated contrasting pill token. Meanwhile, Button renders bg-surface text-ink when primary.

## Log
Newest first: date, phase, tool or agent, what changed (files), checks run, open questions, deviations.

Keep entries short (a few lines). Entries before 2026-10-18 are in `PROGRESS-log-archive.md`: grep it, never read it whole.

- 2026-10-21 · Phase 3 · Claude · Dinero links go to built Dinero pages via `src/features/shell/routes.ts` (`appHref`; identity at the big-bang swap); rail/tab bar active item works on /ds; delete-account redirect follows the caller. Settings: AI key status beside name + ghost menu (82332efb), notifications regrouped (fcfc34a5). Forced test edits: navigation, inboxRows, account, profile (2nd arg); E2E ds-shell (stale since 34985546: Upcoming off rail, Accounts tab) and ds-auth (from= lands on /ds/accounts). Checks: vitest 1668, tsc, lint, check-ui, E2E ds-*/inbox/upcoming/navigation/account-deletion 28/28. Deviations: none.
- 2026-10-21 · Phase 3 · Claude · Notifications built (server 534de08 feed + V107; client cc9007d6 Dinero dot/popover + this commit): bell, dropdown, `/ds/notifications`, one Inbox nav entry, Dinero Inbox without Updates. Checks: vitest 4883+ ok, lint 0 errors, check-ui clean, API E2E notification-feed 7/7. Gaps: card header without title holds only Clear all; rail has no active item on /ds pages (pre-existing). Deviations: none.
- 2026-10-20 · Phase 3 · Claude · Inbox & Upcoming built (client 527a1cbb, 40a1609f, 9cb978b1 + calendar; server 8e54867): Legacy logic moved to `src/features/{inbox,upcoming,lendings}`; Inbox count on Dinero rail/tab bar; clock icon; SwipeActions surface fill. Checks: vitest, typecheck, lint, check-ui, build-storybook ok; API E2E 40/40, Legacy UI E2E green. Gaps: StatusWords no danger tone (Overdue amber), MonthCalendar no legend, Settle segment in body. Deviations: none beyond those.
- 2026-10-20 · Phase 3 · Claude · `/ds/settings` built: six route tabs (commits 2ea12fcd…38526ae2, fix 9d8337d4); Legacy logic moved to `src/features/{settings,jobs}`. Checks: vitest 4681/4681, typecheck, lint 0 errors, check-ui clean, build-storybook ok; Legacy UI E2E (7 settings specs, dev client) green except 2 env-only (headless push denied; OAuth redirect http vs dev https). Open: Delete account border, ListRow subtitle wrap. Deviations: none beyond those.

- 2026-10-20 · Claude · Link underline `line-heavy` (Button.tsx, README, 2 forced Button test edits); Settings boards: Profile+Sign out merged, Storybook row, full sync-job detail, phone mailbox rows stack (canvas v184).
- 2026-10-20 · Settings prep · Claude · No space above the account tabs: ShellPage `flushTop` (`src/features/shell/ShellPage.tsx`, its test, accounts `[id]/layout.tsx`). Settings boards redrawn on the canvas from the gap-review answers (+ Connections · states). Checks: vitest shell+accounts, typecheck, check-ui. Deviations: none.
- 2026-10-20 · Phase 3 · Claude · TopBar action `labelIconSize` (desktop label form; phone icon-only stays md); ShellPage passes `xs` for Add. Checks: vitest, tsc, check-ui, storybook. Deviations: none.
- 2026-10-20 · Phase 3 (Accounts) · Claude · Statement gaps: row "Details missing" (drops due-unknown badge), warning Banner with Fill in + Re-upload to retry, More → Edit details (period, due, total, min; server rules mirrored). E2E api/ui statement-details. Server 8347338 + CORS PATCH fix e56b48b. Checks: vitest 463, tsc, lint, check-ui, api e2e, ui regressions. Deviations: none.
- 2026-10-20 · Phase 3 · Claude · Root split: `(legacy)` and `(ds)` root layouts, own fonts/CSS (tailwind.legacy/ds configs, shared preset)/toaster; providers + metadata shared; global-error and global-not-found self-contained; ds→legacy links prefetch off. Forced tests: none (imports `@/app/(protected)` → `(legacy)/(protected)`). Checks: tests, lint, check-ui, storybook, next build, ui e2e core+ds (35/35), cross-system nav. Deviations: ds border/scrollbar from ds tokens.
- 2026-10-20 · Phase 3 (Accounts) · Claude · Undated statements keep their bill: server history files them by created date (app zone), client statementDate/Overview title same rule (server 3a4318e). Forced tests: CardBillHistoryTest ordering/range cases, billsHistory.test undated row. Checks: server tests, client tests, api e2e. Deviations: none.
- 2026-10-20 · Phase 3 (Accounts) · Claude · Reverted Button/TopBar xs forcing; app call sites pass `xs` (HeaderLink, closed toggle, RuleCard Approve); More sheet back to 20px. BankLogo no-bank mark; Icon `weight`, registry `warning`. Forced tests: 5 Button "icon size beside text" tests removed. Checks: tests, lint, check-ui, storybook. Deviations: none.
- 2026-10-20 · Phase 3 (Accounts) · Claude · Bank display A: DataTable `leading` slot; BankLogo takes null bank (letter tile); logo before names + page title; Axis/CSB logos redone from Wikimedia SVGs. Forced tests: none. Checks: tests, lint, check-ui, storybook. Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · UAT r5 (decision above). SectionHeader centres items when it has an action. Forced tests: dialog-param tests rewritten to state (accountsAdd, ShellPage, AccountFormDialog, accountFormModel, account, cards; AccountFormHosts deleted). Checks: typecheck, tests, lint, check-ui, storybook, ds-shell e2e, api e2e. Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · UAT r4 (decision above). Forced tests: 2 Button xs tests assert the class; accounts.test Brokers title. Checks: typecheck, tests, lint, check-ui, storybook. Deviations: none.

- 2026-10-19 · Ph3 · Claude · Button forces Icon `xs` beside text (TopBar: xs desk, md phone); link icon gap `space-2`.
- 2026-10-19 · Ph3 · Claude · UAT3: account dialogs open/close via History API (0 server requests); as of Today/Yesterday; closed band same in both states, toggle fixed. Forced test edits: link→button/pushState asserts, as-of dates.
- 2026-10-19 · Ph3 · Claude · Controls 32px; `icon-xs` + Icon `xs` on Add-link +; TextField `size` now padding only. Forced: class asserts in Button/TextField/DateField/Dialog/TextArea tests. Checks green.
- 2026-10-19 · Phase 3 (Accounts) · Claude · Optimisations and a dev warning: the Rewards tab loads its rules beside the reward year and the earning lines beside the report (c565259, one round trip fewer); the streamed card slots carry keys, which clears React's missing-key warning on /ds/accounts. Checks: account vitest, typecheck, check-ui, console clean. Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · UAT item 9, "As of": list bank rows show the later of the last transaction (server `lastTransactionDate`, server b81cb4e) and the last statement (`16 Oct` / phone `As of 16 Oct`, or `Stmt 30 Sep` as before); the account header's "as of" uses the same server field instead of the newest loaded transaction. Forced test changes: headerModel "current to the newest later transaction" (date moves onto the account), account route bank fixture gains `lastTransactionDate`. Checks: 4349 tests, typecheck, lint 0 errors, check-ui; shots 1440/390. Deviations: none.
- 2026-10-19 · Phase 2 · Claude · Tooltip (owner request, `@radix-ui/react-tooltip` approved): `src/components/ds/Tooltip/`, README; ink surface, `on-brand` caption text, `radius-sm`, no arrow or shadow, hidden below `desk` by CSS; own Radix provider per instance. Not used in any page yet. Checks: typecheck, vitest, eslint, check-ui, build-storybook; shots 1440 light/dark, 390. Open question: dark-theme surface. Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · UAT round 1, banks + limits: catalog cut to the owner's 19 banks (SBM included), logos from one sprite `public/banks/sprite.png` (58 per-bank PNGs deleted) drawn by the new organism `BankLogo` (Avatar initial for an unknown id); a card in a shared limit has no own-limit field and sends `creditLimit: null`; the import-date helper sits under its DateField. Forced test changes: AccountFormDialog own-limit test inverted, accountFormModel pool test expects null. Checks: vitest, typecheck, check-ui, build-storybook. Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · UAT round 1 (owner decisions above): Dinero fixes (f29710a); accounts list (+ on Add links, Add defaults to Bank, Edit opens the dialog, no statement/upload or Rewards actions, closed rows muted, clickable and toggled in place without a URL), Add/Edit dialog (no subtitle, "Account identifiers"), no bell in the top bar, account pages (statement details as complete as live with empty figures hidden, no Import/Transactions, statement actions only in the menu, milestone-only cards show rewards, own or shared limit, no wallet Details card, "as of" from the newest loaded transaction). Checks: typecheck, lint 0 errors, tests (features, ds app, components), check-ui. Open: list "as of" waits for the server's lastTransactionDate; pooled cards lose their own limit and banks shrink to 19 next. Deviations: milestone cards are titled with the milestone's name.
- 2026-10-19 · Phase 3 (Accounts) · Claude · Bank field on the Dinero Add/Edit account dialogs (owner decision): searchable Select of 58 banks with logos (Avatar `src`), no create, required for bank accounts and cards on Add and Edit, sent only for those types. Catalog `src/features/banks/`, logos `public/banks/`, form `src/features/accounts/form/ds/`, API types synced (server 8986250). Financial position defaults already matched (Liability for cards, Asset otherwise); tests pin them. Checks: typecheck, lint 0 errors, tests, check-ui, API E2E 1004 passed. Deviations: placeholder "Select a bank" (board shows none).
- 2026-10-19 · Phase 3 (Accounts) · Claude · /ds shell top bar now has Ask the data (`/chat`) and Notifications (`/settings/activity`) on every page, before the page's +; Search left out (no live search). Files: `src/features/shell/ShellPage.tsx`, `src/features/shell/__tests__/ShellPage.test.tsx`. Checks: typecheck, lint 0 errors, tests, check-ui. Open question: TopBar actions per form (above). Deviations: none.
- 2026-10-19 · Phase 3 (Accounts) · Claude · Prod list was slow (rewards/totals ~3 s, bills ~1.8 s). `/ds/accounts` now waits only for the accounts call; net worth, investments change, card next-bill badges, Upload buttons and rewards cells stream in (a4e04c3). Server batching for totals and bills in financeos-server. Checks: typecheck, lint 0 errors, tests (InstrumentsSection.paging flaky under load, passes alone), check-ui. Open question: DataTable empty phone actions (above). Deviations: none.
- 2026-10-19 · Phase 3 (Accounts, steps 5.2–5.5) · Claude · Account pages under `/ds/accounts/[id]`: route tabs per type (card and bank: Overview, Statements, Cards, Rewards; wallet: Overview, Rewards; broker: Overview), counts loaded after render; card Overview (header with Mark paid, Limit & cycle, Bills, Rewards, Cardholders, Identifiers, Recent transactions, Connections, ledger banner), bank/wallet/broker Overviews (owner 15, 17, 23, 24); Statements tab (`?fy`, `?statement`, Linked/New lines, ledger check, set due date, delete with preview); Cards tab with every live dialog and the real old-card DELETE; Rewards tab with server-paged lines; Add/Edit account as dialogs (`?add=<type>`, `?edit=1`, owner 2026-10-19); MarkPaidDialog. Owner answers on the list applied (2fd56af: DataTable status align, `file-text`/`pencil-simple`). Commits af881e6, 659fcd7, f8cb443, c076f89, a5d9578, c41685c; visual-check fixes a7b3dd0 (Tailwind `content` now scans `src/features/**`: `desk:grid-cols-3`, shell `desk:p-space-24` and some paddings were never generated; tab-count hydration; one row per milestone; rules listed highest priority first as the server evaluates them). Checks: typecheck, lint 0 errors, 4256 tests, check-ui, build-storybook; screenshots 390/1440 light/dark of every account page. Open questions: 7 new (above). Deviations: Statements rows navigate by click (Undo sits inside the row, so not a link); phone Import is only in Quick add (board hides the ⋯ menu on phone).
- 2026-10-19 · Phase 3 (Accounts, step 5.1) · Claude · `/ds/accounts` list built from the approved boards: KPI tiles (cash and wallets, cards you owe, investments with today's change, net worth from the Home net-worth widget), Bank / Credit cards / Brokers / Wallets tables on DataTable with phone stacking, next bill from `/bills`, rewards from `/rewards/totals`, limit used coloured at 30% and 70% (owner item 38), one "Closed · n · Show" line per section (`?closed=`), per-section Add links (owner item 39), empty state, loading skeleton, ErrorState. New `ShellPage` gives each /ds page its own top bar. Before it: API types synced (57354af) and the account and bill logic moved to `src/features/` (4085961). Checks: see the commit. Looked at 390 and 1440, light and dark, against a local server with board-like data. Open questions: 4 (above). Deviations: Excluded, Liability and Closing are status words (owner item 31) where the board draws badges.

- 2026-10-19 · Phase 3 (Accounts, step 3) · Claude · Dinero changes the approved Accounts boards need, each with README, one working story driven by controls (owner, 2026-10-18 and 2026-10-19) and tests:
  - **Breakpoint `desk` (641px)**: `tailwind.config.ts` adds the screen; `lg:`→`desk:` in `src/components/ds/`, `src/components/organisms/`, `src/app/(ds)/`, `src/features/shell/` (classes, comments, test selectors), `phoneLayout.ts`, `src/test/stubLayout.ts`, eight component READMEs, RULES §5c.2/§5c.4/§5d.3; `check-ui` gains a `breakpoint` rule with self-tests.
  - **EmptyState**: `secondaryAction={{ label, onSelect }}`, drawn `secondary` after the first (a `link` when compact).
  - **ErrorState** (new organism, `src/components/organisms/ErrorState/`): EmptyState with `action` (Try again) and `reference` (Copy reference <id>, copies silently like the app does today, then `onCopyReference`).
  - **Tabs**: items take `asChild` + `children` (the app's Link) so each tab is a route; `activationMode` defaults to `manual` when any item is a link; `count` may stay undefined while it loads; TabsTrigger takes `asChild`.
  - **Select**: the create row hides when the typed text already is an option (any case); creating clears the search. The "multi with search and create" story now adds identifiers for real.
  - **Banner**: verified, already works with no action. Nothing changed.
  - Stories: EmptyState's six stories became one ("Empty state"); Tabs' three became one ("Tabs").
  - Existing tests changed only because the breakpoint rename forced it: `.lg\:` selectors and `lg:` class assertions in Stepper, SearchPalette, Pager, DataTable, Dialog, SelectionBar, MonthCalendar, TabBar, TransactionRow and Illustration tests now read `desk`, plus three test names in Stepper/MonthCalendar/phoneLayout.
  Checks (Node 20): typecheck clean; lint 0 errors (warnings pre-existing); `npm test` 444 files / 3866 tests passed (a first run reported one unhandled error that did not repeat); `build-storybook` OK; check-ui clean and self-test passed. Looked at the four stories at 390 light and 1440 dark; clicked through Tabs (route link, counts loading), Select (create, duplicate), ErrorState (clipboard); Stepper shows its phone form at 640px and desktop at 641px.
  Open questions: none. Deviations: none.
- 2026-10-18 · Phase 3 · Claude · Owner approved `/ds/login`, `/ds/signup`, `/ds/offline` (swap not done yet). Accounts chosen as the first signed-in page; requirements and gap review in progress.
- 2026-10-18 · Phase 2 · Claude · Owner approved every component; status rows set to Approved, Phase 2 Done. Removed the stale CategoryChip and ResponsiveOverlay rows (both components were deleted earlier).
- 2026-10-18 · Phase 2 · Claude · ProgressBar markers dropped (owner: "let it be as it is"). No code change.
- 2026-10-18 · Phase 2 · Claude · SearchPalette fix: the owner's dev Storybook froze on any search with results. Cause: Storybook's dev-mode JSX source snippet re-printed the whole `groups` tree (React nodes) on every keystroke; the production build was never affected. Fix: the story uses `docs.source.type: 'code'`. Also replaced cmdk with the palette's own highlight and ↑/↓/Enter handling (simpler, same behaviour). Files: `SearchPalette.tsx`, `SearchPalette.stories.tsx`, its README. Tests 13/13 unchanged; Playwright against the dev server (390 light, 1440 dark and light): no freeze, all flows pass.
- 2026-10-18 · Phase 2 · Claude · SearchPalette built (`D-search`, `P-search`): `src/components/ds/SearchPalette/{SearchPalette.tsx,SearchPalette.test.tsx,SearchPalette.stories.tsx}`, `design-system/components/SearchPalette/README.md`, export in `src/components/ds/index.ts`. A headerless Dialog (`md`, `space-40` from the top on desktop, the sheet on phone) with the search TextField (esc Kbd on desktop, Cancel on phone), results grouped by the page under SectionHeaders, ListRow rows with a fixed leading column, cmdk for the highlight and ↑/↓/Enter (no filtering in the palette), click or Enter runs the row's `onSelect` and closes, `loading` skeletons, `No results for "…"`, desktop footer hints, optional ⌘/Ctrl + `shortcutKey`. Props `open`/`onOpenChange`, `value`/`onValueChange` (search text), `groups`, `loading`, `shortcutKey` and overridable words.
  - Story: one working `Global search` story: Search button or ⌘K opens it, typing searches realistic accounts, actions, transactions and pages (Ask row follows the text), picking a row closes and shows what opened. The story lets the palette own the field and only mirrors the text, because Storybook's async args drop fast keystrokes in a controlled field.
  - Tests: 13 new (closed, groups and order, typing, highlight and arrows skipping disabled rows, Enter, click and disabled click, highlight reset on new results, loading, no-results words, empty text, shortcut, Escape and Cancel, desktop hints). No existing tests touched.
  - Checks: tsc clean, eslint clean, check-ui clean, `storybook build` OK, Playwright at 390px light and 1440px dark and light: ⌘K opens with focus in the field, "regalia" gives Accounts, Actions, Transactions, Pages, Ask; ↓↓ then Enter opens "Regalia · Earning rules" and closes; "zomato" leaves only Ask; clicking Swiggy opens it; Cancel (phone) and Esc (desktop) close; no page errors.
  - Deviations: group headers use SectionHeader's band (sunken band) instead of the board's plain caption; the highlighted row uses ListRow's highlighted look, which adds the 4px stripe the board doesn't draw; the field keeps TextField's border (the board's field is borderless); the footer hints are chevron Icons and the word "Enter" instead of typed ↑↓ ↵; the "Type > for commands" hint and the "Open ↵" hint on the highlighted row are left out (no command mode exists).
- 2026-10-18 · Phase 2 · Claude · MonthCalendar events mode rebuilt for the Upcoming calendar (`D-upcoming-calendar`, `P-upcoming-calendar`). The calendar now builds its own Monday-first weeks from `month` (neighbouring months' days on `bg-sunken`, number `line-heavy`, inert); takes `events: { id, date, label, tone }[]`; desktop shows labelled chips (tint + strong text per tone, new `neutral` tone for scheduled), phone shows 6px tint bars; up to `maxEventsPerDay` (3) then "+N more"; today "13 · today"; a day is selected with click, chip click, Enter or Space through `value` / `onValueChange` (ISO). Removed `days`, `onSelectDay`, `selectedDay` and the `CalendarDay` type (no users outside the story and tests; DateField uses picker mode only). New props `events`, `maxEventsPerDay`, `moreLabel`, `todayLabel`; new util `weekdayNamesShort()`. Picker mode untouched. Files: `src/components/ds/MonthCalendar/{MonthCalendar.tsx,MonthCalendar.test.tsx,MonthCalendar.stories.tsx}`, `design-system/components/MonthCalendar/README.md`, `src/components/ds/utils/index.ts`, `src/components/ds/utils/__tests__/utils.test.ts`.
  - Story: the `Events` story is replaced by one working `Upcoming calendar` story: month summary, ‹ Today › (month moves through `useArgs`), the calendar in a Card, and the selected day's items in ListRows with Mark paid (removes the item). The picker stories keep their small Card frame, now a per-story decorator.
  - Tests changed (forced by the removed props): the 4 events-mode tests ("renders weekdays and day cells", "highlights today cell", "renders event indicator bars by tone", "triggers onSelectDay") are replaced by 8 covering the grid and padding, outside days, today, tone chips, phone bars, the per-day limit and "+N more", selection by click/chip/keyboard, and controlled value and month. 1 test added for `weekdayNamesShort`. Picker and DateField tests untouched and green (53/53 across MonthCalendar, utils, DateField).
  - Checks: tsc clean, eslint clean, check-ui clean, `storybook build` OK, Playwright on the story at 390px light and 1440px dark and light: 35 cells, bars on phone and labels on desktop, "+1 more" on 15 Oct, select a day, Mark paid updates the chips and the summary, Next month, Today; no page errors.
  - Deviations: board padding 3px (phone cell sides), gap 3px and chip radius 5px have no tokens; used `space-4`, `space-4` and `radius-xs` (4px). Board's "due soon" text #B45309 uses the `warning` token (#A84D06). The legend under the grid is page content and is not in the story (no Dinero legend component).
- 2026-10-18 · Phase 2 · Claude · Stepper redesigned after owner review ("can look better", "not mobile responsive"; the wrapping row was the problem). Desktop (`lg`): numbered circles joined by lines that stretch to fill the row and turn `brand` up to the current step; done = `check` on a filled `brand` circle, current = filled circle with a 4px `brand-tint` ring, upcoming = outlined `surface` circle. Phone: one line "Step 3 of 4 **Reconcile**" over a bar with one segment per step (the common mobile stepper pattern). It never wraps. Root is now a `<div>` (ordered list inside for desktop); new `stepLabel` prop for the overridable "Step N of M" words. Files: `src/components/ds/Stepper/{Stepper.tsx,Stepper.test.tsx,Stepper.stories.tsx}`, `design-system/components/Stepper/README.md`.
  - Tests changed (forced by the new markup): all 7 Stepper tests rewritten (state token classes, root element and wrap classes changed); 5 added for the connectors and the phone form. 12/12 pass.
  - Checks: tsc clean, eslint clean, check-ui clean, `storybook build` OK, Playwright on the story at 390px light (phone form: caption, name, bar fill through Next/Finish/Back) and 1440px dark (desktop states through Next/Finish/Back); no page errors.
  - Deviations: the board's look (green current label, tint done circles, wrapping row) is replaced at the owner's request; awaiting the owner's approval in Storybook.
- 2026-10-18 · Phase 2 · Claude · Stepper built (`src/components/ds/Stepper/{Stepper.tsx,Stepper.test.tsx,Stepper.stories.tsx}`, `design-system/components/Stepper/README.md`, export in `src/components/ds/index.ts`). Requirements from `D-import-wizard` / `P-import-wizard` (identical) and the live wizard (`ImportWizardDialog`, Back button only, no step indicator today). Ordered list, `current` index drives done / current / upcoming; done shows the `check` Icon (the board's typed ✓). Not clickable, no card of its own. One story, `DS/Navigation/Stepper/Import wizard`, inside a Card with Back and Next/Finish wired through `useArgs`.
  - Checks: Stepper tests 7/7, tsc clean, eslint clean, check-ui clean, `storybook build` OK, Playwright on the story at 390px light and 1440px dark: Next, Finish (all done, Next disabled), Back ×2 all correct; wraps onto two lines at 390px; no page errors.
  - Deviations (no matching token): circle 22px → `space-24`; gap between steps 18px → `space-16`; wrapped-line gap `space-8` (board has none drawn).
- 2026-10-18 · Phase 2 · Claude · Gestures follow the phone layout, not the pointer (owner correction: "only on mobile devices", not touch only):
  - New `src/components/ds/phoneLayout.ts`: `isPhoneLayout()` reads `(min-width: 64rem)` when called; no matchMedia means phone. `useSelectableItem` starts its long-press only when the press starts in the phone layout (any pointer), and a press in selection mode toggles only there; in the desktop layout every press opens, Enter/Space too. `useSwipe` starts only in the phone layout, any pointer. The layout is read inside event handlers, never while rendering, so markup never depends on it.
  - RULES §5c.3: one exception for that file, event handlers only (approved by the owner 2026-10-18); `check-ui` allows `matchMedia` in it alone, with two new self-test lines. §5c.4 and §7.5 rewritten. READMEs: TransactionRow, RuleCard (gesture table is phone layout), SwipeActions (phone layout only). Transactions list story docs updated.
  - Test helper `src/test/stubLayout.ts` (phone | desktop). New `phoneLayout.test.ts`. Tests changed because the behaviour changed: useSelectableItem ("touch long-press and selection" and "mouse" describes became "phone layout" and "desktop layout", each for touch and mouse; Enter/Space split by layout), useSwipe and SwipeActions ("ignores a mouse" became "a mouse swipes in the phone layout" + "ignores a touch/mouse drag in the desktop layout"), TransactionRow and RuleCard (selection-mode test now runs desktop then phone; TransactionRow mouse long-press test split into phone selects / desktop opens).
  - Checks: full vitest 3812/3812, tsc clean, eslint clean, check-ui clean + self-test 24/20, `storybook build` OK, Playwright on the built story: mouse at 390px long-press selects, click toggles, drag right approves, drag left asks to delete; resized to 1300px a hold opens and a drag does nothing; back at 390px a hold selects again; the earlier full phone (touch) and desktop flow unchanged; no page errors.
- 2026-10-18 · Phase 2 · Claude · Component gap review with the owner (decisions under Owner decisions). Board facts for the owner:
  - Stepper: only `D-import-wizard` / `P-import-wizard`.
  - Candidate rows: `D-transaction-link`, `-lending`, `-lending-existing`, `-loan`, `-multi` (pick the matching transaction) and `D-rule-matches` (checkbox list of matches).
  - Account header stat: the `hdr card` at the top of account pages ("You owe ₹44,319 · due 25 Oct" + Mark paid / Transactions / Edit) on `D-account-card`, `-bank`, `-broker`, `-wallet`, `-card-nobill`.
  - Kbd: ⌘K and ⌘N appear only inside the TopBar search and Add buttons, which TopBar already draws; nothing to check.
  - What the removed title rows carried: "Lost with the page title row" under Before Phase 3 starts.
- 2026-10-18 · Phase 2 · Claude · Two fixes from the Transactions list review:
  - DataTable stories (`src/components/ds/DataTable/DataTable.stories.tsx`): the 14 interactive stories crashed because `useArgs` ran inside a child component (`InteractiveTable`); Storybook hooks only work in the story's render. Replaced with a render factory `interactiveRender(extra)` whose returned `Render` calls `useArgs`. All 15 DataTable and 13 TransactionRow stories load with no errors in the built Storybook; selection is interactive.
  - Card (`src/components/ds/Card/Card.tsx`): `overflow-hidden` → `overflow-clip`, which still clips to the radius but is not a scroll container, so sticky day headers inside a Card stick. The Transactions list story's `overflow-clip` workaround is removed. Test changed because the class changed: Card "does not force w-full class on root" now expects `overflow-clip`. Other stories that pass `overflow-hidden` to Card are left as they are (no sticky content in them).
  - Checks: ds tests 498/498, typecheck clean, eslint clean on the file, `build-storybook` OK, sticky headers verified at 390px. Deviations: none.
  - Open (owner): with a mouse in a phone-width window there is no way to select (checkbox only from `lg`, long-press is touch only). Resolved 2026-10-18: gestures follow the layout, not the pointer.
- 2026-10-18 · Phase 2 · Claude · TransactionRow phone categories moved under the context line (`TransactionRow.tsx`, its README): categories cell is col 1 row 2 (left-aligned, hidden when empty on phone), the amount cell spans both rows top-aligned so it never pushes the left column apart. Desktop grid unchanged. New test for the phone placement. Checks: organisms + DataTable tests green, typecheck clean, check-ui clean, `build-storybook` OK, screenshots at 390 (light, dark) and 1440, full Playwright flow rerun. Deviations: none.
- 2026-10-18 · Phase 2 · Claude · Owner review of the Transactions list story (7 items):
  - Pager (`src/components/ds/Pager/`): new `variant="compact"` (`control-sm`, `py-space-4`, `label` text) with a `Compact` story; page list rebuilt so a one-page gap shows the page instead of hiding it (phone at 30 rows / 10 per page read "1 3", now "1 2 3"), and the phone form gets its own ellipsis where it drops desktop neighbours. README updated.
  - TransactionRow (`src/components/organisms/TransactionRow/TransactionRow.tsx`): on phone the context line now lives in the description cell (spanning both grid rows), so it sits right under the description whatever the amount column's height; the context line is a wrapping flex row with centred items, so a link icon no longer shifts it off the baseline.
  - SelectionBar: `z-floating` moved from the inner bar (not positioned, so it had no effect) to the root, so the bar covers sticky SectionHeaders.
  - `useSelectableItem`: React Aria long-press restricted to `pointerType: 'touch'`; a mouse or pen press always calls `onPress`. Applies to TransactionRow, RuleCard and DataTable rows.
  - `useSwipe`: ignores non-touch pointers, so SwipeActions never moves under a mouse.
  - Story: compact Pager, no "bal" prefix (story args and the Transactions list), docs text describes touch vs mouse. DataTable README example updated.
  - Tests changed because the behaviour changed: Pager "each page number exactly once…" (scenario moved to page 5 of 10, where neighbours are still hidden on phone); SelectionBar "renders select all…" (layer class now on the root); SwipeActions and useSwipe pointerdowns now pass `pointerType: 'touch'`; useSelectableItem long-press / selection-mode tap / iOS tests now touch-only; TransactionRow and RuleCard "calls onDetail… toggles selection in selection mode" now expect a mouse click to open and a touch tap to toggle. New tests: one-page gap, phone-only ellipsis, compact variant, mouse hold never selects, mouse click in selection mode opens, mouse drag never swipes.
  - Checks: typecheck clean; all component tests green; `build-storybook` OK; check-ui clean. Playwright on the built story: phone touch flow unchanged and green; desktop mouse click in selection mode opens the detail and keeps the selection, an 800ms mouse hold does not select and its release opens the detail, a mouse drag does nothing; screenshots checked (meta under description, link icon aligned, bar above sticky headers, compact pager, light and dark).
  - Deviations: none beyond the owner decisions above.

