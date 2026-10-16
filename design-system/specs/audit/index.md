# index: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/index.ts`

## Change (3)

- [ ] **fbbaaa5bd** · Foundations doc components are in the public barrel
  - Now: `index.ts` line 16 exports `./Foundations/Foundations` (the token-showing components for Storybook).
  - Do: Remove the line. Stories import from `../Foundations/Foundations` directly.
- [ ] **fc4029848** · FinanceOS components are exported from the core barrel
  - Now: `index.ts` exports `RuleCard` (line 30), `SelectionBar` (35), `StatusWords` (37), `TransactionRow` (47) and `Widget` (52).
  - Do: Export components and their prop types only. Organisms (TransactionRow, RuleCard, Illustration, Logo, SettingsToggle) move to `src/components/organisms/` and leave the Dinero barrel. StatusWords, Widget, KpiTile, DateTile and DropZone stay in Dinero as generic components.
- [ ] **fa9f03d44** · The barrel is wide and skips three helpers
  - Now: `FieldFrame`, `itemRow` and `useMediaQuery`/`useIsPhone` are not exported. `export *` publishes every exported type.
  - Do: The barrel exports components and prop types only, plus the new `./utils` (formatCount, formatDate, parseDateInput, todayISO, formatMonth, weekdayLetters). `useMediaQuery` and `ResponsiveOverlay` are deleted so they are not exported. _(per G10)_

## README

No README.
