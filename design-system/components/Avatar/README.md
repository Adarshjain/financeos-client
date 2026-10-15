# Avatar

Identity marks: rounded-square initials for accounts, circles for people, the bank's own logo for institutions.

## Sizes
One scale for every variant: `sm` 24 (lists and pickers), `md` 32 (default), `lg` 44 (profile, account header). The variant changes shape and fill, never the size.

## Variants
- **account**: rounded square (`radius-md`), `bg-canvas`, `ink-2` initials.
- **person**: circle, `brand-tint`, `brand-strong` initials (lending counterparties, profile).
- **logo**: the fetched bank logo image (`src`), rounded square (`radius-sm`); falls back to account initials when there is no logo. Never draw a bank's mark yourself.

## Built from
Nothing else.
