# RuleCard: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Organism: move to `src/components/organisms/RuleCard/` (G1).

**Files:** `src/components/ds/RuleCard/RuleCard.stories.tsx`, `src/components/ds/RuleCard/RuleCard.tsx`

## Change (12)

- [x] **f742ac211** · RuleCard is a categorisation-rule component
  - Now: The card draws a rule: name, match type, pattern, used count, verified state. README calls it a 'record card ... (categorisation rules)'.
  - Do: Move `RuleCard` to `src/components/organisms/RuleCard/` (story title `Organisms/RuleCard`), built only from `@/components/ds` components (Card, StatusWords, Badge, Menu, Button, Checkbox), no ds-allow escapes. Categories render as `<Badge variant="outline" shape="rounded">`. Add no generic RecordCard. _(per G1,G2)_
- [x] **f14cfc7e9** · Selection logic is duplicated across row and card
  - Now: Long-press, click-to-toggle and the same `isSelectable`/`selectionMode` handling exist in `RuleCard` (:120-124, :220-240) and again in `TransactionRow`. Long-press through `useLongPress` is allowed (RULES §5c.9). The role switching (:249) is accessibility, which is out of scope.
  - Do: Pull the shared click/keyboard toggle into one hook next to `useLongPress`, e.g. `useSelectableItem({ selected, onSelectedChange, selectionMode })`. Both components call it.
  ```tsx
  const item = useSelectableItem({ selected, onSelectedChange, selectionMode });
  ```
- [x] **fcf690af5** · RuleCard re-builds Card styling and fixes width
  - Now: Line 254 hand-writes border, radius, padding (`px-space-14 py-space-12`), `flex-col` and `w-full min-w-0`. README says 'Built from Card' (line 20) but `Card` is not imported. The vertical stack is the card's design.
  - Do: Compose from `Card` (it already has border, radius, `min-w-0 w-full`). Keep the inner padding in one wrapper. Drop `w-full` from the card body only if the grid needs it.
- [x] **f42aa6169** · Chip restyled with bg-surface when card is selected
  - Now: `className={selected ? 'bg-surface' : undefined}` (:356) overrides the chip colour on a tinted background.
  - Do: The card does not restyle its child. Pass the category as `<Badge variant="outline" shape="rounded">{cat}</Badge>` in both selected and unselected states; outline already has `bg-surface`, so no selected-dependent prop is needed. _(per G2)_
- [x] **ffa59c39b** · RuleCard selected has no uncontrolled form
  - Now: `selected = false` (:93) is controlled only; there is no `defaultSelected`. RULES §5c.6 says every stateful component works both ways via `useControllableState`.
  - Do: Add `defaultSelected` and use the shared `useControllableState` (exists in `ds/`). Same change for `TransactionRow` and `ListRow`.
  ```tsx
  const [selected, setSelected] = useControllableState({ value: selectedProp, defaultValue: defaultSelected, onChange: onSelectedChange });
  ```
- [x] **f995dc3bd** · SelectableInteractive ignores args
  - Now: `SelectableRuleCardDemo` (:157-180) hard-codes every prop; the story has no `args`.
  - Do: Use `args` for the data and wire `selected` through `useArgs`.
  ```tsx
  render: (args) => { const [{ selected }, updateArgs] = useArgs(); return <RuleCard {...args} selected={selected} onSelectedChange={(s) => updateArgs({ selected: s })} />; }
  ```
- [x] **fdedf92cc** · RuleCard stories lack argTypes for several props
  - Now: `argTypes` (:12-44) skip `categories`, `onApprove`, `menuItems`, `onDetail`, `statusLine`, `categoryContent`, `approveAction`.
  - Do: Add argTypes `categories: { control: 'object' }`, `menuItems: { control: 'object' }`, and `control: false` for node/function props (`statusLine`, `categoryContent`, `approveAction`). Do not add `{ action: ... }` entries: preview makes every `on*` prop (`onApprove`, `onDetail`, `onSelectedChange`) `fn()`. _(per G9)_
- [x] **f224f9fd4** · Raw wrapper divs in RuleCard stories
  - Now: Line 52 is a grid inside All variants (allowed layout). Line 160 `<div className="max-w-md">` is a frame around one card inside a single-state demo.
  - Do: Replace the raw `max-w-md` div with one `meta.decorators` frame (layout class only). Delete the `AllVariants` story (G9). Stories live under `Organisms/RuleCard`, import from `@/components/ds`. _(per G9,G1)_
- [x] **f6ae86c8c** · RuleCard story keeps local useState
  - Now: `React.useState` in `SelectableRuleCardDemo` (:158) instead of `useArgs` (RULES §5a.2).
  - Do: Use `useArgs`.
  ```tsx
  const [{ selected }, updateArgs] = useArgs();
  ```
- [x] **fca1b515d** · RuleCard stories use empty functions and alert()
  - Now: `onApprove={() => {}}` (:61), `alert('Rule approved!')` (:110), `alert('View rule details')` (:125, 153, 172). No `onSelectedChange` action.
  - Do: `fn()` from `storybook/test`.
  ```tsx
  args: { onApprove: fn(), onDetail: fn(), onSelectedChange: fn() }
  ```
- [x] **f2ad11f04** · RuleCard menu is never shown in a story
  - Now: No story passes `menuItems`. The README (line 8) promises Find matches · Edit rule · Delete rule, so the kebab menu is unexercised.
  - Do: Add a `WithMenu` story: `args.menuItems` with three items (`onSelect: fn()` from `storybook/test`, one `destructive: true`). Add no `play` function (G9). _(per G9)_
- [x] **f936e51c5** · All variants duplicating stories and FinanceOS data is required
  - Now: None needed. Your RULES §5a.1–2 require this story, so changing it means changing the rule.
  - Do: None needed.

## Owner's own call (2)

- [x] **f3aa3abab** · AllVariants hard-coding cards is allowed
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **fc1ddd547** · RuleCard SelectableInteractive has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (7)

- **f836abe73** · RuleCard props are rule and approval concepts: Organism component (app layer): FinanceOS props are fine there.
- **f7be4e6f4** · Status words 'Verified' / 'Unverified' are built in: Organism component (app layer): FinanceOS copy is fine there.
- **f83ea2a41** · RuleCard defaults the action label to 'Approve': Organism component (app layer): FinanceOS copy is fine there.
- **fa50818a4** · Detail button label says 'View rule details': Organism component (app layer): FinanceOS copy is fine there.
- **fe5769c03** · Menu button label says 'Rule actions': Organism component (app layer): FinanceOS copy is fine there.
- **fd41b7908** · Checkbox label says 'Select rule': Organism component (app layer): FinanceOS copy is fine there.
- **f57b881cd** · RuleCard has one children slot and data-only actions: Organism component: no extra slots needed.

## Ignore: the claim was wrong (1)

- f51f241e6 (Desktop-only checkbox is required by the rules)

## README

Move `design-system/components/RuleCard/README.md` to `src/components/organisms/RuleCard/README.md` and update its Props, Variants and Built from sections to match the component after these changes.
