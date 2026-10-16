# EmptyState: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/EmptyState/EmptyState.stories.tsx`, `src/components/ds/EmptyState/EmptyState.tsx`

## Change (13)

- [x] **f8f01aa78** · EmptyState supplies "You're offline" itself
  - Now: Line 40: `title ?? (isOffline ? "You're offline" : null)`. App copy lives in the component.
  - Do: Remove the fallback; the app passes `title`.
- [x] **f1c43783e** · EmptyState offline copy names FinanceOS
  - Now: Line 44 sets the description to "FinanceOS needs a connection to show your money. We'll pick up where you left off.".
  - Do: Remove it. The app passes `description`.
- [x] **fb055d934** · EmptyState has an offline variant that supplies art and copy
  - Now: `variant: 'offline'` (lines 9, 37-45) injects the illustration, title and description. A generic library has no offline state.
  - Do: Remove `variant`. The app builds an `OfflineState` from `<EmptyState illustration={<Illustration variant="offline" />} title="…" description="…" />`.
  ```tsx
  <EmptyState illustration={<OfflineArt />} title={t.offline} description={t.offlineBody} />
  ```
- [x] **f5fc13916** · EmptyState imports the Illustration component
  - Now: Lines 4 and 39: `import { Illustration }` and `<Illustration variant="offline" />`. `Illustration` draws the app's sleeping ₹ coin.
  - Do: Remove the import. `illustration` stays a `ReactNode` slot.
- [x] **f0fb5a5f6** · EmptyState fixes padding and blocks text selection
  - Now: Line 66: `px-space-20 py-space-40 ... select-none`. Users cannot copy text, for example an error reference.
  - Do: Drop `select-none`. Add `size?: 'sm' | 'md'` (default `md`) for padding, or keep one padding and let `className` change it.
- [x] **f95e0ee09** · EmptyState styles title and description by hand
  - Now: Lines 75 and 80 use `font-display font-bold text-screen-title` and `font-sans text-body`. The rest of Dinero uses `font-text` and the `Text` component.
  - Do: Use `<Text variant="screen-title" family="display" as="h3">` and `<Text variant="body" tone="ink-3" as="p">`.
- [x] **fdaedb789** · EmptyState compact mode silently drops title, art and action
  - Now: Lines 47-60: if `compact`, or if there is no title, art or action, it renders only `children ?? description`. A passed `title` or `action` is lost with `compact`.
  - Do: In compact mode render title (as `Text variant="label"`) and action inline, or log a docs note. Move `children` to one fixed place in both modes.
- [x] **f0924ff20** · EmptyState stories ignore args and have no argTypes
  - Now: Every story (lines 23-99) uses `render: () => (...)` with props inline, so no control works. `variant`, `compact`, `illustration` and `action` have no `argTypes`.
  - Do: Drop the renders. Set `args: { title, description, action }`. Add `argTypes` for `compact` (boolean) and `illustration` (none).
- [x] **f7c05b76c** · EmptyState meta args are ignored by all stories
  - Now: Meta `args` (lines 14-17) set `title` and `description`, but every story overrides with its own `render`.
  - Do: Remove `render` from the stories so the meta `args` take effect, and override per story with `args`.
- [x] **fb278279d** · EmptyState story builds its own headings and grid
  - Now: Lines 104-178 use `<div className="font-extrabold text-label text-ink-3 mb-space-8">First run</div>` headings and a styled grid.
  - Do: Move the frame into a decorator: `decorators: [(Story) => <div className="p-space-16 bg-canvas"><Story /></div>]`, or set `parameters.layout`. Use `Text` for any caption.
- [x] **f86d29fe0** · EmptyState stories wrap every state in a restyled Card
  - Now: Twelve places use `<Card className="max-w-md p-0 overflow-hidden">` just to frame the state.
  - Do: Use one `decorators` entry that frames the story in a `Card`.
  ```tsx
  decorators: [(Story) => <Card className="max-w-md"><Story /></Card>]
  ```
- [x] **ff04fd896** · EmptyState story Buttons have no actions
  - Now: `<Button variant="primary">Add account</Button>` and similar (lines 30, 43, 58-59 and others) have no `onClick`.
  - Do: Applies your one-action-shape decision: EmptyState's `action` becomes `{ label, onSelect }` and EmptyState draws the button itself. Stories pass `action: { label: 'Add account', onSelect: fn() }`.
- [x] **f5ec161bd** · EmptyState stories use relative imports
  - Now: Lines 4-6: `../Button/Button`, `../Card/Card`, `./EmptyState`.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.

## Owner's own call (1)

- [x] **f0896d99c** · EmptyState stories show app screens and copy
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f34b267a6** · EmptyState description width is fixed: Leave as is (owner approved Keep).
- **f113237a1** · EmptyState title and description tags are fixed: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/EmptyState/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
