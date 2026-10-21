# Radio

A round choice mark for one-of-many rows: the Mark paid choice, the installments choice, and single-choice open lists.

## Use
- 16px circle, 2px `line-strong` border; on = `brand` ring with a centred 8px `brand` dot.
- Selecting never moves anything: the circle keeps its size and border width in every state; only the ring colour and the dot change.
- Hover `bg-hover`, pressed one step further; the on ring and dot step to `brand-hover` / `brand-pressed`.
- A radio can be selected but never cleared by a second click.
- A row of choices = ListRow with `leading={<Radio …/>}` and the row's `onClick` selecting it; the page owns which one is checked.

## Props
- `checked?: boolean`
- `defaultChecked?: boolean`
- `onCheckedChange?: (checked: boolean) => void` (fires only with `true`)
- `disabled?: boolean`
- `name?: string`, `value?: string`
- Plus native button attributes and ref forwarded to the button (`role="radio"`).

## Built from
Native button with `role="radio"`; no icon.

## Variants
- Off, on, disabled.
