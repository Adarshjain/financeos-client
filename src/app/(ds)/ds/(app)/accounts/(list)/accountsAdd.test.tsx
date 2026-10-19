import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsListLayout from './layout';
import DsAccountsPage from './page';
import { type PlainListData, resolveDeep, toStreams } from './streamedTestUtils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ds/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/accounts/form/ds/AccountFormDialog', () => ({
  AccountFormDialog: (props: { initialType?: string | null; onClose: () => void }) => (
    <div role="dialog">
      <p>add {props.initialType}</p>
      <button onClick={props.onClose}>close add</button>
    </div>
  ),
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
  const ui = await DsAccountsPage();
  return render(
    <DsAccountsListLayout>{(await resolveDeep(ui)) as React.ReactElement}</DsAccountsListLayout>
  );
}

describe('/ds/accounts add links', () => {
  beforeEach(() => {
    loadMock.mockReset();
    push.mockReset();
    window.history.replaceState(null, '', '/ds/accounts');
  });

  const urlStaysPut = () => {
    expect(window.location.pathname + window.location.search).toBe('/ds/accounts');
    expect(push).not.toHaveBeenCalled();
  };

  it('opens Add with Bank picked from the app bar + and closes it, URL unchanged', async () => {
    loadMock.mockReturnValue(base);
    await renderPage();
    const pushState = vi.spyOn(window.history, 'pushState');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    screen.getByRole('button', { name: 'Add' }).click();
    expect(await screen.findByText('add bank_account')).toBeInTheDocument();
    screen.getByRole('button', { name: 'close add' }).click();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    urlStaysPut();
    pushState.mockRestore();
    replaceState.mockRestore();
  });

  it('opens each section button at its own type without touching the URL', async () => {
    loadMock.mockReturnValue(base);
    await renderPage();
    const cases: [string, string][] = [
      ['Add bank account', 'bank_account'],
      ['Add credit card', 'credit_card'],
      ['Add broker', 'broker'],
      ['Add wallet', 'generic'],
    ];
    for (const [name, type] of cases) {
      screen.getByRole('button', { name }).click();
      expect(await screen.findByText(`add ${type}`)).toBeInTheDocument();
      screen.getByRole('button', { name: 'close add' }).click();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    urlStaysPut();
  });

  it('opens Add from the empty state action, URL unchanged', async () => {
    loadMock.mockReturnValue({ ...base, accounts: [] });
    await renderPage();
    screen.getByRole('button', { name: 'Add account' }).click();
    expect(await screen.findByText('add bank_account')).toBeInTheDocument();
    urlStaysPut();
  });
});
