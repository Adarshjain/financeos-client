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
const last4 = () => screen.queryByRole('textbox', { name: /^Last 4 digits/ });

describe('AccountFormDialog last 6 digits', () => {
  it('shows one input in place of the last 4 for an HSBC credit card', () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hsbc' });
    expect(last6()).toBeInTheDocument();
    expect(last4()).toBeNull();
    expect(screen.getByText('With your date of birth, this opens your HSBC statements.')).toBeInTheDocument();
  });

  it('starts with the prefilled last 4 and keeps the digits across a bank change', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hsbc', prefillLast4: '4321' });
    expect(last6()).toHaveValue('4321');

    await user.click(screen.getByRole('combobox', { name: /^Bank/ }));
    await user.click(screen.getByRole('option', { name: /HDFC Bank/ }));
    expect(last6()).toBeNull();
    expect(last4()).toHaveValue('4321');
  });

  it('takes the typed last 4 when the bank changes to HSBC', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hdfc', prefillLast4: '4321' });
    expect(last6()).toBeNull();
    await user.click(screen.getByRole('combobox', { name: /^Bank/ }));
    await user.click(screen.getByRole('option', { name: /HSBC/ }));
    expect(last6()).toHaveValue('4321');
    expect(last4()).toBeNull();
  });

  it('accepts digits only, up to 6', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hsbc' });
    await user.type(last6()!, '65a4321');
    expect(last6()).toHaveValue('654321');
  });

  it('keeps the last 4 input for another bank card and an HSBC bank account', () => {
    const { unmount } = renderDialog({ initialType: AccountType.CREDIT_CARD, prefillBank: 'hdfc' });
    expect(last6()).toBeNull();
    expect(last4()).toBeInTheDocument();
    unmount();
    renderDialog({ initialType: AccountType.BANK_ACCOUNT, prefillBank: 'hsbc' });
    expect(last6()).toBeNull();
    expect(last4()).toBeInTheDocument();
  });
});
