'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// staleTimes.dynamic keeps server-rendered Legacy pages in the client router cache for 30s. Legacy
// edits are made through many paths (React Query mutations, bare api.POST calls, multipart uploads),
// none of which refresh the router, so this watches every successful write to /api/v1 and calls
// router.refresh() once per burst. Mounted only in the Legacy root layout; /ds pages refresh per mutation.
const REFRESH_DELAY_MS = 250;
// A refresh dispatched while a link navigation is committing turns that push into a replace (Back then skips the
// page). A link click or Back/Forward while a refresh is waiting pushes it past the navigation.
const NAVIGATION_DELAY_MS = 1000;

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// POST endpoints that only read (search, previews, report/dashboard data, exports): no refresh needed.
const READ_ONLY_POST =
  /\/(search|preview-matches|preview|underlying|underlying\/csv|data|definition|categorize|resolve|reward-recommendations)$/;

export function isWriteRequest(method: string, url: string): boolean {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false;
  let path: string;
  try {
    path = new URL(url, window.location.origin).pathname;
  } catch {
    return false;
  }
  if (!path.startsWith('/api/v1/')) return false;
  return !READ_ONLY_POST.test(path);
}

export function LegacyMutationRefresh() {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    let timer: ReturnType<typeof setTimeout> | undefined;

    let pending = false;

    const scheduleRefresh = (delay = REFRESH_DELAY_MS) => {
      clearTimeout(timer);
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        router.refresh();
      }, delay);
    };

    const deferForNavigation = () => {
      if (pending) scheduleRefresh(NAVIGATION_DELAY_MS);
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a[href]')) deferForNavigation();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', deferForNavigation);

    const watchedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const request = input instanceof Request ? input : undefined;
        const method = init?.method ?? request?.method ?? 'GET';
        const url = request?.url ?? String(input);
        if (isWriteRequest(method, url)) scheduleRefresh();
      }
      return response;
    };
    window.fetch = watchedFetch;

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', deferForNavigation);
      if (window.fetch === watchedFetch) window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
