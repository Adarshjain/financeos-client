# Icon: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Icon/Icon.stories.tsx`, `src/components/ds/Icon/Icon.tsx`, `src/components/ds/Icon/registry.ts`

## Change (8)

- [x] **f7bb870b9** · Icon registry mixes in FinanceOS nav names
  - Now: `registry.ts` lists `accounts`, `transactions`, `loans`, `investments`, `rewards`, `reports`, `dashboards`, `inbox`, `notifications` next to generic glyphs like `search` and `add`. So the core `IconName` type carries product words.
  - Do: Name core icons after the picture (`wallet`, `list`, `handshake`, `chart-line`, `gift`, `chart-bar`, `squares`, `tray`, `bell`). The app keeps a small map from its nav names to those icon names and passes the result to `<Icon name>`.
  ```tsx
  // app-level
  export const navIcons = {
    accounts: 'wallet', loans: 'handshake', rewards: 'gift',
  } as const satisfies Record<string, IconName>;
  ```
- [x] **fe2ff5ca9** · Icon returns nothing for an unknown name
  - Now: `Icon.tsx:24` returns `null` when the registry has no entry, so a bad name leaves a silent hole in the layout.
  - Do: Keep the `null`, but log one `console.warn` in development (`process.env.NODE_ON !== 'production'`) naming the bad icon. No new prop is needed.
- [x] **f64b8d5e4** · Icon Sizes and Playground are not args-driven
  - Now: `Sizes` (`Icon.stories.tsx:141-167`) hand-builds three rows in `render`. `Playground` takes args but wraps the icon in a padded div.
  - Do: Keep one args-driven `Playground` story with `parameters: { layout: 'centered' }` and a `size` control; delete `Sizes` and add no `Small`/`Medium`/`Large` stories (they differ only by one control value). _(per G9)_
- [x] **f2d9b3dda** · Icon story builds a whole browser page from raw elements
  - Now: `AllIconsShowcase` (`Icon.stories.tsx:26-122`) uses a raw `<input>`, a raw clear `<button>`, an `<h2>`, `<code>` tiles and a hand-made 'Copied' span. None of it uses the DS parts.
  - Do: Move the icon browser to a static `Foundations/` docs page that lists every `iconRegistry` glyph with `Text`/`Card`. It has no search state, filtering, clipboard or timers (G9 No logic), so no `SearchField`. _(per G9)_
- [x] **fca64696c** · Icon stories hand-build frames and headings
  - Now: `Playground` and `Sizes` (`Icon.stories.tsx:135,143-163`) wrap content in `bg-canvas p-space-24` divs and hand-style an `<h3>` and `<span>` lines.
  - Do: Use `parameters: { layout: 'centered' }` for the frame (the canvas colour comes from the theme decorator in `.storybook/preview.tsx`). Put the size-to-text pairing in `parameters.docs.description.story`.
- [x] **f886860d8** · Icon story holds state and clipboard logic
  - Now: `AllIconsShowcase` keeps `query` and `copiedName` in `useState`, filters with `.includes`, writes to `navigator.clipboard` and clears with `setTimeout` (`Icon.stories.tsx:27-48`).
  - Do: Remove the state and clipboard logic from the Icon story (no `useState`, no `play`). Keep an args-driven story with a `name` control; autodocs covers the rest. _(per G9)_
- [x] **f098e25e2** · Icon story imports from deep relative paths
  - Now: `Icon.stories.tsx:4-6` reaches `../../../../design-system/icons.json` and `./registry`, an internal file.
  - Do: Build the browser from `iconRegistry` exported through `@/components/ds` so the JSON is not needed. If the JSON stays, import it with a `@/` alias or a Storybook `staticDirs` entry.
  ```tsx
  import { Icon, iconRegistry, type IconName } from '@/components/ds';
  ```
- [x] **fb79e11a1** · Icon docs page is a story; Sizes holds hand-built copy
  - Now: `AllIcons` is a documentation page, not a state of `Icon`. `Sizes` carries lines like '12px label text with sm (14px) icon' typed into the canvas (`Icon.stories.tsx:148-161`).
  - Do: Move the browser to autodocs/MDX and the size explanation to `parameters.docs.description.component`. Keep a single args-driven `Playground` with a `size` control, not one story per size. _(per G9)_

## Owner's own call (1)

- [x] **faa5c36f3** · Icon browser has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **fe33afaf6** · Icon cannot take a custom glyph: No page needs this flexibility yet; add it when one does.
- **fbd036bda** · Icon weight is fixed to bold: Leave as is (owner approved Keep).

## README

Update `design-system/components/Icon/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
