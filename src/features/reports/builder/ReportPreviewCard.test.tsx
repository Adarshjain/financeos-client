import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartData, DatasourceCatalog, PivotTableData, RunReportRequest } from '@/lib/reports.types';

import { catalogFixture } from './editor.fixtures';
import { ReportPreviewCard } from './ReportPreviewCard';
import type { PreviewState } from './useReportPreview';

const underlyingRequest = vi.hoisted(() => ({
  categoryRequest: vi.fn(),
  tableRowRequest: vi.fn(),
}));
const mounted = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/underlying/underlyingRequest', async (orig) => ({
  ...(await orig<typeof import('@/features/reports/underlying/underlyingRequest')>()),
  ...underlyingRequest,
}));
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ request, onClose }: { request: unknown; onClose: () => void }) => {
    React.useEffect(() => mounted(), []);
    return (
      <div data-testid="underlying">
        {JSON.stringify(request)}
        <button onClick={onClose}>close</button>
      </div>
    );
  },
}));
vi.mock('@/features/reports/view/ReportResult', () => ({
  ReportResult: (p: {
    onOpenBreakdownRow?: (i: number) => void;
    onOpenTableRow?: (k: string) => void;
    canOpenTableRow?: (k: string) => boolean;
  }) => (
    <div>
      <button onClick={() => p.onOpenBreakdownRow?.(2)}>breakdown row</button>
      <button onClick={() => p.onOpenTableRow?.('r1')}>table row</button>
      <span>{p.canOpenTableRow ? String(p.canOpenTableRow('r1')) : 'no-gate'}</span>
    </div>
  ),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });
const ds = catalogFixture.datasources[0];
const catalog: DatasourceCatalog = { fields: ds.fields, operators: catalogFixture.operators };

const chartRequest: RunReportRequest = {
  type: 'CHART',
  datasource: 'transactions',
  definition: { chartType: 'breakdown', dimension: { field: 'category' }, measure: { field: 'spend', aggregation: 'sum' }, filters: [] },
};
const rawRequest: RunReportRequest = {
  type: 'TABLE',
  datasource: 'transactions',
  definition: { mode: 'raw', columns: ['date'], filters: [] },
};
const chartData = { type: 'CHART', chartType: 'breakdown', dimension: 'category', categories: ['a'], series: [], measure: { field: 'spend', aggregation: 'sum' }, meta: { rowCount: 1, dateRange: null } } as unknown as ChartData;
const pivotData = { type: 'TABLE', mode: 'aggregated', rowDimensions: [], columnDimensions: [], measures: [], columns: [], rows: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 } } as unknown as PivotTableData;
const rawData = { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 } };

function preview(request: RunReportRequest, data: unknown): PreviewState {
  return {
    shown: { data, request, signature: 's', page: 0, size: 25, sort: null },
    loading: false,
    error: null,
    stale: false,
    run: vi.fn(),
    changePage: vi.fn(),
    changeSize: vi.fn(),
    changeSort: vi.fn(),
  } as unknown as PreviewState;
}

const card = (p: PreviewState) => render(<ReportPreviewCard preview={p} catalog={catalog} missing={[]} onPreview={vi.fn()} />);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ReportPreviewCard underlying data', () => {
  it('hides the Underlying data link for a report without a measure', () => {
    card(preview(rawRequest, rawData));
    expect(screen.queryByRole('button', { name: 'Underlying data' })).not.toBeInTheDocument();
  });

  it('opens the whole report from the link', async () => {
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(screen.getByTestId('underlying')).toHaveTextContent('"type":"KPI"');
  });

  it('asks categoryRequest for a pressed breakdown row, with the catalog, and opens its request', async () => {
    underlyingRequest.categoryRequest.mockReturnValue({ type: 'KPI', datasource: 'transactions', definition: { marker: 1 } });
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(underlyingRequest.categoryRequest).toHaveBeenCalledWith(chartRequest, chartData, 2, catalog);
    expect(screen.getByTestId('underlying')).toHaveTextContent('"marker":1');
  });

  it('opens nothing for a breakdown row with no request', async () => {
    underlyingRequest.categoryRequest.mockReturnValue(null);
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });

  it('does not make a table row pressable when it has no request', () => {
    underlyingRequest.tableRowRequest.mockReturnValue(null);
    card(preview({ ...chartRequest, type: 'TABLE' }, pivotData));
    expect(screen.getByText('false')).toBeInTheDocument();
    expect(underlyingRequest.tableRowRequest).toHaveBeenCalledWith(expect.anything(), pivotData, 'r1', catalog);
  });

  it('starts a fresh dialog when the request changes', async () => {
    underlyingRequest.categoryRequest.mockReturnValueOnce({ type: 'KPI', datasource: 'transactions', definition: { n: 1 } });
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(screen.getByTestId('underlying')).toHaveTextContent('"n":1');
    underlyingRequest.categoryRequest.mockReturnValueOnce({ type: 'KPI', datasource: 'transactions', definition: { n: 2 } });
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(screen.getByTestId('underlying')).toHaveTextContent('"n":2');
    // A new request is a new mount, so period, sort, page and CSV error start over.
    expect(mounted).toHaveBeenCalledTimes(2);
  });
});
