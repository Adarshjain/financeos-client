# SettingsToggle: new organism

Read `00-global.md` (G1, G4) first.

**Layer:** organism in `src/components/organisms/SettingsToggle/` (`SettingsToggle.tsx`, `.stories.tsx`, `.test.tsx`, `README.md`).

It is the settings row that Switch used to draw itself: a label, an optional description, an optional error line and a Switch on the right. Settings pages (Gmail import, notifications, "Exclude from net worth") use it.

## Build it from Dinero only
- **ListRow:** `title` = label; `subtitle` = description; `borderTop` passes through; no chevron; not clickable as a row.
- **Switch (bare):** in ListRow's `trailing` slot. `checked`, `defaultChecked`, `onCheckedChange` and `disabled` pass through.
- **Text:** for the error, `<Text variant="caption" tone="danger">` under the row content.

## Props
`label: ReactNode`, `description?: ReactNode`, `error?: ReactNode`, `checked?`, `defaultChecked?`, `onCheckedChange?`, `disabled?`, `borderTop?`, plus a ref and native props on the root.

## Must look like
The current Switch "toggle row" stories (the row padding, label weight and description colour of today's `Switch` with `label`). Compare side by side before deleting the old row code.

## Stories (G9)
`Organisms/SettingsToggle`: `Default`, `WithDescription`, `On`, `Disabled`, `WithError`. All are args-driven, with `onCheckedChange: fn()`. Sample copy: "Exclude from net worth" / "Hide this account from totals".

## Tests
- Toggling calls `onCheckedChange`.
- Clicking the label toggles it.
- `disabled` blocks the toggle.
- The error line renders.
