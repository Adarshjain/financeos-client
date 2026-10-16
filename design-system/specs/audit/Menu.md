# Menu: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Menu/Menu.stories.tsx`, `src/components/ds/Menu/Menu.tsx`

## Change (12)

- [ ] **fae28fb83** · Menu defaults its sheet title to 'Menu'
  - Now: `title={title || 'Menu'}` (Menu.tsx:338) writes the phone sheet title.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. Menu has no sheet, so the 'Menu' sheet title goes.
- [ ] **fb033e23d** · Menu counts children to choose popover or sheet
  - Now: Menu walks `children` for `MenuItem` (Menu.tsx:313-331) and uses `forcePopover={!forcePhone && itemCount <= 6}`. Items inside a custom wrapper component are not counted. The README says 'more than about six items open as a Dialog'.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. Menu is always a Radix DropdownMenu, so the child count and the 'more than 6 items becomes a sheet' rule go.
- [ ] **f10542018** · Menu bakes in threshold and spacing
  - Now: The 6-item threshold, `dialogBodyClassName="p-space-8 flex flex-col gap-space-2"`, `z-overlay` and `p-space-6` are fixed in Menu.tsx:344-347 and :56.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. The 6-item threshold goes with the sheet; the spacing tokens stay.
- [ ] **f853dec40** · Menu drops ref, className and Radix props
  - Now: `Menu` destructures a fixed list and ignores the rest (Menu.tsx:292-306); `ref` and `className` do not exist, and it is a `React.FC`. `MenuContent` does spread Radix props.
  - Do: Add `contentProps?: Omit<MenuContentProps, 'align'|'side'|'sideOffset'|'className'>` and forward it; keep `contentClassName` for styling.
  ```tsx
  <Menu contentProps={{ onCloseAutoFocus: e => e.preventDefault() }} />
  ```
- [ ] **fc8e40fe5** · Menu exports duplicate aliases
  - Now: Menu.tsx exports `DropdownMenu*` and `Menu*` names for the same parts (lines 19-33, 69, 182, 214, 242, 262), about 18 aliases including `DropdownMenuGroupWrapper`.
  - Do: Keep one name per part: the `Menu*` set (and `Menu.Item` style). Remove the `DropdownMenu*` aliases after moving the app's imports (grep shows they are only used inside the ds folder and its tests).
- [ ] **ffc287d45** · Menu's item close falls back oddly; hint is not hidden on phone
  - Now: `const effectiveClose = close || overlayClose` (Menu.tsx:103-106). `close` from `MenuContext` always exists (default `() => {}`), so `overlayClose` never runs outside `MenuBody`. `hint` renders in both modes (:131-140) although the README says it is hidden on phone.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. The close fallback belonged to the sheet path and goes with it. Hints show at every size.
- [ ] **f0b12eccc** · Menu sheet item: consumer onClick override
  - Now: In the sheet branch `onClick`, `onSelect`, `className` and `disabled` are already pulled out before `...props` (Menu.tsx:84-95), so a consumer `onClick` cannot override the close handler. It is called first, then the item closes the sheet.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. The sheet item code path is deleted, so its onClick override goes with it.
- [ ] **f98a94793** · Menu stories use layout wrappers and spacing hacks
  - Now: Raw `div` grids, captions and `pt-space-48` spacers to make room for open popovers (Menu.stories.tsx:137-142, 157, 174-228).
  - Do: Delete `AllVariants`; in each story use a decorator `(S) => <div className="min-h-72"><S /></div>` once at meta level for room.
  ```tsx
  decorators: [(S) => <div className="min-h-72"><S /></div>]
  ```
- [ ] **f12c7791a** · Menu story styles a hint by hand
  - Now: `hint={<span className="inline-flex items-center gap-space-2 text-brand-strong">Default <Icon …/></span>}` (Menu.stories.tsx:121).
  - Do: Pass plain text for `hint` ('Default'). If a check mark is wanted, add an `active` item (already a MenuItem prop), not a hand-styled span.
  ```tsx
  <MenuItem hint="Default">Primary account</MenuItem>
  ```
- [ ] **ff227e64a** · Menu stories pass open from args while defaultOpen is also set
  - Now: The meta render wires `open={open}` from `useArgs` while `args.defaultOpen: true` is set (Menu.stories.tsx:36-47). `open` is undefined first, so the menu is uncontrolled until the first change.
  - Do: Use one source: set `args: { open: true }` and drop `defaultOpen` from args. `useArgs` then keeps it controlled.
  ```tsx
  args: { open: true }
  ```
- [ ] **f11391561** · Menu stories use relative imports
  - Now: Imports `../Button/Button`, `../Icon/Icon`, `./Menu` (Menu.stories.tsx:5-12).
  - Do: Import from `@/components/ds`.
  ```tsx
  import { Menu, MenuItem, Button } from '@/components/ds';
  ```
- [ ] **f800044f1** · Menu AllVariants duplicates stories and uses app content
  - Now: `AllVariants` (Menu.stories.tsx:135-247) repeats all six single stories. Samples are FinanceOS ('Delete rule', 'Add widget', 'Snooze presets', 'Wed 14 Oct', 'Cards & loans'). Every story uses an icon-only trigger, so no labelled trigger or phone sheet is shown.
  - Do: Delete `AllVariants`. Use generic items ('Edit', 'Duplicate', 'Delete') and add a `LabelledTrigger` story. Add no `PhoneSheet` story and no `forcePhone` (Menu is a Radix DropdownMenu at every width). _(per G5,G9)_

## Owner's own call (2)

- [ ] **f810a7e29** · Menu stories lack controls for most props
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f1de2f394** · Menu stories have no play function
  - Do: No play function and no interaction test (G9).

## README

Update `design-system/components/Menu/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
