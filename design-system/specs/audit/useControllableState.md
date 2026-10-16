# useControllableState: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/useControllableState.ts`

## Change (1)

- [ ] **fdea275de** · useControllableState has three gaps
  - Now: Controlled mode is decided each render (line 15), so switching modes goes unnoticed. `set` takes only a value (line 18). `onChange` runs even when the value did not change.
  - Do: Warn in development when a component switches between controlled and uncontrolled. Let `set` accept a function `(prev) => next`. Skip `onChange` when `Object.is(next, current)`. Use it in SearchField.
  ```tsx
  set(prev => !prev)
  ```

## README

No README.
