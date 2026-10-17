# Dinero audit 2026-10: global decisions

Source: the owner-approved conventions audit (https://claude.ai/artifact/L7sSF76ZtsZJDsQy6DLUYC). There are 673 findings, every one approved.

**These rules override any wording in a per-component spec.** If a spec item seems to contradict a rule here, the rule wins; note the conflict in PROGRESS.md and follow the rule.

## G1 · Two layers: Dinero (atomic) and organisms (app)
- **Dinero** (`src/components/ds/`) holds generic components only: no FinanceOS words, routes, data or business rules.
- **Organisms** (`src/components/organisms/<Name>/`) are FinanceOS-specific components built **only** from Dinero components. They may contain FinanceOS props, copy and logic. They have no ds-allow escapes; RULES apply to them like to Dinero.
  - Organisms: **TransactionRow, RuleCard, Illustration, Logo, SettingsToggle (new)**.
  - Each organism keeps its current props, except where its spec says otherwise.
  - `src/components/organisms/index.ts` exports them. Remove them from `src/components/ds/index.ts`.
  - Story titles are `Organisms/<Name>`. Add `src/components/organisms/` to `design-system/checked-paths.txt` and to the stories glob in `.storybook/main.ts`.
  - Imports: organisms import from `@/components/ds`; Dinero never imports from organisms.
- Stays in Dinero, made generic by its spec: StatusWords, Widget, KpiTile, DateTile, DropZone, SelectionBar, Rail, TopBar, TabBar, Root.

## G2 · Badge absorbs CategoryChip
Delete `CategoryChip` (component, README, stories, tests). One **Badge**:

| Prop | Values | Default |
| --- | --- | --- |
| `tone` | `neutral` `success` `warning` `danger` `info` | `neutral` |
| `variant` | `soft` (tinted fill) · `solid` (filled) · `outline` (bordered) · `dashed` (dashed border) | `soft` |
| `shape` | `default` (radius-sm) · `rounded` (pill) | `default` |
| `size` | `sm` (h-space-16, min-w-space-16, px-space-6, text-micro bold) · `md` (h-space-20, px-space-8, text-caption) | `md` |
| `asChild`, `onClick` | With either, it renders a button (or Slot) with hover, pressed and focus states | — |

- **Content** is `children` only. There is no `count` prop and nothing is inferred.
- **Counts** are passed as content, formatted by `formatCount` (G10).
- **Weights:** soft and solid are bold; outline and dashed are semibold.
- **Colours per variant × tone:**
  - soft = `bg-{tone}-tint text-{tone}`; neutral uses `bg-line-soft text-neutral-ink`.
  - solid = `bg-{tone} text-on-brand`; neutral uses `bg-ink`.
  - outline = `border bg-surface text-{tone} border-{tone}-border`; neutral uses `border-line bg-subtle text-ink-2`.
  - dashed = `border border-dashed bg-surface`; neutral uses `border-line-strong text-ink-2`, warning uses `border-warning-border text-warning`.
  - Hover only when interactive: `hover:bg-hover`; for warning, `hover:bg-warning-tint`.
- **Today's looks map one to one:**
  - Badge = soft / default / md.
  - The count bubble = solid / rounded / sm (tone neutral, danger or warning).
  - The category pill = outline / rounded / md.
  - The "+2" overflow = outline / rounded / md.
  - The "Set category" chip = dashed / rounded / md / warning.
- **Callers to migrate:**
  - Button `count`, FilterChip `count`, TabBar and Rail counts: render `<Badge variant="solid" shape="rounded" size="sm" tone=…>{formatCount(n)}</Badge>`.
  - Select's chosen values and "+n": outline / rounded.
  - TransactionRow and RuleCard categories.

## G3 · FilterChip stays separate, aligned with Badge
- **Looks by state:** outline when off, soft when on (`tone` sets the on colour: `brand` default, `warning` for review), and `variant="dashed"` for "+ More".
- **Removed:** `variant="amber"` (use `tone="warning"`) and `active`.
- **Selection:** `selected`, `defaultSelected` and `onSelectedChange` through `useControllableState`.
- **Count:** drawn with Badge (G2). `onRemove` shows the ×; `removable` is deleted.
- **FilterChipRow:** deleted. Pages lay out chip rows with layout classes.

## G4 · Bare controls; rows are organisms
- **Switch** is the control only: `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, plus native props and ref. Remove `label`, `description`, `error`, `borderTop` and the row layout.
- **New organism `SettingsToggle`:** a ListRow (`title`, `subtitle` = description, `borderTop`) with the bare Switch in `trailing`, plus an error line drawn with Text (`variant="caption" tone="danger"`).
- **Checkbox** stays bare. Indeterminate is `checked="indeterminate"` only; delete the `indeterminate` prop.

## G5 · Dropdowns never become sheets (owner rule)
Menus, dropdowns, selects and DateField's calendar look and work like a normal dropdown at every width. **Only Dialog** becomes a bottom sheet on phone.
- **Delete** `ResponsiveOverlay` (component, README, stories, tests) and `useMediaQuery.ts` (`useMediaQuery`, `useIsPhone`).
- **Select** uses Popover. **Menu** uses Radix DropdownMenu only: no item count, no sheet, no `title`, no `forcePhone`. **DateField** uses Popover; below `lg` it shows one month.
- **No viewport detection in JavaScript anywhere** (RULES §5c.3 now has no exception).

## G6 · One action shape
- **The shape:** a button a component draws itself takes `action={{ label, onSelect }}` (label: ReactNode; onSelect: () => void).
  - Banner, Toast, Select (replaces `actionRow` + `onActionClick`), KpiTile (replaces `onRetry`), Widget (replaces `retryLabel`, `onRetry`, `removeLabel`, `onRemove` in its error and unavailable states) and EmptyState (replaces the node `action`).
- **Toast:** drop `onUndo`, `undoLabel` and the node `action`. Undo is `action={{ label: 'Undo', onSelect }}`.
- **Action arrays** (SelectionBar, Menu items, TopBar actions, Widget menu) use `onSelect` only; delete the `onClick` aliases.
- **Not covered:**
  - Card's header `action` stays a node slot. Dialog's `primary`, `secondary` and `tertiary` became action objects on 2026-10-17 (owner; RULES §5.5).
  - SwipeActions keeps `onTrigger`.

## G7 · Banner
- The action always sits on the right of the text, vertically centred. There is no placement prop.
- Banner gets a dismiss control: `onDismiss?: () => void`. When set, it shows an icon Button (`<Icon name="close">`) at the far right.
- Body content may be block-level, so don't wrap it in a span.

## G8 · Generic tokens only (done 2026-10-17, commit eb39939)
- **No component-named tokens.** The migration is already applied:
  - sizes: `space-28/56/64/96`; containers: `container-xs/sm/md/lg/xl`;
  - corners: `radius-2xl`;
  - shadows: `shadow-level-1/2/3` and `shadow-up-1/2`;
  - layers: `z-sticky/floating/backdrop/overlay`;
  - motion: `dur-fast/base/slow`, plus `dur-loop` for looping indicators (added 2026-10-17);
  - type: `micro`;
  - colours: `line-heavy`, `attention`, `attention-tint`, `accent-*`, `backdrop`;
  - spacing utility: `bottom-clearance`.
- **A missing value** is either added as a **generic** step in `tokens.json` (rerun `node design-system/tools/gen-tokens-css.mjs` and add the Tailwind key), or logged as an Open question. **Never** add a component-named token.
- **Approved new step:** `space-64` already exists and is used for stacked buttons (owner answer, finding f3d58de69). DateTile cells use `min-h-space-56`.
- `w-popover-trigger` and `w-menu-trigger` are Radix bridges, not tokens; keep them.

## G9 · Storybook conventions
- **Autodocs:** turn it on once for every story file with `tags: ['autodocs']` in `.storybook/preview.tsx` (remove the per-file tags). The autodocs page replaces the "All variants" story.
  - Delete every `AllVariants` story.
  - The docs page needs no controls (owner note): set `parameters: { docs: { controls: { disable: true } } }` in preview, and canvas controls stay on single stories.
  - Add a one-line `parameters.docs.description.component` to each meta, taken from the README's first line.
- **Stories:**
  - One story per README variant or state, driven by `args` with a shared `render` only where needed.
  - Every public prop has a control, or is listed in `argTypes` with `control: false` when it is a node or function.
  - No story differs from another only by viewport or by one control value.
  - Exception: a component that only shows at one width (TabBar is phone-only, hidden from `lg`) sets `parameters: { viewport: { defaultViewport: 'phone' } }` on its **meta**, so all its stories open at phone width. That is not a separate story.
- **Actions:** every story file's `meta.args` sets **each** `on…` prop the component has to `fn()` from `storybook/test`, so every call shows in the Actions panel. (`argTypesRegex` is deprecated in Storybook 10; don't use it.) Never use `() => {}`, `alert` or `console.log`.
- **No hand-made UI in stories:**
  - frames and backgrounds come from one decorator (the existing theme decorator plus `parameters.layout`);
  - explanations go in `parameters.docs.description`;
  - a story may render several Dinero components side by side only with layout classes (RULES §5d applies to stories).
- **No logic:** `useArgs` only; no `useState`, timers or filtering.
- **Imports** come from `@/components/ds` (or `@/components/organisms`); never restyle a component with visual classes.
- **No play functions** and no interaction tests (owner note).
- **Sample content:** realistic FinanceOS content stays (RULES §5a.4).

## G10 · Dinero utilities (one place for shared logic)
Add `src/components/ds/utils/` and export it from the Dinero barrel. The app imports these instead of writing its own:
- `formatCount(n: number, max = 99): string` gives `"99+"` above max.
- `formatDate(iso: string, style: 'input' | 'list'): string` gives `dd/mm/yyyy` for input and `13 Oct` for list.
- `parseDateInput(text: string): string | null` turns dd/mm/yyyy into ISO `yyyy-mm-dd`, or null if invalid.
- `todayISO(timeZone: string): string`. The app passes `'Asia/Kolkata'`.
- `formatMonth(iso)` and `weekdayLetters()`: English, Monday first.

Value contracts:
- **DateField and DateTile:** take and emit ISO `yyyy-mm-dd`, display dd/mm/yyyy, and receive `today` as a prop (ISO). Nothing reads the device clock.
- **Amounts:** stay preformatted strings from the app. Components never parse money.

## G11 · Button
- **Delete `variant="tile"` and `iconPosition`.** Add `layout?: 'inline' | 'stacked'` (default `inline`).
  - `stacked` puts the icon above the label and uses height `h-space-64`.
  - Pages that used tiles (the /ds More sheet): Quick add uses `variant="secondary" layout="stacked"`; section links use `variant="secondary" size="xl"` with layout classes `w-full justify-start`.
- **Delete `variant="google"`.** The page composes `variant="secondary"` with the Google mark passed as `icon`; the mark comes from the page as an image or Icon. No default label.
- **`asChild`** must apply `disabled`, `loading` and `count` too, or those props are rejected in the types.

## G12 · Popover and Menu animation follows the side
Use `data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1` (variants exist in `tailwind.config.ts`) instead of the fixed `slide-in-from-top-1`.

## G13 · Copy
- Visible app wording becomes a prop the page passes.
- Generic control words stay as defaults: Close, Cancel, Clear, Retry, Remove, Undo, Today, Done, Select all, Show/Hide, Optional, "Search…", "Loading…", Previous, Next.
- Screen-reader-only fallbacks stay (no accessibility work).
- Organisms keep their FinanceOS copy.

## G14 · No accessibility work
Never add ARIA or contrast work beyond what a spec item explicitly says.

## G15 · Other owner calls to keep in mind
- Card footer uses `px-space-16`, like the header and rows.
- SegmentedControl keeps its name.
- Widget keeps its unavailable state, but its action becomes the G6 object.
- Toast already puts its action on the right.
- Rail and TopBar stay in Dinero; brand, search and user become slots (`brand`, `search`, `footer` as nodes) and links use `asChild` so the app passes its router Link.
- TextField drops `kind="amount"` and its ₹ default; the app passes `prefix="₹"`.
- ProgressBar drops `tone="auto"`; the app picks `tone`.
- StatusWords tones become semantic: `neutral`, `info`, `warning`, `success`. Icons are explicit props.
- **Icon registry:** names describe the glyph, never a FinanceOS section. Rename exactly these in `design-system/icons.json` and `src/components/ds/Icon/registry.ts` (the registry test compares the two):
  - `transactions` → `list-bullets`
  - `accounts` → `wallet`
  - `investments` → `chart-line-up`
  - `rewards` → `gift`
  - `loans` → `handshake`
  - `dashboards` → `squares-four`
  - `reports` → `chart-bar`
  - Add `minus` (Phosphor `minus`) for Checkbox's mixed state.
  - Every other name stays (`home`, `inbox`, `calendar`, `menu`, `settings`, `chat`, …: generic UI concepts).
  - Update every caller, including `src/features/shell/navigation.ts`.
