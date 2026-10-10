import { act, fireEvent, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
// Covered by its own tests; here only which transaction the dialog asks for.
vi.mock('../UnderlyingTransactionDialog', () => ({
  UnderlyingTransactionDialog: ({ transactionId }: { transactionId: string | null }) =>
    transactionId ? <div data-testid="txn-dialog">{transactionId}</div> : null,
}));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { RowBreakdownDialog } from '../RowBreakdownDialog';
import { RowBreakdownView } from '../RowBreakdownView';
import type { BreakdownSectionData, RowBreakdownResponse } from '../underlying.types';
import { useBreakdownStack } from '../useBreakdownStack';

const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';

const table = (rows: Record<string, unknown>[]) => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [{ key: 'description', label: 'Description', type: 'string' }],
  rows,
  page: { number: 0, size: 25, totalElements: rows.length, totalPages: 1 },
});

const section = (over: Partial<BreakdownSectionData>): BreakdownSectionData => ({
  key: 's',
  label: 'Section',
  rowAction: null,
  rowBreakdownDatasource: null,
  table: table([]),
  ...over,
});

const breakdown = (over: Partial<RowBreakdownResponse>): RowBreakdownResponse => ({
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
});

// The broker's breakdown lists holdings (nested breakdowns) and its cash transactions.
const BROKER = breakdown({
  sections: [
    section({
      key: 'holdings',
      label: 'Holdings',
      rowAction: 'breakdown',
      rowBreakdownDatasource: 'positions',
      table: table([{ id: 'h1', description: 'INFY holding' }]),
    }),
    section({
      key: 'transactions',
      label: 'Transactions',
      rowAction: 'transaction',
      table: table([{ id: 't9', description: 'Fund transfer' }]),
    }),
  ],
});
const HOLDING = breakdown({ datasource: 'positions', rowId: 'h1', title: 'Infosys', kindLabel: 'Holding' });

function mockApi() {
  vi.mocked(api.GET).mockImplementation(((path: string, init: { params: { path: { name: string } } }) => {
    if (path !== BREAKDOWN) return Promise.reject(new Error(`unexpected ${path}`));
    return Promise.resolve({ data: init.params.path.name === 'positions' ? HOLDING : BROKER });
  }) as never);
}

function render(open = true) {
  const onOpenChange = vi.fn();
  const utils = renderWithQuery(
    <RowBreakdownDialog datasource="net_worth" rowId="b1" title="Net worth" open={open} onOpenChange={onOpenChange} />,
  );
  return { ...utils, onOpenChange };
}

describe('RowBreakdownDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApi();
  });

  it('opens on the row breakdown under the given title, with no Back at the root', async () => {
    render();
    expect(screen.getByRole('heading', { name: 'Net worth' })).toBeInTheDocument();
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, {
      params: { path: { name: 'net_worth', rowId: 'b1' }, query: { size: 25 } },
    });
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('fetches nothing while closed', () => {
    render(false);
    expect(api.GET).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a nested row opens its breakdown on top; Back returns to the root', async () => {
    render();
    fireEvent.click(await screen.findByText('INFY holding'));
    expect(await screen.findByText('Infosys')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, {
      params: { path: { name: 'positions', rowId: 'h1' }, query: { size: 25 } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('a transaction row opens the transaction detail', async () => {
    render();
    fireEvent.click(await screen.findByText('Fund transfer'));
    expect(await screen.findByTestId('txn-dialog')).toHaveTextContent('t9');
  });

  it('Close closes the dialog', async () => {
    const { onOpenChange } = render();
    await screen.findByText('Zerodha');
    // The footer's Close (the corner X is the primitive's own).
    const footerClose = screen.getAllByRole('button', { name: 'Close' }).find((b) => b.textContent === 'Close')!;
    fireEvent.click(footerClose);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('starts at the root again on the next opening', async () => {
    const onOpenChange = vi.fn();
    const ui = (open: boolean) => (
      <RowBreakdownDialog datasource="net_worth" rowId="b1" title="Net worth" open={open} onOpenChange={onOpenChange} />
    );
    const { rerender } = renderWithQuery(ui(true));
    fireEvent.click(await screen.findByText('INFY holding'));
    await screen.findByText('Infosys');
    rerender(ui(false));
    rerender(ui(true));
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(screen.queryByText('Infosys')).not.toBeInTheDocument();
  });
});

describe('RowBreakdownView without onBack', () => {
  it('renders no Back button', async () => {
    vi.resetAllMocks();
    mockApi();
    renderWithQuery(
      <RowBreakdownView datasource="net_worth" rowId="b1" onOpenTransaction={vi.fn()} onOpenBreakdown={vi.fn()} />,
    );
    expect(await screen.findByText('Zerodha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});

describe('useBreakdownStack', () => {
  it('pushes and pops frames, tracks the top, and opens / closes a transaction', () => {
    const { result } = renderHook(() => useBreakdownStack([{ datasource: 'net_worth', rowId: 'a' }]));
    expect(result.current.top).toEqual({ datasource: 'net_worth', rowId: 'a' });
    act(() => result.current.push({ datasource: 'positions', rowId: 'h' }));
    expect(result.current.stack).toHaveLength(2);
    expect(result.current.top).toEqual({ datasource: 'positions', rowId: 'h' });
    act(() => result.current.pop());
    expect(result.current.top).toEqual({ datasource: 'net_worth', rowId: 'a' });
    act(() => result.current.openTransaction('t1'));
    expect(result.current.transactionId).toBe('t1');
    act(() => result.current.closeTransaction());
    expect(result.current.transactionId).toBeNull();
  });

  it('starts empty by default', () => {
    const { result } = renderHook(() => useBreakdownStack());
    expect(result.current.stack).toEqual([]);
    expect(result.current.top).toBeUndefined();
  });
});
