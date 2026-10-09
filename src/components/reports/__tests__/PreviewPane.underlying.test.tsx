import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
// The dialog has its own tests; here only whether it is mounted and with what.
vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: (props: {
    source: unknown;
    kpi: { value: number | null };
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div
      data-testid="vud"
      data-source={JSON.stringify(props.source)}
      data-title={props.title}
      data-value={String(props.kpi.value)}
      data-open={String(props.open)}
    >
      <button type="button" onClick={() => props.onOpenChange(false)}>
        Close underlying
      </button>
    </div>
  ),
}));

import { type BuilderState, initialBuilderState } from '@/components/reports/builderReducer';
import { PreviewPane } from '@/components/reports/PreviewPane';
import { api } from '@/lib/api/client';
import type { DatasourceCatalog, KpiData, TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const catalog = {
  operators: { number: [], string: [], enum: [], boolean: [], date: { absolute: [], relative: [] } },
  fields: [
    { name: 'amount', label: 'Amount', type: 'number', role: 'measure', allowedInReports: ['KPI', 'TABLE'] },
    { name: 'name', label: 'Name', type: 'string', role: 'dimension', allowedInReports: ['TABLE'] },
  ],
} as unknown as DatasourceCatalog;

const kpiState = (name = 'Monthly spend', aggregation: 'sum' | 'avg' = 'sum'): BuilderState => {
  const state = initialBuilderState('KPI', undefined, 'items');
  state.name = name;
  state.kpi = { measure: 'amount', aggregation, comparisonEnabled: true };
  return state;
};
const kpi = (value: number): KpiData => ({
  type: 'KPI', value, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
  meta: { rowCount: 1, dateRange: null as never },
});
const table: TableData = {
  type: 'TABLE', mode: 'raw',
  columns: [{ key: 'name', label: 'Name', type: 'string' }],
  rows: [{ id: 'r1', name: 'Row one' }],
  page: { number: 0, size: 50, totalElements: 1, totalPages: 1 },
};

const runBody = (call = -1) => (vi.mocked(api.POST).mock.calls.at(call)![1] as { body: unknown }).body;
const valueButton = () => screen.findByRole('button', { name: 'View underlying data' });
const vud = () => screen.getByTestId('vud');

describe('PreviewPane KPI "View underlying data"', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: kpi(4500) } as never);
  });

  it('is not mounted until the value is tapped', async () => {
    renderWithQuery(<PreviewPane state={kpiState()} catalog={catalog} autoRunOnMount />);
    await valueButton();
    expect(screen.queryByTestId('vud')).not.toBeInTheDocument();
  });

  it('tapping the value opens it as an ad-hoc source with the exact request the preview ran', async () => {
    renderWithQuery(<PreviewPane state={kpiState()} catalog={catalog} autoRunOnMount />);
    fireEvent.click(await valueButton());

    expect(JSON.parse(vud().dataset.source!)).toEqual({ kind: 'adhoc', request: runBody() });
    expect(vud()).toHaveAttribute('data-title', 'Monthly spend');
    expect(vud()).toHaveAttribute('data-value', '4500');
    expect(vud()).toHaveAttribute('data-open', 'true');
  });

  it('a blank name is titled "Untitled report"', async () => {
    renderWithQuery(<PreviewPane state={kpiState('   ')} catalog={catalog} autoRunOnMount />);
    fireEvent.click(await valueButton());
    expect(vud()).toHaveAttribute('data-title', 'Untitled report');
  });

  it('closing it unmounts it', async () => {
    renderWithQuery(<PreviewPane state={kpiState()} catalog={catalog} autoRunOnMount />);
    fireEvent.click(await valueButton());
    fireEvent.click(screen.getByRole('button', { name: 'Close underlying' }));
    expect(screen.queryByTestId('vud')).not.toBeInTheDocument();
  });

  it('an older run kept on screen while a newer one loads offers no tap', async () => {
    const { rerender } = renderWithQuery(<PreviewPane state={kpiState()} catalog={catalog} autoRunOnMount />);
    await valueButton();

    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    rerender(<PreviewPane state={kpiState('Monthly spend', 'avg')} catalog={catalog} autoRunOnMount />);
    fireEvent.click(await screen.findByRole('button', { name: /refresh preview/i }));

    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'View underlying data' })).not.toBeInTheDocument());
    expect(screen.getByText('4,500')).toBeInTheDocument();
  });

  it('a table preview has no value tap', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: table } as never);
    const state = initialBuilderState('TABLE', undefined, 'items');
    state.table.raw.columns = ['name'];
    renderWithQuery(<PreviewPane state={state} catalog={catalog} autoRunOnMount />);
    await screen.findByText('Row one');
    expect(screen.queryByRole('button', { name: 'View underlying data' })).not.toBeInTheDocument();
  });
});
