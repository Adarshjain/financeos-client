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
