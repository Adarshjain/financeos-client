import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS } from '@/features/shell/useSearchText';
import type { Account } from '@/lib/account.types';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { useNeedsReviewCount } from '../useNeedsReviewCount';
import type { TransactionListRow } from './transactionRows';
import { ALL_TIME, DEFAULT_QUERY } from './transactionsUrl';
import { TransactionsView, type TransactionsViewProps } from './TransactionsView';

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

function setup(over: Partial<TransactionsViewProps> = {}) {
  const props: TransactionsViewProps = {
    query: DEFAULT_QUERY,
    today: '2026-10-21',
    list: { ok: true, rows: [row({}), row({ id: 'r2', day: '2026-09-29', date: '29 Sep', description: 'Truffles', categories: [], category: undefined })], totalElements: 182, totalPages: 4 },
    accounts,
    categories: [{ id: 'c1', name: 'Groceries' }] as TransactionsViewProps['categories'],
    needsReviewCount: 25,
    ...over,
  };
  return { props, ...renderWithQuery(<TransactionsView {...props} />) };
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

describe('TransactionsView', () => {
  it('shows the tabs, the search, the chips and the rows', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Import' })).toHaveAttribute('href', '/transactions/import');
    expect(screen.getByPlaceholderText('Search merchant, amount…')).toBeInTheDocument();
    expect(screen.getAllByText('Period').length).toBeGreaterThan(0);
    expect(screen.getByText('Needs review · 25')).toBeInTheDocument();
    expect(screen.getAllByText('BigBasket').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Set category').length).toBeGreaterThan(0);
  });

  it('writes a toggle chip to the address, back on page one', () => {
    setup({ query: { ...DEFAULT_QUERY, page: 2 } });
    fireEvent.click(screen.getByRole('button', { name: 'Monitoring' }));
    expect(lastUrl()).toBe('/ds/transactions?monitoring=1');
    fireEvent.click(screen.getByRole('button', { name: 'Up to statement' }));
    expect(lastUrl()).toContain('statement=1');
    fireEvent.click(screen.getByRole('button', { name: 'Needs review · 25' }));
    expect(lastUrl()).toContain('review=needs_review');
  });

  it('turns a switched-on toggle off', () => {
    setup({ query: { ...DEFAULT_QUERY, review: 'NEEDS_REVIEW' } });
    fireEvent.click(screen.getByRole('button', { name: 'Needs review · 25' }));
    expect(lastUrl()).toBe('/ds/transactions');
  });

  it('removing the period chip means all time, which leaves the address bare', () => {
    setup({ query: { ...DEFAULT_QUERY, period: LAST_14_DAYS } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove filter' })[0]);
    expect(lastUrl()).toBe('/ds/transactions');
  });

  it('the Period chip opens a dropdown on the page; Apply writes the picked period', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Period' }));
    expect(screen.queryByText('Every filter combines with the others')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(lastUrl()).toBe('/ds/transactions');
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
      expect(lastUrl()).toBe('/ds/transactions?amount=gt&amountFrom=100');
    });

    it('less than applies only To, and the From typed before is dropped', async () => {
      await openDialog();
      type('From', '100');
      pickCondition('Greater than', 'Less than');
      type('To', '500');
      show();
      expect(lastUrl()).toBe('/ds/transactions?amount=lt&amountTo=500');
    });

    it('between applies both', async () => {
      await openDialog();
      pickCondition('Greater than', 'Between');
      type('From', '100');
      type('To', '500');
      show();
      expect(lastUrl()).toBe('/ds/transactions?amount=between&amountFrom=100&amountTo=500');
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
    expect(lastUrl()).toBe('/ds/transactions?account=a1&account=a2');
  });

  it('debounces search into the address and goes back to page one', () => {
    vi.useFakeTimers();
    setup({ query: { ...DEFAULT_QUERY, page: 3 } });
    fireEvent.change(screen.getByPlaceholderText('Search merchant, amount…'), { target: { value: 'swig' } });
    expect(router.push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(lastUrl()).toBe('/ds/transactions?q=swig');
  });

  it('pages and sizes through the address', () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    expect(lastUrl()).toBe('/ds/transactions?page=1');
  });

  it('opens the Filters dialog from + More and shows the live count; Show writes the address', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    expect(screen.getByText('Every filter combines with the others')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    const show = await screen.findByRole('button', { name: 'Show 7 transactions' });
    expect(show).toBeInTheDocument();
    // On a phone only the noun is hidden (CSS), so the label reads "Show 7".
    expect(show.querySelector('.max-desk\\:hidden')?.textContent).toBe('transactions');
    fireEvent.click(screen.getByLabelText('Excluded transactions only'));
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    expect(lastUrl()).toBe('/ds/transactions?excluded=1');
  });

  it('Cancel drops the draft and closes the dialog without touching the address', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    fireEvent.click(screen.getByLabelText('Excluded transactions only'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Every filter combines with the others')).not.toBeInTheDocument();
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
    expect(lastUrl()).toBe('/ds/transactions?account=a1&monitoring=1');
  });

  it('puts a count of the active filters on All filters, which opens the dialog', () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'], monitoring: true } });
    const chip = screen.getByRole('button', { name: /All filters/ });
    expect(chip).toHaveTextContent('2');
    fireEvent.click(chip);
    expect(screen.getByText('Every filter combines with the others')).toBeInTheDocument();
  });

  it('widens the search on focus and collapses it on blur even while it holds text', () => {
    setup();
    const input = screen.getByPlaceholderText('Search merchant, amount…');
    const frame = () => input.closest('[class*="desk:min-w-container-xs"]') as HTMLElement;
    expect(frame().className).toContain('flex-1');
    fireEvent.focus(input);
    expect(frame().className).toContain('max-desk:basis-11/12');
    fireEvent.blur(input);
    expect(frame().className).toContain('flex-1');
    fireEvent.change(input, { target: { value: 'zz' } });
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(frame().className).toContain('flex-1');
    expect(frame().className).not.toContain('basis-11/12');
  });

  it('Clear all in the dialog drops every filter to all time', async () => {
    setup({ query: { ...DEFAULT_QUERY, accounts: ['a1'], monitoring: true } });
    fireEvent.click(screen.getByRole('button', { name: '+ More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(await screen.findByRole('button', { name: /Show/ }));
    expect(lastUrl()).toBe('/ds/transactions');
  });

  it('shows active dialog-only filters as removable chips', () => {
    setup({ query: { ...DEFAULT_QUERY, source: 'manual', excluded: true } });
    expect(screen.getByText('Source · Manual')).toBeInTheDocument();
    expect(screen.getByText('Excluded only')).toBeInTheDocument();
    // The × is the sibling of the chip's main button.
    fireEvent.click(screen.getByText('Excluded only').closest('button')!.nextElementSibling!);
    expect(lastUrl()).toContain('source=manual');
    expect(lastUrl()).not.toContain('excluded');
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
    const props: TransactionsViewProps = {
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
        <TransactionsView {...props} />
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
    expect(screen.getByText('Last 14 days · manual')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(lastUrl()).toBe('/ds/transactions');
  });

  it('shows No transactions yet with Add account and Import when nothing is filtered', () => {
    setup({ query: { ...DEFAULT_QUERY, period: ALL_TIME }, list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(lastUrl()).toBe('/transactions/import');
  });

  it('shows the first-run state under filters when there is no account at all', () => {
    setup({ accounts: [], list: { ok: true, rows: [], totalElements: 0, totalPages: 0 } });
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('shows an inline load error with Try again', () => {
    setup({ list: { ok: false, reference: 'req-9' } });
    expect(screen.getByText('Could not load transactions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalled();
  });
});
