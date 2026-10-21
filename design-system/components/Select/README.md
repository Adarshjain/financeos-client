# Select

The dropdown for choosing values. Single-choice fields are always a Select, never tiles or chip groups; multi-choice fields are a multi-select with the picks as chips inside the field.

## Use
- Closed: a field with the value (optionally led by an icon or image, such as a bank logo) and a ChevronDown (`icon-md`) at the right that turns to ChevronUp while open.
- Open: one Popover surface (never a card inside the popover), at least as wide as the trigger and wider when the options need it (up to `dialog-sm`, 440), so a list opened from a small FilterChip still shows its options in full, with search first when there are more than about eight options and a Check on the current value. Works as a dropdown at every size.
- **Custom trigger**: any element can open the list through the `trigger` slot. A FilterChip is the trigger for every dropdown filter, so filter chips get search, multi-select, and sections for free. One dropdown, never a second chip-only dropdown.
- Options use the shared item row: `body` weight 500 (not bold), the current value on `brand-tint` with a Check; section headers are `overline`.
- Multi-select chips wrap to a second line before they truncate; "+n" when they overflow.
- Dependent fields appear only after their trigger.

## Don't
- No locked state: a field that can't change is disabled.
- Don't use radio tiles or segmented chips for single choice in forms (the four account-type buttons on Add account are the only exception).
- Don't offer an "Other" option to escape a list; add search instead.

## Props
- `value`, `defaultValue`, `onValueChange`: controlled/uncontrolled value (`string | string[]`).
- `options`: array of `SelectOption` (`value`, `label`, `searchText`, `icon`, `hint`, `description`, `disabled`, `disabledReason`, `group`).
- `groups`: array of `SelectGroup` (`name`, `options`).
- `multiple`: boolean, enables multi-selection with checkboxes and badges.
- `searchable`: boolean, embeds search input.
- `searchPlaceholder`, `searchValue`, `onSearchChange`: search controls.
- `onCreate`, `createLabel`: create option from search query. The create row shows only when the typed text is not already an option (any case); Enter or a click calls `onCreate` with the trimmed text and clears the search for the next entry. The page adds the new option and selects it (identifiers on Add/Edit account, saved with the form).
- `action`: `{ label, onSelect }`, pinned action row under options: a `link` Button at `label` size, natural width, aligned right.
- Layout: the menu has `space-6` padding inside the popover edge. The option list is the only scroller (it scrolls with the wheel and by touch even inside a modal Dialog); the search row, create row, `action` row and the multi-select Clear and Done row stay pinned. Clear (link, `label` size) and Done (primary) keep their natural width, aligned right.
- `clearLabel`: custom label for multi-select clear button (default: `'Clear'`).
- `doneLabel`: `(count: number) => ReactNode`, custom label for multi-select done button (default: `'Done'`).
- `filter`: `'auto' | 'none' | ((option, query) => boolean)`.
- `emptyText`: `(query: string) => ReactNode`.
- `name`, `disabled`, `loading`, `loadingText`, `placeholder`, `label`, `helper`, `error`, `icon`, `trigger`, `showRadio`, `maxDisplayChips`, `open`, `defaultOpen`, `onOpenChange`.

## Built from
Popover, TextField, Checkbox (multi), Badge (chips in the field), Icon, Button (Clear, Done), FieldFrame.

## Variants
- **Single select**; **single with search and icons**; **multi select** (checkboxes, Clear and Done); **multi with search and create**; **sectioned list**; **with an action row**; **search · create from typing**; **no results**; **with descriptions**; **disabled option**; **custom trigger** (FilterChip).
- Closed field states: value, placeholder, icon, open, chips, overflow, error, disabled, loading.
