import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CounterpartySelection } from '@/lib/lending.types';
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
    direction: 'lent' as LendingDirection,
    setDirection: vi.fn(),
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

  it('passes the current direction through to the picker and lets the radio drive it', () => {
    const { props, rerender } = renderDialog({ direction: 'lent' });

    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-direction', 'lent');

    fireEvent.click(screen.getByLabelText(/I received money \(Borrowed\)/i));
    expect(props.setDirection).toHaveBeenCalledWith('borrowed');

    rerender(
      <AddLendingDialog
        {...props}
        direction="borrowed"
      />,
    );
    expect(screen.getByTestId('transaction-picker-stub')).toHaveAttribute('data-direction', 'borrowed');
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
