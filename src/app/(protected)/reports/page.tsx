import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { reportsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import type { ReportType } from '@/lib/reports.types';

import { ReportsList } from './ReportsList';

const TYPES: ReportType[] = ['KPI', 'CHART', 'TABLE'];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = TYPES.includes(type as ReportType)
    ? (type as ReportType)
    : undefined;
  const [reports, catalog] = await Promise.all([
    reportsApi.list(),
    reportsApi.getDatasource(),
  ]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.reports.list(), reports);

  const datasourceLabels: Record<string, string> = {};
  if (catalog && catalog.datasources) {
    for (const ds of catalog.datasources) {
      datasourceLabels[ds.name] = ds.label;
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reports
          </h1>
          <Link href="/reports/new">
            <Button>
              <Plus className="h-4 w-4" />
              New report
            </Button>
          </Link>
        </div>
        <ReportsList activeType={activeType} datasourceLabels={datasourceLabels} />
      </div>
    </HydrationBoundary>
  );
}
