# Text: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Text/Text.stories.tsx`, `src/components/ds/Text/Text.tsx`

## Change (6)

- [ ] **f07d6c3fb** · Text always forces left alignment and the font family
  - Now: `align` defaults to `'start'`, which always adds `text-left` (lines 73, 89, 104). `family` defaults to `'text'` and always adds `font-text` (line 88). Inside a centred or display parent, Text cannot inherit.
  - Do: Make `align` and `family` optional with no default (`undefined`). Add the class only when the prop is passed.
  ```tsx
  align?: TextAlign;   // no default
  family?: TextFamily; // no default
  // className: align && alignStyles[align], family && familyStyles[family]
  ```
- [ ] **f54d1cb56** · Text story builds its own labels, rows and frame
  - Now: Line 53 is a styled wrapper. Lines 59-91 repeat `<span className="w-28 text-caption text-ink-4 font-mono">` as labels, with `border-b border-line-soft` rows.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [ ] **f1d4b9194** · Text story wraps samples in a styled bold div
  - Now: Line 94 is `<div className="flex gap-space-14 flex-wrap mt-space-12 font-semibold">`, a styled wrapper with weight inside `AllVariants`.
  - Do: Delete the styled bold div wrapper along with `AllVariants` (G9). Samples may sit side by side only with layout classes; no visual classes in stories. _(per G9)_
- [ ] **f4c850955** · Text Truncated story builds its frame inside render
  - Now: Line 218 is `<div className="w-64 border border-line-soft p-space-8">` inside `Truncated`'s `render`. The frame exists only to force a width.
  - Do: Delete `render`; use `decorators: [(Story) => <div className="w-64"><Story /></div>]` on this story.
- [ ] **fda31a2c9** · Text DisplayFamily story duplicates PageTitle
  - Now: `PageTitle` (line 116) and `DisplayFamily` (line 194) both use `variant: 'page-title'` and `family: 'display'`; only the text differs.
  - Do: Delete `DisplayFamily`. If `family` should be shown, add a `family` control (it already exists in `argTypes`) and a story on `body` with `family: 'display'`.
- [ ] **f58ad63bb** · Text stories use a relative import
  - Now: Line 4: `import { Text } from './Text'`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (2)

- [ ] **fce9f2425** · Text AllVariants story hard-codes every row
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fc27ef5cf** · Text AllVariants repeats the per-variant stories
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f4f226a64** · Text variants hero-figure, figure and tab-label are app roles: These are the type styles from tokens.json, and type roles as Text variants are standard.
- **f86eff96e** · Text stories use FinanceOS sample copy: Leave as is (owner approved Keep).

## README

Update `design-system/components/Text/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
