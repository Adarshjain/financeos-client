import { ApiError } from '@/lib/api/client';
import { notifyIfAppLocked } from '@/lib/appLock';
import { AUTH_EXPIRED_EVENT, isSessionExpiredResult } from '@/lib/authExpiry';
import type { ApiResult, ErrorResponse } from '@/lib/types';

/**
 * A failed server action, thrown on the client. It is an `ApiError` with the backend's status and `ErrorResponse`,
 * so every `instanceof ApiError` / `status` check, `getErrorMessage`, `toastError` and the error log treat it exactly
 * like a failure from the browser API client. A failure that never reached the backend has status 0.
 */
export class ActionError extends ApiError {
  constructor(response: ErrorResponse, status = 0) {
    super(status, response);
    this.name = 'ActionError';
  }

  /** The backend's error code (`ErrorResponse.code`). */
  get code(): string {
    return this.response.code;
  }
}

/**
 * Turns a server action's `ApiResult` into its data, or throws an `ActionError` carrying the server's answer.
 * The one way client code reads an action inside `queryFn` / `mutationFn`. Like the browser API client, a 401 raises
 * `financeos:auth-expired` (the /ds shell asks for the password in place; Legacy goes to /login) and an app-lock
 * answer raises the lock event.
 */
export async function unwrapAction<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const value = await result;
  if (value.success) return value.data;
  if (typeof window !== 'undefined' && isSessionExpiredResult(value)) window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  notifyIfAppLocked(value);
  throw new ActionError(value.error, value.status);
}
