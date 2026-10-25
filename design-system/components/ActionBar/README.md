# ActionBar

The page-level action bar docked at the bottom: Cancel and Save on the report editor, with an "Unsaved changes" note and a ⋯ menu on the left. Same family as SelectionBar (surface, border, shadow-up, padding), added 2026-10-25 on the owner's approval.

## Use
- Phone: fixed above the floating tab bar, with the tab bar's gutter (`space-12`) at `bottom-clearance`, so it never hides the tab bar (SelectionBar does). It floats as a rounded card (`radius-2xl`) rather than a bottom-docked sheet so the tab bar pill underneath keeps its own gutter.
- Desktop: a floating pill centred at the bottom (`bottom-safe-12`), like SelectionBar's desktop form.
- Actions come as data in the Dialog footer shape and are drawn in one row, left to right: tertiary, secondary, primary. Only the primary is filled (`primary`, or `danger-filled` when `destructive`); the others are `link` (`danger-link` for `tone: 'danger'`). Buttons keep their natural width and shrink on phone so the `start` slot fits.
- Content: the page adds `pb-bottom-clearance desk:pb-space-96` to the end of its content so nothing sits behind the bar.

## Props
- `actions: { tertiary?, secondary?, primary? }`, each `{ label, onSelect?, type?, form?, disabled?, loading?, tone?, icon? }` (`primary` also `destructive?`); same types as Dialog's `DialogAction`.
- `start?: ReactNode`: left side, a note and/or a Menu.
- Native div props, `className` (layout only), `ref` on the outer fixed element.

## Built from
Button, Icon (action `icon`), the surface shared with SelectionBar (`dockedBarSurface`). The `start` slot holds Text and Menu from the page.

## Variants
- Default (Cancel + Save report), with start note and menu, loading primary, disabled primary.
