import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportRowBreakdownDialog } from './ReportRowBreakdownDialog';
import type { BreakdownSectionData, RowBreakdownResponse } from './underlying.types';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';
const SECTION = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}';

const table = (rows: Record<string, unknown>[], page = { number: 0, size: 25, totalElements: rows.length, totalPages: 1 }) => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [{ key: 'description', label: 'Description', type: 'string' }],
  rows,
  page,
});
const section = (over: Partial<BreakdownSectionData>): BreakdownSectionData =>
  ({ key: 's', label: 'Section', rowAction: null, rowBreakdownDatasource: null, table: table([]), ...over }) as BreakdownSectionData;
const breakdown = (over: Partial<RowBreakdownResponse>): RowBreakdownResponse =>
  ({
    datasource: 'net_worth',
    rowId: 'b1',
    title: 'Zerodha',
    notCounted: false,
    subtitle: null,
    kindLabel: 'Broker',
    total: 50000,
    totalLabel: 'Value',
    format: 'currency',
    asOf: '2026-10-09',
    steps: [],
    sections: [],
    notes: [],
    ...over,
  }) as RowBreakdownResponse;

const BROKER = breakdown({
  steps: [
    { op: 'add', label: 'Holdings', amount: 40000, format: 'currency' },
    { op: 'add', label: 'Cash', amount: 10000, format: 'currency' },
    { op: 'equals', label: 'Value', amount: 50000, format: 'currency' },
  ] as RowBreakdownResponse['steps'],
  notes: ['Prices as of close.'],
  sections: [
    section({ key: 'holdings', label: 'Holdings', rowAction: 'breakdown', rowBreakdownDatasource: 'positions', table: table([{ id: 'h1', description: 'INFY holding' }]) }),
    section({ key: 'transactions', label: 'Transactions', rowAction: 'transaction', table: table([{ id: 't9', description: 'Fund transfer' }]) }),
  ],
});
const HOLDING = breakdown({ datasource: 'positions', rowId: 'h1', title: 'Infosys', kindLabel: 'Holding' });

function mockApi(root: RowBreakdownResponse = BROKER) {
  vi.mocked(api.GET).mockImplementation(((path: string, init: { params: { path: { name: string } } }) => {
    if (path === SECTION) return Promise.resolve({ data: table([{ id: 'h2', description: 'TCS holding' }], { number: 1, size: 25, totalElements: 30, totalPages: 2 }) });
    if (path !== BREAKDOWN) return Promise.reject(new Error(`unexpected ${path}`));
    return Promise.resolve({ data: init.params.path.name === 'positions' ? HOLDING : root });
  }) as never);
}

function render() {
  const onClose = vi.fn();
  renderWithQuery(<ReportRowBreakdownDialog datasource="net_worth" rowId="b1" title="Net worth" onClose={onClose} />);
  return { onClose };
}

describe('ReportRowBreakdownDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApi();
  });

  it('requests the row breakdown and shows title, heading, total, steps, sections and notes; no Back at the root', async () => {
    render();
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, { params: { path: { name: 'net_worth', rowId: 'b1' }, query: { size: 25 } } });
    expect(screen.getByText('Broker')).toBeInTheDocument();
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('breakdown-steps').querySelectorAll('[data-op]')).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByText('INFY holding')).toBeInTheDocument();
    expect(screen.getByText('Prices as of close.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('shows a loading state while the breakdown loads', async () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => undefined) as never);
    render();
    expect(screen.getByTestId('breakdown-loading')).toBeInTheDocument();
  });

  it('shows the error when the request fails', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('boom') as never);
    render();
    expect(await screen.findByText("Couldn't load the breakdown")).toBeInTheDocument();
  });

  it('explains an item the total leaves out', async () => {
    mockApi(breakdown({ notCounted: true, notCountedReason: 'Closed account' } as Partial<RowBreakdownResponse>));
    render();
    expect(await screen.findByTestId('breakdown-not-counted')).toHaveTextContent('Closed account — shown for reference, left out of the total.');
  });

  it('a nested row opens its breakdown on top; Back returns to the root', async () => {
    render();
    await user.click(await screen.findByText('INFY holding'));
    expect(await screen.findByText('Infosys')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, { params: { path: { name: 'positions', rowId: 'h1' }, query: { size: 25 } } });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('a transaction row calls onOpenTransaction with its id; without it the row does nothing', async () => {
    const onOpenTransaction = vi.fn();
    const { unmount } = renderWithQuery(
      <ReportRowBreakdownDialog datasource="net_worth" rowId="b1" title="Net worth" onOpenTransaction={onOpenTransaction} onClose={vi.fn()} />,
    );
    await user.click(await screen.findByText('Fund transfer'));
    expect(onOpenTransaction).toHaveBeenCalledWith('t9');
    unmount();
    render();
    await user.click(await screen.findByText('Fund transfer'));
    expect(onOpenTransaction).toHaveBeenCalledTimes(1);
  });

  it('Close calls onClose', async () => {
    const { onClose } = render();
    await screen.findByText('Zerodha');
    await user.click(screen.getAllByRole('button', { name: 'Close' }).find((b) => b.textContent === 'Close')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('sorting a section asks the section endpoint for the sorted first page', async () => {
    render();
    await screen.findByText('Zerodha');
    await user.click(screen.getAllByRole('button', { name: /Sort/ })[0]);
    await user.click(await screen.findByRole('option', { name: 'Description (ascending)' }));
    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith(SECTION, {
        params: { path: { name: 'net_worth', rowId: 'b1', section: 'holdings' }, query: { page: 0, size: 25, sort: 'description,asc' } },
      }),
    );
  });
});
