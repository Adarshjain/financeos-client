# SelectionBar: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/SelectionBar/SelectionBar.stories.tsx`, `src/components/ds/SelectionBar/SelectionBar.tsx`

## Change (8)

- [ ] **fdbcae58c** · Action has two names for click and two for style
  - Now: `SelectionBarAction` has `onClick` and `onSelect` (SelectionBar.tsx:13-14), resolved at :140, and `variant` plus `tone` for the same thing (:17-18, :133). RULES say one name per prop.
  - Do: One name each, matching the agreed action shape: action items are `{ id, label, icon, tone, count, onSelect }`. `onClick` and `variant` go.
- [ ] **fddd9e0e6** · Column count is set with an inline style
  - Now: `gridTemplateColumns: repeat(${actions.length}, ...)` is an inline style on every width (SelectionBar.tsx:70-72, 130); `lg:flex` then overrides the display.
  - Do: Replace with Tailwind classes: `grid grid-flow-col auto-cols-fr` on the actions wrapper. Delete `colStyle`.
- [ ] **f2d9bd61f** · Meta args use empty callbacks; actions has no control
  - Now: `args` has `actions: transactionActions` and `onClear: () => {}` (SelectionBar.stories.tsx:41-45). `argTypes` (:46-56) does not list `actions`.
  - Do: Meta args use `fn()` for `onClear` and `onSelectAll`, and action items use `onSelect: fn()`. Add an object control for `actions`.
- [ ] **f82294bbb** · Meta render is a mini state machine that forces Select all
  - Now: The meta `render` replaces `onClear` and `onSelectAll` with `updateArgs` calls (SelectionBar.stories.tsx:57-75). `onSelectAll` is always passed, so no story can omit the Select all button.
  - Do: Remove the meta `render` entirely. Pass `onSelectAll: fn()` only in the stories that should show Select all, so other stories can omit it; no `updateArgs` logic. _(per G9)_
- [ ] **f751b266c** · Story chrome uses hand-built divs and headings
  - Now: `<div className="flex justify-center w-full">` (SelectionBar.stories.tsx:60), `space-y-space-24` wrapper, `<h4 className="text-label ...">` headings and `<div className="max-w-sm">` (:84-139).
  - Do: Move centring to a decorator or `parameters.layout: 'centered'`. Remove the headings along with `AllVariants`.
- [ ] **f4810e131** · Meta render mixes extra handlers with args.onClear
  - Now: The `render` wrapper (SelectionBar.stories.tsx:57-75) calls `args.onClear?.()` and `updateArgs` inside new functions. It hides the real args from the Controls panel.
  - Do: Stories use plain `args` with `fn()` from `storybook/test` (no meta `render` with extra handlers). Add no `play` function (G9); the clear-to-zero behaviour is covered by the unit test. _(per G9)_
- [ ] **f877feb08** · Stories use alert() and empty callbacks
  - Now: `onClick: () => alert(...)` (SelectionBar.stories.tsx:12,18,25,31,181,202) and `onClear: () => {}` (:44, 93, 112, 138). `Approve` (:107-111) and `Merge` (:127-131) have no handler; `Merge` is disabled, so only `Approve` is a real miss.
  - Do: Every action item uses `onSelect: fn()`; `onClear` and `onSelectAll` use `fn()` too.
- [ ] **f997f7bfa** · Sample actions are the Transactions screen
  - Now: `transactionActions` (SelectionBar.stories.tsx:8-33) is Link, Merge, Approve, Delete with hints "the pair" and "clear Duplicate". Icon sizes differ: `sm` here, `md` in `SingleAction` and `ActionDisabled` (:179, 195).
  - Do: Use neutral actions (Archive, Move, Delete) with neutral hints. Use one icon size (`sm`) everywhere.

## Owner's own call (3)

- [ ] **f922b7c37** · AllVariants hard-codes bars; Desktop shows Select all anyway
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f047d56e1** · AllVariants repeats Desktop and SingleAction
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fd7c0ed89** · No play function for the bar
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (7)

- **fb4b0ad0f** · "N selected" is fixed text: Generic control wording that any app would use; fine as a default.
- **fd77ff638** · "Select all" is a default label: Generic control wording that any app would use; fine as a default.
- **ffb980e96** · Clear button label defaults to "Clear selection": Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **fdcaa9f85** · Esc always clears, with no way to turn it off: Leave as is (owner approved Keep).
- **f92acc3f2** · Visibility comes from count, not an open prop: Leave as is (owner approved Keep).
- **fc9e294ba** · Action label and hint are string only: No page needs this flexibility yet; add it when one does.
- **f42c66115** · Action count is glued into the label text: No page needs this flexibility yet; add it when one does.

## Ignore: the claim was wrong (1)

- f487a409b (Docking and breakpoint are the design)

## README

Update `design-system/components/SelectionBar/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
