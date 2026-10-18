# Tabs

A tab strip that switches between sibling views of one section (All · Rules · Categories · Import).

## Use
- Tabs never wrap: on phone the strip scrolls sideways and bleeds to the screen edges.
- Put counts in the label only when they help decide where to go ("Tradebook · 38").
- **Route tabs** (owner, 2026-10-19): on an object page each tab is its own route (`/accounts/7`, `/accounts/7/statements`, …), so each tab loads only its own data. Items carry the app's link as `asChild` + `children`; the page passes the current route's tab as `value`. Arrow keys then only move focus (`activationMode` defaults to `manual` when any item is a link); click or Enter follows the link.
- **Counts load on their own.** A tab renders without its count while the count loads (`count` undefined) and the count appears when it arrives. Never hold the strip back for counts.
- The active tab is `brand-strong` text with a 2px `brand` underline.

## Don't
- Don't use tabs for filters on the same data; that is what filter chips are for.
- Don't put a Settings tab on an object page; settings belong in its edit sheet.

## Underline
- The current tab's underline is a straight 2px `brand` bar the full width of the label: square ends, no radius. The tab itself has no rounded corners.

## Built from
Radix Tabs; the count after a label is `ink-3` text, not a bubble. Active styling uses Radix state (`data-active:`).

## Props
- Root: `items` (array of `{ value, label, count?, disabled?, asChild?, children? }`; with `asChild`, `children` is one link element such as `<Link href="/accounts/7/statements" />` and the label and count are put inside it), `value`, `defaultValue` (defaults to first item, pass `""` for no initial selection), `onValueChange`, `activationMode` (default `automatic`, or `manual` when any item is a link), standard Radix Tabs props.
- TabsList: standard Radix Tabs.List props (roving focus and arrow keys handled natively by Radix).
- TabsTrigger: `value`, `count`, `disabled`, `asChild` (children is one link element whose own children are the label), children. A disabled link tab does not navigate.
- TabsContent: `value`, children (no opinionated vertical padding).

## Variants
- Plain, with counts (loaded or still loading), as links (route tabs), and scrolling (never wrapping) when they overflow on phone. One working story drives them all through controls.
