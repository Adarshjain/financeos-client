import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const manualTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Dinner split',
  source: 'manual',
  createdAt: '2026-07-25T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeleteTransactionDialog', () => {
  it('renders nothing without a transaction', () => {
    const { container } = renderWithQuery(
      <DeleteTransactionDialog transaction={undefined} open onOpenChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the confirmation with the manual-source copy when open', () => {
    renderWithQuery(<DeleteTransactionDialog transaction={manualTxn} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Delete Transaction?' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this transaction?')).toBeInTheDocument();
  });

  it('warns on a non-manual source', () => {
    renderWithQuery(
      <DeleteTransactionDialog
        transaction={{ ...manualTxn, source: 'gmail_statement' }}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/This is not a manually created transaction\. It is discouraged to delete this/),
    ).toBeInTheDocument();
  });

  it('on confirm deletes by id, toasts, invalidates transactions and accounts, closes and calls onSuccess', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithQuery(
      <DeleteTransactionDialog
        transaction={manualTxn}
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
      { queryClient },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/transactions/{id}', {
      params: { path: { id: 't1' } },
    });
    expect(toast.success).toHaveBeenCalledWith('Transaction deleted!');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.accounts.all });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('on Cancel closes without deleting', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(<DeleteTransactionDialog transaction={manualTxn} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.DELETE).not.toHaveBeenCalled();
  });

  it('on a server error toasts the error, skips onSuccess and still closes', async () => {
    vi.mocked(api.DELETE).mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    renderWithQuery(
      <DeleteTransactionDialog
        transaction={manualTxn}
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
