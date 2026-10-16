# KpiTile: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/KpiTile/KpiTile.stories.tsx`, `src/components/ds/KpiTile/KpiTile.tsx`

## Change (9)

- [ ] **f932e5318** · KpiTile error default says 'Prices unavailable'
  - Now: When `error` is `true`, the tile prints 'Prices unavailable' (:112). That is FinanceOS copy.
  - Do: Make `error` a node only (drop the boolean form) so the app always passes the message; no default text in Dinero. Retry is `action={{ label: 'Retry', onSelect: fn() }}`. Snippet: `<KpiTile label="Portfolio" error="Prices unavailable" action={{ label: 'Retry', onSelect: fn() }} />`. _(per G6)_
- [ ] **fa5d52b01** · KpiTile Retry text is fixed
  - Now: 'Retry' (:123) is an allowed generic control word, so the default is acceptable. The only gap is that `Widget` has `retryLabel` and `KpiTile` does not.
  - Do: Applies your one-action-shape decision: the error state takes `action={{ label: 'Retry', onSelect: retry }}`. No `onRetry` and no fixed 'Retry' text.
- [ ] **ff9b8cb9c** · KpiTile delta accepts string, element or object
  - Now: `renderDelta` branches on element/string vs object (:139-145). It is a documented convenience (`KpiDelta | ReactNode`), and each branch is small.
  - Do: Keep it but document both shapes in the README Props section. If a single form is wanted, keep the object and let apps pass an element only through `context`.
- [ ] **f45b5cbf5** · KpiTile re-implements Card three times
  - Now: The same class string appears at :81, :99 (with `border-danger-border`) and :175. README says 'Built from Card' (line 12) but `Card` is not imported.
  - Do: Render with `Card` (it has border, radius, surface). Keep one inner padded wrapper. Loading/error/normal then share one shell, and error only changes `tone`.
  ```tsx
  <Card className={error ? 'border-danger-border' : undefined}><div className="px-space-16 py-space-14">...</div></Card>
  ```
- [ ] **f67846abc** · KpiTile error is a separate branch with a boolean
  - Now: The error state is its own render branch (:93-131) and `error: ReactNode | boolean` is decided by `typeof error === 'string' || isValidElement` (:108). `error={true}` prints fixed copy.
  - Do: Same API as Widget: `error?: ReactNode` (no boolean) and `action={{ label, onSelect }}`; no `onRetry` or `retryLabel`. Reuse one shell with Card and switch the body. _(per G6)_
- [ ] **f638b0410** · KpiTile value can also come from children
  - Now: `value ?? children` (:186, :195). `value` is documented; children is not. RULES §5c.8: one name per prop.
  - Do: Remove the `children` fallback (omit `children` from the props type), or document one of them as the only way.
- [ ] **f2a4d7c40** · KpiTile stories lack argTypes for delta, bar, badges, retry
  - Now: `argTypes` (:13-33) skip `delta`, `progressBar`, `badges`, `onRetry`. `error` is a boolean control (:30-32), which can only produce the fixed copy.
  - Do: Add argTypes for `delta`, `progressBar` and `badges`. The retry callback becomes `action: { label, onSelect }` (the agreed action shape), with `onSelect: fn()`.
- [ ] **f736ef0b6** · KpiTile stories use empty functions and alert()
  - Now: `onRetry={() => {}}` (:118) and `alert(...)` (:185).
  - Do: Applies your one-action-shape decision: story args use `action: { label: 'Retry', onSelect: fn() }`.
- [ ] **f57a9e35b** · All variants duplicating and FinanceOS data is required
  - Now: None needed. Your RULES §5a.1–2 require this story, so changing it means changing the rule.
  - Do: Delete the KpiTile `AllVariants` story; autodocs replaces it and each state stays its own args-driven story (realistic FinanceOS sample content stays). _(per G9)_

## Owner's own call (2)

- [ ] **fe919dd9e** · AllVariants hard-coding tiles is allowed
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f88a0b8a8** · KpiTile Failed story has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **f588bcdcd** · Progress bar label is built from the tile label: Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f7f9a2286** · KpiTile maps delta sentiment to colour inside: Mapping a tone to a colour inside the component is what tone props are for.
- **fb7d717f4** · KpiTile value is forced onto one line: Leave as is (owner approved Keep).
- **ff8bf8171** · Progress bar is a config object, not a slot: No page needs this flexibility yet; add it when one does.

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f820e87ef** · Hand-built headings in KpiTile All variants: AllVariants is deleted (G9), so its hand-made headings no longer exist.

## README

Update `design-system/components/KpiTile/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
