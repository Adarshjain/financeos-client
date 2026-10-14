# Design system build — progress

Read `design-system/RULES.md` first. This file is the shared state between sessions and tools. Every session updates it before it ends.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Set-up: design system, screens, rules and check script in the repo | Done |
| 1 | Foundations: tokens, Tailwind mapping, fonts, dark mode | Not started |
| 2 | Basic components (`src/components/ui`) | Not started |
| 3 | App shell: app bar, tab bar, rail, pager, selection bar, swipe | Not started |
| 4 | Composite components | Not started |
| 5a | Screens · Sign in, sign up, offline | Not started |
| 5b | Screens · Home and dashboards | Not started |
| 5c | Screens · Inbox and Upcoming | Not started |
| 5d | Screens · Accounts | Not started |
| 5e | Screens · Transactions (incl. review merged in), import | Not started |
| 5f | Screens · Rules and categories | Not started |
| 6 | Screens · Investments, loans, rewards, reports, settings | Blocked: owner has not reviewed these boards yet |

Statuses: Not started · In progress · Done · Blocked (with the reason).

## Phase plan

### Phase 1 · Foundations
Goal: the app can use every token; nothing looks different yet except fonts and base colours.

1. Put `design-system/tokens.css` into the app's global styles (`src/app/globals.css`). Light values go on `:root` and dark values on `.dark`, exactly as generated. Keep the existing shadcn variables working by pointing them at the new tokens: `--background` → `bg-canvas`, `--foreground` → `ink`, `--card` → `bg-surface`, `--primary` → `brand`, `--destructive` → `danger`, `--border` → `line`, `--ring` → `focus-ring`, and so on. Existing screens must keep rendering.
2. Tailwind theme names. These are fixed; do not choose others:
   - `backgroundColor`: `canvas`, `surface`, `sunken`, `subtle`, `hover` → `bg-canvas`, `bg-surface`…
   - `textColor`: `ink`, `ink-2`, `ink-3`, `ink-4`, `ink-faint` → `text-ink`…
   - `borderColor`: `line`, `line-soft`, `line-strong`, `line-handle` → `border-line`…
   - `colors` (every utility): `brand`, `brand-strong`, `brand-tint`, `brand-border`, `on-brand`, `focus-ring`, `positive`, `danger`, `danger-tint`, `danger-border`, `danger-ink`, `warning`, `warning-tint`, `warning-border`, `warning-ink`, `watch`, `watch-tint`, `info`, `info-tint`, `info-ink`, `neutral-ink`, `chart-1`…`chart-5`, `chart-rest`, `illus-mint`, `illus-gold`, `illus-gold-edge`, `scrim`.
   - `fontSize`, one key per type style carrying its size, line height, weight and letter-spacing: `text-hero-figure`, `text-page-title`, `text-screen-title`, `text-figure`, `text-title`, `text-heading`, `text-body`, `text-body-strong`, `text-label`, `text-caption`, `text-overline`, `text-tab-label`.
   - `fontFamily`: `font-text` (Figtree), `font-display` (Bricolage Grotesque).
   - `spacing` adds `space-2` … `space-48` by pixel value. `borderRadius`: `xs`, `sm`, `md`, `lg`, `xl`, `sheet`, `pill`. `boxShadow`: `pop`, `dialog`, `sheet`, `dock`, `raise`. `height`/`minHeight`: `control-sm`, `control-md`, `control-lg`, `control-xl`, `chip`, `app-bar`, `tab-bar`.
3. Fonts: download the Figtree (500, 600, 700, 800) and Bricolage Grotesque (600, 700, 800) woff2 files into the repo and load them with `next/font/local`, replacing Inter. Turn on tabular figures globally.
4. Dark mode stays class-based (`dark` on `<html>`).
5. Checks: typecheck, lint and tests are green. Every existing screen still renders in light and dark.
6. Last step: add `node design-system/tools/check-ui.mjs --staged` to `.husky/pre-commit`, so every commit from every tool is checked from then on.

### Phase 2 · Basic components
Restyle the existing primitives in `src/components/ui` to their READMEs, one at a time:
- Button, Badge, CategoryChip, StatusWords, Kbd;
- TextField (Input, Textarea, FormField, DateInput), SearchField, Select (Select, DropdownMenu and Command — every variant in `components/Select/README.md`), Switch, SegmentedControl, Checkbox;
- Tabs, Card, ListRow, Skeleton, EmptyState;
- Dialog (desktop) and Sheet (phone), ConfirmSheet, Toast (Sonner) and Banner (Alert).

Keep every component's API unless the README needs a new variant. Add tests for new variants.

### Phase 3 · App shell
AppBar (phone top bar and desktop top bar), TabBar (MobileNav), Rail, Pager, SelectionBar, SwipeActions.

### Phase 4 · Composite components
TransactionRow with DateGroupHeader, KpiTile, Widget, RuleCard, DateTile and the calendar, DropZone, ProgressBar, Avatar, SectionBand, Callout.

### Phase 5 · Screens
Each sub-phase migrates one area to its boards in `design-system/screens/` (see `screens/INDEX.md`). That includes every state on the `*-states` boards and the deliberate removals in RULES §9. Check each screen at 390px and 1440px, in light and dark.

## Owner decisions
Only the owner adds to this list. Each entry has a date and the decision.

- 2026-10-14 · The design system and the boards in `design-system/screens/` are the approved target for Phases 1–5. Phase 6 boards are not reviewed yet.

## Open questions
Add entries here instead of guessing (RULES §2): date, phase, screen or component, the question, the options.

_(none yet)_

## Log
Newest first: date, phase, tool or agent, what changed (files), checks run, open questions, deviations.

- 2026-10-14 · Phase 0 · Claude · Added `design-system/` (README, tokens.json, tokens.css, components, screens, RULES.md, PROGRESS.md, tools/check-ui.mjs) and the agent pointer files (CLAUDE.md, AGENTS.md, GEMINI.md, `.claude/skills/financeos-ui`). Checks: check-ui self-test. Deviations: none.
