---
name: financeos-ui
description: Use for ANY change to the FinanceOS client UI — components, screens, styles, Tailwind config, fonts, or a design-system build phase. Loads the binding rules in design-system/RULES.md and the shared plan in design-system/PROGRESS.md, and walks through the required start, build and finish steps so the build matches the approved design exactly.
---

# FinanceOS UI build

The rules in `design-system/RULES.md` are binding. Follow them exactly; when a request conflicts with them, the rules win unless `design-system/PROGRESS.md` records an owner override.

## Start
1. Read `design-system/RULES.md` in full.
2. Read `design-system/PROGRESS.md`. Find the phase marked "In progress" or the task the owner named. If none is in progress, ask the owner which phase to start; don't pick one.
3. For each component you will touch, read `design-system/components/<Name>/README.md`. Its Variants list is complete.
4. For each screen, open its boards from `design-system/screens/INDEX.md`. Read the `*.dc.html` markup, look at `shots/*.webp`, and include the matching `*-states` board.
5. Read the current code for that screen or component, so you keep every existing behaviour.

## Build
- Use tokens and type styles only (RULES §3 and §4) and existing components and variants only (§5). Add an icon only when it is a control, navigation or progress (§6).
- Anything unclear, missing or contradictory: add it to Open questions in PROGRESS.md and carry on with the rest (§2). Never guess.
- Never re-add anything in RULES §9.
- Commit in small steps on `main` with explicit paths. Never push.

## Finish
1. Run `npm run typecheck`, `npm run lint`, `npm test` (Node 20) and `node design-system/tools/check-ui.mjs`; also `npm run e2e` when a flow changed.
2. Compare every changed screen with its board at 390px and 1440px, in light and dark.
3. Update PROGRESS.md: status, files, checks, open questions, deviations ("none" or each one with its owner decision).
4. Report what was done, what is open, and what you could not verify.
