# Divider: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Divider/Divider.stories.tsx`, `src/components/ds/Divider/Divider.tsx`

## Change (2)

- [ ] **fe47e7c3d** · Divider stories use hand-made wrappers
  - Now: Divider.stories.tsx:21,33,46 wrap the Divider in `p-space-16 bg-canvas ...` and `max-w-sm w-full` divs.
  - Do: Add one meta decorator with the `max-w-sm` frame. Use `parameters.layout: 'padded'`.
  ```tsx
  decorators: [(Story) => <div className='max-w-sm w-full'><Story /></div>]
  ```
- [ ] **f8af4792c** · Divider Plain and WithLabel repeat their own render wrappers
  - Now: Divider.stories.tsx:30-52 each define a `render` that only wraps `<Divider {...args} />`.
  - Do: Remove both `render` functions. Move the wrapper into the meta decorator. Each story is then only `args`.

## Owner's own call (1)

- [ ] **f59ba5d94** · Divider 'All variants' hard-codes two Dividers
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (1)

- **f89c20860** · Divider is horizontal only and accepts both label and children: Leave as is (owner approved Keep).

## Ignore: the claim was wrong (1)

- f80f048a7 (Divider copy: nothing to fix)

## README

Update `design-system/components/Divider/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
