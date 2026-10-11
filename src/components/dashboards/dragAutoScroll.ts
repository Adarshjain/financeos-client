// Edge auto-scroll for the dashboard grid. react-grid-layout never scrolls the
// page during a drag, and on a phone the drag also blocks the native touch
// scroll, so a widget could not be moved past the visible part of the
// dashboard. While a drag runs, holding the pointer near the top or bottom of
// the viewport scrolls the window, faster the closer it is to the edge. After
// each step the last pointer position is replayed to the document, so the
// dragged widget follows the page without waiting for the next pointer move
// (a held finger fires no touchmove).

import { useCallback, useEffect, useRef } from 'react';

/** Distance from the top edge (px) where scrolling up starts. */
export const AUTO_SCROLL_EDGE_TOP = 96;
/** Taller at the bottom: on a phone the nav and the action bar cover it. */
export const AUTO_SCROLL_EDGE_BOTTOM = 160;
/** Fastest step (px per frame), reached right at the edge. */
export const AUTO_SCROLL_MAX_STEP = 18;

interface Pointer {
  x: number;
  y: number;
  /** The touch being tracked; null for a mouse drag. */
  touchId: number | null;
}

/** Scroll step for a pointer at `y` in a viewport `height` tall: negative = up, 0 = outside both zones. */
export function autoScrollStep(y: number, height: number): number {
  if (y < AUTO_SCROLL_EDGE_TOP) {
    const depth = Math.min(1, (AUTO_SCROLL_EDGE_TOP - y) / AUTO_SCROLL_EDGE_TOP);
    return -Math.ceil(AUTO_SCROLL_MAX_STEP * depth);
  }
  const bottomStart = height - AUTO_SCROLL_EDGE_BOTTOM;
  if (y > bottomStart) {
    const depth = Math.min(1, (y - bottomStart) / AUTO_SCROLL_EDGE_BOTTOM);
    return Math.ceil(AUTO_SCROLL_MAX_STEP * depth);
  }
  return 0;
}

/** Starts edge auto-scroll on `win`; the returned function stops it. */
export function startDragAutoScroll(win: Window = window): () => void {
  const doc = win.document;
  let pointer: Pointer | null = null;
  let replaying = false;
  let frame = 0;

  const onMouseMove = (e: MouseEvent) => {
    if (!replaying) pointer = { x: e.clientX, y: e.clientY, touchId: null };
  };
  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!replaying && touch) pointer = { x: touch.clientX, y: touch.clientY, touchId: touch.identifier };
  };

  // react-draggable listens for moves on the document and reads only the
  // coordinates (and, for touch, the identifier it started with).
  const replay = (p: Pointer) => {
    replaying = true;
    try {
      if (p.touchId == null) {
        doc.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y, bubbles: true }));
      } else {
        const touch = { identifier: p.touchId, clientX: p.x, clientY: p.y };
        const event = new Event('touchmove', { bubbles: true, cancelable: true });
        for (const list of ['touches', 'targetTouches', 'changedTouches']) {
          Object.defineProperty(event, list, { value: [touch] });
        }
        doc.dispatchEvent(event);
      }
    } finally {
      replaying = false;
    }
  };

  const tick = () => {
    if (pointer) {
      // The visible part of the page: the visual viewport when pinch-zoomed, else the window.
      const view = win.visualViewport;
      const step = view
        ? autoScrollStep(pointer.y - view.offsetTop, view.height)
        : autoScrollStep(pointer.y, win.innerHeight);
      if (step !== 0) {
        const before = win.scrollY;
        win.scrollBy(0, step);
        if (win.scrollY !== before) replay(pointer);
      }
    }
    frame = win.requestAnimationFrame(tick);
  };

  doc.addEventListener('mousemove', onMouseMove);
  doc.addEventListener('touchmove', onTouchMove);
  frame = win.requestAnimationFrame(tick);

  return () => {
    win.cancelAnimationFrame(frame);
    doc.removeEventListener('mousemove', onMouseMove);
    doc.removeEventListener('touchmove', onTouchMove);
  };
}

/** `start`/`stop` for the grid's onDragStart/onDragStop; also stops on unmount. */
export function useDragAutoScroll() {
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const start = useCallback(() => {
    stopRef.current?.();
    stopRef.current = startDragAutoScroll();
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop };
}
