import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewBrowser } from '@/components/transactions/ReviewBrowser';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT, lastStatementDate: '2026-06-30' },
  {
    id: 'acc2',
    name: 'ICICI Card',
    type: AccountType.CREDIT_CARD,
    last4: '0002',
    creditLimit: 100000,
    lastStatementDate: null,
  },
];

const mockReviewTxn: Transaction = {
  id: 't-review-1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: -1200,
  description: 'Unverified Merchant',
  sourcedDescription: 'UNVERIFIED MERCHANT',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['CATEGORY_UNVERIFIED'],
  balance: 15000,
  createdAt: '2026-06-15T00:00:00Z',
};

// Seeds the accounts query synchronously, mirroring the SSR hydration that
// happens in production (review/page.tsx prefetches accounts before mount).
// Without this, useReviewBrowser's initial `appliedAccountIds` state would
// seed from an empty accounts list and never select any account.
function renderReviewBrowser() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), mockAccounts);
  return renderWithQuery(<ReviewBrowser />, { queryClient });
}

describe('ReviewBrowser (CD-1, CD-2a, CD-2b, CD-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to coveredByStatement=true filter clause (CD-1)', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation(async (path: string, options: any) => {
      if (path === '/api/v1/transactions/search') {
        return {
          data: {
            content: [mockReviewTxn],
            number: 0,
            size: 50,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            empty: false,
          },
        };
      }
      return { data: null };
    });

    renderReviewBrowser();

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalled();
    });

    const calls = (api.POST as ReturnType<typeof vi.fn>).mock.calls;
    const searchCall = calls.find((c: any[]) => c[0] === '/api/v1/transactions/search');
    expect(searchCall).toBeDefined();

    const searchCallFilters = searchCall![1].body.filters;
    const coveredClause = searchCallFilters.find((f: any) => f.field === 'coveredByStatement');
    expect(coveredClause).toEqual({ field: 'coveredByStatement', operator: 'is', value: true });

    const reviewTypeClause = searchCallFilters.find((f: any) => f.field === 'reviewType');
    expect(reviewTypeClause).toEqual({ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' });
  });

  it('queue fetch rejection clears loading state without infinite spinner (CD-2a)', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network offline'));

    renderReviewBrowser();

    await waitFor(() => {
      expect(screen.queryByText(/Loading transactions/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('No transactions need review')).toBeInTheDocument();
  });

  it('filters by active review reason segment when reason pill is clicked (CD-3)', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
      if (path === '/api/v1/transactions/search') {
        return {
          data: {
            content: [mockReviewTxn],
            number: 0,
            size: 50,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            empty: false,
          },
        };
      }
      return { data: null };
    });

    renderReviewBrowser();

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Click Category reason segment pill
    const categoryFilterBtn = screen.getByRole('button', { name: 'Category' });
    fireEvent.click(categoryFilterBtn);

    await waitFor(() => {
      const calls = (api.POST as ReturnType<typeof vi.fn>).mock.calls;
      const lastSearchCall = calls[calls.length - 1];
      const filters = lastSearchCall[1].body.filters;
      const reasonClause = filters.find((f: any) => f.field === 'reviewReason');
      expect(reasonClause).toEqual({ field: 'reviewReason', operator: 'is', value: 'CATEGORY_UNVERIFIED' });
    });
  });

  it('selects item and triggers batch approve flow', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
      if (path === '/api/v1/transactions/search') {
        return {
          data: {
            content: [mockReviewTxn],
            number: 0,
            size: 50,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            empty: false,
          },
        };
      }
      if (path === '/api/v1/transactions/batch-review') {
        return {
          data: {
            succeededIds: ['t-review-1'],
            skippedIds: [],
            failures: [],
          },
        };
      }
      return { data: null };
    });

    renderReviewBrowser();

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Select row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Click Approve button in toolbar
    const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    // Confirm dialog opens, click Approve button in dialog
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Approve Transactions' })).toBeInTheDocument();
    });

    const confirmApproveBtns = screen.getAllByRole('button', { name: 'Approve' });
    fireEvent.click(confirmApproveBtns[confirmApproveBtns.length - 1]);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: ['t-review-1'],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: ['CATEGORY_UNVERIFIED'],
        },
      });
    });
  });

  it('selects item and triggers batch delete flow', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
      if (path === '/api/v1/transactions/search') {
        return {
          data: {
            content: [mockReviewTxn],
            number: 0,
            size: 50,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            empty: false,
          },
        };
      }
      if (path === '/api/v1/transactions/batch-delete') {
        return {
          data: {
            succeededIds: ['t-review-1'],
            failures: [],
          },
        };
      }
      return { data: null };
    });

    renderReviewBrowser();

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Select row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Click Delete button in toolbar
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    // Confirmation dialog opens, click Confirm/Delete in ConfirmationDialog
    await waitFor(() => {
      expect(screen.getByText('Delete Transactions?')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-delete', {
        body: {
          transactionIds: ['t-review-1'],
        },
      });
    });
  });
});
