# BankLogo

One bank's logo in the small square frame (24px, `rounded-ds-sm`) Avatar `square` `sm` uses. Used as the icon in the bank Select and its selected value.

## Props
- `bankId`: `string | null` (the server's id, such as `hdfc`)
- `name`: `string` (first letter fills the fallback tile)
- `warning`: `boolean`, default `!bankId` (shows the amber mark; pass `false` for accounts with no bank, such as wallets and brokers)
- `size`: `'md' | 'sm'`, default `md`. `sm` is the plain 14px logo (icon `sm` step, no tile) for inline use beside text, such as the account name on a transaction row; with no known bank it renders nothing (no letter tile, no warning).

## Variants
- Known bank: its cell cut from the single sprite `public/banks/sprite.png` (19 banks, 96px cells in one row).
- Unknown or no id: the first letter of `name` in an Avatar `square` `sm`.
- `warning` true (by default when there is no id): plus a filled amber `warning` Icon `xs` at the tile's top right, like a count badge (owner, 2026-10-20).

## Built from
Avatar (fallback), `src/features/banks` (ids, cell index). The sprite and `bankSprite.generated.ts` are built by a script; adding a bank means rebuilding both.
