import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CounterpartyResponse } from '@/lib/lending.types';

import { AddLendingDialog } from './AddLendingDialog';

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
vi.mock('../useCreateLending', () => ({
  useCreateLending: (opts?: { onError?: (e: unknown) => void }) => {
    onErrorOption = opts?.onError;
    return { mutateAsync, isPending: false };
  },
}));

const cp = (over: Partial<CounterpartyResponse>): CounterpartyResponse => ({
  id: 'p1',
  name: 'Rahul Sharma',
  notes: null,
  entryCount: 2, linkedEntryCount: 0,
  netPosition: 1200,
  repaidByYou: 0,
  repaidToYou: 0,
  totalBorrowed: 0,
  totalLent: 1200,
  ...over,
});
const searchTerms: string[] = [];
vi.mock('@/lib/query/hooks/useCounterparties', () => ({
  useCounterpartySearch: (q: string) => {
    searchTerms.push(q);
    return { data: { content: [cp({}), cp({ id: 'p2', name: 'Priya Nair', netPosition: -500 })] } };
  },
}));

// The picker is covered by its own tests; here it is a stand-in that can pick and clear a transaction.
vi.mock('@/features/transactions/TransactionPickerField', () => ({
  TransactionPickerField: (p: {
    label?: string;
    placeholder?: string;
    value: { id: string } | null;
    direction?: string;
    onSelect: (t: unknown) => void;
    onClear: () => void;
  }) => (
    <div data-testid="tx-picker" data-direction={p.direction}>
      <span>{p.label ?? 'Transaction (optional)'}</span>
      <span>{p.placeholder}</span>
      <span>{p.value ? `picked ${p.value.id}` : 'no transaction'}</span>
      <button type="button" onClick={() => p.onSelect({ id: 'tx1', amount: -500, date: '2026-10-12', accountId: 'a1' })}>
        Pick tx1
      </button>
      <button type="button" onClick={p.onClear}>
        Remove tx
      </button>
    </div>
  ),
}));

const onClose = vi.fn();
const user = userEvent.setup({ pointerEventsCheck: 0 });

const pickPerson = async (name: RegExp) => {
  await user.click(screen.getByRole('combobox', { name: /^Person/ }));
  await user.click(screen.getByRole('option', { name }));
};
const amount = () => screen.getByRole('textbox', { name: /^Amount/ });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

beforeEach(() => {
  vi.clearAllMocks();
  searchTerms.length = 0;
  mutateAsync.mockResolvedValue({});
});

describe('AddLendingDialog', () => {
  it('opens with the Legacy fields: person, entry type, amount, date, expected return date, notes', () => {
    render(<AddLendingDialog onClose={onClose} />);
    expect(screen.getByText('Add ledger entry')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Person/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Entry type/ })).toHaveTextContent('I lent money');
    expect(amount()).toHaveValue('');
    expect(screen.getByLabelText('Date')).toHaveValue('13/10/2026');
    expect(screen.getByLabelText(/Expected return date/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Notes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save entry' })).toBeInTheDocument();
  });

  it('asks for a person, then an amount, and does not call the server', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    save();
    expect(await screen.findByText('Pick a person')).toBeInTheDocument();
    await pickPerson(/Rahul Sharma/);
    save();
    expect(await screen.findByText('Amount must be greater than zero')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows each person with their balance', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await user.click(screen.getByRole('combobox', { name: /^Person/ }));
    expect(screen.getByRole('option', { name: /Rahul Sharma/ })).toHaveTextContent('Owes you ₹1,200.00 · 2 entries');
    expect(screen.getByRole('option', { name: /Priya Nair/ })).toHaveTextContent('You owe ₹500.00');
  });

  it('saves an entry for an existing person, closes, refreshes and says so', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await pickPerson(/Rahul Sharma/);
    fireEvent.change(amount(), { target: { value: '5000' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Notes/ }), { target: { value: ' dinner ' } });
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        counterpartyId: 'p1',
        direction: 'lent',
        kind: 'principal',
        amount: 5000,
        entryDate: '2026-10-13',
        notes: 'dinner',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Lending recorded successfully');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('adds a typed name as a new person', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await user.click(screen.getByRole('combobox', { name: /^Person/ }));
    await user.type(screen.getByPlaceholderText('Type a name'), 'Asha Verma');
    await user.click(screen.getByRole('button', { name: 'Add "Asha Verma"' }));
    expect(screen.getByRole('combobox', { name: /^Person/ })).toHaveTextContent('Asha Verma');
    fireEvent.change(amount(), { target: { value: '300' } });
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const body = mutateAsync.mock.calls[0][0];
    expect(body.newCounterpartyName).toBe('Asha Verma');
    expect(body.counterpartyId).toBeUndefined();
  });

  it('sends each entry type as its direction and kind, and hides the expected date for repayments', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await pickPerson(/Rahul Sharma/);
    await user.click(screen.getByRole('combobox', { name: /^Entry type/ }));
    await user.click(screen.getByRole('option', { name: 'They paid me back' }));
    expect(screen.queryByLabelText(/Expected return date/)).toBeNull();
    fireEvent.change(amount(), { target: { value: '200' } });
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ direction: 'borrowed', kind: 'settlement', expectedReturnDate: undefined });
  });

  it('warns, without blocking, when a settlement is more than what is owed', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await pickPerson(/Rahul Sharma/);
    await user.click(screen.getByRole('combobox', { name: /^Entry type/ }));
    await user.click(screen.getByRole('option', { name: 'They paid me back' }));
    fireEvent.change(amount(), { target: { value: '5000' } });
    expect(screen.getByText("That's more than the ₹1,200.00 Rahul Sharma owes you.")).toBeInTheDocument();
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it('keeps the dialog open and toasts the failure when saving fails', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await pickPerson(/Rahul Sharma/);
    fireEvent.change(amount(), { target: { value: '5000' } });
    mutateAsync.mockRejectedValueOnce(new Error('boom'));
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    onErrorOption?.(new Error('Server said no'));
    expect(toast).toHaveBeenCalledWith('Failed to create lending', { tone: 'danger' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without saving', () => {
    render(<AddLendingDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('has an optional Linked transaction field', () => {
    render(<AddLendingDialog onClose={onClose} />);
    expect(screen.getByTestId('tx-picker')).toHaveTextContent('Linked transaction (optional)');
  });

  it('links the picked transaction when saving, and sends none when nothing was picked', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    await pickPerson(/Rahul Sharma/);
    fireEvent.change(amount(), { target: { value: '800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pick tx1' }));
    expect(screen.getByText('picked tx1')).toBeInTheDocument();
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx1' })));
  });

  it('filters the picker by the money direction and forgets a pick when the direction flips', async () => {
    render(<AddLendingDialog onClose={onClose} />);
    expect(screen.getByTestId('tx-picker')).toHaveAttribute('data-direction', 'lent');
    fireEvent.click(screen.getByRole('button', { name: 'Pick tx1' }));
    await user.click(screen.getByRole('combobox', { name: /^Entry type/ }));
    await user.click(screen.getByRole('option', { name: 'They paid me back' }));
    expect(screen.getByText('no transaction')).toBeInTheDocument();
    expect(screen.getByTestId('tx-picker')).toHaveAttribute('data-direction', 'borrowed');
  });

  it('opens with the given person already picked', async () => {
    render(<AddLendingDialog onClose={onClose} initialPerson={cp({ id: 'p9', name: 'Meera Rao' })} />);
    expect(screen.getByRole('combobox', { name: /^Person/ })).toHaveTextContent('Meera Rao');
    fireEvent.change(amount(), { target: { value: '100' } });
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ counterpartyId: 'p9' })));
  });
});
