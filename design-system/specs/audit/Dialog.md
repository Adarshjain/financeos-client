# Dialog: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Dialog/Dialog.stories.tsx`, `src/components/ds/Dialog/Dialog.tsx`

## Change (15)

- [ ] **f7720aee9** · ConfirmDialog defaults checkingMessage to app copy
  - Now: `checkingMessage = 'Checking what will be affected…'` is the default in `ConfirmDialogShell` (:488) and `ConfirmDialog` (:606). It talks about 'affected' records, which is the FinanceOS delete-preview idea.
  - Do: Default to a plain 'Loading…' (an allowed generic word), or make `checkingMessage` the only text shown and have the app pass it.
  ```tsx
  <ConfirmDialog isCheckingImpact checkingMessage="Counting linked transactions…" />
  ```
- [ ] **f4ff87d18** · ConfirmDialog bundles impact preview into the system
  - Now: `ConfirmDialogShell` and `ConfirmDialog` add `impact`, `isCheckingImpact`, `alternativeLabel` and a fixed red confirm button (Dialog.tsx:445-713). They are a destructive-confirm preset.
  - Do: Keep a generic `ConfirmDialog` (`title`, `description`, `children`, `confirmLabel`, `tone`, `loading`) and drop the impact-specific props, but do NOT create an organism: the impact list is built by the page and passed as `children`. Organisms are limited to TransactionRow, RuleCard, Illustration, Logo and SettingsToggle. _(per G1)_
- [ ] **f1e167608** · ConfirmDialog owns the fetch-then-show-impact flow
  - Now: `impact` (a bullet list), `isCheckingImpact` (spinner plus message, confirm disabled) and `alternativeLabel` are real props (Dialog.tsx:451-462, 575-600). The shape is generic enough; the default sentence is the app-specific part.
  - Do: Keep `loading`-style state but rename `isCheckingImpact` to `previewLoading`. Replace `impact: ReactNode[]` with `children` so the app renders its own list, and keep `alternativeLabel` as `tertiary`.
  ```tsx
  <ConfirmDialog previewLoading loadingText="Loading…">{impactList}</ConfirmDialog>
  ```
- [ ] **fb34c5bcd** · ConfirmDialog confirm button is always danger-filled
  - Now: Both `ConfirmDialogShell` (:578) and `ConfirmDialog` (:678) set `variant="danger-filled"` on the confirm button. A non-destructive confirm ('Discard draft?') cannot use it.
  - Do: Add `tone?: 'danger' | 'default'` (default 'danger' to keep today's look) and map to Button `variant`. Use the same prop name in both components.
  ```tsx
  <ConfirmDialog tone="default" confirmLabel="Publish" />
  ```
- [ ] **f0f7d2309** · Dialog's swipe-to-dismiss cannot be turned off
  - Now: `useSheetDrag` is always attached to the drag area (Dialog.tsx:291-299, 354-358). There is no prop to stop it.
  - Do: Add `dismissible?: boolean` (default true). When false: no drag handle, no swipe, overlay click and Esc do not close.
  ```tsx
  <DialogContent dismissible={false} />
  ```
- [ ] **f19d366a5** · Dialog footer styles buttons through child selectors
  - Now: The footer wrappers style direct children with `[&>button]:h-control-xl … [&>button]:w-full` (Dialog.tsx:86, 91, 96). It only works when the slot holds a bare `<button>`.
  - Do: Have footer slots render as a flex row and let `Button` take `size` and `block` props; pass `size` through a small `DialogFooter` context so any Button child picks it up. Remove the selectors.
  ```tsx
  <DialogFooter primary={<Button>Save</Button>} />
  ```
- [ ] **f2a0ad8fd** · Dialog root and ConfirmDialog take no ref or root attributes
  - Now: `Dialog` is the Radix `Root` (Dialog.tsx:240), which has no DOM node so no ref or attributes are possible. `ConfirmDialog` is a `React.FC` and its `...props` go to `DialogContent`.
  - Do: Make `ConfirmDialog` a `forwardRef` to the content element, like `ConfirmDialogShell`. Leave `Dialog` as the Radix root.
- [ ] **f0b875cef** · DialogSize is a fixed list and ConfirmDialog has no ref
  - Now: `DialogSize = 'sm'|'md'|'lg'|'xl'` (Dialog.tsx:12) has no custom width. `ConfirmDialog` is `React.FC` while `ConfirmDialogShell` forwards a ref.
  - Do: A fixed size scale is right for a design system. Keep it. Make `ConfirmDialog` a `forwardRef` (see the previous finding).
- [ ] **fd3e62a2a** · Dialog duplicates blocks and keeps alias props
  - Now: `srTitle` is `string` only. `DialogShell` and `DialogContent` repeat the footer, close and drag code (Dialog.tsx:186-222 vs 360-423). `SheetHandle` (:42) aliases `DialogHandle`, and `subtitle` / `description` are two names for one prop (:116, 154, 253, 288).
  - Do: Pick one name per prop (`description`) and delete `subtitle` and `SheetHandle`. Extract one internal `DialogPanel` that both shells use.
- [ ] **f5add7325** · Dialog stories use hand-built frames and captions
  - Now: Raw divs for layout and captions, including a fake scrim frame `<div className="bg-scrim p-space-16 max-w-sm rounded-ds-lg">` (Dialog.stories.tsx:64-197, 367).
  - Do: Render the real `Dialog` open with `defaultOpen`, and use `parameters.layout: 'fullscreen'`. Captions go in `parameters.docs.description.story`.
- [ ] **f774e5af4** · Dialog stories build fake form rows from raw elements
  - Now: Rows use `<label className="flex … border-b">` and a bordered `div` to fake an input with 'SWIGGY' (Dialog.stories.tsx:91-141, 248-393).
  - Do: Use `TextField`, `Checkbox` and `Switch` from `@/components/ds` inside `DialogBody`, with neutral sample text.
  ```tsx
  <DialogBody><TextField label="Name" /></DialogBody>
  ```
- [ ] **f619f0e86** · Dialog InteractiveModal state and sample data
  - Now: `InteractiveModal` uses `useArgs` for `open` (Dialog.stories.tsx:477-521), which is acceptable. `onClose={() => {}}` and `₹612` rows are placeholders.
  - Do: Keep `useArgs`. Replace `onClose` with `fn()` and use generic sample rows.
  ```tsx
  args: { onOpenChange: fn() }
  ```
- [ ] **f6ecee992** · Dialog stories use empty handlers
  - Now: `onClose={() => {}}` appears five times (Dialog.stories.tsx:73, 116, 142, 173, 202), and `Cancel`/`Approve` buttons have no `onClick`. The `ConfirmDialogShell` stories (:151, 435, 453, 466) have no `onConfirm`, `onCancel`, `onAlternative`.
  - Do: Set `onClose`, `onConfirm`, `onCancel`, `onAlternative` as `fn()` in meta `args` (import from `storybook/test`), so the Actions panel logs them.
  ```tsx
  args: { onClose: fn(), onConfirm: fn() }
  ```
- [ ] **fc3ab3708** · Dialog stories use relative imports
  - Now: Imports use `../Button/Button`, `../Checkbox/Checkbox`, `./Dialog` (Dialog.stories.tsx:5-14).
  - Do: Import everything from `@/components/ds`.
  ```tsx
  import { Dialog, DialogContent, Button } from '@/components/ds';
  ```
- [ ] **febb6e45f** · ConfirmDialog has no story
  - Now: The three confirm stories (Dialog.stories.tsx:432-475) use `ConfirmDialogShell`. The stateful `ConfirmDialog` with `trigger` has none.
  - Do: Add `ConfirmDialog` stories driven by args (`title`, `confirmLabel`, `trigger`, `loading`) with `onConfirm: fn()`. Add no `play` function (G9). _(per G9)_

## Owner's own call (3)

- [ ] **f99668a7b** · Dialog stories hard-code render and skip args
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f42e0876e** · Dialog stories duplicate and use app screens
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f0f4b70fd** · Dialog stories have no play functions
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (3)

- **fa1d455e6** · Dialog writes fallback title and description copy: Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **fe627bb16** · Dialog docs use domain examples: Documentation examples only; no copy reaches the screen.
- **f8144b96a** · Dialog z-layers are baked in: Leave as is (owner approved Keep).

## README

Update `design-system/components/Dialog/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
