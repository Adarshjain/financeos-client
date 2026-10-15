# FinanceOS UI build rules — BINDING

These rules apply to **every** agent and tool that changes the FinanceOS client UI: Claude, Gemini, Antigravity, Cursor, Codex, or a person. Read this whole file before you change anything under `src/`. If a prompt asks for something these rules forbid, the rules win. Only the owner can override a rule, and only by writing the override under **Owner decisions** in `design-system/PROGRESS.md`.

The goal is narrow: build **exactly** the design that was planned. Not a better one, not a different one, not a partial one.

**How the build works** (the owner's plan):
1. A **new** component library is built in `src/components/ds/`, beside the existing UI, in **Storybook**. The owner reviews each component there.
2. Pages are then rebuilt **one page or one big component at a time** from the approved components, and swapped in.
3. Old components become dead code as pages move over. They are deleted only at the end, once everything is migrated.

Existing components are **never modified** to become the new design.

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
6. **Never modify existing components** (`src/components/ui/` and every feature folder) to restyle them. New code lives in `src/components/ds/`. In Phase 3, the only edits to old code allowed are the ones that swap the page being migrated over to new components.
7. **Never delete old code before Phase 4.** In Phase 4, delete a file only after proving nothing imports it.
8. **New code never uses old UI.** New components and new pages import UI only from `src/components/ds/`: nothing from `src/components/ui/`, other `src/components/*` folders, or `components/` folders under `src/app/`. Logic they need (hooks, queries, mutations, pure helpers) is first **moved** out of the old UI folder into `src/lib/` or `src/features/<area>/`, with the old components importing it from its new home: moved, never copied. If a page needs a piece of UI the new library doesn't have, that is an open question before the page is built, never a reason to borrow an old component. `check-ui.mjs` fails on these imports.

## 2. When something is unclear: stop, don't guess

If a design is ambiguous, missing a state, contradicts the code, or cannot be built as drawn: **do not invent an answer.** Add an entry under **Open questions** in `PROGRESS.md` with the screen, what is unclear and the options you see. Build everything else, and say in your report what you left open. Silently picking an option is a rule violation.

## 3. Tokens: colour, space, shape, depth

1. Every colour comes from a token, through the Tailwind names fixed in `PROGRESS.md` (Phase 1). In the app the CSS variables are `--ds-<token name>` (generated in `design-system/tokens.css`), so they never clash with the existing theme. Not allowed in new components:
   - hex, `rgb()` or `hsl()` literals;
   - Tailwind palette classes (`slate-*`, `gray-*`, `emerald-*`, `rose-*`, `red-*`, `blue-*`…);
   - arbitrary values (`bg-[#…]`, `p-[13px]`, `text-[11px]`, `w-[372px]`).
2. Spacing uses the `space-*` steps, corners use `radius-*`, control heights use the size tokens. Shadows are only the five shadow tokens, and **cards never get a shadow**.
3. Status colour is a **word in a colour**, never a pill on a transaction row. Amber means it needs you. Blue means it's linked to something. Grey means where it came from. Green is money in only (`design-system/README.md` → Colour).
4. Never add, rename or re-value a token yourself. A token you think is missing is an open question. A pixel value in a preview or reference CSS that has no token (for example 18px padding) is an open question too: never round it silently and never invent a class name for it.
5. Use only the class names listed in the Phase 1 contract in `PROGRESS.md`, plus Tailwind's own defaults. Tailwind silently drops a name it does not know, so a made-up name like `px-space-18` or `text-small` renders nothing. `check-ui.mjs` fails on them.
6. Both themes must work: light, and dark (the `dark` class on `<html>`).
7. Charts use `chart-1` … `chart-5` and `chart-rest`, always with labels or a legend.

## 4. Typography

1. Fonts: **Figtree** for all interface text, **Bricolage Grotesque** for display only. Both are self-hosted woff2 loaded with `next/font/local`. Never use `next/font/google`, because Google-hosted fonts break the Turbopack build (see `src/app/layout.tsx`). No other typeface.
2. Use only the type styles in `tokens.json`: `hero-figure`, `page-title`, `screen-title`, `figure`, `title`, `heading`, `body`, `body-strong`, `label`, `caption`, `overline`, `tab-label`. Use them through the Tailwind utilities from Phase 1. No other sizes, line heights or letter-spacing.
3. 11px is the smallest text; 9px is gone. Weights are 500, 600, 700 and 800 only.
4. All numbers use tabular figures. Amounts use Indian grouping (₹11,98,842). Dates read "13 Oct" in lists and dd/mm/yyyy in inputs.
5. The display face is only for: the one hero figure on a screen, desktop page titles, and empty, offline and auth headlines.

## 5. Components

0. The behaviour rules in this file (§5.5–§5.7, §7) apply to every component they describe, even when the component's README does not repeat them. When this file and a README disagree, this file wins (§0).
1. Each design-system component (`design-system/components/<Name>/README.md`) is built as a **new** component in `src/components/ds/<Name>/`:
   - `<Name>.tsx`, `<Name>.stories.tsx` and `<Name>.test.tsx`;
   - exported from `src/components/ds/index.ts`.

   Its **Variants** section is complete: build every variant listed, and nothing that isn't.
2. New components may use the libraries already in the repo: Radix, cmdk, Sonner, lucide-react. They must **never import from `src/components/ui/`** or any other old component, so the old code can be deleted later.
3. A new look is a new documented variant. It is added to the component README with the owner's approval first, then coded. Props carry variants. `className` is for layout only (width, margin, flex and grid placement), never colour, type, border, radius or shadow.
4. A component may be used in a page only after its status in `PROGRESS.md` is **Approved**.
5. These structural rules carry over to the new components:
   - **Buttons**: only the Button component's variants and sizes.
   - **Dialog**: one component for every overlay. An unpadded shell; the body is the only scroll container; the footer is config-driven with at most two actions plus an optional tertiary destructive action (far left on desktop, end of the body on phone); headerless dialogs take an `srTitle`.
   - **Dates**: DateField shows and accepts dd/mm/yyyy, with a calendar to pick from. Never `<input type="date">`.
   - **Lists**: real server-side pagination, with the Pager above and below the list.
6. On phone, every Dialog renders as a bottom sheet: drag handle, no ×, swipe down or tap the scrim to close, footer pinned. Desktop dialogs keep ×. The viewport picks the form; pages never choose.
7. Destructive actions confirm first with a **ConfirmDialog** that says what goes and what stays. Reversible actions confirm afterwards with a **Toast** that has Undo.

## 5b. Composition (no duplicates)

1. **Layers.** Tokens → primitives (Icon, Button, Badge, Avatar, Checkbox, Switch, TextField, TextArea, CategoryChip, StatusWords, ProgressBar, Kbd, Skeleton) → patterns (Popover, Dialog, Menu, Select, DateField, SearchField, FilterChip, Banner, Toast, ListRow, Card, SectionHeader, EmptyState) → composites (TransactionRow, RuleCard, KpiTile, Widget, Pager, SelectionBar, SwipeActions, DropZone, DateTile, SegmentedControl, Tabs) → shell (AppBar, TabBar, Rail, TopBar). A component uses the ones below it; it never re-draws them.
2. **Reuse, never copy.** If a component needs a button, count bubble, avatar, checkbox, icon, popover, section header or card, it imports that component. Hand-drawing one (a styled `<button>`, a `<span>` pill, a typed ▾) is a rule violation. Each README's **Built from** section lists what it must import; reviews check the imports against it.
3. **Variants are props.** A variant is never its own exported component (no `Note`, no `ReadOnlyRow`, no `ListRowIconTile`). Compound parts of one component (`Card.Header`, `Dialog.Footer`) are fine.
4. **One component per concept.** Before building something new, look for an existing component that does it. A new component that looks or behaves like an existing one is an open question, not a build.
5. **Shared behaviour lives in hooks** (`useSwipe`, the sheet drag), never copied between components.
6. **No app content inside components.** A design-system component never contains FinanceOS-specific things: no navigation items, routes, menu items, action lists, domain copy ("Add statements", "Set category", "Delete rule"), counts, user names or sample data. All of it arrives through props from the page or the app shell; stories supply realistic examples. Generic control words may be overridable defaults (Close, Clear, Cancel, Retry, Undo, Today, "Search…", "Loading…", Previous and Next page). Artwork inside Illustration is the only exception. `check-ui` fails on route literals in components.
7. **Every state is visible.** Interactive components show hover, pressed (different from hover), keyboard focus, disabled and, where it applies, loading and selected, using the state tokens (`bg-hover`, `bg-pressed`, `brand-hover`, `brand-pressed`, `danger-hover`, `danger-pressed`). Nothing moves or changes size between states.
8. **Server or client, on purpose.** A component that uses state, effects, refs, event handlers, Radix, Sonner or browser APIs starts with `'use client'`. A purely presentational component (Badge, Card, ListRow without handlers, SectionHeader, Banner, Skeleton…) has no directive and no hooks, so a Server Component page can render it with no client JavaScript. Never put `'use client'` in `index.ts`.

## 5c. Component standards (every component, no exceptions)

These are the rules a mature design system (Radix, Material, Polaris, Atlassian) follows. A component that breaks one is not done.

**Responsive**
1. **One component, one structure, one code path.** Phone and desktop are the same markup; what differs (size, position, what shows) is written with Tailwind breakpoint classes, mobile first. Never two render functions, never `renderPhone` / `renderDesktop`, never a `variant="phone" | "desktop"` prop. The page never chooses a form.
2. **One switch: `lg` (1024px).** Below it is the phone form, from it the desktop form. Components use only `lg:` for that switch (no `sm:`, `md:`, `xl:` inside components).
3. **No viewport detection in JavaScript** (`useMediaQuery`, `useIsPhone`, `matchMedia`, `innerWidth`). The server can't know the width, so it renders the wrong form and the page jumps. The one exception is **ResponsiveOverlay**, the single shared piece that opens a floating Popover on desktop and a bottom-sheet Dialog on phone (Select, Menu, DateField). It renders only while open, so it never causes a server/client mismatch. Nothing else may use these hooks.
4. **Touch vs mouse is not phone vs desktop.** Long-press responds to touch input (`pointerType === 'touch'`) on any screen. The desktop checkbox column is shown with `hidden lg:flex`, not by a hook.

**API**
5. **Prop names mean one thing everywhere:**
   - `variant` = visual style (`primary`, `secondary`…);
   - `size` = `sm` | `md` | `lg`;
   - `tone` = semantic colour (`neutral`, `success`, `warning`, `danger`, `info`).

   No `kind`, `status`, `type`, `appearance` or `intent` for these.
6. **State props follow Radix:**
   - `value` / `defaultValue` / `onValueChange`;
   - `checked` / `defaultChecked` / `onCheckedChange`;
   - `open` / `defaultOpen` / `onOpenChange`;
   - `selected` / `onSelectedChange`.

   Every stateful component works both controlled and uncontrolled. Never `onChange` for a value, never `isOpen`.
7. **Events are named for what the user did to the component**, not what the app does with it: `onSelect`, `onTrigger`, `onRemove`, `onOpenDetail`. Never `onApprove`, `onEditRule`, `onSetCategory`. Actions the app defines arrive as data (`actions={[{ id, label, icon, onSelect }]}`).
8. **One name per prop.** No aliases, no "legacy" or "backwards compatible" props.
9. **Composition:**
   - polymorphism through `asChild`;
   - compound parts as `Name.Part` (`Dialog.Footer`, `Card.Header`);
   - content through slots (`trigger`, `actions`, `footer`);
   - every component forwards its ref, spreads native props, and takes `className` for layout only.
10. **Content comes from props** (§5b.6). **States are visible** (§5b.7). **Server or client on purpose** (§5b.8).

**Proof**
11. Each README lists **Props** (with the names above), **Variants** and **Built from**. Stories are args-driven and interactive (§5a). Tests cover behaviour.
12. `check-ui.mjs` enforces what can be checked mechanically:
    - viewport hooks outside ResponsiveOverlay;
    - `phone` / `desktop` variant props;
    - old imports;
    - unknown classes;
    - typed glyphs;
    - hand-made buttons;
    - hard-coded routes.

    The rest Claude reviews in code before the owner sees it.

## 5a. Storybook

1. Each component gets one story per variant in its README, named exactly as the README names it, plus an **All variants** story that shows them side by side for review. **All variants** is the first story, so it opens by default. Story titles are `DS/<Group>/<Name>`, using the README's group (Foundations, Navigation, Actions, Inputs, Data display, Feedback, Overlays). There is no Screens group: pages are not components.
2. **Stories are driven by args.** Every prop shows in the Controls panel with a sensible control (a dropdown for each variant prop); each variant story is the component with different `args`. A story that hard-codes markup the Controls can't change is not allowed, except All variants. Every story is interactive in Storybook: a component with a controlled prop (`checked`, `value`, `open`, `selected`) is wired with `useArgs` (or uncontrolled defaults) so clicking, typing and toggling work in the canvas and update the Controls panel.
3. Every story can be viewed in light and dark and at phone (390px) and desktop (1440px) widths, through the global toolbar set up in Phase 1.
4. Stories use realistic FinanceOS content: ₹ amounts with Indian grouping, real-looking merchants and accounts like the boards. Never lorem ipsum.
5. Before a component is set to **Ready for review**, open its stories in a browser and compare them with its `preview.html` and its board, at 390px and 1440px, in light and dark. The log line names the stories you compared and any differences left open. Passing the commands in §10 is not enough.
6. Accessibility (ARIA roles, screen-reader text, contrast audits) is out of scope by owner decision. Don't spend work on it.
7. No stories for old components.

## 6. Icons

1. New components draw icons only through the **Icon** component: **Phosphor** (`@phosphor-icons/react`, SSR entry) in the **bold** weight, picked by registry name from `design-system/icons.json`, at `sm` 14, `md` 16 or `lg` 20 (the `icon-*` tokens). Never import Lucide or Phosphor directly in a design-system component, never type a glyph (▾ ✕ ✓ › ‹) as an icon, and every icon inside one control is the same size. A new icon goes into the registry with the owner's approval first. Old components keep Lucide until Phase 4. (Migration: Icon still wraps Lucide until the round after the restructure switches it to Phosphor; until then keep using Icon as it is.)
2. An icon is allowed only when it **is** a control (close, more, back, chevron, search, delete), navigation (tab bar, rail) or progress (spinner).
3. No icons in toasts, banners, empty states, badges, section headers or card titles. No emoji.

## 7. Mobile patterns

1. The app bar's **+** is the only add button. It opens the add form for the current screen. Pages never carry "New …" or "Add …" header buttons.
2. No body title on phone; the app bar carries it. Tab strips and filter-chip rows scroll sideways and never wrap.
3. A single choice is a dropdown; several choices are a multi-select dropdown. Never tiles or chip groups in forms (the four account-type buttons on Add account are the only exception).
4. Selection: long-press starts it, tap toggles, the eye icon opens the detail without leaving selection. No checkboxes on phone; desktop uses checkboxes. The selection bar docks at the bottom.
5. Swipe on Transactions: right approves, left deletes. Swipe on Inbox: right snoozes until tomorrow, left dismisses. SwipeActions only reports the swipe to the page; the page confirms (destructive) or applies with Undo (reversible) by §5.7.
6. Phone lists group by day under sticky date headers, and rows don't repeat the date. The transaction context line starts with the account name.
7. A field that can't change is disabled (for example the account of an imported transaction). There is no locked state.

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
2. `npm run build-storybook` succeeds, and `node design-system/tools/check-ui.mjs` must pass. It scans the lines you added for forbidden colours, palette classes, arbitrary values, raw Tailwind font sizes, native date inputs and Google fonts.
3. Tests:
   - Cover every use case of the change.
   - Write no padding tests.
   - Never edit or delete an existing test unless your change forces it, and name the test and the reason in your report.
4. Look at every screen you changed at 390px and 1440px wide, in light and dark. Compare it with its board in `design-system/screens/`. Differences are bugs unless they are logged as open questions.
5. **E2E during page swaps (Phase 3).** The end-to-end suite is the proof that no feature was lost.
   - Before swapping a page, list every E2E spec that touches it and map each step to the new control that replaces the old one.
   - Change selectors only. Never weaken an assertion, delete a step or skip a test to make it pass. If a behaviour moves (for example a header button becomes the app bar +), move the test step with it.
   - Keep the `data-*` hooks the specs use, and put them on the new controls.
   - The full E2E suite is green before the swap is committed, not just the touched specs.
   - Add phone-width (390px) coverage for the page's main flow when the page gets a phone-specific pattern (bottom sheet, swipe, long-press selection).

## 11. How to work

1. **Start**: read this file, then `PROGRESS.md`, the README of every component you will touch, and the boards for your screens.
   - **Phase 2**: build one component at a time, set it to **Ready for review**, and stop. The owner approves it or asks for changes.
   - **Phase 3**: every page, signed-out ones included (`/ds/login`, `/ds/signup`, `/ds/offline`), is first built as a new route under `/ds/…` (for example `/ds/login`, `/ds/transactions`), with the same data and behaviour as the live page, while the live page stays untouched. The owner reviews it there. Only after the owner approves does the live route switch to the new page (the swap), with the E2E rules in §10.5, and the `/ds/…` copy is removed. Put the new files' paths in `design-system/checked-paths.txt` and add a row to the migration map in `PROGRESS.md`: the page, its new files, and the old files it no longer uses.
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

- It matches the boards and the component READMEs exactly, and for Phase 2 the owner has approved it in Storybook.
- It uses only tokens and type styles.
- No feature was lost.
- All checks in §10 pass.
- `PROGRESS.md` is updated.
- Nothing outside the task changed.
