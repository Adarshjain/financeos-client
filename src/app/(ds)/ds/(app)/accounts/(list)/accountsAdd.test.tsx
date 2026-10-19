import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';
import { type PlainListData, resolveDeep, toStreams } from './streamedTestUtils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ds/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

const loadMock = vi.fn<() => PlainListData>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => toStreams(loadMock()),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, ingestFromDate: '2026-01-01' },
];

const base: PlainListData = { accounts, bills: [], rewards: [], netWorth: 1000, dayChangePct: 0 };

async function renderPage() {
  const ui = await DsAccountsPage({ searchParams: Promise.resolve({}) });
  return render((await resolveDeep(ui)) as React.ReactElement);
}

describe('/ds/accounts add links', () => {
  beforeEach(() => {
    loadMock.mockReset();
    push.mockReset();
  });

  it('points the app bar + at the Add dialog with nothing picked', async () => {
    loadMock.mockReturnValue(base);
    await renderPage();
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute('href', '/ds/accounts?add=1');
  });

  it('points each section link at its own type', async () => {
    loadMock.mockReturnValue(base);
    await renderPage();
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Add bank account')).toBe('/ds/accounts?add=bank_account');
    expect(href('Add credit card')).toBe('/ds/accounts?add=credit_card');
    expect(href('Add broker')).toBe('/ds/accounts?add=broker');
    expect(href('Add wallet')).toBe('/ds/accounts?add=generic');
  });

  it('sends the empty state action to the Add dialog', async () => {
    loadMock.mockReturnValue({ ...base, accounts: [] });
    await renderPage();
    screen.getByRole('button', { name: 'Add account' }).click();
    expect(push).toHaveBeenCalledWith('/ds/accounts?add=1');
  });
});
