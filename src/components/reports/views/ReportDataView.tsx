// Dispatches a ReportData onto the matching presentational view (KPI / chart /
// raw table / pivot table). The single source of truth for "which view renders
// which report type", shared by the builder's live preview and the dashboard
// widget so the two never drift apart.
//
// `fill` selects between the two layout modes the views support: on, each view
// fills its parent's height (fixed-height containers like dashboard widgets);
// off, they grow with their content (flow layouts like the preview pane).

import {
  isChartData,
  isKpiData,
  isPivotTableData,
  isRawTableData,
} from '@/lib/reports.helpers';
import type { ReportData } from '@/lib/reports.types';

import { ChartView } from './ChartView';
import { KpiView } from './KpiView';
import { PivotTableView } from './PivotTableView';
import { TableView } from './TableView';

interface ReportDataViewProps {
  data: ReportData;
  fill?: boolean;
  /** Table/pivot paging — a runtime concern, never part of the definition. */
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
}

export function ReportDataView({
  data,
  fill,
  onPageChange,
  onSizeChange,
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
    return <TableView data={data} fill={fill} onPageChange={onPageChange} onSizeChange={onSizeChange} />;
  }
  if (isPivotTableData(data)) {
    return <PivotTableView data={data} fill={fill} onPageChange={onPageChange} onSizeChange={onSizeChange} />;
  }
  return null;
}
