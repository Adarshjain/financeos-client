# RuleCard

A record card for lists where each item has several facts and actions (categorisation rules). Grid of three on desktop, one column on phone.

## Anatomy
- Header: name (`rt`) with "match type · **pattern**" under it; the used count alone at the top right.
- Status line: status word (amber Unverified or green Verified) · source · MCC.
- Bottom row: category chips, then Approve (unverified only) and ⋮ (Find matches · Edit rule · Delete rule).

## Selection mode (phone)
Long-press starts it. Selected cards turn `brand-tint` with a `brand` outline; on every card the eye icon replaces Approve and ⋮ and opens the edit sheet.

## Props
- The card draws a rule the page hands it; its ⋮ items (Find matches, Edit rule, Delete rule) and the Approve action come from the page as props, with their labels.

## Built from
Card, StatusWords, CategoryChip, Menu, Button, Checkbox (desktop selection).

## Variants
- Unverified (with Approve), selected, verified (⋮ only), and a card in selection mode that is not selected (eye only).
