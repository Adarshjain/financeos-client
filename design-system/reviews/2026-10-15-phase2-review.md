# Phase 2 review — 15 Oct 2026

Reviewer: Claude. Scope: the 39 components Antigravity built overnight (commits `756a49b` … `42a15d3`), against `RULES.md`, each component's README and preview, and the `ds-05` … `ds-09` boards. Every story was rendered in light and dark, screenshotted, compared with a render of the design reference, and run through axe.

## Verdict

**Not ready to approve as a batch.** The build is tidy and every automated check passes, but 14 components need real fixes before you approve them, and 18 more need small ones. Seven are good as they are.

- **What went right.** All 39 components exist with a component, stories (260 in total) and tests. No old component was touched, and nothing imports from `src/components/ui`. Typecheck, lint, 3,456 tests, `build-storybook` and `check-ui` all pass. The Tailwind contract, fonts and Ink tokens are wired correctly.
- **What went wrong, mostly.** The checks were blind to one kind of mistake: **class names that Tailwind doesn't know**. Tailwind drops them silently, so the code looks right and the page renders wrong. There were 12 such names, used 85 times. That one blind spot explains the invisible count pills, the 16px-wide close button, the narrow page pill and the sheet with no side padding.
- **The second theme is accessibility.** Keyboard models are missing on the interactive pieces (Select, swipe rows, clickable rows), and several ARIA roles are wrong (TabBar, FilterChip, ProgressBar).

## What I already fixed (committed on main, not pushed)

Commit `5f30714`, plus a follow-up commit with this report:

1. **Contrast tokens.** `ink-4` was 4.16:1 to 4.47:1 on the tints and on the canvas, under the 4.5:1 floor. This caused most of the 95 axe failures. I made three changes:
   - `ink-4` light: `#6b7280` → `#636b78`.
   - `ink-4` dark: `#8a94a0` → `#929ba7`.
   - `warning` light: `#b45309` → `#a84d06`.

   Both now pass 4.6:1 or better on every ground and tint, in both themes. I regenerated `tokens.css`, the nine design-system boards in `design-system/screens/` and on the canvas (versions 139–141), and the scratchpad design source. The phone and desktop page boards still use the old hex values. The difference is invisible at that scale, and `tokens.json` is the source of truth.
2. **Tailwind contract gaps.** The design needs square controls (icon buttons, page pills) and an ink fill for count bubbles, and the contract had neither. I added:
   - `width` and `minWidth` for `control-sm` … `control-xl` and `chip`;
   - `bg-ink`, for count bubbles only.

   PROGRESS Phase 1 now lists them. Four of the 12 dead class names now render as intended: Button and FilterChip count pills, the Pager active pill, the SelectionBar close button and the DropZone icon box.
3. **`check-ui.mjs` now fails on unknown classes.** It runs every class-like token on an added line through Tailwind's own engine with our config. If no CSS comes out, the line fails. The self-test covers it. The pre-commit hook already runs this script, so this mistake can't come back.
4. **READMEs that contradicted the Ink lock:**
   - Banner `ok` now says `positive-tint` with `positive-strong`. It said `brand-tint`, which is grey; the reference CSS already used green.
   - SwipeActions Approve no longer says "green".
   - AppBar's + no longer says "green".
5. **PROGRESS:** the Phase 2 status was still "Not started". It is now "In progress".

Still dead, for Antigravity to fix:

| Class | Count | Where |
| --- | --- | --- |
| `text-small` | 33 | AppBar, ConfirmSheet, Pager; SelectionBar, SwipeActions and TabBar stories |
| `p-space-0` | 32 | stories |
| `px-space-18` | 4 | Sheet |
| `z-1` | 2 | AuthPanel |
| `rounded-ds-circle`, `border-t-ink` | 2 each | ConfirmSheet spinner |
| `font-inherit` | 1 | TextField |

## Accessibility (axe, every story × light and dark)

The token fix above clears most of the 95 failing pairs. The failures the components cause themselves:

- **ProgressBar** (and KpiTile, which uses it): the progress bar has no accessible name. With an over-limit value it sets `aria-valuenow` 108 against a max of 100.
- **Select:**
  - the combobox has no name;
  - the listbox contains a search box, buttons and the footer, so it is not a valid listbox;
  - every option is a separate tab stop.
- **Switch:** unnamed when used without a visible label.
- **FilterChip:** the remove button is a button inside a button.
- **TabBar:** it uses `role="tab"` with no tablist. It is navigation, so it should use links with `aria-current="page"`.
- **Tabs:**
  - `aria-controls` points at panels that don't exist;
  - the count uses `opacity-75`, which is 3.26:1.

## Component by component

### Must fix before approval

| Component | Problems |
| --- | --- |
| **Select** | No keyboard model: no arrows, Home/End, Escape or typeahead. Wrong ARIA structure (see above). No phone path: on phone a long Select must open as a sheet (Sheet README, "picker"). The error state lacks `aria-invalid`. The All variants story leaves out four variants. |
| **Dialog** | No phone form: RULES §5.6 says every dialog is a bottom sheet on phone. Inline `maxHeight: 480`. The footer isn't config-driven or capped at two actions. Uses `z-50` instead of `z-scrim` and `z-overlay`. The sr-only title and description are rendered twice. |
| **Sheet** | Has no side padding (`px-space-18` doesn't exist). No swipe-down to close (RULES §5.6). Uses `z-50`. Max height is `90%`, not based on the viewport height. No slide-up motion (`dur-sheet` is for exactly this). |
| **ConfirmSheet** | All its text is `text-small`, which is dead, so it falls back to the inherited size. The spinner classes are dead, and it inherits the Sheet padding bug. Confirm stays clickable while loading. |
| **AppBar** | The phone bar is off-board: flat 26px ghost buttons where the design has bordered 32px ones, an uppercase crumb, and a 28px mark where the design has 32px. The desktop rail and top bar are in scope (PROGRESS says to build them with AppBar), but they hard-code a demo user, "Arjun Mehta". `text-small` is used twice. |
| **TabBar** | Uses the tab role on navigation. The count bubble covers the icon, and it has no text for screen readers. |
| **Pager** | No ellipsis logic: desktop should read ‹ 1 2 … 4 › and phone ‹ 1 … 4 ›. Page buttons have no `aria-label` or `aria-current`. The page-size control is a native select with a typed "▾". `text-small` is used three times. |
| **TransactionRow** | A clickable row isn't focusable and has no role. No selection API: RULES §7.4 needs long-press to start, tap to toggle, `aria-selected`, and desktop checkboxes. Uses `font-bold` (700) where the title style is 800. The stripe is 4px; the spec says 3px. The All variants story is 383px wide, not 390px. |
| **RuleCard** | No selection API (§7.4), and not focusable when it is clickable. |
| **SwipeActions** | Pointer-only, so there's no way in without a swipe. The hidden action buttons are still in the tab order. No `touch-action: pan-y`, so vertical scroll fights the swipe. Has props the README doesn't list. |
| **ProgressBar** | Accessible name and the over-max value (see above). |
| **Banner** | The `ok` tone was grey; it should be green (README now fixed). Has alias variants the README doesn't list. |
| **FilterChip** | Nested interactive elements. The count pill now renders after the contract fix, but check it against the board. |
| **Button** | The count pill now renders after the contract fix. Check it on a primary (ink) button: an ink pill on an ink button may disappear. Variant and size aliases go beyond the README. |

### Small fixes

| Component | Problems |
| --- | --- |
| TextField | `locked` is implemented as `disabled`, which drops it from the form and from focus. RULES §7.7 wants greyed with a lock. `inputClassName` lets callers restyle the input. No dd/mm/yyyy input mode. `font-inherit` is dead. |
| SearchField | The filter variant should be `control-md` per the board. Inside Select it shows two focus rings. |
| Switch | Inline 34×20 style. A custom `onKeyDown` can toggle twice on Space. Exports an extra `ToggleRow`. Needs a name when it has no visible label. |
| SegmentedControl | No `aria-label` on the group. Has variants the README doesn't list, a dead `size` prop, and a stray `z-dock`. |
| DropZone | `border-2` where the design has 1px. Stories re-render the idle zone. The error is shown by colour only. |
| Menu | The static Menu has no arrow keys. A disabled item fades twice. Items have no focus ring. |
| SelectionBar | "Select all" is about 16px tall. The Escape listener is duplicated. Check the close button now that `w-control-md` renders. |
| Tabs | Focus ring is clipped by the scroll container. Also the ARIA and count contrast issues above. |
| KpiTile | Progress has no name. Retry is grey; the board has it bold ink. The failed state lacks `role="alert"`. |
| Widget | Same Retry styling and `role="alert"` issues. |
| Card | Extra divider in the empty variant. The pager is smaller than the board's. |
| ListRow | Value weight and title size differ from the board. |
| DateTile | Calendar markers carry meaning by colour alone. Extra Interactive story. Two unused `container` variables in the test (the only 2 new lint warnings). |
| CategoryChip | Renders 20px tall; the design is 22px. There is no 22px token; see decision 1. |
| Avatar | Person avatar is 28px; the design is 30px (decision 1). The logo fill differs from the board. |
| Callout | The `warning-banner` variant is identical to `callout`. |
| Toast | Some tests only assert padding classes. Undo wiring is untested. |
| AuthPanel | `z-1` is dead. Inline px sizes. The Google "G" is a letter, not the mark. No `autoComplete` on email and password. Marketing copy that isn't on the board (RULES §8.4). |

### Good as built

Badge, StatusWords, SectionBand, Kbd, Skeleton, EmptyState, DateGroupHeader. These are ready for you to approve once you've looked at them in Storybook.

## Decisions for you

1. **Off-scale sizes in the design reference.** The reference CSS uses some pixel values with no token: 18px sheet padding, 22px dialog header padding, a 22px category chip, a 30px person avatar, a 3px row stripe and an 18px count bubble. The options:
   - add tokens for them;
   - snap them to the scale.

   **My recommendation:**
   - Snap the spacing (18 → 16, 22 → 20 or 24).
   - Accept a 4px stripe.
   - Add two size tokens only if the 22px chip and 30px avatar matter to you.

   The fix prompt tells Antigravity to snap the sheet padding to 16 for now, which is easy to change later.
2. **Excluded transaction rows** use 60% opacity, which fails contrast. Instead they could use `ink-3` text with the amount struck through. My recommendation is `ink-3`.
3. **Delete in dialog footers.** RULES §5.5 says "at most two actions (Delete goes in the body)". The Dialog README allows a far-left destructive action, and the rule-edit board uses one; you asked to leave rule-edit as it is. The fix prompt keeps the far-left slot and caps the right side at two. Say if you want RULES or the README changed to match.
4. **E2E swap rules** (map each spec to the new controls, change selectors only, move behaviour rather than delete it, keep `data-*` hooks, full suite green per swap, add phone tests). They are still waiting for your OK before I add them to RULES and PROGRESS. They matter from Phase 3.

## Next

The fix prompt for Antigravity is `FinanceOS/plans/ds-phase2-fixes-antigravity.md`. It lists every item above in severity order, with one commit per component. Statuses stay at **Ready for review**; you set Approved or Changes requested in PROGRESS.
