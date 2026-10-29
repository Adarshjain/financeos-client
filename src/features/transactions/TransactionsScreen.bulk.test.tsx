import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { serverApi as api } from '@/lib/api/server';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { TransactionListRow } from './list/transactionRowsModel';
import { transactionRows } from './list/transactionRowsModel';
import { DEFAULT_QUERY } from './list/transactionsUrl';
import { TransactionsScreen, type TransactionsScreenProps } from './TransactionsScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/transactions',
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

vi.mock('@/lib/api/server', () => ({ serverApi: { POST: vi.fn(), GET: vi.fn() } }));
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));
// Swipe is a pointer gesture; the stub exposes what each side would do.
vi.mock('@/components/ds/SwipeActions/SwipeActions', () => ({
  SwipeActions: ({
    children,
    left,
    right,
    disabled,
  }: {
    children: React.ReactNode;
    left?: { onTrigger?: () => void };
    right?: { onTrigger?: () => void };
    disabled?: boolean;
  }) => (
    <div data-testid="swipe" data-disabled={String(Boolean(disabled))}>
      {left ? <button onClick={left.onTrigger}>swipe-right</button> : null}
      {right ? <button onClick={right.onTrigger}>swipe-left</button> : null}
      {children}
    </div>
  ),
}));

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
    createdAt: '2026-10-12T00:00:00Z',
    ...over,
  }) as Transaction;

const transactions = [
  txn({}),
  txn({ id: 't2', description: 'Swiggy', amount: -1249, source: 'gmail_transaction_alert', reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] }),
  txn({ id: 't3', description: 'IKEA', amount: -7430, source: 'gmail_statement', reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'] }),
  txn({ id: 't4', description: 'Rent', amount: -32000, reviewType: 'NEEDS_REVIEW', reviewReasons: [] }),
];

function setup(over: Partial<TransactionsScreenProps> = {}) {
  const props: TransactionsScreenProps = {
    query: DEFAULT_QUERY,
    today: '2026-10-21',
    list: {
      ok: true,
      rows: transactionRows(transactions, { accounts, showSource: false }) as TransactionListRow[],
      totalElements: 4,
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
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));
const bar = () => screen.getByText(/ selected$/).closest('div')!.parentElement!.parentElement!;
const barButton = (name: RegExp | string) => within(bar()).getByRole('button', { name });
const posts = (path: string) => vi.mocked(api.POST).mock.calls.filter((c) => c[0] === path).map((c) => c[1]);
const batch = (succeededIds: string[], extra: Record<string, unknown> = {}) =>
  vi.mocked(api.POST).mockResolvedValue({ data: { succeededIds, skippedIds: [], failures: [], ...extra } } as never);

beforeEach(() => vi.clearAllMocks());

describe('TransactionsScreen selection and bulk actions', () => {
  it('shows no bar until a row is ticked, then the count and the money and review summary', () => {
    setup();
    expect(screen.queryByText(/ selected$/)).toBeNull();
    tick('Swiggy');
    tick('IKEA');
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('₹8,679 · 2 need review')).toBeInTheDocument();
  });

  it('select all takes the rows on this page and Cancel puts them back', async () => {
    setup();
    tick('BigBasket');
    fireEvent.click(screen.getAllByRole('button', { name: 'Select all 4' })[0]);
    expect(screen.getByText('4 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/ selected$/)).toBeNull());
  });

  it('starts from nothing when the filters change', async () => {
    const view = setup();
    tick('Swiggy');
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    view.rerender(
      <TransactionsScreen
        query={{ ...DEFAULT_QUERY, page: 1 }}
        today="2026-10-21"
        list={{ ok: true, rows: transactionRows(transactions, { accounts, showSource: false }) as TransactionListRow[], totalElements: 4, totalPages: 1 }}
        transactions={transactions}
        accounts={accounts}
        categories={[]}
        needsReviewCount={null}
      />,
    );
    await waitFor(() => expect(screen.queryByText(/ selected$/)).toBeNull());
  });

  it('enables Merge for exactly two, with the pair hint; otherwise it is disabled saying pick 2', () => {
    setup();
    tick('Swiggy');
    expect(barButton(/^Merge/)).toBeDisabled();
    expect(within(bar()).getByText('pick 2')).toBeInTheDocument();
    tick('IKEA');
    expect(barButton(/^Merge/)).toBeEnabled();
    expect(within(bar()).getByText('the pair')).toBeInTheDocument();
    tick('Rent');
    expect(barButton(/^Merge/)).toBeDisabled();
  });

  it('Merge opens the dialog with the statement kept and merges the pair', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { keptId: 't3', reviewType: 'MANUALLY_REVIEWED', remainingReasons: [] } } as never);
    setup();
    tick('Swiggy');
    tick('IKEA');
    fireEvent.click(barButton(/^Merge/));
    expect(screen.getByText('Merge transactions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(posts('/api/v1/transactions/merge')).toEqual([{ body: { keepId: 't3', deleteId: 't2' } }]));
    await waitFor(() => expect(screen.queryByText(/ selected$/)).toBeNull());
  });

  it('Approve counts the rows that need review, and clears the ticked reasons on them only', async () => {
    batch(['t2', 't3']);
    setup();
    ['BigBasket', 'Swiggy', 'IKEA', 'Rent'].forEach(tick);
    expect(within(bar()).getByText('2')).toBeInTheDocument();
    fireEvent.click(barButton(/^Approve/));
    expect(screen.getByText('Approve 2 transactions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(posts('/api/v1/transactions/batch-review')).toHaveLength(1));
    expect(posts('/api/v1/transactions/batch-review')[0]).toMatchObject({
      body: { transactionIds: ['t2', 't3'], reviewType: 'MANUALLY_REVIEWED' },
    });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Approved 2 transactions', expect.objectContaining({ tone: 'success' })));
    await waitFor(() => expect(screen.queryByText(/ selected$/)).toBeNull());
  });

  it('shows the summary, not a toast, when an approve skipped a row; Approve closes first', async () => {
    batch(['t2'], { skippedIds: ['t3'] });
    setup();
    tick('Swiggy');
    tick('IKEA');
    fireEvent.click(barButton(/^Approve/));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));
    expect(await screen.findByText('Approve summary')).toBeInTheDocument();
    expect(screen.getAllByText('IKEA').length).toBeGreaterThan(0);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('closes the detail when its row was merged away', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { keptId: 't3', reviewType: 'MANUALLY_REVIEWED', remainingReasons: [] } } as never);
    setup();
    fireEvent.click(screen.getAllByText('Swiggy')[0]);
    expect(await screen.findByText('UPI/BIGBASKET')).toBeInTheDocument();
    tick('Swiggy');
    tick('IKEA');
    fireEvent.click(barButton(/^Merge/));
    fireEvent.click(screen.getByRole('button', { name: 'Merge and resolve' }));
    await waitFor(() => expect(posts('/api/v1/transactions/merge')).toHaveLength(1));
    await waitFor(() => expect(document.querySelector('[aria-hidden="true"].max-w-container-sm')).toBeNull());
  });

  it('puts the select row where the tabs were while rows are selected', () => {
    setup();
    expect(screen.getByText('Rules').closest('.desk\\:hidden')).toBeNull();
    tick('Swiggy');
    // Phone keeps the tabs (desk:hidden wrapper); desktop swaps them for the select row.
    expect(screen.getByText('Rules').closest('.desk\\:hidden')).not.toBeNull();
  });

  it('Approve is off when nothing selected needs review', () => {
    setup();
    tick('BigBasket');
    tick('Rent');
    expect(barButton(/^Approve/)).toBeDisabled();
  });

  it('Delete confirms first, then deletes the selection and says so', async () => {
    batch(['t1', 't2']);
    setup();
    tick('BigBasket');
    tick('Swiggy');
    fireEvent.click(barButton(/^Delete/));
    expect(screen.getByText('Delete 2 transactions?')).toBeInTheDocument();
    expect(posts('/api/v1/transactions/batch-delete')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 transactions' }));
    await waitFor(() => expect(posts('/api/v1/transactions/batch-delete')).toEqual([{ body: { transactionIds: ['t1', 't2'] } }]));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('2 transactions deleted', { tone: 'success' }));
    await waitFor(() => expect(screen.queryByText(/ selected$/)).toBeNull());
  });

  it('opens a summary instead of the toast when some deletes failed', async () => {
    batch(['t1'], { failures: [{ id: 't2', reason: 'NOT_FOUND' }] });
    setup();
    tick('BigBasket');
    tick('Swiggy');
    fireEvent.click(barButton(/^Delete/));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 transactions' }));
    expect(await screen.findByText('Delete summary')).toBeInTheDocument();
    expect(screen.getByText('Transaction not found')).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('Link opens the multi-transaction dialog for the selection', async () => {
    setup();
    tick('BigBasket');
    tick('Swiggy');
    fireEvent.click(barButton(/^Link/));
    expect(await screen.findByText('Link 2 transactions')).toBeInTheDocument();
  });
});

describe('TransactionsScreen review', () => {
  it('swipe right on a one-reason row approves at once with an Undo toast; undo puts the reason back', async () => {
    batch(['t2']);
    setup();
    const row = screen.getAllByText('Swiggy')[0].closest('[data-testid="swipe"]') as HTMLElement;
    fireEvent.click(within(row).getByText('swipe-right'));
    await waitFor(() => expect(posts('/api/v1/transactions/batch-review')).toHaveLength(1));
    expect(posts('/api/v1/transactions/batch-review')[0]).toMatchObject({
      body: { transactionIds: ['t2'], reviewType: 'MANUALLY_REVIEWED', reviewReasons: ['DUPLICATE_SUSPECT'] },
    });
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    const [message, options] = showToast.mock.calls[0];
    expect(message).toBe('Approved');
    options.action.onSelect();
    await waitFor(() => expect(posts('/api/v1/transactions/undo-approve')).toHaveLength(1));
    expect(posts('/api/v1/transactions/batch-review')).toHaveLength(1);
  });

  it('swipe right on a several-reason row opens the approve dialog for that row', async () => {
    setup();
    const row = screen.getAllByText('IKEA')[0].closest('[data-testid="swipe"]') as HTMLElement;
    fireEvent.click(within(row).getByText('swipe-right'));
    expect(await screen.findByText('Approve 1 transaction')).toBeInTheDocument();
    expect(posts('/api/v1/transactions/batch-review')).toHaveLength(0);
  });

  it('offers no approve swipe where there is nothing to clear, but still offers delete', () => {
    setup();
    for (const name of ['BigBasket', 'Rent']) {
      const row = screen.getAllByText(name)[0].closest('[data-testid="swipe"]') as HTMLElement;
      expect(within(row).queryByText('swipe-right')).toBeNull();
      expect(within(row).getByText('swipe-left')).toBeInTheDocument();
    }
  });

  it('swipe left asks first, then deletes that row', async () => {
    batch(['t1']);
    setup();
    const row = screen.getAllByText('BigBasket')[0].closest('[data-testid="swipe"]') as HTMLElement;
    fireEvent.click(within(row).getByText('swipe-left'));
    expect(screen.getByText(/^Delete BigBasket/)).toBeInTheDocument();
    expect(posts('/api/v1/transactions/batch-delete')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(posts('/api/v1/transactions/batch-delete')).toEqual([{ body: { transactionIds: ['t1'] } }]));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Transaction deleted', { tone: 'success' }));
  });

  it('does not swipe while rows are selected', () => {
    setup();
    tick('BigBasket');
    for (const swipe of screen.getAllByTestId('swipe')) expect(swipe).toHaveAttribute('data-disabled', 'true');
  });

  it('the detail Review button opens the approve dialog even for a one-reason row, and is missing without a reason', async () => {
    batch(['t2']);
    setup();
    fireEvent.click(screen.getAllByText('Rent')[0]);
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
    fireEvent.click(screen.getAllByText('Swiggy')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Approve 1 transaction')).toBeInTheDocument();
    expect(posts('/api/v1/transactions/batch-review')).toHaveLength(0);
    expect(showToast).not.toHaveBeenCalled();
  });
});
