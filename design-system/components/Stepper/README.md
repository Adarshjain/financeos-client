# Stepper

The steps of a multi-step flow and where the user is in it: "✓ Files · ✓ Match instruments · 3 Reconcile · 4 Done" on the import wizard (`D-import-wizard`, `P-import-wizard`).

## Use
- It only shows progress. Steps are not clickable; the page's Back and primary buttons move between steps (board and the live wizard).
- The page places it, usually as the first row of a Card under the page's controls. The Stepper draws no card of its own.
- Phone and desktop are the same: steps sit in one row and wrap onto the next line when they don't fit. A step never breaks inside itself.

## Anatomy
Each step is a circle and a label, `space-8` apart; steps are `space-16` apart (`space-8` between wrapped lines).
- **Done** (before the current step): `check` Icon in `brand` on a `brand-tint` circle; label `ink-3`.
- **Current**: the step number in `on-brand` on a `brand` circle; label `positive-strong`.
- **Upcoming**: the step number in `ink-3` on a `line-soft` circle; label `ink-3`.

Circle `space-24`, number `caption` bold; label `label` bold.

## Props
- `steps: { id: string; label: ReactNode }[]`: the steps in order.
- `current: number`: index of the current step (0-based). Steps before it are done, steps after it are upcoming. Past the last step, every step is done.
- Native `<ol>` attributes; `className` for layout only.

## Variants
None. The three step states come from `current`.

## Built from
Icon.
