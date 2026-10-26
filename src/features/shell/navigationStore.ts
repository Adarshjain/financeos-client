import { useSyncExternalStore } from 'react';

/**
 * Where an in-app navigation is heading, from the click until the route commits. NavigationProgress
 * writes it; the shell nav reads `pendingPath` to show the clicked item as current at once, and
 * NavigationProgress reads `showing` to draw the bar once the delay has passed.
 */
interface NavigationState {
  pendingPath: string | null;
  showing: boolean;
}

let state: NavigationState = { pendingPath: null, showing: false };
const listeners = new Set<() => void>();

function set(next: NavigationState) {
  if (next.pendingPath === state.pendingPath && next.showing === state.showing) return;
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startNavigation(pendingPath: string) {
  set({ pendingPath, showing: false });
}

export function showNavigation() {
  if (state.pendingPath !== null) set({ ...state, showing: true });
}

export function endNavigation() {
  set({ pendingPath: null, showing: false });
}

/** The pathname a clicked in-app link is heading to, or null when no navigation is pending. */
export function usePendingPath(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.pendingPath,
    () => null,
  );
}

export function useNavigationShowing(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.showing,
    () => false,
  );
}

/**
 * This tab's in-app history, by pathname: `entries` with the `cursor` on the current page. Back may
 * use browser history only while an in-app entry sits behind the cursor (cursor > 0); a direct
 * landing starts at 0. Search-param-only commits and repeated effects (strict mode) are ignored.
 */
let entries: string[] = [];
let cursor = -1;
let popPending = false;

/** A popstate fired: the next commit is a back or forward move, not a push. */
export function markPopNavigation() {
  popPending = true;
}

const routeCallbacks: Array<() => void> = [];

/** Runs `fn` once, after the next route commit that lands on a different page. Survives the caller unmounting. */
export function afterNextRoute(fn: () => void) {
  routeCallbacks.push(fn);
}

/** A route committed at this pathname. */
export function commitRoute(pathname: string) {
  const before = cursor >= 0 ? entries[cursor] : null;
  commitEntry(pathname);
  if (entries[cursor] !== before) routeCallbacks.splice(0).forEach((fn) => fn());
}

function commitEntry(pathname: string) {
  const isPop = popPending;
  popPending = false;
  if (cursor >= 0 && entries[cursor] === pathname) return;
  if (cursor < 0) {
    entries = [pathname];
    cursor = 0;
  } else if (isPop) {
    if (cursor > 0 && entries[cursor - 1] === pathname) cursor -= 1;
    else if (entries[cursor + 1] === pathname) cursor += 1;
    else {
      const at = entries.lastIndexOf(pathname);
      if (at >= 0) cursor = at;
      else {
        entries = entries.slice(0, cursor + 1).concat(pathname);
        cursor += 1;
      }
    }
  } else {
    entries = entries.slice(0, cursor + 1).concat(pathname);
    cursor += 1;
  }
}

/** The current page's URL was rewritten in place (history.replaceState): the entry takes the new pathname, and the route commit that follows adds nothing. */
export function replaceCurrentRoute(pathname: string) {
  if (cursor >= 0) entries[cursor] = pathname;
}

/** True when the entry behind the current page is in-app. Not reactive: read it when Back is clicked. */
export function hasInAppHistory(): boolean {
  return cursor > 0;
}

/** Test helper: forgets the in-app history. */
export function resetInAppNavigation() {
  routeCallbacks.length = 0;
  entries = [];
  cursor = -1;
  popPending = false;
}
