# Checkbox: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Checkbox/Checkbox.stories.tsx`, `src/components/ds/Checkbox/Checkbox.tsx`

## Change (8)

- [ ] **fca6b0309** · Checkbox has two ways to say mixed
  - Now: A separate `indeterminate` boolean overrides `checked` (`Checkbox.tsx:36-38`), while Radix uses `checked="indeterminate"`. With `indeterminate` on, a click cannot clear it.
  - Do: Remove `indeterminate`. `checked` takes `boolean | 'indeterminate'`, as Radix and RULES section 5c.5 expect.
  ```tsx
  <Checkbox checked="indeterminate" onCheckedChange={setValue} />
  ```
- [ ] **f1a95584f** · Checkbox rebuilds controlled state Radix already has
  - Now: `useControllableState` feeds Radix a `checked` on every render (`Checkbox.tsx:30-45`), so Radix is always controlled. Radix already handles `checked` and `defaultChecked`.
  - Do: Pass `checked`, `defaultChecked` and `onCheckedChange` straight to Radix. Style the filled look with `data-[state=checked]:` and `data-[state=indeterminate]:` classes instead of an `isActive` flag.
  ```tsx
  'data-[state=checked]:bg-brand data-[state=indeterminate]:bg-brand'
  ```
- [ ] **f3bb852dc** · Checkbox draws an X for the mixed state
  - Now: `Checkbox.tsx:58-60` shows `<Icon name="close">` for indeterminate, but README (`Checkbox/README.md:7`) says mixed shows a dash. The registry has no dash icon.
  - Do: Add `minus: Minus` (Phosphor) to the icon registry and use `<Icon name="minus" size="sm" />`.
- [ ] **f8016f601** · Checkbox story wraps boxes in hand-made divs
  - Now: `p-space-16 bg-canvas min-h-full flex ...` and `flex gap-space-16` wrappers (`Checkbox.stories.tsx:43-44`).
  - Do: Remove with `AllVariants`; use `parameters.layout: 'centered'`.
- [ ] **fbd854d75** · Checkbox story uses useState instead of useArgs
  - Now: `InteractiveRow` keeps three `useState` values (`Checkbox.stories.tsx:38-41`), while the meta render already uses `useArgs`.
  - Do: Delete it. The meta `render` with `useArgs` already makes each story interactive.
- [ ] **f3426dc87** · Checkbox meta render has no starting value
  - Now: The meta render passes `checked={checked}` with no default (`Checkbox.stories.tsx:21-30`), so `Disabled` starts uncontrolled.
  - Do: Set `args: { checked: false }` at the meta level so every story starts controlled.
  ```tsx
  args: { checked: false },
  ```
- [ ] **f11ce89b6** · Checkbox story does not log onCheckedChange
  - Now: `onCheckedChange={(val) => updateArgs({ checked: val })}` (`Checkbox.stories.tsx:27`) overrides any action, so nothing appears in the Actions panel.
  - Do: Put `onCheckedChange: fn()` in meta args and call `args.onCheckedChange?.(val)` inside the render before `updateArgs`.
  ```tsx
  args: { onCheckedChange: fn() },
  onCheckedChange={(v) => { args.onCheckedChange?.(v); updateArgs({ checked: v }); }}
  ```
- [ ] **fea6f0e72** · Checkbox story uses a relative import
  - Now: `Checkbox.stories.tsx:5` imports `./Checkbox`.
  - Do: Import from `@/components/ds`.
  ```tsx
  import { Checkbox } from '@/components/ds';
  ```

## Owner's own call (3)

- [ ] **fa6a17efb** · Checkbox AllVariants hard-codes props and state
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f57c587ec** · Checkbox Off, On, Mixed, Disabled repeat AllVariants
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fa4ff2e25** · Checkbox has no play function
  - Do: No play function and no interaction test (G9).

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f1e083c22** · Checkbox has no label or description: Checkbox stays bare (G4): no `label`, `description` or FieldFrame; the app composes its own label row.

## README

Update `design-system/components/Checkbox/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
