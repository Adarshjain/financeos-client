import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DeleteStatementDialog } from '../DeleteStatementDialog';

const PREVIEW_PATH = '/api/v1/accounts/{accountId}/statements/{statementId}/deletion-preview';
const DELETE_PATH = '/api/v1/accounts/{accountId}/statements/{statementId}';

function preview(overrides: Partial<Record<string, number>> = {}) {
  return { transactionsToDelete: 5, transactionsKept: 0, linkedToRecords: 0, alertsToReopen: 0, ...overrides };
}

function renderDialog(props: Partial<React.ComponentProps<typeof DeleteStatementDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();
  const utils = renderWithQuery(
    <DeleteStatementDialog
      accountId="acc-1"
      statementId="stmt-1"
      source="file_upload"
      periodLabel="23 Feb – 27 Feb 2026"
      open
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
      {...props}
    />
  );
  return { ...utils, onOpenChange, onDeleted };
}

describe('DeleteStatementDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('asks the server what the statement added, for this account and statement', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: preview() } as never);
    renderDialog();

    expect(await screen.findByText('5 transactions')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(PREVIEW_PATH, {
      params: { path: { accountId: 'acc-1', statementId: 'stmt-1' } },
    });
    expect(screen.getByText(/Removes the 23 Feb – 27 Feb 2026 statement/)).toBeInTheDocument();
    expect(screen.getByText('You can upload the same file again afterwards.')).toBeInTheDocument();
  });

  it('does not fetch the preview while closed', () => {
    renderDialog({ open: false });

    expect(api.GET).not.toHaveBeenCalled();
  });

  it('lists linked records, kept rows and reopened alerts only when there are any', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: preview({ transactionsToDelete: 1, transactionsKept: 2, linkedToRecords: 1, alertsToReopen: 3 }),
    } as never);
    renderDialog({ source: 'gmail' });

    expect(await screen.findByText('1 transaction')).toBeInTheDocument();
    expect(screen.getByText(/1 of them is linked to a loan, lending, dividend or transfer/)).toBeInTheDocument();
    expect(screen.getByText(/2 transactions it only matched/)).toBeInTheDocument();
    expect(screen.getByText(/3 email alerts go back to review as unreconciled/)).toBeInTheDocument();
    expect(screen.getByText(/Gmail won't fetch this statement again on its own/)).toBeInTheDocument();
  });

  it('says nothing will be deleted when the statement created no rows of its own', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: preview({ transactionsToDelete: 0, transactionsKept: 1 }) } as never);
    renderDialog();

    expect(await screen.findByText(/created no transactions that only this statement covers/)).toBeInTheDocument();
    expect(screen.queryByText(/linked to a loan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/back to review/)).not.toBeInTheDocument();
  });

  it('keeps Delete disabled until the preview has loaded, and on a preview error', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('network down'));
    renderDialog();

    expect(screen.getByRole('button', { name: 'Delete statement' })).toBeDisabled();
    expect(await screen.findByText('Could not check this statement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete statement' })).toBeDisabled();
  });

  it('deletes, closes, reports how many rows went and refreshes what the delete can change', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: preview() } as never);
    vi.mocked(api.DELETE).mockResolvedValue({
      data: { transactionsDeleted: 5, transactionsKept: 0, alertsReopened: 0, duplicateFlagsCleared: 0 },
    } as never);
    const { onOpenChange, onDeleted, queryClient } = renderDialog();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await screen.findByText('5 transactions');

    fireEvent.click(screen.getByRole('button', { name: 'Delete statement' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith(DELETE_PATH, {
      params: { path: { accountId: 'acc-1', statementId: 'stmt-1' } },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalledWith('Statement deleted, 5 transactions removed');
    const invalidated = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    for (const key of [keys.statements.all, keys.transactions.all, keys.bills.all, keys.inbox.all, keys.accounts.all,
      keys.lendings.all, keys.rewards.all]) {
      expect(invalidated).toContain(JSON.stringify(key));
    }
  });

  it('stays open and reports the error when the delete fails', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: preview() } as never);
    const failure = new Error('boom');
    vi.mocked(api.DELETE).mockRejectedValue(failure);
    const { onOpenChange, onDeleted } = renderDialog();
    await screen.findByText('5 transactions');

    fireEvent.click(screen.getByRole('button', { name: 'Delete statement' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(failure, 'Failed to delete statement'));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Cancel closes without deleting', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: preview() } as never);
    const { onOpenChange } = renderDialog();
    await screen.findByText('5 transactions');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});
