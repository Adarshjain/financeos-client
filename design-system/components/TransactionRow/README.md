# TransactionRow

The phone transaction row: merchant and amount on top, a context line and category below. Status is told with coloured words, not tags.

## Anatomy
- Line 1: description (`heading`) · amount (700, tabular, credits `positive` with +). Running balance sits under the amount in `caption`.
- Line 2, the context line, in this order: **account name first**, plastic (••7741), then amber review words, a note, blue link/record words, then grey provenance.
- Right of line 2: the first category chip, plus a "+n" chip if there are more. A dashed amber "Set category" chip when none is set.

## Word colours
- Amber (`warning`, 700): needs you. Review reasons (Unreconciled, Category unverified, Duplicate, Date corrected) and Watching.
- Blue (`info`, 600): connected to something. Links show a small chain glyph (⛓ Transfer out, Refund); records show none (EMI #8 · HDFC car loan, Lending · Priya Nair, Dividend · INFY).
- Grey (`ink-3`): provenance. Gmail, Statement, Manual, Excluded.
- Green: credit amounts only.

## States
Selected (`brand-tint` with a 3px `brand` stripe), monitored (`watch-tint` with a 3px `watch` stripe), excluded (60% opacity), selection mode (trailing eye icon opens the detail).

## Don't
- No tags or pills for status on the row. No date on the row on phone: the sticky date header carries it.
