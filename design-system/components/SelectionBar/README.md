# SelectionBar

The bar that appears while items are selected: the count, a one-line summary, and the actions that apply to the selection.

## Use
- Phone: docked full width to the bottom edge like a sheet (`bulk dock`, `rounded-t-ds-2xl`, `border-t`, `shadow-up-1`); the page places it with `fixed inset-x-0 bottom-0 desk:bottom-safe-12`. It covers the tab bar: TabBar hides itself while any SelectionBar is mounted (the bar carries `data-selection-bar`; TabBar reads it with the `with-selection-bar:` variant, CSS only, no coupling in code). Top row: × to finish, "2 selected" with a summary, "Select all N". Below: up to four icon actions with a small hint each.
- Desktop: a floating pill centred above the list with outlined actions and × at the end (Esc also clears).
- Actions that do nothing for some of the selection still run for the rest and say so: "Approve 9" approves only the ones that need it.
- Same component everywhere: transactions (Link · Merge · Approve · Delete) and rules (Approve).

## Selection model (phone)
Long-press a row to start, tap to add or remove, the eye icon opens the item's detail without leaving selection, × or back to finish. No checkboxes on phone. Desktop uses checkboxes.

## Props
- `actions`: `{ id, icon, label, hint?, count?, tone?, disabled?, onSelect }[]` from the page. `count` renders as a solid count bubble after the label on desktop (hidden on phone, still in the aria-label). `hint` shows under the label on phone ("the pair", "clear Duplicate") and, on desktop, inline after the label only for a disabled action, as its reason ("needs exactly 2"); stories show hints exactly as the preview does.

## Built from
Button, Icon.

## Variants
- Four actions (transactions), a single action (rules), and an action that does not apply to the current selection (greyed, with the reason in the subtitle).
