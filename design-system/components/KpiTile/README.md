# KpiTile

A single figure with its label and what changed. Home leads with Net worth in the hero size; other tiles use `figure`.

## Anatomy
Overline label (`lbl`), value (`kv`, tabular; `kv-hero` for the one headline number), a delta line (▲/▼ with `positive` or `danger` plus words like "vs Sep"), then optional context: a progress bar, two small badges, or a breakdown line.

## Use
- Two columns on phone, three or four on desktop.
- A rise in spending is `danger`, a rise in net worth `positive`: colour follows good or bad, not up or down.

## Built from
Card, ProgressBar, Skeleton, Button (Retry action).

## Props
`label`, `value`, `variant` ('default' | 'hero' | 'plain'), `delta` (either a `{ value, period?, direction? }` object or a custom node), `progressBar`, `badges`, `context`, `loading`, `error` (message node), `action` (`{ label, onSelect }`).

## Variants
- Plain: the default's content with no card surface, border or padding, for a tile inside a card (a report widget).
- Hero, delta in the bad direction, with a bar, with badges, loading, failed.

## Hidden amounts
Under a `ConcealProvider` with `concealed`, each ₹ amount in value, delta and context reads "₹ —". See Conceal.
