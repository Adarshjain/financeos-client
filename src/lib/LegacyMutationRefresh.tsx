'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// staleTimes.dynamic keeps server-rendered Legacy pages in the client router cache for 30s. Legacy
// edits are made through many paths (React Query mutations, bare api.POST calls, multipart uploads),
// none of which refresh the router, so this watches every successful write to /api/v1 and calls
// router.refresh() once per burst. Mounted only in the Legacy root layout; /ds pages refresh per mutation.
const REFRESH_DELAY_MS = 250;

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

    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    };

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
      if (window.fetch === watchedFetch) window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
