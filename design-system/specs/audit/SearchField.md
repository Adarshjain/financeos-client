# SearchField: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/SearchField/SearchField.stories.tsx`, `src/components/ds/SearchField/SearchField.tsx`

## Change (8)

- [x] **f011cda56** · SearchField breaks when given a callback ref
  - Now: Line 53 uses `ref || internalInputRef` as the input ref. If the app passes a function ref, `resolvedRef.current` is undefined, so the clear button cannot reset or refocus the input.
  - Do: Merge the two refs the way TextArea does (`combinedRef`, TextArea.tsx:54-64): one callback that sets the internal ref and forwards to the app ref (function or object). Use that merged ref on the `<input>` and in `handleClear`.
- [x] **f1f237ee7** · SearchField has three overlapping change callbacks
  - Now: Lines 55-69 hand-roll controlled/uncontrolled state although `useControllableState` exists. `onChange`, `onValueChange` and `onClear` all exist, and clearing fires `onValueChange('')` and `onClear` together.
  - Do: Use `useControllableState` for `value`/`defaultValue`/`onValueChange`. Make `onValueChange` the one change callback (drop the custom `onChange` override from the props type). Keep `onClear` as the event for 'user pressed clear'.
  ```tsx
  const [value, setValue] = useControllableState({ value, defaultValue: '', onChange: onValueChange });
  ```
- [x] **f10221295** · SearchField fires onValueChange twice on clear
  - Now: `handleClear` calls `onValueChange('')` (line 75), then sets the DOM value and dispatches a native `input` event (lines 81-90). React sees that event as a user edit and runs `handleChange`, so `onValueChange('')` runs a second time.
  - Do: Remove the synthetic event. Update state through `useControllableState`, call `onClear`, and focus the input through the merged ref. One clear gives one `onValueChange('')` and one `onClear`.
- [x] **f4972b529** · SearchField has two class props, className and containerClassName
  - Now: `className` lands on the frame root (line 104) and `containerClassName` on the bordered box (line 113). That extra prop is the odd one out.
  - Do: Use one contract across all fields: `className` on the outer wrapper, and nothing for the inner box. If the app needs to style the control, add `controlClassName` to every field (SearchField, TextField, TextArea, DateField, Select) and remove `containerClassName`.
- [x] **f05d9ee04** · SearchField variant is named after screens, not look
  - Now: `variant: 'filter' | 'sheet'` (line 15) only changes height and padding (`h-control-md` vs `h-control-lg`, line 110). The names describe where it is used in FinanceOS.
  - Do: Replace with `size?: 'md' | 'lg'` (default `'md'`). The sheet use becomes `size="lg"` in the app.
  ```tsx
  <SearchField size="lg" />
  ```
- [x] **fd7858edd** · SearchField AllVariants story builds its own frame and captions
  - Now: The story wraps fields in a hand-written grid with `bg-canvas rounded-ds-lg border` (line 33) and adds caption `<span>`s (lines 35-37 and similar).
  - Do: Delete the AllVariants story with its frame and captions (autodocs replaces it). Give SearchField one args-driven story per README state; the global decorator already provides padding and background. _(per G9)_
- [x] **fbaeddbf2** · SearchField stories have a duplicate and no callback actions
  - Now: `NoResults` (lines 100-107) is just the `helper` prop with a value; `Empty` and `TypingWithAClearX` are also the same component with one arg changed. `argTypes` (lines 13-23) does not declare `onValueChange` or `onClear`.
  - Do: Keep one story per real state: Default, WithValue, Labelled (size lg), WithHelper (rename `NoResults`), Disabled. Put `args: { onValueChange: fn(), onClear: fn() }` in `meta` so every story logs actions.
  ```tsx
  args: { onValueChange: fn(), onClear: fn() }
  ```
- [x] **fe23aecc1** · SearchField stories log no actions
  - Now: The file never imports `fn` from `storybook/test` (none of the 47 stories do), so typing and clearing show nothing in the Actions panel.
  - Do: Add `import { fn } from 'storybook/test'` and `args: { onValueChange: fn(), onClear: fn() }` in `meta`.
  ```tsx
  args: { onValueChange: fn(), onClear: fn() }
  ```

## Owner's own call (2)

- [x] **f3835e667** · SearchField AllVariants hard-codes its fields
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f5b43f53f** · SearchField has no interaction demo
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **fbd5916e8** · SearchField default copy is generic, clear label is fixed: Generic control wording that any app would use; fine as a default.
- **f0e2b9708** · SearchField has a fixed search icon and no side slots: No page needs this flexibility yet; add it when one does.
- **f8e862f4e** · SearchField stories use FinanceOS sample text: Leave as is (owner approved Keep).

## README

Update `design-system/components/SearchField/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
