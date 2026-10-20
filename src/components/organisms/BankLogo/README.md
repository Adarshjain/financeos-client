# BankLogo

One bank's logo in the small square frame (24px, `rounded-ds-sm`) Avatar `square` `sm` uses. Used as the icon in the bank Select and its selected value.

## Props
- `bankId`: `string | null` (the server's id, such as `hdfc`)
- `name`: `string` (first letter fills the fallback tile)

## Variants
- Known bank: its cell cut from the single sprite `public/banks/sprite.png` (19 banks, 96px cells in one row).
- Unknown or no id: the first letter of `name` in an Avatar `square` `sm`.
- No id: plus a filled amber `warning` Icon `xs` at the tile's top right, like a count badge (owner, 2026-10-20).

## Built from
Avatar (fallback), `src/features/banks` (ids, cell index). The sprite and `bankSprite.generated.ts` are built by a script; adding a bank means rebuilding both.
