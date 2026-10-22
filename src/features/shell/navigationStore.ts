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
