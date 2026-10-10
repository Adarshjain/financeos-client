// The dialog opened without a KPI tile (`kpi` absent): the header figure, range
// and period tabs come from the underlying response itself.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('../UnderlyingTransactionDialog', () => ({ UnderlyingTransactionDialog: () => null }));

import { api, ApiError } from '@/lib/api/client';
import type { RunReportRequest } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { KpiUnderlyingDialog } from '../KpiUnderlyingDialog';
import { formatAmount } from '../underlying.helpers';
import type { KpiUnderlyingResponse, UnderlyingSource } from '../underlying.types';

const UNDERLYING = '/api/v1/reports/underlying';
const CSV = '/api/v1/reports/underlying/csv';
const request: RunReportRequest = {
  type: 'KPI',
  datasource: 'positions',
  definition: { measure: 'currentValue', aggregation: 'sum', filters: [] },
};
const source: UnderlyingSource = { kind: 'adhoc', request };
const money = (n: number) => formatAmount(n, 'currency');

const response = (over: Partial<KpiUnderlyingResponse> = {}, description = 'Nifty ETF'): KpiUnderlyingResponse => ({
  period: 'current',
  datasource: 'positions',
  range: { from: '2026-09-01', to: '2026-09-30' },
  previousAvailable: false,
  measure: 'currentValue',
  measureLabel: 'Current value',
  aggregation: 'sum',
  format: 'currency',
  value: 125000,
  rowCount: 1,
  winnerOnly: false,
  summaryLines: [],
  filters: [],
  rowAction: null,
  groupField: null,
  groupTotals: {},
  notCounted: [],
  sortKey: null,
  sortDirection: null,
  table: {
    type: 'TABLE',
    mode: 'raw',
    columns: [{ key: 'description', label: 'Description', type: 'string' }],
    rows: [{ id: 'h1', description }],
    page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
  },
  ...over,
});

type Init = { params?: { query?: Record<string, unknown> } };
let respond: (query: Record<string, unknown>) => Promise<unknown>;

function render() {
  return renderWithQuery(
    <KpiUnderlyingDialog source={source} title="Allocation · Equity" open onOpenChange={vi.fn()} />,
  );
}

describe('KpiUnderlyingDialog without a kpi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T06:00:00Z'));
    respond = () => Promise.resolve({ data: response() });
    vi.mocked(api.POST).mockImplementation(((path: string, init: Init) => {
      if (path === UNDERLYING) return respond(init.params!.query!);
      return Promise.resolve({ data: new Blob(['a,b']) });
    }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a header skeleton until the response arrives, then its value and range', async () => {
    let release!: () => void;
    respond = () => new Promise((resolve) => (release = () => resolve({ data: response() })));
    render();
    expect(screen.getByRole('heading', { name: 'Allocation · Equity' })).toBeInTheDocument();
    expect(screen.getByTestId('underlying-header-loading')).toBeInTheDocument();
    release();
    expect(await screen.findByText('Nifty ETF')).toBeInTheDocument();
    expect(screen.queryByTestId('underlying-header-loading')).not.toBeInTheDocument();
    // Only the header carries the aggregate: nothing restates it under the rows.
    expect(screen.getAllByText(money(125000), { exact: false })).toHaveLength(1);
    expect(screen.getByText('Sep', { selector: 'span[title]' })).toBeInTheDocument();
  });

  it('omits the range for an unbounded response', async () => {
    respond = () => Promise.resolve({ data: response({ range: null }) });
    render();
    await screen.findByText('Nifty ETF');
    expect(screen.queryByText('Sep', { selector: 'span[title]' })).not.toBeInTheDocument();
  });

  it('has no period tabs when the response has no previous period', async () => {
    render();
    await screen.findByText('Nifty ETF');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('offers period tabs from the response; the previous figure heads the dialog once it loads', async () => {
    respond = (q) =>
      Promise.resolve({
        data:
          q.period === 'previous'
            ? response(
                {
                  period: 'previous',
                  value: 90000,
                  previousAvailable: true,
                  range: { from: '2026-08-01', to: '2026-08-31' },
                  previousRange: { from: '2026-08-01', to: '2026-08-31' },
                },
                'August row',
              )
            : response({ previousAvailable: true, previousRange: { from: '2026-08-01', to: '2026-08-31' } }),
      });
    render();
    await screen.findByText('Nifty ETF');
    // The previous value is unknown until that period is fetched: the label carries only the range.
    expect(screen.getByRole('tab', { name: 'Previous · Aug' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Previous/ }));
    expect(await screen.findByText('August row')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `Previous · Aug · ${money(90000)}` })).toBeInTheDocument();
    expect(screen.getByText('Aug', { selector: 'span[title]' })).toBeInTheDocument();
    expect(screen.getAllByText(money(90000), { exact: false }).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the tabs (and skeletons the header) while the other period loads', async () => {
    let release!: () => void;
    respond = (q) =>
      q.period === 'previous'
        ? new Promise((resolve) => {
            release = () =>
              resolve({ data: response({ period: 'previous', value: 1, previousAvailable: true }, 'August row') });
          })
        : Promise.resolve({ data: response({ previousAvailable: true }) });
    render();
    await screen.findByText('Nifty ETF');
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Previous/ }));
    await waitFor(() => expect(screen.getByTestId('underlying-header-loading')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'This period' })).toBeInTheDocument();
    release();
    expect(await screen.findByText('August row')).toBeInTheDocument();
  });

  it('on a failed first load shows the error and no header figure or skeleton', async () => {
    respond = () => Promise.reject(new ApiError(500, { message: 'Boom' } as never));
    render();
    expect(await screen.findByText('Boom')).toBeInTheDocument();
    expect(screen.queryByTestId('underlying-header-loading')).not.toBeInTheDocument();
  });

  it('names the CSV after the response range', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render();
    await screen.findByText('Nifty ETF');
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect((vi.mocked(api.POST).mock.calls as unknown as [string][]).some(([path]) => path === CSV)).toBe(true);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('Allocation · Equity Sep 26.csv');
    click.mockRestore();
  });
});
