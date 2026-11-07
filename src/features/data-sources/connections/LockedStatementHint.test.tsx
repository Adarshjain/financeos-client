import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LockedStatementHint } from './LockedStatementHint';

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/data-sources/connections',
  useSearchParams: () => new URLSearchParams(),
}));
const accounts = vi.hoisted(() => ({ data: [] as unknown[] | undefined, isError: false }));
const account = vi.hoisted(() => ({
  data: undefined as unknown,
  isError: false,
  isSuccess: false,
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccount: () => account,
  useAccounts: () => accounts,
}));
const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
vi.mock('@/features/accounts/form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => ({
    createAccountMutation: mutation(),
    updateAccountMutation: mutation(),
    closeAccountMutation: mutation(),
    reopenAccountMutation: mutation(),
    deleteAccountMutation: mutation(),
    previewGmailCleanupMutation: mutation(),
    executeGmailCleanupMutation: mutation(),
  }),
}));
vi.mock('@/features/accounts/form/useAccountIdentifiers', () => ({
  useAccountIdentifiers: () => ({
    identifiers: [],
    isLoading: false,
    createIdentifier: vi.fn(),
    deleteIdentifier: vi.fn(),
    isCreating: false,
    isDeleting: false,
  }),
}));

const card: CreditCard = {
  id: 'a1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  bank: 'hdfc',
  last4: '7741',
  creditLimit: 300000,
  anniversaryDate: '2024-03-15',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'liability',
};

const hdfc2 = { ...card, id: 'a2', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT, last4: '1234' } as unknown as Account;
const icici = { ...card, id: 'a3', name: 'ICICI Amazon', bank: 'icici', last4: '9999' } as unknown as Account;


function renderHint() {
  return renderWithQuery(<LockedStatementHint label="Add the statement password" href="/accounts" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(account, { data: card, isError: false, isSuccess: true });
  accounts.data = [];
  accounts.isError = false;
});

describe('LockedStatementHint', () => {
  it('never guesses: even a single account at the sender\'s bank shows the picker with nothing picked', async () => {
    accounts.data = [card];
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: 'Add the statement password' }));
    const dialog = await screen.findByRole('dialog', undefined, { timeout: 5000 });
    expect(within(dialog).getByText('Which account is this statement for?')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.queryByLabelText(/^Statement PDF password/)).toBeNull();
  });

  it('the picker lists all open bank accounts and cards; Continue opens the dialog on the password', async () => {
    accounts.data = [card, hdfc2, icici];
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: 'Add the statement password' }));
    const dialog = await screen.findByRole('dialog', undefined, { timeout: 5000 });
    expect(within(dialog).getByText('Which account is this statement for?')).toBeInTheDocument();
    const cont = within(dialog).getByRole('button', { name: 'Continue' });
    expect(cont).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Account/ }));
    expect(await screen.findByRole('option', { name: /ICICI Amazon/ })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('option', { name: /HDFC Savings/ }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    const input = await screen.findByLabelText(/^Statement PDF password/, undefined, { timeout: 5000 });
    await waitFor(() => expect(input).toHaveFocus());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Cancel closes the picker', async () => {
    accounts.data = [card, hdfc2];
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: 'Add the statement password' }));
    const dialog = await screen.findByRole('dialog', undefined, { timeout: 5000 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Which account is this statement for?')).toBeNull());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('with no candidates it goes to /accounts', async () => {
    accounts.data = [{ ...card, closedOn: '2020-01-01' }];
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: 'Add the statement password' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/accounts'));
  });
  it('falls back to the accounts page when the accounts cannot be loaded', async () => {
    accounts.data = undefined;
    accounts.isError = true;
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: 'Add the statement password' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/accounts'));
  });
});
