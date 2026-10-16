# useSheetDrag: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/useSheetDrag.ts`

## Change (1)

- [x] **fe5bb1348** · useSheetDrag handlers change each render and are duplicated
  - Now: The handlers (lines 26-58) are plain functions, rebuilt each render. They are returned both loose and inside `dragProps` (lines 73-81). Closing depends on distance only (line 52).
  - Do: Wrap the handlers in `useCallback`, return only `dragProps` (plus `dragOffset`, `isDragging`, `reset`). Optionally also close on a fast flick with `velocityThreshold`.
  ```tsx
  const { dragProps, dragOffset } = useSheetDrag({ onClose });
  ```

## Keep: do NOT change (1)

- **fe88e0dc0** · useSheetDrag only drags down with a fixed distance: Leave as is (owner approved Keep).

## README

No README.
