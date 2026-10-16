# SegmentedControl: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/SegmentedControl/SegmentedControl.stories.tsx`, `src/components/ds/SegmentedControl/SegmentedControl.tsx`

## Change (5)

- [x] **ffc4a21d6** · SegmentedControl loses its generic value type
  - Now: `forwardRef<HTMLDivElement, SegmentedControlProps>` (lines 25-28) uses the default `string`, so apps get `string` in `onValueChange` even though the file exports `SegmentedControlProps<T>`.
  - Do: Cast the result to a generic function type so `T` flows through.
  ```tsx
  export const SegmentedControl = forwardRef(Impl) as <T extends string = string>(p: SegmentedControlProps<T> & { ref?: React.Ref<HTMLDivElement> }) => React.ReactElement;
  ```
- [x] **fdf1c013c** · SegmentedControl finds the next button by DOM id
  - Now: Arrow keys call `document.getElementById(...)` (line 79) to move focus.
  - Do: Keep an `itemRefs = useRef<(HTMLButtonElement | null)[]>([])` and call `itemRefs.current[nextIndex]?.focus()`. No ids needed.
  ```tsx
  ref={(el) => { itemRefs.current[idx] = el; }}
  ```
- [x] **fa87bcfd0** · SegmentedControl always has a selected option
  - Now: With no `defaultValue` it picks the first option (lines 49-52), so it can never start empty.
  - Do: Leave `defaultValue` undefined by default (nothing selected). Make the first option tabbable when none is selected. An app that wants the first option passes `defaultValue`.
- [x] **f72c282de** · SegmentedControl stories: four near-duplicates and missing states
  - Now: `TwoOptions`, `ThreeOptions`, `ViewSwitch`, `InAForm` differ only by option words. There is no story for `disabled`, `fullWidth`, `icon` or a disabled option. `argTypes` lists only `value` and `defaultValue` (lines 16-19).
  - Do: Keep `TwoOptions` and `ThreeOptions`; delete the other two. Add `Disabled`, `FullWidth`, `WithIcons` (icons via `<Icon name>`) and `DisabledOption`.
- [x] **f48c23601** · SegmentedControl story onValueChange is not logged
  - Now: The render sends `onValueChange` only to `updateArgs` (line 26).
  - Do: Add `args: { onValueChange: fn() }` and call `args.onValueChange?.(val)` in the handler.
  ```tsx
  onValueChange={(v) => { args.onValueChange?.(v); updateArgs({ value: v }); }}
  ```

## Owner's own call (2)

- [x] **f50984561** · SegmentedControl AllVariants hard-codes options and values
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **fc2b286ba** · SegmentedControl has no interaction demo
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **fef17273f** · SegmentedControl falls back to the label 'Options': Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f07317ae6** · SegmentedControl options cannot carry extra props: No page needs this flexibility yet; add it when one does.
- **f03527455** · SegmentedControl stories use FinanceOS sample text: Leave as is (owner approved Keep).
- **gsegname1** · Rename SegmentedControl to ButtonGroup?: Your question (thread 55ef2dfb). Recommended: keep SegmentedControl; see the green box.

## Superseded by a global rule: nothing to do beyond that rule (2)

- **fed300ea4** · SegmentedControl AllVariants has its own frame and captions: The AllVariants story is deleted (G9), so its frame and captions go with it.
- **fb0748cca** · SegmentedControl AllVariants keeps its own state: The AllVariants story is deleted (G9), so its useState and defaultValue handling go with it.

## README

Update `design-system/components/SegmentedControl/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
