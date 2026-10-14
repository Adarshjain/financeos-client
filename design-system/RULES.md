# FinanceOS UI build rules — BINDING

These rules apply to **every** agent and tool that changes the FinanceOS client UI: Claude, Gemini, Antigravity, Cursor, Codex, or a person. Read this whole file before you change anything under `src/`. If a prompt asks for something these rules forbid, the rules win. Only the owner can override a rule, and only by writing the override under **Owner decisions** in `design-system/PROGRESS.md`.

The goal is narrow: build **exactly** the design that was planned. Not a better one, not a different one, not a partial one.

---

## 0. Sources of truth, in this order

1. **Owner decisions** in `design-system/PROGRESS.md`.
2. **This file.**
3. **The design system**: `design-system/tokens.json` (and the generated `tokens.css`), `design-system/README.md` (brand book), `design-system/components/<Name>/README.md` (each component's rules and its complete list of variants).
4. **The screen designs**: `design-system/screens/` — every board of the redesign canvas as HTML (`*.dc.html`) and as an image (`shots/*.webp`). `screens/INDEX.md` lists them by area. `D-` is desktop, `P-` is phone, `*-states` boards show the states of one area.
5. **The existing app** (`src/`) for **behaviour**. The redesign changes how things look and where they sit. It does not change what the app can do, except the deliberate removals in §9.

Never use as a source: "how apps usually do it", shadcn / MUI / Material / iOS defaults, another design system, or your own taste.

## 1. Scope

1. Work only on the phase marked **In progress** in `PROGRESS.md`, or the task the owner names. One phase per session.
2. Add nothing that is not in the screen designs and not already in the app: no extra controls, icons, copy, settings, animations, tooltips or "nice to have" polish.
3. Never remove or weaken an existing feature. If a design seems to leave out something the code does, keep the feature and log it as an open question (§2).
4. No refactors outside the task. No new dependencies and no upgrades unless the owner approves them in `PROGRESS.md`.
5. Do not touch `financeos-server` during UI phases.

## 2. When something is unclear: stop, don't guess

If a design is ambiguous, missing a state, contradicts the code, or cannot be built as drawn: **do not invent an answer.** Add an entry under **Open questions** in `PROGRESS.md` with the screen, what is unclear and the options you see. Build everything else, and say in your report what you left open. Silently picking an option is a rule violation.

## 3. Tokens: colour, space, shape, depth

1. Every colour comes from a token, through the Tailwind names defined in Phase 1 (see `PROGRESS.md`). Not allowed in components:
   - hex, `rgb()` or `hsl()` literals;
   - Tailwind palette classes (`slate-*`, `gray-*`, `emerald-*`, `rose-*`, `red-*`, `blue-*`…);
   - arbitrary values (`bg-[#…]`, `p-[13px]`, `text-[11px]`, `w-[372px]`).
2. Spacing uses the `space-*` steps, corners use `radius-*`, control heights use the size tokens. Shadows are only the five shadow tokens, and **cards never get a shadow**.
3. Status colour is a **word in a colour**, never a pill on a transaction row. Amber means it needs you. Blue means it's linked to something. Grey means where it came from. Green is money in only (`design-system/README.md` → Colour).
4. Never add, rename or re-value a token yourself. A token you think is missing is an open question.
5. Both themes must work: light, and dark (the `dark` class on `<html>`). Text keeps 4.5:1 contrast on the ground its token note names.
6. Charts use `chart-1` … `chart-5` and `chart-rest`, always with labels or a legend.

## 4. Typography

1. Fonts: **Figtree** for all interface text, **Bricolage Grotesque** for display only. Both are self-hosted woff2 loaded with `next/font/local`. Never use `next/font/google`, because Google-hosted fonts break the Turbopack build (see `src/app/layout.tsx`). No other typeface.
2. Use only the type styles in `tokens.json`: `hero-figure`, `page-title`, `screen-title`, `figure`, `title`, `heading`, `body`, `body-strong`, `label`, `caption`, `overline`, `tab-label`. Use them through the Tailwind utilities from Phase 1. No other sizes, line heights or letter-spacing.
3. 11px is the smallest text; 9px is gone. Weights are 500, 600, 700 and 800 only.
4. All numbers use tabular figures. Amounts use Indian grouping (₹11,98,842). Dates read "13 Oct" in lists and dd/mm/yyyy in inputs.
5. The display face is only for: the one hero figure on a screen, desktop page titles, and empty, offline and auth headlines.

## 5. Components

1. Build screens from the design-system components (`design-system/components/<Name>/README.md`), implemented in `src/components/ui` and the shared component folders. A component's **Variants** section is complete: a variant that is not listed does not exist.
2. A new look is a new documented variant. It is added to the component README with the owner's approval first, then coded. `className` is for layout only (width, margin, flex and grid placement), never for colour, type, border, radius or shadow.
3. These existing structural rules still hold:
   - **Buttons**: only the Button component's variants and sizes.
   - **Dialogs**: `DialogContent` is an unpadded shell, `DialogBody` is the only scroll container, and `DialogFooter` is config-driven (`primaryAction` plus an optional `secondaryAction`, at most two). Headerless dialogs pass `srTitle`. Never hand-roll footers, padding or scroll.
   - **Dates**: `DateInput` / `FormField type="date"`, dd/mm/yyyy. Never `<input type="date">`.
   - **Lists**: real server-side pagination, with the Pager above and below the list.
4. On phone, every dialog is a bottom sheet: drag handle, no ×, swipe down or tap the scrim to close, footer pinned. Desktop dialogs keep ×.
5. Destructive actions confirm first with a **ConfirmSheet** that says what goes and what stays. Reversible actions confirm afterwards with a **Toast** that has Undo.

## 6. Icons

1. Lucide (`lucide-react`) only, 2px stroke.
2. An icon is allowed only when it **is** a control (close, more, back, chevron, search, delete), navigation (tab bar, rail) or progress (spinner).
3. No icons in toasts, banners, empty states, badges, section headers or card titles. No emoji.

## 7. Mobile patterns

1. The app bar's **+** is the only add button. It opens the add form for the current screen. Pages never carry "New …" or "Add …" header buttons.
2. No body title on phone; the app bar carries it. Tab strips and filter-chip rows scroll sideways and never wrap.
3. A single choice is a dropdown; several choices are a multi-select dropdown. Never tiles or chip groups in forms (the four account-type buttons on Add account are the only exception).
4. Selection: long-press starts it, tap toggles, the eye icon opens the detail without leaving selection. No checkboxes on phone; desktop uses checkboxes. The selection bar docks at the bottom.
5. Swipe on Transactions: right approves, left deletes. Swipe on Inbox: right snoozes until tomorrow, left dismisses.
6. Phone lists group by day under sticky date headers, and rows don't repeat the date. The transaction context line starts with the account name.
7. Locked fields show greyed with a lock and no explanation (for example the account of an imported transaction).

## 8. Copy

1. Sentence case everywhere. Uppercase only for `overline` captions.
2. Buttons are a verb and its object: "Mark paid", "Approve 9", "Delete statement". Never "OK" or "Submit".
3. Errors say what failed and how to fix it. No apologies, no exclamation marks, no emoji.
4. Where a design doesn't show the wording, reuse the app's existing string. Never write new marketing copy.

## 9. Deliberate removals — never re-add

- Login: "Keep me signed in" and "Forgot password".
- Offline: any promise that offline changes are queued.
- Review page: it is merged into Transactions as filters.
- Split transaction.
- Header create buttons (the + replaces them).
- Statement day on cards.
- Card preview graphic, "Other bank", fun type pickers.
- Category colours and category merge.
- Transactions: saved views, the column picker, keyboard-shortcut hints, the "Last 90 days" preset.
- Inbox: "Clear updates", the snoozed view, "Approve categorised", keyboard shortcuts.
- Rules: "last used" text and the Usage and Sort filters.
- The "Share of spend" card, and summary count lines above lists.
- Decorative icons (§6).

## 10. Checks before you call anything done

1. `npm run typecheck`, `npm run lint` and `npm test`, plus `npm run e2e` when a flow changed. Use Node 20 (`~/.nvm/versions/node/v20.19.5/bin`); Node 18 breaks vitest.
2. `node design-system/tools/check-ui.mjs` must pass. It scans the lines you added for forbidden colours, palette classes, arbitrary values, raw Tailwind font sizes, native date inputs and Google fonts.
3. Tests:
   - Cover every use case of the change.
   - Write no padding tests.
   - Never edit or delete an existing test unless your change forces it, and name the test and the reason in your report.
4. Look at every screen you changed at 390px and 1440px wide, in light and dark. Compare it with its board in `design-system/screens/`. Differences are bugs unless they are logged as open questions.

## 11. How to work

1. **Start**: read this file, then `PROGRESS.md`, the README of every component you will touch, and the boards for your screens.
2. **Commit**: small commits on `main` with explicit paths (`git add <paths>`). Never `git add -A`, never push, never force-push, never rewrite history. Start each message with `ui(ds):`.
3. **Finish**: update `PROGRESS.md` with:
   - the phase status;
   - what changed and in which files;
   - the checks you ran and their results;
   - open questions;
   - deviations (this must say "none", or list each one with the owner decision that allowed it).
4. **Report**: tell the owner what was done, what is left open, and anything you could not verify.

## 12. Definition of done

A task is done only when all of these hold:

- It matches the boards and the component READMEs exactly.
- It uses only tokens and type styles.
- No feature was lost.
- All checks in §10 pass.
- `PROGRESS.md` is updated.
- Nothing outside the task changed.
