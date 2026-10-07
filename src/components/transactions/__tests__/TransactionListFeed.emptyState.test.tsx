import '@/test/next-mocks'; // must be first: AccountFormWrapper calls useRouter() for router.refresh() after save

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionListFeed } from '@/components/transactions/browser/TransactionListFeed';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const bank: Account = { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT };
const broker = { id: 'brk1', name: 'Zerodha', type: AccountType.BROKER } as unknown as Account;
const closedBank: Account = {
  id: 'acc-old',
  name: 'Old Bank',
  type: AccountType.BANK_ACCOUNT,
  closedOn: '2020-01-01',
};

const NEEDS_ACCOUNT = 'Add an account to get started';
const FIRST_TXN = 'Add your first transaction to start tracking!';
const ADJUST_FILTERS = 'Try adjusting your filters or search query to find what you are looking for.';

function renderFeed(accounts: Account[], hasFiltersOrSearch = false) {
  return renderWithQuery(
    <TransactionListFeed
      loading={false}
      pagedData={null}
      hasFiltersOrSearch={hasFiltersOrSearch}
      accounts={accounts}
      isSelectionMode={false}
      selectedTxnIds={new Set()}
      onReload={() => {}}
      onToggleSelect={() => {}}
    />,
  );
}

describe('TransactionListFeed empty state', () => {
  it('points a user with no accounts at adding one, and that opens an account form without the broker type', () => {
    renderFeed([]);

    expect(screen.getByText(NEEDS_ACCOUNT)).toBeInTheDocument();
    expect(screen.queryByText(FIRST_TXN)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect(screen.getByRole('heading', { name: /Create Account/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wallet/Cash' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Broker' })).not.toBeInTheDocument();
  });

  it('still asks for an account when a filter is active but no account exists at all', () => {
    renderFeed([], true);

    expect(screen.getByText(NEEDS_ACCOUNT)).toBeInTheDocument();
    expect(screen.queryByText(ADJUST_FILTERS)).not.toBeInTheDocument();
  });

  it('asks for an account when the only accounts are brokers or closed', () => {
    renderFeed([broker, closedBank]);

    expect(screen.getByText(NEEDS_ACCOUNT)).toBeInTheDocument();
  });

  it('prefers the filter hint over the account hint when closed accounts may hold hidden history', () => {
    renderFeed([closedBank], true);

    expect(screen.getByText(ADJUST_FILTERS)).toBeInTheDocument();
    expect(screen.queryByText(NEEDS_ACCOUNT)).not.toBeInTheDocument();
  });

  it('invites the first transaction once an open account exists', () => {
    renderFeed([bank]);

    expect(screen.getByText(FIRST_TXN)).toBeInTheDocument();
    expect(screen.queryByText(NEEDS_ACCOUNT)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add account' })).not.toBeInTheDocument();
  });

  it('shows the filter hint when an open account exists and a filter is active', () => {
    renderFeed([bank], true);

    expect(screen.getByText(ADJUST_FILTERS)).toBeInTheDocument();
  });
});
