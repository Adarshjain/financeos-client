import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

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

const user = userEvent.setup({ pointerEventsCheck: 0 });

function renderDialog(props: Partial<React.ComponentProps<typeof AccountFormDialog>>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountFormDialog onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

const last6 = () => screen.queryByRole('textbox', { name: /^Last 6 digits of the card/ });

describe('AccountFormDialog last 6 digits', () => {
  it('shows for an HSBC credit card and hides when the bank changes', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hsbc' });
    expect(last6()).toBeInTheDocument();
    expect(screen.getByText('With your date of birth, this opens your HSBC statements.')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /^Bank/ }));
    await user.click(screen.getByRole('option', { name: /HDFC Bank/ }));
    expect(last6()).toBeNull();
  });

  it('does not show for another bank card or an HSBC bank account', () => {
    const { unmount } = renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hdfc' });
    expect(last6()).toBeNull();
    unmount();
    renderDialog({ initialType: AccountType.BANK_ACCOUNT, prefillBank: 'hsbc' });
    expect(last6()).toBeNull();
  });
});
