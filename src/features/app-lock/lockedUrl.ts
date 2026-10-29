import { appHref, isSafeLocalPath } from '@/features/shell/routes';
import type { SearchParamsRecord } from '@/features/shell/searchParams';
import { isLockRoute } from '@/lib/appLock';

/** What a /locked address asks for: `?from=` is where to go after unlocking. Only a local path that is not a lock page counts; anything else goes Home. */
export function parseLockedUrl(params: SearchParamsRecord): { from: string } {
  // A repeated key (an array) is not a path: ignored.
  const requested = typeof params.from === 'string' ? params.from : undefined;
  const ok = requested && isSafeLocalPath(requested) && !isLockRoute(requested.split(/[?#]/)[0]);
  return { from: ok ? requested : appHref('/dashboard') };
}
