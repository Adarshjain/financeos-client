import { ApiError } from '@/lib/apiClient';
import type { ApiResult, ErrorResponse } from '@/lib/types';

/**
 * An error raised by our own code, rather than relayed from the backend, whose
 * message is written for the user.
 *
 * `toErrorResult` would otherwise discard the message and substitute the generic
 * per-action fallback, which is right for unexpected throws but wrong when we
 * deliberately refused to do something and can explain why.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Maps a thrown error onto the `ApiResult` failure shape, preserving the
 * backend's structured `ErrorResponse` when there is one.
 *
 * Replaces eight byte-identical `handleXError` functions (one per action file)
 * plus two copies inlined without a helper at all.
 */
export function toErrorResult(
  error: unknown,
  fallbackMessage: string,
): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: fallbackMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

/** A client-side validation failure, before any request is made. */
export function validationError(
  message: string,
): { success: false; error: ErrorResponse } {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Runs a server-action body and funnels the outcome into `ApiResult<T>`.
 *
 * Put `revalidatePath` calls *inside* `run` — they then only fire when the
 * mutation actually succeeded.
 *
 * Do NOT use this around `redirect()`: Next implements redirects by throwing a
 * sentinel error, which this would catch and convert into a failure result.
 * Call `redirect()` after the wrapper returns.
 */
export async function apiResult<T>(
  fallbackMessage: string,
  run: () => Promise<T>,
): Promise<ApiResult<T>> {
  try {
    return { success: true, data: await run() };
  } catch (error) {
    return toErrorResult(error, fallbackMessage);
  }
}
