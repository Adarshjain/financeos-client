import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { RowBreakdownView } from '../RowBreakdownView';
import { formatAmount } from '../underlying.helpers';
import type { BreakdownSectionData, RowBreakdownResponse } from '../underlying.types';

const BREAKDOWN = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown';
const SECTION = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}';

const page = (number: number, totalElements: number) => ({
  number,
  size: 25,
  totalElements,
  totalPages: Math.ceil(totalElements / 25),
});

const table = (rows: Record<string, unknown>[], p = page(0, rows.length)) => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [{ key: 'description', label: 'Description', type: 'string' }],
  rows,
  page: p,
});

const section = (over: Partial<BreakdownSectionData> = {}): BreakdownSectionData => ({
  key: 'transactions',
  label: 'Transactions',
  rowAction: 'transaction',
  rowBreakdownDatasource: null,
  table: table([{ id: 't1', description: 'Salary' }], page(0, 30)),
  ...over,
});

const breakdown = (over: Partial<RowBreakdownResponse> = {}): RowBreakdownResponse => ({
  datasource: 'net_worth',
  rowId: 'a1',
  title: 'HDFC Savings',
  subtitle: 'Asset',
  kindLabel: 'Bank account',
  total: 15000,
  totalLabel: 'Balance',
  format: 'currency',
  asOf: '2026-10-09',
  steps: [
    { op: 'start', label: 'Closing balance on statement ending 30/09/2026', amount: 10000, format: 'currency' },
    { op: 'add', label: 'Credits after 30/09/2026 (2)', amount: 7000, format: 'currency' },
    { op: 'subtract', label: 'Debits after 30/09/2026 (1)', detail: 'incl. fees', amount: 2000, format: 'currency' },
    { op: 'equals', label: 'Balance', amount: 15000, format: 'currency' },
    { op: 'info', label: 'Excluded transactions still count towards balances.' },
  ],
  sections: [section()],
  notes: ['Opening balance plus all transactions differs from the statement-anchored balance by ₹5.'],
  ...over,
});

const handlers = () => ({ onBack: vi.fn(), onOpenTransaction: vi.fn(), onOpenBreakdown: vi.fn() });

function mockBreakdown(result: Promise<unknown>) {
  vi.mocked(api.GET).mockImplementation(((path: string) => {
    if (path === BREAKDOWN) return result;
    return Promise.resolve({ data: table([{ id: 't2', description: 'Rent' }], page(1, 30)) });
  }) as never);
}

describe('RowBreakdownView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads the breakdown for the row', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    expect(await screen.findByText('HDFC Savings')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(BREAKDOWN, {
      params: { path: { name: 'net_worth', rowId: 'a1' }, query: { size: 25 } },
    });
  });

  it('shows the title, subtitle · kind and the total', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    expect(await screen.findByText('Asset · Bank account')).toBeInTheDocument();
    const total = screen.getByText('Balance', { selector: 'p' });
    expect(total).toHaveTextContent(`Balance ${formatAmount(15000, 'currency')}`);
  });

  it('omits the subtitle line when there is neither subtitle nor kind', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown({ subtitle: null, kindLabel: null }) }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    await screen.findByText('HDFC Savings');
    expect(screen.queryByText(/Asset/)).not.toBeInTheDocument();
  });

  it('lists the steps as a ledger: +, −, = signs, bold equals, muted info', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    const { container } = renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    await screen.findByText('HDFC Savings');
    const items = Array.from(container.querySelectorAll('ol > li'));
    expect(items.map((li) => li.getAttribute('data-op'))).toEqual(['start', 'add', 'subtract', 'equals', 'info']);
    const sign = (li: Element) => li.firstElementChild!.textContent;
    expect(items.map(sign)).toEqual(['', '+', '−', '=', '']);
    expect(items[1]).toHaveTextContent(formatAmount(7000, 'currency'));
    expect(items[2]).toHaveTextContent('incl. fees');
    expect(items[3]).toHaveClass('font-semibold');
    expect(items[4]).toHaveClass('text-slate-500');
    // An info step without an amount prints none.
    expect(items[4].children).toHaveLength(2);
  });

  it('shows the notes', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    expect(await screen.findByText(/differs from the statement-anchored balance/)).toBeInTheDocument();
  });

  it('renders each section from the breakdown without a section fetch for page 0', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    const region = await screen.findByRole('region', { name: 'Transactions' });
    expect(within(region).getByText('Salary')).toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalledWith(SECTION, expect.anything());
  });

  it('pages a section through the section endpoint', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(await within(region).findByText('Rent')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(SECTION, {
      params: { path: { name: 'net_worth', rowId: 'a1', section: 'transactions' }, query: { page: 1, size: 25 } },
    });
  });

  it('shows a section page failure in rose', async () => {
    vi.mocked(api.GET).mockImplementation(((path: string) =>
      path === BREAKDOWN
        ? Promise.resolve({ data: breakdown() })
        : Promise.reject(new ApiError(500, { message: 'Section failed' } as never))) as never);
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(await within(region).findByText('Section failed')).toHaveClass('text-rose-600');
  });

  it('keeps page 0 up, dimmed, while the first later page loads, so the pager keeps focus', async () => {
    let release!: () => void;
    vi.mocked(api.GET).mockImplementation(((path: string) => {
      if (path === BREAKDOWN) return Promise.resolve({ data: breakdown() });
      return new Promise((resolve) => {
        release = () => resolve({ data: table([{ id: 't2', description: 'Rent' }], page(1, 30)) });
      });
    }) as never);
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    const region = await screen.findByRole('region', { name: 'Transactions' });
    const next = within(region).getByRole('button', { name: 'Next page' });
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(within(region).getByRole('table').closest('.opacity-60')).not.toBeNull());
    expect(within(region).getByText('Salary')).toBeInTheDocument();
    expect(region.querySelector('.animate-pulse')).toBeNull();
    expect(next).toBeInTheDocument();
    expect(next).toHaveFocus();
    release();
    expect(await within(region).findByText('Rent')).toBeInTheDocument();
    expect(within(region).getByRole('table').closest('.opacity-60')).toBeNull();
  });

  it('keeps the last good page and its pager under a page failure, and retries that page', async () => {
    let fail = true;
    vi.mocked(api.GET).mockImplementation(((path: string) => {
      if (path === BREAKDOWN) return Promise.resolve({ data: breakdown() });
      return fail
        ? Promise.reject(new ApiError(500, { message: 'Section failed' } as never))
        : Promise.resolve({ data: table([{ id: 't2', description: 'Rent' }], page(1, 30)) });
    }) as never);
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    const region = await screen.findByRole('region', { name: 'Transactions' });
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(await within(region).findByText('Section failed')).toBeInTheDocument();
    expect(within(region).getByText('Salary')).toBeInTheDocument();

    fail = false;
    fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(await within(region).findByText('Rent')).toBeInTheDocument();
    expect(within(region).queryByText('Section failed')).not.toBeInTheDocument();
    expect((vi.mocked(api.GET).mock.calls as unknown as [string][]).filter(([path]) => path === SECTION)).toHaveLength(2);
  });

  it('opens a transaction from a transaction section row', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    const h = handlers();
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...h} />);
    fireEvent.click(await screen.findByText('Salary'));
    expect(h.onOpenTransaction).toHaveBeenCalledWith('t1');
    expect(h.onOpenBreakdown).not.toHaveBeenCalled();
  });

  it('opens a nested breakdown from a breakdown section row, with the section datasource', async () => {
    mockBreakdown(
      Promise.resolve({
        data: breakdown({
          sections: [
            section({
              key: 'holdings',
              label: 'Holdings',
              rowAction: 'breakdown',
              rowBreakdownDatasource: 'positions',
              table: table([{ id: 'h1', description: 'INFY' }]),
            }),
          ],
        }),
      }),
    );
    const h = handlers();
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...h} />);
    fireEvent.click(await screen.findByText('INFY'));
    expect(h.onOpenBreakdown).toHaveBeenCalledWith({ datasource: 'positions', rowId: 'h1' });
  });

  it('leaves rows inert in a section without a row action', async () => {
    mockBreakdown(
      Promise.resolve({
        data: breakdown({
          sections: [section({ key: 'lots', label: 'Lots', rowAction: null, table: table([{ id: 'l1', description: 'Lot 1' }]) })],
        }),
      }),
    );
    const h = handlers();
    renderWithQuery(<RowBreakdownView datasource="positions" rowId="h1" {...h} />);
    const cell = await screen.findByText('Lot 1');
    expect(cell.closest('tr')).not.toHaveAttribute('role', 'button');
    fireEvent.click(cell);
    expect(h.onOpenTransaction).not.toHaveBeenCalled();
    expect(h.onOpenBreakdown).not.toHaveBeenCalled();
  });

  it('shows a breakdown failure in rose', async () => {
    mockBreakdown(Promise.reject(new ApiError(404, { message: 'Row not found' } as never)));
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...handlers()} />);
    await waitFor(() => expect(screen.getByText('Row not found')).toHaveClass('text-rose-600'));
  });

  it('goes back', async () => {
    mockBreakdown(Promise.resolve({ data: breakdown() }));
    const h = handlers();
    renderWithQuery(<RowBreakdownView datasource="net_worth" rowId="a1" {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(h.onBack).toHaveBeenCalledTimes(1);
  });
});
