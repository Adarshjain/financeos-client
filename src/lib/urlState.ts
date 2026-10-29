/**
 * The only place the browser history API is written. A page rewrites its own address this way only when it
 * deliberately skips the server round-trip a router navigation costs (a client-side filter, a one-shot
 * param taken out of the address); every other change of address is a router navigation.
 */

interface UrlWriteOptions {
  /** Keep the current history state (Next.js stores its own there) instead of clearing it. */
  keepState?: boolean;
}

/** Rewrites the current entry's address in place: no navigation, no render, no refetch, no scroll. */
export function replaceUrl(url: string | URL, { keepState = false }: UrlWriteOptions = {}): void {
  window.history.replaceState(keepState ? window.history.state : null, '', url);
}

/** Adds a history entry for `url`, carrying `state` (the leave guard puts a protected entry back this way). */
export function pushUrl(url: string | URL, state: unknown = null): void {
  window.history.pushState(state, '', url);
}
