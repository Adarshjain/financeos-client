import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AddTransactionProvider } from './form/AddTransactionProvider';
import type { TransactionListRow } from './list/transactionRowsModel';
import { transactionRows } from './list/transactionRowsModel';
import { DEFAULT_QUERY } from './list/transactionsUrl';
import { TransactionsScreen, type TransactionsScreenProps } from './TransactionsScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
const urlParams = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/transactions',
  useSearchParams: () => urlParams.current,
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('./list/transactionsActions', () => ({
  loadMatchingCount: vi.fn(async () => ({ success: true, data: 7 })),
  loadNeedsReviewCount: vi.fn(async () => ({ success: true, data: 9 })),
}));
vi.mock('./detail/transactionDetailApi', () => ({
  fetchTransaction: vi.fn(),
  fetchTransactionLinks: vi.fn(async () => []),
  deleteTransaction: vi.fn(),
  createTransactionLink: vi.fn(),
  deleteTransactionLink: vi.fn(),
  deleteLoanPayment: vi.fn(),
  unlinkDividendTransaction: vi.fn(),
  linkDividendTransaction: vi.fn(),
}));
vi.mock('@/features/lendings/useLendingMutations', () => ({
  useLinkLendingTransaction: () => ({ mutateAsync: vi.fn() }),
  useUnlinkLendingTransaction: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('./form/useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

const accounts = [{ id: 'a1', name: 'HDFC Bank Savings', type: 'bank_account', balance: 0, cardholders: [] }] as unknown as Account[];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));
const categories = vi.hoisted(() => [{ id: 'c1', name: 'Groceries' }]);
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));

const txn = (over: Partial<Transaction>): Transaction =>
  ({
    id: 't1',
    accountId: 'a1',
    date: '2026-10-12',
    amount: -3600,
    description: 'BigBasket',
    sourcedDescription: 'UPI/BIGBASKET',
    source: 'gmail_transaction_alert',
    reviewType: 'MANUALLY_REVIEWED',
    categories: [{ id: 'c1', name: 'Groceries' }],
    createdAt: '',
    ...over,
  }) as Transaction;

const transactions = [
  txn({}),
  txn({ id: 't2', description: 'Uber', sourcedDescription: 'UBER INDIA', amount: -533, categories: [] }),
];

function setup(over: Partial<TransactionsScreenProps> = {}) {
  const props: TransactionsScreenProps = {
    query: DEFAULT_QUERY,
    today: '2026-10-21',
    list: {
      ok: true,
      rows: transactionRows(transactions, { accounts, showSource: false }) as TransactionListRow[],
      totalElements: 2,
      totalPages: 1,
    },
    transactions,
    accounts,
    categories: [],
    needsReviewCount: null,
    ...over,
  };
  return renderWithQuery(
    <AddTransactionProvider today={props.today}>
      <TransactionsScreen {...props} />
    </AddTransactionProvider>,
  );
}

const spacer = () => document.querySelector('[aria-hidden="true"].max-w-container-sm');

beforeEach(() => {
  vi.clearAllMocks();
  urlParams.current = new URLSearchParams();
});

describe('TransactionsScreen', () => {
  it('opens the detail from a row, reserving room beside the list, without touching the address', async () => {
    setup();
    expect(spacer()).toBeNull();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    expect(await screen.findByText('UPI/BIGBASKET')).toBeInTheDocument();
    expect(screen.getByText('Monday 12 October 2026')).toBeInTheDocument();
    expect(spacer()).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('swaps the detail when another row is pressed, and closes it', async () => {
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    expect(await screen.findByText('UPI/BIGBASKET')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('Uber')[0]);
    expect(screen.getByText('UBER INDIA')).toBeInTheDocument();
    expect(screen.queryByText('UPI/BIGBASKET')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() => expect(spacer()).toBeNull());
  });

  it('opens Add transaction from the app bar +, on the one account the list is filtered to', async () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'] } });
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(await screen.findByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('HDFC Bank Savings');
  });

  it('opens the Set category dialog from a row\'s Set category, not the Edit form', async () => {
    setup();
    fireEvent.click(screen.getAllByText('Set category')[0]);
    expect(await screen.findByRole('dialog', { name: 'Set category' })).toBeInTheDocument();
    expect(screen.queryByText('Edit transaction')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens Edit from the detail, keeping the detail behind it', async () => {
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByText('Edit transaction')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Description/ })).toHaveValue('BigBasket');
    expect(spacer()).not.toBeNull();
  });

  it('shows no Review on the detail until it is wired', () => {
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
  });

  describe('deep link ?txn', () => {
    const ID = '11111111-2222-3333-4444-555555555555';

    it('opens the detail of a transaction that is not on the page, fetched by id, and drops ?txn on close without navigating', async () => {
      const { fetchTransaction } = await import('./detail/transactionDetailApi');
      vi.mocked(fetchTransaction).mockResolvedValue(
        txn({ id: ID, description: 'Old purchase', sourcedDescription: 'UPI/OLD', date: '2024-01-05' }),
      );
      window.history.replaceState(null, '', `/transactions?txn=${ID}`);
      const replaceState = vi.spyOn(window.history, 'replaceState');
      setup({ query: { ...DEFAULT_QUERY, txn: ID } });

      expect(await screen.findByText('UPI/OLD')).toBeInTheDocument();
      expect(fetchTransaction).toHaveBeenCalledWith(ID);
      expect(replaceState).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
      await waitFor(() => expect(spacer()).toBeNull());
      expect(replaceState.mock.calls.at(-1)?.[2]).toBe('/transactions');
      expect(router.push).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      replaceState.mockRestore();
    });

    it('shows no dialog for an unknown or foreign id and cleans the address', async () => {
      const { fetchTransaction } = await import('./detail/transactionDetailApi');
      vi.mocked(fetchTransaction).mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
      window.history.replaceState(null, '', `/transactions?txn=${ID}`);
      setup({ query: { ...DEFAULT_QUERY, txn: ID } });

      await waitFor(() => expect(window.location.search).toBe(''));
      expect(screen.queryByText("Couldn't load this transaction.")).toBeNull();
      expect(screen.getAllByText('BigBasket').length).toBeGreaterThan(0);
    });

    it('opens one already on the page without fetching it', async () => {
      const { fetchTransaction } = await import('./detail/transactionDetailApi');
      setup({ query: { ...DEFAULT_QUERY, txn: 't1' } });
      expect(screen.getByText('UPI/BIGBASKET')).toBeInTheDocument();
      expect(fetchTransaction).not.toHaveBeenCalled();
    });

    it('keeps the panel, its Retry and the address when the load fails for another reason than not found', async () => {
      const { fetchTransaction } = await import('./detail/transactionDetailApi');
      vi.mocked(fetchTransaction).mockRejectedValue(Object.assign(new Error('Server error'), { status: 500 }));
      window.history.replaceState(null, '', `/transactions?txn=${ID}`);
      setup({ query: { ...DEFAULT_QUERY, txn: ID } });

      expect(await screen.findByText("Couldn't load this transaction.")).toBeInTheDocument();
      expect(window.location.search).toBe(`?txn=${ID}`);
    });

    it('opens a transaction when the address changes to ?txn while the page stays mounted, and again after a close', async () => {
      window.history.replaceState(null, '', '/transactions');
      const ui = () => (
        <AddTransactionProvider today="2026-10-21">
          <TransactionsScreen
            query={DEFAULT_QUERY}
            today="2026-10-21"
            list={{ ok: true, rows: transactionRows(transactions, { accounts, showSource: false }) as TransactionListRow[], totalElements: 2, totalPages: 1 }}
            transactions={transactions}
            accounts={accounts}
            categories={[]}
            needsReviewCount={null}
          />
        </AddTransactionProvider>
      );
      const view = setup();
      expect(spacer()).toBeNull();

      urlParams.current = new URLSearchParams(`txn=t2`);
      view.rerender(ui());
      expect(await screen.findByText('UBER INDIA')).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
      await waitFor(() => expect(spacer()).toBeNull());
      urlParams.current = new URLSearchParams();
      view.rerender(ui());

      urlParams.current = new URLSearchParams(`txn=t1`);
      view.rerender(ui());
      expect(await screen.findByText('UPI/BIGBASKET')).toBeInTheDocument();
    });
  });
});
