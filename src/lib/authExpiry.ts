/**
 * Who handles `financeos:auth-expired` (dispatched by the browser API client on any 401).
 * Legacy has no handler of its own, so QueryProvider sends it to /login. A page that can ask for the
 * password in place (the /ds shell's SessionExpiredDialog) claims the event so nobody navigates away.
 */
export const AUTH_EXPIRED_EVENT = 'financeos:auth-expired';

let claims = 0;

/** Marks the event as handled in place until the returned function is called. */
export function claimAuthExpired(): () => void {
  claims += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims -= 1;
  };
}

export function isAuthExpiredClaimed(): boolean {
  return claims > 0;
}

/** The code the backend puts on every 401 body (`ErrorResponse.code`); server actions return it inside an ApiResult. */
const UNAUTHORIZED_CODE = 'UNAUTHORIZED';

/** True for a failed ApiResult (or a thrown ApiError) that means the session ended. */
export function isSessionExpiredResult(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as { success?: unknown; error?: { code?: unknown }; status?: unknown };
  if (v.success === false && v.error?.code === UNAUTHORIZED_CODE) return true;
  return v.status === 401;
}

/**
 * Raises `financeos:auth-expired` when `value` says the session ended, but only where a page has claimed the
 * event (the /ds shell), so Legacy keeps its own behaviour. The browser API client dispatches the same event
 * itself for direct 401s; this covers server actions, whose 401 comes back as data.
 */
export function notifyIfSessionExpired(value: unknown): void {
  if (typeof window === 'undefined' || !isAuthExpiredClaimed()) return;
  if (isSessionExpiredResult(value)) window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/** Passes a server action's result through, raising `financeos:auth-expired` first when it is a 401. For calls made outside react-query. */
export async function watchSession<T>(result: Promise<T>): Promise<T> {
  const value = await result;
  notifyIfSessionExpired(value);
  return value;
}
