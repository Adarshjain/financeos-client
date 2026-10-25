import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { LoanFormDialog } from './LoanFormDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const mutateAsync = vi.fn();
let onErrorOption: ((e: unknown) => void) | undefined;
vi.mock('../useCreateLoan', () => ({
  useCreateLoan: (opts?: { onError?: (e: unknown) => void }) => {
    onErrorOption = opts?.onError;
    return { mutateAsync, isPending: false };
  },
}));

const accounts = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 0 },
  { id: 'b2', type: AccountType.BANK_ACCOUNT, name: 'Old Bank', balance: 0, closedOn: '2025-01-01' },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', balance: 0 },
] as Account[];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));

const onClose = vi.fn();
const user = userEvent.setup({ pointerEventsCheck: 0 });
const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const fill = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });
const create = () => fireEvent.click(screen.getByRole('button', { name: 'Create loan' }));

function fillRequired() {
  fill('Loan name', ' Home Loan HDFC ');
  fill('Lender', 'HDFC Bank');
  fill('Principal', '1000000');
  fill('Annual rate', '8.5');
  fill('Tenure', '240');
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({});
});

describe('LoanFormDialog', () => {
  it('opens with the Legacy fields and defaults', () => {
    render(<LoanFormDialog onClose={onClose} />);
    expect(screen.getByText('Add loan')).toBeInTheDocument();
    for (const label of ['Loan name', 'Lender', 'Loan account number', 'Principal', 'Annual rate', 'Tenure', 'EMI amount', 'Notes']) {
      expect(field(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('combobox', { name: /^Loan type/ })).toHaveTextContent('Home Loan');
    expect(screen.getByRole('combobox', { name: /^Rate type/ })).toHaveTextContent('Fixed Rate');
    expect(screen.getByLabelText('Disbursal date')).toHaveValue('13/10/2026');
    expect(screen.getByLabelText('First EMI due')).toHaveValue('13/10/2026');
    expect(field('EMI amount')).toHaveAttribute('placeholder', 'Auto if blank');
  });

  it('shows every Legacy validation message on its field and does not save', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    create();
    for (const message of [
      'Loan name is required',
      'Lender is required',
      'Principal must be greater than zero',
      'Annual rate % must be greater than zero',
      'Tenure must be at least 1 month',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('clears a field error once that field is edited', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    create();
    expect(await screen.findByText('Loan name is required')).toBeInTheDocument();
    fill('Loan name', 'Car');
    expect(screen.queryByText('Loan name is required')).toBeNull();
    expect(screen.getByText('Lender is required')).toBeInTheDocument();
  });

  it('creates the loan with the typed values, then closes, refreshes and says so', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    fillRequired();
    fill('EMI amount', '9500.50');
    create();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Home Loan HDFC',
        lender: 'HDFC Bank',
        loanType: 'home',
        rateType: 'fixed',
        principal: 1000000,
        annualRatePct: 8.5,
        tenureMonths: 240,
        startDate: '2026-10-13',
        firstEmiDate: '2026-10-13',
        emiAmount: 9500.5,
        paymentAccountId: undefined,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Loan created successfully');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps only digits in the tenure and only a decimal number in the principal', () => {
    render(<LoanFormDialog onClose={onClose} />);
    fill('Tenure', '2a4b0');
    fill('Principal', '10x00.5.5');
    expect(field('Tenure')).toHaveValue('240');
    expect(field('Principal')).toHaveValue('1000.55');
  });

  it('offers open bank accounts only, plus None, and sends the picked one', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    await user.click(screen.getByRole('combobox', { name: /^Payment bank account/ }));
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /HDFC Savings$/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Old Bank' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Axis Magnus' })).toBeNull();
    await user.click(screen.getByRole('option', { name: /HDFC Savings$/ }));
    fillRequired();
    create();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].paymentAccountId).toBe('b1');
  });

  it('sends the picked loan and rate types', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    await user.click(screen.getByRole('combobox', { name: /^Loan type/ }));
    await user.click(screen.getByRole('option', { name: 'Car Loan' }));
    await user.click(screen.getByRole('combobox', { name: /^Rate type/ }));
    await user.click(screen.getByRole('option', { name: 'Floating Rate' }));
    fillRequired();
    create();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ loanType: 'car', rateType: 'floating' });
  });

  it('keeps the dialog open and toasts the failure when saving fails', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    fillRequired();
    mutateAsync.mockRejectedValueOnce(new Error('boom'));
    create();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    onErrorOption?.(new Error('boom'));
    expect(toast).toHaveBeenCalledWith('Failed to create loan', { tone: 'danger' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel', () => {
    render(<LoanFormDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe('LoanFormDialog amount arithmetic', () => {
  it('turns 600000+400000 into 1000000 on blur and creates the loan with it', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    fillRequired();
    fill('Principal', '600000+400000');
    fireEvent.blur(field('Principal'));
    expect(field('Principal')).toHaveValue('1000000');
    create();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ principal: 1000000 })));
  });

  it('creates the loan with the result when submitted without a blur, EMI included', async () => {
    render(<LoanFormDialog onClose={onClose} />);
    fillRequired();
    fill('Principal', '600000+400000');
    fill('EMI amount', '9000+500.5');
    create();
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ principal: 1000000, emiAmount: 9500.5 })),
    );
  });
});
