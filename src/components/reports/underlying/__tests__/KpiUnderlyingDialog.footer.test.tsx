import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { api } from '@/lib/api/client';
import type { KpiData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { KpiUnderlyingDialog } from '../KpiUnderlyingDialog';
import type { KpiUnderlyingResponse, UnderlyingSource } from '../underlying.types';

// The footer follows the body: Download CSV exports the KPI's own rows, so it
// is offered on the list only; inside a row breakdown the footer is just Close.

const UNDERLYING = '/api/v1/reports/underlying';
const CSV = '/api/v1/reports/underlying/csv';

const source: UnderlyingSource = {
  kind: 'adhoc',
  request: { type: 'KPI', datasource: 'net_worth', definition: { measure: 'amount', aggregation: 'sum', filters: [] } },
};

const kpi: KpiData = {
  type: 'KPI',
  value: 2500,
  measure: 'amount',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 2, dateRange: null },
};

const response: KpiUnderlyingResponse = {
  period: 'current',
  datasource: 'net_worth',
  range: null,
  previousAvailable: false,
  measure: 'amount',
  measureLabel: 'Amount',
  aggregation: 'sum',
  format: 'currency',
  value: 2500,
  rowCount: 2,
  winnerOnly: false,
  summaryLines: [],
  filters: [],
  rowAction: 'breakdown',
  groupField: null,
  notCounted: [],
  sortKey: null,
  sortDirection: null,
  table: {
    type: 'TABLE',
    mode: 'raw',
    columns: [{ key: 'name', label: 'Name', type: 'string' }],
    rows: [
      { id: 'a1', name: 'HDFC Savings' },
      { id: 'a2', name: 'Axis Card' },
    ],
    page: { number: 0, size: 25, totalElements: 2, totalPages: 1 },
  },
} as KpiUnderlyingResponse;

const breakdown = {
  datasource: 'net_worth',
  rowId: 'a1',
  title: 'HDFC Savings breakdown',
  total: 1000,
  totalLabel: 'Balance',
  format: 'currency',
  asOf: '2026-10-09',
  steps: [],
  sections: [],
  notes: [],
};

function render() {
  const onOpenChange = vi.fn();
  renderWithQuery(
    <KpiUnderlyingDialog source={source} kpi={kpi} title="Net worth" open onOpenChange={onOpenChange} />,
  );
  return { onOpenChange };
}

const footer = () => document.querySelector('[data-slot="dialog-footer"]') as HTMLElement;

describe('KpiUnderlyingDialog footer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockImplementation(((path: string) =>
      path === UNDERLYING
        ? Promise.resolve({ data: response })
        : Promise.resolve({ data: new Blob(['a,b']) })) as never);
    vi.mocked(api.GET).mockResolvedValue({ data: breakdown } as never);
  });

  it('offers Download CSV and Close on the list', async () => {
    render();
    await screen.findByText('Axis Card');
    const buttons = within(footer()).getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Close', 'Download CSV']);
  });

  it('offers only Close while a row breakdown is open', async () => {
    render();
    fireEvent.click(await screen.findByText('HDFC Savings'));
    await screen.findByText('HDFC Savings breakdown');
    const buttons = within(footer()).getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Close']);
    expect(within(footer()).queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
  });

  it('closes the dialog from the breakdown footer Close', async () => {
    const { onOpenChange } = render();
    fireEvent.click(await screen.findByText('HDFC Savings'));
    await screen.findByText('HDFC Savings breakdown');
    fireEvent.click(within(footer()).getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.POST).not.toHaveBeenCalledWith(CSV, expect.anything());
  });

  it('brings Download CSV back after Back returns to the list, and it still downloads', async () => {
    render();
    fireEvent.click(await screen.findByText('HDFC Savings'));
    await screen.findByText('HDFC Savings breakdown');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText('Axis Card');
    const buttons = within(footer()).getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Close', 'Download CSV']);
    fireEvent.click(within(footer()).getByRole('button', { name: 'Download CSV' }));
    await vi.waitFor(() => expect(api.POST).toHaveBeenCalledWith(CSV, expect.anything()));
  });
});
