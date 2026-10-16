# Storybook setup: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `.storybook/main.ts`, `.storybook/preview.tsx`, `design-system/RULES.md`

## Change (4)

- [x] **gc0d48b2e** · No story logs actions
  - Now: None of the 47 story files imports `fn` from `storybook/test`, and `.storybook/preview.tsx` sets no `argTypesRegex` or action args.
  - Do: In `.storybook/preview.tsx` set `argTypes`/`args` so every `on[A-Z]*` prop is `fn()` from `storybook/test` (no deprecated `argTypesRegex`), and also pass `fn()` explicitly in story `args` where a handler is shown. Never use `() => {}`, `alert` or `console.log`. _(per G9)_
- [x] **g1e0deb8a** · Autodocs on 2 of 47 components, no docs descriptions
  - Now: Only Card and SearchField set `tags: ['autodocs']`. No `.mdx` files exist and no story sets `parameters.docs.description`.
  - Do: Turn autodocs on once in `.storybook/preview.tsx` (`tags: ['autodocs']`) and remove per-file `tags`; set `parameters: { docs: { controls: { disable: true } } }` in preview. Each meta gets a one-line `parameters.docs.description.component` from its README's first line. _(per G9)_
- [x] **g36ac96fb** · Stories add frames the global decorator already adds
  - Now: The decorator in `preview.tsx` (lines 40-52) adds `p-space-16`, `bg-canvas` and `font-text`. Many story files still add borders, backgrounds and padding, and set `layout: 'padded'`, which adds more padding.
  - Do: Frames and backgrounds come only from the existing theme decorator plus `parameters.layout`; stories add no wrapper divs, borders, backgrounds or padding in `render`. A width needs only one meta-level decorator, and `parameters.layout` is set per story (for example `fullscreen` for Dialog) rather than blanket-removed. _(per G9)_
- [x] **g8b6b36aa** · RULES lists FinanceOS components as core composites
  - Now: RULES §5b.1 lists TransactionRow, RuleCard, KpiTile, Widget, DateTile, DropZone, CategoryChip, StatusWords as Dinero composites. That puts app components in the core layer.
  - Do: RULES §5b.1 gains an organism layer (app-specific, built only from Dinero): TransactionRow, RuleCard, Illustration, Logo, SettingsToggle. StatusWords, Widget, KpiTile, DateTile, DropZone stay in Dinero. CategoryChip is deleted; Badge replaces it. _(per G1,G2)_

## Owner's own call (2)

- [x] **ga4c45116** · Interaction tests: no play functions and no test addon
  - Do: No play function and no interaction test (G9).
- [x] **g31de6741** · The 'All variants' rule creates hard-coded stories
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (1)

- **gb20bc7a7** · RULES requires FinanceOS sample content in stories: Leave as is (owner approved Keep).

## README

No README.
