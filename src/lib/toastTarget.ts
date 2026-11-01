/**
 * Which toaster is on screen: a module-level counter set by the Dinero Toaster while it is mounted.
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
