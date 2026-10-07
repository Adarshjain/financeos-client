import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CounterpartyResponse, CounterpartySelection } from '@/lib/lending.types';
import type { LendingEntryType } from '@/lib/lendingEntry';
import type { Transaction } from '@/lib/transaction.types';
import type { LendingDirection } from '@/lib/types';

vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: ({
    value,
    onSelect,
    onClear,
    direction,
  }: {
    value: Transaction | null;
    onSelect: (t: Transaction) => void;
    onClear: () => void;
    direction: LendingDirection;
  }) => (
    <div data-testid="transaction-picker-stub" data-direction={direction}>
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

// The real picker queries the server (needs a QueryClient); the dialog only
// has to wire its selection through.
vi.mock('@/components/lendings/CounterpartyPicker', () => ({
  CounterpartyPicker: ({
    id,
    value,
    onChange,
  }: {
    id?: string;
    value: CounterpartySelection | null;
    onChange: (next: CounterpartySelection | null) => void;
  }) => (
    <div data-testid="counterparty-picker-stub" id={id}>
      <span>{value ? (value.kind === 'new' ? `new:${value.name}` : value.counterparty.name) : 'nobody'}</span>
      <button type="button" onClick={() => onChange({ kind: 'new', name: 'Kavita Rao' })}>
        Pick person
      </button>
    </div>
  ),
}));

import { AddLendingDialog } from '../AddLendingDialog';

function renderDialog(overrides: Partial<Parameters<typeof AddLendingDialog>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    party: null,
    setParty: vi.fn(),
    entryType: 'lent' as LendingEntryType,
    setEntryType: vi.fn(),
    amount: '',
    setAmount: vi.fn(),
    entryDate: '2026-01-01',
    setEntryDate: vi.fn(),
    expectedReturnDate: '',
    setExpectedReturnDate: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
    selectedTx: null,
    onSelectTx: vi.fn(),
    onClearTx: vi.fn(),
    loading: false,
    onCreateLending: vi.fn(),
    ...overrides,
  };
  return { ...render(<AddLendingDialog {...props} />), props };
}

describe('AddLendingDialog (browser)', () => {
  it('has no raw "Linked Transaction ID" input', () => {
    renderDialog();

    expect(screen.queryByLabelText(/Linked Transaction ID/i)).not.toBeInTheDocument();
    expect(screen.getByText('Linked Transaction (Optional)')).toBeInTheDocument();
  });

  it('renders the TransactionPicker stub', () => {
    renderDialog();

    expect(screen.getByTestId('transaction-picker-stub')).toBeInTheDocument();
  });

  it('calls the provided setter when a transaction is picked via the stub', () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByText('Pick'));

    expect(props.onSelectTx).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'picked-tx' }),
    );
  });

  it('derives the picker direction from the entry type and lets the type tiles drive it', () => {
    const { props, rerender } = renderDialog({ entryType: 'lent' });

    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-direction', 'lent');
    expect(screen.getAllByRole('radio')).toHaveLength(4);

    fireEvent.click(screen.getByLabelText('I borrowed money'));
    expect(props.setEntryType).toHaveBeenCalledWith('borrowed');

    rerender(<AddLendingDialog {...props} entryType="repaid_to_me" />);
    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-direction', 'borrowed');
  });

  it('hides the expected return date for a repayment', () => {
    const { props, rerender } = renderDialog({ entryType: 'lent' });
    expect(screen.getByLabelText(/Expected Return Date/)).toBeInTheDocument();

    rerender(<AddLendingDialog {...props} entryType="repaid_by_me" />);
    expect(screen.queryByLabelText(/Expected Return Date/)).not.toBeInTheDocument();
  });

  it('warns about a repayment that does not fit the chosen person\'s balance, and stays quiet when it does', () => {
    const rahul: CounterpartyResponse = {
      id: 'cp-rahul',
      name: 'Rahul',
      netPosition: 0,
      totalLent: 0,
      totalBorrowed: 0,
      repaidToYou: 0,
      repaidByYou: 0,
      entryCount: 0,
    };
    const { props, rerender } = renderDialog({
      party: { kind: 'existing', counterparty: rahul },
      entryType: 'repaid_to_me',
      amount: '100',
    });
    expect(screen.getByText("Rahul doesn't owe you anything right now.")).toBeInTheDocument();

    rerender(
      <AddLendingDialog
        {...props}
        party={{ kind: 'existing', counterparty: { ...rahul, netPosition: 1200 } }}
      />,
    );
    expect(screen.queryByText(/doesn't owe you/)).not.toBeInTheDocument();

    rerender(<AddLendingDialog {...props} party={{ kind: 'new', name: 'Kavita' }} />);
    expect(screen.getByText("Kavita doesn't owe you anything right now.")).toBeInTheDocument();
  });

  it('wires the party selection through the CounterpartyPicker with no separate name input', () => {
    const { props, rerender } = renderDialog();

    const stub = screen.getByTestId('counterparty-picker-stub');
    expect(stub).toHaveAttribute('id', 'cpSelect');
    expect(stub).toHaveTextContent('nobody');
    expect(screen.queryByLabelText(/New Person Name/i)).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add New Person')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Pick person'));
    expect(props.setParty).toHaveBeenCalledWith({ kind: 'new', name: 'Kavita Rao' });

    rerender(<AddLendingDialog {...props} party={{ kind: 'new', name: 'Kavita Rao' }} />);
    expect(screen.getByTestId('counterparty-picker-stub')).toHaveTextContent('new:Kavita Rao');
  });
});
