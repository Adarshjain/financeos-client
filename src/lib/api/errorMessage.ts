import { ApiError } from '@/lib/api/client';
import { AppError } from '@/lib/appError';

/** The code a server action gives a failure that never got a backend answer (the backend itself never sends it). */
const NO_BACKEND_ANSWER = 'UNKNOWN_ERROR';

/**
 * Resolves a thrown query/mutation error to a user-facing message: the backend's message for an
 * `ApiError` (thrown by the browser API client middleware on any non-2xx response), the message of an
 * `AppError` (written for the user), the caller's fixed message otherwise, also for a server action that failed
 * before the backend answered. The one helper for every module.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return (error.response.code === NO_BACKEND_ANSWER ? '' : error.response.message) || fallback;
  if (error instanceof AppError) return error.message || fallback;
  return fallback;
}
