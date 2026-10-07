/** Horizontal/vertical movement (px) before a gesture locks to one axis. */
export const AXIS_LOCK_PX = 8;
/** Horizontal travel (px) at release that commits the revealed action. */
export const COMMIT_PX = 80;
/** Width (px) the action backdrop reveals; travel past it rubber-bands. */
export const MAX_REVEAL_PX = 112;
/** How much of the travel beyond MAX_REVEAL_PX still moves the card. */
const RUBBER_BAND_FACTOR = 0.25;

export type SwipeAxis = 'horizontal' | 'vertical';

/**
 * Which axis a gesture belongs to once it has moved far enough to tell, or
 * `null` while it is still ambiguous. Ties resolve vertical so a diagonal
 * scroll never gets stolen from the page.
 */
export function resolveAxis(dx: number, dy: number): SwipeAxis | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < AXIS_LOCK_PX && ay < AXIS_LOCK_PX) return null;
  return ax > ay ? 'horizontal' : 'vertical';
}

interface SwipeSides {
  hasLeading: boolean;
  hasTrailing: boolean;
}

/**
 * Card offset for a raw horizontal travel. A side with no action clamps to 0
 * (there is nothing to reveal), and travel past the reveal width moves the
 * card at a quarter rate so it feels anchored instead of sliding away.
 */
export function computeSwipeOffset(rawDx: number, sides: SwipeSides): number {
  if (rawDx > 0 && !sides.hasLeading) return 0;
  if (rawDx < 0 && !sides.hasTrailing) return 0;
  const sign = Math.sign(rawDx);
  const travel = Math.abs(rawDx);
  if (travel <= MAX_REVEAL_PX) return rawDx;
  return sign * (MAX_REVEAL_PX + (travel - MAX_REVEAL_PX) * RUBBER_BAND_FACTOR);
}

export function isCommitted(dx: number): boolean {
  return Math.abs(dx) >= COMMIT_PX;
}
