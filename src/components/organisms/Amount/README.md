# Amount

A money figure that owns its sign, its colour and its hiding. Used wherever an amount stands outside a TransactionRow (search results, detail header, dialogs, link lists).

## Anatomy
- Formatted with `formatMoney` from `@/lib/format`: `decimals` defaults to `auto` (paise only when there are some).
- `direction="credit"`: "+" sign and the `positive` tone. `direction="debit"`: plain ink, no sign (the value's sign is ignored). No `direction`: the value's own sign, ink.
- Hidden amounts read "₹ —" in ink, never green, so the colour gives no direction away. The app's hide-amounts switch (`ConcealProvider`) hides it; `concealed` hides it on its own.

## Props
- `value: number`: the amount
- `direction?: 'credit' | 'debit'`
- `concealed?: boolean`: hide even with the app switch off
- `decimals?: 'whole' | 'auto' | 'exact'`: default `auto`
- `symbol?: boolean`: `false` leaves the ₹ off
- `prefix?: string`: words before the amount ("You owe")
- Text pass-through: `variant` (default `body-strong`), `fraction="small"`, `as`, `align`, `className`

## Built from
Text, `useConcealed`, `CONCEAL_PLACEHOLDER`, `formatMoney`.
