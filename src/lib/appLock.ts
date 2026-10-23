import { DS_PREFIX, isSafeLocalPath } from '@/features/shell/routes';

/** Raised on `window` when any request says the app is locked (423 / APP_LOCKED). */
export const APP_LOCKED_EVENT = 'financeos:app-locked';

/** Raised on `window` after app lock was turned on or off or its setting changed, so the watcher re-reads the status. */
export const APP_LOCK_CHANGED_EVENT = 'financeos:app-lock-changed';

/** The lock screen. */
export const LOCK_ROUTE = `${DS_PREFIX}/locked`;

/** The code the backend puts on a 423 body (`ErrorResponse.code`). */
export const APP_LOCKED_CODE = 'APP_LOCKED';

/** True for a failed ApiResult (or a thrown ApiError) that means the app is locked. */
export function isAppLockedResult(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as { success?: unknown; error?: { code?: unknown }; status?: unknown; response?: { code?: unknown } };
  if (v.success === false && v.error?.code === APP_LOCKED_CODE) return true;
  if (v.status === 423) return true;
  return v.response?.code === APP_LOCKED_CODE;
}

/** True when `pathname` is the lock screen (or below it). */
export function isLockRoute(pathname: string | null | undefined): boolean {
  return !!pathname && (pathname === LOCK_ROUTE || pathname.startsWith(`${LOCK_ROUTE}/`));
}

/** Raises {@link APP_LOCKED_EVENT} when `value` says the app is locked. */
export function notifyIfAppLocked(value: unknown): void {
  if (typeof window === 'undefined') return;
  if (isAppLockedResult(value)) window.dispatchEvent(new CustomEvent(APP_LOCKED_EVENT));
}

/** The lock screen's address, with `from` (a same-origin path, else dropped) as where to return to after unlocking. */
export function lockHref(from?: string | null): string {
  if (!from || !isSafeLocalPath(from) || isLockRoute(from.split(/[?#]/)[0])) return LOCK_ROUTE;
  return `${LOCK_ROUTE}?from=${encodeURIComponent(from)}`;
}
