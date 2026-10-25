'use client';

// A saved report's result inside a widget (and in its full-page view): the same ReportResult the report editor
// previews with, given the report's own datasource catalog (field labels, number formats) and, for a chart, its
// definition (breakdown columns and bars). Tables sort by header and page inside the widget.

import React from 'react';

import { Skeleton } from '@/components/ds';
import { workingCatalog } from '@/features/reports/builder/editorState';
import { ReportResult } from '@/features/reports/view/ReportResult';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { isChartData } from '@/lib/reports.helpers';
import type { ChartDefinition } from '@/lib/reports.types';

import { useReportCatalog } from './useReportCatalog';
import { type ReportWidgetState } from './useReportWidget';
import { useSavedReport } from './useSavedReport';

export function ReportWidgetBody({ widget, state }: { widget: WidgetResponse; state: ReportWidgetState }) {
  const report = useSavedReport(widget.reportId);
  const catalog = useReportCatalog();
  const datasource = React.useMemo(
    () => (report.data && catalog.data ? workingCatalog(catalog.data, report.data.datasource) : undefined),
    [report.data, catalog.data],
  );
  // The labels come with the report and the catalog; wait for them (or their failure) rather than flash field names.
  if (!state.data || report.isPending || catalog.isPending) return <Skeleton height={96} />;
  return (
    <ReportResult
      data={state.data}
      catalog={datasource}
      definition={isChartData(state.data) && report.data ? (report.data.definition as ChartDefinition) : undefined}
      kpiVariant="plain"
      busy={state.loading}
      sort={state.sort}
      onSortChange={state.setSort}
      onPageChange={state.setPage}
      onSizeChange={state.setSize}
    />
  );
}
