'use client';

// Dispatches a ReportData onto the matching presentational view (KPI / chart /
// raw table / pivot table). The single source of truth for "which view renders
// which report type", shared by the builder's live preview and the dashboard
// widget so the two never drift apart.
//
// `fill` selects between the two layout modes the views support: on, each view
// fills its parent's height (fixed-height containers like dashboard widgets);
// off, they grow with their content (flow layouts like the preview pane).

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

import {
  isChartData,
  isKpiData,
  isPivotTableData,
  isRawTableData,
} from '@/lib/reports.helpers';
import type { ReportData } from '@/lib/reports.types';

import { KpiView } from './KpiView';
import { PivotTableView } from './PivotTableView';
import { TableView } from './TableView';

/**
 * recharts is by far the heaviest dependency in the tree — it lands in its own
 * ~390 KB client chunk. Importing ChartView statically here put that chunk on
 * every route that can render a report, so a KPI-only report or a
 * table-only dashboard downloaded and parsed the whole charting library for
 * nothing.
 *
 * `ssr: false` because recharts sizes itself from measured DOM and has no
 * meaningful server render anyway.
 */
const ChartView = dynamic(
  () => import('./ChartView').then((m) => m.ChartView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[8rem] items-center justify-center text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    ),
  },
);

interface ReportDataViewProps {
  data: ReportData;
  fill?: boolean;
  /** Table/pivot paging — a runtime concern, never part of the definition. */
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  /** Disables table/pivot paging controls while a page fetch is in flight. */
  loading?: boolean;
}

export function ReportDataView({
  data,
  fill,
  onPageChange,
  onSizeChange,
  loading,
}: ReportDataViewProps) {
  if (isKpiData(data)) {
    return <KpiView data={data} className={fill ? 'h-full overflow-auto px-3' : undefined} />;
  }
  if (isChartData(data)) {
    return fill ? (
      <div className="h-full p-2">
        <ChartView data={data} fill />
      </div>
    ) : (
      <ChartView data={data} />
    );
  }
  if (isRawTableData(data)) {
    return <TableView data={data} fill={fill} loading={loading} onPageChange={onPageChange} onSizeChange={onSizeChange} />;
  }
  if (isPivotTableData(data)) {
    return <PivotTableView data={data} fill={fill} loading={loading} onPageChange={onPageChange} onSizeChange={onSizeChange} />;
  }
  return null;
}
