import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { redirectToSignIn } from '@/lib/auth';

/** Resolves to null instead of rejecting, so an optional piece of a page degrades on its own. */
export function orNull<T>(request: Promise<T>): Promise<T | null> {
  return request.catch(async (error: unknown) => {
    await signInIfSessionEnded(error);
    return null;
  });
}

/** An ended session is not a page failure: send the visitor to sign in and back (a 401 on a soft navigation skips the cached layout's auth check). */
export async function signInIfSessionEnded(error: unknown): Promise<void> {
  if (error instanceof ApiError && error.status === 401) await redirectToSignIn();
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; reference?: string };

/** Resolves to a failure value (with the request id, when there is one) instead of rejecting. */
export function loaded<T>(request: Promise<T>): Promise<Loaded<T>> {
  return request.then(
    (data): Loaded<T> => ({ ok: true, data }),
    async (error: unknown): Promise<Loaded<T>> => {
      await signInIfSessionEnded(error);
      return { ok: false, reference: error instanceof ApiError ? error.requestId : undefined };
    },
  );
}

/** Passes a request through; a 401 sends the visitor to sign in (and back), any other failure is rethrown. */
export async function guardSession<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    await signInIfSessionEnded(error);
    throw error;
  }
}

/** After a server-side `prefetchQuery` (which swallows failures): a prefetch that failed with a 401 sends the visitor to sign in. */
export async function signInIfPrefetchFailed(queryClient: QueryClient, queryKey: QueryKey): Promise<void> {
  await signInIfSessionEnded(queryClient.getQueryState(queryKey)?.error);
}
