import { ActionError } from '@/lib/actionResult';
import { ApiError } from '@/lib/api/client';

/** The `ErrorResponse.code`s the server sends with a 400 (GlobalExceptionHandler: validation, malformed body, bad parameter). */
const BAD_REQUEST_CODES = ['VALIDATION_ERROR', 'BAD_REQUEST'];

/**
 * True when the server refused the request as invalid (HTTP 400): by status, or for a failed server action whose
 * status didn't come through, by the code. (`ActionError` is an `ApiError`.)
 */
export function isBadRequest(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 400 || (err instanceof ActionError && BAD_REQUEST_CODES.includes(err.code));
}

/** True when the server answered 404 (`NOT_FOUND`): by status, or by code for a failed server action. */
export function isNotFound(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 404 || (err instanceof ActionError && err.code === 'NOT_FOUND');
}
