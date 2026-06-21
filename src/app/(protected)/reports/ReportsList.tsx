'use client';

import { BarChart3, LineChart, type LucideIcon, Pencil, Table2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteReport } from '@/actions/reports';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ReportSummaryResponse, ReportType } from '@/lib/reports.types';
import { cn, formatDate } from '@/lib/utils';

type BadgeVariant = 'success' | 'info' | 'warning';

const TYPE_META: Record<
  ReportType,
  { label: string; variant: BadgeVariant; Icon: LucideIcon }
> = {
  KPI: { label: 'KPI', variant: 'success', Icon: BarChart3 },
  CHART: { label: 'Chart', variant: 'info', Icon: LineChart },
  TABLE: { label: 'Table', variant: 'warning', Icon: Table2 },
};

const FILTERS: { value?: ReportType; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'KPI', label: 'KPI' },
  { value: 'CHART', label: 'Chart' },
  { value: 'TABLE', label: 'Table' },
];

interface ReportsListProps {
  reports: ReportSummaryResponse[];
  activeType?: ReportType;
}

export function ReportsList({ reports, activeType }: ReportsListProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const res = await deleteReport(id);
    if (res.success) {
      toast.success('Report deleted');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === activeType;
          return (
            <Link
              key={f.label}
              href={f.value ? `/reports?type=${f.value}` : '/reports'}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {reports.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="mb-2 text-slate-600 dark:text-slate-400">
              No reports yet
            </p>
            <p className="text-sm text-slate-500">
              Create your first report to start analyzing your transactions.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const meta = TYPE_META[report.type];
            return (
              <Card key={report.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center gap-2 font-semibold text-slate-900 hover:underline dark:text-white"
                  >
                    <meta.Icon className="h-4 w-4 text-slate-400" />
                    {report.name}
                  </Link>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Updated {formatDate(report.updatedAt)}
                </p>
                <div className="mt-auto flex gap-2">
                  <Link href={`/reports/${report.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <ConfirmationDialog
                    title="Delete report"
                    description={
                      <div>
                        Delete <strong>{report.name}</strong>? This cannot be
                        undone.
                      </div>
                    }
                    primaryActionText="Delete"
                    primaryAction={() => handleDelete(report.id)}
                    trigger={
                      <Button variant="secondary" size="sm" className="flex-1">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
