import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewTransaction } from '@/components/transactions/ReviewTransaction';
import { api,ApiError } from '@/lib/api/client';
import type { BatchReviewResponse, ReviewType, Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

type ReviewResult = { data: BatchReviewResponse };

const baseTxn: Transaction = {
  id: 't-1',
  accountId: 'acc1',
  date: '2026-07-20',
  amount: -2500,
  description: 'Flagged Merchant',
  sourcedDescription: 'FLAGGED MERCHANT',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'],
  balance: 10000,
  createdAt: '2026-07-20T00:00:00Z',
};

/** Opens the reason picker and returns the dialog's Approve button. */
async function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: /Review/i }));
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
  });
  return screen.getByRole('button', { name: /^Approv/i });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReviewTransaction', () => {
  describe('visibility', () => {
    it.each<ReviewType>(['AUTO_REVIEWED', 'MANUALLY_REVIEWED', 'NA'])(
      'renders nothing when reviewType is %s',
      (reviewType) => {
        const { container } = renderWithQuery(
          <ReviewTransaction transaction={{ ...baseTxn, reviewType }} />,
        );

        expect(container).toBeEmptyDOMElement();
      },
    );

    it('renders nothing when reviewType is absent', () => {
      const { reviewType: _omitted, ...withoutReviewType } = baseTxn;
      const { container } = renderWithQuery(<ReviewTransaction transaction={withoutReviewType} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('offers the Review action when the transaction needs review', () => {
      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);

      expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument();
    });

    // The backend never flags a transaction without at least one reason. If that
    // invariant is ever broken there is nothing to clear, so offer no action
    // rather than send an approval whose meaning is undefined.
    it('renders nothing when a flagged transaction carries no reasons', () => {
      const { container } = renderWithQuery(
        <ReviewTransaction transaction={{ ...baseTxn, reviewReasons: [] }} />,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when reviewReasons is absent', () => {
      const { reviewReasons: _omitted, ...withoutReasons } = baseTxn;
      const { container } = renderWithQuery(<ReviewTransaction transaction={withoutReasons} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('reason picker', () => {
    it("lists the transaction's own reasons with catalog labels, all pre-checked", async () => {
      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      await openPicker();

      const unreconciled = screen.getByRole('checkbox', { name: 'Unreconciled' });
      const category = screen.getByRole('checkbox', { name: 'Category unverified' });

      expect(unreconciled).toBeChecked();
      expect(category).toBeChecked();
      // Reasons not on this transaction must not be offered.
      expect(screen.queryByRole('checkbox', { name: 'Possible duplicate' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('re-checks every reason when reopened after unchecking one', async () => {
      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      await openPicker();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Unreconciled' }));
      expect(screen.getByRole('checkbox', { name: 'Unreconciled' })).not.toBeChecked();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Approve Transaction' })).not.toBeInTheDocument();
      });

      await openPicker();
      expect(screen.getByRole('checkbox', { name: 'Unreconciled' })).toBeChecked();
    });

    it('blocks approval once every reason is unchecked', async () => {
      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      const approve = await openPicker();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Unreconciled' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Category unverified' }));

      expect(approve).toBeDisabled();
      fireEvent.click(approve);
      expect(api.POST).not.toHaveBeenCalled();
    });

    it('restores a reason to the request when re-checked', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: ['t-1'], skippedIds: [], failures: [] },
      });

      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      const approve = await openPicker();

      const unreconciled = screen.getByRole('checkbox', { name: 'Unreconciled' });
      fireEvent.click(unreconciled);
      expect(unreconciled).not.toBeChecked();
      fireEvent.click(unreconciled);
      expect(unreconciled).toBeChecked();

      fireEvent.click(approve);

      // Order of reasons is not part of the contract, only membership.
      await waitFor(() => {
        expect(api.POST).toHaveBeenCalledTimes(1);
      });
      const [path, options] = (api.POST as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(path).toBe('/api/v1/transactions/batch-review');
      expect(options.body.transactionIds).toEqual(['t-1']);
      expect(options.body.reviewType).toBe('MANUALLY_REVIEWED');
      expect([...options.body.reviewReasons].sort()).toEqual(['CATEGORY_UNVERIFIED', 'UNRECONCILED']);
    });

    it('does not call the action when cancelled', async () => {
      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      await openPicker();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Approve Transaction' })).not.toBeInTheDocument();
      });
      expect(api.POST).not.toHaveBeenCalled();
    });
  });

  describe('approval request', () => {
    it('marks the single transaction MANUALLY_REVIEWED with every checked reason', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: ['t-1'], skippedIds: [], failures: [] },
      });

      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
          body: {
            transactionIds: ['t-1'],
            reviewType: 'MANUALLY_REVIEWED',
            reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'],
          },
        });
      });
    });

    it('sends only the reasons left checked (partial approval)', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: ['t-1'], skippedIds: [], failures: [] },
      });

      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      const approve = await openPicker();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Unreconciled' }));
      fireEvent.click(approve);

      await waitFor(() => {
        expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
          body: {
            transactionIds: ['t-1'],
            reviewType: 'MANUALLY_REVIEWED',
            reviewReasons: ['CATEGORY_UNVERIFIED'],
          },
        });
      });
    });

    it('always sends a non-empty reason list', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: ['t-1'], skippedIds: [], failures: [] },
      });

      renderWithQuery(
        <ReviewTransaction transaction={{ ...baseTxn, reviewReasons: ['DUPLICATE_SUSPECT'] }} />,
      );
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
          body: {
            transactionIds: ['t-1'],
            reviewType: 'MANUALLY_REVIEWED',
            reviewReasons: ['DUPLICATE_SUSPECT'],
          },
        });
      });
      // Never `undefined` and never `[]` — the backend has no reason-less case.
      const sentReasons = (api.POST as ReturnType<typeof vi.fn>).mock.calls[0][1].body.reviewReasons;
      expect(sentReasons).toEqual(expect.arrayContaining(['DUPLICATE_SUSPECT']));
      expect(sentReasons).toHaveLength(1);
    });

    it('fires the action once when Approve is clicked repeatedly in flight', async () => {
      let release: (value: ReviewResult) => void = () => {};
      (api.POST as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise<ReviewResult>((resolve) => {
          release = resolve;
        }),
      );

      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      const approve = await openPicker();

      fireEvent.click(approve);
      await waitFor(() => expect(approve).toBeDisabled());
      fireEvent.click(approve);
      fireEvent.click(approve);

      release({ data: { succeededIds: ['t-1'], skippedIds: [], failures: [] } });

      await waitFor(() => {
        expect(api.POST).toHaveBeenCalledTimes(1);
      });
    });

    it('cannot be dismissed while the approval is in flight', async () => {
      let release: (value: ReviewResult) => void = () => {};
      (api.POST as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise<ReviewResult>((resolve) => {
          release = resolve;
        }),
      );
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      const approve = await openPicker();
      fireEvent.click(approve);

      await waitFor(() => expect(approve).toBeDisabled());

      // Cancel is locked, and Escape must not tear the dialog down mid-request.
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
      expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();

      release({ data: { succeededIds: ['t-1'], skippedIds: [], failures: [] } });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('outcome handling', () => {
    it('confirms, closes and refreshes the parent when the id succeeded', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: ['t-1'], skippedIds: [], failures: [] },
      });
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
      expect(toast.success).toHaveBeenCalledWith('Transaction marked as reviewed');
      expect(screen.queryByRole('heading', { name: 'Approve Transaction' })).not.toBeInTheDocument();
    });

    it('warns and stays open when the id was skipped', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { succeededIds: [], skippedIds: ['t-1'], failures: [] },
      });
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith('Nothing to approve — no matching review reasons');
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
    });

    it('surfaces a per-id failure using its human-readable label', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          succeededIds: [],
          skippedIds: [],
          failures: [{ id: 't-1', reason: 'NOT_OWNED' }],
        },
      });
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Access denied (not owned)');
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
    });

    it('passes through an unrecognised failure code rather than hiding it', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          succeededIds: [],
          skippedIds: [],
          failures: [{ id: 't-1', reason: 'SOME_NEW_CODE' }],
        },
      });

      renderWithQuery(<ReviewTransaction transaction={baseTxn} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('SOME_NEW_CODE');
      });
    });

    it('ignores outcomes reported for other transaction ids', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          succeededIds: ['t-someone-else'],
          skippedIds: [],
          failures: [{ id: 't-other', reason: 'NOT_FOUND' }],
        },
      });
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to mark transaction as reviewed');
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('reports the server error message when the action fails', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError(500, { code: 'ERR', message: 'Review service unavailable', timestamp: '' }),
      );
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      fireEvent.click(await openPicker());

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Review service unavailable');
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('reports a thrown error instead of leaving the dialog stuck', async () => {
      (api.POST as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network offline'));
      const onSuccess = vi.fn();

      renderWithQuery(<ReviewTransaction transaction={baseTxn} onSuccess={onSuccess} />);
      const approve = await openPicker();
      fireEvent.click(approve);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network offline');
      });
      expect(onSuccess).not.toHaveBeenCalled();
      // Recoverable: the user can retry rather than being locked out.
      expect(approve).toBeEnabled();
    });
  });
});
