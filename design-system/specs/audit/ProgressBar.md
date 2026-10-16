# ProgressBar: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/ProgressBar/ProgressBar.stories.tsx`, `src/components/ds/ProgressBar/ProgressBar.tsx`

## Change (4)

- [ ] **f7f8b1bc8** · ProgressBar picks its tone from budget percentages
  - Now: ProgressBar.tsx:20,31-36: `tone='auto'` is the default and turns warning at 60% and danger above 100%. These are FinanceOS budget rules.
  - Do: Default `tone` to 'brand' and remove 'auto'. The app computes the tone from its own thresholds and passes it.
  ```tsx
  <ProgressBar value={62} tone={spent > 100 ? 'danger' : 'warning'} />
  ```
- [ ] **f6bd6ab28** · ProgressBar tone type includes 'auto'
  - Now: ProgressBar.tsx:5 defines `'auto' | 'brand' | 'warning' | 'danger'`.
  - Do: Keep 'brand', 'warning' and 'danger', and drop 'auto' (see the tone finding).
- [ ] **fa8cdec99** · ProgressBar has no min, no empty state and a mixed prop target
  - Now: ProgressBar.tsx:9,48-52: `value` is required, there is no `min`, and `aria-valuenow` is the raw value (line 48). `aria-label` goes to the inner bar while other props go to the outer wrapper (lines 23,45,51).
  - Do: Add `min?: number` (default 0), make `value` optional so no value means an indeterminate bar, and clamp the value in the width math. Leave the aria wiring as is.
- [ ] **f23ac9e3e** · ProgressBar 'All variants' builds its own headings
  - Now: ProgressBar.stories.tsx:46-65 use `<h3 className='text-overline ...'>` headings and wrapper divs.
  - Do: Delete the story. Each real state (Brand, Warning, Danger, Empty) is already its own story.

## Owner's own call (1)

- [ ] **fa5f8057c** · ProgressBar has no controls and a hard-coded kitchen-sink story
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (1)

- **f297b7cd8** · ProgressBar stories use FinanceOS budget text: Leave as is (owner approved Keep).

## README

Update `design-system/components/ProgressBar/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
