# CategoryPicker

The picker that sets a transaction's category (owner-approved "Bloom", 2026-11-01). One Dinero Dialog: a bottom sheet on phone, a centred dialog on desktop. It sets a category and, optionally, a sub-category from the fixed list; every row saves at once.

## Anatomy
- Header: "Category" with the transaction under it ("Swiggy · ₹486.00").
- A compact search line (Search icon, no autofocus on phone).
- Grid: the direction's categories, flat, in the list's order, no headings: round tinted icon, name under it. 4 columns on phone, 6 on desktop. The current category's icon is filled (`brand`).
- Recent row (above the grid): one line of FilterChips ("Category · Sub"), scrolls sideways; hidden when `recent` is empty.
- Sub list (a tap on a category that has sub-categories): back button, the big icon, the name; the sub-categories, then **Others** last ("Category with no sub-category"). The current sub is ticked; Others is ticked when the current pick has no sub, and by default. A tick saves nothing.
- Search results (text typed): rows with the category icon, "Category · Sub", and a hint ("Category", "Sub-category", or the everyday word that matched, marked). A result with a sub-category saves; a category result opens its list.

## Behaviour
- Tapping any row saves at once (`onPick`) and closes: no Use button. A category with no sub-categories saves in one tap from the grid.
- Reopening shows the current pick (grid mark, sub tick). Closing changes nothing.
- Money out shows the out categories, money in the in categories; both-way ones appear in both. Sub-categories are filtered the same way.
- Search finds category names, sub-category names and everyday words/shops from a small client-side synonym list (`src/lib/categorySearch.ts`).

## Props
- `open`, `onOpenChange`: the Dialog's.
- `categories: CategoryDef[]`: the fixed list (GET /category-list), whole; the picker picks the part for `direction`.
- `direction?: 'OUT' | 'IN'`: money out (default) or in.
- `value?: CategoryPick | null`: `{ categoryKey, subcategoryKey | null }`, the current pick.
- `onPick?: (pick: CategoryPick) => void`: a row was tapped.
- `recent?: CategoryPick[]`: recent one-tap picks (empty until their data is wired).
- `title?`, `subtitle?`: the header lines.
- `initialCategoryKey?`, `initialQuery?`: open on a category's list, or with a search typed (stories).

## Built from
Dialog, TextField, Button, ListRow, FilterChip, Highlight, Icon, Text. The round icon tile is a gap in Dinero (no round icon exists): a `span` of tokens inside this organism.

## Variants
Grid · Sub list · Search · Money in (the stories; the desktop form is the same story at the 1440 viewport).
