# StatusWords: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/StatusWords/StatusWords.stories.tsx`, `src/components/ds/StatusWords/StatusWords.tsx`

## Change (9)

- [ ] **f5c68fbe4** · StatusWords tones are FinanceOS terms
  - Now: `StatusTone` includes `review`, `link`, `provenance`, `verified` (`StatusWords.tsx:11-14`), each a transaction or rule concept.
  - Do: Use only the shared tone words: `success | warning | info | neutral`. The app organism maps 'review' to `warning`, 'link' to `info`, and so on.
  ```tsx
  <StatusWord tone="warning">Unreconciled</StatusWord>
  ```
- [ ] **fcf26a36c** · StatusWords is a status taxonomy for the app
  - Now: README says it is shared by transaction rows, rule cards and detail sheets, and the words (Unreconciled, Duplicate, Gmail, LLM-generated) are FinanceOS statuses. The markup is just coloured words joined by a dot.
  - Do: StatusWords stays in Dinero, made generic: tones `neutral`, `info`, `warning`, `success`; icons are explicit props; no FinanceOS words inside. The app passes the words and tones. Do not move it to organisms and do not add `InlineMeta`. _(per G1,G15)_
- [ ] **fb229b6b7** · StatusWords keeps two tone vocabularies
  - Now: `resolveTone` (`StatusWords.tsx:35-41`) turns `review/link/provenance/verified` into `amber/blue/grey/green`, and both sets sit in `StatusTone`.
  - Do: Delete `resolveTone`. One set of tones, the semantic one, as in Banner.
- [ ] **f69e7cd6e** · StatusWords blue words auto-show a link icon
  - Now: `showIcon ?? (resolvedTone === 'blue' && icon === undefined)` shows the chain icon (`StatusWords.tsx:64-65,77-79`), tying the icon to the 'linked' meaning.
  - Do: Replace with `icon?: IconName`, shown only when passed. The app's linked status passes `icon="link"`.
  ```tsx
  <StatusWord tone="info" icon="link">Refund</StatusWord>
  ```
- [ ] **f313f5e47** · StatusWord mixes layout into tone styles
  - Now: The `toneClasses` object is built on each render, and the `blue` entry carries `inline-flex items-center gap-space-2 whitespace-nowrap` (`StatusWords.tsx:57-62`).
  - Do: Hoist the tone map to a module constant with colour and weight only. Put the layout classes in the base `cn(...)` so every tone lays out the same.
- [ ] **f020aa774** · StatusWord stories are hard-coded and lack controls
  - Now: `NeedsReview`, `Linked`, `Provenance`, `Verified` use `render` with fixed lists (`StatusWords.stories.tsx:16-54`). `meta.component` is `StatusWords`, so `tone` and `showIcon` have no controls.
  - Do: Add a `StatusWord` story with `args: { tone, children }` and set `subcomponents: { StatusWord }` in meta. One story per tone.
  ```tsx
  args: { tone: 'warning', children: 'Label' }
  ```
- [ ] **ff8ed114c** · Only ContextLine is driven by args
  - Now: Of the stories, only `ContextLine` uses `args` (`StatusWords.stories.tsx:56-65`).
  - Do: Make every story args-driven, as in the previous item.
- [ ] **f8670995e** · StatusWords stories hand-build frames and headings
  - Now: Wrappers, `<h3>` headings and a card-like frame with `p-space-14` (`StatusWords.stories.tsx:18,31,41,74,86`).
  - Do: Remove with `AllVariants`; use `parameters.layout: 'padded'` (already set) and `decorators` if a frame is needed.
- [ ] **f1552bd3d** · StatusWords story uses a relative import
  - Now: `StatusWords.stories.tsx:3` imports `./StatusWords`.
  - Do: Import from `@/components/ds`.
  ```tsx
  import { StatusWord, InlineMeta } from '@/components/ds';
  ```

## Owner's own call (1)

- [ ] **f8565fcb3** · StatusWords stories show the app vocabulary
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f5ac26e75** · StatusWords keys list items by index: Static lists, so index keys are harmless here.
- **f5bd15ded** · StatusWords items cannot carry an icon or class: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/StatusWords/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
