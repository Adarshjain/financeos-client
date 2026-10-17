# RuleCard

A record card for lists where each item has several facts and actions (categorisation rules). Grid of three on desktop, one column on phone.

## Anatomy
- Header: name with "match type · **pattern**" under it; the used count alone at the top right. Checkbox on desktop when selectable.
- Status line: status word (amber Unverified or green Verified) · source · MCC.
- Bottom row: category badges, then Approve (unverified only) and ⋮ menu (Find matches · Edit rule · Delete rule).

## Selection mode (phone)
Long-press starts it. Selected cards turn `brand-tint` with a `brand` outline; on every card the eye icon replaces Approve and ⋮ and opens the edit sheet.

## Props
- `name?: ReactNode`: Rule title or merchant name
- `matchType: ReactNode`: Match type ("Contains", "Starts with", "Exact")
- `pattern?: ReactNode`: Match pattern string
- `usedCount?: number | string`: Usage count shown at top right
- `status?: 'unverified' | 'verified'`: Verification status (default `'unverified'`)
- `source?: ReactNode`: Provenance or source
- `mcc?: ReactNode`: MCC code
- `statusLine?: ReactNode`: Custom status line override
- `categories?: string[]`: Assigned categories rendered as `<Badge variant="outline" shape="rounded">`
- `categoryContent?: ReactNode`: Custom category elements override
- `approveAction?: RuleCardApproveAction`: Approve action object `{ label, onSelect }`
- `onApprove?: () => void`: Approve callback
- `approveLabel?: string`: Approve button label (default `'Approve'`)
- `menuItems?: RuleCardMenuItem[]`: Kebab menu options `[{ label, onSelect, destructive? }]`
- `selectable?: boolean`: Whether the card is selectable
- `defaultSelected?: boolean`: Default selected state for uncontrolled usage
- `selected?: boolean`: Controlled selected state
- `onSelectedChange?: (selected: boolean) => void`: Callback when selection toggles
- `selectionMode?: boolean`: Phone selection mode (displays trailing eye icon)
- `onDetail?: () => void`: Callback when trailing eye icon is pressed

## Built from
Card, StatusWords, Badge, Menu, Button, Checkbox.

## Variants
- **Unverified**: amber unverified tag, Approve button, and kebab menu.
- **Verified**: green verified tag and kebab menu.
- **Selected**: tinted brand background with brand outline.
- **Selection mode**: trailing eye icon replaces actions.
- **With menu**: custom actions menu (Find matches, Edit rule, Delete rule).
