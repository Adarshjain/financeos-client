import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { TransactionListRow } from './list/transactionRows';
import { transactionRows } from './list/transactionRows';
import { DEFAULT_QUERY } from './list/transactionsUrl';
import { TransactionsScreen, type TransactionsScreenProps } from './TransactionsScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/ds/transactions',
  useSearchParams: () => new URLSearchParams(),
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
vi.mock('@/features/lendings/useLendingTransactionLink', () => ({
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
  return renderWithQuery(<TransactionsScreen {...props} />);
}

vi.mock('./link/LinkTransactionsDialog', () => ({
  LinkTransactionsDialog: (p: { transactions: { id: string; description?: string }[]; onClose: () => void; onLinked: () => void }) => (
    <div data-testid="link-dialog">
      <span>{`linking ${p.transactions.map((t) => t.description).join(',')}`}</span>
      <button type="button" onClick={() => { p.onClose(); p.onLinked(); }}>
        Finish link
      </button>
    </div>
  ),
}));

beforeEach(() => vi.clearAllMocks());

describe('TransactionsScreen, Link to…', () => {
  it('opens the Link dialog on the detail transaction from Link to…, keeping the detail behind it', () => {
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Link to…' }));
    expect(screen.getByText('linking BigBasket')).toBeInTheDocument();
    expect(screen.getByText('UPI/BIGBASKET')).toBeInTheDocument();
  });

  it('refreshes the list once the link is made, and closes the dialog', async () => {
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Link to…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish link' }));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('link-dialog')).toBeNull());
  });
});
