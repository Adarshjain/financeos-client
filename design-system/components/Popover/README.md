# Popover

The one floating surface every dropdown uses: Select's list, Menu, DateField's calendar, the dashboard switcher. Built on Radix Popover / DropdownMenu, which position with Floating UI (flip, shift, collision with the viewport).

## Use
- Surface: `bg-surface`, `line` border, `radius-lg`, `shadow-pop`, `space-4` inner padding, `z-overlay`.
- Width: at least the trigger's width (`min-w-popover-trigger`), growing with its content up to `container-sm` (440) on desktop; on phone never wider than the viewport minus a `space-20` gutter each side (`container-viewport-inset`), and Radix `collisionPadding` is the same 20px so the left and right gaps are equal. Never a fixed pixel width, never narrower than its content.
- One surface: content inside a Popover is never wrapped in another card, border or shadow.
- `list` (boolean): the panel is a list of choices, so it follows the dropdown-list width rule (owner, 2026-10-26): `container-xs` (240) wide, grows to its content, capped at the viewport inset, never tied to the trigger. Filters, forms, notifications and calendars do not set it.
- Opens below and flips above near the bottom edge; 4px gap from the trigger.
- Opens with `dur-base` (fade and 4px slide); closes on Escape, outside tap, or a pick.

## Props
- `<Popover>` (shorthand):
  - `trigger?: React.ReactNode`: trigger element wrapped in `Popover.Trigger asChild`.
  - `children?: React.ReactNode`: content rendered inside `Popover.Content` (or composite elements when no `trigger` is supplied).
  - `contentClassName?: string`: custom className applied to `Popover.Content`.
  - `contentProps?: Omit<PopoverContentProps, 'align' | 'side' | 'sideOffset' | 'className'>`: additional Radix Content props forwarded to `Popover.Content`.
  - `align?: 'start' | 'center' | 'end'`: alignment relative to trigger (`default: 'start'`).
  - `side?: 'top' | 'bottom' | 'left' | 'right'`: preferred side (`default: 'bottom'`).
  - `sideOffset?: number`: distance from trigger in pixels (`default: 4`).
  - `open?: boolean`: controlled open state.
  - `defaultOpen?: boolean`: uncontrolled initial open state.
  - `onOpenChange?: (open: boolean) => void`: open change callback.
  - `modal?: boolean`: whether popover is modal.
- `Popover.Root`, `Popover.Trigger`, `Popover.Content`, `Popover.Portal`, `Popover.Close`, `Popover.Anchor`: primitives for composition when custom layout or structure is required.

## Variants
- Default (trigger width, grows with content).
- Compact trigger with auto-growing content.

## Built from
Radix Popover (Floating UI).

## Motion
Fades and slides in; fades and slides out on close (dur-fast).

- Focus return: on close, focus goes back to the trigger only if focus has not already moved to another element outside the content (so opening a Select beside a closing Menu is not dismissed). A consumer `onCloseAutoFocus` runs first and its `preventDefault` still wins.
