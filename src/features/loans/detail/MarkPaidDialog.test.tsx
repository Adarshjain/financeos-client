import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'b1', name: 'HDFC Bank Savings' }] }),
}));

import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { installment } from './loanDetail.fixtures';
import { MarkPaidDialog, type MarkPaidDialogProps } from './MarkPaidDialog';

type Mock = ReturnType<typeof vi.fn>;
const user = userEvent.setup({ pointerEventsCheck: 0 });

const emi14 = installment(14, '2026-10-05', { status: 'overdue' });
const found = {
  id: 't1',
  date: '2026-10-05',
  amount: -39052,
  description: 'SBI Home Loan EMI',
  accountId: 'b1',
} as Transaction;

function renderDialog(props: Partial<MarkPaidDialogProps> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  const view = renderWithQuery(
    <MarkPaidDialog
      installment={emi14}
      loanName="Home Loan · SBI MaxGain"
      today="2026-10-13"
      found={null}
      searching={false}
      submitting={false}
      onSubmit={onSubmit}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSubmit, onClose, ...view };
}

const amount = () => screen.getByLabelText('Amount paid') as HTMLInputElement;
const paidOn = () => screen.getByLabelText('Paid on') as HTMLInputElement;
const choice = (name: string | RegExp) => screen.getByRole('radio', { name });
const expectChosen = (name: string) => expect(choice(name)).toHaveAttribute('aria-checked', 'true');
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  (api.POST as Mock).mockResolvedValue({ data: { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0 } });
});

describe('MarkPaidDialog', () => {
  it('titles the EMI and says what is due', () => {
    renderDialog();
    expect(screen.getByText('Mark EMI #14 paid')).toBeInTheDocument();
    expect(screen.getByText('₹36,603 due 5 Oct · Home Loan · SBI MaxGain')).toBeInTheDocument();
  });

  it('without a found debit opens on recording without a transaction, with the EMI and its due date', async () => {
    renderDialog();
    expectChosen('Record payment without a transaction');
    expect(amount()).toHaveValue('36603');
    expect(paidOn()).toHaveValue('05/10/26');
    expect(screen.queryByRole('radio', { name: /Link the bank debit we found/ })).toBeNull();
    expect(choice(/Pick another bank debit/)).toBeInTheDocument();
  });

  it('shows the choices as radio rows where only the chosen one is on, and a row click chooses it', async () => {
    renderDialog({ found });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await user.click(choice(/Pick another bank debit/));
    expectChosen('Pick another bank debit');
    expect(choice(/Link the bank debit we found/)).toHaveAttribute('aria-checked', 'false');
  });

  it('records without a transaction', async () => {
    const { onSubmit, onClose } = renderDialog();
    submit('Mark paid');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: '36603', paymentDate: '2026-10-05', transactionId: undefined }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('offers the found debit first, filled in as what was paid, with the difference in words', () => {
    renderDialog({ found });
    expectChosen('Link the bank debit we found');
    expect(screen.getAllByText('"SBI Home Loan EMI" · HDFC Bank Savings · 5 Oct · ₹39,052').length).toBeGreaterThan(0);
    expect(amount()).toHaveValue('39052');
    expect(paidOn()).toHaveValue('05/10/26');
    expect(screen.getByText('₹2,449 more than EMI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid & link' })).toBeInTheDocument();
  });

  it('links the found debit and records what was paid', async () => {
    const { onSubmit } = renderDialog({ found });
    submit('Mark paid & link');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: '39052', paymentDate: '2026-10-05', transactionId: 't1' }));
  });

  it('says less than the EMI when less was paid, and nothing when it is the EMI', () => {
    renderDialog({ found: { ...found, amount: -35000 } as Transaction });
    expect(screen.getByText('₹1,603 less than EMI')).toBeInTheDocument();
    fireEvent.change(amount(), { target: { value: '36603' } });
    expect(screen.queryByText(/than EMI/)).toBeNull();
    fireEvent.change(amount(), { target: { value: '36700.5' } });
    expect(screen.getByText('₹97.50 more than EMI')).toBeInTheDocument();
  });

  it('switching to record without a transaction goes back to the EMI and its due date', async () => {
    const { onSubmit } = renderDialog({ found });
    await user.click(choice(/Record payment without a transaction/));
    expect(amount()).toHaveValue('36603');
    expect(screen.queryByText(/than EMI/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    submit('Mark paid');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: '36603', paymentDate: '2026-10-05', transactionId: undefined }));
  });

  it('picking another debit opens the picker and fills in that debit', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: {
        content: [
          { id: 't9', accountId: 'b1', amount: -36603, date: '2026-10-07', description: 'NACH EMI', links: [], obligationRefs: [] },
        ],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
      },
    });
    const { onSubmit } = renderDialog();
    await user.click(choice(/Pick another bank debit/));
    await user.click(await screen.findByRole('radio', { name: /NACH EMI/ }));
    expect(amount()).toHaveValue('36603');
    expect(paidOn()).toHaveValue('07/10/26');
    submit('Mark paid & link');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: '36603', paymentDate: '2026-10-07', transactionId: 't9' }));
    const body = (api.POST as Mock).mock.calls[0][1].body;
    expect(body.filters).toContainEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
  });

  it('does not save a picked-debit choice with no debit picked', async () => {
    const { onSubmit } = renderDialog();
    await user.click(choice(/Pick another bank debit/));
    submit('Mark paid & link');
    expect(await screen.findByText('Pick the bank debit, or record without a transaction')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the amount and date validation', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(amount(), { target: { value: '' } });
    fireEvent.change(paidOn(), { target: { value: '' } });
    submit('Mark paid');
    expect(await screen.findByText('Enter the amount you paid')).toBeInTheDocument();
    expect(screen.getByText('Enter the date you paid')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('stays open when saving fails', async () => {
    const { onSubmit, onClose } = renderDialog();
    onSubmit.mockResolvedValue(false);
    submit('Mark paid');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says it is looking while the search runs, and offers the debit when it arrives', async () => {
    const view = renderDialog({ searching: true });
    expect(screen.getByText('Looking for the bank debit…')).toBeInTheDocument();
    view.rerender(
      <MarkPaidDialog
        installment={emi14}
        loanName="Home Loan · SBI MaxGain"
        today="2026-10-13"
        found={found}
        searching={false}
        submitting={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expectChosen('Link the bank debit we found'));
    expect(amount()).toHaveValue('39052');
  });

  it('does not take the choice back from someone who already chose', async () => {
    const view = renderDialog({ searching: true });
    await user.click(choice(/Pick another bank debit/));
    view.rerender(
      <MarkPaidDialog
        installment={emi14}
        loanName="Home Loan · SBI MaxGain"
        today="2026-10-13"
        found={found}
        searching={false}
        submitting={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expectChosen('Pick another bank debit');
  });

  it('says nothing about the difference while the amount is empty', () => {
    renderDialog();
    fireEvent.change(amount(), { target: { value: '' } });
    expect(screen.queryByText(/than EMI/)).toBeNull();
  });

  it('keeps what was typed when the found debit arrives late', async () => {
    const view = renderDialog({ searching: true });
    fireEvent.change(amount(), { target: { value: '30000' } });
    view.rerender(
      <MarkPaidDialog
        installment={emi14}
        loanName="Home Loan · SBI MaxGain"
        today="2026-10-13"
        found={found}
        searching={false}
        submitting={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(amount()).toHaveValue('30000');
    expectChosen('Record payment without a transaction');
  });

  it('submitting the form from a field (Enter) records the payment', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.submit(amount().closest('form') as HTMLFormElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
