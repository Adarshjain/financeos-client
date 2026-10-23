import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { InstallmentDto } from '@/lib/loan.types';

import { LoanPaymentLinkBody } from './LoanPaymentLinkBody';
import type { UseLoanPaymentLinkResult } from './useLoanPaymentLink';

const INSTALLMENT = { seq: 1, dueDate: '2026-10-05', emi: 100, status: 'upcoming' } as unknown as InstallmentDto;

function Harness() {
  const [amount, setAmount] = React.useState('');
  const numeric = Number(amount);
  const loanPayment = {
    loans: [],
    loadingLoans: false,
    loanId: 'l1',
    setLoanId: vi.fn(),
    installments: [INSTALLMENT],
    loadingSchedule: false,
    installmentSeq: 1,
    setInstallmentSeq: vi.fn(),
    paymentDate: '2026-10-05',
    setPaymentDate: vi.fn(),
    amount,
    setAmount,
    amountError: amount.trim() && !(numeric > 0) ? 'Enter an amount greater than zero' : undefined,
  } as unknown as UseLoanPaymentLinkResult;
  return (
    <>
      <LoanPaymentLinkBody loanPayment={loanPayment} />
      <output data-testid="state">{amount}</output>
    </>
  );
}

describe('LoanPaymentLinkBody amount', () => {
  it('shows the error only after the field loses focus', () => {
    render(<Harness />);
    const field = screen.getByLabelText('Amount paid');
    fireEvent.change(field, { target: { value: '120+' } });
    expect(screen.queryByText('Enter an amount greater than zero')).not.toBeInTheDocument();
    fireEvent.blur(field);
    expect(screen.getByText('Enter an amount greater than zero')).toBeInTheDocument();
  });

  it('resolves a sum on blur and shows the difference from the EMI', () => {
    render(<Harness />);
    const field = screen.getByLabelText('Amount paid');
    fireEvent.change(field, { target: { value: '100+50' } });
    fireEvent.blur(field);
    expect(screen.getByTestId('state')).toHaveTextContent('150');
    expect(screen.getByText('₹50 more than EMI')).toBeInTheDocument();
    expect(screen.queryByText('Enter an amount greater than zero')).not.toBeInTheDocument();
  });
});
