// The body states of a dashboard widget: a skeleton shaped like the content
// while the first page loads, a centred icon + one line for errors and
// unavailable widgets, and the report data itself once it is in.

import { AlertCircle, EyeOff, type LucideIcon } from 'lucide-react';

import { ReportDataView } from '@/components/reports/views/ReportDataView';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportData, SortClause } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import type { WidgetVisualKind } from './widgetMeta';

const TABLE_SKELETON_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];

/** Loading placeholder: a big figure plus a caption for a KPI, a few rows otherwise. */
export function WidgetSkeleton({ kind }: { kind: WidgetVisualKind }) {
  if (kind === 'kpi') {
    return (
      <div className="flex h-full flex-col justify-center gap-2 px-4 pb-3" data-testid="widget-skeleton">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
      </div>
    );
  }
  return (
    <div className="space-y-2.5 px-4 pb-3 pt-1" data-testid="widget-skeleton">
      {TABLE_SKELETON_WIDTHS.map((width) => (
        <Skeleton key={width} className={cn('h-4 rounded-md', width)} />
      ))}
    </div>
  );
}

interface WidgetMessageProps {
  icon: LucideIcon;
  message: string;
  tone?: 'muted' | 'danger';
}

/** A centred icon and one line of copy (errors, unavailable widgets). */
export function WidgetMessage({ icon: Icon, message, tone = 'muted' }: WidgetMessageProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[6rem] flex-col items-center justify-center gap-2 px-4 pb-3 text-center text-xs',
        tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
      )}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <Icon className={cn('h-5 w-5', tone === 'danger' ? 'text-rose-500' : 'text-slate-400')} />
      <p className="line-clamp-2 max-w-xs">{message}</p>
    </div>
  );
}

export function WidgetUnavailable({ message }: { message: string }) {
  return <WidgetMessage icon={EyeOff} message={message} />;
}

export interface WidgetReportContentProps {
  available: boolean;
  data: ReportData | null;
  error: string | null;
  /** Content shape, for the loading skeleton. */
  kind: WidgetVisualKind;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  /** Disables the table/pivot paging controls while a page fetch is in flight. */
  loading?: boolean;
  /** Placeholder copy when `available` is false. */
  unavailableMessage?: string;
  /** Table/pivot runtime header sort (session-only). */
  sort?: SortClause | null;
  onSortChange?: (sort: SortClause | null) => void;
  /** KPI only: makes the value a button that opens the underlying data. */
  onKpiValueClick?: () => void;
}

export function WidgetReportContent({
  available,
  data,
  error,
  kind,
  onPageChange,
  onSizeChange,
  loading,
  unavailableMessage = 'This report is no longer available.',
  sort,
  onSortChange,
  onKpiValueClick,
}: WidgetReportContentProps) {
  if (!available) return <WidgetUnavailable message={unavailableMessage} />;
  if (error) return <WidgetMessage icon={AlertCircle} message={error} tone="danger" />;
  if (!data) return <WidgetSkeleton kind={kind} />;
  return (
    <ReportDataView
      data={data}
      fill
      loading={loading}
      onPageChange={onPageChange}
      onSizeChange={onSizeChange}
      sort={sort}
      onSortChange={onSortChange}
      onKpiValueClick={onKpiValueClick}
    />
  );
}
