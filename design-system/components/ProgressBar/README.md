# ProgressBar

A 6px track (`line-soft`) with a rounded fill in brand, warning, or danger.

## Use
Always pair it with the numbers it represents ("62% of ₹1.55L budget · 18 days left"). Milestones and card utilisation use the same bar.

## Props
- `value?: number`: current progress value. Omit for indeterminate.
- `min?: number`: minimum value (default `0`).
- `max?: number`: maximum value (default `100`).
- `tone?: 'brand' | 'warning' | 'danger'`: bar colour (default `'brand'`).
- `label?: React.ReactNode`: caption text displayed below the track.

## Variants
- Brand (`brand`), warning (`warning`), danger (`danger`), empty (`value={0}`), indeterminate (no `value`).

## Built from
Nothing else.
