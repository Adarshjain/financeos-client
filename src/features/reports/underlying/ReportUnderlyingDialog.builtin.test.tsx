import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('./underlying.helpers', async () => {
  const actual = await vi.importActual<typeof import('./underlying.helpers')>('./underlying.helpers');
  return { ...actual, saveBlob: vi.fn() };
});

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportUnderlyingDialog } from './ReportUnderlyingDialog';
import type { KpiUnderlyingResponse } from './underlying.types';

const user = userEvent.setup({ pointerEventsCheck: 0 });

// Liabilities first in the page, assets second: the groups still come in the server's totals order.
function netWorth(over: Partial<KpiUnderlyingResponse> = {}): KpiUnderlyingResponse {
  return {
    period: 'current',
    datasource: 'net_worth',
    measure: 'balance',
    measureLabel: 'Balance',
    aggregation: 'sum',
    format: 'currency',
    value: 90000,
    rowCount: 3,
    range: null,
    previousAvailable: false,
    previousRange: null,
    filters: [],
    notCounted: [],
    summaryLines: [],
    winnerOnly: false,
    rowAction: 'breakdown',
    groupField: 'group',
    groupTotals: { asset: 130000, liability: -40000 },
    table: {
      type: 'TABLE',
      mode: 'raw',
      columns: [
        { key: 'name', label: 'Account', type: 'string' },
        { key: 'group', label: 'Group', type: 'string', valueLabels: { asset: 'Asset', liability: 'Liability' } },
        { key: 'balance', label: 'Balance', type: 'number', format: 'currency' },
      ],
      rows: [
        { id: 'l1', name: 'Home loan', group: 'liability', balance: -40000 },
        { id: 'a1', name: 'HDFC Savings', group: 'asset', balance: 100000 },
        { id: 'a2', name: 'Zerodha', group: 'asset', balance: 30000 },
      ],
      page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
    },
    ...over,
  } as unknown as KpiUnderlyingResponse;
}

const breakdown = {
  datasource: 'net_worth',
  rowId: 'a1',
  title: 'HDFC Savings',
  subtitle: null,
  kindLabel: null,
  totalLabel: 'Balance',
  total: 100000,
  format: 'currency',
  steps: [],
  sections: [],
  notes: [],
  notCounted: false,
};

const source = { kind: 'builtin' as const, key: 'net_worth', params: {} };
const open = () => renderWithQuery(<ReportUnderlyingDialog builtin={source} onClose={vi.fn()} />);
const pageCalls = () => vi.mocked(api.POST).mock.calls.filter((c) => !String(c[0]).endsWith('/csv'));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.POST).mockImplementation(((path: string) =>
    Promise.resolve(path.endsWith('/csv') ? { data: new Blob(['a,b']) } : { data: netWorth() })) as never);
  vi.mocked(api.GET).mockResolvedValue({ data: breakdown } as never);
});

describe('ReportUnderlyingDialog grouped built-in listing', () => {
  it('shows one table per group, in the server totals order, each headed by its total', async () => {
    open();
    const groups = await screen.findAllByRole('region');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Asset', 'Liability']);
    expect(within(groups[0]).getByText('₹1,30,000')).toBeInTheDocument();
    expect(within(groups[1]).getAllByText(/40,000/).length).toBeGreaterThan(1);
    expect(within(groups[0]).getByText('HDFC Savings')).toBeInTheDocument();
    expect(within(groups[0]).getByText('Zerodha')).toBeInTheDocument();
    expect(within(groups[1]).getByText('Home loan')).toBeInTheDocument();
    expect(within(groups[0]).queryByText('Home loan')).not.toBeInTheDocument();
  });

  it('leaves the group column out of the tables and the sort options', async () => {
    open();
    await screen.findAllByRole('region');
    expect(screen.queryByRole('columnheader', { name: 'Group' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Sort/ }));
    expect(await screen.findByRole('option', { name: 'Balance (descending)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Group/ })).not.toBeInTheDocument();
  });

  it('opens the row breakdown in place, and Back returns to the list', async () => {
    open();
    await user.click(await screen.findByText('HDFC Savings'));
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(vi.mocked(api.GET).mock.calls[0][1]).toMatchObject({ params: { path: { name: 'net_worth', rowId: 'a1' } } });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    // Inside a breakdown only Close is offered: the CSV is the listing's rows.
    expect(screen.queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findAllByRole('region')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeInTheDocument();
  });

  it('does not open anything for a row listing transactions', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: netWorth({ rowAction: 'transaction' }) } as never);
    open();
    await user.click(await screen.findByText('HDFC Savings'));
    expect(api.GET).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('downloads the CSV for the same source and sort as the listing', async () => {
    open();
    await screen.findAllByRole('region');
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(vi.mocked(api.POST).mock.calls.some((c) => String(c[0]).endsWith('/csv'))).toBe(true));
    const csv = vi.mocked(api.POST).mock.calls.find((c) => String(c[0]).endsWith('/csv'))!;
    expect(csv[1]).toMatchObject({ params: { query: { period: 'current' } } });
    expect(pageCalls()[0][0]).toBe(String(csv[0]).replace(/\/csv$/, ''));
  });

  it('shows one pager under all the groups when there is more than one page, and pages on the server', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: netWorth({ table: { ...netWorth().table, page: { number: 0, size: 2, totalElements: 3, totalPages: 2 } } as never }),
    } as never);
    open();
    await screen.findAllByRole('region');
    const pagers = screen.getAllByRole('button', { name: 'Page 2' });
    expect(pagers).toHaveLength(1);
    await user.click(pagers[0]);
    await waitFor(() => expect(pageCalls().length).toBeGreaterThan(1));
  });
});

describe('ReportUnderlyingDialog grouped listing with no rows', () => {
  it('shows the empty message, not a blank body', async () => {
    const empty = netWorth();
    vi.mocked(api.POST).mockResolvedValue({
      data: netWorth({ rowCount: 0, groupTotals: {}, table: { ...empty.table, rows: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 } } as never }),
    } as never);
    open();
    expect(await screen.findByText('No rows make up this figure.')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('ReportUnderlyingDialog ungrouped listing', () => {
  it('stays one table without group headers', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: netWorth({ groupField: null, groupTotals: undefined }) } as never);
    open();
    expect(await screen.findByText('HDFC Savings')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();
  });
});
