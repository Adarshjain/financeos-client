import { ApiError } from '@/lib/api/client';

/**
 * Resolves a thrown query/mutation error to the backend's message when it is an
 * `ApiError` (thrown by the browser API client middleware on any non-2xx response),
 * falling back to the caller's fixed message otherwise. One implementation for every
 * module, matching what the old server-action layer surfaced via `ApiResult.error.message`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.response.message || fallback : fallback;
}
