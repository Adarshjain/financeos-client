import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS } from '@/features/shell/useSearchText';
import { useNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import type { Account } from '@/lib/account.types';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { TransactionListRow } from './transactionRowsModel';
import { TransactionsListPane, type TransactionsListPaneProps } from './TransactionsListPane';
import { ALL_TIME, DEFAULT_QUERY } from './transactionsUrl';

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

const LAST_14_DAYS = { kind: 'preset', id: 'last_14_days' } as const;
const lastUrl = () => String(router.push.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  router.push.mockClear();
  loadNeedsReviewCount.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('TransactionsListPane', () => {
  it('shows the tabs, the search, the chips and the rows', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Import' })).toHaveAttribute('href', '/transactions/import');
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getAllByText('Period').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getAllByText('BigBasket').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Set category').length).toBeGreaterThan(0);
  });

  const optionOf = (name: string) =>
    screen.getByText(name, { selector: '[role="option"] *, [role="option"]' });

  it('writes the Status picks to the address once, back on page one', () => {
    setup({ query: { ...DEFAULT_QUERY, page: 2 } });
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    fireEvent.click(optionOf('Monitoring'));
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(optionOf('Up to statement'));
    fireEvent.click(optionOf('Needs review'));
    fireEvent.click(screen.getByRole('button', { name: /Done/ }));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(lastUrl()).toContain('monitoring=1');
    expect(lastUrl()).toContain('statement=1');
    expect(lastUrl()).toContain('review=needs_review');
    expect(lastUrl()).not.toContain('page=');
  });

  it('shows the one picked status by name and resets all of them with the x', () => {
    setup({ query: { ...DEFAULT_QUERY, review: 'NEEDS_REVIEW' } });
    expect(screen.getByRole('button', { name: 'Needs review' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filter' }).at(-1)!);
    expect(lastUrl()).toBe('/transactions');
  });

  it('says "2 selected" when two statuses are on', () => {
    setup({ query: { ...DEFAULT_QUERY, monitoring: true, upToStatement: true } });
    expect(screen.getByRole('button', { name: '2 selected' })).toBeInTheDocument();
  });

  it('removing the period chip means all time, which leaves the address bare', () => {
    setup({ query: { ...DEFAULT_QUERY, period: LAST_14_DAYS } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filter' })[0]);
    expect(lastUrl()).toBe('/transactions');
  });

  it('the Period chip opens a dropdown on the page; Apply writes the picked period', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Period' }));
    expect(screen.queryByText('Every filter combines with the others.')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(lastUrl()).toBe('/transactions');
  });

  it('shows only the amount fields the condition needs, in the Filters dialog', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    await screen.findByRole('button', { name: /Show/ });
    const closedOf = (label: string) => screen.getByLabelText(label).closest('[inert]');
    // Default condition "greater than": From only.
    expect(closedOf('From')).toBeNull();
    expect(closedOf('To')).not.toBeNull();
  });

  describe('the Amount condition in the Filters dialog', () => {
    const openDialog = async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: '+ More' }));
      await screen.findByRole('button', { name: /Show/ });
    };
    const pickCondition = (from: string, to: string) => {
      fireEvent.click(screen.getByText(from));
      const matches = screen.getAllByText(to);
      fireEvent.click(matches[matches.length - 1]);
    };
    const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    const show = () => fireEvent.click(screen.getByRole('button', { name: /Show/ }));

    it('greater than applies only From', async () => {
      await openDialog();
      type('From', '100');
      show();
      expect(lastUrl()).toBe('/transactions?amount=gt&amountFrom=100');
    });

    it('less than applies only To, and the From typed before is dropped', async () => {
      await openDialog();
      type('From', '100');
      pickCondition('Greater than', 'Less than');
      type('To', '500');
      show();
      expect(lastUrl()).toBe('/transactions?amount=lt&amountTo=500');
    });

    it('between applies both', async () => {
      await openDialog();
      pickCondition('Greater than', 'Between');
      type('From', '100');
      type('To', '500');
      show();
      expect(lastUrl()).toBe('/transactions?amount=between&amountFrom=100&amountTo=500');
    });

    it('a field hidden by a condition change is emptied: back on between it is not applied', async () => {
      await openDialog();
      pickCondition('Greater than', 'Between');
      type('From', '100');
      type('To', '500');
      pickCondition('Between', 'Greater than');
      pickCondition('Greater than', 'Between');
      show();
      expect(lastUrl()).not.toContain('amount');
    });
  });

  it('offers no remove on the All time chip or an unset Amount chip', () => {
    setup({ query: { ...DEFAULT_QUERY, period: { kind: 'preset', id: 'all_time' } } });
    expect(screen.queryByRole('button', { name: 'Remove filter' })).not.toBeInTheDocument();
  });

  it('writes a picked sort and a Type choice', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Newest' }));
    fireEvent.click(screen.getByText('Highest amount'));
    expect(lastUrl()).toContain('sort=highest');
    fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    fireEvent.click(screen.getByText('Income'));
    expect(lastUrl()).toContain('type=credit');
  });

  it('commits a multi-pick once, when the dropdown closes', () => {
    setup({ accounts: [...accounts, { id: 'a2', name: 'Amex Platinum', type: 'credit_card' }] as Account[] });
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    fireEvent.click(screen.getByText('HDFC Bank Savings', { selector: '[role="option"] *, [role="option"]' }));
    fireEvent.click(screen.getByText('Amex Platinum', { selector: '[role="option"] *, [role="option"]' }));
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Done/ }));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(lastUrl()).toBe('/transactions?account=a1&account=a2');
  });

  it('debounces search into the address and goes back to page one', () => {
    vi.useFakeTimers();
    setup({ query: { ...DEFAULT_QUERY, page: 3 } });
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'swig' } });
    expect(router.push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(lastUrl()).toBe('/transactions?q=swig');
  });

  it('pages and sizes through the address', () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    expect(lastUrl()).toBe('/transactions?page=2');
  });

  it('opens the Filters dialog from + More and shows the live count; Show writes the address', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    expect(screen.getByText('Every filter combines with the others.')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Show 7 results' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Excluded transactions only'));
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    expect(lastUrl()).toBe('/transactions?excluded=1');
  });

  it('closing drops the draft and closes the dialog without touching the address', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    fireEvent.click(screen.getByLabelText('Excluded transactions only'));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Filters' })).getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByText('Every filter combines with the others.')).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    expect(screen.getByLabelText('Excluded transactions only')).not.toBeChecked();
  });

  it('holds Account, Monitoring and Up to statement in the dialog and applies them on Show', async () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'] } });
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    expect(screen.getByText('Account and category')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Monitoring', { selector: '[role="switch"]' }));
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    expect(lastUrl()).toBe('/transactions?account=a1&monitoring=1');
  });

  it('puts a count of the active filters on All filters, which opens the dialog', () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'], monitoring: true } });
    const chip = screen.getByRole('button', { name: /All filters/ });
    expect(chip).toHaveTextContent('2');
    fireEvent.click(chip);
    expect(screen.getByText('Every filter combines with the others.')).toBeInTheDocument();
  });

  it('Reset to defaults in the dialog drops every filter to all time', async () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'], monitoring: true } });
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    fireEvent.click(await screen.findByRole('button', { name: /Show/ }));
    expect(lastUrl()).toBe('/transactions');
  });

  it('shows active dialog-only filters as removable chips', () => {
    setup({ query: { ...DEFAULT_QUERY, source: 'manual', excluded: true } });
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Excluded only')).toBeInTheDocument();
    // The × is the sibling of the chip's main button.
    fireEvent.click(screen.getByText('Excluded only').closest('button')!.nextElementSibling!);
    expect(lastUrl()).toContain('source=manual');
    expect(lastUrl()).not.toContain('excluded');
  });

  it('a changed dropdown chip shows only its value, and its × puts it back to the default', () => {
    setup({ query: { ...DEFAULT_QUERY, type: 'debit' } });
    expect(screen.getByRole('button', { name: 'Expense' })).toBeInTheDocument();
    expect(screen.queryByText(/Type/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(lastUrl()).toBe('/transactions');
  });

  it('shows Reset filters only while something changed, and it clears every filter but the search', () => {
    const { unmount } = setup();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();
    unmount();
    setup({ query: { ...DEFAULT_QUERY, q: 'swig', type: 'debit', monitoring: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(lastUrl()).toBe('/transactions?q=swig');
  });

  it('seeds the nav badge with the count it already has', () => {
    const { queryClient } = setup();
    expect(queryClient.getQueryData(keys.transactions.needsReviewCount())).toBe(25);
  });

  it('does not ask for the count again when the nav badge mounts before the view (layout order)', async () => {
    function Badge() {
      const { data } = useNeedsReviewCount();
      return <p>badge {data ?? 'none'}</p>;
    }
    const props: TransactionsListPaneProps = {
      query: DEFAULT_QUERY,
      today: '2026-10-21',
      list: { ok: true, rows: [], totalElements: 0, totalPages: 0 },
      accounts,
      categories: [],
      needsReviewCount: 25,
    };
    renderWithQuery(
      <>
        <Badge />
        <TransactionsListPane {...props} />
      </>,
    );
    expect(await screen.findByText('badge 25')).toBeInTheDocument();
    await act(async () => {});
    expect(loadNeedsReviewCount).not.toHaveBeenCalled();
  });

  it('dims excluded rows but keeps them clickable', () => {
    const onOpenDetail = vi.fn();
    setup({
      onOpenDetail,
      list: { ok: true, rows: [row({ id: 'x', description: 'Own FD transfer', excluded: true, provenance: 'Excluded', categories: [] })], totalElements: 1, totalPages: 1 },
    });
    const hit = screen.getAllByText('Own FD transfer')[0];
    expect(hit.closest('.opacity-60')).not.toBeNull();
    expect(hit.closest('.pointer-events-none')).toBeNull();
    fireEvent.click(hit);
    expect(onOpenDetail).toHaveBeenCalledWith('x');
  });

  it('shows No transactions match, not first-run, on a page past the end', () => {
    setup({ query: { ...DEFAULT_QUERY, period: ALL_TIME, page: 5 }, list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions match')).toBeInTheDocument();
    expect(screen.queryByText('No transactions yet')).toBeNull();
  });

  it('shows No transactions match with the active filters and clears them', () => {
    setup({ query: { ...DEFAULT_QUERY, period: LAST_14_DAYS, source: 'manual' }, list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions match')).toBeInTheDocument();
    expect(screen.getByText('Try a different search or fewer filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(lastUrl()).toBe('/transactions');
  });

  it('shows No transactions yet with Import when nothing is filtered', () => {
    setup({ query: { ...DEFAULT_QUERY, period: ALL_TIME }, list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add account' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(lastUrl()).toBe('/transactions/import');
  });

  it('shows the first-run state under filters when there is no account at all', () => {
    setup({ accounts: [], list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('shows an inline load error with Try again', () => {
    setup({ list: { ok: false, reference: 'req-9' } });
    expect(screen.getByText("Couldn't load transactions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(router.refresh).toHaveBeenCalled();
  });
});
