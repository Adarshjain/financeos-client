'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, LineChart, type LucideIcon, Table2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { ReportType } from '@/lib/reports.types';
import { cn, formatDate } from '@/lib/utils';

type BadgeVariant = 'success' | 'info' | 'warning';

const TYPE_META: Record<
  ReportType,
  { label: string; variant: BadgeVariant; Icon: LucideIcon }
> = {
  KPI: { label: 'KPI', variant: 'success', Icon: Hash },
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
  activeType?: ReportType;
  datasourceLabels?: Record<string, string>;
}

export function ReportsList({ activeType, datasourceLabels }: ReportsListProps) {
  const qc = useQueryClient();

  // The type filter is applied here, client-side, over one cached list rather
  // than as a server-side query param: switching tabs is then instant (no
  // refetch) and the whole list still lives under one cache entry that a
  // create/update/delete mutation elsewhere can invalidate as a unit.
  const { data: reports = [] } = useQuery({
    queryKey: keys.reports.list(),
    queryFn: async () => (await api.GET('/api/v1/reports')).data ?? [],
  });
  const filtered = activeType ? reports.filter((r) => r.type === activeType) : reports;

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/reports/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.reports.all });
      toast.success('Report deleted');
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.response.message : 'Failed to delete report'),
  });

  // Awaited (rather than fire-and-forget) so the ConfirmationDialog stays open
  // and busy for the duration of the request, closing only once it settles.
  // Errors are swallowed here since `onError` above already surfaced a toast.
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // onError already surfaced a toast.
    }
  };

  return (
    <div className="space-y-2">
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

      {filtered.length === 0 ? (
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
          {filtered.map((report) => {
            const meta = TYPE_META[report.type];
            return (
              <Card key={report.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between flex-col gap-2">
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center gap-2 font-semibold text-slate-900 text-sm hover:underline dark:text-white"
                  >
                    <meta.Icon className="h-5 w-5 text-slate-400" />
                    {report.name}
                  </Link>
                  <div className="flex items-center gap-1.5">

                    <ConfirmationDialog
                      title="Delete report"
                      description={
                        <>
                          Delete <strong>{report.name}</strong>? This cannot be
                          undone.
                        </>
                      }
                      primaryActionText="Delete"
                      primaryAction={() => handleDelete(report.id)}
                      trigger={
                        // <Button variant="secondary" size="sm" className="flex-1">
                        <Trash2 className="h-4 w-4" />
                        // Delete
                        // </Button>
                      }
                    />
                  </div>
                </div>
                {report.description && (
                  <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                    {report.description}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Updated {formatDate(report.updatedAt)}
                </p>
                <Badge variant="outline" className="text-2xs font-medium">
                  {(datasourceLabels && datasourceLabels[report.datasource]) ?? report.datasource}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
