# Skeleton: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Skeleton/Skeleton.stories.tsx`, `src/components/ds/Skeleton/Skeleton.tsx`

## Change (6)

- [ ] **f12077a0b** · Skeleton height has no control and circle is hard-coded
  - Now: `argTypes` (lines 13-16) lists only `width` and `circle`. `Rows` writes `<Skeleton circle ...>` directly.
  - Do: Add `height: { control: 'text' }`. Use `args` for `circle` in a dedicated `Circle` story.
- [ ] **f5b9762d3** · Skeleton story builds its own frame and fake card title
  - Now: Line 28 is a styled grid; lines 30-66 use `<div className="font-extrabold text-label text-ink-3 mb-space-8">Rows</div>`; line 157 uses a fake heading `Upcoming`.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [ ] **f436e2272** · Skeleton story hand-builds a table grid
  - Now: Lines 79 and 173 use `grid grid-cols-[60px_1fr_70px] gap-space-12` wrappers to imitate table rows.
  - Do: Drop the table mock. A Skeleton story should show one bar and a few shapes. Table placeholders belong to the app table.
- [ ] **f10b11822** · Skeleton story sizes shapes with classes, not props
  - Now: Lines 35, 42, 57, 120, 128 and 145 use `<Skeleton circle className="w-space-32" />` and `className="mt-space-10 h-space-24"`, although `width` and `height` props exist.
  - Do: Use the props: `<Skeleton circle width={32} />`, `<Skeleton height={24} />`. Margins go on a wrapper in the decorator.
- [ ] **f2e66774b** · Skeleton story restyles the component with className
  - Now: Lines 57 and 145: `className="mt-space-10 h-space-24"` sets height and margin by class.
  - Do: Use `height={24}` and put spacing on the wrapper.
- [ ] **ffc66e5d4** · Skeleton stories use relative imports
  - Now: Lines 4-5 import `../Card/Card` and `./Skeleton`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (3)

- [ ] **f4fe3ed54** · Skeleton AllVariants story hard-codes props
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f9141abb1** · Skeleton stories mimic app screens
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fd91eaaf6** · Skeleton Table story spreads one width over nine bars
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (3)

- **fc11a8198** · Skeleton has a built-in 12px height: Leave as is (owner approved Keep).
- **f64456aaf** · Skeleton sets width and height as inline styles: Leave as is (owner approved Keep).
- **fb8f5168e** · Skeleton has no prop to stop the pulse: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/Skeleton/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
