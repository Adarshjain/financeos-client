# SelectionBar

The bar that appears while items are selected: the count, a one-line summary, and the actions that apply to the selection.

## Use
- Phone: docked to the bottom edge like a sheet (`bulk dock`), tab bar hidden. Top row: × to finish, "2 selected" with a summary, "Select all N". Below: up to four icon actions with a small hint each.
- Desktop: a floating pill centred above the list with outlined actions and × at the end (Esc also clears).
- Actions that do nothing for some of the selection still run for the rest and say so: "Approve 9" approves only the ones that need it.
- Same component everywhere: transactions (Link · Merge · Approve · Delete) and rules (Approve).

## Selection model (phone)
Long-press a row to start, tap to add or remove, the eye icon opens the item's detail without leaving selection, × or back to finish. No checkboxes on phone. Desktop uses checkboxes.

## Variants
- Four actions (transactions), a single action (rules), and an action that does not apply to the current selection (greyed, with the reason in the subtitle).
