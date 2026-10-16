# FieldFrame: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/FieldFrame.tsx`

## Change (1)

- [ ] **f8447c1c4** · FieldFrame takes no ref or native props
  - Now: The props type (lines 5-15) is a fixed list; `className` is the only pass-through. `helperId` is set on both error and helper (lines 51, 58), and each field works out `aria-describedby` itself.
  - Do: It is internal, so only change it if it becomes public. Then: `forwardRef<HTMLDivElement, FieldFrameProps>`, extend `Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>`, spread the rest on the root `div`.

## Keep: do NOT change (3)

- **fe9076451** · FieldFrame writes '(Optional)' inside the component: Generic control wording that any app would use; fine as a default.
- **f7ef35975** · FieldFrame hides the helper when there is an error: No page needs this flexibility yet; add it when one does.
- **f0b2a036d** · FieldFrame is internal, not in the barrel: FieldFrame is internal plumbing for the fields, so keeping it out of the public barrel is correct.

## README

No README.
