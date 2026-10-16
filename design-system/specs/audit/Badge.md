# Badge: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Absorbs CategoryChip (G2). Read G2 first: it defines the whole new API.

**Files:** `src/components/ds/Badge/Badge.stories.tsx`, `src/components/ds/Badge/Badge.tsx`

## Change (9)

- [x] **f6e403090** · Badge tones are colour names, not meanings
  - Now: `BadgeTone` is `green | amber | rose | blue | grey` (`Badge.tsx:5`), while Banner uses `success | warning | danger | info | neutral`.
  - Do: Rename `BadgeTone` to `neutral | success | warning | danger | info` and add `variant` (`soft|solid|outline|dashed`, default `soft`), `shape`, `size` as in G2. There is no `variant="count"` or `count` prop: a count is `<Badge variant="solid" shape="rounded" size="sm" tone="danger">{formatCount(9)}</Badge>`; the plain case is `<Badge tone="success">Paid</Badge>`. _(per G2)_
- [x] **ff9aaa21a** · Badge's variant default is 'grey', which is not a variant
  - Now: `BadgeVariant` is `'count' | 'default'` but the destructure default is `variant = 'grey'` (`Badge.tsx:30`). It works only because the code tests `variant === 'count'`.
  - Do: Set the destructure default to `variant = 'soft'` (the G2 default); `BadgeVariant` is `soft | solid | outline | dashed` and there is no `'count'` or `'default'` member. _(per G2)_
- [x] **fe3959b9a** · Badge counts are capped at 99 inside the component
  - Now: `Badge.tsx:35-46` turns numbers over 99 (and numeric strings) into '99+' by parsing. There is no way to change the cap.
  - Do: Remove the 99+ cap from Badge: Badge takes children only. Add `formatCount(n, max = 99)` to `src/components/ds/utils/` and callers pass `{formatCount(n)}` as content. _(per G2)_
- [x] **faab1bf76** · Badge tone type allows invalid variant and tone pairs
  - Now: `tone` is `BadgeTone | BadgeCountTone` for both variants and the code casts it (`Badge.tsx:34,64`). `variant="count" tone="green"` compiles and falls back to ink.
  - Do: One Badge: `tone` (neutral, success, warning, danger, info) × `variant` (soft, solid, outline, dashed) × `shape` (default, rounded) × `size` (sm, md). Content is children, counts included; 99+ moves to a shared `formatCount` helper. Clickable with `onClick` or `asChild`. FilterChip stays separate.
- [x] **f8f389815** · Badge heights are fixed
  - Now: Heights are `h-space-16` (count) and `h-space-20` (label) in the class strings (`Badge.tsx:52,70`).
  - Do: Heights are now defined by the `size` prop: `sm` = `h-space-16 min-w-space-16 px-space-6 text-micro` bold, `md` = `h-space-20 px-space-8 text-caption`, default `md`. _(per G2)_
- [x] **ff00831bc** · Badge story wraps badges in hand-made frames
  - Now: Wrapper divs with `p-space-16 bg-canvas min-h-full flex ...` (`Badge.stories.tsx:26-27,34`).
  - Do: Remove with `AllVariants`. Use `parameters: { layout: 'centered' }` when a frame is wanted.
- [x] **fa865d595** · Badge has one story per tone plus a repeat in AllVariants
  - Now: Five tone stories and four count stories (`Badge.stories.tsx:44-109`) repeat `AllVariants`. They use app words like 'Paid', 'Gmail', 'Closed'.
  - Do: The AllVariants story is deleted (G9). Replace the per-tone stories with one args-driven story per README variant (`Soft`, `Solid`, `Outline`, `Dashed`, plus a `Rounded`/small count look) and let the tone control cover tones. _(per G9)_
- [x] **f24d2d48b** · Badge tone control shows tones that do not apply
  - Now: The `tone` control lists all eight values for both variants, and `count` has no argType (`Badge.stories.tsx:9-18`).
  - Do: Give `tone`, `variant`, `shape` and `size` select controls listing only the G2 values; add no `count` argType and no `argTypes.tone.if` split (there is no count variant). Node/function props such as `children`/`asChild`/`onClick` get `control: false` where needed. _(per G2)_
- [x] **feb6fd665** · Badge story uses a relative import
  - Now: `Badge.stories.tsx:4` imports `./Badge`.
  - Do: Use `import { Badge } from '@/components/ds';`.
  ```tsx
  import { Badge } from '@/components/ds';
  ```

## Owner's own call (1)

- [x] **fb823e79f** · Badge AllVariants has fixed props
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Superseded by a global rule: nothing to do beyond that rule (1)

- **fa82a3024** · Badge switches to count mode when count is passed: There is no count mode and no `count` prop (G2): content is `children` only and nothing is inferred, so `isCount` is deleted outright.

## README

Update `design-system/components/Badge/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
