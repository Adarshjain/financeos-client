/**
 * Which toaster is on screen. Legacy and /ds use different root layouts (full reload between them),
 * so a module-level counter set by the Dinero Toaster while it is mounted is always accurate.
 */
let dineroToasters = 0;

/** Called by the Dinero Toaster on mount; returns the unmount function. */
export function markDineroToaster(): () => void {
  dineroToasters += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    dineroToasters -= 1;
  };
}

export function dineroToasterMounted(): boolean {
  return dineroToasters > 0;
}
