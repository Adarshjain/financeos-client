# Card: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Card/Card.stories.tsx`, `src/components/ds/Card/Card.tsx`

## Change (11)

- [ ] **f0942f3f8** · Card forces w-full and overflow-hidden
  - Now: Line 194 sets `w-full` and `overflow-hidden`. `cn` uses tailwind-merge, so `className="w-auto overflow-visible"` does override them.
  - Do: Keep `overflow-hidden` (it clips rounded corners). Drop `w-full`: a block `div` already fills its parent.
- [ ] **f43e851e6** · CardHeader repeats CardTitle styles and cannot wrap or set a tag
  - Now: `CardHeader` (lines 28-38) writes its own title and subtitle classes, nearly the same as `CardTitle` and `CardSubtitle` (54-93). Both are fixed to `truncate` and a `div`.
  - Do: Build the header from `CardTitle` and `CardSubtitle`, which in turn use `Text variant="heading"` and `Text variant="label" tone="ink-3"`. Add `truncate?: boolean` (default `true`) and `as?: ElementType` on them.
  ```tsx
  <CardTitle as="h2" truncate={false}>Needs you</CardTitle>
  ```
- [ ] **fb57ccd81** · Card cannot render as a link or button
  - Now: `Card` (lines 186-206) always renders a `div`; there is no `as` or `asChild`, so a clickable card needs a wrapper.
  - Do: Add `asChild?: boolean` using Radix `Slot`, like `Button` does.
  ```tsx
  <Card asChild><a href="/accounts/1">…</a></Card>
  ```
- [ ] **fd8d34d41** · Card story builds its own grid and captions
  - Now: Line 30 is a styled grid wrapper; lines 32, 52, 63, 79, 98 and 114 are `<span className="font-text text-caption ...">` captions.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [ ] **f8b7d6691** · Card stories hand-build a link in the action slot
  - Now: Lines 39-46 and 132-139 pass `<a href="#inbox" className="font-text font-bold text-label text-brand hover:underline">` with an inline icon as the card action.
  - Do: Card keeps a node slot for its header action, because that slot usually holds a link ("View all"), not a button Card draws. The one-object rule covers buttons a component draws itself. Use `action={<Button variant="link" asChild><Link href="…">View all</Link></Button>}` in the story.
- [ ] **f762a9b5c** · Card stories fake rows with raw styled spans
  - Now: Lines 68-85, 160-165 and 179-180 use `<span className="flex-1 truncate">` and `<span className="font-bold font-text text-ink">` inside `CardRow`.
  - Do: Use `Text` for both spans: `<Text truncate className="flex-1">Item</Text><Text variant="body-strong">₹100</Text>`, or compose rows from `ListRow`.
- [ ] **f819f40b5** · Card WithRows story builds fake rows in args.children
  - Now: Lines 153-170 put JSX rows in `args.children`. That shape is normal for a slot component; the raw `span`s inside are the problem.
  - Do: Keep `args.children`, but build the rows from `Text` and `ListRow`. No `render` needed.
- [ ] **fcc320549** · Card pager story does nothing and uses fixed numbers
  - Now: Lines 92 and 187 pass `onPageChange={() => {}}` with `page={0} totalPages={2}`, so clicking Next changes nothing.
  - Do: Use `args: { onPageChange: fn() }` and drive `page` with `useArgs()` in a small render. Add no `play` function (G9). _(per G9)_
- [ ] **f8bf3fcd0** · Card pager callbacks are empty functions, not fn()
  - Now: Same lines 92 and 187: `onPageChange={() => {}}` is not a Storybook action.
  - Do: Add the callback to `args` as `fn()` from `storybook/test` so the Actions panel logs it.
- [ ] **f08b9df26** · Card stories enable autodocs, others do not
  - Now: Only `Card.stories.tsx` has `tags: ['autodocs']` (line 16). The other seven stories in this slice have no `tags`, and `.storybook/` sets none globally.
  - Do: Remove Card's own `tags: ['autodocs']`: autodocs is now on once in `.storybook/preview.tsx` (G9). _(per G9)_
- [ ] **fd1c7643b** · Card stories use relative imports
  - Now: Lines 4-8 import `../Button/Button`, `../Pager/Pager` and `./Card`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (3)

- [ ] **f34536ca7** · Card paddings are fixed and inconsistent (14 vs 16)
  - Do: Owner: Lets use px-space-16 even in footer, else content wouldnt align
  - Generic version the owner refers to: Use one horizontal padding (`px-space-16`) for header, row, footer and empty. If density is needed, add `size?: 'sm' | 'md'` on `Card` that changes it.
- [ ] **f6ccce928** · Card AllVariants story hard-codes every card
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **ffca4095c** · Card stories show app data and a kitchen sink
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (3)

- **f25c6732f** · Card includes list-card parts (row, section, empty, footer): Card.Row, Card.Section, Card.Empty and Card.Footer are generic compound parts (RULES §5b.3 allows them).
- **feac722b0** · CardSection depends on SectionHeader and bakes first:border-t-0: CardSection using SectionHeader is correct composition (RULES §5b.2).
- **f7a629458** · CardRow always draws a top divider: Leave as is (owner approved Keep).

## README

Update `design-system/components/Card/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
