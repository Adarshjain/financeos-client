# Popover

The one floating surface every dropdown uses: Select's list, Menu, DateField's calendar, the dashboard switcher. Built on Radix Popover / DropdownMenu, which position with Floating UI (flip, shift, collision with the viewport).

## Rules
- Surface: `bg-surface`, `line` border, `radius-lg`, `shadow-pop`, `space-4` inner padding, `z-overlay`.
- Width: `match` the trigger (Select, DateField with a full-width field) or `content` (menus, at least the trigger's width). Never a fixed pixel width.
- Opens below and flips above near the bottom edge; 4px gap from the trigger.
- Opens with `dur-base` (fade and 4px slide); closes on Escape, outside tap, or a pick.
- On phone, long lists don't float: the consumer opens a Dialog (bottom sheet) instead.

## Built from
Radix Popover (Floating UI).

## Variants
- Match trigger width, content width.
