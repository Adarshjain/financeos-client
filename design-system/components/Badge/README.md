# Badge

A small coloured label for a state that applies to a whole item (a bill, a job, a statement), transaction categories, and count bubbles.

## Props
- `tone`: `'neutral'` | `'success'` | `'warning'` | `'danger'` | `'info'` (default `'neutral'`)
- `variant`: `'soft'` | `'solid'` | `'outline'` | `'dashed'` (default `'soft'`)
- `shape`: `'default'` | `'rounded'` (default `'default'`)
- `size`: `'sm'` | `'md'` (default `'md'`)
- `asChild`: `boolean` (default `false`)
- `onClick`: `MouseEventHandler`

## Built from
Nothing else. Renders a `<span>`, `<button>`, or Radix `Slot` when `asChild`.

## Variants
- Variants: `soft` (tinted fill), `solid` (filled), `outline` (bordered), `dashed` (dashed border)
- Shapes: `default` (rounded-ds-sm), `rounded` (rounded-ds-pill)
- Sizes: `sm` (16px height, text-micro), `md` (20px height, text-caption)
- Tones: `neutral`, `success`, `warning`, `danger`, `info`
