# /ds pages and the app shell: follow the new APIs

Read `00-global.md` first. The pages must **look exactly as they do today** (boards `D-login`, `P-login`, `D-signup`, `P-signup`, `P-more`, the Rail on `D-home`). Only the code changes, with two exceptions noted below.

Files:
- `src/app/(ds)/ds/(app)/layout.tsx`, `src/app/(ds)/ds/(app)/page.tsx`;
- `src/app/(ds)/ds/(public)/login/*`, `src/app/(ds)/ds/(public)/signup/*`, `src/app/(ds)/ds/(public)/offline/*`;
- `src/features/shell/ShellNav.tsx`, `src/features/shell/navigation.ts`;
- `e2e/ui/ds-auth.spec.ts`, `e2e/ui/ds-shell.spec.ts`, `e2e/ui/ds-offline.spec.ts`.

## Login and signup
- [x] **Google button (G11):** `<Button variant="secondary" size="xl" icon={<img src="/brand/google-g.svg" alt="" className="size-icon-md" />} className="w-full">Continue with Google</Button>`. The image is a layout-only element on the page. Check it matches the boards (full width, same height). If it doesn't, add an Open question and don't hand-style it.
- [x] **Illustration** now comes from `@/components/organisms`. Same props.
- [x] **Logo** (if used) now comes from `@/components/organisms`.
- [x] **`showToast`** keeps its call shape. Only Undo and actions changed (G6), and these pages don't use them.

## Offline
- [x] **EmptyState (G6):** its `action` is now `{ label, onSelect }`. Pass `action={{ label: 'Try again', onSelect: retry }}` instead of a Button node.
- [x] **The offline art and copy** no longer come from `EmptyState variant="offline"` (EmptyState spec). The page passes the `Illustration variant="offline"` organism as EmptyState's illustration, plus the title and description text it shows today ("You're offline" and the existing sentence).

## Shell (`ShellNav.tsx`, `navigation.ts`, layout)
- [x] **More sheet tiles (G11):**
  - Quick add: `<Button variant="secondary" layout="stacked" icon=…>`.
  - Section links: `<Button variant="secondary" size="xl" icon=… asChild className="w-full justify-start"><Link …/></Button>`.
  - Exception 1 (expected): the tiles take the secondary button look (border and corner of a secondary button), because the owner removed the tile variant (finding fb0f17b79). Everything else on `P-more` stays.
- [x] **TabBar and Rail counts (G2):** use the new Badge internally. Nothing changes for the shell, which still passes `count` and `countTone`.
- [x] **Rail (G15):**
  - `brand`, `search` and `footer` are slots.
  - The shell passes `brand={<Logo variant="full" />}` (organism) and `footer` (the Settings link plus the user's `<Avatar>`), with the initials computed in the shell from `name || email`, as today.
  - Rail no longer takes `user`.
  - Links use `asChild` with the Next `Link`.
- [x] **TopBar (G15):** `leading` slot. The shell passes `<Logo variant="mark" />` on phone, as today. Actions use `onSelect`.
- [x] **Icon names (G15):** `navigation.ts` uses the renamed registry glyphs (for example `transactions` becomes `list`, `accounts` becomes `wallet`). Use exactly the names in the updated `design-system/icons.json`.
- [x] **Organisms imports:** none are used in the shell except Logo.

## Index page
- [x] **EmptyState compact (EmptyState spec):** keeps working with `description`. Check it still renders the "No signed-in pages yet." line.

## E2E
- [x] **Update selectors only where markup changed** (RULES §10.5). Run `ds-auth`, `ds-offline` and `ds-shell` against the dev server, as in earlier rounds:
  ```
  INVITE_CODE=<from ../financeos-server/.env> E2E_SKIP_GATES=1 E2E_CLIENT_URL=https://localhost:6970 NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test e2e/ui/ds-auth.spec.ts e2e/ui/ds-offline.spec.ts e2e/ui/ds-shell.spec.ts
  ```
  All must pass. Paste the output.
- [x] Exception 2: none. Any other visible difference from the boards is a bug.
