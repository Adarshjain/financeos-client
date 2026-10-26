# Menu

A list of **actions** that opens from a trigger: the ⋮ menu on a rule or account, the dashboard ⋯ menu, snooze presets.

## Menu vs Select
Both open the same Popover with the same item rows, so they look identical. They differ in what they mean: a Select holds a **value** (it shows the current pick, is part of a form, and has search, multi-select and create); a Menu runs a **command** and keeps no value (items can be destructive, it closes and something happens). Radix, Material, Polaris and Atlassian all keep the two apart for this reason. Here they share the Popover and the item row, so nothing is drawn twice.

## Use
- Verbs, most common first, destructive last after a separator in `danger`.
- Optional right-aligned hint in `ink-4` ("Tomorrow · Wed 14 Oct").
- Menus look and work like a normal dropdown at every viewport size (never open as a sheet).
- Width (owner, 2026-10-26): the menu, like every dropdown list, is `container-xs` (240) wide, grows to its content and is capped at the viewport inset (`container-viewport-inset`); it never follows the trigger width.
- Touch opens on tap release, so a swipe that starts on the trigger scrolls.
- Item row (shared with Select's options): `body` weight 500, `ink`. Hover and keyboard highlight `bg-hover`; pressed `bg-pressed`. No outline or border on an item, ever: the highlight fill is the focus indicator.
- Arrow keys move, Enter runs, Escape closes.

## Don't
- Don't put a single action in a menu; show it as a button.

## Props
- `<Menu>`:
  - `trigger?: React.ReactNode`: trigger element wrapped in `Menu.Trigger asChild`.
  - `children?: React.ReactNode`: items and groups inside `MenuContent`.
  - `align?: 'start' | 'center' | 'end'`: alignment relative to trigger (`default: 'start'`).
  - `side?: 'top' | 'bottom' | 'left' | 'right'`: preferred side (`default: 'bottom'`).
  - `sideOffset?: number`: distance from trigger in pixels (`default: 4`).
  - `contentClassName?: string`: class applied to `MenuContent`.
  - `contentProps?: Omit<MenuContentProps, 'align' | 'side' | 'sideOffset' | 'className'>`: props forwarded to Radix Content.
  - `open?: boolean`: controlled open state.
  - `defaultOpen?: boolean`: uncontrolled initial open state.
  - `onOpenChange?: (open: boolean) => void`: open change callback.
- `<Menu.Item asChild>`: renders its single child (e.g. the app's link) as the row, with no icon or hint wrapper.
- `<ContextMenu>` (right-click on desktop, wraps any row; or open it at a point you give, on phone and desktop):
  - `items: { id: string; label: string; onSelect: () => void; tone?: 'default' | 'danger'; disabled?: boolean }[]`: the actions, in order; none = the browser's own menu stays.
  - `children?: React.ReactNode`: the row a right-click opens the menu from. Leave it out when you drive the menu with `open` and `point`.
  - `open?: boolean`, `point?: { x: number; y: number } | null` (viewport coordinates), `onOpenChange?: (open: boolean) => void`: controlled. The menu opens at `point` in either layout. Press a DataTable row with `onRowSelect={(row, point) => setMenu({ row, point })}` and render `<ContextMenu open={!!menu} point={menu?.point} onOpenChange={(o) => !o && setMenu(null)} items={…} />`; the row fires only the page's `onRowSelect`.
- Subcomponents: `Menu.Item`, `Menu.Separator`, `Menu.Group`, `Menu.Label`, `Menu.Trigger`, `Menu.Content`.

## Variants
- Standard action items (Edit, Duplicate, Delete).
- Items with icons and hints.
- Grouped with `Menu.Group` and `Menu.Separator`.
- Labelled trigger or icon-only trigger.
- `ContextMenu` at a press point: controlled with `open` and `point`, phone and desktop, items may be disabled.
- `ContextMenu`: wraps a row; right-click opens the same Menu at the pointer with the actions the page gives (the phone swipe's actions). Desktop layout only (decided in the handler); in the phone layout it does nothing. The native menu is blocked only when ours opens. Behaviour wraps the row, never embedded in it.

## Built from
Radix DropdownMenu, the shared item row (`itemRow`), Icon. `ContextMenu`: Menu anchored to a zero-size point at the pointer.

## Motion
Fades and slides in; fades and slides out on close (dur-fast).

- Focus return: on close, focus goes back to the trigger only if focus has not already moved to another element outside the content (so opening a Select beside a closing Menu is not dismissed). A consumer `onCloseAutoFocus` runs first and its `preventDefault` still wins.
