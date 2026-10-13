import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('../UnderlyingTransactionDialog', () => ({
  UnderlyingTransactionDialog: ({ transactionId }: { transactionId: string | null }) =>
    transactionId ? <div data-testid="txn-dialog">{transactionId}</div> : null,
}));

import { api } from '@/lib/api/client';
import type { KpiData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';
import { stubPhone } from '@/test/stubPhone';

import { KpiUnderlyingDialog } from '../KpiUnderlyingDialog';
import type { KpiUnderlyingResponse, UnderlyingSource } from '../underlying.types';

const UNDERLYING = '/api/v1/dashboards/builtins/{key}/underlying';
const source: UnderlyingSource = { kind: 'builtin', key: 'net_worth', params: {} };

// The net worth KPI: grouped by side, the measure is `value`.
const netWorthKpi: KpiData = {
  type: 'KPI',
  value: 15500,
  measure: 'value',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 3, dateRange: null },
};

const nwRows = [
  { id: 'a1', name: 'Savings', side: 'asset', kind: 'bank_account', value: 10000 },
  { id: 'a2', name: 'Broker', side: 'asset', kind: 'broker', value: 6000 },
  { id: 'l1', name: 'Card', side: 'liability', kind: 'credit_card', value: 500 },
];

const response = (over: Partial<KpiUnderlyingResponse> = {}): KpiUnderlyingResponse => ({
  period: 'current',
  datasource: 'net_worth',
  range: null,
  previousAvailable: false,
  measure: 'value',
  measureLabel: 'Value',
  aggregation: 'sum',
  format: 'currency',
  value: 15500,
  rowCount: 30,
  winnerOnly: false,
  summaryLines: [
    { label: 'Assets', value: 16000, format: 'currency' },
    { label: 'Liabilities', value: 500, format: 'currency' },
  ],
  filters: [],
  rowAction: 'breakdown',
  groupField: 'side',
  groupTotals: { asset: 16000, liability: 500 },
  notCounted: [],
  sortKey: null,
  sortDirection: null,
  table: {
    type: 'TABLE',
    mode: 'raw',
    columns: [
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset', liability: 'Liability' } },
      { key: 'kind', label: 'Kind', type: 'enum', valueLabels: { bank_account: 'Bank account', broker: 'Broker', credit_card: 'Credit card' } },
      { key: 'value', label: 'Value', type: 'number', format: 'currency' },
    ],
    rows: nwRows,
    page: { number: 0, size: 25, totalElements: 30, totalPages: 2 },
  },
  ...over,
});

type Body = { params?: { query?: Record<string, unknown> } };
let respond: (query: Record<string, unknown>) => Promise<unknown>;

const underlyingCalls = () =>
  (vi.mocked(api.POST).mock.calls as unknown as [string, Body][])
    .filter(([path]) => path === UNDERLYING)
    .map(([, init]) => init.params!.query!);

function render(kpi: KpiData | undefined = netWorthKpi) {
  return renderWithQuery(
    <KpiUnderlyingDialog source={source} kpi={kpi} title="Net worth" open onOpenChange={vi.fn()} />,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  respond = () => Promise.resolve({ data: response() });
  vi.mocked(api.POST).mockImplementation(((path: string, init: Body) => {
    if (path === UNDERLYING) return respond(init.params!.query!);
    return Promise.resolve({ data: new Blob(['a,b']) });
  }) as never);
});

afterEach(() => vi.unstubAllGlobals());

const region = (name: string) => screen.getByRole('region', { name });
const bodyRows = (scope: HTMLElement) => within(scope).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);

describe('VUD grouped rows (desktop)', () => {
  it('draws one table per side headed by its total, the kind beside the name, and neither a Side nor a Kind column', async () => {
    render();
    await screen.findByText('Savings');
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Asset', 'Liability']);
    const asset = region('Asset');
    expect(within(asset).getByRole('heading', { level: 3 })).toHaveTextContent('Asset');
    expect(within(asset).getByText('₹16,000.00')).toBeInTheDocument();
    expect(within(asset).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    expect(bodyRows(asset).map(cellText)).toEqual([
      ['Savings Bank account', '₹10,000.00'],
      ['Broker Broker', '₹6,000.00'],
    ]);
    const liability = region('Liability');
    expect(within(liability).getByRole('heading', { level: 3 }).nextElementSibling).toHaveTextContent('₹500.00');
    expect(bodyRows(liability).map(cellText)).toEqual([['Card Credit card', '₹500.00']]);
    expect(screen.queryByRole('columnheader', { name: 'Side' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Kind' })).not.toBeInTheDocument();
  });

  it('keeps the tables split once a header sorts the rows, every table marking the sort', async () => {
    render();
    await screen.findByText('Savings');
    const sorted = [nwRows[2], nwRows[1], nwRows[0]];
    respond = (q) =>
      Promise.resolve({
        data: q.sort
          ? response({ sortKey: 'value', sortDirection: 'asc', table: { ...response().table, rows: sorted } })
          : response(),
      });
    fireEvent.click(within(region('Liability')).getByRole('button', { name: 'Value' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 0, sort: 'value,asc' }));
    await waitFor(() =>
      expect(bodyRows(region('Asset')).map((r) => cellText(r)[0])).toEqual(['Broker Broker', 'Savings Bank account']),
    );
    expect(within(region('Asset')).getByRole('columnheader', { name: 'Value' })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(region('Liability')).getByRole('columnheader', { name: 'Value' })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(region('Asset')).getByText('₹16,000.00')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Side' })).not.toBeInTheDocument();
  });

  it('prints no count, no aggregate and no summary lines under the rows, but still pages — with one pager', async () => {
    render();
    await screen.findByText('Savings');
    expect(screen.queryByText(/30 rows/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Sum /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Assets /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Liabilities /)).not.toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 1 }));
  });

  it('heads each table plainly when the response carries no totals', async () => {
    respond = () => Promise.resolve({ data: response({ groupTotals: {} }) });
    render();
    await screen.findByText('Savings');
    expect(within(region('Asset')).getByRole('heading', { level: 3 })).toHaveTextContent('Asset');
    expect(screen.queryByText('₹16,000.00')).not.toBeInTheDocument();
    expect(bodyRows(region('Asset'))).toHaveLength(2);
  });
});

describe('VUD rupee figures', () => {
  // The user's saved KPI: transactions amount, summed over the last 2 years, no comparison.
  const spendKpi: KpiData = {
    type: 'KPI',
    value: -123456.5,
    measure: 'amount',
    aggregation: 'sum',
    format: 'currency',
    comparison: null,
    meta: { rowCount: 1559, dateRange: { from: '2024-10-10', to: '2026-10-10' } },
  };

  it('heads the dialog with the KPI value in rupees', async () => {
    respond = () => Promise.resolve({ data: response({ measure: 'amount', value: -123456.5, groupField: null }) });
    render(spendKpi);
    expect(screen.getByText('-₹1,23,456.50')).toBeInTheDocument();
    await screen.findByText('Savings');
  });

  it('heads a headless dialog with the response value in rupees', async () => {
    render(undefined);
    expect(await screen.findByText('₹15,500.00')).toBeInTheDocument();
  });

  it('labels the previous tab with the previous value in rupees', async () => {
    render({
      ...spendKpi,
      comparison: {
        previousValue: 800,
        previousDateRange: { from: '2022-10-10', to: '2024-10-09' },
        change: -124256.5,
        changePercent: null,
        direction: 'down',
        sentiment: 'neutral',
      },
    });
    expect(screen.getByRole('tab', { name: /Previous · .* · ₹800\.00$/ })).toBeInTheDocument();
    await screen.findByText('Savings');
  });

  it('keeps a count KPI a plain number', async () => {
    respond = () => Promise.resolve({ data: response({ measure: 'amount', aggregation: 'count', value: 1559, groupField: null }) });
    render({ ...spendKpi, aggregation: 'count', value: 1559 });
    expect(screen.getByText('1,559')).toBeInTheDocument();
    await screen.findByText('Savings');
  });
});

describe('VUD on a phone', () => {
  beforeEach(() => stubPhone(true));

  it('lists the rows as cards under a heading per side with its total, the measure as the figure, the kind beside the name', async () => {
    render();
    const asset = await screen.findByRole('region', { name: 'Asset' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(asset).getByText('₹16,000.00')).toBeInTheDocument();
    const savings = within(asset).getByRole('button', { name: /Savings/ });
    expect(within(savings).getByText('₹10,000.00')).toHaveClass('font-semibold');
    expect(within(savings).getByText('Bank account')).toHaveClass('text-slate-500');
    expect(within(savings).queryByText(/·/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Liability' })).getByText('Card')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: 'Sort' })).toHaveLength(1);
  });

  it('opens a row breakdown from a card', async () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    render();
    fireEvent.click(await screen.findByRole('button', { name: /Broker/ }));
    expect(await screen.findByTestId('breakdown-loading')).toBeInTheDocument();
    expect(vi.mocked(api.GET).mock.calls[0][1]).toMatchObject({
      params: { path: { name: 'net_worth', rowId: 'a2' } },
    });
  });

  it('sorts on the server from the Sort select and reverses with the direction toggle', async () => {
    render();
    await screen.findByRole('region', { name: 'Asset' });
    respond = (q) =>
      Promise.resolve({
        data: q.sort
          ? response({ sortKey: 'value', sortDirection: String(q.sort).endsWith('desc') ? 'desc' : 'asc' })
          : response(),
      });
    // Neither the side (the section) nor the kind (beside the name) is on offer.
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Default order', 'Name', 'Value']);
    fireEvent.click(screen.getByRole('option', { name: 'Value' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toEqual({ period: 'current', page: 0, size: 25, sort: 'value,asc' }));
    // Sorted: the sides keep their own card lists.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sort ascending' })).toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Asset' })).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Savings/ })).queryByText(/Asset/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 0, sort: 'value,desc' }));
    fireEvent.click(screen.getByRole('option', { name: 'Default order' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ sort: undefined }));
  });

  it('pages the cards without a row count', async () => {
    render();
    await screen.findByRole('region', { name: 'Asset' });
    expect(screen.queryByText(/30 rows/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 1 }));
  });
});
