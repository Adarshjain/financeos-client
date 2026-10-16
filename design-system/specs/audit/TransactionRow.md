# TransactionRow: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Organism: move to `src/components/organisms/TransactionRow/` (G1).

**Files:** `src/components/ds/TransactionRow/TransactionRow.stories.tsx`, `src/components/ds/TransactionRow/TransactionRow.tsx`

## Change (9)

- [ ] **f8a76de73** · TransactionRow is a FinanceOS-only component
  - Now: The whole component is built around a transaction: amount, balance, account, plastic, review status, provenance, category chips. Its types are `TransactionRowStatus` and `TransactionLink`. Nothing in `src/components/ds` outside this folder uses it as a generic row.
  - Do: Move TransactionRow as is to `src/components/organisms/TransactionRow/` (component, stories, tests, README) with its props kept (owner). Do not rebuild its layout. Only apply the other items in this spec: categories drawn with Badge (G2), selection through `useControllableState`, `isCredit` instead of the '+' guess, and imports from `@/components/ds`. _(per G1)_
- [ ] **f1cc3acd1** · Row guesses credit from a '+' in the amount text
  - Now: `isCredit ?? (typeof amount === 'string' && amount.trim().startsWith('+'))` (:153-155) reads a formatted money string to decide the colour.
  - Do: TransactionRow (organism) keeps its existing `isCredit` prop and stops guessing credit from a leading "+" in the amount text: delete the inference at TransactionRow.tsx:153-155; the caller passes `isCredit`. _(per G1)_
- [ ] **ff398c65c** · Selection state can be set in four overlapping ways
  - Now: `status`, `selected`, `monitored` and `excluded` all feed the same flags (:138-141), and `category` duplicates `categories` (:54, :58). `selected` has no uncontrolled form (RULES §5c.6). `unsetCategoryLabel` is already a ReactNode (:56), not string-only.
  - Do: Keep one name each: `selected` with `onSelectedChange` and `defaultSelected` (via `useControllableState`). Remove `status`, `monitored`, `excluded` shortcuts: use `tone="warning"` and `disabled`. Remove the `category` override in the organism.
  ```tsx
  <ListRow selected={selected} defaultSelected={false} onSelectedChange={fn()} tone="warning" />
  ```
- [ ] **fd8733ef1** · TransactionRow stories lack argTypes for several props
  - Now: `argTypes` (:15-68) cover 13 props but not `link`, `note`, `categories`, `unsetCategoryLabel`, `status`, `selectable`, `leading`. `WithLeadingAvatar` injects `leading` inside `render` (:292).
  - Do: Add `argTypes` for each missing prop (`selectable: { control: 'boolean' }`, `categories: { control: 'object' }`). Put the avatar in `args.leading` (JSX works in args, as in `KpiTile` `WithBadges`) and drop the custom `render`.
  ```tsx
  args: { leading: <Avatar variant="logo" initials="HD" size="md" />, chevron: true }
  ```
- [ ] **f77a92717** · Card wrapper repeated in every TransactionRow story
  - Now: Each story's `render` wraps the row in `<Card className="max-w-sm w-full p-0 overflow-hidden">` (lines 164, 182, 201, 217, 237, 256, 273, 289; the cited line numbers are one off). `layout: 'padded'` is already set at :13.
  - Do: Add one decorator on `meta` and delete the per-story `render`.
  ```tsx
  decorators: [(Story) => <Card className="max-w-sm w-full p-0 overflow-hidden"><Story /></Card>]
  ```
- [ ] **f02e0e8a7** · AllVariants uses date SectionHeaders around rows
  - Now: True: `SectionHeader variant="date"` appears at :82 and :101. It shows how a row sits under a date header (RULES §7.6), but it is page context, not a row state.
  - Do: Keep date SectionHeaders out of the TransactionRow stories (page context, not a row state) and add no `InDateGroup` story. AllVariants is deleted (G9); the row gets one args-driven story per state under `Organisms/TransactionRow`. _(per G9)_
- [ ] **fd9725ad7** · SelectableInteractive keeps its own useState
  - Now: `SelectableInteractiveDemo` uses `useState` (:299). RULES §5a.2 says controlled props are wired with `useArgs` so the Controls panel updates.
  - Do: Replace with `useArgs` and read `selected` from args.
  ```tsx
  const [{ selected }, updateArgs] = useArgs();
  ```
- [ ] **fe0871db5** · Stories use alert() and no action handlers
  - Now: `onDetail={() => alert(...)}` (:311). No story passes `onSelectedChange`, `onSetCategory`, `onCategoryClick` or `onMoreCategoriesClick` as an action, so clicks leave no trace in the Actions panel. No story in `ds/` imports `fn` yet.
  - Do: Set callbacks as `fn()` from `storybook/test` in `meta.args` (or per story).
  ```tsx
  import { fn } from 'storybook/test';
  args: { onSelectedChange: fn(), onDetail: fn(), onSetCategory: fn() }
  ```
- [ ] **f86ec1921** · Card frame restyled with classes inside the story
  - Now: `SelectableInteractiveDemo` puts `className="max-w-sm w-full p-0 overflow-hidden font-text"` on `Card` (:301). It is a frame, and it adds `font-text` the other stories do not.
  - Do: Same fix as the repeated Card: one `meta.decorators` frame. Drop the extra `font-text`.

## Owner's own call (3)

- [ ] **fd7d167db** · SelectableInteractive hard-codes props; All variants is fine
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **ff97b5798** · All variants repeating single stories is required
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f3be0dd44** · SelectableInteractive has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (7)

- **f19c201e4** · TransactionRow props are transaction words: Leave as is (owner approved Keep).
- **f323583eb** · TransactionRow carries category events and chips: Leave as is (owner approved Keep).
- **f5830abcf** · Checkbox label says 'Select transaction': Organism component (app layer): FinanceOS copy is fine there.
- **f91042cc9** · Detail button label says 'View transaction details': Organism component (app layer): FinanceOS copy is fine there.
- **fa1b5a7ab** · Row builds and orders its own context line: Organism component (app layer): this app logic is fine there.
- **f1500d49c** · Row owns the '+n' category chip rule: Organism component (app layer): this app logic is fine there.
- **f7a2c1c98** · TransactionRow fixes padding and column grid: Leave as is (owner approved Keep).

## Ignore: the claim was wrong (1)

- f6fdb5e37 (Checkbox breakpoint and long-press are not baked-in bugs)

## README

Move `design-system/components/TransactionRow/README.md` to `src/components/organisms/TransactionRow/README.md` and update its Props, Variants and Built from sections to match the component after these changes.
