import { useSyncExternalStore } from 'react';

/**
 * Below this many pixels the layout/visual viewport mismatch is not a
 * keyboard: iOS reports a few px of drift while its toolbar collapses, and
 * hiding the nav for that would flicker.
 */
export const KEYBOARD_MIN_INSET = 50;

type ViewportMetrics = Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>;

/**
 * Height in CSS px of the on-screen keyboard overlapping the bottom of the
 * layout viewport, or 0 when none is open.
 *
 * A mobile keyboard shrinks only the visual viewport (iOS always; Android
 * unless `interactive-widget=resizes-content`), so `position: fixed; bottom`
 * elements stay pinned to the layout viewport, i.e. under the keyboard. The
 * overlap is the gap between the two viewports, including how far iOS panned
 * the visual viewport to reveal the focused field.
 */
export function computeKeyboardInset(vv: ViewportMetrics, innerHeight: number): number {
  // Pinch-zoom also shrinks the visual viewport; that is not a keyboard.
  if (Math.abs(vv.scale - 1) > 0.01) return 0;
  const inset = Math.round(innerHeight - (vv.height + vv.offsetTop));
  return inset >= KEYBOARD_MIN_INSET ? inset : 0;
}

function subscribe(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener('resize', onChange);
  // iOS pans the visual viewport (offsetTop) as well as resizing it.
  vv.addEventListener('scroll', onChange);
  return () => {
    vv.removeEventListener('resize', onChange);
    vv.removeEventListener('scroll', onChange);
  };
}

function getSnapshot() {
  const vv = window.visualViewport;
  return vv ? computeKeyboardInset(vv, window.innerHeight) : 0;
}

const getServerSnapshot = () => 0;

/**
 * Reactive {@link computeKeyboardInset}. 0 on the server, during hydration,
 * and in browsers without `visualViewport`.
 */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
