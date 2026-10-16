# useLongPress: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/useLongPress.ts`

## Change (1)

- [x] **fc37a1a8e** · useLongPress returns its handlers twice
  - Now: Lines 125-129 return the handlers spread and also as `handlers`. RuleCard uses the named ones (RuleCard.tsx:266-282).
  - Do: Return one shape: `{ handlers, consumeTriggered }`, and let callers spread `handlers`. Remove the loose copies.
  ```tsx
  const { handlers, consumeTriggered } = useLongPress({ onLongPress });
  ```

## Keep: do NOT change (1)

- **f1f5935f8** · useLongPress has fixed move distance and touch-only rule: Leave as is (owner approved Keep).

## README

No README.
