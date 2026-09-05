import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssignAccountDialog } from '@/app/(protected)/settings/gmail/AssignAccountDialog';
import { api,ApiError } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

const mockAccounts = [
  { id: 'acc-1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT },
  { id: 'acc-2', name: 'ICICI Credit Card', type: AccountType.CREDIT_CARD },
];

describe('AssignAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders account options and submits mutation', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: mockAccounts } as never);
    vi.mocked(api.POST).mockResolvedValue({
      data: { identifierId: 'id-1', reactivatedCount: 3, jobIds: ['job-1'] },
    } as never);

    const onOpenChange = vi.fn();

    renderWithQuery(
      <AssignAccountDialog
        open={true}
        onOpenChange={onOpenChange}
        item={{ id: 'ledger-1', extractedLast4: '1234' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assign Account Identifier')).toBeInTheDocument();
      expect(screen.getByText(/••1234/)).toBeInTheDocument();
      expect(screen.getAllByText('HDFC Bank').length).toBeGreaterThan(0);
    });

    const submitBtn = screen.getByRole('button', { name: /Assign & Remember/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/{ledgerId}/assign',
        expect.objectContaining({
          params: { path: { ledgerId: 'ledger-1' } },
          body: { accountId: 'acc-1' },
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('surfaces conflict error message in-dialog on rejection', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: mockAccounts } as never);
    const apiError = new ApiError(409, {
      code: 'VALIDATION_ERROR',
      message: "Identifier '1234' is already assigned to account 'Other Bank'.",
      timestamp: new Date().toISOString(),
    });
    vi.mocked(api.POST).mockRejectedValue(apiError);

    renderWithQuery(
      <AssignAccountDialog
        open={true}
        onOpenChange={vi.fn()}
        item={{ id: 'ledger-1', extractedLast4: '1234' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assign Account Identifier')).toBeInTheDocument();
      expect(screen.getAllByText('HDFC Bank').length).toBeGreaterThan(0);
    });

    const submitBtn = screen.getByRole('button', { name: /Assign & Remember/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Identifier '1234' is already assigned to account 'Other Bank'.");
    });
  });
});
