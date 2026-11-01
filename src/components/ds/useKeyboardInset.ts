'use client';

import { useEffect } from 'react';

/** Below this many pixels the viewport gap is browser chrome drift, not a keyboard. */
const MIN_INSET = 50;
const PROP = '--ds-keyboard-inset';

/** On-screen keyboard height in CSS px over the bottom of the layout viewport, or 0. */
export function computeKeyboardInset(
  vv: Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>,
  innerHeight: number,
): number {
  if (Math.abs(vv.scale - 1) > 0.01) return 0; // pinch-zoom is not a keyboard
  const inset = Math.round(innerHeight - (vv.height + vv.offsetTop));
  return inset >= MIN_INSET ? inset : 0;
}

let mounted = 0;
let teardown: (() => void) | null = null;

function acquire() {
  mounted += 1;
  if (mounted > 1) return;
  const vv = window.visualViewport;
  const root = document.documentElement;
  const write = () => root.style.setProperty(PROP, `${vv ? computeKeyboardInset(vv, window.innerHeight) : 0}px`);
  write();
  vv?.addEventListener('resize', write);
  vv?.addEventListener('scroll', write);
  teardown = () => {
    vv?.removeEventListener('resize', write);
    vv?.removeEventListener('scroll', write);
    root.style.removeProperty(PROP);
  };
}

function release() {
  mounted = Math.max(0, mounted - 1);
  if (mounted > 0) return;
  teardown?.();
  teardown = null;
}

/**
 * While a sheet is mounted, keeps `--ds-keyboard-inset` (px) on the document root in step with the
 * on-screen keyboard, so a `fixed bottom-0` sheet can sit above it: `bottom: var(--ds-keyboard-inset, 0px)`.
 * Ref-counted: the property is removed when the last sheet unmounts. Positioning only, never a render switch.
 */
export function useDsKeyboardInset() {
  useEffect(() => {
    acquire();
    return release;
  }, []);
}
