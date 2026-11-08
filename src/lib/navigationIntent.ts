/**
 * How the next page change was made, for the in-app history behind Back (features/shell/navigationStore): a
 * `router.replace` onto another page takes the current entry instead of adding one. Lives in lib so useAppRouter can set it.
 */
let replacePathname: string | null = null;

/** A router.replace to `pathname` (another page) started. */
export function markReplace(pathname: string) {
  replacePathname = pathname;
}

/** A route committed at `pathname`: true when it is the replace marked for it. Always clears the mark. */
export function takeReplace(pathname: string): boolean {
  const hit = replacePathname === pathname;
  replacePathname = null;
  return hit;
}

/** Test helper. */
export function resetNavigationIntent() {
  replacePathname = null;
}
