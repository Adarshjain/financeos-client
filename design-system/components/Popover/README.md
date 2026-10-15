# Popover

The one floating surface every dropdown uses: Select's list, Menu, DateField's calendar, the dashboard switcher. Built on Radix Popover / DropdownMenu, which position with Floating UI (flip, shift, collision with the viewport).

## Rules
- Surface: `bg-surface`, `line` border, `radius-lg`, `shadow-pop`, `space-4` inner padding, `z-overlay`.
- Width: at least the trigger's width (`min-w-popover-trigger`), growing with its content up to `dialog-sm` (440). Never a fixed pixel width, never narrower than its content.
- One surface: content inside a Popover is never wrapped in another card, border or shadow.
- Opens below and flips above near the bottom edge; 4px gap from the trigger.
- Opens with `dur-base` (fade and 4px slide); closes on Escape, outside tap, or a pick.
- On phone, long lists don't float: the consumer opens a Dialog (bottom sheet) instead.

## Built from
Radix Popover (Floating UI).

## Variants
- Default (trigger width, grows with content).
