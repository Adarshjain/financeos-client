# AppBar

The phone app bar (the desktop shell is Rail and TopBar): the brand mark (or a back arrow on detail screens), breadcrumb and screen title, then Ask the data, Search and the one + (`brand` fill) that adds whatever the screen is about.

## Use
- Every phone screen has exactly one. It replaces a body title: phone pages never repeat the title as an H1.
- The **+** is page-aware: on Transactions it opens Quick add, on Rules it opens New rule, on Accounts it opens Add account. Never add a second "New …" button in the page header.
- Detail screens swap the mark for a back arrow (`back`).

## Consumer provides
`crumb` (section path, optional), `title`, `back` (boolean), the add target for the +.

## Don't
- Don't put page actions (Export, Merge…) here; they live in the page or in a ⋮ menu.
- Don't wrap the title; it truncates with an ellipsis.

## Built from
Button, Icon. The desktop shell is Rail and TopBar.
