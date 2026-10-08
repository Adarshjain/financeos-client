import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn() } };
});
vi.mock('@/components/transactions/TransactionCard', () => ({
  TransactionCard: ({ transaction, accounts, onMutate }: any) => (
    <div data-testid="txn" data-accounts={accounts.map((a: any) => a.id).join(',')}>
      {transaction.id}
      <button onClick={onMutate}>mutate</button>
    </div>
  ),
}));

import userEvent from '@testing-library/user-event';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AccountRecentTransactions } from '../AccountRecentTransactions';

const account = { id: 'a1', name: 'N', type: 'bank_account' } as never;

beforeEach(() => vi.resetAllMocks());

describe('AccountRecentTransactions', () => {
  it('searches by account id, page 0, size 20, newest first', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { content: [] } } as never);
    renderWithQuery(<AccountRecentTransactions account={account} />);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/search', {
      body: { filters: [{ field: 'accountId', operator: 'is', value: 'a1' }] },
      params: { query: { page: 0, size: 20, sort: ['date,desc'] } },
    });
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    const { container } = renderWithQuery(<AccountRecentTransactions account={account} />);
    expect(container.querySelector('[class*="h-40"]')).not.toBeNull();
    expect(screen.queryByText('No transactions yet')).toBeNull();
  });

  it('shows the empty state when there are no rows, including when the API returns nothing', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    renderWithQuery(<AccountRecentTransactions account={account} />);
    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders one card per row, scoped to this account', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { content: [{ id: 't1' }, { id: 't2' }] } } as never);
    renderWithQuery(<AccountRecentTransactions account={account} />);
    const cards = await screen.findAllByTestId('txn');
    expect(cards).toHaveLength(2);
    expect(cards[0].dataset.accounts).toBe('a1');
  });

  it('a card mutation invalidates the transactions cache', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { content: [{ id: 't1' }] } } as never);
    const { queryClient } = renderWithQuery(<AccountRecentTransactions account={account} />);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await userEvent.click(await screen.findByText('mutate'));
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });
});
