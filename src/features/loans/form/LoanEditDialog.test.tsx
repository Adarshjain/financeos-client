import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loanFixture } from '../detail/loanDetail.fixtures';
import { LoanEditDialog, TERMS_LOCKED_NOTE } from './LoanEditDialog';

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
vi.mock('../useUpdateLoan', () => ({
  useUpdateLoan: (opts?: { onError?: (e: unknown) => void }) => {
    onErrorOption = opts?.onError;
    return { mutateAsync, isPending: false };
  },
}));

const accounts = [{ id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 0 }] as Account[];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));

const onClose = vi.fn();
const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({});
});

describe('LoanEditDialog', () => {
  it('opens filled from the loan', () => {
    render(<LoanEditDialog loan={loanFixture()} termsLocked={false} onClose={onClose} />);
    expect(screen.getByText('Edit loan')).toBeInTheDocument();
    expect(field('Loan name')).toHaveValue('Home Loan · SBI MaxGain');
    expect(field('Lender')).toHaveValue('State Bank of India');
    expect(field('Principal')).toHaveValue('4500000');
    expect(field('Tenure')).toHaveValue('240');
    expect(screen.getByLabelText('Disbursal date')).toHaveValue('01/08/2025');
    expect(screen.getByRole('combobox', { name: /^Rate type/ })).toHaveTextContent('Floating Rate');
    expect(screen.getByRole('combobox', { name: /^Payment bank account/ })).toHaveTextContent('HDFC Savings');
  });

  it('keeps every field editable and says nothing about locks while no event or payment exists', () => {
    render(<LoanEditDialog loan={loanFixture()} termsLocked={false} onClose={onClose} />);
    expect(screen.queryByText(TERMS_LOCKED_NOTE)).toBeNull();
    for (const label of ['Principal', 'Annual rate', 'Tenure', 'EMI amount']) expect(field(label)).not.toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Rate type/ })).not.toBeDisabled();
  });

  it('locks the core terms and says why once an event or a payment exists', () => {
    render(<LoanEditDialog loan={loanFixture()} termsLocked onClose={onClose} />);
    expect(screen.getByText(TERMS_LOCKED_NOTE)).toBeInTheDocument();
    for (const label of ['Principal', 'Annual rate', 'Tenure', 'EMI amount']) expect(field(label)).toBeDisabled();
    expect(screen.getByLabelText('Disbursal date')).toBeDisabled();
    expect(screen.getByLabelText('First EMI due')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Rate type/ })).toBeDisabled();
    expect(field('Loan name')).not.toBeDisabled();
    expect(field('Lender')).not.toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Loan type/ })).not.toBeDisabled();
  });

  it('saves the edit, says so and refreshes the page', async () => {
    render(<LoanEditDialog loan={loanFixture()} termsLocked onClose={onClose} />);
    fireEvent.change(field('Loan name'), { target: { value: ' Home Loan SBI ' } });
    save();
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'l1',
        body: expect.objectContaining({ name: 'Home Loan SBI', lender: 'State Bank of India', principal: 4500000, tenureMonths: 240 }),
      }),
    );
    expect(toast).toHaveBeenCalledWith('Loan updated successfully');
    expect(onClose).toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps the name and lender required, and does not save without them', async () => {
    render(<LoanEditDialog loan={loanFixture()} termsLocked onClose={onClose} />);
    fireEvent.change(field('Loan name'), { target: { value: ' ' } });
    fireEvent.change(field('Lender'), { target: { value: '' } });
    save();
    expect(await screen.findByText('Loan name is required')).toBeInTheDocument();
    expect(screen.getByText('Lender is required')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('does not check the locked figures when editing', async () => {
    render(<LoanEditDialog loan={loanFixture({ principal: 0 })} termsLocked onClose={onClose} />);
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it('shows the server message when saving fails and stays open', async () => {
    mutateAsync.mockRejectedValue(new Error('nope'));
    render(<LoanEditDialog loan={loanFixture()} termsLocked onClose={onClose} />);
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    onErrorOption?.(new Error('boom'));
    expect(toast).toHaveBeenCalledWith('Failed to update loan', { tone: 'danger' });
  });
});
