# Rail

The desktop left navigation, 240px (`rail`). Phone uses TabBar and More instead.

## Anatomy
Brand slot, search slot, navigation groups with `overline` headers, and pinned footer slot.

## Use
- The current page is `brand-tint` with `brand-strong` text and icon.
- Counts: Rendered as a Badge (`solid`, `rounded`, `sm`) using `formatCount(count)`.
- Items are buttons or links (`asChild`), icons `lg`, labels `body-strong`.

## Props
- `groups`: `{ label?: string, items: { id: string, label: ReactNode, icon?: ReactNode, count?: number | string, countTone?: 'danger' | 'warning' | 'neutral' | 'ink', asChild?: boolean, children?: ReactNode, onSelect?: () => void }[] }[]`
- `value`: active item id (`string`)
- `defaultValue`: initial active item id (`string`)
- `onValueChange`: callback when active item changes (`(value: string) => void`)
- `onSelect`: callback when an item is selected (`(id: string) => void`)
- `brand`: custom brand slot (`ReactNode`)
- `search`: custom search slot (`ReactNode`)
- `footer`: custom pinned footer slot (`ReactNode`)

## Built from
Icon, Badge (count), Slot.

## Variants
- Default, with badges, without header, with footer.
