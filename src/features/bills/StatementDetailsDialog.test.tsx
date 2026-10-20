import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatementDetailsDialog } from './StatementDetailsDialog';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const updateDetails = vi.fn();
vi.mock('@/lib/query/hooks/useBills', () => ({
  useBillMutations: () => ({ updateDetails: { mutateAsync: updateDetails, isPending: false } }),
}));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-08' }));

function renderDialog(over: Partial<React.ComponentProps<typeof StatementDetailsDialog>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <StatementDetailsDialog
      open
      onOpenChange={onOpenChange}
      statementId="s1"
      cardLabel="HDFC Regalia Gold ••4321"
      statementDate="2026-10-05"
      totalDue={null}
      minimumDue={null}
      dueDate={null}
      {...over}
    />,
  );
  return onOpenChange;
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('StatementDetailsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDetails.mockResolvedValue({});
  });

  it('titles itself and names the card and statement date', () => {
    renderDialog();
    expect(screen.getByText('Set statement details')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia Gold ••4321 · statement of 5 Oct')).toBeInTheDocument();
  });

  it('subtitle is just the card when the statement has no date', () => {
    renderDialog({ statementDate: null });
    expect(screen.getByText('HDFC Regalia Gold ••4321')).toBeInTheDocument();
  });

  it('starts from the current values', () => {
    renderDialog({ totalDue: 44319, minimumDue: 2216, dueDate: '2026-10-25' });
    expect(screen.getByLabelText('Total due (₹)')).toHaveValue('44319');
    expect(screen.getByLabelText(/Minimum due/)).toHaveValue('2216');
    expect(screen.getByLabelText('Due date')).toHaveValue('25/10/2026');
  });

  it('saves the filled fields, closes, toasts and refreshes', async () => {
    const onOpenChange = renderDialog();
    fireEvent.change(screen.getByLabelText('Total due (₹)'), { target: { value: '12500.50' } });
    fireEvent.change(screen.getByLabelText(/Minimum due/), { target: { value: '625' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '25/10/2026' } });
    save();
    await waitFor(() =>
      expect(updateDetails).toHaveBeenCalledWith({
        statementId: 's1',
        body: { totalAmountDue: 12500.5, minimumAmountDue: 625, paymentDueDate: '2026-10-25' },
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(showToast).toHaveBeenCalledWith('Statement details saved');
    expect(refresh).toHaveBeenCalled();
  });

  it('sends only what changed', async () => {
    renderDialog({ totalDue: 100, minimumDue: 10, dueDate: '2026-10-25' });
    fireEvent.change(screen.getByLabelText(/Minimum due/), { target: { value: '20' } });
    save();
    await waitFor(() => expect(updateDetails).toHaveBeenCalledWith({ statementId: 's1', body: { minimumAmountDue: 20 } }));
  });

  it('refuses to save with nothing changed', async () => {
    renderDialog();
    save();
    expect(await screen.findByText('Change at least one of the fields')).toBeInTheDocument();
    expect(updateDetails).not.toHaveBeenCalled();
  });

  it('a failed save toasts the error and keeps the dialog open', async () => {
    updateDetails.mockRejectedValue(new Error('server said no'));
    const onOpenChange = renderDialog();
    fireEvent.change(screen.getByLabelText('Total due (₹)'), { target: { value: '5' } });
    save();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Cancel closes without saving', () => {
    const onOpenChange = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(updateDetails).not.toHaveBeenCalled();
  });
});
