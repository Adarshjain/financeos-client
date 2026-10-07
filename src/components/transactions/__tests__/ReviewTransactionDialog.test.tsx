import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewTransactionDialog } from '@/components/transactions/ReviewTransactionDialog';
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

const txnA: Transaction = {
  id: 't-a',
  accountId: 'acc1',
  date: '2026-07-20',
  amount: -2500,
  description: 'Flagged A',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'],
  createdAt: '2026-07-20T00:00:00Z',
};

const txnB: Transaction = {
  ...txnA,
  id: 't-b',
  description: 'Flagged B',
  reviewReasons: ['DUPLICATE_SUSPECT'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReviewTransactionDialog', () => {
  it('renders nothing without a transaction', () => {
    const { container } = renderWithQuery(
      <ReviewTransactionDialog transaction={undefined} open onOpenChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-checks every review reason when opened', () => {
    renderWithQuery(<ReviewTransactionDialog transaction={txnA} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    boxes.forEach((box) => expect(box).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('re-seeds the reasons when reopened for a different transaction', () => {
    const { rerender } = renderWithQuery(
      <ReviewTransactionDialog transaction={txnA} open onOpenChange={vi.fn()} />,
    );
    // Uncheck one reason, then close and reopen on B.
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'false');

    rerender(<ReviewTransactionDialog transaction={txnA} open={false} onOpenChange={vi.fn()} />);
    rerender(<ReviewTransactionDialog transaction={txnB} open onOpenChange={vi.fn()} />);

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Possible duplicate')).toBeInTheDocument();
  });

  it('sends only the checked reasons for this transaction', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: { succeededIds: ['t-a'], skippedIds: [], failures: [] },
    } as never);
    renderWithQuery(<ReviewTransactionDialog transaction={txnA} open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: ['t-a'],
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['UNRECONCILED'],
      },
    });
  });

  it('on success toasts, invalidates transactions, closes via onOpenChange and calls onSuccess', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: { succeededIds: ['t-a'], skippedIds: [], failures: [] },
    } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithQuery(
      <ReviewTransactionDialog
        transaction={txnA}
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
      { queryClient },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Transaction marked as reviewed');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog open and reports a failure for this id', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: { succeededIds: [], skippedIds: [], failures: [{ id: 't-a', reason: 'NOT_FOUND' }] },
    } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    renderWithQuery(
      <ReviewTransactionDialog transaction={txnA} open onOpenChange={onOpenChange} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('ignores Cancel and Escape while the approval is in flight', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(api.POST).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    const onOpenChange = vi.fn();
    renderWithQuery(<ReviewTransactionDialog transaction={txnA} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approving...' })).toBeDisabled());

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).not.toHaveBeenCalled();

    resolve({ data: { succeededIds: ['t-a'], skippedIds: [], failures: [] } });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('reports Cancel through onOpenChange(false) when idle', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(<ReviewTransactionDialog transaction={txnA} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.POST).not.toHaveBeenCalled();
  });
});
