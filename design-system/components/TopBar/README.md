# TopBar

The bar at the top of every screen: one component, two forms chosen by CSS at the `desk` breakpoint (like Dialog). On phone it is the TopBar; on desktop it is the page bar above the content. Pages never choose.

## Forms
- **Phone** (56px, `app-bar`): the leading slot (e.g. Logo mark) or a back arrow on detail screens (`backHref` or `onBack`; the back arrow also shows on desktop, before the crumb and title, while a custom `leading` slot is phone only), then crumb and title (title truncates, never wraps), then the actions as bordered `control-md` icon buttons. Phone pages never repeat the title in the body.
- **Desktop** (56px, `bg-surface`, `line` bottom border): crumb and title on the left, the actions on the right; an action with a label shows it ("Add" with its ⌘N hint).

## Props
- `title`: `ReactNode`
- `crumb`: optional `ReactNode`
- `leading`: optional `ReactNode` (phone leading slot, e.g. logo or custom button)
- `backHref`: optional `string` (renders a link back button at every width)
- `onBack`: optional `() => void` (renders a back button at every width)
- `actions`: an ordered list the **app** passes in, each `{ id, icon, label, onSelect, asChild?, children?, variant?: 'default' | 'primary', shortcut?, showLabel? }`. The bar renders them; it decides nothing about which ones exist. FinanceOS passes Ask the data, Search and the + (`primary`) on phone, and Add (⌘N), Chat and Notifications on desktop.

## Rules
- The + (`primary`) opens the add form for the current screen; it is the only add button (RULES §7.1).
- Page actions (Export, Merge…) don't go here; they live in the page or a ⋮ menu.

## Built from
Button, Icon, Kbd.

## Variants
- Top level, detail (back + crumb), with a primary action, phone and desktop forms.
