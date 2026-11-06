import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Account, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => new URLSearchParams(),
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
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [] }),
}));

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  bank: 'hdfc',
  last4: '7741',
  creditLimit: 300000,
  anniversaryDate: '2024-03-15',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'liability',
};

const bank: Account = {
  id: 'b1',
  type: AccountType.BANK_ACCOUNT,
  name: 'HDFC Savings',
  bank: 'hdfc',
  last4: '1234',
  openingBalance: '0',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'asset',
} as Account;

function renderDialog(
  props: Partial<React.ComponentProps<typeof AccountFormDialog>>
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountFormDialog onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('AccountFormDialog focusField', () => {
  it.each([
    ['credit card', card],
    ['bank account', bank],
  ])(
    'focuses the statement password in edit mode (%s)',
    async (_n, account) => {
      renderDialog({ account, focusField: 'statementPassword' });
      const input = screen.getByLabelText(/^Statement PDF password/);
      await waitFor(() => expect(input).toHaveFocus());
    }
  );

  it.each([
    ['credit card', card],
    ['bank account', bank],
  ])('focuses the import date in edit mode (%s)', async (_n, account) => {
    renderDialog({ account, focusField: 'ingestFromDate' });
    const input = screen.getByLabelText(/^Import emails from/);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('does not steal focus without focusField', async () => {
    renderDialog({ account: card });
    const input = screen.getByLabelText(/^Statement PDF password/);
    await new Promise((r) => setTimeout(r, 50));
    expect(input).not.toHaveFocus();
  });
});
