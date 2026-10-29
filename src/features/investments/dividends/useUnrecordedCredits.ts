'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import { loadUnrecordedDividendCredits } from './dividendsActions';

interface UseUnrecordedCreditsProps {
  /** Called after a dividend was recorded from a credit, to refresh the page. */
  onRecorded?: () => void;
}

/** On-demand scan for bank credits that look like dividends but aren't recorded. */
export function useUnrecordedCredits({ onRecorded }: UseUnrecordedCreditsProps = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: keys.investments.dividendUnrecorded({}),
    queryFn: () => unwrapAction(loadUnrecordedDividendCredits()),
    enabled: false,
  });

  const handleRecorded = async () => {
    await Promise.all([
      invalidateInvestmentQueries(qc),
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
