import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { reportsApi } from '@/lib/apiClient';
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
  const reports = await reportsApi.list(activeType);

  return (
    <div className="space-y-4 p-4">
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
      <ReportsList reports={reports} activeType={activeType} />
    </div>
  );
}
