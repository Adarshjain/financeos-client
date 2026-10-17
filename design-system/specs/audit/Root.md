# Root: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Root/Root.stories.tsx`, `src/components/ds/Root/Root.tsx`

## Change (3)

- [x] **f7d46f4b7** · Root stories hand-build their content
  - Now: Root.stories.tsx:22-53 render a `flex flex-col gap-space-16 max-w-md` div with Text and a Button as inline content.
  - Do: Pass content through `args.children` (a small Text) and put any frame in a decorator. Explanations go in `parameters.docs.description`.
  ```tsx
  args: { children: <Text variant='body'>Page content</Text> }
  ```
- [x] **f4c8c5113** · Root story shows a toast through an inline onClick
  - Now: Root.stories.tsx:33 uses `onClick={() => showToast(...)}`. It is not a logged action.
  - Do: Delete the toast demo from the Root story; Toast has its own stories. Add no `play` function. _(per G9)_
- [x] **f6b121031** · Root stories pass className='p-space-24'
  - Now: Root.stories.tsx:24,45 add padding by `className` to the component.
  - Do: Remove `className='p-space-24'` from the Root stories and put the page padding in the shared decorator or `parameters.layout`. Do not pass visual classes in `args`. _(per G9)_

## Owner's own call (3)

- [x] **f42680ec5** · Root 'All variants' has no args and its children control is off
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f21748fff** · Root AllVariants and Default are the same story
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **fadef9cba** · Root has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (1)

- **faa17a8d9** · Root always mounts the Toaster: Root is the app frame, so mounting the one Toaster is its job (Polaris Frame does the same).

## README

Update `design-system/components/Root/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
