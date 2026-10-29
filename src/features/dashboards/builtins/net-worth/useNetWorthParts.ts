'use client';

// Runs the net worth card's by-kind report (POST /reports/data, ad hoc) and returns its four parts.

import { useQuery } from '@tanstack/react-query';

import { runAdHocReport } from '@/features/reports/reportActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';
import { asReportData, isChartData } from '@/lib/reports.helpers';

import { netWorthByKindRequest, netWorthParts } from './netWorthBreakdownModel';

export function useNetWorthParts() {
  const request = netWorthByKindRequest();
  return useQuery({
    queryKey: [...keys.reports.all, 'adhoc', request] as const,
    queryFn: async () => {
      const report = asReportData(await unwrapAction(runAdHocReport(request, {})));
      return isChartData(report) ? netWorthParts(report) : null;
    },
  });
}
