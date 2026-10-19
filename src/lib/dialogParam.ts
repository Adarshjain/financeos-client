/**
 * Dialogs that open over their own page from a URL param (`?add=…`, `?edit=1`) so deep links and reload still work.
 * The param is changed with the History API, which Next syncs into `useSearchParams` without a server request.
 */

/** The current URL with one search param removed (closing a dialog that opened from it). */
export function hrefWithoutParam(pathname: string, search: URLSearchParams | string, key: string): string {
  const next = new URLSearchParams(typeof search === 'string' ? search : search.toString());
  next.delete(key);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** The current URL with one search param set. */
export function hrefWithParam(pathname: string, search: URLSearchParams | string, key: string, value: string): string {
  const next = new URLSearchParams(typeof search === 'string' ? search : search.toString());
  next.set(key, value);
  return `${pathname}?${next.toString()}`;
}

/** Opens a dialog: a new history entry, so Back closes it. */
export function openDialogParam(key: string, value: string): void {
  const { pathname, search } = window.location;
  window.history.pushState(null, '', hrefWithParam(pathname, search, key, value));
}

/** Closes a dialog: the param is removed from the current entry, so no extra entry is left behind. */
export function closeDialogParam(key: string): void {
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', hrefWithoutParam(pathname, search, key));
}
