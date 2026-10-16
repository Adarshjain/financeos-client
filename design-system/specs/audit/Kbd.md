# Kbd: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Kbd/Kbd.stories.tsx`, `src/components/ds/Kbd/Kbd.tsx`

## Change (3)

- [ ] **fa361a0ec** · Kbd 'All variants' hand-builds headings and a hint line
  - Now: Kbd.stories.tsx:27-59 use `<h3 className='text-overline ...'>` headings and a bordered hint div with 'move, select'.
  - Do: Delete the story. Show the hint-line case as a story with `render` only if the app really needs it; otherwise use `children` args.
- [ ] **f1a91eb4a** · Kbd 'In sentence' wraps the key in a hand-made div
  - Now: Kbd.stories.tsx:77-87 render `<div className='font-text text-caption ...'>Press <Kbd/> to cancel</div>`.
  - Do: Delete the story, or use a decorator with the caption text. The Kbd alone is the state.
- [ ] **f9d85e336** · Kbd SingleKey and CompoundKey differ only by children
  - Now: Kbd.stories.tsx:63-75 set `children` to 'J' or '⌘K', which the control already does.
  - Do: Keep one `Default` story (children 'J').

## Owner's own call (1)

- [ ] **f95da483d** · Kbd 'All variants' hard-codes many Kbds
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Ignore: the claim was wrong (1)

- f73e4c2c9 (Kbd copy: nothing to fix)

## README

Update `design-system/components/Kbd/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
