import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';
import { stubPhone } from '@/test/stubPhone';

import { RowBreakdownView } from '../RowBreakdownView';
import type { RowBreakdownResponse } from '../underlying.types';

const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';
const SECTION = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}';

const sectionTable = (rows: Record<string, unknown>[], totalElements: number) => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'quantity', label: 'Quantity', type: 'number', format: 'number' },
    { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
    { key: 'units', label: 'Units', type: 'number' },
  ],
  rows,
  page: { number: 0, size: 25, totalElements, totalPages: Math.ceil(totalElements / 25) },
});

const breakdown = (totalElements: number): RowBreakdownResponse => ({
  datasource: 'net_worth',
  rowId: 'a1',
  title: 'HDFC Savings',
  subtitle: 'Asset',
  notCounted: false,
  kindLabel: 'Bank account',
  total: 15000,
  totalLabel: 'Balance',
  format: 'currency',
  asOf: '2026-10-09',
  steps: [],
  sections: [
    {
      key: 'transactions',
      label: 'Transactions',
      rowAction: 'transaction',
      rowBreakdownDatasource: null,
      table: sectionTable([{ id: 't1', date: '2026-10-01', description: 'Salary', quantity: 2, amount: 7000, units: 3 }], totalElements),
    },
  ],
  notes: [],
});

type Init = { params?: { query?: Record<string, unknown> } };

function mock(totalElements: number) {
  vi.mocked(api.GET).mockImplementation(((path: string) => {
    if (path === BREAKDOWN) return Promise.resolve({ data: breakdown(totalElements) });
    return Promise.resolve({ data: sectionTable([{ id: 't2', description: 'Rent', amount: 100 }], totalElements) });
  }) as never);
}

const sectionCalls = () =>
  (vi.mocked(api.GET).mock.calls as unknown as [string, Init][])
    .filter(([path]) => path === SECTION)
    .map(([, init]) => init.params!.query!);

function render() {
  const onOpenTransaction = vi.fn();
  renderWithQuery(
    <RowBreakdownView datasource="net_worth" rowId="a1" onOpenTransaction={onOpenTransaction} onOpenBreakdown={vi.fn()} />,
  );
  return { onOpenTransaction };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('RowBreakdownView section footer', () => {
  it('prints no row count under a section, paging only across several pages', async () => {
    mock(30);
    render();
    await screen.findByText('Salary');
    expect(screen.queryByText('30 rows')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  });

  it('prints no footer at all for a single-page section', async () => {
    mock(1);
    render();
    await screen.findByText('Salary');
    expect(screen.queryByText('1 row')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});

describe('RowBreakdownView section on a phone', () => {
  beforeEach(() => stubPhone(true));

  it('shows the rows as cards: the last currency column is the figure, the rest the meta line', async () => {
    mock(30);
    render();
    const section = await screen.findByRole('region', { name: 'Transactions' });
    expect(within(section).queryByRole('table')).not.toBeInTheDocument();
    const card = within(section).getByRole('button', { name: /Salary/ });
    expect(within(card).getByText('₹7,000.00')).toHaveClass('font-semibold');
    expect(within(card).getByText('1 Oct 26 · 2 · 3')).toBeInTheDocument();
    expect(screen.queryByText('30 rows')).not.toBeInTheDocument();
  });

  it('opens the transaction from a card', async () => {
    mock(30);
    const { onOpenTransaction } = render();
    fireEvent.click(await screen.findByRole('button', { name: /Salary/ }));
    expect(onOpenTransaction).toHaveBeenCalledWith('t1');
  });

  it('sorts the section on the server from the Sort select', async () => {
    mock(30);
    render();
    await screen.findByText('Salary');
    fireEvent.click(screen.getByRole('option', { name: 'Amount' }));
    await waitFor(() => expect(sectionCalls().at(-1)).toMatchObject({ page: 0, sort: 'amount,asc' }));
    expect(await screen.findByText('Rent')).toBeInTheDocument();
  });
});
