# FilterChip: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Stays separate, aligned with Badge (G3).

**Files:** `src/components/ds/FilterChip/FilterChip.stories.tsx`, `src/components/ds/FilterChip/FilterChip.tsx`

## Change (13)

- [x] **fc7f91850** · FilterChipRow is a plain horizontal scroll row
  - Now: `FilterChipRow` (lines 127-142) is `flex gap-space-8 overflow-x-auto scrollbar-none`. Nothing in it is about filters; only the name is.
  - Do: Covered by G3: FilterChipRow is deleted; pages lay out chip rows with layout classes, and no generic scroll-row component is added. _(per G3)_
- [x] **f72ad4cb2** · FilterChip variants "amber" and "more" are colour and role names
  - Now: `FilterChipVariant = 'default' | 'amber' | 'more'` (line 9). `amber` is a colour; `more` is the "+ More" dashed entry for the filter dialog.
  - Do: Applies your FilterChip decision (kept separate, aligned with Badge): same look names as Badge, chosen by state: outline when off, soft when on, `variant="dashed"` for "+ More". `tone` is neutral, `warning` (replaces `variant="amber"`) or `brand` (the default on colour).
- [x] **fa625dc28** · FilterChip sends className and props to different elements
  - Now: When removable (lines 64-97), `className` goes on the outer `span` and `{...props}` and `ref` on the inner button. When not removable, both go on the button.
  - Do: Put `className` and `ref` on the outermost element and other props on the main button, and document it in the README. Add no `RemovableWithClassName` story (a story that differs by one prop violates G9). _(per G9)_
- [x] **f2139159c** · FilterChip active state is not controllable
  - Now: `active` (line 13) is a plain prop with no default and no change event. The story wraps it with `useArgs` to make it toggle.
  - Do: Applies your FilterChip decision (kept separate, aligned with Badge): `selected`, `defaultSelected` and `onSelectedChange`, through `useControllableState`, instead of `active`.
- [x] **f4232bedd** · FilterChip story builds grids and repeated captions
  - Now: Lines 53-132 use a styled grid and eight copies of `<span className="font-text text-overline ...">Toggle off</span>`; line 134 has another caption.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [x] **fbf681e47** · FilterChip row story is wrapped in a styled frame
  - Now: Line 256 wraps the demo in `<div className="max-w-2xl bg-canvas p-space-16 rounded-ds-lg border border-line">`.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [x] **f2d8fb72e** · FilterChip FilterRowDemo is a stateful app filter row
  - Now: Lines 250-298 use `useState` three times, map `['All','Unverified','Verified']` and show/hide a chip. That is transaction-filter logic, not a chip state.
  - Do: Covered by G3,G9: FilterChipRow is deleted and stories use no play functions, so delete `FilterRowDemo` and add no FilterChipRow story; chip rows are page layout. _(per G3,G9)_
- [x] **f760bd07e** · FilterChip FilterRow story is an app screen
  - Now: Lines 300-302 export `FilterRow`, which renders the demo above (status chips, review chip, "Up to statement").
  - Do: Remove with the demo. Move to the app layer's story for the transactions filter.
- [x] **fb4b90761** · FilterChip dropdown story hard-codes an accounts Select
  - Now: Lines 229-248 build a `Select` with HDFC Regalia Gold, Amex Platinum and SBI SimplyClick in `render`. It repeats the block at lines 138-153.
  - Do: Keep one story with neutral options (`Option A`, `Option B`) and `args` for `defaultValue`. Delete the copy in `AllVariants`.
- [x] **fd34d00d5** · FilterChip callbacks are not logged as actions
  - Now: Meta `render` (lines 34-41) calls `args.onClick?.(e)` and `args.onRemove?.(e)`, but nothing declares `fn()`, so they are undefined. Line 263 uses a bare callback.
  - Do: Add callbacks to `args` as `fn()` from `storybook/test`: `args: { onSelectedChange: fn(), onRemove: fn() }` (FilterChip selection is `selected`/`onSelectedChange`; no `onClick`). _(per G3,G9)_
- [x] **f972f8d13** · FilterChip stories use relative imports
  - Now: Lines 5-6: `../Select/Select` and `./FilterChip`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.
- [x] **f000632e0** · FilterChip Off, Dropdown and Toggle stories overlap
  - Now: `Off` (hasDropdown, inactive) and `Dropdown` (hasDropdown, inactive) are the same state. `Toggle` is the same as `Off` without the dropdown.
  - Do: Keep one `Default` story (not selected, no dropdown) and `WithDropdown`; delete `Off`, `Toggle` and `Dropdown`. Add stories only for G3 states (`Selected`, `Warning` tone, `Dashed` more, `WithCount`, `Removable`), each args-driven. _(per G3)_
- [x] **gfcbadge1** · FilterChip vs the merged Badge: reuse or keep separate?
  - Now: FilterChip shares the pill shape and the outline / dashed / tinted looks with the merged Badge, but differs in four ways. It is a control (28px chip token, 12px label text) where Badge is a 20px label. It has an on/off state (`active`) that changes its look. It holds up to three things inside: a count Badge, a dropdown chevron and a remove ×, and the × is a second click target. And it is the trigger of a Select. Badge has none of these.
  - Do: Recommended: keep FilterChip as the interactive control and align it with Badge instead of merging. Same shape and look names (outline when off, soft when on, dashed for "+ More"), same tone names (neutral; warning instead of the `amber` variant; brand for on), `selected` and `onSelectedChange` instead of `active` (RULES §5c.6), and the count drawn with Badge. Merging the other way would give Badge a 28px size, a selected state and a second click target, props that only make sense when it is a filter.

## Owner's own call (2)

- [x] **fd85569ae** · FilterChip AllVariants story hard-codes props
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f271280ac** · FilterChip stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **f4c99f5d5** · FilterChip hard-codes aria-label "Remove filter": Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f20be87c9** · FilterChip shows remove button whenever onRemove is passed: No page needs this flexibility yet; add it when one does.
- **fc65897b3** · FilterChip count accepts only numbers: Part of your FilterChip decision (2026-10-17): the count is drawn with the merged Badge and formatted by formatCount, so count stays a number.
- **f7b732099** · FilterChip stories use app copy: Leave as is (owner approved Keep).

## README

Update `design-system/components/FilterChip/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
