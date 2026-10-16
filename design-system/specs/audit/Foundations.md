# Foundations: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Docs, not a component: replace with a Storybook MDX docs page `design-system/Foundations.mdx` (or `src/components/ds/Foundations.mdx`) that renders tokens from tokens.json; remove the export from the barrel (C-surface).

**Files:** `src/components/ds/Foundations/Foundations.stories.tsx`, `src/components/ds/Foundations/Foundations.tsx`

## Change (3)

- [ ] **fe09c59ad** · Foundations token pages are exported as library components
  - Now: Foundations.tsx exports `FoundationsColours`, `FoundationsTypography`, `FoundationsSpacing`, `FoundationsRadii`, `FoundationsShadows` and `FoundationsAll`, and `index.ts:16` re-exports them. They are documentation, not parts an app uses.
  - Do: Remove the export from `index.ts` and move the pages to an MDX docs file (for example `Foundations.mdx`) under Storybook. Keep the component file out of the public barrel.
- [ ] **f2cfcf66d** · Foundations repeats token values by hand
  - Now: Foundations.tsx has hard-coded values like `val: '4px'` (lines 186-199, 224-230) that can drift from the Tailwind config.
  - Do: Read the values from the token source (the Tailwind theme or CSS variables) in the MDX page.
- [ ] **f77350e91** · Foundations stories are one-line renders; the raw markup is in the component
  - Now: Foundations.stories.tsx:21-43 only render `<FoundationsX />`. The hand-made `h2`, `p`, `div` markup is inside Foundations.tsx.
  - Do: Replace the stories and the component with an MDX docs page, as in the export finding.

## Owner's own call (1)

- [ ] **fd4f3f526** · Foundations 'All variants' repeats the five stories
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (1)

- **f116a894c** · Foundations pages use FinanceOS sample values and descriptions: Leave as is (owner approved Keep).

## Ignore: the claim was wrong (1)

- f852ca0a6 (Foundations has no args (not applicable))

## README

Update `design-system/components/Foundations/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
