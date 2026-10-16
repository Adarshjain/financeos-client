# TopBar: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/TopBar/TopBar.stories.tsx`, `src/components/ds/TopBar/TopBar.tsx`

## Change (6)

- [x] **fcff0e2a3** · TopBar shows the FinanceOS Logo mark on phones when there is no back
  - Now: TopBar.tsx:87 renders `<Logo variant='mark' ... className='lg:hidden' />` whenever `back` is not set.
  - Do: Add `leading?: ReactNode`. The app passes a back button or its logo. TopBar adds `lg:hidden` around the slot if needed. Remove the Logo import.
  ```tsx
  <TopBar leading={<BrandMark />} title='Home' />
  ```
- [x] **f748cc8c8** · TopBar actions are a data array with no slots or router link
  - Now: TopBar.tsx:12,28 define `actions` as `{id, icon, label}` objects. Lines 69 and 143 use a raw `<a href>`. There is no leading or trailing slot.
  - Do: Add a `leading?: ReactNode` slot. Keep `actions` as an array of `{id, icon, label, onSelect, asChild?, children?}` using `onSelect` only (no `onClick` alias); items with `asChild` render the app's own Link so the raw `<a href>` goes away. _(per G6)_
- [x] **f74ffaac3** · TopBar `back={true}` renders a button that does nothing
  - Now: TopBar.tsx:27 types `back` as `string | (() => void) | boolean`. For `true`, line 80 sets `onClick` to undefined.
  - Do: Split the union. Use `backHref?: string` (renders a link) and `onBack?: () => void` (renders a button), or move the back button into the `leading` slot. Drop the boolean.
- [x] **fb1ccd752** · TopBar stories use no-op callbacks and actions without handlers
  - Now: TopBar.stories.tsx:55,109 pass `back={() => {}}`. The action arrays (lines 6-16) have no `onSelect`.
  - Do: Use `onBack: fn()` and give each action an `onSelect: fn()` (not `onClick`), so clicks show in the Actions panel. _(per G6)_
- [x] **f410d9545** · TopBar 'All variants' builds its own headings and frames
  - Now: TopBar.stories.tsx:35-87 hand-write caption divs and `max-w-md border` frames.
  - Do: Delete the story. Use `decorators` for a bordered frame, and `parameters.viewport` for phone vs desktop.
- [x] **f71523eb9** · TopBar phone and desktop stories are not distinct states
  - Now: TopBar.stories.tsx:91-131: the phone stories differ from the desktop ones by the `viewport` parameter and the actions array only. The form is picked by CSS.
  - Do: Keep two stories: top level and detail (`crumb` + back). Drive phone/desktop with the Storybook viewport toolbar, not separate stories. Add a story for the primary action.

## Owner's own call (2)

- [x] **f54c71296** · TopBar 'All variants' hard-codes four bars with few controls
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **fb20768d2** · TopBar has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **fc59f3713** · TopBar has a fixed height, padding and CSS-only phone/desktop forms: Leave as is (owner approved Keep).
- **f435c5de3** · TopBar actions encode 'label only on desktop' and a shortcut: Labels on desktop only is the CSS lg switch your rules require.
- **fd662ba09** · TopBar stories use FinanceOS sample text: Leave as is (owner approved Keep).

## Ignore: the claim was wrong (1)

- fce464a15 (TopBar copy: nothing to fix)

## README

Update `design-system/components/TopBar/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
