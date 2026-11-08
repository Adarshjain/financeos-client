# TopBar

The bar at the top of every screen: one component, two forms chosen by CSS at the `desk` breakpoint (like Dialog). On phone it is the TopBar; on desktop it is the page bar above the content. Pages never choose.

## Forms
- **Phone** (56px, `app-bar`): the leading slot (e.g. Logo mark) or a back arrow on detail screens (`backHref` or `onBack`; the back arrow also shows on desktop, before the crumb and title, while a custom `leading` slot is phone only), then crumb and title (title truncates, never wraps), then the actions as bordered `control-md` icon buttons. Phone pages never repeat the title in the body.
- **Desktop** (56px, frosted glass, `line` bottom border): crumb and title on the left, the actions on the right; an action with a label shows it ("Add" with its ⌘N hint).

## Props
- `title`: `ReactNode`. A string is the screen title (title type, truncates). Any other node (a dashboard Select trigger, a ⋯ Menu button) may be controls: it is not a heading, is not clipped (focus rings stay), is vertically centred with `space-8` gaps and each child may shrink (`min-w-0`) so it fits the phone bar.
- `crumb`: optional `ReactNode`
- `leading`: optional `ReactNode` (phone leading slot, e.g. logo or custom button)
- `backHref`: optional `string` (renders a link back button at every width). With `onBack` too, a plain left click calls `onBack` (the app sends it to browser back when the user came from inside the app); middle/modified clicks and SSR keep the href.
- `onBack`: optional `() => void` (renders a back button at every width)
- `actions`: an ordered list the **app** passes in, each `{ id, icon, label, onSelect?, href?, asChild?, children?, variant?: 'default' | 'primary', loading?, shortcut?, showLabel?, labelIconSize?, phoneOnly?, dot?, popover?, menu? }`. `href` on a plain action (not menu, popover or asChild) renders a link through LinkProvider with the same look; `onSelect` still runs on click. `phoneOnly` shows the action in the phone layout only (CSS `desk:hidden`; for a button whose desktop twin lives elsewhere, e.g. Search beside the Rail's Search field). `dot` draws a danger dot on the button (something unread). `loading` (plain actions only) shows the Button's loading state and ignores presses, e.g. while the action's dialog code loads. `popover: { content, onOpenChange?, onWarm? }` makes the button open a Popover dropdown (align `end`) holding `content`; it is never `asChild`. `onWarm` runs on pointer-enter or focus of the button, so the app can load the content's data before it opens. `menu: { id, label, onSelect?, asChild?, children? }[]` makes the button open a Menu (align `end`) of those rows: an `asChild` row renders `children` (the app's link element) with the label inside, otherwise `onSelect` runs; mutually exclusive with `popover` and `asChild`. `labelIconSize` sizes the icon beside the label (desktop form); the icon-only phone form keeps `md`. The app passes `xs` beside text. The bar renders them; it decides nothing about which ones exist.  Which actions exist is app data.

- **Glass** (both forms, default, no prop): `bg-surface` is the fallback; where `backdrop-filter` is supported `glass:bg-glass glass:backdrop-blur-glass glass:backdrop-saturate-glass` make it translucent so content scrolling under the sticky bar shows through blurred.

## Rules
- The + (`primary`) opens the add form for the current screen; it is the only add button (RULES §7.1).
- Page actions (Export, Merge…) don't go here; they live in the page or a ⋮ menu.

## Built from
Button, Icon, Kbd, Menu, Popover.

## Variants
- Top level, detail (back + crumb), with a primary action, phone and desktop forms.
- Loading action: a plain action with `loading` shows the Button's loading state (the primary + while its dialog code loads).

- A node title's wrapper grows to fill the space between the back/leading area and the actions at every width (`flex-1 min-w-0`), so a child marked `flex-1` (the dashboard switcher Select) fills it; a string title stays content-width on desktop.
