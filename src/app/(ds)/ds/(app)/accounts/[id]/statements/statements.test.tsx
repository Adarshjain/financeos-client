import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatementDetailData } from '@/features/accounts/detail/statements/detailModel';
import { buildStatementsView } from '@/features/accounts/detail/statements/listModel';
import type { StatementsData } from '@/features/accounts/detail/statements/statementsData';
import type { Account, BankAccount, CreditCard } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import type { StatementSummary } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';
import { resolveAsyncElements } from '@/test/resolveAsyncElements';

import DsAccountStatementsLoading from './loading';
import DsAccountStatementsPage from './page';

class NotFoundSignal extends Error {}
const notFound = vi.fn(() => {
  throw new NotFoundSignal('NEXT_NOT_FOUND');
});
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  usePathname: () => '/ds/accounts/c1/statements',
  useRouter: () => ({ push, refresh }),
}));

const showToast = vi.fn();
vi.mock('@/components/ds', async (orig) => ({
  ...(await orig<typeof import('@/components/ds')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const loadAccount = vi.fn<(id: string) => Promise<Account | null>>();
vi.mock('@/features/accounts/detail/accountData', () => ({
  loadAccount: (id: string) => loadAccount(id),
}));

const loadData = vi.fn<(...args: unknown[]) => Promise<StatementsData>>();
vi.mock('@/features/accounts/detail/statements/statementsData', () => ({
  loadStatementsData: (...args: unknown[]) => loadData(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), DELETE: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  api,
  ApiError: class ApiError extends Error {},
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

const bank: BankAccount = {
  id: 'b1',
  type: AccountType.BANK_ACCOUNT,
  name: 'HDFC Savings',
  openingBalance: '0',
  balance: 125000,
  ingestFromDate: '2026-01-01',
};

function stmt(id: string, periodEnd: string, over: Partial<StatementSummary> = {}): StatementSummary {
  return {
    id,
    source: 'file_upload',
    sourceRef: 'a.pdf',
    statementType: 'credit_card',
    periodStart: '2026-09-06',
    periodEnd,
    openingBalance: 46800,
    closingBalance: 44319,
    totalDebits: null,
    totalCredits: null,
    transactionCount: 8,
    linesSkipped: 0,
    parseMode: null,
    chainValidationPct: null,
    checksumOk: true,
    verdict: 'AUTO_INGEST',
    bankName: null,
    accountNumberMasked: null,
    createdAt: '2026-10-13T08:00:00Z',
    ...over,
  };
}

function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    accountId: 'c1',
    accountName: 'HDFC Regalia',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    statementId: 's3',
    paymentDueDate: '2026-10-25',
    daysUntilDue: 12,
    totalAmountDue: 44319,
    paidAmount: 0,
    ...over,
  };
}

const detail: StatementDetailData = {
  id: 's3',
  createdAt: '2026-10-13T08:00:00Z',
  source: 'file_upload',
  sourceRef: 'Regalia-Gold-statement.pdf',
  periodStart: '2026-09-06',
  periodEnd: '2026-10-05',
  openingBalance: 46800,
  closingBalance: 44319,
  transactionCount: 2,
  linesSkipped: 2,
  checksumOk: true,
  matchesLedger: true,
  ledgerBalanceAtClose: 44319,
  cardDetails: { totalAmountDue: 44319, minimumAmountDue: 2500, paymentDueDate: '2026-10-25' },
  lines: [
    {
      transactionId: 't1',
      date: '2026-09-09',
      description: 'CROMA ELECTRONICS BANGALORE',
      amount: 24990,
      type: 'DEBIT',
      origin: 'matched',
    },
    {
      transactionId: 't2',
      date: '2026-10-05',
      description: 'FUEL SURCHARGE WAIVER',
      amount: 45,
      type: 'CREDIT',
      origin: 'created',
    },
  ],
};

function data(over: Partial<StatementsData> = {}): StatementsData {
  const statements = [
    stmt('s1', '2026-08-05', { source: 'gmail', transactionCount: 11 }),
    stmt('s2', '2026-09-05', { source: 'gmail', transactionCount: 14, verdict: 'NEEDS_REVIEW' }),
    stmt('s3', '2026-10-05'),
  ];
  return {
    statements,
    view: buildStatementsView(statements, undefined, undefined, '2026-10-13'),
    detail,
    detailFailed: false,
    bills: {
      s3: bill(),
      s2: bill({ statementId: 's2', status: 'PAID', totalAmountDue: 46800, paidMarkedOn: '2026-09-18' }),
      s1: bill({
        statementId: 's1',
        status: 'PAID',
        paidSource: 'MANUAL',
        totalAmountDue: 46800,
        paidMarkedOn: '2026-08-18',
      }),
    },
    markPaid: { statementId: 's3', remaining: 44319 },
    ...over,
  };
}

// Radix sets pointer-events on the body while a dialog is open; the checks only get in the way.
const user = userEvent.setup({ pointerEventsCheck: 0 });

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function renderPage(
  searchParams: { fy?: string; statement?: string } = {},
  id = 'c1'
) {
  const ui = await DsAccountStatementsPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(searchParams),
  });
  return wrap(await resolveAsyncElements(ui));
}

describe('/ds/accounts/[id]/statements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAccount.mockResolvedValue(card);
    loadData.mockResolvedValue(data());
    api.GET.mockResolvedValue({ data: undefined });
  });

  it('renders the list and the selected statement of a card', async () => {
    await renderPage();

    expect(screen.getByText('Each statement is a bill')).toBeInTheDocument();
    expect(screen.getByText('Upload · 8 lines · opening ₹46,800 · due ₹44,319')).toBeInTheDocument();
    expect(screen.getByText('Email · 14 lines · ₹46,800 · paid 18 Sep')).toBeInTheDocument();
    expect(screen.getAllByText('Auto ingested')).toHaveLength(2);
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Due 25 Oct')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);

    expect(screen.getByText('Statement · 5 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText(/Period 6 Sep → 5 Oct · Regalia-Gold-statement.pdf · uploaded 13 Oct/)).toBeInTheDocument();
    expect(screen.getByText('Checksum OK')).toBeInTheDocument();
    expect(screen.getByText('Total due')).toBeInTheDocument();
    expect(screen.getByText('₹2,500')).toBeInTheDocument();
    expect(screen.getByText('2 lines were skipped.')).toBeInTheDocument();
    expect(screen.getAllByText('CROMA ELECTRONICS BANGALORE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Linked').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+45.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Closing balance ₹44,319 · matches ledger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Set due date' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Delete statement' }).length).toBeGreaterThan(0);
  });

  it('passes the url params to the loader', async () => {
    await renderPage({ fy: '26-27', statement: 's2' });
    expect(loadData).toHaveBeenCalledWith(card, { fy: '26-27', statement: 's2' }, '2026-10-13');
  });

  it('renders the bank variant without bills, Mark paid or Set due date', async () => {
    loadAccount.mockResolvedValue(bank);
    loadData.mockResolvedValue(
      data({
        bills: {},
        markPaid: null,
        detail: { ...detail, cardDetails: undefined, transactionCount: 14, matchesLedger: false, ledgerBalanceAtClose: 43000 },
      })
    );
    await renderPage({}, 'b1');

    expect(screen.queryByText('Each statement is a bill')).toBeNull();
    expect(screen.getByText('Upload · 8 lines · closing ₹44,319', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Opening')).toBeInTheDocument();
    expect(screen.getByText('Lines')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Set due date' })).toBeNull();
    expect(screen.getByText('Closing balance ₹44,319 · ledger ₹43,000')).toBeInTheDocument();
  });

  it('is not found for other account types or a missing account', async () => {
    loadAccount.mockResolvedValue({ id: 'k1', type: AccountType.BROKER, name: 'Zerodha' });
    await expect(renderPage({}, 'k1')).rejects.toBeInstanceOf(NotFoundSignal);
    loadAccount.mockResolvedValue(null);
    await expect(renderPage({}, 'gone')).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it('shows an error banner when the statements request failed', async () => {
    loadData.mockResolvedValue({ ...data(), statements: null, view: null });
    await renderPage();
    expect(screen.getByText('Could not load the statements. Reload the page to try again.')).toBeInTheDocument();
  });

  it('shows the empty state with an upload action when there are no statements', async () => {
    loadData.mockResolvedValue({ ...data(), statements: [], view: buildStatementsView([], undefined, undefined, '2026-10-13') });
    await renderPage();
    expect(screen.getByText('No statement history found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upload statement' }));
    expect(push).toHaveBeenCalledWith('/transactions/import?account=c1');
  });

  it('shows a compact empty state for a year without statements', async () => {
    const statements = [stmt('s3', '2026-10-05')];
    loadData.mockResolvedValue({
      ...data(),
      statements,
      view: buildStatementsView(statements, '24-25', undefined, '2026-10-13'),
      detail: null,
      bills: {},
    });
    await renderPage({ fy: '24-25' });
    expect(screen.getByText('No statements in FY 24-25')).toBeInTheDocument();
    expect(screen.queryByText(/^Statement · /)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Upload statement' }));
    expect(push).toHaveBeenCalledWith('/transactions/import?account=c1');
  });

  it('says the detail failed to load when only its request failed', async () => {
    loadData.mockResolvedValue({ ...data(), detail: null, detailFailed: true });
    await renderPage();
    expect(screen.getByText('Failed to load statement details')).toBeInTheDocument();
    expect(screen.getByText('Each statement is a bill')).toBeInTheDocument();
  });

  it('opens another statement through the url, keeping the year', async () => {
    await renderPage();
    await user.click(screen.getByText('5 Sep 2026'));
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/statements?statement=s2&fy=26-27');
  });

  it('switches the year through the url', async () => {
    const statements = [stmt('s3', '2026-10-05'), stmt('old', '2026-02-05')];
    loadData.mockResolvedValue({
      ...data(),
      statements,
      view: buildStatementsView(statements, undefined, undefined, '2026-10-13'),
    });
    await renderPage();
    await user.click(screen.getByRole('button', { name: /FY 26-27/ }));
    await user.click(await screen.findByRole('option', { name: 'FY 25-26' }));
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/statements?fy=25-26');
  });

  it('undoes a bill marked by hand', async () => {
    api.DELETE.mockResolvedValue({ data: bill({ status: 'OPEN' }) });
    await renderPage();
    const row = screen.getByText(/marked by you/).closest('div') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
        params: { path: { statementId: 's1' } },
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Payment mark removed');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows no Undo for a bill paid some other way', async () => {
    await renderPage();
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
  });

  it('sets the due date through the bill details', async () => {
    api.PATCH.mockResolvedValue({ data: bill({ paymentDueDate: '2026-10-30' }) });
    await renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Set due date' })[0]);
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText('Due date');
    expect(field).toHaveValue('25/10/2026');

    await user.clear(field);
    await user.type(field, '30/10/2026');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith('/api/v1/bills/{statementId}/details', {
        params: { path: { statementId: 's3' } },
        body: { paymentDueDate: '2026-10-30' },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Statement details saved');
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('asks for a due date when the statement has none, and does not save', async () => {
    loadData.mockResolvedValue(
      data({
        detail: { ...detail, cardDetails: { totalAmountDue: 44319, minimumAmountDue: 2500 } },
        bills: { s3: bill({ paymentDueDate: null }) },
      }),
    );
    await renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Set due date' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Due date')).toHaveValue('');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter the due date')).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it('does not save an unchanged due date', async () => {
    await renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Set due date' })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Change at least one of the fields')).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it('shows the deletion preview before deleting, then deletes and drops the selection', async () => {
    api.GET.mockImplementation(async (path: string) =>
      path.endsWith('/deletion-preview')
        ? { data: { transactionsToDelete: 6, linkedToRecords: 1, transactionsKept: 2, alertsToReopen: 2 } }
        : { data: undefined },
    );
    api.DELETE.mockResolvedValue({
      data: { transactionsDeleted: 6, transactionsKept: 2, alertsReopened: 2, duplicateFlagsCleared: 0 },
    });
    await renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Delete statement' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Removes the 5 Oct 2026 statement and what it added to this account.')).toBeInTheDocument();
    expect(await within(dialog).findByText('6 transactions it created will be deleted.')).toBeInTheDocument();
    expect(within(dialog).getByText('2 email alerts go back to review as unreconciled.')).toBeInTheDocument();
    expect(within(dialog).getByText('You can upload the same file again afterwards.')).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Delete statement' }));
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statements/{statementId}', {
        params: { path: { accountId: 'c1', statementId: 's3' } },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Statement deleted, 6 transactions removed');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/ds/accounts/c1/statements?fy=26-27'));
    expect(refresh).toHaveBeenCalled();
  });

  it('cannot delete until the preview has loaded', async () => {
    api.GET.mockImplementation(() => new Promise(() => {}));
    await renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Delete statement' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Checking what this statement added…')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete statement' })).toBeDisabled();
  });

  it('has a loading skeleton', () => {
    const { container } = render(<DsAccountStatementsLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});
