import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

// Covered by its own tests; here only which transaction the dialog asks for.
vi.mock('../UnderlyingTransactionDialog', () => ({
  UnderlyingTransactionDialog: ({ transactionId }: { transactionId: string | null }) =>
    transactionId ? <div data-testid="txn-dialog">{transactionId}</div> : null,
}));

import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import type { KpiData, RunReportRequest } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { KpiUnderlyingDialog } from '../KpiUnderlyingDialog';
import { formatAmount } from '../underlying.helpers';
import type { KpiUnderlyingResponse, UnderlyingSource } from '../underlying.types';

const UNDERLYING = '/api/v1/reports/underlying';
const CSV = '/api/v1/reports/underlying/csv';
const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';

const request: RunReportRequest = {
  type: 'KPI',
  datasource: 'transactions',
  definition: { measure: 'amount', aggregation: 'sum', filters: [] },
};
const source: UnderlyingSource = { kind: 'adhoc', request };
const money = (n: number) => formatAmount(n, 'currency');

const kpi = (over: Partial<KpiData> = {}): KpiData => ({
  type: 'KPI',
  value: 4500,
  measure: 'amount',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 3, dateRange: { from: '2026-09-01', to: '2026-09-30' } },
  ...over,
});

const comparison = (over: Partial<NonNullable<KpiData['comparison']>> = {}): KpiData['comparison'] => ({
  previousValue: 800,
  previousDateRange: { from: '2026-08-01', to: '2026-08-31' },
  change: 3700,
  changePercent: 462.5,
  direction: 'up',
  sentiment: 'good',
  ...over,
});

const rows = [
  { id: 't1', description: 'Coffee', amount: 1000, side: 'asset' },
  { id: 't2', description: 'Fuel', amount: 1500, side: 'asset' },
  { id: 't3', description: 'Card', amount: 2000, side: 'liability' },
];

const response = (over: Partial<KpiUnderlyingResponse> = {}, tableRows: Record<string, unknown>[] = rows, pageNo = 0): KpiUnderlyingResponse => ({
  period: 'current',
  datasource: 'transactions',
  range: { from: '2026-09-01', to: '2026-09-30' },
  previousAvailable: false,
  measure: 'amount',
  measureLabel: 'Amount',
  aggregation: 'sum',
  format: 'currency',
  value: 4500,
  rowCount: 30,
  winnerOnly: false,
  summaryLines: [],
  filters: [],
  rowAction: null,
  groupField: null,
  notCounted: [],
  sortKey: null,
  sortDirection: null,
  table: {
    type: 'TABLE',
    mode: 'raw',
    columns: [
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
    ],
    rows: tableRows,
    page: { number: pageNo, size: 25, totalElements: 30, totalPages: 2 },
  },
  ...over,
});

type Body = { params?: { query?: Record<string, unknown> } };
let respond: (query: Record<string, unknown>) => Promise<unknown>;

function render(props: Partial<Parameters<typeof KpiUnderlyingDialog>[0]> = {}) {
  const onOpenChange = vi.fn();
  const utils = renderWithQuery(
    <KpiUnderlyingDialog
      source={source}
      kpi={kpi()}
      title="Card spend"
      open
      onOpenChange={onOpenChange}
      {...props}
    />,
  );
  return { ...utils, onOpenChange };
}

const underlyingCalls = () =>
  (vi.mocked(api.POST).mock.calls as unknown as [string, Body][])
    .filter(([path]) => path === UNDERLYING)
    .map(([, init]) => init.params!.query!);

describe('KpiUnderlyingDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T06:00:00Z'));
    respond = () => Promise.resolve({ data: response() });
    vi.mocked(api.POST).mockImplementation(((path: string, init: Body) => {
      if (path === UNDERLYING) return respond(init.params!.query!);
      return Promise.resolve({ data: new Blob(['a,b']) });
    }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('header', () => {
    it('shows the title, the value formatted like the tile and the compact range', async () => {
      render();
      expect(screen.getByRole('heading', { name: 'Card spend' })).toBeInTheDocument();
      expect(screen.getByText(money(4500))).toBeInTheDocument();
      expect(screen.getByText('Sep')).toHaveAttribute('title', expect.stringContaining('30'));
      await screen.findByText('Coffee');
    });

    it('omits the range for an unbounded KPI', async () => {
      render({ kpi: kpi({ meta: { rowCount: 3, dateRange: null } }) });
      await screen.findByText('Coffee');
      expect(screen.queryByText('Sep')).not.toBeInTheDocument();
    });
  });

  describe('period tabs', () => {
    it('are absent when the KPI does not compare', async () => {
      render();
      await screen.findByText('Coffee');
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('label the previous tab with its compact range and value', async () => {
      render({ kpi: kpi({ comparison: comparison() }) });
      expect(screen.getByRole('tab', { name: 'This period' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: `Previous · Aug · ${money(800)}` })).toBeInTheDocument();
      await screen.findByText('Coffee');
    });

    it('fall back to "Previous period" without a previous range and drop a null value', async () => {
      render({ kpi: kpi({ comparison: comparison({ previousDateRange: null, previousValue: null }) }) });
      expect(screen.getByRole('tab', { name: 'Previous period' })).toBeInTheDocument();
      await screen.findByText('Coffee');
    });

    it('switch to the previous period: refetch at page 0, previous value and range in the header', async () => {
      render({ kpi: kpi({ comparison: comparison() }) });
      fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 1 }));

      let release!: () => void;
      respond = (q) =>
        q.period === 'previous'
          ? new Promise((resolve) => {
              release = () =>
                resolve({ data: response({ period: 'previous', value: 800 }, [{ id: 'p1', description: 'August' }]) });
            })
          : Promise.resolve({ data: response() });
      fireEvent.mouseDown(screen.getByRole('tab', { name: /Previous/ }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toEqual(expect.objectContaining({ period: 'previous', page: 0 })));
      // The current period's rows are not shown as the previous period's.
      expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
      expect(screen.getByTestId('underlying-loading')).toBeInTheDocument();
      expect(screen.getAllByText(money(800)).length).toBeGreaterThan(0);
      expect(screen.getByText('Aug', { selector: 'span[title]' })).toBeInTheDocument();
      release();
      expect(await screen.findByText('August')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('shows skeleton rows while loading', () => {
      respond = () => new Promise(() => {});
      render();
      expect(screen.getByTestId('underlying-loading')).toBeInTheDocument();
    });

    it('shows the server error in a muted rose line', async () => {
      respond = () => Promise.reject(new ApiError(400, { message: 'This KPI has no previous period' } as never));
      render();
      expect(await screen.findByText('This KPI has no previous period')).toHaveClass('text-rose-600');
    });

    it('says "No rows in this period" when nothing is listed', async () => {
      respond = () => Promise.resolve({ data: response({ rowCount: 0, value: null }, []) });
      render();
      expect(await screen.findByText('No rows in this period')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  it('shows the filters as read-only chips', async () => {
    respond = () =>
      Promise.resolve({
        data: response({
          filters: [
            { field: 'accountId', fieldLabel: 'Account', operator: 'is', text: 'is HDFC Regalia' },
            { field: 'categoryId', fieldLabel: 'Category', operator: 'in', text: 'in Food, Fuel' },
          ],
        }),
      });
    render();
    const chips = await screen.findByRole('list', { name: 'Filters' });
    expect(within(chips).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Account is HDFC Regalia',
      'Category in Food, Fuel',
    ]);
  });

  describe('Not counted', () => {
    it('is a collapsed disclosure listing name · reason · value', async () => {
      respond = () =>
        Promise.resolve({
          data: response({
            notCounted: [
              { id: 'a1', name: 'Savings', kind: 'account', reason: 'excluded', reasonLabel: 'Excluded from net worth', value: 50000 },
              { id: 'a2', name: 'Old card', kind: 'account', reason: 'error', reasonLabel: "Couldn't be calculated", value: null },
            ],
          }),
        });
      render();
      const toggle = await screen.findByRole('button', { name: 'Not counted (2)' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(/Savings/)).not.toBeInTheDocument();
      fireEvent.click(toggle);
      expect(screen.getByText(`Savings · Excluded from net worth · ${money(50000)}`)).toBeInTheDocument();
      expect(screen.getByText("Old card · Couldn't be calculated")).toBeInTheDocument();
    });

    it('is absent when nothing is left out', async () => {
      render();
      await screen.findByText('Coffee');
      expect(screen.queryByRole('button', { name: /Not counted/ })).not.toBeInTheDocument();
    });
  });

  describe('summary', () => {
    it('states the aggregate, leaving the row count to the table footer alone', async () => {
      render();
      expect(await screen.findByText(`Sum ${money(4500)}`)).toBeInTheDocument();
      expect(screen.getAllByText(/^30 rows/)).toHaveLength(1);
      expect(screen.queryByText(/sets this value/)).not.toBeInTheDocument();
    });

    it('for a winner-only MAX shows just the aggregate and the singular note', async () => {
      respond = () =>
        Promise.resolve({ data: response({ aggregation: 'max', winnerOnly: true, rowCount: 1, value: 2000 }, [rows[2]]) });
      render({ kpi: kpi({ aggregation: 'max', value: 2000 }) });
      expect(await screen.findByText(`Max ${money(2000)}`)).toBeInTheDocument();
      expect(screen.getByText('Showing the row that sets this value')).toBeInTheDocument();
    });

    it('for tied MIN winners uses the plural note', async () => {
      respond = () =>
        Promise.resolve({ data: response({ aggregation: 'min', winnerOnly: true, rowCount: 2, value: 1000 }, rows.slice(0, 2)) });
      render({ kpi: kpi({ aggregation: 'min', value: 1000 }) });
      expect(await screen.findByText(`Min ${money(1000)}`)).toBeInTheDocument();
      expect(screen.getByText('Showing the rows that set this value')).toBeInTheDocument();
    });

    it('adds the datasource summary lines', async () => {
      respond = () =>
        Promise.resolve({
          data: response({
            summaryLines: [
              { label: 'Assets', value: 2500, format: 'currency' },
              { label: 'Liabilities', value: 2000, format: 'currency' },
            ],
          }),
        });
      render();
      expect(await screen.findByText(`Assets ${money(2500)}`)).toBeInTheDocument();
      expect(screen.getByText(`Liabilities ${money(2000)}`)).toBeInTheDocument();
    });
  });

  describe('table', () => {
    it('requests 25-row pages of the current period in the default order', async () => {
      render();
      await screen.findByText('Coffee');
      expect(underlyingCalls()[0]).toEqual({ period: 'current', page: 0, size: 25, sort: undefined });
    });

    it('pages on the server', async () => {
      render();
      fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 1 }));
    });

    it('sorts on the server from a header click and resets to page 0', async () => {
      render();
      fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ page: 1 }));
      fireEvent.click(screen.getByRole('button', { name: 'Amount' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toEqual({ period: 'current', page: 0, size: 25, sort: 'amount,asc' }));
    });

    it('dims the table while a new sort loads, then shows the sorted rows', async () => {
      render();
      await screen.findByText('Coffee');
      let release!: () => void;
      respond = (q) =>
        q.sort
          ? new Promise((resolve) => (release = () => resolve({ data: response({}, [rows[2], rows[1], rows[0]]) })))
          : Promise.resolve({ data: response() });
      fireEvent.click(screen.getByRole('button', { name: 'Amount' }));
      await waitFor(() => expect(screen.getByRole('table').closest('.opacity-60')).not.toBeNull());
      // The old rows stay up meanwhile, under the new arrow.
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      release();
      await waitFor(() => expect(screen.getByRole('table').closest('.opacity-60')).toBeNull());
    });

    it('keeps the last good page and its pager under the error when a page fails, and retries it', async () => {
      render();
      await screen.findByText('Coffee');
      respond = (q) =>
        q.page === 1
          ? Promise.reject(new ApiError(500, { message: 'Page failed' } as never))
          : Promise.resolve({ data: response() });
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(await screen.findByText('Page failed')).toHaveClass('text-rose-600');
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Amount' })).toBeInTheDocument();
      expect(screen.getByText(`Sum ${money(4500)}`)).toBeInTheDocument();

      respond = (q) =>
        Promise.resolve({ data: q.page === 1 ? response({}, [{ id: 't9', description: 'Page two' }], 1) : response() });
      const pageOneCalls = () => underlyingCalls().filter((q) => q.page === 1).length;
      const before = pageOneCalls();
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(await screen.findByText('Page two')).toBeInTheDocument();
      expect(pageOneCalls()).toBe(before + 1);
      expect(screen.queryByText('Page failed')).not.toBeInTheDocument();
    });

    it('keeps the table and its headers when a sort fails, so another sort can be picked', async () => {
      render();
      await screen.findByText('Coffee');
      respond = (q) =>
        q.sort === 'amount,asc'
          ? Promise.reject(new ApiError(400, { message: 'Sort failed' } as never))
          : Promise.resolve({ data: response() });
      fireEvent.click(screen.getByRole('button', { name: 'Amount' }));
      expect(await screen.findByText('Sort failed')).toBeInTheDocument();
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Amount' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ sort: 'amount,desc' }));
      await waitFor(() => expect(screen.queryByText('Sort failed')).not.toBeInTheDocument());
    });

    it('draws group headers in the default order', async () => {
      respond = () => Promise.resolve({ data: response({ groupField: 'side' }) });
      render();
      expect(await screen.findByText('Asset')).toBeInTheDocument();
      expect(screen.getByText('Liability')).toBeInTheDocument();
    });

    it('drops group headers once the rows are sorted by a column', async () => {
      respond = () => Promise.resolve({ data: response({ groupField: 'side', sortKey: 'amount', sortDirection: 'asc' }) });
      render();
      await screen.findByText('Coffee');
      expect(screen.queryByText('Asset')).not.toBeInTheDocument();
    });

    it('leaves rows inert without a row action', async () => {
      render();
      const cell = await screen.findByText('Coffee');
      expect(cell.closest('tr')).not.toHaveAttribute('role', 'button');
    });

    it('opens a transaction row in the transaction dialog', async () => {
      respond = () => Promise.resolve({ data: response({ rowAction: 'transaction' }) });
      render();
      fireEvent.click(await screen.findByText('Fuel'));
      expect(await screen.findByTestId('txn-dialog')).toHaveTextContent('t2');
    });
  });

  describe('breakdown', () => {
    const breakdown = (title: string, sections: unknown[] = []) => ({
      data: {
        datasource: 'transactions',
        rowId: 'x',
        title,
        total: 1000,
        totalLabel: 'Balance',
        format: 'currency',
        asOf: '2026-10-09',
        steps: [],
        sections,
        notes: [],
      },
    });

    it('swaps the body to the row breakdown and Back returns to the table', async () => {
      respond = () => Promise.resolve({ data: response({ rowAction: 'breakdown' }) });
      vi.mocked(api.GET).mockResolvedValue(breakdown('Coffee account') as never);
      render();
      fireEvent.click(await screen.findByText('Coffee'));
      expect(await screen.findByText('Coffee account')).toBeInTheDocument();
      expect(screen.queryByText('Fuel')).not.toBeInTheDocument();
      // The underlying response names the datasource.
      expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, {
        params: { path: { name: 'transactions', rowId: 't1' }, query: { size: 25 } },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByText('Fuel')).toBeInTheDocument();
    });

    it('opens a row under the datasource the response names, with no other lookup', async () => {
      respond = () => Promise.resolve({ data: response({ rowAction: 'breakdown', datasource: 'net_worth' }) });
      vi.mocked(api.GET).mockResolvedValue(breakdown('Coffee account') as never);
      render();
      fireEvent.click(await screen.findByText('Coffee'));
      expect(await screen.findByText('Coffee account')).toBeInTheDocument();
      expect(api.GET).toHaveBeenCalledTimes(1);
      expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, {
        params: { path: { name: 'net_worth', rowId: 't1' }, query: { size: 25 } },
      });
    });

    it('navigates into a nested breakdown and back one level at a time', async () => {
      respond = () => Promise.resolve({ data: response({ rowAction: 'breakdown' }) });
      vi.mocked(api.GET).mockImplementation(((_path: string, init: { params: { path: { name: string } } }) =>
        Promise.resolve(
          init.params.path.name === 'positions'
            ? breakdown('INFY position')
            : breakdown('Zerodha', [
                {
                  key: 'holdings',
                  label: 'Holdings',
                  rowAction: 'breakdown',
                  rowBreakdownDatasource: 'positions',
                  table: {
                    type: 'TABLE',
                    mode: 'raw',
                    columns: [{ key: 'instrument', label: 'Instrument', type: 'string' }],
                    rows: [{ id: 'h1', instrument: 'INFY' }],
                    page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
                  },
                },
              ]),
        )) as never);
      render();
      fireEvent.click(await screen.findByText('Coffee'));
      fireEvent.click(await screen.findByText('INFY'));
      expect(await screen.findByText('INFY position')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByText('Zerodha')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByText('Fuel')).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('downloads the period CSV in the table order under "<title> <range>.csv"', async () => {
      const createObjectURL = vi.fn(() => 'blob:x');
      Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render();
      fireEvent.click(await screen.findByRole('button', { name: 'Amount' }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ sort: 'amount,asc' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      expect(api.POST).toHaveBeenCalledWith(CSV, {
        params: { query: { period: 'current', sort: 'amount,asc' } },
        body: request,
        parseAs: 'blob',
      });
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('Card spend Sep 26.csv');
      click.mockRestore();
    });

    it('downloads the previous period under the previous range when that tab is open', async () => {
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      respond = (q) => Promise.resolve({ data: response({ period: q.period as 'current' | 'previous' }) });
      render({ kpi: kpi({ comparison: comparison() }) });
      fireEvent.mouseDown(screen.getByRole('tab', { name: /Previous/ }));
      await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ period: 'previous' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      expect(api.POST).toHaveBeenCalledWith(CSV, {
        params: { query: { period: 'previous', sort: undefined } },
        body: request,
        parseAs: 'blob',
      });
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('Card spend Aug 26.csv');
      click.mockRestore();
    });

    it('names an unbounded period for today', async () => {
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render({ title: 'Net worth', kpi: kpi({ meta: { rowCount: 3, dateRange: null } }) });
      fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('Net worth 9 Oct 26.csv');
      click.mockRestore();
    });

    it('toasts a failed download', async () => {
      vi.mocked(api.POST).mockImplementation(((path: string, init: Body) =>
        path === UNDERLYING
          ? respond(init.params!.query!)
          : Promise.reject(new ApiError(400, { message: 'Too many rows to export (200000).' } as never))) as never);
      render();
      fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Too many rows to export (200000).', expect.anything()),
      );
    });

    it('closes from the Close button', async () => {
      const { onOpenChange } = render();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('starts fresh on the next opening', async () => {
    const { rerender, onOpenChange } = render({ kpi: kpi({ comparison: comparison() }) });
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Previous/ }));
    await waitFor(() => expect(underlyingCalls().at(-1)).toMatchObject({ period: 'previous' }));
    const dialog = (open: boolean) => (
      <KpiUnderlyingDialog source={source} kpi={kpi({ comparison: comparison() })} title="Card spend" open={open} onOpenChange={onOpenChange} />
    );
    rerender(dialog(false));
    rerender(dialog(true));
    expect(screen.getByRole('tab', { name: 'This period' })).toHaveAttribute('aria-selected', 'true');
  });

  it('fetches nothing while closed', () => {
    render({ open: false });
    expect(api.POST).not.toHaveBeenCalled();
  });
});
