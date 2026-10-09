import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { RowBreakdownView } from '../RowBreakdownView';
import type { BreakdownSectionData, RowBreakdownResponse } from '../underlying.types';

// Section header sort: asc → desc → default over the whole section on the
// server, session-only per section, back to page 1 on every change.

const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';
const SECTION = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}';

type Query = { page: number; size: number; sort?: string };

const page = (number: number, totalElements: number) => ({
  number,
  size: 25,
  totalElements,
  totalPages: Math.ceil(totalElements / 25),
});

const table = (rows: Record<string, unknown>[], p = page(0, 30)) => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
  ],
  rows,
  page: p,
});

const section = (key: string, label: string, first: string): BreakdownSectionData =>
  ({
    key,
    label,
    rowAction: null,
    rowBreakdownDatasource: null,
    table: table([{ id: `${key}-0`, description: first, amount: 1 }]),
  }) as BreakdownSectionData;

const breakdown = (): RowBreakdownResponse =>
  ({
    datasource: 'net_worth',
    rowId: 'a1',
    title: 'HDFC Savings',
    total: 1000,
    totalLabel: 'Balance',
    format: 'currency',
    asOf: '2026-10-09',
    steps: [],
    sections: [section('transactions', 'Transactions', 'Salary'), section('fees', 'Fees', 'Annual fee')],
    notes: [],
  }) as RowBreakdownResponse;

/** Section pages name what they were asked for, so each test can read which page/sort is shown. */
let sectionResponse: (sectionKey: string, query: Query) => Promise<unknown>;

const sectionCalls = () =>
  (vi.mocked(api.GET).mock.calls as unknown as [string, { params: { path: { section: string }; query: Query } }][])
    .filter(([path]) => path === SECTION)
    .map(([, init]) => ({ section: init.params.path.section, ...init.params.query }));

function render() {
  renderWithQuery(
    <RowBreakdownView datasource="net_worth" rowId="a1" onBack={vi.fn()} onOpenTransaction={vi.fn()} onOpenBreakdown={vi.fn()} />,
  );
}

const header = (region: HTMLElement, name: string) => within(region).getByRole('button', { name });
const th = (region: HTMLElement, name: string) => header(region, name).closest('th')!;

describe('RowBreakdownView section sort', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sectionResponse = (key, q) =>
      Promise.resolve({
        data: table([{ id: `${key}-${q.page}`, description: `${key} p${q.page} ${q.sort ?? 'default'}`, amount: 2 }], page(q.page, 30)),
      });
    vi.mocked(api.GET).mockImplementation(((path: string, init: { params: { path: { section: string }; query: Query } }) =>
      path === BREAKDOWN
        ? Promise.resolve({ data: breakdown() })
        : sectionResponse(init.params.path.section, init.params.query)) as never);
  });

  it('makes every section header a sort toggle, none active at first', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    expect(th(region, 'Description')).toHaveAttribute('aria-sort', 'none');
    expect(th(region, 'Amount')).toHaveAttribute('aria-sort', 'none');
  });

  it('sorts ascending on the server from page 0 on the first click', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('transactions p0 amount,asc')).toBeInTheDocument();
    expect(th(region, 'Amount')).toHaveAttribute('aria-sort', 'ascending');
    expect(sectionCalls()).toEqual([{ section: 'transactions', page: 0, size: 25, sort: 'amount,asc' }]);
  });

  it('cycles asc → desc → default, the default reusing the embedded first page without a fetch', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    await within(region).findByText('transactions p0 amount,asc');
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('transactions p0 amount,desc')).toBeInTheDocument();
    expect(th(region, 'Amount')).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('Salary')).toBeInTheDocument();
    expect(th(region, 'Amount')).toHaveAttribute('aria-sort', 'none');
    expect(sectionCalls().map((c) => c.sort)).toEqual(['amount,asc', 'amount,desc']);
  });

  it('starts another column at asc', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    await within(region).findByText('transactions p0 amount,asc');
    fireEvent.click(header(region, 'Description'));
    expect(await within(region).findByText('transactions p0 description,asc')).toBeInTheDocument();
    expect(th(region, 'Amount')).toHaveAttribute('aria-sort', 'none');
    expect(th(region, 'Description')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('pages within the sort, and a sort change returns to page 1', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    await within(region).findByText('transactions p0 amount,asc');
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(await within(region).findByText('transactions p1 amount,asc')).toBeInTheDocument();
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('transactions p0 amount,desc')).toBeInTheDocument();
    expect(sectionCalls()).toEqual([
      { section: 'transactions', page: 0, size: 25, sort: 'amount,asc' },
      { section: 'transactions', page: 1, size: 25, sort: 'amount,asc' },
      { section: 'transactions', page: 0, size: 25, sort: 'amount,desc' },
    ]);
  });

  it('returns to the unsorted first page when the sort is cleared from a later page', async () => {
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    await within(region).findByText('transactions p1 default');
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('transactions p0 amount,asc')).toBeInTheDocument();
    fireEvent.click(header(region, 'Amount'));
    await within(region).findByText('transactions p0 amount,desc');
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('Salary')).toBeInTheDocument();
  });

  it('keeps each section its own sort', async () => {
    render();
    const transactions = await screen.findByRole('region', { name: 'Transactions' });
    const fees = screen.getByRole('region', { name: 'Fees' });
    fireEvent.click(header(transactions, 'Amount'));
    await within(transactions).findByText('transactions p0 amount,asc');
    expect(within(fees).getByText('Annual fee')).toBeInTheDocument();
    expect(th(fees, 'Amount')).toHaveAttribute('aria-sort', 'none');
    expect(sectionCalls().every((c) => c.section === 'transactions')).toBe(true);
  });

  it('dims the last table while a sort loads', async () => {
    let release!: () => void;
    sectionResponse = (key, q) =>
      new Promise((resolve) => {
        release = () => resolve({ data: table([{ id: 'x', description: `sorted ${q.sort}`, amount: 3 }]) });
      });
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    await waitFor(() => expect(within(region).getByRole('table').closest('.opacity-60')).not.toBeNull());
    expect(within(region).getByText('Salary')).toBeInTheDocument();
    release();
    expect(await within(region).findByText('sorted amount,asc')).toBeInTheDocument();
    expect(within(region).getByRole('table').closest('.opacity-60')).toBeNull();
  });

  it('keeps the last table and its headers under a failed sort, so another sort can be picked', async () => {
    sectionResponse = (key, q) =>
      q.sort === 'amount,asc'
        ? Promise.reject(new ApiError(400, { message: 'Bad sort' } as never))
        : Promise.resolve({ data: table([{ id: 'x', description: `sorted ${q.sort}`, amount: 3 }]) });
    render();
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(header(region, 'Amount'));
    expect(await within(region).findByText('Bad sort')).toHaveClass('text-rose-600');
    expect(within(region).getByText('Salary')).toBeInTheDocument();
    fireEvent.click(header(region, 'Description'));
    expect(await within(region).findByText('sorted description,asc')).toBeInTheDocument();
    expect(within(region).queryByText('Bad sort')).not.toBeInTheDocument();
  });
});
