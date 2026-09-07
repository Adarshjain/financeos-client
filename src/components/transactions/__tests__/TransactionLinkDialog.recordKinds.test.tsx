import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

import { TransactionLinkDialog } from '@/components/transactions/TransactionLinkDialog';
import type { Account } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import type { CounterpartyResponse, LendingResponse } from '@/lib/lending.types';
import type { InstallmentDto, LoanResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

type Mock = ReturnType<typeof vi.fn>;

const mockAccounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

const debitTxn: Transaction = {
  id: 't-debit',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Dinner with Rahul Sharma',
  sourcedDescription: 'DINNER WITH RAHUL SHARMA',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  createdAt: '2026-07-25T00:00:00Z',
};

const creditTxn: Transaction = {
  ...debitTxn,
  id: 't-credit',
  amount: 500,
  description: 'Refund from Rahul Sharma',
  sourcedDescription: 'REFUND FROM RAHUL SHARMA',
};

const rahulCp: CounterpartyResponse = {
  id: 'cp-rahul',
  name: 'Rahul Sharma',
  netPosition: 0,
  totalBorrowed: 0,
  totalLent: 0,
  entryCount: 0,
};

function pagedOf<T>(content: T[]) {
  return {
    content,
    number: 0,
    size: 200,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function mockGet(handlers: Record<string, unknown>) {
  (api.GET as Mock).mockImplementation((path: string) => {
    const value = handlers[path];
    return Promise.resolve({ data: value ?? null });
  });
}

async function openLinkTypeMenuAndPick(label: string) {
  const combos = screen.getAllByRole('combobox');
  fireEvent.click(combos[0]);
  fireEvent.click(await screen.findByText(label));
}

describe('TransactionLinkDialog title and description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet({ '/api/v1/counterparties': pagedOf([]) });
  });

  it('renders the "Link" title and the connect-to-anything description', () => {
    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Link' })).toBeInTheDocument();
    expect(
      screen.getByText(/Connect this transaction to other transactions, a person.s ledger entry, or a\s*loan installment\./),
    ).toBeInTheDocument();
  });
});

describe('TransactionLinkDialog LENDING kind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('locks direction to "lent" for a DEBIT subject and shows the New entry / Existing entry mode toggle with a "Save entry" footer', async () => {
    mockGet({ '/api/v1/counterparties': pagedOf([rahulCp]) });

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Lending (person ledger)');

    expect(await screen.findByText('New entry')).toBeInTheDocument();
    expect(screen.getByText('Existing entry')).toBeInTheDocument();
    expect(screen.getByText(/I gave money \(Lent\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save entry' })).toBeInTheDocument();
  });

  it('locks direction to "borrowed" for a CREDIT subject', async () => {
    mockGet({ '/api/v1/counterparties': pagedOf([rahulCp]) });

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={creditTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Lending (person ledger)');

    expect(await screen.findByText(/I received money \(Borrowed\)/)).toBeInTheDocument();
  });

  it('Existing mode lists only unlinked, direction-matching entries and Attach PUTs the transaction onto the chosen entry', async () => {
    const unlinkedLent: LendingResponse = {
      id: 'lend-unlinked',
      counterpartyId: 'cp-rahul',
      counterpartyName: 'Rahul Sharma',
      amount: 300,
      direction: 'lent',
      entryDate: '2026-07-01',
      createdAt: '2026-07-01T00:00:00Z',
      notes: 'Dinner unlinked entry',
    };
    const alreadyLinkedLent: LendingResponse = {
      ...unlinkedLent,
      id: 'lend-linked',
      amount: 400,
      notes: 'Already linked entry',
      transaction: {
        accountId: 'acc1',
        date: '2026-07-01',
        description: 'Some other txn',
        id: 't-other',
      } as LendingResponse['transaction'],
    };
    const wrongDirection: LendingResponse = {
      ...unlinkedLent,
      id: 'lend-borrowed',
      amount: 200,
      direction: 'borrowed',
      notes: 'Wrong direction entry',
    };

    mockGet({
      '/api/v1/counterparties': pagedOf([rahulCp]),
      '/api/v1/lendings': pagedOf([unlinkedLent, alreadyLinkedLent, wrongDirection]),
    });
    (api.PUT as Mock).mockResolvedValue({ data: undefined });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    await openLinkTypeMenuAndPick('Lending (person ledger)');

    // suggestCounterparty pre-selects Rahul Sharma from the description before
    // we ever touch the picker — just wait for that, then switch to Existing.
    const cpCombo = screen.getByRole('combobox', { name: /Person \/ Counterparty/i });
    await waitFor(() => expect(cpCombo).toHaveTextContent('Rahul Sharma'));

    fireEvent.click(await screen.findByText('Existing entry'));

    await waitFor(() => {
      expect(screen.getByText(/Dinner unlinked entry/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Already linked entry/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wrong direction entry/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
        params: { path: { id: 'lend-unlinked' } },
        body: { transactionId: 't-debit' },
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('New mode pre-selects the counterparty via suggestCounterparty and submits POST /api/v1/lendings with the derived fields', async () => {
    mockGet({ '/api/v1/counterparties': pagedOf([rahulCp]) });
    (api.POST as Mock).mockResolvedValue({
      data: { id: 'new-lend', counterpartyId: 'cp-rahul', counterpartyName: 'Rahul Sharma' },
    });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    await openLinkTypeMenuAndPick('Lending (person ledger)');

    // suggestCounterparty("Dinner with Rahul Sharma", [Rahul Sharma]) picks Rahul Sharma automatically.
    const cpCombo = screen.getByRole('combobox', { name: /Person \/ Counterparty/i });
    await waitFor(() => expect(cpCombo).toHaveTextContent('Rahul Sharma'));
    expect(screen.getByLabelText(/Amount \(₹\)/)).toHaveValue(500);
    expect(screen.getByLabelText('Date *')).toHaveValue('2026-07-25');

    const saveBtn = screen.getByRole('button', { name: 'Save entry' });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', {
        body: expect.objectContaining({
          direction: 'lent',
          amount: 500,
          entryDate: '2026-07-25',
          transactionId: 't-debit',
          counterpartyId: 'cp-rahul',
        }),
      });
    });
    const body = (api.POST as Mock).mock.calls[0][1].body as Record<string, unknown>;
    expect(body.newCounterpartyName).toBeUndefined();

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows a toast with the server error message when the new-entry submit fails', async () => {
    mockGet({ '/api/v1/counterparties': pagedOf([rahulCp]) });
    (api.POST as Mock).mockRejectedValue(
      new ApiError(400, { code: 'ERR', message: 'Counterparty ledger is locked', timestamp: '' }),
    );

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Lending (person ledger)');

    const saveBtn = await screen.findByRole('button', { name: 'Save entry' });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Counterparty ledger is locked');
    });
  });
});

describe('TransactionLinkDialog LOAN_PAYMENT kind', () => {
  const loan: LoanResponse = {
    id: 'loan-1',
    name: 'Home Loan',
    loanType: 'home',
    lender: 'HDFC',
    principal: 1000000,
    annualRatePct: 8,
    rateType: 'fixed',
    tenureMonths: 240,
    startDate: '2020-01-01',
    firstEmiDate: '2020-02-01',
    emiAmount: 5000,
    status: 'active',
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
    currentAnnualRatePct: 8,
    currentEmi: 5000,
    outstandingPrincipal: 90475,
    totalInstallments: 240,
    settledInstallments: 1,
    totalInterestPaid: 500,
    totalInterestRemaining: 100000,
  };

  const settled: InstallmentDto = {
    seq: 1,
    dueDate: '2026-06-05',
    openingBalance: 100000,
    emi: 5000,
    interest: 500,
    principal: 4500,
    closingBalance: 95000,
    status: 'settled',
  };
  const overdue: InstallmentDto = {
    seq: 2,
    dueDate: '2026-07-05',
    openingBalance: 95000,
    emi: 5000,
    interest: 475,
    principal: 4525,
    closingBalance: 90475,
    status: 'overdue',
  };
  const upcomingNearest: InstallmentDto = {
    seq: 3,
    dueDate: '2026-08-05',
    openingBalance: 90475,
    emi: 5000,
    interest: 452,
    principal: 4548,
    closingBalance: 85927,
    status: 'upcoming',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet({
      '/api/v1/loans': pagedOf([loan]),
      '/api/v1/loans/{id}/schedule': { group: [settled, overdue, upcomingNearest] },
    });
  });

  it('disables "Settle installment" until a loan (and its default installment) are chosen', async () => {
    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Loan EMI payment');

    expect(await screen.findByRole('button', { name: 'Settle installment' })).toBeDisabled();
  });

  it('lists only unsettled installments and defaults to the one nearest the transaction date; enables the footer once chosen', async () => {
    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Loan EMI payment');

    const loanCombo = await screen.findByRole('combobox', { name: /^Loan/i });
    fireEvent.click(loanCombo);
    fireEvent.click(await screen.findByText('Home Loan · HDFC'));

    // Transaction date is 2026-07-25: installment #3 (due 2026-08-05, 11 days
    // away) is nearer than #2 (due 2026-07-05, 20 days away) — #3 wins by default.
    const installmentCombo = await screen.findByRole('combobox', { name: /Installment/i });
    await waitFor(() => expect(installmentCombo).toHaveTextContent('#3'));

    fireEvent.click(installmentCombo);
    const listbox = within(await screen.findByRole('listbox'));
    expect(listbox.getByText(/#2 · due/)).toBeInTheDocument();
    expect(listbox.getByText(/#3 · due/)).toBeInTheDocument();
    expect(listbox.queryByText(/#1 · due/)).not.toBeInTheDocument();
    fireEvent.keyDown(installmentCombo, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Settle installment' })).not.toBeDisabled();
    });
  });

  it('submits POST /api/v1/loans/{id}/payments with installmentSeq, paymentDate, amount, and transactionId, then closes and calls onSuccess', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: { id: 'pay-1', loanId: 'loan-1', installmentSeq: 3, paymentDate: '2026-07-25', amount: 500 },
    });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    await openLinkTypeMenuAndPick('Loan EMI payment');

    const loanCombo = await screen.findByRole('combobox', { name: /^Loan/i });
    fireEvent.click(loanCombo);
    fireEvent.click(await screen.findByText('Home Loan · HDFC'));

    const settleBtn = screen.getByRole('button', { name: 'Settle installment' });
    await waitFor(() => expect(settleBtn).not.toBeDisabled());
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
        params: { path: { id: 'loan-1' } },
        body: { paymentDate: '2026-07-25', amount: 500, installmentSeq: 3, transactionId: 't-debit' },
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows a toast with the server error message when settling the installment fails', async () => {
    (api.POST as Mock).mockRejectedValue(
      new ApiError(409, { code: 'ERR', message: 'Installment already settled', timestamp: '' }),
    );

    renderWithQuery(
      <TransactionLinkDialog
        initialTransaction={debitTxn}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await openLinkTypeMenuAndPick('Loan EMI payment');

    const loanCombo = await screen.findByRole('combobox', { name: /^Loan/i });
    fireEvent.click(loanCombo);
    fireEvent.click(await screen.findByText('Home Loan · HDFC'));

    const settleBtn = screen.getByRole('button', { name: 'Settle installment' });
    await waitFor(() => expect(settleBtn).not.toBeDisabled());
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Installment already settled');
    });
  });
});
