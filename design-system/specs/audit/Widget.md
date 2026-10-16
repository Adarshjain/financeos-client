# Widget: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Widget/Widget.stories.tsx`, `src/components/ds/Widget/Widget.tsx`

## Change (9)

- [ ] **f33243570** · Widget 'unavailable' is described as a deleted report
  - Now: The comment at :43 says 'when report was deleted'. That is app wording. `onRemove` is a good name by RULES §5c.7 (it is the rule's own example).
  - Do: Reword the `unavailable` comment as 'shown when the content can't be shown'. Keep the unavailable state, with `action={{ label, onSelect }}` (no `onRemove`, no `removeLabel`); do not replace it with an EmptyState passed as children. _(per G6)_
- [ ] **f445b669f** · Widget defaults retryLabel and removeLabel
  - Now: `retryLabel = 'Retry'` (:64) is allowed default copy. `removeLabel = 'Remove'` (:69) is not on the allowed list.
  - Do: Applies your one-action-shape decision: the error and unavailable states each take `action={{ label, onSelect }}` (for example Retry, or Remove). `retryLabel`, `onRetry`, `removeLabel` and `onRemove` go.
- [ ] **fc7f04436** · Widget renderBody has tangled title/message logic
  - Now: `renderBody` (:111-206) picks loading, error, unavailable, children. The title is computed as `errorTitle ?? (string ? null : isValidElement ? null : undefined)` (:124-130); `null` and `undefined` are both falsy, so the branches do nothing.
  - Do: Simplify `renderBody`: `error?: ReactNode` is the message and `errorTitle` is rendered only when given; delete the dead null/undefined ternary and the `errorMessage` prop. Use the same shape for unavailable. _(per G6)_
- [ ] **f7aacde6c** · Widget re-implements Card
  - Now: Lines 212, 217, 232 hand-write border, radius, header and body padding. README lists 'Card' under Built from (line 18) but `Card` is not imported. `Card` already takes `title`, `subtitle`, `action`.
  - Do: Render `<Card title subtitle action={menu}>` and keep the body padding wrapper.
  ```tsx
  <Card title={title} subtitle={subtitle} action={renderMenu()}><div className="px-space-14 pb-space-12">{body}</div></Card>
  ```
- [ ] **ff9611100** · Widget error and unavailable props overlap
  - Now: `error`, `errorTitle`, `errorMessage` (:37-39) describe one state with three props. `unavailable` repeats it (:44-46).
  - Do: One shape: `error?: ReactNode` for the message, `errorTitle?: ReactNode`, and `action={{ label, onSelect }}` for the Retry or Remove button. Drop the boolean form, `errorMessage`, `onRetry`, `retryLabel`, `removeLabel` and `onRemove`. Widget keeps its unavailable state, with the same action object. _(per G6,G15)_
- [ ] **f469b91b4** · Widget stories lack argTypes for error and menu props
  - Now: `argTypes` (:12-18) cover 5 props. `errorTitle`, `errorMessage`, `unavailableTitle`, `unavailableMessage`, `menuItems`, `retryLabel`, `removeLabel` have none. Setting `error` true without them shows an empty message.
  - Do: Add argTypes for `error`, `errorTitle`, `unavailableTitle`, `unavailableMessage` and `menuItems` (object control), with `action` as `{ label, onSelect: fn() }`. Do not list `errorMessage`, `retryLabel`, `removeLabel` (removed by G6) or `on*` actions. _(per G6)_
- [ ] **f22d49cfb** · Raw grid wrapper in Widget All variants
  - Now: `<div className="grid grid-cols-2 gap-space-12 max-w-xl">` (:26) is the layout for All variants.
  - Do: Covered by G9: Widget's `AllVariants` story is deleted (autodocs replaces it), so the raw grid wrapper and any shared `VariantGrid` helper are not needed. _(per G9)_
- [ ] **fdebd54f3** · Widget stories hand-build the KPI figure
  - Now: Raw divs with `text-figure font-extrabold ...` and `text-label font-bold text-danger` (:35-40, 81-86, 133-135) imitate the figure from `KpiTile`.
  - Do: Use `Text` (`variant="figure"`, `tone="danger"` for the delta) so the story uses design-system parts, not copied classes.
  ```tsx
  <Text variant="figure">₹97,044</Text>
  <Text variant="label" tone="danger">▲ 28%</Text>
  ```
- [ ] **f67f88fc1** · Widget stories use empty functions and alert()
  - Now: `onSelect: () => {}` (:31-32, 75-77), `onRetry={() => {}}` (:55), `alert(...)` (:107, 118).
  - Do: Applies your one-action-shape decision: story args use `action: { label: 'Retry', onSelect: fn() }` and menu items with `onSelect: fn()`.

## Owner's own call (3)

- [ ] **f9b38006c** · AllVariants hard-coding widgets is allowed
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fe2fdc653** · Widget Figure and WithMenu stories are near duplicates
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f6d3c1ac3** · Widget has no play functions
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **f67da0f7e** · Widget menu button label is fixed to 'Widget options': Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **ff659a658** · Widget carries a 'report deleted' state: Leave as is (owner approved Keep).
- **f9eac0593** · Widget header is fixed; menu is data plus a node: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/Widget/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
