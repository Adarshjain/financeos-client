import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';
import { type PlainListData, resolveDeep, toStreams } from './streamedTestUtils';

const push = vi.fn();
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/ds/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/accounts/form/ds/AccountFormDialog', () => ({
  AccountFormDialog: ({ account, onClose }: { account?: Account; onClose: () => void }) => (
    <div>
      <p>edit dialog {account?.name}</p>
      <button onClick={onClose}>close dialog</button>
    </div>
  ),
}));

const loadMock = vi.fn<() => PlainListData>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => toStreams(loadMock()),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, ingestFromDate: '2026-01-01' },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', last4: '9911', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -20000 },
  { id: 'c2', type: AccountType.CREDIT_CARD, name: 'Old Card', last4: '1111', creditLimit: 50000, balance: 0, closedOn: '2025-01-05' },
  { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 },
  { id: 'w1', type: AccountType.GENERIC, name: 'Wallet', financialPosition: 'asset', balance: 200 },
];

function data(over: Partial<PlainListData> = {}): PlainListData {
  return {
    accounts,
    bills: [],
    rewards: [{ accountId: 'c1', points: 1200, grossValueInr: 0 }],
    netWorth: 1198842,
    dayChangePct: 0.59,
    ...over,
  };
}

async function renderPage() {
  const ui = await DsAccountsPage();
  return render((await resolveDeep(ui)) as React.ReactElement);
}

describe('/ds/accounts', () => {
  beforeEach(() => {
    loadMock.mockReset();
    push.mockReset();
  });

  it('renders the KPI row and every section from the data', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();

    expect(screen.getByText('Cash & wallets')).toBeDefined();
    expect(screen.getByText('Net worth')).toBeDefined();
    expect(screen.getByText('₹11,98,842')).toBeDefined();
    expect(screen.getByText('+0.59%')).toBeDefined();
    expect(screen.getByText('Bank accounts')).toBeDefined();
    expect(screen.getAllByText('HDFC Savings').length).toBeGreaterThan(0);
    expect(screen.getByText('Credit cards')).toBeDefined();
    expect(screen.getAllByText('Axis Magnus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,200 pts').length).toBeGreaterThan(0);
    expect(screen.getByText('Brokers')).toBeDefined();
    expect(screen.getByText('Wallets & cash')).toBeDefined();
  });

  it('keeps closed accounts out of the rows and shows the closed line with a Show button', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();

    expect(screen.queryByText('Old Card')).toBeNull();
    expect(screen.getByText('Closed · 1 · Old Card ••1111, closed 5 Jan 2025')).toBeDefined();
    expect(screen.getByRole('button', { name: /Show/ })).toBeDefined();
  });

  it('Show reveals the closed rows below the closed line without navigating, and Hide puts them away', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Show/ }));

    const line = screen.getByText('Closed · 1 · Old Card ••1111, closed 5 Jan 2025');
    const closedRow = screen.getAllByText('Old Card')[0];
    const openRow = screen.getAllByText('Axis Magnus')[0];
    expect(line.compareDocumentPosition(closedRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(openRow.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('Old Card')).toBeNull();
  });

  it('opens a closed account from its row', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    fireEvent.click(screen.getAllByText('Old Card')[0]);
    expect(push).toHaveBeenCalledWith('/ds/accounts/c2');
  });

  it('degrades only the net worth tile when the dashboard summary fails', async () => {
    loadMock.mockReturnValue(data({ netWorth: null, dayChangePct: null }));
    await renderPage();

    expect(screen.getByText('Could not load net worth')).toBeDefined();
    expect(screen.getByText('Bank accounts')).toBeDefined();
    expect(screen.queryByText('+0.59%')).toBeNull();
  });

  it('renders only the ErrorState when accounts fail', async () => {
    loadMock.mockReturnValue(data({ accounts: null, errorReference: 'req-123' }));
    await renderPage();

    expect(screen.getByText('Could not load accounts')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy reference req-123' })).toBeDefined();
    expect(screen.queryByText('Bank accounts')).toBeNull();
    expect(screen.queryByText('Cash & wallets')).toBeNull();
  });

  it('renders only the EmptyState when there are no accounts', async () => {
    loadMock.mockReturnValue(data({ accounts: [] }));
    await renderPage();

    expect(screen.getByText('No accounts connected yet')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeDefined();
    expect(screen.queryByText('Bank accounts')).toBeNull();
  });

  it('has no Statements or Upload actions on rows, and no Rewards link in the cards header', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();

    expect(screen.queryByRole('link', { name: 'Statements' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Rewards' })).toBeNull();
  });

  it('Edit on a bank row opens the Edit dialog and does not open the account', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();

    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('edit dialog HDFC Savings')).toBeDefined();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByText(/edit dialog/)).toBeNull();
  });

  it.each(['Add bank account', 'Add credit card', 'Add broker', 'Add wallet'])('%s button carries a plus icon', async (name) => {
    loadMock.mockReturnValue(data());
    await renderPage();
    const link = screen.getByRole('button', { name });
    expect(link.querySelector('svg, [data-icon], i, span[aria-hidden]')).not.toBeNull();
  });
});
