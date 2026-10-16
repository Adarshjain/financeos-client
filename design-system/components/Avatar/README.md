# Avatar

Identity marks: rounded-square initials for accounts, circles for people, the bank's own logo for institutions.

## Sizes
One scale for every variant: `sm` 24 (lists and pickers), `md` 32 (default), `lg` 44 (profile, account header). The variant changes shape and fill, never the size.

## Props
- `variant`: shape of the avatar: `rounded` (default, `radius-md`), `circle` (`rounded-ds-pill`), `square` (`radius-sm`).
- `tone`: fill and text colour: `neutral` (default, `bg-canvas text-ink-2`), `brand` (`bg-brand-tint text-brand-strong`), `inverse` (`bg-brand text-on-brand`).
- `size`: `sm`, `md` (default), `lg`.
- `initials?: string`: letters displayed when no image is loaded.
- `src?: string`: image URL. Falls back to initials on error or when absent.
- `alt?: string`: image alt description.
- `imgProps?: React.ImgHTMLAttributes<HTMLImageElement>`: attributes passed to the underlying `<img>`.

## Built from
Nothing else.

## Variants
- Shape: rounded, circle, square.
- Tone: neutral, brand, inverse.
- Image with fallback to initials.
