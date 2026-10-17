# TransactionRow

The phone transaction row: merchant and amount on top, a context line and category below. Status is told with coloured words, not tags.

## Anatomy
- Line 1: description (`heading`) · amount (700, tabular, credits `positive`). Running balance sits under the amount in `caption`, as the bare amount ("₹2,95,030", no "bal" prefix; owner 2026-10-17).
- Line 2, the context line, in this order: **account name first**, plastic (••7741), then amber review words, a note, blue link/record words, then grey provenance.
- Right of line 2: the first category badge (`Badge variant="outline" shape="rounded"`), plus a "+n" badge if there are more. A dashed amber "Set category" badge when none is set.
- Checkbox on desktop when selectable. Trailing chevron or eye icon in selection mode.

## Word colours
- Amber (`warning`, 700): needs you. Review reasons (Unreconciled, Category unverified, Duplicate, Date corrected) and Watching.
- Blue (`info`, 600): connected to something. Links show a small chain glyph (⛓ Transfer out, Refund); records show none (EMI #8 · HDFC car loan, Lending · Priya Nair, Dividend · INFY).
- Grey (`ink-3`): provenance. Gmail, Statement, Manual, Excluded.
- Green: credit amounts only (when `isCredit` is true).

## States
Selected (`brand-tint` with a 4px `brand` stripe), warning tone (`attention-tint` with a 4px `attention` stripe), disabled (60% opacity), selection mode (trailing eye icon opens the detail).

## Props
- `leading?: ReactNode`: Leading avatar or tile
- `description?: ReactNode`: Merchant or transaction description
- `amount?: ReactNode`: Formatted transaction amount
- `isCredit?: boolean`: Whether amount is a credit (+ positive green). Explicitly passed by caller.
- `balance?: ReactNode`: Running balance below amount
- `account?: ReactNode`: Account name
- `plastic?: ReactNode`: Card or plastic suffix (e.g. ••7741)
- `reviewStatus?: ReactNode`: Amber review status word
- `note?: ReactNode`: Note text
- `link?: string | TransactionLink`: Blue link or connected record `{ label, isRecord? }`
- `provenance?: ReactNode`: Provenance source
- `contextLine?: ReactNode`: Custom context line override
- `categories?: string[]`: Assigned categories array, rendered as `<Badge variant="outline" shape="rounded">`
- `unsetCategoryLabel?: ReactNode`: Label for unset category (rendered as dashed warning Badge)
- `onSetCategory?: () => void`: Click callback for unset category badge
- `onCategoryClick?: (category: string) => void`: Click callback for first category badge
- `onMoreCategoriesClick?: () => void`: Click callback for +n badge
- `tone?: 'default' | 'warning'`: Row visual tone (warning sets attention tint and 4px stripe)
- `disabled?: boolean`: Dimmed disabled state (60% opacity)
- `selectable?: boolean`: Whether row is selectable
- `defaultSelected?: boolean`: Uncontrolled initial selected state
- `selected?: boolean`: Controlled selected state
- `onSelectedChange?: (selected: boolean) => void`: Selection change callback
- `selectionMode?: boolean`: Phone selection mode (displays trailing eye button)
- `onDetail?: () => void`: Detail callback when trailing eye button is clicked
- `chevron?: boolean`: Trailing chevron indicator
- `borderTop?: boolean`: Whether to show top border line (default: true)

## Gestures

| Gesture | Outside selection mode | In selection mode |
|---|---|---|
| **Long-press** (500ms, touch or mouse, pointer held still on the item) | Selects the item **while the pointer is still down**, which turns on selection mode. Releasing afterwards does **nothing**: no tap, no toggle, no detail. | Selects the item if it isn't selected. Releasing does nothing. |
| **Tap** (press and release quickly) | Calls `onDetail` (opens the item). **Never selects.** | Toggles the item's selection. |
| **Enter / Space** on the focused item | Same as tap. | Same as tap. |
| **Scroll or swipe** (the pointer moves more than 10px, or the browser takes the gesture) | Cancels: no long-press, no tap. | Same. |
| **Press on a control inside the item** (checkbox, eye, Approve, ⋮ menu, category chip) | Only that control acts; the item doesn't. | Same. |

## Not here
- Swipe: the page wraps the row in SwipeActions. The row has no swipe props.
- Selection interaction is handled by `useSelectableItem`.

## Built from
Badge, StatusWords, Checkbox (desktop selection), Button, Icon (eye in selection). Hooks: `useSelectableItem`, `useControllableState`. Pages wrap it in SwipeActions for swipe.
