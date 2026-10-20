import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';
import type { InstallmentDto, LoanEventType } from '@/lib/types';

interface StubPickerProps {
  value: { id: string } | null;
  onSelect: (t: Transaction) => void;
  onClear: () => void;
  type?: 'DEBIT' | 'CREDIT' | null;
  excludeAnyObligationRef?: boolean;
  suggestAmount?: number | null;
  suggestDate?: string | null;
  ruleHint?: string;
}

vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: ({
    value,
    onSelect,
    onClear,
    type,
    excludeAnyObligationRef,
    suggestAmount,
    suggestDate,
    ruleHint,
  }: StubPickerProps) => (
    <div
      data-testid="transaction-picker-stub"
      data-type={type === undefined ? 'undefined' : String(type)}
      data-exclude-any-obligation-ref={String(Boolean(excludeAnyObligationRef))}
      data-suggest-amount={String(suggestAmount ?? '')}
      data-suggest-date={String(suggestDate ?? '')}
      data-rule-hint={ruleHint ?? ''}
    >
      <span>{value ? value.id : 'none'}</span>
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 'picked-tx',
            accountId: 'acc1',
            date: '2026-01-01',
            amount: -500,
            source: 'manual',
            createdAt: '2026-01-01T00:00:00Z',
          })
        }
      >
        Pick
      </button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
    </div>
  ),
}));

import { AddChargeDialog } from '../AddChargeDialog';
import { RecordEventDialog } from '../RecordEventDialog';
import { SettlePaymentDialog } from '../SettlePaymentDialog';

const installment: InstallmentDto = {
  seq: 3,
  dueDate: '2026-07-05',
  openingBalance: 100000,
  emi: 4500,
  interest: 500,
  principal: 4000,
  closingBalance: 95500,
  status: 'upcoming',
};

describe('SettlePaymentDialog transaction picker', () => {
  function renderDialog() {
    return render(
      <SettlePaymentDialog
        open
        onOpenChange={vi.fn()}
        selectedInstallment={installment}
        paymentDate="2026-07-05"
        setPaymentDate={vi.fn()}
        paymentAmount="4500"
        setPaymentAmount={vi.fn()}
        paymentTx={null}
        onSelectPaymentTx={vi.fn()}
        onClearPaymentTx={vi.fn()}
        submittingPayment={false}
        onSettlePayment={vi.fn()}
      />,
    );
  }

  it('renders the TransactionPicker stub and no raw ID input', () => {
    renderDialog();

    expect(screen.getByTestId('transaction-picker-stub')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/UUID of/i)).not.toBeInTheDocument();
    expect(screen.getByText('Transaction (Optional)')).toBeInTheDocument();
  });

  it('passes type="DEBIT", excludeAnyObligationRef, and the installment EMI/dueDate as suggestions', () => {
    renderDialog();

    const stub = screen.getByTestId('transaction-picker-stub');
    expect(stub).toHaveAttribute('data-type', 'DEBIT');
    expect(stub).toHaveAttribute('data-exclude-any-obligation-ref', 'true');
    expect(stub).toHaveAttribute('data-suggest-amount', String(installment.emi));
    expect(stub).toHaveAttribute('data-suggest-date', installment.dueDate);
  });
});

describe('AddChargeDialog transaction picker', () => {
  function renderDialog() {
    return render(
      <AddChargeDialog
        open
        onOpenChange={vi.fn()}
        chargeType="late_fee"
        setChargeType={vi.fn()}
        chargeAmount="2500"
        setChargeAmount={vi.fn()}
        chargeDate="2026-05-02"
        setChargeDate={vi.fn()}
        chargeNotes=""
        setChargeNotes={vi.fn()}
        chargeTx={null}
        onSelectChargeTx={vi.fn()}
        onClearChargeTx={vi.fn()}
        submittingCharge={false}
        onAddCharge={vi.fn()}
      />,
    );
  }

  it('renders the TransactionPicker stub and no raw ID input', () => {
    renderDialog();

    expect(screen.getByTestId('transaction-picker-stub')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/UUID of/i)).not.toBeInTheDocument();
    expect(screen.getByText('Transaction (Optional)')).toBeInTheDocument();
  });

  it('passes type="DEBIT" and excludeAnyObligationRef, with typed amount/date as suggestions', () => {
    renderDialog();

    const stub = screen.getByTestId('transaction-picker-stub');
    expect(stub).toHaveAttribute('data-type', 'DEBIT');
    expect(stub).toHaveAttribute('data-exclude-any-obligation-ref', 'true');
    expect(stub).toHaveAttribute('data-suggest-amount', '2500');
    expect(stub).toHaveAttribute('data-suggest-date', '2026-05-02');
  });
});

describe('RecordEventDialog transaction picker', () => {
  function renderDialog(eventType: LoanEventType) {
    return render(
      <RecordEventDialog
        open
        onOpenChange={vi.fn()}
        eventType={eventType}
        setEventType={vi.fn()}
        effectiveDate="2026-06-15"
        setEffectiveDate={vi.fn()}
        newAnnualRatePct=""
        setNewAnnualRatePct={vi.fn()}
        eventAmount="10000"
        setEventAmount={vi.fn()}
        adjustmentMode="reduce_tenure"
        setAdjustmentMode={vi.fn()}
        newEmiOverride=""
        setNewEmiOverride={vi.fn()}
        eventTx={null}
        onSelectEventTx={vi.fn()}
        onClearEventTx={vi.fn()}
        submittingEvent={false}
        onAddEvent={vi.fn()}
      />,
    );
  }

  it('renders the TransactionPicker stub and no raw ID input', () => {
    renderDialog('prepayment');

    expect(screen.getByTestId('transaction-picker-stub')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/UUID of/i)).not.toBeInTheDocument();
    expect(screen.getByText('Transaction (Optional)')).toBeInTheDocument();
  });

  it('passes type="DEBIT" for prepayment', () => {
    renderDialog('prepayment');

    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-type', 'DEBIT');
  });

  it('passes type="DEBIT" for foreclosure', () => {
    renderDialog('foreclosure');

    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-type', 'DEBIT');
  });

  it('passes type={null} for rate_change', () => {
    renderDialog('rate_change');

    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-type', 'null');
  });

  it('always passes excludeAnyObligationRef regardless of eventType', () => {
    renderDialog('rate_change');
    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute(
      'data-exclude-any-obligation-ref',
      'true',
    );
  });
});
