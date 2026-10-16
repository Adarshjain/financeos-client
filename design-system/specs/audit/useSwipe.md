# useSwipe: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/useSwipe.ts`

## Change (1)

- [ ] **fdf8ea915** · useSwipe fires its action on a cancelled gesture
  - Now: `onPointerCancel: onPointerUp` (line 125). When the browser cancels a drag (for example it takes over for scrolling), `onPointerUp` still checks the offset and can call `onSwipeLeft`/`onSwipeRight`.
  - Do: Give `onPointerCancel` its own function that clears the drag and offset and never calls the swipe callbacks.
  ```tsx
  const onPointerCancel = () => { draggingRef.current = false; setIsDragging(false); setOffset(0); };
  ```

## Keep: do NOT change (2)

- **f4fc2efc3** · useSwipe has hidden fixed distances: Leave as is (owner approved Keep).
- **ff33318d8** · useSwipe ignores starts on certain elements, not configurable: Leave as is (owner approved Keep).

## README

No README.
