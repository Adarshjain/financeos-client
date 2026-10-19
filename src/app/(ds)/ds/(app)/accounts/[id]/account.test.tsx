import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CardOverviewData } from '@/features/accounts/detail/overview/cardOverviewData';
import type { Account, CreditCard } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';
import { resolveAsyncElements } from '@/test/resolveAsyncElements';

import DsAccountLayout from './layout';
import DsAccountOverviewPage from './page';

class NotFoundSignal extends Error {}
const notFound = vi.fn(() => {
  throw new NotFoundSignal('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  usePathname: () => '/ds/accounts/c1',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const loadAccount = vi.fn<(id: string) => Promise<Account | null>>();
vi.mock('@/features/accounts/detail/accountData', () => ({
  loadAccount: (id: string) => loadAccount(id),
}));

const loadCard = vi.fn<() => Promise<CardOverviewData>>();
vi.mock('@/features/accounts/detail/overview/cardOverviewData', () => ({
  RECENT_TRANSACTIONS: 8,
  loadCardOverviewData: () => loadCard(),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    GET: vi.fn().mockResolvedValue({ data: { statements: 3, cards: 2, transactions: 142 } }),
  },
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
  creditLimit: 300000,
  effectiveCreditLimit: 300000,
  balance: -44319,
  balanceAnchored: true,
  ingestFromDate: '2026-01-01',
  lastStatementDate: '2026-10-05',
};

const bill: CardBillResponse = {
  accountId: 'c1',
  accountName: 'HDFC Regalia',
  muted: false,
  paidSource: 'NONE',
  status: 'OPEN',
  statementId: 's1',
  periodEnd: '2026-10-05',
  paymentDueDate: '2026-10-25',
  daysUntilDue: 12,
  totalAmountDue: 44319,
  remainingAmount: 44319,
  unbilledAmount: 0,
  nextStatementExpectedOn: '2026-11-05',
};

function overview(over: Partial<CardOverviewData> = {}): CardOverviewData {
  return {
    summary: { periodEnd: '2026-10-05', history: [{ periodEnd: '2026-09-05', paymentsReceived: 46800 }] },
    bill,
    billHistory: [
      { statementId: 's1', periodEnd: '2026-10-05', bill },
      {
        statementId: 's0',
        periodEnd: '2026-09-05',
        bill: { ...bill, statementId: 's0', status: 'PAID', totalAmountDue: 46800, paidMarkedOn: '2026-09-18', paymentDueDate: '2026-09-25' },
      },
    ],
    cardholders: [
      {
        id: 'h1',
        accountId: 'c1',
        role: 'PRIMARY',
        personName: 'Arjun Mehta',
        currentLast4: '7741',
        cards: [{ id: 'k1', cardholderId: 'h1', last4: '7741', closedOn: null }],
      },
    ],
    stats: [{ cardholderId: 'h1', currentCycleSpend: 0, spendThisYear: 34448, transactionCount: 19, lastUsedOn: '2026-10-12' }],
    identifiers: ['7741', 'XX7741'],
    rewards: {
      window: { from: '2026-03-15', to: '2027-03-14', calendarYear: false },
      report: {
        summary: { points: 2180, milestonesPts: 0, cashbackInr: 0, pointsValueInr: 1090 },
        rules: [{ ruleId: 'r1', name: 'Base rule', earned: 2180, earnedUnit: 'POINTS', capStatus: null }],
        milestones: [],
        cycleFallback: false,
        anniversaryFallback: false,
      },
    } as unknown as CardOverviewData['rewards'],
    recent: {
      total: 142,
      items: [
        { id: 't1', accountId: 'c1', date: '2026-10-02', amount: -352, description: 'Uber', source: 'manual', createdAt: '', categories: [{ id: 'g', name: 'Transport' }] },
      ] as unknown as CardOverviewData['recent'] extends infer R ? (R extends { items: infer I } ? I : never) : never,
    },
    gmail: { lastMatchDate: '2026-10-12', unmatchedCount: 0 },
    ...over,
  };
}

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function renderOverview(id = 'c1') {
  const ui = await DsAccountOverviewPage({ params: Promise.resolve({ id }) });
  return wrap(await resolveAsyncElements(ui));
}

describe('/ds/accounts/[id] layout', () => {
  beforeEach(() => {
    loadAccount.mockReset();
    notFound.mockClear();
  });

  it('titles the page with the account and renders the tab strip around the page', async () => {
    loadAccount.mockResolvedValue(card);
    const ui = await DsAccountLayout({
      params: Promise.resolve({ id: 'c1' }),
      children: <p>page body</p>,
    });
    wrap(ui);

    expect(screen.getAllByText('HDFC Regalia').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/ds/accounts');
    expect(await screen.findByText('· 3')).toBeInTheDocument();
  });

  it('shows no tab strip for a broker', async () => {
    loadAccount.mockResolvedValue({ id: 'k1', type: AccountType.BROKER, name: 'Zerodha' });
    const ui = await DsAccountLayout({
      params: Promise.resolve({ id: 'k1' }),
      children: <p>page body</p>,
    });
    wrap(ui);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('raises not-found when the account request fails', async () => {
    loadAccount.mockResolvedValue(null);
    await expect(
      DsAccountLayout({ params: Promise.resolve({ id: 'gone' }), children: null }),
    ).rejects.toBeInstanceOf(NotFoundSignal);
    expect(notFound).toHaveBeenCalled();
  });
});

describe('/ds/accounts/[id] credit-card Overview', () => {
  beforeEach(() => {
    loadAccount.mockReset();
    loadCard.mockReset();
    loadAccount.mockResolvedValue(card);
  });

  it('shows the header with Mark paid, and every section, when a bill is due', async () => {
    loadCard.mockResolvedValue(overview());
    await renderOverview();

    expect(screen.getByText('You owe')).toBeInTheDocument();
    expect(screen.getByText('due 25 Oct · unbilled ₹0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    // The header's Edit and the Identifiers card's Edit both open the edit dialog on this page.
    const edits = screen.getAllByRole('link', { name: 'Edit' });
    expect(edits).toHaveLength(2);
    edits.forEach((link) => expect(link).toHaveAttribute('href', '/ds/accounts/c1?edit=1'));
    expect(await screen.findByRole('link', { name: 'Transactions · 142' })).toHaveAttribute(
      'href',
      '/transactions?account=c1',
    );

    expect(screen.getByText('Limit & cycle')).toBeInTheDocument();
    expect(screen.getByText('Anchored to statement')).toBeInTheDocument();
    expect(screen.getByText('14.8% of ₹3L · ₹2.56L free')).toBeInTheDocument();
    expect(screen.getByText('Due 25 Oct · 12 days left')).toBeInTheDocument();
    expect(screen.getByText('12 d')).toBeInTheDocument();
    expect(screen.getByText('5 Sep statement')).toBeInTheDocument();
    expect(screen.getByText('Paid 18 Sep · on time')).toBeInTheDocument();
    expect(screen.getByText('₹46,800')).toBeInTheDocument();
    expect(screen.getByText('Anniversary year 15 Mar → 14 Mar')).toBeInTheDocument();
    expect(screen.getByText('2,180 pts ≈ ₹1,090')).toBeInTheDocument();
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('XX7741')).toBeInTheDocument();
    expect(screen.getByText('Latest 1 of 142')).toBeInTheDocument();
    expect(screen.getAllByText('Uber').length).toBeGreaterThan(0);
    expect(screen.getByText('PDF upload · last 5 Oct')).toBeInTheDocument();
    expect(screen.getByText('2 identifiers · last match 12 Oct')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/ds/accounts/c1/cards?add=cardholder',
    );
    expect(screen.getByRole('link', { name: /All/ })).toHaveAttribute('href', '/ds/accounts/c1/statements');
  });

  it('shows Unbilled so far with No bill due and no Mark paid when nothing is due', async () => {
    loadCard.mockResolvedValue(
      overview({
        bill: { ...bill, status: 'PAID', unbilledAmount: 6224, paidMarkedOn: '2026-09-18', paymentDueDate: '2026-09-25' },
      }),
    );
    await renderOverview();

    expect(screen.getByText('Unbilled so far')).toBeInTheDocument();
    expect(screen.getByText('No bill due')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
    // Once in the Current bill stat and once on the 5 Oct statement row.
    expect(screen.getAllByText('Paid 18 Sep · on time').length).toBeGreaterThan(0);
  });

  it('shows the ledger disagreement banner without an action', async () => {
    loadAccount.mockResolvedValue({ ...card, reconciliationGap: 1200 });
    loadCard.mockResolvedValue(overview());
    await renderOverview();

    expect(
      screen.getByText('Transactions and the latest statement disagree by ₹1,200.'),
    ).toBeInTheDocument();
  });

  it('drops only the pieces whose requests failed', async () => {
    loadCard.mockResolvedValue(
      overview({ rewards: null, cardholders: null, identifiers: null, recent: null, gmail: null, billHistory: null }),
    );
    await renderOverview();

    expect(screen.queryByText('Rewards')).toBeNull();
    expect(screen.queryByText('Cardholders')).toBeNull();
    expect(screen.queryByText('Identifiers')).toBeNull();
    expect(screen.queryByText('Recent transactions')).toBeNull();
    expect(screen.queryByText('Bills')).toBeNull();
    expect(screen.getByText('Limit & cycle')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
  });

  it('keeps the Bills card with a caption when there are no statements', async () => {
    loadCard.mockResolvedValue(overview({ billHistory: [] }));
    await renderOverview();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('No bills yet')).toBeInTheDocument();
  });

  it('hides the Rewards card without rules, and says No identifiers yet', async () => {
    const data = overview({ identifiers: [] });
    data.rewards = { ...data.rewards!, report: { ...data.rewards!.report, rules: [] } };
    loadCard.mockResolvedValue(data);
    await renderOverview();

    expect(screen.queryByText('Rewards')).toBeNull();
    expect(screen.getByText('No identifiers yet')).toBeInTheDocument();
  });

  it('hides Mark paid, Import and Rewards for a closed card, but keeps Bills', async () => {
    loadAccount.mockResolvedValue({ ...card, closedOn: '2026-06-30' });
    loadCard.mockResolvedValue(overview({ rewards: null }));
    await renderOverview();

    expect(screen.getByText('Closed 30 Jun 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    expect(screen.getByText('Bills')).toBeInTheDocument();
  });

  it('raises not-found when the account is missing', async () => {
    loadAccount.mockResolvedValue(null);
    await expect(
      DsAccountOverviewPage({ params: Promise.resolve({ id: 'gone' }) }),
    ).rejects.toBeInstanceOf(NotFoundSignal);
  });
});

describe('/ds/accounts/[id] Overview for other types', () => {
  it('shows only the header block for a bank account, with Import in the menu', async () => {
    loadAccount.mockResolvedValue({
      id: 'b1',
      type: AccountType.BANK_ACCOUNT,
      name: 'HDFC Savings',
      balance: 120000,
      balanceAnchored: true,
      anchorDate: '2026-10-05',
    });
    await renderOverview('b1');

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('₹1,20,000')).toBeInTheDocument();
    expect(screen.getByText('as of statement 5 Oct')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
    expect(screen.queryByText('Limit & cycle')).toBeNull();
    expect(within(document.body).queryByRole('button', { name: 'Mark paid' })).toBeNull();
  });
});
