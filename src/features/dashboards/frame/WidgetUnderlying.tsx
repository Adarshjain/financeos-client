'use client';

// "View underlying data" of a report widget: the rows behind its figure, in the report editor's dialog. The
// saved report's definition and the datasource catalog are read when it opens (nothing is fetched before); a chart
// gets the dialog's entry dropdown to narrow the rows to one category. A report with no figure to list (a raw
// table) says so instead.

import React from 'react';

import { showToast } from '@/components/ds';
import { workingCatalog } from '@/features/reports/builder/editorStateModel';
import { ReportUnderlyingDialog } from '@/features/reports/underlying/ReportUnderlyingDialog';
import { categoryEntries, type UnderlyingTarget, wholeReportRequest } from '@/features/reports/underlying/underlyingRequest';
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
  /** A chart entry or row to open on; without it the whole report. */
  target?: UnderlyingTarget | null;
  onClose: () => void;
}

export function WidgetUnderlying({ widget, data, target, onClose }: WidgetUnderlyingProps) {
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
  // A category target keeps the entries dropdown and opens on its entry. When the dropdown has no such entry, or no
  // data to list them from, the target's own pinned request opens instead, with no dropdown (never "All").
  const initialEntry = target?.category !== undefined ? (entries?.findIndex((e) => e.index === target.category) ?? -1) : undefined;
  const dropdown = !target || (initialEntry !== undefined && initialEntry >= 0);
  return (
    <ReportUnderlyingDialog
      request={!target ? whole : dropdown || !target.pinned ? target.request : target.pinned}
      entries={dropdown ? entries : undefined}
      initialEntry={initialEntry !== undefined && initialEntry >= 0 ? initialEntry : undefined}
      dimensionLabel={
        chart && request ? datasource.fields.find((f) => f.name === (request.definition as ChartDefinition).dimension.field)?.label : undefined
      }
      title={`Underlying data · ${widgetTitle(widget)}`}
      onClose={onClose}
    />
  );
}
