# Stepper

The steps of a multi-step flow and where the user is in it: "Files · Match instruments · Reconcile · Done" on the import wizard (`D-import-wizard`, `P-import-wizard`).

## Use
- It only shows progress. Steps are not clickable; the page's Back and primary buttons move between steps (board and the live wizard).
- The page places it, usually as the first row of a Card under the page's controls. The Stepper draws no card of its own.
- It never wraps. Desktop shows every step in one row; the phone shows only the current step and a bar (owner, 2026-10-18: the wrapping row looked poor and didn't fit a phone).

## Anatomy
**Desktop (from `lg`)**: one row of steps joined by lines. Each step is a circle and its label, `space-8` apart; the line between two steps stretches to fill the row, `space-12` from each step.
- **Done** (before the current step): `check` Icon in `on-brand` on a `brand` circle; label `ink-2` semibold. The line after it is `brand`.
- **Current**: the step number in `on-brand` on a `brand` circle with a 4px `brand-tint` ring; label `ink` bold.
- **Upcoming**: the step number in `ink-3` on a `surface` circle with a `line-strong` border; label `ink-3` semibold. The line after it is `line`.

Circle `space-24`, number `caption` bold; label `label`; line 1px.

**Phone (below `lg`)**: one line, "Step 3 of 4" in `caption` `ink-3` then the current step's name in `body` bold `ink` (truncated if long), over a bar of one `space-4` segment per step, `space-4` apart. Segments up to and including the current step are `brand`, the rest `line-soft`.

## Props
- `steps: { id: string; label: ReactNode }[]`: the steps in order.
- `current: number`: index of the current step (0-based). Steps before it are done, steps after it are upcoming. Past the last step, every step is done and the phone form stays on the last step.
- `stepLabel?: (step, total) => ReactNode`: the phone caption. Default "Step 3 of 4".
- Native `<div>` attributes; `className` for layout only.

## Variants
None. The three step states come from `current`; the phone and desktop forms come from the `lg` breakpoint.

## Built from
Icon.
