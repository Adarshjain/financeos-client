# EmptyState

What a screen shows when it has nothing yet, or cannot load: an optional illustration, a `screen-title` headline, one sentence, and the one action that fixes it.

## Props
- `title?: ReactNode` (rendered in display font, screen-title style)
- `description?: ReactNode` (explanatory one-sentence description in body style)
- `action?: { label: ReactNode; onSelect: () => void; variant?: 'primary' | 'secondary' | 'link' }`
- `illustration?: ReactNode`
- `compact?: boolean` (compact single-line style for small panels or widget rows)
- `size?: 'sm' | 'md'` (default `'md'`, controlling padding scale)

## Use
- Empty list: say what will appear and offer the first step ("No transactions yet" · Add account).
- Offline: a friendly page with sleeping ₹ coin illustration passed via `illustration` slot, no cached data, one "Try again" button.
- Errors: what failed and the reference to quote; never a stack trace.

## Built from
Button, Text. Illustration is passed via the `illustration` slot.

## Variants
- First run, nothing matches (filters), all clear, couldn't load, with illustration, and compact (one-line).
