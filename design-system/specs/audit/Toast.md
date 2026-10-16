# Toast: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Toast/Toast.stories.tsx`, `src/components/ds/Toast/Toast.tsx`

## Change (7)

- [x] **f8d36806b** · Toast doc says FinanceOS; undoLabel default is fine
  - Now: `undoLabel = 'Undo'` is a generic control word (Toast.tsx:32). The `showToast` comment says 'Show a FinanceOS toast notification' (:115). It is wording only.
  - Do: Toast has no `undoLabel` or `onUndo` (G6): update the README and docs examples to `showToast('Snoozed', { action: { label: 'Undo', onSelect: undo } })`, with no mention of an undoLabel default. _(per G6)_
- [x] **f04b43468** · Toast has both onUndo and a generic action slot
  - Now: `tone` reuses Banner's tones, which is fine. But `onUndo`/`undoLabel` sit next to `action` (Toast.tsx:17-21, 55-65), so there are two ways to add one action.
  - Do: One action shape everywhere (your choice on the Select action row): `action={{ label, onSelect }}`. Toast drops `onUndo` and the node slot: `showToast('Snoozed', { action: { label: 'Undo', onSelect: undo } })`.
- [x] **fc4b8ea55** · showToast takes a short options list
  - Now: `ShowToastOptions` has `tone`, `onUndo`, `undoLabel`, `action`, `duration` only (Toast.tsx:107-113). No `id`, `onDismiss`, `className`. `Toaster` does spread `...props`.
  - Do: Add `id?: string` and `onDismiss?: () => void` to `ShowToastOptions`; do not add `toasterId` (the fixed Toaster id 'ds' stays). Do not add `className`. The options also include `action?: { label: ReactNode; onSelect: () => void }` per G6. _(per G6)_
- [x] **fc4bd2c4d** · Toast stories hand-build wrappers, captions and description text
  - Now: Raw wrappers and eight repeated caption divs (Toast.stories.tsx:41-57), `max-w-sm` wrappers on each story (:104-156), and in-canvas explanation text with `<code>` (:166-170).
  - Do: Use a decorator `max-w-sm` once in meta. Move explanation to `parameters.docs.description.story`. Remove captions.
  ```tsx
  parameters: { docs: { description: { story: 'Mount <Toaster /> once, then call showToast.' } } }
  ```
- [x] **f63ff75af** · Toast interactive stories repeat button handlers
  - Now: `WithToaster` and `InteractiveTrigger` call `showToast` with hard-coded options and five near-identical buttons (Toast.stories.tsx:162-252). The finding itself says acceptable.
  - Do: Keep one interactive story with args (`message`, `tone`, `duration`) feeding one Button. Delete the five copies.
- [x] **fd46aa098** · Toast stories use empty undo handlers and alert()
  - Now: `onUndo={() => {}}` and `onUndo={() => alert('Undone')}` appear throughout (Toast.stories.tsx:49, 60, 105, 118, 177, 203, 213).
  - Do: Replace the empty and alert() handlers with `action: { label: 'Undo', onSelect: fn() }` in meta args (the agreed action shape).
- [x] **f93889c59** · Toast stories use relative imports
  - Now: `../Button/Button` and `./Toast` (Toast.stories.tsx:4-5).
  - Do: Import `{ Toast, Toaster, showToast, Button }` from `@/components/ds`.
  ```tsx
  import { Toast, Toaster, showToast } from '@/components/ds';
  ```

## Owner's own call (3)

- [x] **ffb29f4df** · Toast tone stories are copies of one story
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f23e3d8db** · Toast stories duplicate each other and mount Toaster twice
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f2728686e** · Toast interactive stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **f96dd05e7** · showToast is tied to a Toaster with id 'ds': Root mounts exactly one Toaster, so a fixed id is fine.
- **f07898ea4** · Toaster bakes in position, count and TabBar offset: Leave as is (owner approved Keep).
- **fad89af30** · Toast fixes shadow, padding and the neutral colours: Leave as is (owner approved Keep).

## README

Update `design-system/components/Toast/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
