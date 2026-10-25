import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartData, DatasourceCatalog, PivotTableData, RunReportRequest } from '@/lib/reports.types';

import { catalogFixture } from './editor.fixtures';
import { ReportPreviewCard } from './ReportPreviewCard';
import type { PreviewState } from './useReportPreview';

const underlyingRequest = vi.hoisted(() => ({
  categoryEntries: vi.fn(),
  categoryRequest: vi.fn(),
  tableRowRequest: vi.fn(),
}));
const mounted = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/underlying/underlyingRequest', async (orig) => ({
  ...(await orig<typeof import('@/features/reports/underlying/underlyingRequest')>()),
  ...underlyingRequest,
}));
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({
    request,
    entries,
    dimensionLabel,
    initialEntry,
    onClose,
  }: {
    request: unknown;
    entries?: unknown[];
    dimensionLabel?: string;
    initialEntry?: number;
    onClose: () => void;
  }) => {
    React.useEffect(() => mounted(), []);
    return (
      <div data-testid="underlying">
        {JSON.stringify(request)}
        <span data-testid="entries">{entries ? `${entries.length} entries` : 'no entries'}</span>
        <span data-testid="initial">{initialEntry === undefined ? 'no initial' : `initial ${initialEntry}`}</span>
        <span data-testid="dimension">{dimensionLabel ?? 'no label'}</span>
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
  it('gives a chart result the category entries and the dimension label to the dialog', async () => {
    underlyingRequest.categoryEntries.mockReturnValue([{ label: 'Food', request: {} }]);
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(underlyingRequest.categoryEntries).toHaveBeenCalledWith(chartRequest, chartData, catalog);
    expect(screen.getByTestId('entries')).toHaveTextContent('1 entries');
    expect(screen.getByTestId('dimension')).toHaveTextContent(catalog.fields.find((f) => f.name === 'category')!.label);
  });

  it('gives a table result no entries', async () => {
    card(preview({ ...chartRequest, type: 'TABLE' }, pivotData));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(screen.getByTestId('entries')).toHaveTextContent('no entries');
    expect(screen.getByTestId('dimension')).toHaveTextContent('no label');
  });

  it('hides the Underlying data link for a report without a measure', () => {
    card(preview(rawRequest, rawData));
    expect(screen.queryByRole('button', { name: 'Underlying data' })).not.toBeInTheDocument();
  });

  it('opens the whole report from the link', async () => {
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(screen.getByTestId('underlying')).toHaveTextContent('"type":"KPI"');
  });

  it('asks categoryRequest for a pressed breakdown row, with the catalog, and opens the whole report on that row\'s entry', async () => {
    underlyingRequest.categoryRequest.mockReturnValue({ type: 'KPI', datasource: 'transactions', definition: { marker: 1 } });
    underlyingRequest.categoryEntries.mockReturnValue([
      { label: 'a', request: {}, index: 0 },
      { label: 'c', request: {}, index: 2 },
    ]);
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(underlyingRequest.categoryRequest).toHaveBeenCalledWith(chartRequest, chartData, 2, catalog);
    expect(screen.getByTestId('underlying')).not.toHaveTextContent('"marker":1');
    expect(screen.getByTestId('underlying')).toHaveTextContent('"type":"KPI"');
    expect(screen.getByTestId('initial')).toHaveTextContent('initial 1');
  });

  it('opens the link on All, without an initial entry', async () => {
    underlyingRequest.categoryEntries.mockReturnValue([{ label: 'a', request: {}, index: 0 }]);
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(screen.getByTestId('initial')).toHaveTextContent('no initial');
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

  it('starts a fresh dialog when the opened entry changes', async () => {
    underlyingRequest.categoryRequest.mockReturnValue({ type: 'KPI', datasource: 'transactions', definition: {} });
    underlyingRequest.categoryEntries.mockReturnValue([
      { label: 'a', request: {}, index: 0 },
      { label: 'c', request: {}, index: 2 },
    ]);
    card(preview(chartRequest, chartData));
    await user.click(screen.getByRole('button', { name: 'breakdown row' }));
    expect(screen.getByTestId('initial')).toHaveTextContent('initial 1');
    await user.click(screen.getByRole('button', { name: 'Underlying data' }));
    expect(screen.getByTestId('initial')).toHaveTextContent('no initial');
    // A new entry is a new mount, so period, sort, page and CSV error start over.
    expect(mounted).toHaveBeenCalledTimes(2);
  });
});
