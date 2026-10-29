import { render, screen, within } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountsListData } from '@/features/accounts/list/accountsListData';
import type { Account } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';
import {
  type PlainListData,
  renderShellHtml,
  resolveDeep,
  toStreams,
} from './streamedTestUtils';

vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

const loadMock = vi.fn<() => AccountsListData>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => loadMock(),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, ingestFromDate: '2026-01-01' },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', last4: '9911', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -20000 },
  { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 },
];

const plain: PlainListData = {
  accounts,
  bills: [],
  rewards: [{ accountId: 'c1', points: 1200, grossValueInr: 0 }],
  netWorth: 1198842,
  dayChangePct: 0.59,
};

const never = <T,>() => new Promise<T>(() => {});

async function resolved() {
  const ui = await DsAccountsPage();
  return render((await resolveDeep(ui)) as React.ReactElement);
}

describe('/accounts streaming', () => {
  beforeEach(() => {
    loadMock.mockReset();
    document.body.innerHTML = '';
  });

  it('renders the sections and account rows while bills, rewards, net worth and investments are pending', async () => {
    loadMock.mockReturnValue({
      accounts: toStreams(plain).accounts,
      bills: never(),
      rewards: never(),
      netWorth: never(),
      dayChangePct: never(),
    });
    const ui = await DsAccountsPage();
    const html = await renderShellHtml(ui as React.ReactElement);
    document.body.innerHTML = html;

    expect(screen.getByText('Bank accounts')).toBeDefined();
    expect(screen.getByText('Credit cards')).toBeDefined();
    expect(screen.getAllByText('Axis Magnus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HDFC Savings').length).toBeGreaterThan(0);
    expect(screen.getByText('Cash & wallets')).toBeDefined();
    // The pending pieces show no data yet.
    expect(screen.getAllByText('Investments').length).toBeGreaterThan(0);
    expect(screen.getByText('₹5,000')).toBeDefined();
    expect(screen.queryByText('Net worth')).toBeNull();
    expect(screen.queryByText("Couldn't load net worth. Try again.")).toBeNull();
    expect(screen.queryByText('+0.59%')).toBeNull();
    expect(screen.queryByText('1,200 pts')).toBeNull();
  });

  it('fills in net worth, the investments delta and the rewards cell once they resolve', async () => {
    loadMock.mockReturnValue(toStreams(plain));
    await resolved();

    expect(screen.getByText('₹11,98,842')).toBeDefined();
    expect(screen.getByText('+0.59%')).toBeDefined();
    expect(screen.getAllByText('1,200 pts').length).toBeGreaterThan(0);
  });

  it('shows the exact next-bill badge from the bills', async () => {
    const bill = {
      accountId: 'c1',
      accountName: 'Axis Magnus',
      status: 'AWAITING_STATEMENT',
      nextStatementExpectedOn: '2999-01-01',
    } as unknown as CardBillResponse;
    loadMock.mockReturnValue(toStreams({ ...plain, bills: [bill] }));
    await resolved();

    expect(screen.getAllByText('1 Jan 2999').length).toBeGreaterThan(0);
    expect(screen.queryByText('Statement missing')).toBeNull();
  });

  it('shows Statement missing with no Upload link on the row', async () => {
    const bill = {
      accountId: 'c1',
      accountName: 'Axis Magnus',
      status: 'AWAITING_STATEMENT',
      nextStatementExpectedOn: '2020-01-01',
    } as unknown as CardBillResponse;
    loadMock.mockReturnValue(toStreams({ ...plain, bills: [bill] }));
    await resolved();

    expect(screen.getAllByText('Statement missing').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Upload' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Upload statement' })).toBeNull();
  });

  it('degrades only net worth and the investments delta when their requests fail', async () => {
    loadMock.mockReturnValue(toStreams({ ...plain, netWorth: null, dayChangePct: null }));
    await resolved();

    expect(screen.getByText("Couldn't load net worth. Try again.")).toBeDefined();
    expect(screen.queryByText('+0.59%')).toBeNull();
    expect(screen.getByText('Bank accounts')).toBeDefined();
    expect(screen.getAllByText('1,200 pts').length).toBeGreaterThan(0);
  });

  it('degrades the rewards cell to a dash and the bill cell to nothing when those requests fail', async () => {
    loadMock.mockReturnValue(toStreams({ ...plain, rewards: null, bills: null }));
    await resolved();

    expect(screen.queryByText('1,200 pts')).toBeNull();
    const row = screen.getAllByText('Axis Magnus')[0].closest('[role="row"], [role="button"]') as HTMLElement;
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('Credit cards')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Upload' })).toBeNull();
  });
});
