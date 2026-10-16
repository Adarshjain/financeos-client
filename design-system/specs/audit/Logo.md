# Logo: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** Organism: move to `src/components/organisms/Logo/` (G1).

**Files:** `src/components/ds/Logo/Logo.stories.tsx`, `src/components/ds/Logo/Logo.tsx`

## Change (2)

- [ ] **f257d491f** · Logo 'All variants' uses hand-made wrappers
  - Now: Logo.stories.tsx:29-34 wrap the Logos in `p-space-16 bg-canvas ... font-text` and a flex row div.
  - Do: Delete the story. A decorator or `parameters.backgrounds` gives the canvas look.
- [ ] **f8b3f77ec** · Logo MarkSm, MarkMd and Full differ only by args
  - Now: Logo.stories.tsx:39-58 are three stories that set `variant` and `size`, which are already controls.
  - Do: Keep one `Default` story. Add `WithWordmark` only if a state is not reachable with controls.

## Owner's own call (1)

- [ ] **f42d5fb1b** · Logo 'All variants' hard-codes three Logos
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).

## Keep: do NOT change (2)

- **f66e15800** · Logo is the FinanceOS brand with a fixed wordmark and ₹: Organism component (app layer): FinanceOS copy is fine there.
- **fc3ca98d3** · Logo wordmark is not a prop: Organism component: no extra slots needed.

## README

Move `design-system/components/Logo/README.md` to `src/components/organisms/Logo/README.md` and update its Props, Variants and Built from sections to match the component after these changes.
