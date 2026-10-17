# Popover

The one floating surface every dropdown uses: Select's list, Menu, DateField's calendar, the dashboard switcher. Built on Radix Popover / DropdownMenu, which position with Floating UI (flip, shift, collision with the viewport).

## Use
- Surface: `bg-surface`, `line` border, `radius-lg`, `shadow-pop`, `space-4` inner padding, `z-overlay`.
- Width: at least the trigger's width (`min-w-popover-trigger`), growing with its content up to `dialog-sm` (440). Never a fixed pixel width, never narrower than its content.
- One surface: content inside a Popover is never wrapped in another card, border or shadow.
- Opens below and flips above near the bottom edge; 4px gap from the trigger.
- Opens with `dur-base` (fade and 4px slide); closes on Escape, outside tap, or a pick.

## Props
- `<Popover>` (shorthand):
  - `trigger?: React.ReactNode`: trigger element wrapped in `Popover.Trigger asChild`.
  - `children?: React.ReactNode`: content rendered inside `PopoverContent` (or composite elements when no `trigger` is supplied).
  - `contentClassName?: string`: custom className applied to `PopoverContent`.
  - `contentProps?: Omit<PopoverContentProps, 'align' | 'side' | 'sideOffset' | 'className'>`: additional Radix Content props forwarded to `PopoverContent`.
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
