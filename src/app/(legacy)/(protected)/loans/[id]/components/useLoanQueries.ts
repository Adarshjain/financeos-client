'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  InstallmentDto,
  LoanDetailResponse,
  MatchSuggestionsResponse,
} from '@/lib/types';

interface UseLoanQueriesProps {
  loanId: string;
}

/**
 * Reads (queries) for the loan detail page: the loan/events/charges bundle, the
 * amortization schedule, the on-demand transaction match suggestions, and the FY
 * (financial year) grouping/expansion state for the schedule table.
 */
export function useLoanQueries({ loanId }: UseLoanQueriesProps) {
  const detailQuery = useQuery({
    queryKey: keys.loans.byId(loanId),
    queryFn: async () =>
      (
        await api.GET('/api/v1/loans/{id}', {
          params: { path: { id: loanId } },
        })
      ).data! as LoanDetailResponse,
    enabled: Boolean(loanId),
  });

  const scheduleQuery = useQuery({
    queryKey: keys.loans.schedule(loanId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/loans/{id}/schedule', {
        params: { path: { id: loanId } },
      });
      // The endpoint returns a map keyed by an internal grouping; in practice a flat
      // list. Object.values(...).flat() is correct either way — a no-op on a flat array.
      return Object.values(
        (data ?? {}) as Record<string, InstallmentDto[]>
      ).flat();
    },
    enabled: Boolean(loanId),
  });

  const matchQuery = useQuery({
    queryKey: keys.loans.matchSuggestions(loanId),
    queryFn: async () =>
      (
        await api.GET('/api/v1/loans/{id}/match-suggestions', {
          params: { path: { id: loanId } },
        })
      ).data! as MatchSuggestionsResponse,
    enabled: false,
  });

  const [expandedFYs, setExpandedFYs] = useState<Record<string, boolean>>({});

  const getFYGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStart = month >= 3 ? year : year - 1;
    return `FY ${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  };

  const today = new Date();
  const currentFY = getFYGroupKey(today.toISOString().split('T')[0]);

  const toggleFY = (fy: string) => {
    setExpandedFYs((prev) => ({
      ...prev,
      [fy]: prev[fy] === undefined ? fy !== currentFY : !prev[fy],
    }));
  };

  const detail = detailQuery.data;
  const schedule = scheduleQuery.data ?? [];
  const loan = detail?.loan;
  const hasEventsOrPayments =
    (detail?.events.length ?? 0) > 0 ||
    schedule.some((i) => i.status === 'settled');

  return {
    detail,
    loan,
    schedule,
    hasEventsOrPayments,
    isLoading: detailQuery.isLoading || scheduleQuery.isLoading,
    error: detailQuery.error,
    matchLoading: matchQuery.isFetching,
    matchSuggestions: matchQuery.data ?? null,
    refetchMatches: matchQuery.refetch,
    expandedFYs,
    currentFY,
    toggleFY,
  };
}
