# TopBar

The bar at the top of every screen: one component, two forms chosen by CSS at the `lg` breakpoint (like Dialog). On phone it is the TopBar; on desktop it is the page bar above the content. Pages never choose.

## Forms
- **Phone** (56px, `app-bar`): the Logo mark, or a back arrow on detail screens (`back`), then crumb and title (title truncates, never wraps), then the actions as bordered `control-md` icon buttons. Phone pages never repeat the title in the body.
- **Desktop** (56px, `bg-surface`, `line` bottom border): crumb and title on the left, the actions on the right; an action with a label shows it ("Add" with its ⌘N hint).

## Props
- `title`, optional `crumb`, optional `back` (href or handler).
- `actions`: an ordered list the **app** passes in, each `{ id, icon, label, href | onSelect, variant?: 'default' | 'primary', shortcut? }`. The bar renders them; it decides nothing about which ones exist. FinanceOS passes Ask the data, Search and the + (`primary`) on phone, and Add (⌘N), Chat and Notifications on desktop.

## Rules
- The + (`primary`) opens the add form for the current screen; it is the only add button (RULES §7.1).
- Page actions (Export, Merge…) don't go here; they live in the page or a ⋮ menu.

## Built from
Logo, Button, Icon, Kbd.

## Variants
- Top level, detail (back + crumb), with a primary action, phone and desktop forms.
