# Tabs: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Tabs/Tabs.stories.tsx`, `src/components/ds/Tabs/Tabs.tsx`

## Change (10)

- [ ] **fdeeaf8da** · Tabs re-implements keyboard navigation Radix already has
  - Now: `TabsList.handleKeyDown` (lines 90-122) queries `button[role="tab"]`, handles arrows, Home and End, then calls `.focus()` and `.click()`. Radix `Tabs.List` already does roving focus and these keys.
  - Do: Delete `handleKeyDown` and pass `onKeyDown` straight through. If activation-on-focus is wanted, use Radix `activationMode` on `Tabs`.
- [ ] **f330b5a47** · Tabs mirrors Radix state in its own context
  - Now: `TabsContext` (lines 21, 53-55) copies the value. `TabsTrigger` computes `isActive` from it (149) and also calls `onValueChange` in `onClick` (156-161), while Radix already calls it on selection.
  - Do: Remove the context and the `onClick` handler. Style with Radix's `data-[state=active]:` classes. `Tabs` keeps `useControllableState` once, at the root.
  ```tsx
  'data-[state=active]:text-brand-strong data-[state=active]:border-brand'
  ```
- [ ] **fa42ddcc6** · TabsContent has fixed vertical padding
  - Now: Line 189: `'outline-none py-space-12'`. `className` can override it, but the default is a layout choice.
  - Do: Remove `py-space-12` so content has no opinion, or keep it and document it in `parameters.docs.description`. Leaning remove.
- [ ] **f7ace4fd2** · Tabs selects the first item when no defaultValue is given
  - Now: Lines 44-45 pick `items[0].value` if `defaultValue` is undefined. Passing `defaultValue=""` turns it off, because `??` only catches null/undefined.
  - Do: Keep the default (it is reasonable for `items` mode) and document `defaultValue=""` for none, in `argTypes.defaultValue.description`.
- [ ] **ffda76d95** · Tabs story builds a styled frame and captions
  - Now: Line 40 is a styled wrapper div; captions at 42, 58 and 73 are raw `<span className="font-text text-caption ...">`; line 76 adds `max-w-xs`.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [ ] **f044f8e59** · Tabs stories wrap content in hand-made frames
  - Now: Lines 131 and 156 wrap `render` output in `<div className="max-w-xs bg-canvas p-space-8 ...">` and a similar `max-w-md` div.
  - Do: Use `decorators`/`parameters.layout` for width and drop the phone story entirely (no story may differ only by viewport, G9). Do not use `parameters.viewport` or `globals.viewport` to add one. _(per G9)_
- [ ] **ff78184a4** · Tabs story panels are raw styled paragraphs
  - Now: Lines 169-186 use four `<p className="font-text text-body text-ink-2">` as tab panels.
  - Do: Use `<Text variant="body" tone="ink-2">`.
- [ ] **f401f6572** · Tabs AllVariants holds state with useState
  - Now: Lines 35-39 use three `useState` hooks, where the meta already uses `useArgs`.
  - Do: Removed with `AllVariants`. All remaining stories keep the single `useArgs` in the meta `render`.
- [ ] **fcb796028** · Tabs onValueChange is not logged as an action
  - Now: Line 23 uses `onValueChange={(val) => updateArgs({ value: val })}` only. The Actions panel sees nothing.
  - Do: Add `onValueChange: fn()` to `args` and call `args.onValueChange?.(val)` before `updateArgs`.
  ```tsx
  args: { onValueChange: fn() }
  ```
- [ ] **fe51662e9** · Tabs stories use a relative import
  - Now: Line 5: `import ... from './Tabs'`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (2)

- [ ] **f358c7064** · Tabs AllVariants story hard-codes items and state
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f25c995fa** · Tabs stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **fcf9921e5** · Tabs count renders a fixed " · 3" suffix: A count on a tab is a common generic feature (Polaris Tabs). The " · 3" look is from the boards.
- **f2ccd808b** · Tabs list always has a bottom border and hidden scrollbar: Leave as is (owner approved Keep).
- **f6d301364** · TabItem has no icon or className: No page needs this flexibility yet; add it when one does.
- **fe7737d78** · Tabs Plain and WithCounts repeat AllVariants, with app copy: Leave as is (owner approved Keep).

## README

Update `design-system/components/Tabs/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
