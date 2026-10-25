'use client';

// "View underlying data" of a report widget: the rows behind its figure, in the report editor's dialog. The
// saved report's definition and the datasource catalog are read when it opens (nothing is fetched before); a chart
// gets the dialog's entry dropdown to narrow the rows to one category. A report with no figure to list (a raw
// table) says so instead.

import React from 'react';

import { showToast } from '@/components/ds';
import { workingCatalog } from '@/features/reports/builder/editorState';
import { ReportUnderlyingDialog } from '@/features/reports/underlying/ReportUnderlyingDialog';
import { categoryEntries, wholeReportRequest } from '@/features/reports/underlying/underlyingRequest';
import { widgetTitle } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { isChartData } from '@/lib/reports.helpers';
import type { ChartDefinition, ReportData, RunReportRequest } from '@/lib/reports.types';

import { useReportCatalog } from './useReportCatalog';
import { useSavedReport } from './useSavedReport';

export const NO_UNDERLYING = 'This report has no figure to list rows for.';
export const UNDERLYING_FAILED = "Couldn't open the underlying data. Try again.";

export interface WidgetUnderlyingProps {
  widget: WidgetResponse;
  /** The widget's loaded result (a chart's categories come from it). */
  data: ReportData | null;
  onClose: () => void;
}

export function WidgetUnderlying({ widget, data, onClose }: WidgetUnderlyingProps) {
  const saved = useSavedReport(widget.reportId);
  const catalog = useReportCatalog();
  const datasource = React.useMemo(
    () => (saved.data && catalog.data ? workingCatalog(catalog.data, saved.data.datasource) : undefined),
    [saved.data, catalog.data],
  );

  const request = React.useMemo<RunReportRequest | null>(
    () => (saved.data ? ({ type: saved.data.type, datasource: saved.data.datasource, definition: saved.data.definition } as RunReportRequest) : null),
    [saved.data],
  );
  const whole = React.useMemo(() => (request ? wholeReportRequest(request) : null), [request]);
  const failed = saved.isError || catalog.isError;
  const noFigure = request !== null && whole === null;

  React.useEffect(() => {
    if (!failed && !noFigure) return;
    showToast(failed ? UNDERLYING_FAILED : NO_UNDERLYING, { tone: 'danger' });
    onClose();
  }, [failed, noFigure, onClose]);

  const chart = data && isChartData(data) ? data : null;
  const entries = React.useMemo(
    () => (request && chart && datasource ? categoryEntries(request, chart, datasource) : undefined),
    [request, chart, datasource],
  );

  if (!whole || !datasource) return null;
  return (
    <ReportUnderlyingDialog
      request={whole}
      entries={entries}
      dimensionLabel={
        chart && request ? datasource.fields.find((f) => f.name === (request.definition as ChartDefinition).dimension.field)?.label : undefined
      }
      title={`Underlying data · ${widgetTitle(widget)}`}
      onClose={onClose}
    />
  );
}
