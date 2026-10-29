import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));
vi.mock('@/components/organisms', () => ({
  Chart: (p: { data: { chartType: string; categories: string[]; series: { data: number[] }[] } }) => (
    <div data-testid="chart" data-type={p.data.chartType} data-categories={p.data.categories.join(',')} data-values={JSON.stringify(p.data.series[0].data)} />
  ),
}));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { account, bodyProps, card } from '../testFixtures';
import { AccountTileBody } from './AccountTileBody';

const SERIES = [
  { date: '2026-10-08', balance: 1000 },
  { date: '2026-10-09', balance: 1500 },
  { date: '2026-10-10', balance: 1200 },
];

function serve(acc: unknown, series: unknown = SERIES) {
  vi.mocked(api.GET).mockImplementation(((path: string) =>
    Promise.resolve({ data: path.includes('balance-series') ? series : acc })) as never);
}

describe('AccountTileBody balance drill and trend', () => {
  beforeEach(() => vi.resetAllMocks());

  it('the balance opens the account\'s net worth breakdown', async () => {
    serve(account({ id: 'a1', name: 'HDFC Savings', balance: 125000 }));
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    await userEvent.click(await screen.findByRole('button', { name: '₹1,25,000' }));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row-id', 'a1');
    expect(dialog).toHaveAttribute('data-title', 'HDFC Savings');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
  });

  it('the 30-day balances are a sparkline', async () => {
    serve(account({ id: 'a1', name: 'HDFC Savings', balance: 1200 }));
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    const chart = await screen.findByTestId('chart');
    expect(chart).toHaveAttribute('data-type', 'sparkline');
    expect(chart).toHaveAttribute('data-categories', '2026-10-08,2026-10-09,2026-10-10');
    expect(JSON.parse(chart.getAttribute('data-values') as string)).toEqual([1000, 1500, 1200]);
  });

  it('a card\'s trend reads as the amount owed (balances negated)', async () => {
    serve(card({ id: 'a1', name: 'Amex', balance: -1200 }), [{ date: '2026-10-09', balance: -1500 }, { date: '2026-10-10', balance: -1200 }]);
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(JSON.parse((await screen.findByTestId('chart')).getAttribute('data-values') as string)).toEqual([1500, 1200]);
  });

  it('a broker has no trend, and neither does an account with fewer than two days', async () => {
    serve(account({ id: 'a1', name: 'Zerodha', type: 'broker', balance: 500000 }));
    const { unmount } = renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    await screen.findByTestId('account-tile');
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(vi.mocked(api.GET).mock.calls.some((call) => String(call[0]).includes('balance-series'))).toBe(false);
    unmount();
    serve(account({ id: 'a1', name: 'HDFC', balance: 1 }), [{ date: '2026-10-10', balance: 1 }]);
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    await screen.findByTestId('account-tile');
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });
});
