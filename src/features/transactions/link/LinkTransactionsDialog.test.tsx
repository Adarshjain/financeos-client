import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('sonner', async (orig) => ({ ...(await orig<typeof import('sonner')>()), toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      { id: 'a1', name: 'HDFC Savings', type: 'bank_account' },
      { id: 'a2', name: 'SBI Savings', type: 'bank_account' },
    ],
  }),
}));
vi.mock('@/lib/query/hooks/useCounterparties', () => ({
  useCounterpartySearch: () => ({
    data: {
      content: [
        { id: 'p1', name: 'Rahul Sharma', entryCount: 2, netPosition: 15000, linkedEntryCount: 0 },
      ],
    },
  }),
  useCounterpartySuggestion: () => ({ data: null }),
}));
vi.mock('@/lib/query/hooks/useInvestments', () => ({
  usePositions: () => ({
    data: [{ brokerAccountId: 'b1', brokerName: 'Zerodha', instrument: { id: 'i1', name: 'ITC Ltd', symbol: 'ITC' } }],
    isLoading: false,
  }),
}));

// The picker has its own tests: here it is a stand-in that records what it was asked for and can pick.
const pickerProps = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));
vi.mock('../TransactionPickerField', () => ({
  TransactionPickerField: (p: {
    label?: string;
    type?: string | null;
    excludeIds?: string[];
    accept?: (t: { amount: number; accountId: string }) => boolean;
    onSelect: (t: unknown) => void;
  }) => {
    pickerProps.last = p as unknown as Record<string, unknown>;
    return (
      <div data-testid="picker" data-type={String(p.type)} data-exclude={(p.excludeIds ?? []).join(',')}>
        <span>{p.label}</span>
        <button
          type="button"
          onClick={() =>
            p.onSelect({ id: 'r1', description: 'BigBasket refund', amount: 240, date: '2026-10-14', accountId: 'a1' })
          }
        >
          Pick refund
        </button>
      </div>
    );
  },
}));

import { serverApi as api } from '@/lib/api/server';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LinkTransactionsDialog } from './LinkTransactionsDialog';

type Mock = ReturnType<typeof vi.fn>;
const user = userEvent.setup({ pointerEventsCheck: 0 });

const tx = (id: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  ({ id, amount, accountId: 'a1', date: '2026-10-12', description: id, ...over }) as Transaction;

const onClose = vi.fn();
const onLinked = vi.fn();
const open = (transactions: Transaction[]) =>
  renderWithQuery(<LinkTransactionsDialog transactions={transactions} onClose={onClose} onLinked={onLinked} />);

const chooseType = async (name: RegExp) => {
  await user.click(screen.getByRole('combobox', { name: /^Type/ }));
  await user.click(screen.getByRole('option', { name }));
};

const loanRow = { id: 'loan1', name: 'SBI MaxGain', lender: 'SBI' };
const installments = {
  all: [
    { seq: 14, dueDate: '2026-10-05', emi: 36603, status: 'overdue' },
    { seq: 15, dueDate: '2026-11-05', emi: 36603, status: 'upcoming' },
    { seq: 13, dueDate: '2026-09-05', emi: 36603, status: 'settled' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  pickerProps.last = null;
  (api.GET as Mock).mockImplementation(async (path: string) => {
    if (path === '/api/v1/loans') return { data: { content: [loanRow] } };
    if (path === '/api/v1/loans/{id}/schedule') return { data: installments };
    if (path === '/api/v1/lendings')
      return {
        data: {
          content: [
            { id: 'e1', amount: 15000, entryDate: '2026-09-28', notes: 'Goa trip', direction: 'lent', transaction: null },
            { id: 'e2', amount: 4000, entryDate: '2026-08-02', notes: null, direction: 'lent', transaction: { id: 'x' } },
          ],
        },
      };
    if (path === '/api/v1/investments/dividends') return { data: { content: [] } };
    return { data: {} };
  });
  (api.POST as Mock).mockResolvedValue({ data: { id: 'new', installmentSeq: 14 } });
  (api.PUT as Mock).mockResolvedValue({ data: {} });
});

describe('LinkTransactionsDialog, one transaction', () => {
  it('names the transaction and offers the six link types and the three records, no Other', async () => {
    open([tx('t1', -3600, { description: 'BigBasket' })]);
    expect(screen.getByText('Link BigBasket · ₹3,600.00 to…')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names.some((n) => /Transfer/.test(n ?? ''))).toBe(true);
    for (const word of [/Credit card bill payment/, /Refund/, /Reversal/, /Fee/, /EMI/, /Lending entry/, /Loan payment/, /Dividend/]) {
      expect(names.some((n) => word.test(n ?? ''))).toBe(true);
    }
    expect(names.some((n) => /Other/.test(n ?? ''))).toBe(false);
  });

  it('disables a record that cannot apply, with the reason', async () => {
    open([tx('t1', 3600)]);
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    const loan = screen.getByRole('option', { name: /Loan payment/ });
    expect(loan).toHaveAttribute('aria-disabled', 'true');
    expect(loan).toHaveTextContent('Loan payments must be money-out (debit) transactions');
  });

  it('asks the picker for the other side of a debit: credits, no obligation refs, near its date', () => {
    open([tx('t1', -3600)]);
    expect(screen.getByTestId('picker')).toHaveAttribute('data-type', 'CREDIT');
    expect(screen.getByText('Find the other side')).toBeInTheDocument();
    expect(pickerProps.last).toMatchObject({ excludeAnyObligationRef: true, suggestAmount: 3600, suggestDate: '2026-10-12' });
  });

  it('keeps Link disabled until another transaction is picked, then links with the debit as the anchor', async () => {
    open([tx('t1', -3600)]);
    const link = screen.getByRole('button', { name: 'Link transactions' });
    expect(link).toBeDisabled();
    await chooseType(/Refund/);
    fireEvent.change(screen.getByRole('textbox', { name: /^Note/ }), { target: { value: ' return ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pick refund' }));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-exclude', 't1,r1');
    expect(screen.getByRole('checkbox', { name: 'Align refund category to the purchase' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Align refund category to the purchase' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link transactions' }));
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/transaction-links', {
      body: {
        type: 'REFUND',
        members: [
          { transactionId: 't1', isAnchor: true },
          { transactionId: 'r1', isAnchor: false },
        ],
        note: 'return',
        alignRefundCategories: false,
      },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the picker once a transfer has its two transactions, and brings it back when one is removed', async () => {
    open([tx('t1', -3600)]);
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick refund' }));
    expect(screen.queryByTestId('picker')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove BigBasket refund' }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('keeps the picker for a refund after the second transaction', async () => {
    open([tx('t1', -3600)]);
    await chooseType(/Refund/);
    fireEvent.click(screen.getByRole('button', { name: 'Pick refund' }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('lets a picked transaction be removed again', async () => {
    open([tx('t1', -3600)]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove BigBasket refund' }));
    expect(screen.queryByRole('button', { name: 'Remove BigBasket refund' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Link transactions' })).toBeDisabled();
  });
});

describe('LinkTransactionsDialog, several transactions', () => {
  const rows = () => [
    tx('p', -24990, { description: 'Croma Electronics' }),
    tx('r1', 20000, { description: 'Croma refund 1' }),
    tx('r2', 4990, { description: 'Croma refund 2' }),
  ];

  it('titles the count, gives every row a role and the refund a coverage line', async () => {
    open(rows());
    expect(screen.getByText('Link 3 transactions')).toBeInTheDocument();
    expect(screen.getByText('Picked from the selection; give each one its role.')).toBeInTheDocument();
    await chooseType(/Refund/);
    expect(screen.getByRole('combobox', { name: 'Role of Croma Electronics' })).toHaveTextContent('Purchase');
    expect(screen.getByRole('combobox', { name: 'Role of Croma refund 1' })).toHaveTextContent('Refund');
    expect(screen.getByText('Refunds ₹24,990.00 of ₹24,990.00 · fully refunded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link 3' })).toBeEnabled();
  });

  it('disables the three records for more than one transaction', async () => {
    open(rows());
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    for (const name of [/Lending entry/, /Loan payment/, /Dividend/]) {
      expect(screen.getByRole('option', { name })).toHaveAttribute('aria-disabled', 'true');
    }
    expect(screen.getByRole('option', { name: /Loan payment/ })).toHaveTextContent(
      'Select a single transaction to record a lending, loan payment or dividend',
    );
  });

  it('links them with the chosen main transaction, and updates the coverage when a row goes', async () => {
    open(rows());
    await chooseType(/Refund/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Croma refund 2' }));
    expect(screen.getByText('Refunds ₹20,000.00 of ₹24,990.00 · partly refunded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link 2' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Link 2' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body.members).toEqual([
      { transactionId: 'p', isAnchor: true },
      { transactionId: 'r1', isAnchor: false },
    ]);
  });

  it('makes another row the main one from its role', async () => {
    open([tx('a', -100, { description: 'Out' }), tx('b', -50, { description: 'Also out' })]);
    await user.click(screen.getByRole('combobox', { name: 'Role of Also out' }));
    await user.click(screen.getByRole('option', { name: 'Transfer out' }));
    expect(screen.getByRole('combobox', { name: 'Role of Out' })).toHaveTextContent('Transfer in');
    fireEvent.click(screen.getByRole('button', { name: 'Link 2' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body.members).toEqual([
      { transactionId: 'a', isAnchor: false },
      { transactionId: 'b', isAnchor: true },
    ]);
  });
});

describe('LinkTransactionsDialog, records', () => {
  it('records a new lending entry from the transaction, direction following it', async () => {
    open([tx('t1', -15000, { description: 'UPI to Rahul' })]);
    await chooseType(/Lending entry/);
    expect(screen.getByText('Record it in a lending ledger.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Direction/ })).toHaveTextContent('You lent');
    expect(screen.getByRole('combobox', { name: /^Direction/ })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Amount/ })).toHaveValue('15000');
    expect(screen.getByLabelText('Date')).toHaveValue('12/10/26');
    await user.click(screen.getByRole('combobox', { name: /^Person/ }));
    await user.click(screen.getByRole('option', { name: /Rahul Sharma/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Record and link' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][0]).toBe('/api/v1/lendings');
    expect((api.POST as Mock).mock.calls[0][1].body).toMatchObject({
      counterpartyId: 'p1',
      direction: 'lent',
      kind: 'principal',
      amount: 15000,
      transactionId: 't1',
    });
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
  });

  it('attaches to an open entry of the person, offering only entries without a transaction', async () => {
    open([tx('t1', -5000, { description: 'NEFT' })]);
    await chooseType(/Lending entry/);
    await user.click(screen.getByRole('combobox', { name: /^Person/ }));
    await user.click(screen.getByRole('option', { name: /Rahul Sharma/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Existing entry' }));
    const entry = await screen.findByRole('radio', { name: /28 Sep/ });
    expect(within(entry).getByText('Goa trip')).toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup', { name: 'Open entries' })).getAllByRole('radio')).toHaveLength(1);
    const attach = screen.getByRole('button', { name: 'Link to entry' });
    expect(attach).toBeDisabled();
    fireEvent.click(entry);
    expect(entry).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Link to entry' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1' },
    });
  });

  it('settles an unpaid installment: radio rows, the nearest preselected, difference in words', async () => {
    open([tx('t1', -39052, { description: 'SBI HOME LOAN EMI', date: '2026-10-05' })]);
    await chooseType(/Loan payment/);
    await user.click(screen.getByRole('combobox', { name: /^Loan/ }));
    await user.click(screen.getByRole('option', { name: /SBI MaxGain/ }));
    const first = await screen.findByRole('radio', { name: 'EMI #14' });
    expect(within(screen.getByRole('radiogroup', { name: 'Unpaid installments' })).getAllByRole('radio')).toHaveLength(2);
    expect(first).toHaveTextContent('due 5 Oct · 8 days overdue');
    await waitFor(() => expect(first).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText('₹2,449 more than EMI')).toBeInTheDocument();
    expect(screen.getByLabelText('Paid on')).toHaveValue('05/10/26');
    fireEvent.click(screen.getByRole('button', { name: 'Settle EMI #14' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
      params: { path: { id: 'loan1' } },
      body: { paymentDate: '2026-10-05', amount: 39052, installmentSeq: 14, transactionId: 't1' },
    });
  });

  it('records a new dividend: per share times shares is the gross, the pay date is the transaction date', async () => {
    open([tx('t1', 1500, { description: 'ACH CR ITC LTD', date: '2026-06-20' })]);
    await chooseType(/Dividend/);
    fireEvent.click(screen.getByRole('radio', { name: 'New dividend' }));
    await user.click(screen.getByRole('combobox', { name: /^Instrument/ }));
    await user.click(screen.getByRole('option', { name: /ITC/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Per share/ }), { target: { value: '7.5' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Shares/ }), { target: { value: '200' } });
    expect(screen.getByRole('textbox', { name: /^Gross amount/ })).toHaveValue('1500');
    expect(screen.queryByLabelText(/Pay date/)).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /^TDS/ }), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record and link' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][0]).toBe('/api/v1/investments/dividends');
    expect((api.POST as Mock).mock.calls[0][1].body).toMatchObject({
      brokerAccountId: 'b1',
      instrumentId: 'i1',
      type: 'dividend',
      amount: 1500,
      tds: 150,
      payDate: '2026-06-20',
    });
  });
});
