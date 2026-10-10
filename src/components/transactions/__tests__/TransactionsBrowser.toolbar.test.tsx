import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/client')>(
      '@/lib/api/client'
    );
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
      PUT: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});
vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);
vi.mock('@/components/transactions/TransactionLinkDialog', () => ({
  TransactionLinkDialog: ({
    open,
    initialSelectedTransactions,
  }: {
    open: boolean;
    initialSelectedTransactions: Transaction[];
  }) =>
    open ? (
      <div role="dialog">linking {initialSelectedTransactions.length}</div>
    ) : null,
}));

const accounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
];
const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: -300,
  description: 'Coffee',
  sourcedDescription: 'COFFEE SHOP',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 5000,
  createdAt: '2026-06-15T00:00:00Z',
};

type Query = { page: number; size: number; sort: string[] };
function serve(total = 120) {
  vi.mocked(api.POST).mockImplementation((async (
    _path: string,
    opts: { params: { query: Query } }
  ) => ({
    data: {
      content: total ? [txn] : [],
      number: opts.params.query.page,
      size: 50,
      totalElements: total,
      totalPages: Math.ceil(total / 50),
      first: true,
      last: false,
      empty: !total,
    },
  })) as never);
}
const lastQuery = () =>
  (
    vi.mocked(api.POST).mock.calls.at(-1)?.[1] as unknown as {
      params: { query: Query };
    }
  ).params.query;

async function renderLoaded(total?: number) {
  serve(total);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  renderWithQuery(<TransactionsBrowser />, { queryClient });
  await screen.findByText(total === 0 ? 'No transactions found' : 'Coffee');
}

/** The sort bar: the row holding the Sort dropdown. */
const sortBar = () =>
  screen
    .getByRole('combobox', { name: 'Sort' })
    .closest('.border-b') as HTMLElement;

describe('Transactions sort bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts sorted by date, newest first', async () => {
    await renderLoaded();
    const sortSelect = screen
      .getByRole('combobox', { name: 'Sort' })
      .closest('[data-testid="select"]');
    expect(sortSelect).toHaveAttribute('data-value', 'date');
    expect(
      screen.getByRole('button', { name: 'Sort descending' })
    ).toBeInTheDocument();
    expect(lastQuery().sort).toEqual(['date,desc']);
  });

  it('picking a field sorts by it, largest first, from the first page', async () => {
    await renderLoaded();
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 3' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(2));

    fireEvent.click(within(sortBar()).getByRole('option', { name: 'Amount' }));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ sort: ['amount,desc'], page: 0 })
    );
  });

  it('the direction button reverses the order and goes back to the first page', async () => {
    await renderLoaded();
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ sort: ['date,asc'], page: 0 })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ sort: ['date,desc'] })
    );
  });

  it('a new field starts descending even after the order was reversed', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    await waitFor(() => expect(lastQuery().sort).toEqual(['date,asc']));
    fireEvent.click(within(sortBar()).getByRole('option', { name: 'Amount' }));
    await waitFor(() => expect(lastQuery().sort).toEqual(['amount,desc']));
  });

  it('carries the top pager in the same row, with no separate transaction count', async () => {
    await renderLoaded();
    const bar = sortBar();
    expect(
      within(bar).getByRole('navigation', { name: 'Pagination' })
    ).toBeInTheDocument();
    expect(
      within(bar).getByRole('combobox', { name: 'Rows per page' })
    ).toBeInTheDocument();
    expect(screen.queryByText('120 transactions')).toBeNull();
    // Only the bottom pager sits outside the bar.
    const navs = screen.getAllByRole('navigation', { name: 'Pagination' });
    expect(navs.filter((n) => !bar.contains(n))).toHaveLength(1);
  });

  it('keeps the sort controls, without a pager, for an empty result', async () => {
    await renderLoaded(0);
    expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sort descending' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });
});

describe('Transactions Link button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heads the page with Link and Create, and no Review button', async () => {
    await renderLoaded();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Review/ })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('Link starts picking: Cancel plus a disabled "Link (0)" replace Link and Create', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link (0)' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Create/ })).toBeNull();
  });

  it('"Link (n)" counts the picked transactions and opens the link dialog with them', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    fireEvent.click(screen.getByRole('checkbox'));
    const link = screen.getByRole('button', { name: 'Link (1)' });
    expect(link).toBeEnabled();
    fireEvent.click(link);
    expect(screen.getByRole('dialog')).toHaveTextContent('linking 1');
  });

  it('Cancel stops picking and drops the selection', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/ })).toBeInTheDocument();

    // Picking again starts from nothing.
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(screen.getByRole('button', { name: 'Link (0)' })).toBeDisabled();
  });
});
