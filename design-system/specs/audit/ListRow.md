# ListRow: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/ListRow/ListRow.stories.tsx`, `src/components/ds/ListRow/ListRow.tsx`

## Change (11)

- [x] **f841e50b9** · ListField lives inside ListRow.tsx
  - Now: `ListField` is a separate component (:215-236) defined in `ListRow.tsx`. It does have a README mention (README lines 3, 17) and a story (`LabelValue`), but no folder or own README/stories file.
  - Do: Move it to `src/components/ds/ListField/ListField.tsx` with its own README and an args-driven story (`label`, `value`). Keep the `ListRow` export path working through `index.ts`.
- [x] **fc6908224** · ListRow has money props amount and isCredit
  - Now: `amount` and `isCredit` (:22-25, :93-104) style a trailing money value with a positive colour. That is money semantics in a generic row.
  - Do: Replace with `value?: ReactNode` plus `valueTone?: 'neutral' | 'success' | 'danger'` (Dinero tone names). Or drop them and let the app pass `trailing={<Text tone="positive">+₹15,000</Text>}`; `Text` already has `tone`.
  ```tsx
  <ListRow title="Rahul Sharma" trailing={<Text tone="positive" variant="body-strong">+₹15,000</Text>} />
  ```
- [x] **f9bd02d03** · ListRow prepends '+' to the amount string
  - Now: `isCredit && typeof amount === 'string' && !amount.startsWith('+') ? `+${amount}` : amount` (:100-102) changes the text it is given.
  - Do: Remove. The component shows exactly what the app passes. The app formats the sign.
- [x] **ffed0f435** · Kebab only takes a callback, no menu
  - Now: `kebab` is `boolean | () => void` (:29). The README says 'Menu (kebab)' (line 14), but there are no menu items. `kebab={true}` renders a button with no click handler (:111-118).
  - Do: Replace `kebab` with `actions?: { id, label, onSelect, destructive? }[]` rendered with Radix `DropdownMenu` (no sheet, no title). Drop the `true` form and do not add an `actionsLabel` prop: the fixed 'More options' label is kept as the screen-reader fallback. _(per G6)_
- [x] **fbcff398c** · Keyboard handler on ListRow with asChild
  - Now: The handler calls `onClick` on Enter/Space only when an `onClick` was given (`isInteractive && onClick`, :71). So a plain `<a href>` is not intercepted. It does intercept when both `asChild` and `onClick` are set, which can double-handle links.
  - Do: Skip the key handler when `asChild` is true; the child element handles its own keys. Keep it only for the `div` form.
  ```tsx
  const handleKeyDown = asChild ? onKeyDown : (e) => { onKeyDown?.(e); /* Enter/Space */ };
  ```
- [x] **f91d0c35e** · LabelValue and AsChild stories ignore args
  - Now: `LabelValue` (:280-289) and `AsChild` (:309-321) hard-code everything in `render`. `ListField` has no argTypes (argTypes cover ListRow only).
  - Do: Make `AsChild` args-driven: `args: { asChild: true, title, subtitle, chevron: true }` and `render: (args) => <ListRow {...args}><a href="#" /></ListRow>`. Give `ListField` its own story with `label` and `value` args once it has its own file.
- [x] **f00d0bd19** · ListRow stories lack argTypes for most props
  - Now: `argTypes` (:17-46) omit `leading`, `trailing`, `kebab`, `clickable`, `asChild`. `leading` and `trailing` are set in `render`, so Controls cannot change them.
  - Do: Add `clickable` and `asChild` booleans and an object control for `actions` (the replacement for `kebab`, see ffed0f435). Put `leading`/`trailing` JSX in `args` with `control: false` and remove the `render` overrides; use `<Badge tone="danger">Missing</Badge>` (not `rose`). Do not add a `kebab` action argType. _(per G9)_
- [x] **f35849cc7** · Card wrapper repeated in every ListRow story
  - Now: `<Card className="max-w-md p-0 overflow-hidden">` appears in every story (e.g. :181, 199, 217, 235, 252, 266, 283, 299, 312).
  - Do: Use one `meta.decorators` entry for the Card frame (layout classes only). `AllVariants` is deleted (G9), so no per-case Card remains. Snippet: `decorators: [(Story) => <div className="max-w-md"><Story /></div>]`. _(per G9)_
- [x] **f45c05c94** · Kebab stories pass empty functions, not actions
  - Now: `kebab={() => {}}` (:122) and `kebab: () => {}` (:249). Clicks are not logged. `trailing` buttons and row clicks are not logged either.
  - Do: Stories pass `actions` items with `onSelect: fn()` and `onClick: fn()` (from `storybook/test`) instead of `kebab={() => {}}`; there is no `kebab` prop any more. Preview already makes `on*` props `fn()`. _(per G9)_
- [x] **f9e466c04** · Stories restyle Avatar with colour classes
  - Now: `<Avatar ... className="bg-info-tint text-info" />` (:105, :238). `Avatar` has `variant` and `size` only (Avatar.tsx:11-12); no tone.
  - Do: Add `tone?: 'neutral' | 'info' | ...` to `Avatar` (RULES §5c.5) and use `tone="info"` in the stories.
  ```tsx
  <Avatar variant="account" initials="EMI" tone="info" />
  ```
- [x] **f62cd8725** · AsChild story links to real app routes
  - Now: `<a href="/ds/login">` and `/ds/signup` (:313-318) are real FinanceOS pages used as sample content.
  - Do: Use `href="#"` and neutral sample text ('Profile', 'Settings'). Put the sample links in `args`.
  ```tsx
  <ListRow asChild title="Profile" chevron><a href="#" /></ListRow>
  ```

## Owner's own call (3)

- [x] **f179565ea** · AllVariants hard-coding rows is allowed
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f7b105eee** · All variants duplicating the single stories is required
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f40b67d6f** · ListRow has no play functions
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **f2eefb5dc** · 'highlighted' is described as 'opened from notification': Leave as is (owner approved Keep).
- **ff9978f00** · Kebab button label is fixed to 'More options': Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **fda8338ef** · ListRow padding and 4px left border are fixed: Leave as is (owner approved Keep).

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f616fe519** · Hand-made headings above each All variants case: AllVariants is deleted (G9), so its hand-made headings no longer exist.

## README

Update `design-system/components/ListRow/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
