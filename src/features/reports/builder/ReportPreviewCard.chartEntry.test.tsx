import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ChartData, DatasourceCatalog, RunReportRequest } from '@/lib/reports.types';

import { catalogFixture } from './editor.fixtures';
import { ReportPreviewCard } from './ReportPreviewCard';
import type { PreviewState } from './useReportPreview';

vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ request, entries, initialEntry }: { request: unknown; entries?: unknown[]; initialEntry?: number }) => (
    <div data-testid="underlying">
      {JSON.stringify(request)}
      <span data-testid="entries">{entries ? `${entries.length} entries` : 'no entries'}</span>
      <span data-testid="initial">{initialEntry === undefined ? 'no initial' : `initial ${initialEntry}`}</span>
    </div>
  ),
}));
vi.mock('@/features/reports/view/ReportResult', () => ({
  ReportResult: (p: { onOpenChartEntry?: (i: number, s?: string) => void; canOpenChartEntry?: (i: number, s?: string) => boolean }) => (
    <div>
      <span data-testid="gate">{String([p.canOpenChartEntry?.(1), p.canOpenChartEntry?.(2)])}</span>
      <button onClick={() => p.onOpenChartEntry?.(1)}>Rent bar</button>
      <button onClick={() => p.onOpenChartEntry?.(1, 'DEBIT')}>Rent debit bar</button>
      <button onClick={() => p.onOpenChartEntry?.(2)}>Other bar</button>
    </div>
  ),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });
const ds = catalogFixture.datasources[0];
const catalog: DatasourceCatalog = { fields: ds.fields, operators: catalogFixture.operators };
const request: RunReportRequest = {
  type: 'CHART',
  datasource: 'transactions',
  definition: { chartType: 'bar', dimension: { field: 'category' }, series: { field: 'type' }, measure: { field: 'spend', aggregation: 'sum' }, filters: [] },
};
const data = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food', 'Rent', 'Other'],
  series: [{ name: 'DEBIT', data: [1, 2, 3] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 3, dateRange: null },
  other: { index: 2, foldedCount: 4 },
} as unknown as ChartData;
const preview = { shown: { data, request, signature: 's', page: 0, size: 25, sort: null }, loading: false, error: null, stale: false } as unknown as PreviewState;
const card = () => render(<ReportPreviewCard preview={preview} catalog={catalog} missing={[]} onPreview={vi.fn()} />);

describe('ReportPreviewCard chart entry press', () => {
  it('opens the whole report on the category\'s entry, with the dropdown', async () => {
    card();
    await user.click(screen.getByRole('button', { name: 'Rent bar' }));
    expect(screen.getByTestId('underlying')).toHaveTextContent('"type":"KPI"');
    expect(screen.getByTestId('underlying')).not.toHaveTextContent('Rent');
    expect(screen.getByTestId('entries')).toHaveTextContent('2 entries');
    expect(screen.getByTestId('initial')).toHaveTextContent('initial 1');
  });

  it('opens a multi-series entry on the request pinned to category and series, without the dropdown', async () => {
    card();
    await user.click(screen.getByRole('button', { name: 'Rent debit bar' }));
    const text = screen.getByTestId('underlying').textContent!;
    expect(text).toContain('"field":"category","operator":"is","value":"Rent"');
    expect(text).toContain('"field":"type","operator":"is","value":"DEBIT"');
    expect(screen.getByTestId('entries')).toHaveTextContent('no entries');
    expect(screen.getByTestId('initial')).toHaveTextContent('no initial');
  });

  it('gates the chart: Rent can open, the Other slot cannot', () => {
    card();
    expect(screen.getByTestId('gate')).toHaveTextContent('true,false');
  });

  it('opens nothing for the Other slot', async () => {
    card();
    await user.click(screen.getByRole('button', { name: 'Other bar' }));
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });
});
