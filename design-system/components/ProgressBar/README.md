# ProgressBar

A 6px track (`line-soft`) with a rounded fill in brand, warning, or danger.

## Use
Always pair it with the numbers it represents ("62% of ₹1.55L budget · 18 days left"). Milestones and card utilisation use the same bar. A split bar always comes with a `ProgressBar.Legend` (or labels). Split form was owner-approved on 2026-10-21 for the loan "Interest vs principal" card.

## Props
- `value?: number`: current progress value. Omit for indeterminate.
- `min?: number`: minimum value (default `0`).
- `max?: number`: maximum value (default `100`).
- `tone?: 'brand' | 'warning' | 'danger'`: bar colour (default `'brand'`).
- `color?: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'chart-rest'`: fills with that chart palette colour instead of `tone`'s (owner, 2026-10-25). Ignored in split form, where each segment has its own `color`.
- `label?: React.ReactNode`: caption text displayed below the track.
- `segments?: { value: number; label: string; color: 'brand' | 'chart-1' … 'chart-5' | 'chart-rest' }[]`: split form. Each segment is `value / sum` wide, in order, flush, on an 8px track. Zero segments render nothing; an all-zero sum renders an empty track. `value`, `min`, `max` and `tone` are ignored. Each segment carries its `label` as `data-segment` and `title`.
- `ProgressBar.Legend` with `items: { label: string; color: same union }[]`: 8px swatches (`radius-xs`) with labels in `ink-3`, one wrapping row, 12px between items.

## Variants
- Brand (`brand`), warning (`warning`), danger (`danger`), empty (`value={0}`), indeterminate (no `value`).
- Chart colour (`color`): the fill in a chart palette colour, for a bar that stands for a category.
- Split (`segments`): two or more flush coloured segments, with a Legend.

## Built from
Nothing else.
