import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
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
const update = vi.hoisted(() => vi.fn());
vi.mock('./form/useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: update, isPending: false },
  }),
}));

const accounts = [{ id: 'a1', name: 'HDFC Bank Savings', type: 'bank_account', balance: 0, cardholders: [] }] as unknown as Account[];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));
const categories = vi.hoisted(() => [{ id: 'c1', name: 'Groceries' }]);
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { POST: vi.fn(), GET: vi.fn() } };
});
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
  txn({ id: 't2', description: 'Swiggy', amount: -1249, reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] }),
  txn({ id: 't3', description: 'IKEA', amount: -7430, reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'] }),
  txn({ id: 't5', description: 'Uber', amount: -533, categories: [] }),
];

function propsFor(over: Partial<TransactionsScreenProps> = {}, rowsFor = transactions): TransactionsScreenProps {
  return {
    query: DEFAULT_QUERY,
    today: '2026-10-21',
    list: {
      ok: true,
      rows: transactionRows(rowsFor, { accounts, showSource: false }) as TransactionListRow[],
      totalElements: rowsFor.length,
      totalPages: 1,
    },
    transactions: rowsFor,
    accounts,
    categories: [],
    needsReviewCount: null,
    ...over,
  };
}

function setup(over: Partial<TransactionsScreenProps> = {}, rowsFor = transactions) {
  return renderWithQuery(<TransactionsScreen {...propsFor(over, rowsFor)} />);
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
type Batch = { data: { succeededIds: string[]; skippedIds: string[]; failures: unknown[] } };
const ok = (ids: string[]): Batch => ({ data: { succeededIds: ids, skippedIds: [], failures: [] } });
const hold = () => {
  const d = deferred<Batch>();
  vi.mocked(api.POST).mockReturnValue(d.promise as never);
  return d;
};
const swipe = (name: string, side: 'swipe-right' | 'swipe-left') => {
  const row = screen.getAllByText(name)[0].closest('[data-testid="swipe"]') as HTMLElement;
  fireEvent.click(within(row).getByText(side));
};
const present = (text: string) => screen.queryAllByText(text).length > 0;
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

const needsReviewQuery = { ...DEFAULT_QUERY, review: 'NEEDS_REVIEW' as const };
const reviewRows = transactions.filter((t) => t.reviewType === 'NEEDS_REVIEW');

beforeEach(() => {
  vi.clearAllMocks();
  update.mockReset();
});

describe('TransactionsScreen instant approve', () => {
  it('swipe approve under Needs review: the row and the count go at once, and stay once the server says yes', async () => {
    const d = hold();
    setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    expect(screen.getByText('Needs review · 2')).toBeInTheDocument();
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    expect(screen.getByText('Needs review · 1')).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
    await act(async () => d.resolve(ok(['t2'])));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Approved', expect.objectContaining({ tone: 'success' })));
    expect(present('Swiggy')).toBe(false);
    expect(present('IKEA')).toBe(true);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('puts the row and the count back with an error toast when the approve fails', async () => {
    const d = hold();
    setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(present('Swiggy')).toBe(true));
    expect(screen.getByText('Needs review · 2')).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('puts the row back when the server approved nothing', async () => {
    const d = hold();
    setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    await act(async () => d.resolve({ data: { succeededIds: [], skippedIds: [], failures: [{ id: 't2', reason: 'X' }] } }));
    await waitFor(() => expect(present('Swiggy')).toBe(true));
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('keeps Undo working after an instant approve', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(['t2']) as never);
    setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    showToast.mock.calls[0][1].action.onSelect();
    await waitFor(() =>
      expect(vi.mocked(api.POST).mock.calls.map((c) => (c[1] as { body: { reviewType?: string } }).body.reviewType)).toEqual([
        'MANUALLY_REVIEWED',
        'NEEDS_REVIEW',
      ]),
    );
  });

  it('approve from the dialog (several reasons): the reasons clear and the dialog closes before the server answers', async () => {
    const d = hold();
    setup();
    expect(present('Unreconciled · Category unverified')).toBe(true);
    swipe('IKEA', 'swipe-right');
    fireEvent.click(await screen.findByRole('button', { name: 'Approve 1' }, { timeout: 5000 }));
    await waitFor(() => expect(present('Unreconciled · Category unverified')).toBe(false));
    expect(screen.queryByText('Approve 1 transaction')).toBeNull();
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(present('Unreconciled · Category unverified')).toBe(true));
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('approve from the detail panel is instant too', async () => {
    const d = hold();
    setup();
    fireEvent.click(screen.getAllByText('Swiggy')[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }, { timeout: 5000 }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve 1' }, { timeout: 5000 }));
    await waitFor(() => expect(present('Duplicate')).toBe(false));
    await act(async () => d.resolve(ok(['t2'])));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(present('Duplicate')).toBe(false);
  });

  it('bulk approve still waits for the server', async () => {
    const d = hold();
    setup();
    tick('Swiggy');
    tick('IKEA');
    fireEvent.click(within(screen.getByText(/ selected$/).closest('div')!.parentElement!.parentElement!).getByRole('button', { name: /^Approve/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(present('Duplicate')).toBe(true);
    expect(present('Unreconciled · Category unverified')).toBe(true);
    await act(async () => d.resolve(ok(['t2', 't3'])));
  });
});

describe('TransactionsScreen instant delete', () => {
  const confirmSwipeDelete = () => {
    swipe('BigBasket', 'swipe-left');
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
  };

  it('a swiped delete removes the row and closes the confirm before the server answers', async () => {
    const d = hold();
    setup({}, transactions);
    confirmSwipeDelete();
    await waitFor(() => expect(present('BigBasket')).toBe(false));
    expect(screen.queryByText(/^Delete BigBasket/)).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    await act(async () => d.resolve(ok(['t1'])));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Transaction deleted', { tone: 'success' }));
    expect(present('BigBasket')).toBe(false);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('brings the row back with an error toast when the delete fails', async () => {
    const d = hold();
    setup({}, transactions);
    confirmSwipeDelete();
    await waitFor(() => expect(present('BigBasket')).toBe(false));
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(present('BigBasket')).toBe(true));
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('the row that leaves also lowers the pager total and the Needs review count', async () => {
    const d = hold();
    setup({ needsReviewCount: 2 }, transactions);
    swipe('Swiggy', 'swipe-left');
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    expect(screen.getByText('Needs review · 1')).toBeInTheDocument();
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(screen.getByText('Needs review · 2')).toBeInTheDocument());
  });

  it('bulk delete still waits for the server', async () => {
    const d = hold();
    setup({}, transactions);
    tick('BigBasket');
    tick('Uber');
    fireEvent.click(within(screen.getByText(/ selected$/).closest('div')!.parentElement!.parentElement!).getByRole('button', { name: /^Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 transactions' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(present('BigBasket')).toBe(true);
    expect(present('Uber')).toBe(true);
    await act(async () => d.resolve(ok(['t1', 't5'])));
  });
});

describe('TransactionsScreen instant category and edit', () => {
  it('Set category shows the category on the row and closes at once; a failure takes it back with an error toast', async () => {
    const d = deferred<unknown>();
    update.mockReturnValue(d.promise);
    setup();
    expect(present('Groceries')).toBe(true);
    fireEvent.click(screen.getAllByText('Set category')[0]);
    fireEvent.click(screen.getByRole('combobox', { name: /^Categories/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Groceries/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Set category' })).toBeNull());
    expect(screen.queryAllByText('Set category')).toHaveLength(0);
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(screen.queryAllByText('Set category').length).toBeGreaterThan(0));
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('Set category keeps the category once the save goes through', async () => {
    update.mockResolvedValue({});
    setup();
    fireEvent.click(screen.getAllByText('Set category')[0]);
    fireEvent.click(screen.getByRole('combobox', { name: /^Categories/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Groceries/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Transaction saved!'));
    expect(screen.queryAllByText('Set category')).toHaveLength(0);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('Edit shows the new description at once and closes; a failure restores it', async () => {
    const d = deferred<unknown>();
    update.mockReturnValue(d.promise);
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /^Description/ }), { target: { value: 'Chai point' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(present('Chai point')).toBe(true));
    expect(screen.queryByText('Edit transaction')).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(present('Chai point')).toBe(false));
    expect(present('BigBasket')).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('Edit keeps the new values once the save goes through', async () => {
    update.mockResolvedValue({});
    setup();
    fireEvent.click(screen.getAllByText('BigBasket')[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /^Description/ }), { target: { value: 'Chai point' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Transaction saved!'));
    expect(present('Chai point')).toBe(true);
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('TransactionsScreen entry lifecycle, counts and ordering', () => {
  it('lowers the pager total and the nav badge count while the delete is in flight, and restores both on failure', async () => {
    const d = hold();
    // Kept in the cache with nobody watching, so the badge's number can be read.
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    renderWithQuery(<TransactionsScreen {...propsFor({ needsReviewCount: 2 })} />, { queryClient });
    expect(screen.getAllByText('/ 4').length).toBeGreaterThan(0);
    swipe('Swiggy', 'swipe-left');
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    expect(screen.getAllByText('/ 3').length).toBeGreaterThan(0);
    expect(queryClient.getQueryData(keys.transactions.needsReviewCount())).toBe(1);
    await act(async () => d.reject(new Error('boom')));
    await waitFor(() => expect(screen.getAllByText('/ 4').length).toBeGreaterThan(0));
    expect(queryClient.getQueryData(keys.transactions.needsReviewCount())).toBe(2);
  });

  it('keeps an approved row away through a stale page while its write is in flight, then lets the fresh page decide', async () => {
    const d = hold();
    const view = setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(present('Swiggy')).toBe(false));
    // A page read that started before the write lands: it still has the row.
    view.rerender(<TransactionsScreen {...propsFor({ query: needsReviewQuery, needsReviewCount: 2 }, [...reviewRows])} />);
    expect(present('Swiggy')).toBe(false);
    await act(async () => d.resolve(ok(['t2'])));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(present('Swiggy')).toBe(false);
    // The page read after the write: the row is gone from the server, and the entry goes.
    const fresh = reviewRows.filter((x) => x.id !== 't2');
    view.rerender(<TransactionsScreen {...propsFor({ query: needsReviewQuery, needsReviewCount: 1 }, fresh)} />);
    expect(present('Swiggy')).toBe(false);
    expect(screen.getByText('Needs review · 1')).toBeInTheDocument();
  });

  it('after Undo the row comes back with the next page, and is not hidden by the old approve', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(['t2']) as never);
    const view = setup({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows);
    swipe('Swiggy', 'swipe-right');
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    view.rerender(<TransactionsScreen {...propsFor({ query: needsReviewQuery, needsReviewCount: 1 }, reviewRows.filter((x) => x.id !== 't2'))} />);
    showToast.mock.calls[0][1].action.onSelect();
    await waitFor(() => expect(vi.mocked(api.POST)).toHaveBeenCalledTimes(2));
    view.rerender(<TransactionsScreen {...propsFor({ query: needsReviewQuery, needsReviewCount: 2 }, reviewRows)} />);
    await waitFor(() => expect(present('Swiggy')).toBe(true));
    expect(screen.getByText('Needs review · 2')).toBeInTheDocument();
  });

  const flagged = [
    txn({ id: 'u1', description: 'Uber', amount: -533, categories: [], reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] }),
    txn({}),
  ];
  const pickGroceries = async () => {
    fireEvent.click(screen.getAllByText('Set category')[0]);
    fireEvent.click(screen.getByRole('combobox', { name: /^Categories/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Groceries/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  };

  it('writes to one row go out one at a time, in order, and the category save carries the approve that went before it', async () => {
    const approve = hold();
    update.mockResolvedValue({});
    setup({}, flagged);
    swipe('Uber', 'swipe-right');
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    await pickGroceries();
    await waitFor(() => expect(present('Groceries')).toBe(true));
    expect(update).not.toHaveBeenCalled();
    await act(async () => approve.resolve(ok(['u1'])));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0].body).toMatchObject({ reviewType: 'MANUALLY_REVIEWED' });
  });

  it('an earlier category save that fails does not undo the approve queued behind it, and only its own categories go', async () => {
    const category = deferred<unknown>();
    update.mockReturnValue(category.promise);
    vi.mocked(api.POST).mockResolvedValue(ok(['u1']) as never);
    setup({}, flagged);
    await pickGroceries();
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    swipe('Uber', 'swipe-right');
    await waitFor(() => expect(present('Duplicate')).toBe(false));
    expect(api.POST).not.toHaveBeenCalled();
    await act(async () => category.reject(new Error('boom')));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(present('Set category')).toBe(true));
    expect(present('Duplicate')).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
    expect(router.refresh).toHaveBeenCalled();
  });
});
