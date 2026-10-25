'use client';

// Runs the net worth card's by-kind report (POST /reports/data, ad hoc) and returns its four parts.

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { asReportData, isChartData } from '@/lib/reports.helpers';

import { netWorthByKindRequest, netWorthParts } from './netWorthBreakdown';

export function useNetWorthParts() {
  const request = netWorthByKindRequest();
  return useQuery({
    queryKey: [...keys.reports.all, 'adhoc', request] as const,
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/reports/data', {
        params: { query: {} },
        body: { ...request, definition: { ...request.definition } },
      });
      const report = asReportData(data);
      return isChartData(report) ? netWorthParts(report) : null;
    },
  });
}
