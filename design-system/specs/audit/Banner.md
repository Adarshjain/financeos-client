# Banner: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Banner/Banner.stories.tsx`, `src/components/ds/Banner/Banner.tsx`

## Change (8)

- [x] **f20bac6cf** · Banner string action is a button that does nothing
  - Now: When `action` is a string, `Banner.tsx:40-41` renders `<Button variant="link">` with no handler or link.
  - Do: One action shape everywhere (your choice on the Select action row): `action={{ label, onSelect }}`. Banner takes only that object and draws it as a link-style Button on the right (your Banner call). No string-only action, no separate callback prop. Example: `<Banner action={{ label: 'Retry', onSelect: refetch }}>Failed to load.</Banner>`
- [x] **fdbc7306d** · Banner wraps body text in a span
  - Now: `Banner.tsx:59` renders `children` inside `<span>`, so a `<p>` or list child becomes invalid HTML.
  - Do: Render the body in a `<div>` and keep `title` as an inline span with the body following it. Test with a paragraph child.
- [x] **fadb0790d** · Banner exports its tone style table
  - Now: `bannerToneStyles` is exported (`Banner.tsx:23`) and `index.ts` re-exports `Banner.tsx`, so it is public. `Toast.tsx:6` imports it.
  - Do: Move the table to an internal `toneStyles.ts` that is not in `index.ts`. Banner and Toast both import from there.
- [x] **f84853c58** · Banner has no dismiss control
  - Now: There is no `onDismiss` and no close button. The no-icon rule is deliberate (README `Banner/README.md:21`, RULES section 6).
  - Do: Add only `onDismiss?: () => void`. When set, render at the far right an icon `Button` with `<Icon name="close">`; add no `dismissLabel` prop (use the default 'Close' as the screen-reader fallback). _(per G7)_
- [x] **f38a4ce32** · Banner Warning story hides children with an empty string
  - Now: `Warning` sets `children: ''` to cancel the meta default (`Banner.stories.tsx:105`), and passes a JSX `action` that has no control.
  - Do: One action shape everywhere (your choice on the Select action row): `action={{ label, onSelect }}`. Story args: `action: { label: 'Retry', onSelect: fn() }`. The Warning story stops hiding children with an empty string.
- [x] **f4181528a** · Banner story repeats hand-made headings
  - Now: `AllVariants` has five copies of `<div className="font-extrabold text-label ...">` and a `max-w-md` wrapper (`Banner.stories.tsx:40-79`).
  - Do: Drop them with `AllVariants`. For width use a `decorators` entry once.
- [x] **f39871148** · Banner story buttons have no handlers
  - Now: `<Button variant="link">Reconcile</Button>` and `Try again` do nothing when clicked (`Banner.stories.tsx:62,107,133`).
  - Do: One action shape everywhere (your choice on the Select action row): `action={{ label, onSelect }}`. Story args: `action: { label: 'Retry', onSelect: fn() }`, so every press shows in the Actions panel.
- [x] **f45f1e25d** · Banner story uses relative imports
  - Now: `Banner.stories.tsx:4-5` import `../Button/Button` and `./Banner`. Passing a Button as the action node is fine.
  - Do: Use `import { Banner, Button } from '@/components/ds';`.
  ```tsx
  import { Banner, Button } from '@/components/ds';
  ```

## Owner's own call (2)

- [x] **fea3e0ae5** · Banner action always sits inline after the text
  - Do: The action always sits on the right of the text, centred vertically. No placement prop and no variant.
- [x] **f1d4050a7** · Banner AllVariants has no args
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f1c82e3bb** · Banner padding and radius are fixed: Leave as is (owner approved Keep).
- **f7786c738** · Banner stories repeat AllVariants and use app copy: Leave as is (owner approved Keep).

## README

Update `design-system/components/Banner/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
