'use client';

// A saved report's result inside a widget: the same ReportResult the report editor
// previews with, given the report's own datasource catalog (field labels, number formats) and, for a chart, its
// definition (breakdown columns and bars). A KPI's figure, a chart entry, a breakdown row and an aggregated-table row open the underlying data (when the widget can), and the measure overline is left out: the widget has its own title. Tables sort by header and page inside the widget.

import React from 'react';

import { Skeleton } from '@/components/ds';
import { workingCatalog } from '@/features/reports/builder/editorStateModel';
import { categoryTarget, tableRowRequest, type UnderlyingTarget } from '@/features/reports/underlying/underlyingRequest';
import { ReportResult } from '@/features/reports/view/ReportResult';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { isChartData, isPivotTableData } from '@/lib/reports.helpers';
import type { ChartDefinition, RunReportRequest } from '@/lib/reports.types';

import { useReportCatalog } from './useReportCatalog';
import { type ReportWidgetState } from './useReportWidget';
import { useSavedReport } from './useSavedReport';

export interface ReportWidgetBodyProps {
  widget: WidgetResponse;
  state: ReportWidgetState;
  /** The KPI figure's opener: the whole report's underlying data. */
  onOpenUnderlying?: () => void;
  /** Chart entries and breakdown and table rows open the underlying data of that entry. Both are omitted when the widget cannot. */
  onOpenUnderlyingTarget?: (target: UnderlyingTarget) => void;
}

export function ReportWidgetBody({ widget, state, onOpenUnderlying, onOpenUnderlyingTarget }: ReportWidgetBodyProps) {
  const report = useSavedReport(widget.reportId);
  const catalog = useReportCatalog();
  const datasource = React.useMemo(
    () => (report.data && catalog.data ? workingCatalog(catalog.data, report.data.datasource) : undefined),
    [report.data, catalog.data],
  );
  // The labels come with the report and the catalog; wait for them (or their failure) rather than flash field names.
  if (!state.data || report.isPending || catalog.isPending) return <Skeleton height={96} />;
  // The request the widget runs is its saved report's; a header sort or page changes the rows shown, never the figure.
  const request = report.data ? ({ type: report.data.type, datasource: report.data.datasource, definition: report.data.definition } as RunReportRequest) : null;
  const chart = isChartData(state.data) ? state.data : null;
  const pivot = isPivotTableData(state.data) ? state.data : null;
  const open = request && datasource && onOpenUnderlyingTarget ? onOpenUnderlyingTarget : undefined;
  return (
    <ReportResult
      data={state.data}
      catalog={datasource}
      definition={chart && report.data ? (report.data.definition as ChartDefinition) : undefined}
      kpiVariant="plain"
      hideMeasure
      onOpenKpi={onOpenUnderlying}
      onOpenChartEntry={
        open && chart
          ? (index, seriesName) => {
              const target = categoryTarget(request!, chart, index, datasource!, seriesName);
              if (target) open(target);
            }
          : undefined
      }
      canOpenChartEntry={open && chart ? (index, seriesName) => categoryTarget(request!, chart, index, datasource!, seriesName) !== null : undefined}
      onOpenBreakdownRow={
        open && chart
          ? (index) => {
              const target = categoryTarget(request!, chart, index, datasource!);
              if (target) open(target);
            }
          : undefined
      }
      canOpenBreakdownRow={open && chart ? (index) => categoryTarget(request!, chart, index, datasource!) !== null : undefined}
      onOpenTableRow={
        open && pivot
          ? (key) => {
              const row = tableRowRequest(request!, pivot, key, datasource!);
              if (row) open({ request: row });
            }
          : undefined
      }
      canOpenTableRow={open && pivot ? (key) => tableRowRequest(request!, pivot, key, datasource!) !== null : undefined}
      busy={state.loading}
      sort={state.sort}
      onSortChange={state.setSort}
      onPageChange={state.setPage}
      onSizeChange={state.setSize}
    />
  );
}
