import { useSyncExternalStore } from 'react';

/** Work faster than this never shows the bar, so quick changes do not flash. */
export const NAVIGATION_PROGRESS_DELAY_MS = 120;
/** Gives up on work that never finishes (cancelled, redirected back) so the bar cannot stick. */
export const NAVIGATION_PROGRESS_TIMEOUT_MS = 8000;

/**
 * "The app is busy": lazy code still downloading (tokens) or a same-page router push/replace still waiting for the
 * server render (route pending). The top bar shows once something has been busy for the delay, and gives up at the timeout.
 */
let tokens = 0;
let generation = 0;
let routePending = false;
let showing = false;
let delayTimer: ReturnType<typeof setTimeout> | undefined;
let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setShowing(next: boolean) {
  if (showing === next) return;
  showing = next;
  listeners.forEach((l) => l());
}

function clearTimers() {
  clearTimeout(delayTimer);
  clearTimeout(giveUpTimer);
  delayTimer = undefined;
  giveUpTimer = undefined;
}

function expire() {
  generation += 1;
  tokens = 0;
  routePending = false;
  clearTimers();
  setShowing(false);
}

/** Starts the delay and give-up timers when work begins, and stops them once nothing is busy. */
function sync() {
  const active = tokens > 0 || routePending;
  if (!active) {
    clearTimers();
    setShowing(false);
    return;
  }
  if (delayTimer !== undefined || giveUpTimer !== undefined || showing) return;
  delayTimer = setTimeout(() => setShowing(true), NAVIGATION_PROGRESS_DELAY_MS);
  giveUpTimer = setTimeout(expire, NAVIGATION_PROGRESS_TIMEOUT_MS);
}

/** Marks the app busy until the returned `end()` is called (calling it again does nothing). */
export function beginBusy(): () => void {
  const mine = generation;
  let ended = false;
  tokens += 1;
  sync();
  return () => {
    if (ended) return;
    ended = true;
    // The give-up timeout already cleared this token.
    if (mine !== generation) return;
    tokens = Math.max(0, tokens - 1);
    sync();
  };
}

/** The query as useSearchParams().toString() spells it, so `a+b` and `a%20b` compare equal. */
const normalSearch = (search: string) => new URLSearchParams(search).toString();

/** The same-origin pathname and normalised query `href` leads to, or null. */
export function routeOf(href: string): { pathname: string; search: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return { pathname: url.pathname, search: normalSearch(url.search) };
  } catch {
    return null;
  }
}

/**
 * A router push/replace to `href` started: busy until the route commits. A move to the page we are already on ends any
 * pending one instead: the router drops the earlier navigation, and the address never changes, so no commit would end it.
 */
export function trackRoute(href: string) {
  const target = routeOf(href);
  if (!target) return;
  if (target.pathname === window.location.pathname && target.search === normalSearch(window.location.search)) {
    endRoute();
    return;
  }
  routePending = true;
  sync();
}

/** The route committed: the pending push/replace is done. */
export function endRoute() {
  if (!routePending) return;
  routePending = false;
  sync();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True once something has been busy for the delay. */
export function useBusyShowing(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => showing,
    () => false,
  );
}

/** Test helper: forgets all busy work. */
export function resetBusy() {
  expire();
}
