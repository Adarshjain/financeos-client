FinanceOS is a personal money app for India, used mostly on phones: accounts, cards, transactions, investments, loans and lendings in one place. The interface is calm and dense, in ink with colour kept for meaning, and status told in words. Build every screen from these tokens and components; do not introduce new colours, sizes or radii.

## Content fundamentals

- **Write from the user's side.** Name things the way people say them: "Mark paid", "Upload statement", "Money due back", not "Settle liability" or "Ingest PDF".
- **Sentence case everywhere**: titles, buttons, chips, menu items. Uppercase only for `overline` captions.
- **Second person, no "I".** "You owe ₹12,000", "Rahul owes you". The app never speaks as a person and never apologises.
- **Numbers are the content.** Use Indian grouping (₹11,98,842; ₹1.55L, ₹4.2Cr in compact places), two decimals in transaction lists, none in totals. Credits carry a + sign. Dates read "13 Oct" in lists, dd/mm/yyyy in inputs.
- **Middle dots join facts**: "HDFC Regalia ••7741 · Unreconciled · Gmail". Card numbers show as ••7741.
- **Buttons are verb + object** and say exactly what happens: "Approve 9", "Save & apply", "Try again". Never "OK", "Submit", "Click here".
- **Errors say what failed and how to fix it**: "Enter an amount like 1,249.00", "Token expired (invalid_grant) · reconnect Gmail".
- **No emoji, no exclamation marks, no filler summaries** ("10 rules · 142 transactions categorised" lines were removed on purpose; counts live in filter chips).

## Visual foundations

### Colour
- Grounds: `bg-canvas` behind everything, `bg-surface` for cards, sheets, bars and inputs, `bg-sunken` for table headers, section bands and dialog footers, `bg-subtle` for sticky date bands and category chips.
- Text: `ink` for primary text and amounts, `ink-2` for labels, `ink-3` for secondary lines, `ink-4` for icons, placeholders and overlines. `ink-faint` is for non-text marks only.
- Lines: `line` around cards and bars, `line-soft` between rows, `line-strong` around controls, `line-handle` for the sheet handle and switch track.
- **Ink is the action colour.** `brand` is near-black ink (near-white in dark mode): primary buttons, the current tab, links, switches, progress and the current page; `brand-tint` (a light grey) marks selection. Colour is reserved for meaning, so the screen is monochrome until something needs you (amber), is linked (blue), brings money in or succeeded (green), or is dangerous (rose).
- **Success is green, not brand.** Badges and words that mean done or good (Paid, Done, Verified, Auto ingested) use `positive-tint` and `positive-strong`.
- Links are ink with a subtle underline (`line-strong`), so they stay recognisable without a colour.
- **Status is a word in a colour, not a tag.** `warning` (amber) means it needs you, `info` (blue) means it is connected to something, `ink-3` (grey) is provenance, `positive` is money in, `danger` is destructive or failed. The word always carries the meaning; colour supports it.
- Charts use `chart-1` … `chart-5` and `chart-rest` for "Everything else", always with a label or legend.
- Both themes are defined. Every text colour holds 4.5:1 on its documented grounds in light and dark. `line-strong` is the one known miss (1.4:1); controls also carry a label, fill or icon.

### Typography
- **Figtree** for all interface text (`--font-text`), **Bricolage Grotesque** for display moments (`--font-display`): the hero figure, desktop page titles and empty/offline/auth headlines. Both are on Google Fonts, both include the ₹ sign and tabular figures, which Instrument Sans, Onest, Outfit, Sora and Red Hat Text lack. Figtree's open, round letterforms stay legible at 11px on phones and are narrower than Manrope, so long merchant names and Indian-grouped amounts fit. Bricolage gives the money headlines a warm, characterful voice without becoming a novelty face.
- Use the scale and nothing else: `hero-figure` 30, `page-title` 24, `screen-title` 20, `figure` 22 (19 on phone), `title` 17, `heading` 14, `body` / `body-strong` 13, `label` 12, `caption` 11, `overline` 10, `tab-label` 10. 11px is the smallest text; 9px is retired.
- Weights: 500 for running text, 600 for controls, 700 for values and emphasis, 800 for titles and figures. No 400 in the UI.
- All numbers use tabular figures (`font-variant-numeric: tabular-nums`, already set on `.fos`) so amounts line up.

### Spacing and layout
- Spacing comes from `space-2` … `space-48`. Phone pages use a 14px side gutter (`space-14`) and 12px between blocks; desktop uses 28px gutters and 16px between blocks.
- Phone first. One column on phone; KPI tiles in two columns; card grids collapse to one column. Desktop adds the 240px rail (`rail`), a 56px top bar (`app-bar`) and multi-column layouts.
- Horizontal strips (tabs, filter chips) never wrap: they scroll sideways and bleed to the screen edges.
- Controls line up on fixed heights: `control-sm` 26, `control-md` 32, `control-lg` 36 for inputs, `control-xl` 44 for phone sheet footers and auth. Chips are `chip` 28.

### Shape, borders and shadows
- Radii: `radius-md` 8 for controls, `radius-lg` 12 for cards and menus, `radius-xl` 14 for record cards and dialogs, `radius-sheet` 22 for phone sheet tops, `radius-pill` for chips. `radius-sm` 6 for badges, `radius-xs` 4 for keys and tiny bars, `radius-2xs` 2 for legend swatches.
- Borders separate; shadows mean "floating". Cards never get a shadow. `shadow-pop` for menus and the desktop selection bar, `shadow-dialog`, `shadow-sheet`, `shadow-dock` for overlays, `shadow-raise` for auth illustration only.
- No gradients in the UI, no coloured left-border accents on cards. The only stripes are the 3px selection and monitoring stripes on transaction rows.

### States
- Hover and press: `bg-hover`. Selected: `brand-tint` (rows add a 3px `brand` stripe, cards a `brand` outline). Monitored: `watch-tint` with a `watch` stripe. Excluded: 60% opacity. Disabled: 45% opacity.
- Keyboard focus: a 2px `focus-ring` outline with 2px offset on every interactive element.

### Motion
`dur-fast` 120ms for hover and toggles, `dur-base` 200ms for menus and selection, `dur-sheet` 280ms for sheets and swipe-dismiss, easing cubic-bezier(.2,.8,.2,1). No shimmer or bounce; with reduced motion everything is instant.

### Imagery
Illustration only on auth, offline and empty screens: flat shapes from the palette (mint panel `illus-mint`, gold coin `illus-gold`, white tiles), no photos, no people, no mascots. Bank logos are the banks' own favicons at 22px; never redraw a bank's mark.

## Iconography
Phosphor icons (`@phosphor-icons/react`) in the **bold** weight, drawn through the Icon component by their registry name (`design-system/icons.json`). Four sizes only, from the `icon-*` tokens: `icon-xs` 10px beside button text (pass `size="xs"`); `icon-sm` 14px in chips, field carets and small buttons; `icon-md` 16px in buttons, bars, rows and menus; `icon-lg` 20px in the phone tab bar, desktop rail and selection bar. `currentColor` always. Never type a glyph (▾ ✕ ✓ ›) as an icon. Icons only where they are a control, navigation or progress: none in toasts, banners, empty states, badges, section headers or card titles. The old UI keeps Lucide until Phase 4.

## Mobile patterns (binding)
- **The app bar's + is the only add.** It opens the add form for the current screen. Pages never carry "New …" or "Add …" header buttons.
- **No body title on phone**; the app bar has it.
- **Single choice = dropdown, multi choice = multi-select dropdown.** No tiles or chip groups in forms.
- **Sheets, not dialogs**: on phone every Dialog is a bottom sheet with a handle, no ×, swipe down to close, body scrolls, footer sticks. One component; the viewport picks the form.
- **Selection**: long-press starts, tap toggles, eye opens the detail without leaving selection, no checkboxes on phone. The selection bar docks at the bottom.
- **Swipe** on Transactions: right approves, left deletes. On Inbox: right snoozes until tomorrow, left dismisses. Rows that can't do either don't swipe. The swipe only tells the page; the page confirms or applies (with Undo) by the rule below.
- **Reversible actions confirm with a Toast and Undo**; destructive ones confirm first with a ConfirmDialog that says what goes and what stays.
- **Lists** group by day under sticky date headers; rows never repeat the date. Long lists end in a Pager.
- **Filters** are one scrolling chip row under a full-width search; review filters sit in the same row as the rest.
- **Fields that can't change** (the account of an imported transaction, the type of an account) are disabled. There is no separate locked state.
- **Destructive actions** live in a ⋮ menu or at the bottom of an edit sheet, in `danger`, and always confirm.

## Intentional additions
These were not in the canvas and are added so the system is complete: the dark theme, the `focus-ring` token and focus style, `control-xl` 44px phone touch targets, the motion durations, and the change of typeface from Manrope to Figtree and Bricolage Grotesque. `ink-faint` was used for 10px captions on the canvas at 3.1:1; those captions move to `ink-4`.
