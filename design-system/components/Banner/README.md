# Banner

The one inline message. It replaces the old Callout and Note: a failed request at the top of a form, a success that needs no action, how the screen was reached, something to act on inside a card, or a neutral note. Toast is the same message floating.

## Tones
- `danger` on `danger-tint` with `danger-ink`: "Email or password is incorrect."
- `success` on `positive-tint` with `positive-strong`: "Your account has been deleted."
- `warning` on `warning-tint` with `warning-ink`: something to act on. "2 bank credits look like dividends. Reconcile"
- `info` on `info-tint` with `info-ink`: "That item is already handled."
- `neutral` on `bg-surface` with a `line` border and `ink-2` text: a note ("Changing the pattern unlinks the 31 transactions it categorised.").

## Props
- `tone`: `'danger' | 'success' | 'warning' | 'info' | 'neutral'` (default `'info'`)
- `rounded`: `'none' | 'sm' | 'md' | 'lg'` (default `'lg'`): `radius-sm/md/lg`, or square
- `title?: ReactNode` (bold lead-in)
- `children`: `ReactNode` (the message; supports block-level elements like `<p>`)
- `action?: { label: ReactNode; onSelect: () => void }` (link-styled button on the right)
- `onDismiss?: () => void` (optional close button at far right)

## Layout
- The message row (text, action, dismiss) carries the banner's padding; padding passed through `className` adds around it.
- One line of text keeps the banner one line tall: text and action are vertically centred, and the action is Button `link` (inline text, no padding), so adding an action never changes the height.
- Longer text wraps; the action sits on the right vertically centred.

## Rules
- Say what happened and what to do next. Keep the form and its values.
- No status icon: the tone and the words carry it (RULES §6). Dismiss control uses Icon `close`.
- Placement inside a page is layout, not a variant: top of a form, top of a list, or inside a card.
- A full-width banner at the edge of the app (e.g. "**FinanceOS was updated.** Refresh to use the latest version." above the shell, owner 2026-10-23) is `rounded="none"`; the page adds the safe-area insets as layout padding (`className`), which sits around the message row.

## Built from
Button `link` (the action), Button `ghost` and Icon `close` (the dismiss control). Toast reuses its tones.

## Variants
- The five tones, with and without a title, with an action, with dismiss.
- `rounded`: none, sm, md, lg (story "Full width" shows none).

## Hidden amounts
Under a `ConcealProvider` with `concealed`, each ₹ amount in title and children reads "₹ —". See Conceal.
