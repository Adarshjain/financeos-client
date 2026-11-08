# BankLogo

One bank's logo in the small square frame (24px, square corners; owner 2026-11-02: bank logos never get a radius). Used as the icon in the bank Select and its selected value.

## Props
- `bankId`: `string | null` (the server's id, such as `hdfc`)
- `name`: `string` (first letter fills the fallback tile)
- `warning`: `boolean`, default `!bankId` (shows the amber mark; pass `false` for accounts with no bank, such as wallets and brokers)
- `size`: `'sm' | 'md' | 'lg'`, default `lg` (the 24px tile). `md` is the same tile at 20px, beside a page title (the account page's top bar). `sm` is the plain 14px logo (icon `sm` step, no tile) for inline use beside text, such as the account name on a transaction row; with no known bank it renders nothing (no letter tile, no warning).

## Variants
- Known bank: its cell cut from the single sprite `public/banks/sprite-<hash>.png` (20 banks, 96px cells in one row; logos from github.com/praveenpuglia/indian-banks, Amex from `scripts/bank-logos`).
- Unknown or no id: the first letter of `name` in an Avatar `square` `sm`.
- `warning` true (by default when there is no id): plus a filled amber `warning` Icon `xs` at the tile's top right, like a count badge (owner, 2026-10-20).

## Built from
Avatar (fallback), `src/features/banks` (ids, cell index). The sprite and `bankSprite.generated.ts` are built by `scripts/build-bank-sprite.mjs` (pass an indian-banks checkout); adding a bank means adding its slug there and rerunning.
