# Switch: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Bare control (G4). The row moves to the new organism SettingsToggle.

**Files:** `src/components/ds/Switch/Switch.stories.tsx`, `src/components/ds/Switch/Switch.tsx`

## Change (11)

- [ ] **fc6f3ab90** · Switch has a borderTop prop for settings lists
  - Now: `borderTop` (lines 16, 29, 95) adds a divider above the toggle row. That is list layout, not a Switch concern.
  - Do: `borderTop` leaves Switch. `SettingsToggle` gets it through ListRow's `borderTop`.
- [ ] **f19aceda5** · Switch renders a whole settings row when given a label
  - Now: Lines 87-130: with `label`, `description` or `error` it builds a flex row with padding, label, description and error. That is the settings toggle row.
  - Do: Switch is the bare control only: `checked`, `defaultChecked`, `onCheckedChange`, `disabled`. The settings row becomes the `SettingsToggle` organism: ListRow for title and description, the bare Switch as its trailing control, Text for the error line.
- [ ] **f4d91031a** · Switch row padding and layout are fixed
  - Now: Lines 94-95 and 99: `flex items-center justify-between gap-space-12 py-space-10` and `pr-space-8`.
  - Do: The row padding and layout move to the `SettingsToggle` organism; the bare Switch has none.
- [ ] **f8c12ea05** · Switch className goes to different elements by props
  - Now: Line 74 gives `className` to the button only if there is no label or description; otherwise line 96 gives it to the wrapper. `{...props}` always goes to the button.
  - Do: With the row removed, `className` always goes to the button. One rule.
- [ ] **f03e9fd1f** · Switch is hand-built and does not post in forms
  - Now: Lines 53-84 render a `button role="switch"` themselves. There is no `name` or `value`, and no hidden input, so a plain `<form>` does not submit it. The `checked`/`onCheckedChange`/`defaultChecked` API itself is correct.
  - Do: Keep the API. Add `name` and `value` and render a hidden `<input type="checkbox" hidden>` when `name` is set. Or wrap `@radix-ui/react-switch` (not in package.json today).
  ```tsx
  <Switch name="notify" value="on" defaultChecked />
  ```
- [ ] **fcc23d932** · Switch consumer onClick replaces the toggle
  - Now: Line 66 sets `onClick={handleClick}` before `{...props}` (line 76). A consumer `onClick` in `props` wins and the switch stops toggling. This is a real bug.
  - Do: Take `onClick` out of props and call both: `onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) handleClick(); }}`. Add a unit test; add no `WithOnClick` story. _(per G9)_
- [ ] **f5347bb8b** · Switch story builds a grid, captions and boxes
  - Now: Line 43 is a styled grid; captions at 45, 54, 63, 72, 81 and 95 are `<span className="font-text text-caption ...">`; lines 84 and 98 use `bg-surface p-space-12 ...` boxes.
  - Do: Remove the grid, captions and boxes; use `parameters.layout: 'centered'` and the one theme decorator, with args-driven stories for `checked`, `disabled` only (no label/description/error stories). _(per G9)_
- [ ] **fcdeb064b** · Switch AllVariants uses four useState hooks
  - Now: Lines 37-41 hold four `useState` values, although the meta `render` already uses `useArgs`.
  - Do: Removed with `AllVariants`; the meta `render` with `useArgs` drives every story.
- [ ] **f32de1025** · Switch onCheckedChange is not logged as an action
  - Now: Line 25 uses `onCheckedChange={(val) => updateArgs({ checked: val })}` only; the Actions panel sees nothing.
  - Do: Add `onCheckedChange: fn()` to `args` and call `args.onCheckedChange?.(val)` before `updateArgs`.
  ```tsx
  args: { onCheckedChange: fn() }
  ```
- [ ] **f86c9d544** · Switch stories repeat AllVariants and use app copy
  - Now: `Off`, `On`, `DisabledOff` and `DisabledOn` repeat in `AllVariants`. `ToggleRowStory` (140) and `ToggleRowOn` (161) have the same render and differ only by args. Copy is `Exclude from net worth` and `Bill overdue`.
  - Do: Switch stories using `label`/`description`/row copy are removed with those props (G4); keep only bare-control stories (`Off`, `On`, `Disabled`). _(per G4)_
- [ ] **fd519d87d** · Switch stories use a relative import
  - Now: Line 5: `import { Switch } from './Switch'`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (2)

- [ ] **f2698e07d** · Switch AllVariants story hard-codes Switches and state
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fa46811eb** · Switch stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (1)

- **f13e8cb55** · Switch falls back to aria-label "Toggle": Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.

## Superseded by a global rule: nothing to do beyond that rule (2)

- **f27cda56a** · Switch error and borderTop have no controls or story: Switch has no `error` or `borderTop` (G4); the error line and its story belong to the `SettingsToggle` organism, which draws it with Text `variant="caption" tone="danger"`.
- **f0bb6c778** · Switch row stories wrap the control in a styled div: The Switch row stories go away with the row (G4); a row story lives under `Organisms/SettingsToggle`.

## README

Update `design-system/components/Switch/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
