# Conceal

Hides money while the app says amounts are hidden (owner, 2026-10-23): every ₹ amount reads "₹ —", the same width everywhere. One switch, kept by the app, drives all of it.

## Use
`ConcealProvider` goes once above the pages (Toasts read the flag from a shared store, since the Toaster sits above it) and takes `concealed`; the app owns the state and where it is saved. Dinero components that draw an amount (Text with `fraction`, any text holding a ₹ amount, ListRow, Card and Widget headers, KpiTile, DataTable money cells in the app, TransactionRow) read it themselves. Wrap an amount the library does not draw (a Badge label, a custom cell) in `<Conceal>`. Fields where you type an amount are never hidden. The running balance line under a transaction amount is removed while hidden, not replaced.

## Props
Conceal:
- `children`: what to show while amounts are shown; a string or number is also the text that gets masked.
- `value?: string | number`: the text to mask when `children` is not a plain string (for example an amount split into whole and paise).
- `placeholder?: string`: what replaces a hidden amount (default "₹ —"); an empty string leaves the spot blank (the desktop Balance column).
- `whole?: boolean`: replace the whole text, for a bare amount with no ₹ ("3,600.00"). Without it only the ₹ amounts inside the text change and other words stay. An empty, whitespace-only or "—" value is left as is, since there is no amount to hide.

ConcealProvider: `concealed: boolean`, `children`. Hook: `useConcealed()`. Helper: `concealMoney(node)` for components that draw text from a prop.

## Built from
Nothing else.

## Variants
- Shown, hidden.
