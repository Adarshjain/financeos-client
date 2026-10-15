# Select

The dropdown for choosing values. Single-choice fields are always a Select, never tiles or chip groups; multi-choice fields are a multi-select with the picks as chips inside the field.

## Use
- Closed: a field with the value (optionally led by an icon or image, such as a bank logo) and a ChevronDown (`icon-md`) at the right that turns to ChevronUp while open.
- Open: a Popover exactly as wide as the trigger, with search first when there are more than about eight options and a Check on the current value. On phone the list opens in a Dialog (bottom sheet) instead.
- **Custom trigger**: any element can open the list through the `trigger` slot. A FilterChip is the trigger for every dropdown filter, so filter chips get search, multi-select, sections and the phone sheet for free. One dropdown, never a second chip-only dropdown.
- Multi-select chips wrap to a second line before they truncate; "+n" when they overflow.
- Dependent fields appear only after their trigger.

## Don't
- No locked state: a field that can't change is disabled.
- Don't use radio tiles or segmented chips for single choice in forms (the four account-type buttons on Add account are the only exception).
- Don't offer an "Other" option to escape a list; add search instead.

## Built from
Popover, Dialog (phone), SearchField, Checkbox (multi), CategoryChip (chips in the field), Icon, Button (Clear, Done).

## Variants
- **Single select**; **single with search and icons** (icons may be images); **multi select** (checkboxes, Clear and "Done · n"); **multi with search** and "Create "…""; **sectioned list**; **with an action row** ("+ New shared limit…"); **search · create from typing**; **no results**; **with descriptions**; **disabled option**; **custom trigger** (FilterChip).
- Closed field states: value, placeholder, icon, open, chips, overflow, error, disabled, loading.
