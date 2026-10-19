# BankLogo

One bank's logo in the small square frame (24px, `rounded-ds-sm`) Avatar `square` `sm` uses. Used as the icon in the bank Select and its selected value.

## Props
- `bankId`: `string` (the server's id, such as `hdfc`)

## Variants
- Known bank: its cell cut from the single sprite `public/banks/sprite.png` (19 banks, 96px cells in one row).
- Unknown id: the id's first letter in an Avatar `square` `sm`.

## Built from
Avatar (fallback), `src/features/banks` (ids, cell index). The sprite and `bankSprite.generated.ts` are built by a script; adding a bank means rebuilding both.
