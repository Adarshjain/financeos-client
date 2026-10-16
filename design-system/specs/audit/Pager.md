# Pager: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Pager/Pager.stories.tsx`, `src/components/ds/Pager/Pager.tsx`

## Change (14)

- [ ] **f622eb6aa** · Pager defaults its unit to "transaction"
  - Now: `unit = 'transaction'` (Pager.tsx:73). A page of statements that forgets `unit` says "transactions".
  - Do: Make `unit` have no default and render the unit span only when given. Better, let the app pass a whole summary (see the "of" finding).
  ```tsx
  <Pager unit="statement" ... />
  ```
- [ ] **f77e90805** · The word "of" is fixed in the Pager
  - Now: `<span>of {totalElements}</span>` (Pager.tsx:115) is English text built into the component.
  - Do: Add `summary?: (r: { start: number; end: number; total: number }) => ReactNode`. Default renders `1–50` and the total with a plain `/` so no word is needed. The app passes `({start,end,total}) => `${start}–${end} of ${total} transactions``.
  ```tsx
  <Pager summary={({ start, end, total }) => `${start}–${end} of ${total}`} />
  ```
- [ ] **feb7901a3** · "/ page" is hard-coded in three places
  - Now: `${opt} / page` (Pager.tsx:127), `{size} / page` (:142) and (:150) are English.
  - Do: Add `sizeLabel?: (size: number) => string`. Default to `String(size)`. The app passes `(n) => `${n} / page``.
  ```tsx
  <Pager sizeLabel={(n) => `${n} / page`} />
  ```
- [ ] **f631d9a67** · Pager adds an English plural "s" to the unit
  - Now: `unit.endsWith('s') || unit.includes(' ') ? unit : totalElements === 1 ? unit : unit + 's'` (Pager.tsx:91-95). Stories avoid it with "needing review" (Pager.stories.tsx:95, 139).
  - Do: Remove the plural logic. Render `unit` as given and let the app pass the right form, or use the `summary` render prop from the "of" finding.
- [ ] **f1cf47d18** · getPageNumbers has a compact mode nobody uses
  - Now: `getPageNumbers(..., compact)` is exported (Pager.tsx:23), but `Pager` always passes `false` (:97). Phone behaviour is done in CSS instead (:201).
  - Do: Remove the `compact` parameter and its branch. Keep the helper private unless the app needs it (check usages first).
- [ ] **f1b7e2d98** · pg-unit and pg-r are dead marker classes
  - Now: `pg-unit` (Pager.tsx:116) and `pg-r` (:121) have no CSS in `src`. They exist only in the old mock-up files `design-system/screens/P-chat.dc.html` and `P-report-builder.dc.html`.
  - Do: Delete both class names.
- [ ] **f8fcf4b5a** · Rows-per-page label and format cannot be supplied
  - Now: The select options and trigger text are built in the component (Pager.tsx:125-147).
  - Do: Same `sizeLabel?: (size: number) => string` prop as the "/ page" finding. Use it for both the options and the trigger.
- [ ] **f6cf00dfb** · Interactive story hard-codes its data
  - Now: `InteractivePagerStory` fixes `totalElements = 182` and `unit="transaction"` (Pager.stories.tsx:158-186).
  - Do: Replace with args-driven `Interactive` using the meta `render` (it already tracks page and size). Total and unit come from `args`.
- [ ] **fa44ba2ee** · No argTypes for sizeOptions
  - Now: `argTypes` (Pager.stories.tsx:21-31) has no `sizeOptions` (or `onSizeChange`).
  - Do: Add `sizeOptions: { control: 'object' }` to `argTypes`. Do not add `onSizeChange: { action: ... }`: preview makes every `on*` prop `fn()`. _(per G9)_
- [ ] **f5b47462a** · Story chrome and fake content are hand-made
  - Now: `AllVariants` uses `space-y-space-24` wrappers, `<h4 className="text-label ...">` headings and extra Cards (Pager.stories.tsx:52-100). `Interactive` adds fake page text `Simulated content for page...` (:165).
  - Do: Delete `AllVariants`. For `Interactive`, drop the fake text; the Pager alone shows page changes. Put widths in a decorator.
- [ ] **f19707c19** · Interactive repeats what the meta render already does
  - Now: `InteractivePagerStory` runs its own `useState` for page and size (Pager.stories.tsx:158-181). The meta `render` (:32-43) already does the same with `useArgs`.
  - Do: Remove the component. `Interactive` becomes `{ args: { page: 0, size: 50, totalElements: 182, unit: 'transaction' } }` and uses the meta render.
- [ ] **fa224f465** · Pager stories use empty arrow functions as callbacks
  - Now: `onPageChange: () => {}` and `onSizeChange: () => {}` appear in many stories (Pager.stories.tsx:64,65,80,96,97,113,114,128,140,141,153,154).
  - Do: Use `fn()` from `storybook/test` in meta `args`. Also make the meta `render` call `args.onPageChange?.(p)` before `updateArgs`, otherwise the spy never fires.
  ```tsx
  args: { onPageChange: fn(), onSizeChange: fn() }
  ```
- [ ] **fc3135cb8** · Pager is wrapped in two Cards
  - Now: The decorator wraps every story in `<Card className="max-w-3xl overflow-hidden font-text">` (Pager.stories.tsx:16). `AllVariants` (:57, 74, 89) and `Interactive` (:164) add another Card, so those sit in two.
  - Do: Keep one frame, in the decorator. Remove inner Cards with `AllVariants` and the `Interactive` wrapper.
- [ ] **f9d7211dc** · Phone story uses FinanceOS sample words
  - Now: `Phone` is a story with `parameters.viewport` set to the phone viewport (Pager.stories.tsx:118-130). That is the right way to show the CSS switch. The real gap is sample content: "transaction", "statement", "needing review".
  - Do: Delete the Pager `Phone` story: it differs from another story only by viewport. Phone width is covered by the decorator/viewport toolbar, not a story. _(per G9)_

## Owner's own call (2)

- [ ] **fe9cb7f16** · AllVariants hard-codes three pagers
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f8d2afa4d** · No play function in Pager stories
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **f52d651fe** · Pager aria text is fixed English: Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f0d88bc97** · Pager padding and background are fixed: Leave as is (owner approved Keep).
- **f7c201634** · Default page sizes are 25, 50, 100: Leave as is (owner approved Keep).

## Ignore: the claim was wrong (3)

- f6034a99c (totalPages fallback is fine as written), f7450ce66 (lg breakpoint hiding is by design), fb3f1d3b8 (page is controlled by design)

## README

Update `design-system/components/Pager/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
