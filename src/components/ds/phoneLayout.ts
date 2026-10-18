/** Dinero's `desk` breakpoint (641px): at 640px and below the app renders its phone layout. */
export const DESKTOP_QUERY = '(min-width: 641px)';

/**
 * Whether the viewport is in the phone layout (below `desk`) right now, whatever the pointer.
 * Phone-only gestures (long-press to select, swipe actions, tap toggles in selection mode)
 * key off this (owner, 2026-10-18). Call it only inside event handlers, never while
 * rendering: what renders is decided by `desk:` classes alone (RULES §5c.3).
 */
export function isPhoneLayout(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia(DESKTOP_QUERY).matches;
}
