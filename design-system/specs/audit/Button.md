# Button: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Tile and Google variants go; layout prop arrives (G11).

**Files:** `src/components/ds/Button/Button.stories.tsx`, `src/components/ds/Button/Button.tsx`

## Change (15)

- [ ] **fda79c4d0** · Button supplies "Continue with Google" as default label
  - Now: Line 131-132: `effectiveChildren = children ?? (isGoogle ? 'Continue with Google' : null)`. The label is product copy baked into a generic Button.
  - Do: Drop the default. The app passes the label as `children`. Removing the `google` variant (next finding) removes this line too.
- [ ] **fe7f22e67** · Button has a Google-branded variant
  - Now: `variant: 'google'` (line 16) swaps in `/brand/google-g.svg` (121-128), forces size `xl` (line 79) and adds `w-full` (line 49). That is the FinanceOS sign-in button, not a generic variant.
  - Do: Remove `google` from `ButtonVariant`. The sign-in screen builds it: `<Button variant="secondary" size="xl" icon={<GoogleMark />} className="w-full">Continue with Google</Button>`, ideally as a small app-level `GoogleSignInButton`.
  ```tsx
  <Button variant="secondary" size="xl" fullWidth icon={<GoogleMark />}>
    Continue with Google
  </Button>
  ```
- [ ] **fb0f17b79** · Button has a nav-card "tile" variant with iconPosition="top"
  - Now: `variant: 'tile'` and `iconPosition: 'top'` (lines 18, 20, 52-53, 82-86) build a bordered card with an icon above the label. The README ties it to the More sheet and Quick add, which are app screens.
  - Do: Remove `tile` and `iconPosition`. Add `layout?: 'inline' | 'stacked'` (default `inline`); `stacked` puts the icon above the label at height `h-space-64`. Quick add uses `variant="secondary" layout="stacked"`. Snippet: `<Button variant="secondary" layout="stacked" icon={<Icon name="add" size="lg" />}>Transaction</Button>`. _(per G11)_
- [ ] **fdf56c812** · Button google and tile variants force full width
  - Now: Lines 49 and 53 put `w-full` inside `variantStyles`. `className` can override it through `tailwind-merge`, but there is no prop to say "not full width".
  - Do: Remove `w-full` from both variants. Add `fullWidth?: boolean` (default `false`) that adds `w-full`. One name for the prop across all Dinero controls.
  ```tsx
  <Button fullWidth>Save</Button>
  ```
- [ ] **f3d58de69** · Button tile hard-codes h-16 for the top layout
  - Now: Only the `iconPosition: 'top'` branch has a fixed height, `h-16` (line 85). The `start` branch has no fixed height (line 86): its ~46px comes from padding, not a height class.
  - Do: Drop the hard-coded `h-16`. `layout="stacked"` uses height `h-space-64` (the approved `space-64` step, finding f3d58de69); do not size it from padding or add a class override. _(per G11,G8)_
- [ ] **f8b91e384** · Button hard-wires the Google icon path with no override
  - Now: Lines 121-128 render `<img src="/brand/google-g.svg">` inside the component. An explicit `icon` prop does override it (line 119), but the asset path still lives in the DS.
  - Do: Remove the `<img>` fallback (it goes with the `google` variant). The app passes its own mark through `icon`.
- [ ] **f9d9f9338** · Button asChild ignores loading, disabled, count and loadingLabel
  - Now: In the `asChild` branch (lines 134-156) the `Slot` gets only `className` and `props`. `disabled`, `loading`, `loadingLabel` and `count` are never used there, so `<Button asChild loading>` shows nothing. This is a real bug.
  - Do: In the `asChild` branch apply `disabled`, `loading` and `count` too: render the spinner or icon and the count Badge (`variant="solid" shape="rounded" size="sm"` with `formatCount(n)`) inside the child, and set `data-disabled` plus `pointer-events-none` when disabled. Do not add an `AsChildLoading` story (single control value difference); cover it in a unit test. _(per G11)_
- [ ] **f556fdf26** · Button story builds its own headings and frames
  - Now: Line 49 is a styled wrapper div, and lines 51, 63, 72 and others use raw `<h3 className="text-overline ...">` as section titles, plus flex/grid divs.
  - Do: Delete the hand-made headings and frames. Use `parameters.layout` and the one existing theme decorator; no per-story visual-class decorators. Use `Text` for any caption. The section titles go with `AllVariants`. _(per G9)_
- [ ] **fd2ea9ce4** · Button stories wrap Buttons in hand-made frames
  - Now: Lines 190, 336 and 350 wrap the Button in `<div className="p-space-24 bg-canvas ...">` inside `render`, only to give it room.
  - Do: Delete the custom `render` wrappers and rely on `parameters.layout: 'centered'` and the single theme decorator; no per-story decorator with visual classes (`p-space-24 bg-canvas max-w-xs`). The Google and tile stories are deleted (G11). _(per G9)_
- [ ] **f5fda7cb6** · Button IconButton story hard-codes four Buttons
  - Now: `IconButton` (line 240) renders four Buttons in `render` with no args, so `iconOnly` and `size` controls are dead for it.
  - Do: Make `IconButton` one args-driven story: `args: { iconOnly: true, icon: <Icon name="close" size="sm" /> }` with the `size` control showing sizes. Do not add `IconOnlySm`/`IconOnlyMd` stories (they differ only by one control value). _(per G9)_
- [ ] **f51d32309** · Button Google story wraps args in hand-built divs
  - Now: `Google` (line 185) has `args` but its `render` nests them in two wrapper divs (188-194).
  - Do: If the `google` variant is removed, delete this story. Otherwise drop `render` and use a decorator for the frame.
- [ ] **fb4782dfa** · Button stories log no click events
  - Now: The meta (lines 7-42) has no `args: { onClick: fn() }` and `.storybook/preview.tsx` sets no `argTypesRegex`, so the Actions panel shows nothing when a Button is clicked.
  - Do: Add the callback to `args` as `fn()` from `storybook/test` so the Actions panel logs it.
  ```tsx
  args: { onClick: fn() }
  ```
- [ ] **fcb27afc1** · Button stories use relative imports
  - Now: Lines 4-5: `import { Icon } from '../Icon/Icon'` and `import { Button } from './Button'`. Every story file in this slice does the same.
  - Do: Import from the barrel: `import { Name } from '@/components/ds'`.
- [ ] **fe458ff5f** · Button story passes a layout className
  - Now: Lines 138 and 141: `<Button size="xl" className="flex-1">` inside the "Phone sheet footer" demo. The story styles the component to fake a sheet footer.
  - Do: Remove the demo (see the app-screen finding). The `Phone` story already shows `size: 'xl'`. For full width use the new `fullWidth` prop, not a class.
- [ ] **f29cfeef9** · Button stories show app screens, not component states
  - Now: Lines 135-145 mock a "Phone sheet footer"; lines 147-170 show tile rows for "46px section links" and "64px quick add". These are More sheet and Quick add layouts.
  - Do: Delete the app-screen stories. Component states are covered by the `size: 'xl'` story and a `layout: 'stacked'` story (the `tile` variant is deleted). App layouts get stories in the app layer. _(per G11,G9)_

## Owner's own call (3)

- [ ] **f5aa144a1** · Button AllVariants story hard-codes every Button
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fc2e7036f** · Button AllVariants repeats every single-state story
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **ff68f1e34** · Button stories have no play function
  - Do: No play function and no interaction test (G9).

## README

Update `design-system/components/Button/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
