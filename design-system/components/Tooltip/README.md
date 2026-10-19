# Tooltip

A short label for a control, shown on hover or keyboard focus. Desktop only: it never shows in the phone layout (owner, 2026-10-19; overrides "no tooltips" in RULES §1.2 for this component only). Built on Radix Tooltip.

## Use
- Surface: `brand` (ink) background, `on-brand` text, `caption` type, `radius-sm`, `space-8` by `space-4` padding, no shadow, no arrow, `z-overlay`.
- Content is a short plain string. Never rich content, never the only place an action or fact is shown.
- Hidden below `desk` with CSS (`max-desk:hidden`), never with viewport JavaScript.
- Opens after `delayDuration` (default 300ms) on hover or focus, with a `dur-fast` fade; closes on Escape, blur or pointer leave. 4px gap from the trigger.
- Each Tooltip wraps its own Radix Provider, so no app-root provider is needed.

## Props
- `content: string`: the label.
- `children: React.ReactElement`: the trigger, wrapped in `Trigger asChild`. The ref goes to it.
- `side?: 'top' | 'bottom' | 'left' | 'right'` (default `top`).
- `align?: 'start' | 'center' | 'end'` (default `center`).
- `delayDuration?: number` (default 300).
- `open?` / `defaultOpen?` / `onOpenChange?`: controlled or uncontrolled.
- `className?`: layout only.

## Variants
- Default (sides are a prop, not a variant).

## Built from
Radix Tooltip (Floating UI).
