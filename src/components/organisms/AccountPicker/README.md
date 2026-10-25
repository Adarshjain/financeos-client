# AccountPicker

The account dropdown used everywhere (owner, UAT 2026-10-25): single or multiple, only the account types asked for, always grouped by type, always searchable. A Select with account content, so it keeps every Select behaviour (single closes on pick, multiple has Cancel, Clear and Done).

## Props
- `accounts`: `Account[]`, all of them; the picker keeps the ones whose type is in `types`.
- `types`: `AccountType[]` (`bank_account`, `credit_card`, `generic` for a wallet, `broker` for an investment account). Groups always show in bank, credit card, wallet, broker order, whatever the order given.
- `multiple?: boolean`: `value` / `defaultValue` / `onValueChange` are `string | null` (single) or `string[]` (multiple).
- `leadingOptions?: SelectOption[]`: call-site extras shown first, ungrouped (such as "Unattributed").
- Everything else Select takes passes through: `label`, `placeholder`, `helper`, `error`, `disabled`, `size`, `className`, `trigger` (such as a FilterChip), `open` / `onOpenChange`, `action`, `clearLabel`, `discardLabel`, `doneLabel`, `searchPlaceholder` (default "Search accounts"). `options`, `groups`, `searchable` and `filter` are fixed by the picker.

## Variants
Single, multiple, a subset of types, with leading options, with a disabled option, disabled.

## Use
- Bank and credit-card options show BankLogo; an unknown or missing bank shows the first-letter tile, never the warning mark. Wallets and brokers show no logo. A single select shows the logo in the field too.
- Search matches name, bank name, last four and a broker's client id. A closed account shows the hint "Closed". A broker with a client id is labelled "Zerodha · ZQ4471" (so the field identifies the broker); accounts given as bare `{ id, name, type }` have no client id, so just the name.

## Built from
Select, BankLogo, and `accountGroups` in `src/lib/accounts/accountGroups.ts` (the group labels and order).
