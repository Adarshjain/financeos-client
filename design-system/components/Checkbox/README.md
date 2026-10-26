# Checkbox

A square tick box for multi-choice on desktop: the selection column of desktop tables, multi-select options, and confirm lists ("Select all 12 matches").

## Use
- 16px box, `radius-xs`, 2px `line-strong` border; on = `brand` fill with a white Check (`icon-sm`).
- Mixed (some rows selected) shows a dash.
- Checking never moves anything: the box keeps its size, border and position in every state; only the fill and mark change.
- Hover `bg-hover` (off) or `brand-hover` (on); pressed one step further.
- Phone selection never shows checkboxes (RULES §7.4); rows tint instead.

## Props
- `checked?: boolean | 'indeterminate'`
- `defaultChecked?: boolean | 'indeterminate'`
- `onCheckedChange?: (checked: boolean | 'indeterminate') => void`
- `disabled?: boolean`
- Plus native button attributes and ref forwarded to Radix Checkbox Root.

## Built from
Radix Checkbox, Icon.

## Variants
- Off, on, mixed, disabled.
