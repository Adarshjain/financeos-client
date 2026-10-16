# Popover: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Popover/Popover.stories.tsx`, `src/components/ds/Popover/Popover.tsx`

## Change (7)

- [ ] **f15f72068** · Popover bakes padding, animation, width and layer
  - Now: `PopoverContent` fixes `p-space-4`, a slide-from-top animation, `min-w-popover-trigger max-w-dialog-sm` and `z-overlay` (Popover.tsx:41-43). The slide is always from the top, even with `side="top"`. These are overridable with `className`.
  - Do: From your question: Popover and Menu already flip above the trigger when there is no room below (Radix `avoidCollisions`, on by default). The animation must follow the side it landed on: replace `slide-in-from-top-1` with `data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1` (the `side-top` / `side-bottom` variants already exist in tailwind.config.ts), in both Popover and Menu. Padding, width tokens and the z-index layer stay.
- [ ] **faeb57804** · Popover shorthand drops Radix props
  - Now: `Popover` takes a fixed list of props and drops the rest (Popover.tsx:73-84). It has no `contentProps`, ref, `onOpenAutoFocus`, `collisionPadding`. `Popover.Root` is Radix root while `<Popover>` also owns state.
  - Do: Add `contentProps?: Omit<PopoverContentProps, 'align'|'side'|'sideOffset'|'className'>` and forward it. Document `Popover.Root` as the composition API and `Popover` as shorthand.
  ```tsx
  <Popover contentProps={{ onOpenAutoFocus: e => e.preventDefault() }} />
  ```
- [ ] **faed90106** · Popover without trigger forwards no content options
  - Now: With no `trigger`, `Popover` renders only `Root` + children (Popover.tsx:111-118), so `contentClassName`, `align`, `side` are unused.
  - Do: That is correct for composition: the app places `Popover.Content` itself. Document it in the README, and warn in dev if `contentClassName` is passed without `trigger`.
- [ ] **f6ffe54ab** · Popover stories fake menu rows with raw divs
  - Now: `SampleMenuContent` builds rows with long class strings (`min-h-control-lg … bg-brand-tint … cursor-pointer`) at Popover.stories.tsx:8-23.
  - Do: Use `Menu.Item` rows or a `ListRow` from `@/components/ds`, or plain `Text` in the popover. A popover sample should be simple content.
  ```tsx
  <Popover trigger={...}><Text>Popover content</Text></Popover>
  ```
- [ ] **f9e5c728a** · Popover stories use hand-built wrappers and captions
  - Now: `<div className="flex flex-col gap-space-24 p-space-16 max-w-lg">` and caption `span`s (Popover.stories.tsx:49-51, 67-69).
  - Do: Use `parameters.layout: 'padded'` and a decorator for spacing (the popover opens at the trigger, so a `min-h` decorator suffices). Drop captions.
  ```tsx
  decorators: [(S) => <div className="min-h-64"><S /></div>]
  ```
- [ ] **f1fb5fa4c** · Popover stories have no onOpenChange action
  - Now: No story in Popover.stories.tsx passes an `onOpenChange` handler.
  - Do: Add `onOpenChange: fn()` to meta `args` (from `storybook/test`).
  ```tsx
  args: { onOpenChange: fn() }
  ```
- [ ] **f22cdeac1** · Popover stories use relative imports and restyle Button
  - Now: Imports are relative (Popover.stories.tsx:4-6), and `<Button className="w-72 justify-between">` / `className="gap-space-8"` restyle Button at :57, 74, 91, 104.
  - Do: Import from `@/components/ds`. Use `Button` props only (`variant`, `size`) and `block` if full-width is needed.
  ```tsx
  <Button variant="secondary" block>Open</Button>
  ```

## Owner's own call (3)

- [ ] **f5176dbc5** · Popover stories hard-code AllVariants and lack controls
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f7b06b729** · Popover AllVariants duplicates and covers the canvas
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f9dd422e4** · Popover stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (1)

- **f25c77f82** · Popover's trigger shortcut cannot skip PopoverContent: Leave as is (owner approved Keep).

## README

Update `design-system/components/Popover/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
