# CategoryChip: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** DELETED: merged into Badge (G2). Move its looks into Badge, migrate callers, delete the folder and README.

**Files:** `src/components/ds/CategoryChip/CategoryChip.stories.tsx`, `src/components/ds/CategoryChip/CategoryChip.tsx`

## Change (6)

- [ ] **f454a99ac** · CategoryChip's unset chip prints 'Set category'
  - Now: `CategoryChip.tsx:60` returns the fixed string 'Set category' for the unset variant.
  - Do: Badge has no default text (content is `children` only). TransactionRow passes `<Badge variant="dashed" shape="rounded" tone="warning">Set category</Badge>` for an uncategorised row. _(per G2)_
- [ ] **fa30df791** · CategoryChip is a FinanceOS concept in the core library
  - Now: The whole component is for transaction and rule categories (README: 'the category on a transaction or rule'), though the markup is a plain pill chip.
  - Do: Covered by G2: CategoryChip is deleted and replaced by `Badge` (`variant="outline"` or `"dashed"`, `shape="rounded"`); no `Chip` rename. _(per G2)_
- [ ] **f52c4d684** · CategoryChip's variants are domain states
  - Now: `unset` means 'no category' and `count` means '+N more' (`CategoryChip.tsx:8,26-29,59-61`). The visuals are just a dashed amber outline and a plain outline.
  - Do: CategoryChip is deleted. The unset look is `<Badge variant="dashed" shape="rounded" tone="warning">`. _(per G2)_
- [ ] **fe47dd3a2** · CategoryChip name and story group are domain-specific
  - Now: The name and its place under `DS/Data display/CategoryChip` (`CategoryChip.stories.tsx:6`) tie a core part to categories.
  - Do: Covered by G2: CategoryChip is deleted and replaced by `Badge`; there is no `Chip` rename. _(per G2)_
- [ ] **f71a4bb2e** · CategoryChip stories build a fake transaction row
  - Now: The stories hand-build headings, frames and a fake row ('Swiggy Bangalore', 'HDFC Regalia', amount) (`CategoryChip.stories.tsx:36,48-73`).
  - Do: Covered by G2: CategoryChip is deleted (Badge replaces it); its stories go with it and the fake transaction row belongs only in the `Organisms/TransactionRow` stories. _(per G2)_
- [ ] **ff0122670** · CategoryChip story uses a relative import
  - Now: `CategoryChip.stories.tsx:3` imports `./CategoryChip`.
  - Do: Covered by G2: CategoryChip and its stories are deleted; Badge stories import from `@/components/ds`. _(per G2)_

## Owner's own call (2)

- [ ] **f0d95b551** · CategoryChip Interactive and AllVariants have no args
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fe7cabbd8** · CategoryChip Interactive has no play function
  - Do: No play function and no interaction test (G9).

## Superseded by a global rule: nothing to do beyond that rule (6)

- **f3efe8f3f** · CategoryChip formats counts as +N: CategoryChip and any `Chip` are deleted; the `+N` overflow is a Badge (`outline`, `rounded`, `md`) whose children the caller passes (G2).
- **ff160147e** · CategoryChip guesses its variant from count: CategoryChip is deleted (G2), so its variant default and count inference no longer exist; Badge has no count and its default variant is `soft`.
- **f22b8770f** · CategoryChip changes its HTML element when given onClick: CategoryChip is deleted (G2). Badge renders a button or Slot with `onClick` or `asChild` (G2); no `onSelect` and no separate chip typing.
- **f81561cfb** · CategoryChip asChild breaks without an element child: CategoryChip is deleted (G2); the asChild issue belongs to Badge, where `asChild` simply Slots the element child.
- **ffda0244b** · CategoryChip stories use alert() for clicks: CategoryChip and its stories are deleted (G2); Badge's `onClick` gets `fn()` via the preview-wide `on[A-Z]*` setup (G9).
- **f055d1b8d** · CategoryChip stories show an app screen and repeat variants: CategoryChip stories are deleted with the component (G2).

## README

Update `design-system/components/CategoryChip/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
