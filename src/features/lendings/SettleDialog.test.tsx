import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettleDialog } from './SettleDialog';

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const mutateAsync = vi.fn();
let onErrorOption: ((e: unknown) => void) | undefined;
vi.mock('./useCreateLending', () => ({
  useCreateLending: (opts?: { onError?: (e: unknown) => void }) => {
    onErrorOption = opts?.onError;
    return { mutateAsync, isPending: false };
  },
}));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-13' }));

// The picker is covered by its own tests; here it is a stand-in that can pick and clear a transaction.
vi.mock('@/features/transactions/TransactionPickerField', () => ({
  TransactionPickerField: (p: {
    label?: string;
    value: { id: string } | null;
    direction?: string;
    onSelect: (t: unknown) => void;
    onClear: () => void;
  }) => (
    <div data-testid="tx-picker" data-direction={p.direction}>
      <span>{p.label ?? 'Transaction (optional)'}</span>
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

function renderDialog(direction: 'lent' | 'borrowed' = 'lent', balance = 12000, name = 'Priya Nair') {
  const onOpenChange = vi.fn();
  render(
    <SettleDialog
      open
      onOpenChange={onOpenChange}
      counterpartyId="C1"
      name={name}
      direction={direction}
      balance={balance}
    />,
  );
  return onOpenChange;
}

const amount = () => screen.getByLabelText('Amount') as HTMLInputElement;
const setAmount = (v: string) => fireEvent.change(amount(), { target: { value: v } });
const record = () => fireEvent.click(screen.getByRole('button', { name: 'Record settlement' }));

describe('SettleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({});
  });

  it('opens on the first name with the balance, prefilled amount and today', () => {
    renderDialog('borrowed');
    expect(screen.getByText('Settle up with Priya')).toBeInTheDocument();
    expect(screen.getByText("Balance ₹12,000 in Priya's favour")).toBeInTheDocument();
    expect(amount()).toHaveValue('12000');
    expect(screen.getByLabelText('Date')).toHaveValue('13/10/2026');
    expect(screen.getByRole('radio', { name: 'Paid' })).toBeChecked();
  });

  it('says the balance is in your favour when they owe you', () => {
    renderDialog('lent');
    expect(screen.getByText('Balance ₹12,000 in your favour')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Received' })).toBeChecked();
  });

  it('records a settlement when they owe you: borrowed direction, settlement kind', async () => {
    const onOpenChange = renderDialog('lent', 15000, 'Rahul Sharma');
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: ' Settled via UPI ' } });
    record();
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        counterpartyId: 'C1',
        direction: 'borrowed',
        kind: 'settlement',
        amount: 15000,
        entryDate: '2026-10-13',
        notes: 'Settled via UPI',
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Entry added');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('records a settlement when you owe them: lent direction, settlement kind', async () => {
    renderDialog('borrowed');
    record();
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'lent', kind: 'settlement', amount: 12000, notes: undefined }),
      ),
    );
  });

  it('the "more" segment records a new principal entry and the button says Add entry', async () => {
    renderDialog('lent');
    fireEvent.click(screen.getByRole('radio', { name: 'Lent more' }));
    expect(screen.queryByRole('button', { name: 'Record settlement' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ direction: 'lent', kind: 'principal' })),
    );
  });

  it('the "more" segment when you owe them is a borrowed principal', async () => {
    renderDialog('borrowed');
    fireEvent.click(screen.getByRole('radio', { name: 'Borrowed more' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ direction: 'borrowed', kind: 'principal' })),
    );
  });

  it('Full, Half and Custom fill the amount; Custom focuses it', () => {
    renderDialog('lent', 12000);
    expect(screen.getByRole('button', { name: 'Full ₹12,000' })).toHaveClass('bg-brand-tint');
    fireEvent.click(screen.getByRole('button', { name: 'Half' }));
    expect(amount()).toHaveValue('6000');
    expect(screen.getByRole('button', { name: 'Half' })).toHaveClass('bg-brand-tint');
    fireEvent.click(screen.getByRole('button', { name: 'Full ₹12,000' }));
    expect(amount()).toHaveValue('12000');
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(amount()).toHaveFocus();
  });

  it('typing an amount selects Custom', () => {
    renderDialog('lent', 12000);
    setAmount('500');
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveClass('bg-brand-tint');
    expect(screen.getByRole('button', { name: 'Full ₹12,000' })).not.toHaveClass('bg-brand-tint');
  });

  it('a zero or empty amount shows the validation and does not submit', async () => {
    renderDialog();
    setAmount('');
    record();
    expect(await screen.findByText('Amount must be greater than zero')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('warns, without blocking, when the settlement is more than the balance', async () => {
    renderDialog('lent', 12000, 'Rahul Sharma');
    setAmount('20000');
    expect(screen.getByText("That's more than the ₹12,000.00 Rahul owes you.")).toBeInTheDocument();
    record();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ amount: 20000 })));
  });

  it('no warning on the "more" segment', async () => {
    renderDialog('lent', 12000);
    setAmount('20000');
    fireEvent.click(screen.getByRole('radio', { name: 'Lent more' }));
    expect(screen.queryByText(/more than/)).toBeNull();
  });

  it('a failed save keeps the sheet open and its error toast reads "Failed to create lending"', async () => {
    mutateAsync.mockRejectedValue(new Error('boom'));
    const onOpenChange = renderDialog();
    record();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
    onErrorOption!(undefined);
    expect(showToast).toHaveBeenCalledWith('Failed to create lending', { tone: 'danger' });
  });

  it('Cancel closes without saving', () => {
    const onOpenChange = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('has an optional Transaction field and records without one', async () => {
    renderDialog('lent');
    expect(screen.getByTestId('tx-picker')).toHaveTextContent('Transaction (optional)');
    record();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].transactionId).toBeUndefined();
  });

  it('links the picked transaction to the entry, and Remove drops it again', async () => {
    renderDialog('lent', 15000, 'Rahul Sharma');
    expect(screen.getByTestId('tx-picker')).toHaveAttribute('data-direction', 'borrowed');
    fireEvent.click(screen.getByRole('button', { name: 'Pick tx1' }));
    expect(screen.getByText('picked tx1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove tx' }));
    expect(screen.getByText('no transaction')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick tx1' }));
    record();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx1' })));
  });

  it('forgets the pick when the segment flips the money direction', () => {
    renderDialog('lent');
    fireEvent.click(screen.getByRole('button', { name: 'Pick tx1' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Lent more' }));
    expect(screen.getByText('no transaction')).toBeInTheDocument();
    expect(screen.getByTestId('tx-picker')).toHaveAttribute('data-direction', 'lent');
  });

  it('tells the page once the entry is recorded', async () => {
    const onRecorded = vi.fn();
    render(
      <SettleDialog open onOpenChange={vi.fn()} counterpartyId="C1" name="Rahul Sharma" direction="lent" balance={100} onRecorded={onRecorded} />,
    );
    record();
    await waitFor(() => expect(onRecorded).toHaveBeenCalledTimes(1));
  });
});
