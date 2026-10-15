# Badge

A small coloured label for a state that applies to a whole item (a bill, a job, a statement), never on transaction rows. The `count` variant is the CountBubble every count uses.

## Tones
`b-green` done or paid · `b-amber` due soon, warning · `b-rose` missing, failed, overdue · `b-blue` informational counts and sources · `b-grey` neutral.

## Count
A pill 16px tall (`space-16`), at least 16 wide, `tab-label` text: `ink` fill with `on-brand` text by default, `danger` for things that need you now (Inbox), `warning` for review counts. Over 99 shows "99+". Used by Button, FilterChip, TabBar and Rail; none of them draws its own.

## Copy
One or two words, sentence case, no punctuation: "Paid", "2 days", "Missing", "1 warning".

## Built from
Nothing else.

## Variants
- Five tones; count (ink, danger, warning).
