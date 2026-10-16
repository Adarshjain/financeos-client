# SectionHeader: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/SectionHeader/SectionHeader.stories.tsx`, `src/components/ds/SectionHeader/SectionHeader.tsx`

## Change (3)

- [ ] **ff0b8b217** · SectionHeader has a dead month variant and screen-named variants
  - Now: The type lists `'date' | 'band' | 'month' | 'danger'` (line 5). There is no branch for `month`, so it renders exactly like `band` (lines 66-82). The doc comment names FinanceOS screens ('12 Oct', 'Delete account', 'out ₹1,05,219').
  - Do: Delete `month`. Use `variant?: 'strong' | 'band'` for the look and `tone?: 'neutral' | 'danger'` for the colour. Rewrite the comments with neutral examples.
  ```tsx
  <SectionHeader variant="band" tone="danger">Delete account</SectionHeader>
  ```
- [ ] **fedbad669** · SectionHeader has two ways to set the label and a fixed separator
  - Now: `label ?? children` (line 43) gives two props for one thing. In the band look `meta` is drawn as ` · {meta}` (line 80) but in the date look it is a separate muted span with no dot (lines 59-61). It renders a `div` and has no `as` prop.
  - Do: Use `children` as the label and drop `label`. Draw `meta` the same way in every look (muted span, separator done with a CSS pseudo-element or left to the app). Add `as?: 'div' | 'h2' | 'h3'` (default `'div'`).
  ```tsx
  <SectionHeader as="h3" meta="Mon">12 Oct</SectionHeader>
  ```
- [ ] **fa8914b44** · SectionHeader stories: Month and Band look the same
  - Now: `meta` sets default args at lines 31-35. `Band` and `Month` look identical because `month` has no code of its own.
  - Do: After removing `month`, keep `Strong`, `Band`, `BandDanger`, and a `WithMeta` story. Keep the story-level `variant` arg; it is how each README variant gets its own story.

## Owner's own call (1)

- [ ] **f157b1cef** · SectionHeader AllVariants hard-codes its headers
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f091e6f99** · SectionHeader bakes in sticky and spacing, but can be overridden: Leave as is (owner approved Keep).
- **facf6f3a8** · SectionHeader stories use FinanceOS sample text: Leave as is (owner approved Keep).

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f4b55f980** · SectionHeader AllVariants story uses hand-made captions: The AllVariants story is deleted (G9), so there are no captions or `states` array to fix.

## README

Update `design-system/components/SectionHeader/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
