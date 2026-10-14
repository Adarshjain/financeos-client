# Select

Single-choice fields are always a dropdown, never tiles or chip groups. Multi-choice fields are a multi-select dropdown with the chosen values as chips inside the field.

## Use
- Closed: looks like a text field with a ▾ caret; the value may lead with an icon (bank logo).
- Open: a Menu with search when long, ✓ on the current value; on phone it opens as a bottom sheet.
- Multi-select shows chips inside the field and wraps to a second line before it truncates.
- Dependent fields appear only after their trigger: "Why it needs review" appears when Review status is Needs review.

## Don't
- Don't use radio tiles or segmented chips for single choice in forms (the only exception is the four account-type buttons at the top of Add account).
- Don't offer an "Other" option to escape a list; add search instead.

## Variants
- **Single select**: ✓ on the current value; picking closes the list.
- **Single with search and icons**: search first when there are more than about eight options; icons lead (bank logos).
- **Multi select**: square checkboxes, Clear and "Done · n" at the bottom; the field shows the picks as chips and "+n" when they overflow.
- **Multi with search**: typing filters; "Create "…"" appears when nothing matches and creating is allowed (categories).
- **Sectioned list**: uppercase group headers (Bank accounts · Credit cards · Wallets & cash).
- **With an action row**: a separator and a brand-coloured action at the end ("+ New shared limit…").
- **Search · create from typing**: matches first, then "+ Add "…"" (counterparties).
- **No results**: one line that repeats what was typed.
- **With descriptions**: a second line under each option; radio marks when the choice needs explaining.
- **Disabled option**: greyed with the reason as a hint.
- Closed field states: value, placeholder, icon, focused, chips, overflow, error, disabled, locked, loading.
