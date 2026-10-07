import '@/test/next-mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

const mutations = vi.hoisted(() => {
  const m = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    createAccountMutation: m(),
    updateAccountMutation: m(),
    closeAccountMutation: m(),
    reopenAccountMutation: m(),
    deleteAccountMutation: m(),
    previewGmailCleanupMutation: m(),
    executeGmailCleanupMutation: m(),
  };
});

vi.mock('@/components/accounts/account-form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => mutations,
}));

import { AccountForm } from '../AccountForm';

function submitForm() {
  fireEvent.submit(document.getElementById('account-form') as HTMLFormElement);
}

describe('AccountForm: ingest watermark is a bank/card-only field', () => {
  beforeEach(() => {
    for (const m of Object.values(mutations)) {
      m.mutateAsync.mockReset();
    }
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({
      account: { id: 'new', name: 'x' },
      failedIdentifiers: [],
    });
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue({ id: 'g1', name: 'x' });
  });

  it('Wallet/Cash create: no "Ingest From Date" field and no ingestFromDate in the request body', async () => {
    renderWithQuery(<AccountForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Wallet/Cash' }));

    expect(screen.queryByLabelText(/Ingest From Date/)).toBeNull();
    expect(screen.getByText('Configuration')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Petty Cash' } });
    submitForm();

    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalledTimes(1));
    const { body } = mutations.createAccountMutation.mutateAsync.mock.calls[0][0];
    expect(body.type).toBe('generic');
    expect(body.name).toBe('Petty Cash');
    expect('ingestFromDate' in body).toBe(false);
  });

  it('Broker create: no "Ingest From Date" field and no ingestFromDate in the request body', async () => {
    renderWithQuery(<AccountForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Broker' }));

    expect(screen.queryByLabelText(/Ingest From Date/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Zerodha Demat' } });
    fireEvent.change(screen.getByLabelText('Broker Provider'), { target: { value: 'Zerodha' } });
    submitForm();

    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalledTimes(1));
    const { body } = mutations.createAccountMutation.mutateAsync.mock.calls[0][0];
    expect(body.type).toBe('broker');
    expect(body.provider).toBe('Zerodha');
    expect('ingestFromDate' in body).toBe(false);
  });

  it('Bank create still carries the field (null when left empty)', async () => {
    renderWithQuery(<AccountForm />);

    expect(screen.getByLabelText(/Ingest From Date/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'HDFC Salary' } });
    submitForm();

    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalledTimes(1));
    const { body } = mutations.createAccountMutation.mutateAsync.mock.calls[0][0];
    expect(body.type).toBe('bank_account');
    expect('ingestFromDate' in body).toBe(true);
    expect(body.ingestFromDate).toBeNull();
  });

  it('Wallet/Cash edit: never runs the Gmail cleanup preview and sends no ingestFromDate, even with a stale value', async () => {
    const stale = {
      id: 'g1',
      name: 'Old Wallet',
      type: 'generic',
      excludeFromNetAsset: false,
      financialPosition: 'asset',
      ingestFromDate: '2025-03-01', // pre-V88 row shape; the server no longer returns this
      warnings: [],
    };
    renderWithQuery(<AccountForm account={stale as any} />);

    expect(screen.queryByLabelText(/Ingest From Date/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Renamed Wallet' } });
    submitForm();

    await waitFor(() => expect(mutations.updateAccountMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutations.previewGmailCleanupMutation.mutateAsync).not.toHaveBeenCalled();
    const { id, body } = mutations.updateAccountMutation.mutateAsync.mock.calls[0][0];
    expect(id).toBe('g1');
    expect(body.type).toBe('generic');
    expect(body.name).toBe('Renamed Wallet');
    expect('ingestFromDate' in body).toBe(false);
  });
});
