'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import type { UnrecordedCredits } from './types';

interface UseUnrecordedCreditsProps {
  /** Called after a dividend was recorded from a credit, to refresh the page. */
  onRecorded?: () => void;
}

/** On-demand scan for bank credits that look like dividends but aren't recorded. */
export function useUnrecordedCredits({ onRecorded }: UseUnrecordedCreditsProps = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: keys.investments.dividendUnrecorded({}),
    queryFn: async () =>
      (await api.GET('/api/v1/investments/dividends/reconciliation/unrecorded', { params: { query: {} } }))
        .data as UnrecordedCredits,
    enabled: false,
  });

  const handleRecorded = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.investments.all }),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
    ]);
    await query.refetch();
    onRecorded?.();
  };

  return {
    loading: query.isFetching,
    fetched: query.isFetched,
    isError: query.isError,
    error: query.error,
    items: query.data?.items ?? [],
    scan: query.refetch,
    handleRecorded,
  };
}
