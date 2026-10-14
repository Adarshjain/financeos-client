# Menu

A floating list of actions or options: the ⋮ menu on a rule or account, the dashboard ⋯ menu, and the open state of every dropdown.

## Use
- Action menus: verbs, most common first, destructive last after a separator in `danger`.
- Option lists (an open Select): the current value carries `brand-tint` and a ✓; a search field sits on top when there are more than about eight options.
- Optional right-aligned hint in `ink-4` ("built-in or report"); hide hints on phone.
- On phone, long option lists open as a bottom sheet instead of a floating menu.
- Snooze menus list presets with their date as the hint (Tomorrow · Wed 14 Oct, In 3 days, Next week) and end with "Pick a date…".

## Don't
- Don't put a single action in a menu; show it as a button.

## Variants
- **Actions**: verbs, destructive last after a separator.
- **With icons and hints**: icons only when every item has one.
- **Snooze presets**: each preset shows its date as the hint; "Pick a date…" last.
- **Disabled item**: greyed with the reason.
- **Sectioned**: group headers when the menu mixes two kinds of action.
- **Switcher with a footer link**: current item marked; the footer action leaves the menu for a full page.
