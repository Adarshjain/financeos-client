import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', async (orig) => ({ ...(await orig<typeof import('sonner')>()), toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('../TransactionPickerField', () => ({ TransactionPickerField: () => <div /> }));

import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LinkTransactionsDialog } from './LinkTransactionsDialog';

type Mock = ReturnType<typeof vi.fn>;
const user = userEvent.setup({ pointerEventsCheck: 0 });

const tx = (id: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  ({ id, amount, accountId: 'a1', date: '2018-09-12', description: 'NEFT CR EPFO', ...over }) as Transaction;

const onClose = vi.fn();
const onLinked = vi.fn();
const open = (transactions: Transaction[]) =>
  renderWithQuery(<LinkTransactionsDialog transactions={transactions} onClose={onClose} onLinked={onLinked} />);

const chooseEpf = async () => {
  await user.click(screen.getByRole('combobox', { name: /^Type/ }));
  await user.click(screen.getByRole('option', { name: /EPF withdrawal/ }));
};

/** The withdrawals' radios, after the two segments. */
const withdrawalRadios = () => screen.getAllByRole('radio').slice(2);

const entry = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  employerId: 'emp1',
  employerName: 'Globex Retail',
  creditedOn: '2018-09-12',
  employeeAmount: 61800,
  employerAmount: 50800,
  withdrawalKind: 'FINAL_SETTLEMENT',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  (api.GET as Mock).mockImplementation(async (path: string) => {
    if (path === '/api/v1/epf/withdrawals')
      return {
        data: [
          { entry: entry('e1', { grossAmount: 112600 }), suggested: true, tdsGap: 11260 },
          { entry: entry('e2', { withdrawalKind: 'PENSION', employeeAmount: 0, employerAmount: 0, pensionAmount: 28400, grossAmount: 28400 }), suggested: false, tdsGap: null },
        ],
      };
    if (path === '/api/v1/epf/employers') return { data: [{ id: 'emp1', name: 'Globex Retail' }] };
    return { data: {} };
  });
  (api.PUT as Mock).mockResolvedValue({ data: {} });
  (api.POST as Mock).mockResolvedValue({ data: { id: 'new1' } });
});

describe('LinkTransactionsDialog, EPF withdrawal', () => {
  it('joins the Record as group for a credit', async () => {
    open([tx('t1', 101340)]);
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    expect(screen.getByRole('option', { name: /EPF withdrawal/ })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('is disabled for a debit, with the reason', async () => {
    open([tx('t1', -500)]);
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    const epf = screen.getByRole('option', { name: /EPF withdrawal/ });
    expect(epf).toHaveAttribute('aria-disabled', 'true');
    expect(epf).toHaveTextContent('EPF withdrawals must be money-in (credit) transactions');
  });

  it('is disabled when the credit already carries a record', async () => {
    open([tx('t1', 500, { obligationRefs: [{ kind: 'DIVIDEND', id: 'd1', label: 'Dividend' }] })]);
    await user.click(screen.getByRole('combobox', { name: /^Type/ }));
    expect(screen.getByRole('option', { name: /EPF withdrawal/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('lists the withdrawals with the suggested one chosen, and links it with the TDS gap recorded', async () => {
    open([tx('t1', 101340)]);
    await chooseEpf();
    expect(screen.getByText('Record an EPF withdrawal')).toBeInTheDocument();
    await screen.findByText('Final settlement · Globex Retail');
    expect(screen.getByText('12 Sep 2018 · no TDS recorded · suggested')).toBeInTheDocument();
    expect(screen.getByText('₹1,12,600')).toBeInTheDocument();
    expect(screen.getByText('12 Sep 2018 · Form 10C')).toBeInTheDocument();
    await waitFor(() => expect(withdrawalRadios()[0]).toBeChecked());
    expect(withdrawalRadios()[1]).not.toBeChecked();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByText('Record TDS of ₹11,260')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1', recordTds: true },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the TDS checkbox for a withdrawal with no gap', async () => {
    open([tx('t1', 28400)]);
    await chooseEpf();
    fireEvent.click(await screen.findByText('Pension · Globex Retail'));
    await waitFor(() => expect(withdrawalRadios()[1]).toBeChecked());
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/Record TDS of/)).toBeNull();
  });

  it('says so when there is nothing to link', async () => {
    (api.GET as Mock).mockImplementation(async () => ({ data: [] }));
    open([tx('t1', 28400)]);
    await chooseEpf();
    expect(await screen.findByText('No unlinked withdrawals. Record a new one instead.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeDisabled();
  });

  it('records a new withdrawal: employer, kind, shares and TDS, then links it', async () => {
    open([tx('t1', 40000, { date: '2025-02-24' })]);
    await chooseEpf();
    fireEvent.click(screen.getByRole('radio', { name: 'New withdrawal' }));
    await user.click(screen.getByRole('combobox', { name: /^Employer/ }));
    await user.click(await screen.findByRole('option', { name: /Globex Retail/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Your share/ }), { target: { value: '25000' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Employer share/ }), { target: { value: '15000' } });
    expect(screen.queryByRole('textbox', { name: /^TDS/ })).toBeNull();
    expect(screen.getByText('Received in bank: ₹40,000.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('textbox', { name: /^TDS/ }), { target: { value: '1000' } });
    expect(screen.getByText('Received in bank: ₹39,000.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record and link' }));
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][0]).toBe('/api/v1/epf/entries');
    expect((api.POST as Mock).mock.calls[0][1].body).toMatchObject({
      type: 'WITHDRAWAL',
      withdrawalKind: 'PARTIAL',
      employerId: 'emp1',
      creditedOn: '2025-02-24',
      employeeAmount: 25000,
      employerAmount: 15000,
      tdsAmount: 1000,
    });
  });

  it('a pension has a single Amount field', async () => {
    open([tx('t1', 28400)]);
    await chooseEpf();
    fireEvent.click(screen.getByRole('radio', { name: 'New withdrawal' }));
    await user.click(screen.getByRole('combobox', { name: /^Kind/ }));
    await user.click(screen.getByRole('option', { name: /Pension/ }));
    expect(screen.getByRole('textbox', { name: /^Amount/ })).toHaveValue('28400');
    expect(screen.queryByRole('textbox', { name: /^Your share/ })).toBeNull();
  });
});
