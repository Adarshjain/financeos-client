import { ApiError } from '@/lib/api/client';
import { AppError } from '@/lib/appError';

/**
 * Resolves a thrown query/mutation error to a user-facing message: the backend's message for an
 * `ApiError` (thrown by the browser API client middleware on any non-2xx response), the message of an
 * `AppError` (written for the user), the caller's fixed message otherwise. The one helper for every module.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.response.message || fallback;
  if (error instanceof AppError) return error.message || fallback;
  return fallback;
}
