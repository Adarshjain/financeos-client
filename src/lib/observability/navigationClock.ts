// When the latest same-origin navigation started (performance.now timebase); set by FaroRouteTracker.
let lastNavigationStart: number | null = null;
let hardLoadConsumed = false;

export function markNavigationStart(at: number | null = performance.now()): void {
  hardLoadConsumed = true;
  lastNavigationStart = at;
}

/**
 * The start of the navigation that led to this screen: the recent click/popstate, or the page's own navigation
 * start (0) on a hard load. Falls back to now when the recorded start is stale.
 */
export function navigationStartForScreen(maxAgeMs = 30_000): number {
  const now = performance.now();
  if (lastNavigationStart === null && hardLoadConsumed) return now;
  if (lastNavigationStart !== null) return now - lastNavigationStart <= maxAgeMs ? lastNavigationStart : now;
  return now <= maxAgeMs ? 0 : now;
}
