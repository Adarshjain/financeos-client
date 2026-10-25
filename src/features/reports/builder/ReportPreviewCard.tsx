'use client';

import React from 'react';

import { Banner, Button, Card, EmptyState, Skeleton, Text } from '@/components/ds';
import { ReportUnderlyingDialog } from '@/features/reports/underlying/ReportUnderlyingDialog';
import { categoryEntries, categoryRequest, categoryTarget, hasUnderlying, tableRowRequest, wholeReportRequest } from '@/features/reports/underlying/underlyingRequest';
import { ReportResult } from '@/features/reports/view/ReportResult';
import { formatDateRange } from '@/lib/date-range';
import { isChartData, isPivotTableData } from '@/lib/reports.helpers';
import type { ChartDefinition, DatasourceCatalog, ReportData, RunReportRequest } from '@/lib/reports.types';

import type { PreviewState } from './useReportPreview';

/** "last 90 days · 182 rows": what the shown result covers. */
function resultSummary(data: ReportData): string | null {
  const meta = 'meta' in data ? data.meta : null;
  const parts: string[] = [];
  if (meta?.dateRange) parts.push(formatDateRange(meta.dateRange.from, meta.dateRange.to));
  if (data.type === 'TABLE') parts.push(`${data.page.totalElements} rows`);
  else if (meta) parts.push(`${meta.rowCount} rows`);
  return parts.length ? parts.join(' · ') : null;
}

export interface ReportPreviewCardProps {
  preview: PreviewState;
  catalog: DatasourceCatalog;
  /** Messages of what is still missing, shown after a Preview was tried on an unfinished report. */
  missing: string[];
  onPreview: () => void;
}

/** The right card of the editor: the Preview button and the result it runs, never run on its own. */
export function ReportPreviewCard({ preview, catalog, missing, onPreview }: ReportPreviewCardProps) {
  const { shown, loading, error, stale } = preview;
  const summary = shown ? resultSummary(shown.data) : null;
  // The request of the rows behind a figure while the Underlying data dialog is open.
  // `entry` is the dropdown entry it opens on (a breakdown row's category); without it the dialog opens on All.
  // `pinned` is a request with its own pin (a chart entry's series): the dropdown's entries would drop it, so it has none.
  const [underlying, setUnderlying] = React.useState<{ request: RunReportRequest; entry?: number; pinned?: boolean } | null>(null);
  const open = (request: RunReportRequest | null, entry?: number, pinned?: boolean) => {
    if (request) setUnderlying({ request, entry, pinned });
  };
  const pivot = shown && isPivotTableData(shown.data) ? shown.data : null;
  const chart = shown && isChartData(shown.data) ? shown.data : null;
  const entries = React.useMemo(() => (chart && shown ? categoryEntries(shown.request, chart, catalog) : undefined), [chart, shown, catalog]);
  return (
    <Card>
      <div className="flex flex-col gap-space-12 p-space-16">
        <div className="flex items-start justify-between gap-space-12">
          <div className="flex flex-col min-w-0">
            <Text variant="heading" as="h2">
              Preview
            </Text>
            {summary ? (
              <Text variant="caption" tone="ink-3" as="p">
                {summary}
              </Text>
            ) : null}
          </div>
          <div className="flex items-center gap-space-12">
            {shown && hasUnderlying(shown.request) ? (
              <Text variant="label" as="span">
                <Button size="sm" variant="link" onClick={() => open(wholeReportRequest(shown.request))}>
                  Underlying data
                </Button>
              </Text>
            ) : null}
            <Button size="sm" variant="secondary" loading={loading} onClick={onPreview}>
              Preview
            </Button>
          </div>
        </div>

        {missing.length > 0 ? (
          <Banner tone="info" title="Finish configuring the report">
            {missing.join(' ')}
          </Banner>
        ) : null}

        {error ? (
          <Banner tone="danger" title="Could not run the report">
            {error}
          </Banner>
        ) : null}

        {stale && !loading ? (
          <Banner tone="warning" action={{ label: 'Refresh preview', onSelect: onPreview }}>
            Configuration changed since this result.
          </Banner>
        ) : null}

        {shown ? (
          <ReportResult
            data={shown.data}
            catalog={catalog}
            busy={loading}
            sort={shown.sort}
            onSortChange={preview.changeSort}
            onPageChange={preview.changePage}
            onSizeChange={preview.changeSize}
            definition={chart ? (shown.request.definition as ChartDefinition) : undefined}
            onOpenBreakdownRow={
              chart
                ? (index) => {
                    // The dialog opens on the row's entry; "All" in its dropdown is the whole report.
                    if (categoryRequest(shown.request, chart, index, catalog)) open(wholeReportRequest(shown.request), entries?.findIndex((e) => e.index === index));
                  }
                : undefined
            }
            onOpenChartEntry={
              chart
                ? (index, seriesName) => {
                    const target = categoryTarget(shown.request, chart, index, catalog, seriesName);
                    if (!target) return;
                    const entry = target.category === undefined ? -1 : (entries?.findIndex((e) => e.index === target.category) ?? -1);
                    // No dropdown entry for it: open its own pinned request, never "All".
                    if (target.category !== undefined && entry < 0) open(target.pinned ?? target.request, undefined, true);
                    else open(target.request, entry, target.category === undefined);
                  }
                : undefined
            }
            canOpenChartEntry={chart ? (index, seriesName) => categoryTarget(shown.request, chart, index, catalog, seriesName) !== null : undefined}
            onOpenTableRow={pivot ? (key) => open(tableRowRequest(shown.request, pivot, key, catalog)) : undefined}
            canOpenBreakdownRow={chart ? (index) => categoryRequest(shown.request, chart, index, catalog) !== null : undefined}
            canOpenTableRow={pivot ? (key) => tableRowRequest(shown.request, pivot, key, catalog) !== null : undefined}
          />
        ) : loading ? (
          <div className="flex flex-col gap-space-8">
            <Skeleton height={16} width="40%" />
            <Skeleton height={160} />
          </div>
        ) : error || missing.length > 0 ? null : (
          <EmptyState compact description="Click Preview to run this report." />
        )}
      </div>
      {underlying ? <ReportUnderlyingDialog
          key={JSON.stringify(underlying)}
          request={underlying.request}
          entries={underlying.pinned ? undefined : entries}
          initialEntry={underlying.entry !== undefined && underlying.entry >= 0 ? underlying.entry : undefined}
          dimensionLabel={
            chart && shown
              ? catalog.fields.find((f) => f.name === (shown.request.definition as ChartDefinition).dimension.field)?.label
              : undefined
          }
          onClose={() => setUnderlying(null)}
        /> : null}
    </Card>
  );
}
