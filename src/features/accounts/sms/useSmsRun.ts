'use client';

import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import type { ApiResult } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

/**
 * Runs one server action of the page: a failure shows its message in a toast, a success refreshes the page's data.
 * `refreshing` stays true until the refreshed page shows the result.
 */
export function useSmsRun() {
  const router = useAppRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const refresh = React.useCallback(() => startRefresh(() => router.refresh()), [router]);
  const run = React.useCallback(
    async <T,>(work: () => Promise<ApiResult<T>>, options: { refresh?: boolean } = {}): Promise<ApiResult<T>> => {
      const result = await work();
      if (!result.success) showToast(result.error.message, { tone: 'danger' });
      else if (options.refresh !== false) refresh();
      return result;
    },
    [refresh],
  );
  return { run, refresh, refreshing };
}
