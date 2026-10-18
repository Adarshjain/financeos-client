# EmptyState

What a screen shows when it has nothing yet, or cannot load: an optional illustration, a `screen-title` headline, one sentence, and the action that fixes it, with an optional second one.

## Props
- `title?: ReactNode` (rendered in display font, screen-title style)
- `description?: ReactNode` (explanatory one-sentence description in body style)
- `action?: { label: ReactNode; onSelect: () => void; variant?: 'primary' | 'secondary' | 'link' }`
- `secondaryAction?: { label: ReactNode; onSelect: () => void }` (a second action after the first, always `secondary`; a `link` when compact. Example: Clear amount · Clear all filters, Try again · Copy reference)
- `illustration?: ReactNode`
- `compact?: boolean` (compact single-line style for small panels or widget rows)
- `size?: 'sm' | 'md'` (default `'md'`, controlling padding scale)

## Use
- Empty list: say what will appear and offer the first step ("No transactions yet" · Add account).
- Offline: a friendly page with sleeping ₹ coin illustration passed via `illustration` slot, no cached data, one "Try again" button.
- Errors: what failed and the reference to quote; never a stack trace. The app's ErrorState organism builds this case (Try again · Copy reference).
- Two actions: at most two, the fixing one first. Two filter clears are both `secondary` (`action.variant="secondary"`).

## Built from
Button, Text. Illustration is passed via the `illustration` slot.

## Variants
- First run, nothing matches (filters), all clear, couldn't load, with illustration, with a second action, and compact (one-line). One working story drives them all through controls.
