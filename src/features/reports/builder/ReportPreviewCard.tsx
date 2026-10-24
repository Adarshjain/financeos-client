'use client';

import React from 'react';

import { Banner, Button, Card, EmptyState, Skeleton, Text } from '@/components/ds';
import { ReportResult } from '@/features/reports/view/ReportResult';
import { formatDateRange } from '@/lib/date-range';
import type { DatasourceCatalog, ReportData } from '@/lib/reports.types';

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
          <Button size="sm" variant="secondary" loading={loading} onClick={onPreview}>
            Preview
          </Button>
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
    </Card>
  );
}
