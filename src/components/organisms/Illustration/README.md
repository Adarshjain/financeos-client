# Illustration

The flat artwork on the sign-in, sign-up, offline and empty screens, as one component so pages never draw art themselves. Shapes from the palette only: `illus-mint` ground, tint blobs (`positive-tint`, `warning-tint`, `info-tint`), white tiles (`bg-surface`, `line`, `shadow-raise`), the card in `brand`, the coin in `illus-gold` with `illus-gold-edge`. No photos, people or mascots. Decorative, hidden from screen readers.

## Props
- `variant`: `'signin' | 'signup' | 'offline'` (required)
- `className`: `string` (optional)
- Standard HTML div attributes (`...props`)

## Variants
- **signin**: the desktop left panel of Sign in: logo, the scene (a card, a net-worth tile, a bill-paid tile, a points coin), the line "Every rupee, every card, every loan. One calm ledger." with its two-line copy and the trust line. On phone the copy hides and the scene shrinks to a band above the form.
- **signup**: the same panel for Sign up: the scene (statement imported, Gmail connected, card advice, a lending reminder) and the three setup steps.
- **offline**: the sleeping ₹ coin under a cloud (used by EmptyState's offline variant).

## Panel
- The sign-in and sign-up panels run edge to edge in their column: no corner radius, no border. Pages never override that through `className`.

## Phone
- Each variant has a phone form: the scene shrinks to a band above the form and the copy hides. Use the Storybook viewport toolbar to preview on mobile.

## Built from
Logo (in the sign-in and sign-up panels).
