# Menu

A list of **actions** that opens from a trigger: the ⋮ menu on a rule or account, the dashboard ⋯ menu, snooze presets.

## Menu vs Select
Both open the same Popover with the same item rows, so they look identical. They differ in what they mean: a Select holds a **value** (it shows the current pick, is part of a form, and has search, multi-select and create); a Menu runs a **command** and keeps no value (items can be destructive, it closes and something happens). Radix, Material, Polaris and Atlassian all keep the two apart for this reason. Here they share the Popover and the item row, so nothing is drawn twice.

## Use
- Verbs, most common first, destructive last after a separator in `danger`.
- Optional right-aligned hint in `ink-4` ("Tomorrow · Wed 14 Oct"); hidden on phone.
- On phone, menus with more than about six items open as a Dialog (bottom sheet).
- Item row (shared with Select's options): `body` weight 500, `ink`. Hover and keyboard highlight `bg-hover`; pressed `bg-pressed`. No outline or border on an item, ever: the highlight fill is the focus indicator.
- Arrow keys move, Enter runs, Escape closes.

## Don't
- Don't put a single action in a menu; show it as a button.

## Built from
Popover (Radix DropdownMenu), the shared item row, Icon, Dialog (phone, long menus).

## Variants
- Actions; with icons and hints (icons only when every item has one); snooze presets with "Pick a date…"; disabled item with its reason; sectioned; switcher with a footer link.
