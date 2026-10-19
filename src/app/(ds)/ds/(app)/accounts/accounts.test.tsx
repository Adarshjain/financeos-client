import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountsListData } from '@/features/accounts/list/accountsListData';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/ds/accounts',
}));

const loadMock = vi.fn<() => Promise<AccountsListData>>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => loadMock(),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, ingestFromDate: '2026-01-01' },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', last4: '9911', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -20000 },
  { id: 'c2', type: AccountType.CREDIT_CARD, name: 'Old Card', last4: '1111', creditLimit: 50000, balance: 0, closedOn: '2025-01-05' },
  { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 },
  { id: 'w1', type: AccountType.GENERIC, name: 'Wallet', financialPosition: 'asset', balance: 200 },
];

function data(over: Partial<AccountsListData> = {}): AccountsListData {
  return {
    accounts,
    bills: [],
    rewards: [{ accountId: 'c1', points: 1200, grossValueInr: 0 }],
    netWorth: 1198842,
    dayChangePct: 0.59,
    ...over,
  };
}

async function renderPage(closed?: string) {
  const ui = await DsAccountsPage({ searchParams: Promise.resolve({ closed }) });
  return render(ui);
}

describe('/ds/accounts', () => {
  beforeEach(() => {
    loadMock.mockReset();
  });

  it('renders the KPI row and every section from the data', async () => {
    loadMock.mockResolvedValue(data());
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
    expect(screen.getByText('Brokers · ₹5,000')).toBeDefined();
    expect(screen.getByText('Wallets & cash')).toBeDefined();
  });

  it('keeps closed accounts out of the rows and shows the closed line with a Show link', async () => {
    loadMock.mockResolvedValue(data());
    await renderPage();

    expect(screen.queryByText('Old Card')).toBeNull();
    expect(screen.getByText('Closed · 1 · Old Card ••1111, closed 5 Jan 2025')).toBeDefined();
    const show = screen.getByRole('link', { name: /Show/ });
    expect(show.getAttribute('href')).toBe('/ds/accounts?closed=cards');
  });

  it('shows the closed rows after the open ones for ?closed=cards, with a Hide link', async () => {
    loadMock.mockResolvedValue(data());
    await renderPage('cards');

    expect(screen.getAllByText('Old Card').length).toBeGreaterThan(0);
    const hide = screen.getByRole('link', { name: /Hide/ });
    expect(hide.getAttribute('href')).toBe('/ds/accounts');
  });

  it('degrades only the net worth tile when the dashboard summary fails', async () => {
    loadMock.mockResolvedValue(data({ netWorth: null, dayChangePct: null }));
    await renderPage();

    expect(screen.getByText('Could not load net worth')).toBeDefined();
    expect(screen.getByText('Bank accounts')).toBeDefined();
    expect(screen.queryByText('+0.59%')).toBeNull();
  });

  it('renders only the ErrorState when accounts fail', async () => {
    loadMock.mockResolvedValue(data({ accounts: null, errorReference: 'req-123' }));
    await renderPage();

    expect(screen.getByText('Could not load accounts')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy reference req-123' })).toBeDefined();
    expect(screen.queryByText('Bank accounts')).toBeNull();
    expect(screen.queryByText('Cash & wallets')).toBeNull();
  });

  it('renders only the EmptyState when there are no accounts', async () => {
    loadMock.mockResolvedValue(data({ accounts: [] }));
    await renderPage();

    expect(screen.getByText('No accounts connected yet')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeDefined();
    expect(screen.queryByText('Bank accounts')).toBeNull();
  });
});
