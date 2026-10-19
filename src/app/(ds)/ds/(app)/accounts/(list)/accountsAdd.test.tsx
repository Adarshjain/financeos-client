import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountsListData } from '@/features/accounts/list/accountsListData';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ds/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

const loadMock = vi.fn<() => Promise<AccountsListData>>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => loadMock(),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, ingestFromDate: '2026-01-01' },
];

const base: AccountsListData = { accounts, bills: [], rewards: [], netWorth: 1000, dayChangePct: 0 };

async function renderPage() {
  return render(await DsAccountsPage({ searchParams: Promise.resolve({}) }));
}

describe('/ds/accounts add links', () => {
  beforeEach(() => {
    loadMock.mockReset();
    push.mockReset();
  });

  it('points the app bar + at the Add dialog with nothing picked', async () => {
    loadMock.mockResolvedValue(base);
    await renderPage();
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute('href', '/ds/accounts?add=1');
  });

  it('points each section link at its own type', async () => {
    loadMock.mockResolvedValue(base);
    await renderPage();
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Add bank account')).toBe('/ds/accounts?add=bank_account');
    expect(href('Add credit card')).toBe('/ds/accounts?add=credit_card');
    expect(href('Add broker')).toBe('/ds/accounts?add=broker');
    expect(href('Add wallet')).toBe('/ds/accounts?add=generic');
  });

  it('sends the empty state action to the Add dialog', async () => {
    loadMock.mockResolvedValue({ ...base, accounts: [] });
    await renderPage();
    screen.getByRole('button', { name: 'Add account' }).click();
    expect(push).toHaveBeenCalledWith('/ds/accounts?add=1');
  });
});
