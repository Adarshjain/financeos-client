# StepList

The progress steps of a running or finished task.

## Use
- `live`: no container, compact rows while the task runs. The running step's label is bold ink; a failed step is danger.
- `card`: a bordered surface with line-soft dividers, meta right-aligned, a detail caption under the label, and, when a step has `code`, a link toggle that shows the code in a sunken mono box.
- Icons: done is a check, running is a spinning spinner, failed is a danger warning.

## Props
- `steps: { id, label: ReactNode, meta?: ReactNode, state: 'done' | 'running' | 'failed', detail?: ReactNode, code?: string }[]`
- `variant: 'live' | 'card'`
- `showCodeLabel?` / `hideCodeLabel?` (defaults `Show details` / `Hide details`)
- `openIds?`, `defaultOpenIds?`, `onOpenIdsChange?(ids)`: which steps have their code open (card).
- `className?`. Forwards `ref` to the list.

## Variants
- Live, live failed, card, card with code open.

## Built from
`Icon`, `Text`, `Button` (link).
