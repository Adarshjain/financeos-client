'use client';

import { type RefObject,useCallback, useEffect, useRef } from 'react';

import { isPhoneLayout } from './phoneLayout';

export interface UseSheetDragOptions {
  /** Called once the close animation has finished (or at once with reduced motion). */
  onDismiss?: () => void;
  /** False turns the gesture off (full-screen or non-dismissible sheets). Read at gesture start. */
  enabled?: boolean;
  /** Element dimmed with the drag (the sheet's backdrop). Optional. */
  backdropRef?: RefObject<HTMLElement | null>;
  /**
   * Like `backdropRef`, for a scrim drawn by CSS (a pseudo-element) that has no element of its own: the hook writes
   * `--ds-scrim-opacity` (0 to 1) and `--ds-scrim-ease` (the transition to use, `none` while dragging) on this element,
   * and the stylesheet reads them (`ds.css`, dropdown sheets).
   */
  scrimRef?: RefObject<HTMLElement | null>;
}

const SLOP = 8;
const CLOSE_FRACTION = 0.25;
const FLICK_VELOCITY = 0.5; // px per ms
const FLICK_MIN_OFFSET = 10;
const VELOCITY_WINDOW = 100; // ms
const RUBBER_BAND = 0.2;
const RUBBER_BAND_MAX = 24;
const FALLBACK_MS = 450;
const NO_DRAG = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-sheet-no-drag]';
const TRANSITION = 'var(--ds-dur-slow) cubic-bezier(.2, .8, .2, 1)';

type Phase = 'idle' | 'pending' | 'dragging' | 'ignored';

function findScroller(target: Element | null, panel: HTMLElement): HTMLElement | null {
  for (let el = target; el; el = el.parentElement) {
    if (el instanceof HTMLElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    if (el === panel) break;
  }
  return null;
}

/**
 * Shared phone-sheet drag-to-close, native-sheet style: the whole sheet is the handle.
 *
 * Usage: `const sheetRef = useSheetDrag({ onDismiss, enabled, backdropRef })`, then put `sheetRef`
 * on the sheet's panel element (merge it with other refs). Phone layout only (checked at gesture
 * start). A downward swipe that starts while the content under the finger is at its top drags the
 * sheet; if the content is scrolled, the content scrolls and the next swipe from the top drags.
 * Gestures starting in inputs or `[data-sheet-no-drag]`, horizontal and upward moves are left alone.
 * Touch uses touch events (pointer events are cancelled once a native scroll starts); mouse and
 * pen use pointer events. All writes go straight to element styles, no React state per frame.
 * Release closes past 25% of the panel height or on a downward flick, else springs back.
 * The close sets `data-drag-closing` on the panel (and backdrop) so the CSS exit animation is
 * skipped, and calls `onDismiss` on transitionend.
 * Reduced motion is read from CSS: the panel carries `transition-transform
 * duration-slow motion-reduce:duration-0`; a computed transform transition of duration 0 at gesture start
 * makes spring back and close instant while the drag still follows the finger.
 */
export function useSheetDrag({ onDismiss, enabled = true, backdropRef, scrimRef }: UseSheetDragOptions = {}) {
  const optsRef = useRef({ onDismiss, enabled, backdropRef, scrimRef });
  useEffect(() => {
    optsRef.current = { onDismiss, enabled, backdropRef, scrimRef };
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  const attach = useCallback((node: HTMLElement) => {
    let phase: Phase = 'idle';
    let closing = false;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let offset = 0;
    let scroller: HTMLElement | null = null;
    let samples: { t: number; y: number }[] = [];
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settleDone: (() => void) | null = null;
    let swallowClick = false;
    let swallowTimer: ReturnType<typeof setTimeout> | undefined;
    let pointerId: number | null = null;
    let instant = false;

    const backdrop = () => optsRef.current.backdropRef?.current ?? null;
    const scrim = () => optsRef.current.scrimRef?.current ?? null;
    const setScrim = (opacity: number, ease: string) => {
      const sc = scrim();
      if (!sc) return;
      sc.style.setProperty('--ds-scrim-opacity', String(opacity));
      sc.style.setProperty('--ds-scrim-ease', ease);
    };

    const paint = () => {
      raf = 0;
      node.style.transform = `translate3d(0, ${offset}px, 0)`;
      const h = node.offsetHeight;
      const b = backdrop();
      if (h > 0) {
        const fade = Math.min(1, Math.max(0, 1 - offset / h));
        if (b) b.style.opacity = String(fade);
        setScrim(fade, 'none');
      }
    };

    const clearStyles = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(timer);
      node.style.transform = '';
      node.style.transition = '';
      node.style.userSelect = '';
      node.removeAttribute('data-drag-closing');
      const b = backdrop();
      if (b) {
        b.style.opacity = '';
        b.style.transition = '';
        b.removeAttribute('data-drag-closing');
      }
      const sc = scrim();
      if (sc) {
        sc.style.removeProperty('--ds-scrim-opacity');
        sc.style.removeProperty('--ds-scrim-ease');
      }
    };

    const afterTransition = (fn: () => void) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        node.removeEventListener('transitionend', onEnd);
        clearTimeout(timer);
        settleDone = null;
        fn();
      };
      const onEnd = (e: TransitionEvent) => {
        if (e.target === node && e.propertyName === 'transform') finish();
      };
      node.addEventListener('transitionend', onEnd);
      timer = setTimeout(finish, FALLBACK_MS);
      settleDone = finish;
    };

    const springBack = () => {
      if (instant) {
        clearStyles();
        return;
      }
      node.style.transition = `transform ${TRANSITION}`;
      node.style.transform = 'translate3d(0, 0, 0)';
      const b = backdrop();
      if (b) {
        b.style.transition = `opacity ${TRANSITION}`;
        b.style.opacity = '1';
      }
      setScrim(1, `opacity ${TRANSITION}`);
      afterTransition(clearStyles);
    };

    const close = () => {
      closing = true;
      const dismiss = () => {
        optsRef.current.onDismiss?.();
        // If the dialog stays mounted (the close was refused), come back instead of hanging off screen.
        timer = setTimeout(() => {
          if (node.isConnected) {
            closing = false;
            clearStyles();
          }
        }, FALLBACK_MS + 300);
      };
      node.setAttribute('data-drag-closing', '');
      const b = backdrop();
      b?.setAttribute('data-drag-closing', '');
      if (instant) {
        node.style.transform = 'translate3d(0, 100%, 0)';
        if (b) b.style.opacity = '0';
        setScrim(0, 'none');
        dismiss();
        return;
      }
      node.style.transition = `transform ${TRANSITION}`;
      node.style.transform = 'translate3d(0, 100%, 0)';
      if (b) {
        b.style.transition = `opacity ${TRANSITION}`;
        b.style.opacity = '0';
      }
      setScrim(0, `opacity ${TRANSITION}`);
      afterTransition(dismiss);
    };

    const start = (x: number, y: number, target: EventTarget | null): boolean => {
      // A click swallowed after the last drag must not outlive it, even if this gesture is never ours.
      clearTimeout(swallowTimer);
      swallowClick = false;
      if (!optsRef.current.enabled || closing || !isPhoneLayout()) return false;
      const el = target instanceof Element ? target : null;
      if (el?.closest(NO_DRAG)) return false;
      if (settleDone) settleDone();
      clearStyles();
      startX = x;
      startY = y;
      lastY = y;
      offset = 0;
      samples = [{ t: Date.now(), y }];
      scroller = findScroller(el, node);
      const cs = getComputedStyle(node);
      instant = cs.transitionProperty.includes('transform') && parseFloat(cs.transitionDuration) === 0;
      phase = 'pending';
      return true;
    };

    // Returns true while the gesture is a sheet drag (the caller then blocks native scrolling).
    const move = (x: number, y: number): boolean => {
      if (phase === 'idle' || phase === 'ignored') return false;
      lastY = y;
      const dx = x - startX;
      const dy = y - startY;
      if (phase === 'pending') {
        if (Math.hypot(dx, dy) <= SLOP) return false;
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || (scroller && scroller.scrollTop > 0)) {
          phase = 'ignored';
          return false;
        }
        phase = 'dragging';
        swallowClick = true;
        const active = document.activeElement;
        if (active instanceof HTMLElement && node.contains(active) && active.matches('input, textarea, [contenteditable]')) {
          active.blur();
        }
        node.style.transition = 'none';
        node.style.userSelect = 'none';
      }
      const raw = dy - SLOP;
      offset = raw >= 0 ? raw : Math.max(-RUBBER_BAND_MAX, raw * RUBBER_BAND);
      const now = Date.now();
      samples.push({ t: now, y });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW) samples.shift();
      if (!raf) raf = requestAnimationFrame(paint);
      return true;
    };

    const end = () => {
      const was = phase;
      phase = 'idle';
      pointerId = null;
      if (was !== 'dragging') return;
      swallowTimer = setTimeout(() => (swallowClick = false), 100);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      node.style.userSelect = '';
      const h = node.offsetHeight;
      const first = samples[0];
      const dt = Math.max(1, Date.now() - first.t);
      const velocity = (lastY - first.y) / dt;
      const shown = Math.max(0, offset);
      if ((h > 0 && shown > h * CLOSE_FRACTION) || (velocity > FLICK_VELOCITY && shown > FLICK_MIN_OFFSET)) {
        // Continue from where the finger let go.
        node.style.transform = `translate3d(0, ${shown}px, 0)`;
        close();
      } else {
        node.style.transform = `translate3d(0, ${shown}px, 0)`;
        springBack();
      }
    };

    const cancel = () => {
      const was = phase;
      phase = 'idle';
      pointerId = null;
      if (was === 'dragging') {
        swallowTimer = setTimeout(() => (swallowClick = false), 100);
        offset = Math.max(0, offset);
        springBack();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        if (phase === 'dragging') cancel();
        phase = 'ignored';
        return;
      }
      const t = e.touches[0];
      if (!start(t.clientX, t.clientY, e.target)) phase = 'idle';
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => end();
    const onTouchCancel = () => cancel();

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (start(e.clientX, e.clientY, e.target)) pointerId = e.pointerId;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || pointerId !== e.pointerId) return;
      const was = phase;
      if (move(e.clientX, e.clientY) && was === 'pending') {
        try {
          node.setPointerCapture(e.pointerId);
        } catch {
          // capture is a nicety
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || pointerId !== e.pointerId) return;
      try {
        node.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      end();
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || pointerId !== e.pointerId) return;
      cancel();
    };
    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const nonPassive = { passive: false } as const;
    node.addEventListener('touchstart', onTouchStart, nonPassive);
    node.addEventListener('touchmove', onTouchMove, nonPassive);
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchCancel);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerCancel);
    node.addEventListener('click', onClickCapture, true);

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.removeEventListener('click', onClickCapture, true);
      clearTimeout(swallowTimer);
      clearStyles();
    };
  }, []);

  /** Callback ref for the sheet panel: attaches the gesture, resets every inline style on unmount. */
  return useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = node ? attach(node) : null;
    },
    [attach],
  );
}
