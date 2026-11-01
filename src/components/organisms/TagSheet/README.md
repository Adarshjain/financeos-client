# TagSheet

The sheet that puts tags on a transaction (owner-approved, 2026-11-01). One Dinero Dialog: a bottom sheet on phone, a dialog on desktop. Used from the detail panel's Tags row, the Add/Edit form, and the selection bar's "Add tag".

## Anatomy
- Header "Tags" with what the tags are for under it ("Swiggy · ₹486.00", or "3 transactions").
- A search line: "Find or create a tag".
- Rows: a checkbox, the tag name, how many transactions carry it. A tap ticks or unticks.
- Typing a name no tag has adds a row `Create "goa"`; a tap calls `onCreate` (the caller creates the tag and ticks it).
- Footer: Manage (left), Done (right).
- Manage (inside the sheet): "Manage tags", every tag with a ⋮ menu: Rename (opens TagNameDialog) and Delete (confirm: "Deleting a tag removes it from its transactions. Nothing else changes."). Done returns to the list.

## Behaviour
- Ticking only reports (`onValueChange`); saving is the caller's. Done closes.
- Reopening starts at the plain list with an empty search.

## Props
- `open`, `onOpenChange`: the Dialog's.
- `tags: { id, name, transactionCount? }[]`, `value: string[]`, `onValueChange?`.
- `title?`, `subtitle?`.
- `onCreate?`, `creating?`: create-by-typing; none offered without `onCreate`.
- `onRename?(tag, name)`, `onDelete?(tag)`, `managing?`: Manage shows when either is given.
- `initialQuery?`, `initialManaging?`: stories.

## Built from
Dialog (and ConfirmDialog), TextField, ListRow, Checkbox, Icon, Text, TagNameDialog.

## Variants
Tick and create · Manage (the stories).
