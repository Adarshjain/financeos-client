/** Tailwind's `lg` breakpoint: below it the app renders its phone layout. */
export const DESKTOP_QUERY = '(min-width: 64rem)';

/**
 * Whether the viewport is in the phone layout (below `lg`) right now, whatever the pointer.
 * Phone-only gestures (long-press to select, swipe actions, tap toggles in selection mode)
 * key off this (owner, 2026-10-18). Call it only inside event handlers, never while
 * rendering: what renders is decided by `lg:` classes alone (RULES §5c.3).
 */
export function isPhoneLayout(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia(DESKTOP_QUERY).matches;
}
