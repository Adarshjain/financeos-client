# Rail: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Rail/Rail.stories.tsx`, `src/components/ds/Rail/Rail.tsx`

## Change (12)

- [ ] **f55dc690b** · Rail brand row is hard-wired to the FinanceOS Logo
  - Now: Rail.tsx:109,113 render `<Logo variant='full' size='sm' />` always. Every app using Rail gets the FinanceOS wordmark.
  - Do: Replace the hard-wired Logo with a `brand?: ReactNode` slot; drop `brandHref` and the anchor code (lines 98-110) since the app wraps its own link. Snippet: `<Rail brand={<Link href='/'><BrandLogo /></Link>} />`. _(per G15)_
- [ ] **f0ac17a7f** · Rail falls back to the initials 'AM'
  - Now: Rail.tsx:85 uses 'AM' (a sample user's initials) when the user has no name or initials.
  - Do: Remove `user` and the 'AM' fallback; the app renders its own `<Avatar>` inside the `footer` slot. Do not keep a `user` prop. _(per G15)_
- [ ] **fb8c311d1** · Rail search shows a built-in ⌘K shortcut by default
  - Now: Rail.tsx:128,131 default the label to 'Search' and the shortcut to '⌘K'. The shortcut is an app decision and is wrong on Windows.
  - Do: Remove the built-in search button, its 'Search' label and the default '⌘K'. Search becomes a `search?: ReactNode` slot and the app composes `Button` + `Kbd`. _(per G15)_
- [ ] **ff3d82e01** · Rail works out user initials from the name
  - Now: Rail.tsx:75-85 split `user.name`, take two letters and upper-case them. That is name formatting inside a layout component.
  - Do: Remove `derivedInitials`. The app passes `initials` or a full `<Avatar>` node in a `footer` slot.
- [ ] **f5269d9b0** · Rail has its own routing and select fallback chain, written twice
  - Now: Rail.tsx:101-106, 155-166 and 221-232 call `preventDefault` and choose between `item.onSelect`, `onSelect` and `onNavigate`. The same block is copied in the group and footer loops.
  - Do: Drop `onNavigate`. Items are either links (rendered with `asChild` around the app's own Link) or buttons that fire `onSelect(id)`. Extract one `RailItem` part and use it in both loops.
- [ ] **f40c827c6** · Rail is a whole FinanceOS app shell in one component
  - Now: Rail.tsx:23-50 define groups, user, search config and brand props, so the brand row, search, nav groups, footer and avatar are one fixed layout.
  - Do: Make Rail generic: `brand`, `search` and `footer` node slots, with the nav links using `asChild` so the app passes its router Link. FinanceOS composes its shell in the app and passes logo, search button, groups and user avatar. _(per G15,G1)_
- [ ] **f51534c34** · Rail count tone 'warning' draws a bare number, not a Badge
  - Now: Rail.tsx:187-199 show a plain coloured number for `countTone: 'warning'` and a count Badge for everything else. The README ties this to the Transactions review count.
  - Do: Keep `count` and `countTone` on items, but always draw a Badge: `<Badge variant="solid" shape="rounded" size="sm" tone={...}>{formatCount(count)}</Badge>` (warning tone maps to Badge `tone="warning"`). Remove the bare-number branch and `variant="count"`; do not add a `badge` slot. _(per G2)_
- [ ] **f518cfbd4** · Rail brand, search, footer and user are fixed structure, not slots
  - Now: Rail.tsx:98-133 and 209-256 hard-code those four areas. Item `label` is a string and `icon` is an `IconName` only.
  - Do: Use the slot names `brand`, `search` and `footer` (ReactNode), not `header`; make item `label`/`icon` ReactNode. Do not add a `header` prop. _(per G15)_
- [ ] **fc0092970** · Rail `current` can be an href or an id
  - Now: Rail.tsx:147,213 compare `current` with `item.href` or `item.id`. The Rail story uses hrefs; TabBar uses ids.
  - Do: Use one name and one meaning in both: `value` (the item id) with `onValueChange`, as RULES 5c.5 sets. Items match on `id` only.
  ```tsx
  <Rail value='inbox' onValueChange={setPage} />
  ```
- [ ] **f45d5c9d6** · Rail stories use no-op callbacks instead of fn()
  - Now: Rail.stories.tsx:77,84 pass `search={() => {}}`. Lines 58-59 only call `updateArgs`, so nothing reaches the Actions panel.
  - Do: Put `args: { onValueChange: fn(), onSelect: fn() }` on the meta (from `storybook/test`) and call them from the story render before `updateArgs`.
- [ ] **f588501af** · Rail stories wrap the nav in raw styled divs
  - Now: Rail.stories.tsx:54,71 use `<div className='h-screen flex'>` and `<div className='flex gap-space-24 h-screen font-text'>`.
  - Do: Use a meta `decorators` entry for the full-height flex frame, with `parameters.layout: 'fullscreen'`. The render function then only returns `<Rail {...args} />`.
- [ ] **fb102796d** · Rail Default, WithCounts and TransactionsActive repeat the same args
  - Now: Rail.stories.tsx:90-118 differ only by `current`. WithCounts has the same data as Default. The README says headers are hidden when a group has one item, but no code or story does this.
  - Do: Keep `Default` only, and let the `value` control switch the active item. Add real-state stories: `WithBadges`, `WithoutHeader` (a group without `label`), `WithFooter`.

## Owner's own call (2)

- [ ] **f9f54a312** · Rail 'All variants' hard-codes two Rails
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fecdc7e9d** · Rail has no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **fcc993378** · Rail width, border and padding are fixed: Leave as is (owner approved Keep).
- **ffc4a446b** · Rail stories use FinanceOS pages and a sample user: Leave as is (owner approved Keep).

## README

Update `design-system/components/Rail/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
