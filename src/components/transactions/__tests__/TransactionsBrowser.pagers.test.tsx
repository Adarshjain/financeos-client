import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewBrowser } from '@/components/transactions/ReviewBrowser';
import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { expectPagersAroundList } from '@/test/pagers';
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
// The mobile filter sheet, rendered in place so a pager inside it would show up.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-bar">{children}</div>
  ),
}));

const accounts: Account[] = [
  {
    id: 'acc1',
    name: 'HDFC Savings',
    type: AccountType.BANK_ACCOUNT,
    lastStatementDate: '2026-06-30',
  },
];

const txn = (reviewType: Transaction['reviewType']): Transaction => ({
  id: 't1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: -300,
  description: 'Coffee',
  sourcedDescription: 'COFFEE SHOP',
  source: 'manual',
  reviewType,
  reviewReasons:
    reviewType === 'NEEDS_REVIEW' ? ['CATEGORY_UNVERIFIED'] : undefined,
  balance: 5000,
  createdAt: '2026-06-15T00:00:00Z',
});

/** POST /transactions/search answers with page `number` of 120 rows, 50 a page. */
function serve(reviewType: Transaction['reviewType'], total = 120) {
  vi.mocked(api.POST).mockImplementation((async (
    path: string,
    opts: { params: { query: { page?: number } } }
  ) =>
    path === '/api/v1/transactions/search'
      ? {
          data: {
            content: total ? [txn(reviewType)] : [],
            number: opts.params.query.page ?? 0,
            size: 50,
            totalElements: total,
            totalPages: Math.ceil(total / 50),
            first: true,
            last: false,
            empty: !total,
          },
        }
      : { data: null }) as never);
}

/** The page of the last list search (the one-row review-count probe excluded). */
const lastPageAsked = () =>
  vi
    .mocked(api.POST)
    .mock.calls.filter((c) => c[0] === '/api/v1/transactions/search')
    .map(
      (c) =>
        (
          c[1] as unknown as {
            params: { query: { page: number; size: number } };
          }
        ).params.query
    )
    .filter((q) => q.size !== 1)
    .at(-1)?.page;

function renderPage(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  return renderWithQuery(ui, { queryClient });
}

describe('Transactions pagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pager above and below the list, outside the desktop and mobile filter bars', async () => {
    serve('MANUALLY_REVIEWED');
    renderPage(<TransactionsBrowser />);
    const row = await screen.findByText('Coffee');
    expectPagersAroundList(
      row,
      screen.getAllByPlaceholderText(
        'Search descriptions, accounts, categories...'
      )
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
  });

  it('pages from the bottom pager', async () => {
    serve('MANUALLY_REVIEWED');
    renderPage(<TransactionsBrowser />);
    await screen.findByText('Coffee');
    const bottom = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(bottom).getByRole('button', { name: 'Page 3' }));
    await waitFor(() => expect(lastPageAsked()).toBe(2));
  });

  it('shows no pager for an empty result', async () => {
    serve('MANUALLY_REVIEWED', 0);
    renderPage(<TransactionsBrowser />);
    await screen.findByText('No transactions found');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: 'Rows per page' })
    ).toBeNull();
  });
});

describe('Review pagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pager above and below the queue, outside the desktop and mobile filter bars', async () => {
    serve('NEEDS_REVIEW');
    renderPage(<ReviewBrowser />);
    const row = await screen.findByText('Coffee');
    expectPagersAroundList(
      row,
      screen.getAllByPlaceholderText('Search by description...')
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
  });

  it('pages from the bottom pager', async () => {
    serve('NEEDS_REVIEW');
    renderPage(<ReviewBrowser />);
    await screen.findByText('Coffee');
    const bottom = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(bottom).getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastPageAsked()).toBe(1));
  });
});
