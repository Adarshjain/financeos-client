import { ApiError } from '@/lib/api/client';

/** Resolves to null instead of rejecting, so an optional piece of a page degrades on its own. */
export function orNull<T>(request: Promise<T>): Promise<T | null> {
  return request.catch(() => null);
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; reference?: string };

/** Resolves to a failure value (with the request id, when there is one) instead of rejecting. */
export function loaded<T>(request: Promise<T>): Promise<Loaded<T>> {
  return request.then(
    (data): Loaded<T> => ({ ok: true, data }),
    (error: unknown): Loaded<T> => ({ ok: false, reference: error instanceof ApiError ? error.requestId : undefined }),
  );
}
