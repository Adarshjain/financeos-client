import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));

vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));
import { api } from '@/lib/api/client';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LENDING_BALANCES_TOP } from './lendingBalances';
import { LendingBalancesBody } from './LendingBalancesBody';

const person = (id: string, name: string, netPosition: number): CounterpartyResponse => ({
  id, name, netPosition, entryCount: 2, linkedEntryCount: 0, totalLent: 0, totalBorrowed: 0, repaidByYou: 0, repaidToYou: 0,
});
const respond = (content: CounterpartyResponse[], totalElements = content.length) =>
  vi.mocked(api.GET).mockResolvedValue({ data: { content, totalElements, number: 0, size: LENDING_BALANCES_TOP } } as never);

describe('LendingBalancesBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('asks the server for the top people with a balance, biggest |net| first', async () => {
    respond([]);
    renderWithQuery(<LendingBalancesBody />);
    await screen.findByText('All square');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', {
      params: { query: { page: 0, size: LENDING_BALANCES_TOP, outstanding: true, sort: ['net'] } },
    });
  });

  it('nobody owing is All square with a way to Lendings', async () => {
    respond([]);
    renderWithQuery(<LendingBalancesBody />);
    expect(await screen.findByText('All square')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to lendings' })).toHaveAttribute('href', expect.stringContaining('/loans/lendings'));
  });

  it('rows read who owes whom with the amount; the amount opens the person breakdown', async () => {
    respond([person('p1', 'Rahul', 12000), person('p2', 'Priya', -2500)], 2);
    renderWithQuery(<LendingBalancesBody />);
    const rows = within(await screen.findByRole('list', { name: 'Balances' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Rahul');
    expect(rows[0]).toHaveTextContent('Owes you');
    expect(rows[0]).toHaveTextContent('₹12,000');
    expect(within(rows[0]).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(within(rows[0]).getByRole('button', { name: '₹12,000' }));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row-id', 'p1');
    expect(dialog).toHaveAttribute('data-title', 'Rahul');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('You owe');
    expect(rows[1]).toHaveTextContent('₹2,500');
  });

  it('View all only when more people have balances than are listed', async () => {
    respond([person('p1', 'Rahul', 12000)], 9);
    const { unmount } = renderWithQuery(<LendingBalancesBody />);
    expect(await screen.findByRole('link', { name: 'View all' })).toHaveAttribute('href', expect.stringContaining('/loans/lendings'));
    unmount();
    respond([person('p1', 'Rahul', 12000)], 1);
    renderWithQuery(<LendingBalancesBody />);
    await screen.findByText('Rahul');
    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });

  it('rows have no Settle up button', async () => {
    respond([person('p1', 'Rahul', 12000), person('p2', 'Priya', -2500)]);
    renderWithQuery(<LendingBalancesBody />);
    await screen.findByText('Rahul');
    expect(screen.queryByRole('button', { name: /settle up/i })).not.toBeInTheDocument();
  });

  it('skeleton while loading, Retry on failure', async () => {
    vi.mocked(api.GET).mockReturnValueOnce(new Promise(() => {}) as never);
    const first = renderWithQuery(<LendingBalancesBody />);
    expect(screen.getByTestId('lending-balances-loading')).toBeInTheDocument();
    first.unmount();
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('x'));
    renderWithQuery(<LendingBalancesBody />);
    expect(await screen.findByText("Couldn't load lending balances")).toBeInTheDocument();
    respond([person('p1', 'Rahul', 12000)]);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Rahul')).toBeInTheDocument();
  });
});
