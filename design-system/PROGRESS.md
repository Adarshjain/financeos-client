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
| 1 | Button | Not started |
| 2 | Badge | Not started |
| 3 | CategoryChip | Not started |
| 4 | StatusWords | Not started |
| 5 | Kbd | Not started |
| 6 | Avatar | Not started |
| 7 | ProgressBar | Not started |
| 8 | TextField | Not started |
| 9 | SearchField | Not started |
| 10 | Select | Not started |
| 11 | Switch | Not started |
| 12 | SegmentedControl | Not started |
| 13 | FilterChip | Not started |
| 14 | Tabs | Not started |
| 15 | Menu | Not started |
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
