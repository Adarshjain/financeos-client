# ChoiceCard

A selectable tile for picking one item from a set of rich options: title, description and a meta line. Owner exception to RULES §7.3 (2026-10-25), used by the dashboard widget picker (`D-widget-picker`, `P-widget-picker`).

## Use
- Cards sit in a grid the page sets through the group's `className` (3 columns on desktop, fewer on phone).
- The chosen card shows the Card `selected` ring (2px `brand`); it never changes the card's size or position.
- Hover `bg-hover`, pressed `bg-pressed`, keyboard focus ring. Disabled: text in `ink-4`, no hover or press, not clickable.
- The page passes all words, including the meta line (for example "Half width · needs: card" or a "Selected · …" prefix).
- Keyboard: one tab stop (the chosen card); arrow keys move the choice between enabled cards, skipping disabled ones.

## Props
- `ChoiceCard.Group`: `value?: string`, `defaultValue?: string`, `onValueChange?: (value: string) => void`, `className` (layout), plus native div attributes.
- `ChoiceCard`: `value: string`, `title: ReactNode`, `description?: ReactNode`, `meta?: ReactNode`, `disabled?: boolean`, plus native button attributes, ref to the button.

## Built from
Card (`asChild`, `selected`), Text. Roving keyboard written in the group (`@radix-ui/react-radio-group` is not a dependency).

## Variants
- Default, selected, with meta, disabled.
