# Menu

A list of **actions** that opens from a trigger: the ⋮ menu on a rule or account, the dashboard ⋯ menu, snooze presets.

## Menu vs Select
Both open the same Popover with the same item rows, so they look identical. They differ in what they mean: a Select holds a **value** (it shows the current pick, is part of a form, and has search, multi-select and create); a Menu runs a **command** and keeps no value (items can be destructive, it closes and something happens). Radix, Material, Polaris and Atlassian all keep the two apart for this reason. Here they share the Popover and the item row, so nothing is drawn twice.

## Use
- Verbs, most common first, destructive last after a separator in `danger`.
- Optional right-aligned hint in `ink-4` ("Tomorrow · Wed 14 Oct").
- Menus look and work like a normal dropdown at every viewport size (never open as a sheet).
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
- Subcomponents: `Menu.Item`, `Menu.Separator`, `Menu.Group`, `Menu.Label`, `Menu.Trigger`, `Menu.Content`.

## Variants
- Standard action items (Edit, Duplicate, Delete).
- Items with icons and hints.
- Grouped with `Menu.Group` and `Menu.Separator`.
- Labelled trigger or icon-only trigger.

## Built from
Radix DropdownMenu, the shared item row (`itemRow`), Icon.

## Motion
Fades and slides in; fades and slides out on close (dur-fast).
