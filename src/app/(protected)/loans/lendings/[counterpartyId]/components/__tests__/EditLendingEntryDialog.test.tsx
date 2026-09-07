import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';
import type { LendingTransactionSummary } from '@/lib/types';

vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: ({ value }: { value: { id: string } | null }) => (
    <div data-testid="transaction-picker-stub">{value ? `chip:${value.id}` : 'no-chip'}</div>
  ),
}));

import { EditLendingEntryDialog } from '../EditLendingEntryDialog';

const linkedTx: LendingTransactionSummary = {
  id: 'tx-abc',
  accountId: 'acc1',
  accountName: 'HDFC',
  date: '2026-01-01',
  signedAmount: -500,
};

function renderDialog(editSelectedTx: LendingTransactionSummary | Transaction | null) {
  return render(
    <EditLendingEntryDialog
      open={true}
      onOpenChange={vi.fn()}
      lendingDir="lent"
      setLendingDir={vi.fn()}
      lendingAmount="500"
      setLendingAmount={vi.fn()}
      lendingDate="2026-01-01"
      setLendingDate={vi.fn()}
      lendingExpDate=""
      setLendingExpDate={vi.fn()}
      lendingNotes=""
      setLendingNotes={vi.fn()}
      editSelectedTx={editSelectedTx}
      onSelectEditTx={vi.fn()}
      onClearEditTx={vi.fn()}
      submittingEditLending={false}
      onUpdateLending={vi.fn()}
    />,
  );
}

describe('EditLendingEntryDialog', () => {
  it('shows the current link chip and locks the direction radios with the helper text when linked', () => {
    renderDialog(linkedTx);

    expect(screen.getByText('chip:tx-abc')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.getByText('Unlink the transaction to change direction.')).toBeInTheDocument();
  });

  it('leaves the direction radios enabled with no helper text when unlinked', () => {
    renderDialog(null);

    expect(screen.getByText('no-chip')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => expect(radio).not.toBeDisabled());
    expect(screen.queryByText('Unlink the transaction to change direction.')).not.toBeInTheDocument();
  });
});
