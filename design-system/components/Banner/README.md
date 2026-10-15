# Banner

The one inline message. It replaces the old Callout and Note: a failed request at the top of a form, a success that needs no action, how the screen was reached, something to act on inside a card, or a neutral note. Toast is the same message floating.

## Tones
- `danger` on `danger-tint` with `danger-ink`: "Email or password is incorrect."
- `success` on `positive-tint` with `positive-strong`: "Your account has been deleted."
- `warning` on `warning-tint` with `warning-ink`: something to act on. "2 bank credits look like dividends. Reconcile"
- `info` on `info-tint` with `info-ink`: "That item is already handled."
- `neutral` on `bg-surface` with a `line` border and `ink-2` text: a note ("Changing the pattern unlinks the 31 transactions it categorised.").

## Props
`tone`, children (the message), optional `title` (bold lead-in), optional `action` (a link-styled button at the end: "Reconcile", "See them", "Try again").

## Rules
- Say what happened and what to do next. Keep the form and its values.
- No icon: the tone and the words carry it (RULES §6).
- Placement is layout, not a variant: top of a form, top of a list, or inside a card.

## Built from
Button (link style for the action). Toast reuses its tones.

## Variants
- The five tones, with and without a title, with an action.
