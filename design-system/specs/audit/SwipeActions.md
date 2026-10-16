# SwipeActions: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/SwipeActions/SwipeActions.stories.tsx`, `src/components/ds/SwipeActions/SwipeActions.tsx`

## Change (9)

- [x] **feb72cf51** · Tone type lists warning and info that do nothing
  - Now: `SwipeActionTone` has four values (SwipeActions.tsx:9) but the render code only checks `danger` (:83) and `brand` (:100).
  - Do: Implement all four with a lookup `{ brand:'bg-brand', danger:'bg-danger', warning:'bg-warning', info:'bg-info' }`, all with `text-on-brand`. Or cut the type to `'brand' | 'danger'`.
  ```tsx
  const toneClass = { brand: 'bg-brand', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }
  ```
- [x] **fb176c242** · README says 40% of the row, code uses 96px
  - Now: `threshold = 96` px (SwipeActions.tsx:44, also useSwipe.ts:15). The README says the swipe fires "past the threshold (40% of the row, or a fast flick)" (README line 13). `useSwipe` has no percentage or velocity logic.
  - Do: Pick one. Simplest: fix the README to say `threshold` is pixels (default 96). Or implement it: `threshold?: number` in px, with a `thresholdRatio` fallback.
- [x] **f6dd8d924** · warning/info are ignored and the default tone differs per side
  - Now: Left uses `danger` or else `brand` (SwipeActions.tsx:83-85). Right uses `brand` or else `danger` (:100-102). So an omitted `tone` is brand on the left and danger on the right, and `warning`/`info` fall to the default.
  - Do: Use one shared tone lookup for both sides with a single default, `brand`.
- [x] **f5da9c871** · Consumer handlers override the swipe handlers
  - Now: `{...handlers}` comes before `{...props}` (SwipeActions.tsx:74-75). A consumer `onPointerDown` (or move/up/cancel) replaces the swipe handler and breaks the gesture.
  - Do: Spread `props` first, then `handlers`. Or call both: compose each event so the consumer handler runs too.
- [x] **fe694746e** · Wrap stories hard-code their children in render
  - Now: `WrapTransactionRow`, `WrapListRow`, `WrapCard` (SwipeActions.stories.tsx:101-161) set the children inside `render` and only spread `args` for `disabled`.
  - Do: Drop `WrapTransactionRow` (TransactionRow is an organism and Dinero never imports organisms); keep `WrapListRow` and `WrapCard` with neutral content. Pass `left`/`right` through `args` with `onTrigger: fn()` so Controls work. _(per G1)_
- [x] **feec0d380** · Story chrome uses hand-built wrappers and headings
  - Now: Lines 44-125 use `space-y-space-24 max-w-sm w-full font-text` wrappers, `<h4 ...>` headings and a `border border-line rounded-ds-lg ...` div.
  - Do: Move widths to a decorator `(Story) => <div className="max-w-sm"><Story /></div>`. Remove headings with `AllVariants`.
- [x] **f25e46867** · Card body is hand-made FinanceOS content
  - Now: The card story uses two divs with `font-extrabold text-body text-ink` and `text-caption text-ink-3`: "Subscription renewal" and "Netflix Premium · Renews in 2 days" (SwipeActions.stories.tsx:87-94, 151-158).
  - Do: Use `ListRow` (title + subtitle) inside the Card, with neutral text.
- [x] **f3a8a8f40** · Triggers use alert()
  - Now: `onTrigger: () => alert('Approved')` and `alert('Deleted')` (SwipeActions.stories.tsx:31, 38).
  - Do: Use `onTrigger: fn()` from `storybook/test`.
  ```tsx
  const approveAction = { label: 'Approve', tone: 'brand', onTrigger: fn() }
  ```
- [x] **f2edc669a** · Stories use deep imports and class overrides
  - Now: The stories import `../ListRow/ListRow` and `../TransactionRow/TransactionRow` (SwipeActions.stories.tsx:4-8) and add `rounded-ds-md`/`rounded-ds-lg` and Card styling by class (:52, 85, 87, 109, 149, 151).
  - Do: Import from `@/components/ds`. Put the rounding in the decorator frame. Use a neutral row instead of `TransactionRow`, which is moving to the app organism layer.

## Owner's own call (3)

- [x] **f03af7ab9** · argTypes cover only disabled
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f3cae799f** · AllVariants repeats the Wrap stories; README variants are missing
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f79921849** · No play function for the swipe
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **f2bb96dad** · Reveal layer padding and type are fixed: Leave as is (owner approved Keep).
- **f8ffc67cc** · Action label is string only; useSwipe is re-exported: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/SwipeActions/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
