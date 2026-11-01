import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { TransactionListRow } from './transactionRowsModel';
import { TransactionsListPane, type TransactionsListPaneProps } from './TransactionsListPane';
import { DEFAULT_QUERY } from './transactionsUrl';

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
const loadNeedsReviewCount = vi.hoisted(() => vi.fn(async () => ({ success: true, data: 99 })));
vi.mock('./transactionsActions', () => ({
  loadMatchingCount: vi.fn(async () => ({ success: true, data: 7 })),
  loadNeedsReviewCount,
}));

const row = (over: Partial<TransactionListRow>): TransactionListRow => ({
  id: 'r1',
  day: '2026-10-12',
  date: '12 Oct',
  weekday: 'Mon',
  description: 'BigBasket',
  amount: -3600,
  formattedAmount: '3,600.00',
  isCredit: false,
  account: 'HDFC Bank Savings',
  categories: ['Groceries'],
  category: 'Groceries',
  watching: false,
  excluded: false,
  ...over,
});

const accounts = [{ id: 'a1', name: 'HDFC Bank Savings', type: 'bank_account' }] as Account[];

function setup(over: Partial<TransactionsListPaneProps> = {}) {
  const props: TransactionsListPaneProps = {
    query: DEFAULT_QUERY,
    today: '2026-10-21',
    list: { ok: true, rows: [row({}), row({ id: 'r2', day: '2026-09-29', date: '29 Sep', description: 'Truffles', categories: [], category: undefined })], totalElements: 182, totalPages: 4 },
    accounts,
    categories: [{ id: 'c1', name: 'Groceries' }] as TransactionsListPaneProps['categories'],
    needsReviewCount: 25,
    ...over,
  };
  return { props, ...renderWithQuery(<TransactionsListPane {...props} />) };
}

beforeEach(() => {
  router.push.mockClear();
});

describe('TransactionsListPane Uncategorized card', () => {
  it('shows the card above the list while something needs a category, and Sort them reports the press', () => {
    const onSortThem = vi.fn();
    setup({ hasUncategorized: true, onSortThem });
    expect(screen.getByText('Some transactions need a category')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sort them' }));
    expect(onSortThem).toHaveBeenCalledTimes(1);
  });

  it('is gone when nothing is uncategorized', () => {
    setup({ hasUncategorized: false });
    expect(screen.queryByText(/need a category/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sort them' })).toBeNull();
  });

  it('is absent when the check was not made', () => {
    setup({});
    expect(screen.queryByRole('button', { name: 'Sort them' })).toBeNull();
  });
});

describe('TransactionsListPane Category and Tags chips', () => {
  it('shows both on phone too, naming what is picked', () => {
    setup({ query: { ...DEFAULT_QUERY, uncategorized: true, tags: ['c1'] }, categoryList: CATEGORY_LIST_FIXTURE });
    expect(screen.getByRole('button', { name: /Category · Uncategorized/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tags · Groceries/ })).toBeInTheDocument();
  });

  it('resetting the Category chip writes the address without the category, back on page one', () => {
    setup({ query: { ...DEFAULT_QUERY, categories: ['food'], tags: ['c1'], page: 2 }, categoryList: CATEGORY_LIST_FIXTURE });
    const chip = screen.getByRole('button', { name: /Category · Food/ });
    fireEvent.click(within(chip.closest('div') ?? chip).getAllByRole('button', { name: 'Reset filter' })[0]);
    expect(String(router.push.mock.calls.at(-1)?.[0])).toBe('/transactions?tag=c1');
  });
});
