import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CreditCard } from '@/lib/account.types';
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

const hsbcCard: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HSBC Travel One',
  bank: 'hsbc',
  last4: '4321',
  creditLimit: 300000,
  anniversaryDate: '2024-03-15',
  ingestFromDate: '2026-04-01T00:00:00Z',
  financialPosition: 'liability',
};

function renderDialog(account: CreditCard) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountFormDialog onClose={vi.fn()} account={account} focusField="statementPassword" />
    </QueryClientProvider>
  );
}

describe('AccountFormDialog focusField with last 6 digits', () => {
  it('focuses the last 6 digits for an HSBC card that has none stored', async () => {
    renderDialog(hsbcCard);
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^Last 6 digits of the card/ })).toHaveFocus());
  });

  it('focuses the statement password once the last 6 digits are stored', async () => {
    renderDialog({ ...hsbcCard, last6: '654321' });
    await waitFor(() => expect(screen.getByLabelText(/^Statement PDF password/)).toHaveFocus());
  });

  it('focuses the statement password for another bank', async () => {
    renderDialog({ ...hsbcCard, bank: 'hdfc' });
    await waitFor(() => expect(screen.getByLabelText(/^Statement PDF password/)).toHaveFocus());
  });
});
