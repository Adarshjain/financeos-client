import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkPaidDialog } from './MarkPaidDialog';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const markPaid = vi.fn();
const unmarkPaid = vi.fn();
vi.mock('@/lib/query/hooks/useBills', () => ({
  useBillMutations: () => ({
    markPaid: { mutateAsync: markPaid, isPending: false },
    unmarkPaid: { mutateAsync: unmarkPaid, isPending: false },
  }),
}));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-13' }));

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <MarkPaidDialog
      open
      onOpenChange={onOpenChange}
      statementId="s1"
      cardName="HDFC Regalia Gold"
      remaining={44319}
    />,
  );
  return onOpenChange;
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));

describe('MarkPaidDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markPaid.mockResolvedValue({});
    unmarkPaid.mockResolvedValue({});
  });

  it('shows the card and what is outstanding, in full by default, with today as the paid date', () => {
    renderDialog();
    expect(screen.getByText('HDFC Regalia Gold · ₹44,319 outstanding')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Paid in full' })).toBeChecked();
    expect(screen.queryByLabelText('Amount paid')).toBeNull();
    expect(screen.getByLabelText('Paid on')).toHaveValue('13/10/2026');
  });

  it('marks the bill paid in full with the paid date, closes, and offers Undo', async () => {
    const onOpenChange = renderDialog();
    submit();

    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({ statementId: 's1', body: { paidOn: '2026-10-13' } }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refresh).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Bill marked as paid',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }),
    );
  });

  it('asks for the amount on a part payment and refuses an empty one', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: 'Part payment' }));
    expect(screen.getByLabelText('Amount paid')).toBeInTheDocument();

    submit();
    expect(screen.getByText('Enter the amount you paid')).toBeInTheDocument();
    expect(markPaid).not.toHaveBeenCalled();
  });

  it('sends the part amount as a number', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: 'Part payment' }));
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '20,000.50' } });
    submit();

    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { amount: 20000.5, paidOn: '2026-10-13' },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Partial payment recorded', expect.anything());
  });

  it('refuses a paid date in the future', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Paid on'), { target: { value: '14/10/2026' } });
    submit();
    expect(screen.getByText('The paid date cannot be in the future')).toBeInTheDocument();
    expect(markPaid).not.toHaveBeenCalled();
  });

  it('removes the mark when Undo is chosen in the toast', async () => {
    renderDialog();
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());

    const { action } = showToast.mock.calls[0][1] as { action: { onSelect: () => void } };
    action.onSelect();

    await waitFor(() => expect(unmarkPaid).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Payment mark removed'));
  });

  it('keeps the dialog open and says so when the request fails', async () => {
    markPaid.mockRejectedValue(new Error('boom'));
    const onOpenChange = renderDialog();
    submit();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Could not mark the bill as paid', { tone: 'danger' }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('cancels without calling the server', () => {
    const onOpenChange = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(markPaid).not.toHaveBeenCalled();
  });
});
