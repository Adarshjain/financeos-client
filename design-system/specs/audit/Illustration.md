# Illustration: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Organism: move to `src/components/organisms/Illustration/` (G1).

**Files:** `src/components/ds/Illustration/Illustration.stories.tsx`, `src/components/ds/Illustration/Illustration.tsx`

## Change (2)

- [x] **f79e40b93** · Illustration stories use raw captions and wrappers
  - Now: Illustration.stories.tsx:22,24,53,66,83,127 use hand-styled spans and divs.
  - Do: Use meta `decorators` for the canvas and a bordered frame, and `parameters.viewport` for phone.
- [x] **fdcf23ad1** · Illustration SignIn/SignInPhone and SignUp/SignUpPhone are duplicates
  - Now: Illustration.stories.tsx:61-119: each pair has the same variant and differs by the viewport parameter and wrapper width.
  - Do: Keep one story per variant. Use the Storybook viewport toolbar for phone.

## Owner's own call (1)

- [x] **f8aa0e547** · Illustration 'All variants' hard-codes five instances
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (6)

- **f0c115783** · Illustration sign-up scene has FinanceOS sample text baked in: Organism component (app layer): FinanceOS copy is fine there.
- **f8693dd88** · Illustration contains onboarding and marketing copy: Organism component (app layer): FinanceOS copy is fine there.
- **fb4db3fe9** · Illustration sign-in tiles and offline coin use FinanceOS values: Organism component (app layer): FinanceOS copy is fine there.
- **fa415510d** · Illustration contains rupee amounts as literal text: Organism component (app layer): this app logic is fine there.
- **f8148ada4** · Illustration layout is fixed to one panel shape: Leave as is (owner approved Keep).
- **f08f6b7aa** · Illustration content is fixed JSX with no slots: Organism component: no extra slots needed.

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f6f3ce960** · Illustration variants are FinanceOS auth pages: Illustration is an organism that keeps its current props (`variant` signin/signup/offline) and fixed FinanceOS scenes; do not turn it into a generic slot panel.

## README

Move `design-system/components/Illustration/README.md` to `src/components/organisms/Illustration/README.md` and update its Props, Variants and Built from sections to match the component after these changes.
