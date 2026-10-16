# TabBar: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/TabBar/TabBar.stories.tsx`, `src/components/ds/TabBar/TabBar.tsx`

## Change (8)

- [x] **f1494ef5e** · TabBar has a `hidden` prop that the app can do without
  - Now: TabBar.tsx:41 returns null when `hidden` is true. FinanceOS uses it for selection mode, but the app can just not render the bar.
  - Do: Remove the `hidden` prop. The app writes `{!selecting && <TabBar ... />}`. The story's `hidden` control goes away with it.
- [x] **f4a6e344f** · TabBar items carry count and countTone for notification badges
  - Now: TabBar.tsx:14-15 give each item `count` and `countTone: 'danger' | 'warning'`, and lines 79-86 draw the Badge. This is the Inbox and Transactions-review count from FinanceOS.
  - Do: Keep `count`/`countTone` on items, but TabBar.tsx must stop using `<Badge variant="count" count=...>`. Render `<Badge variant="solid" shape="rounded" size="sm" tone={countTone}>{formatCount(count)}</Badge>` and update the README Built-from line. _(per G2)_
- [x] **fe049e1bd** · TabBar renders a raw `<a href>`, so app routers cannot be used
  - Now: TabBar.tsx:57,62 pick `a` or `button`. `onClick` calls `onSelect`, but the browser still follows the link. A Next.js `Link` cannot be used.
  - Do: Add `asChild?: boolean` on each item (the same pattern Button already uses). The app passes its own `Link` as the child. Without `asChild`, render a plain `button` that fires `onSelect`.
  ```tsx
  { id: 'home', label: 'Home', icon: ..., asChild: true,
    children: <Link href='/' /> }
  ```
- [x] **fdfff2f1e** · TabBar story builds its own phone frame and fake page rows
  - Now: TabBar.stories.tsx:15-37 define `Scene`, a bordered frame with three fake `bg-surface` rows and a hand-styled title div.
  - Do: Delete `Scene`. Add one meta-level decorator that wraps the story in a phone-sized box with `transform: translateZ(0)` and `height`, so a `fixed` bar stays inside it. Use `parameters.layout: 'fullscreen'` and the existing `viewport: { defaultViewport: 'phone' }`. No fake rows.
  ```tsx
  decorators: [(Story) => <div style={{height:320, transform:'translateZ(0)'}}><Story /></div>]
  ```
- [x] **fa75e5bcb** · TabBar story explains `pb-tab-bar-clearance` with a hand-made paragraph
  - Now: TabBar.stories.tsx:61-63 render a `<p>` with a `<code>` tag as story content.
  - Do: Move the sentence into `parameters.docs.description.component` on the meta, naming the generic spacing utility `bottom-clearance` (not `pb-tab-bar-clearance`). The canvas then shows only the component. _(per G8,G9)_
- [x] **f0ad979c7** · TabBar stories restyle the bar through className
  - Now: TabBar.stories.tsx:67,92,100,114,122 pass `className='absolute inset-x-space-12 bottom-space-12'` to override the baked-in `fixed` position.
  - Do: Once the component is in-flow (see the positioning finding), no `className` is needed. The decorator frame holds the bar in place.
- [x] **f3ffbb4f2** · TabBar story selection is not logged in the Actions panel
  - Now: TabBar.stories.tsx:69 uses `onSelect={(id) => updateArgs(...)}` with no `fn()`. `argTypes` (lines 46-56) only covers `current` and `hidden`.
  - Do: Set `args: { onSelect: fn() }` (from `storybook/test`) on the meta. In the `render`, call `args.onSelect?.(id)` then `updateArgs({ value: id })`. Add `items` as a `control: 'object'` argType.
  ```tsx
  args: { onSelect: fn() },
  argTypes: { items: { control: 'object' } }
  ```
- [x] **f47fc2efb** · TabBar has three stories that differ only by `current`
  - Now: HomeCurrent, TransactionsCurrent and MoreOpen (TabBar.stories.tsx:129-165) have the same items and only change `current`. The control already does this.
  - Do: Delete HomeCurrent, TransactionsCurrent and MoreOpen; keep `Default` and `CountOver99` built from args. The '99+' text comes from `formatCount` (G10) passed as Badge children, not from Badge itself. _(per G2)_

## Owner's own call (2)

- [x] **f251b33c5** · TabBar 'All variants' hard-codes four bars
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f9f748917** · TabBar has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **f1f3eb3de** · TabBar is always fixed to the screen bottom as a pill: Leave as is (owner approved Keep).
- **fd3e4e1c0** · TabBar silently drops items after the fifth: Leave as is (owner approved Keep).
- **f5ca498ca** · TabBar item icon and label are limited to IconName and string: No page needs this flexibility yet; add it when one does.
- **fa985dd35** · TabBar stories use FinanceOS tabs and routes as sample data: Leave as is (owner approved Keep).

## README

Update `design-system/components/TabBar/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
