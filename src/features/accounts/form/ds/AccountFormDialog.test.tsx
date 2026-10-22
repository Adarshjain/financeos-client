import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/ds/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
const mutations = {
  createAccountMutation: mutation(),
  updateAccountMutation: mutation(),
  closeAccountMutation: mutation(),
  reopenAccountMutation: mutation(),
  deleteAccountMutation: mutation(),
  previewGmailCleanupMutation: mutation(),
  executeGmailCleanupMutation: mutation(),
};
vi.mock('@/features/accounts/form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => mutations,
}));

const idApi = {
  identifiers: [] as { id: string; value: string }[],
  isLoading: false,
  createIdentifier: vi.fn(),
  deleteIdentifier: vi.fn(),
  isCreating: false,
  isDeleting: false,
};
vi.mock('@/features/accounts/form/useAccountIdentifiers', () => ({
  useAccountIdentifiers: () => idApi,
}));

const poolCard: CreditCard = {
  id: 'c0',
  type: AccountType.CREDIT_CARD,
  name: 'Other card',
  last4: '1111',
  creditLimit: null,
  limitPool: { id: 'p1', name: 'HDFC cards', creditLimit: 500000, owed: 0, available: 500000, memberCount: 2, openMemberCount: 2 },
};
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [poolCard] }),
}));

const onClose = vi.fn();
// Radix sets pointer-events: none on the dialog content wrapper.
const user = userEvent.setup({ pointerEventsCheck: 0 });

function renderDialog(props: Partial<React.ComponentProps<typeof AccountFormDialog>> = {}) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AccountFormDialog onClose={onClose} {...props} />
    </QueryClientProvider>
  );
}

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
  limitPool: poolCard.limitPool,
};

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const fill = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  idApi.identifiers = [];
  idApi.isLoading = false;
});

describe('Add account', () => {
  it('shows only the type picker until a type is picked, with the create button disabled', () => {
    renderDialog({ initialType: null });
    expect(screen.getByText('Add account')).toBeInTheDocument();
    expect(screen.queryByText("Pick a type · only that type's fields appear")).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') !== 'true')).toBe(true);
    expect(screen.queryByText('Basics')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('opens with the type from the link preselected and its fields shown', () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    expect(screen.getByRole('radio', { name: 'Credit card' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Card details')).toBeInTheDocument();
    expect(screen.getByText('Limit')).toBeInTheDocument();
    expect(screen.getByText('Sync & net worth')).toBeInTheDocument();
    expect(screen.getByText('Liability')).toBeInTheDocument();
  });

  it('changes the fields when the type changes', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    await user.click(screen.getByRole('radio', { name: 'Broker' }));
    expect(screen.getByText('Uninvested cash balance')).toBeInTheDocument();
    expect(screen.queryByText('Card details')).toBeNull();
    expect(screen.queryByText('Import emails from')).toBeNull();
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Wallet / cash' }));
    expect(screen.queryByText('Uninvested cash balance')).toBeNull();
    expect(screen.getByText('Exclude from net worth')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Bank' }));
    expect(screen.getByText('Opening balance')).toBeInTheDocument();
    expect(screen.queryByText('Card details')).toBeNull();
  });

  it('shows validation errors on the fields and does not call the server', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    await user.type(field('Last 4 digits'), '77');
    submit('Create account');
    expect(await screen.findByText('Enter the last 4 digits of the card.')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter the card anniversary.')).toBeInTheDocument();
    expect(screen.getByText('Enter a credit limit.')).toBeInTheDocument();
    expect(mutations.createAccountMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('creates a card with its own limit, a typed anniversary and identifiers, then opens it', { timeout: 20000 }, async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({
      account: { ...card, id: 'new1' },
      failedIdentifiers: [],
    });
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    fill('Account name', 'HDFC Regalia Gold');
    await user.click(screen.getByRole('combobox', { name: /^Bank/ }));
    await user.click(screen.getByRole('option', { name: /HDFC Bank/ }));
    fill('Last 4 digits', '7741');
    fill('Card anniversary', '15032024');
    fill('Credit limit', '3,00,000');
    // Identifiers: type into the multi-select search and create.
    await user.click(screen.getAllByRole('combobox').at(-1)!);
    await user.type(screen.getByPlaceholderText('Search…'), 'XX7741');
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    submit('Create account');

    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled(), { timeout: 4000 });
    const arg = mutations.createAccountMutation.mutateAsync.mock.calls[0][0];
    expect(arg.body).toMatchObject({
      type: AccountType.CREDIT_CARD,
      name: 'HDFC Regalia Gold',
      bank: 'hdfc',
      last4: '7741',
      anniversaryDate: '2024-03-15',
      creditLimit: 300000,
      limitPool: null,
      financialPosition: 'liability',
    });
    expect(arg.identifiers).toEqual(['XX7741']);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/ds/accounts/new1'));
    expect(toast).toHaveBeenCalledWith('Account created successfully!');
  });

  it('with onCreated, closes and hands over the new account without opening its page', async () => {
    const created = { id: 'n9', type: AccountType.GENERIC, name: 'Cash wallet' };
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: created, failedIdentifiers: [] });
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderDialog({ initialType: AccountType.GENERIC, onCreated, onClose });
    fill('Account name', 'Cash wallet');
    submit('Create account');
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('tells which identifiers failed after creating', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({
      account: { id: 'n2', type: AccountType.GENERIC, name: 'Paytm' },
      failedIdentifiers: ['XX7741', 'CRN88213'],
    });
    renderDialog({ initialType: AccountType.GENERIC });
    fill('Account name', 'Paytm');
    submit('Create account');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        'Account created, but these identifiers could not be added: XX7741, CRN88213. Add them again from Edit account.',
        { tone: 'danger' }
      )
    );
  });

  it('creates a wallet with only the common fields', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({
      account: { id: 'w9', type: AccountType.GENERIC, name: 'Paytm' },
      failedIdentifiers: [],
    });
    renderDialog({ initialType: AccountType.GENERIC });
    fill('Account name', 'Paytm Wallet');
    submit('Create account');
    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled());
    expect(mutations.createAccountMutation.mutateAsync.mock.calls[0][0].body).toEqual({
      name: 'Paytm Wallet',
      description: '',
      excludeFromNetAsset: false,
      financialPosition: 'asset',
      type: AccountType.GENERIC,
    });
  });

  it('picks an existing shared limit, prefills it and warns about the other cards', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    await user.click(screen.getByRole('combobox', { name: /Shared limit/ }));
    await user.click(screen.getByRole('option', { name: /HDFC cards/ }));
    expect(screen.getByDisplayValue('HDFC cards')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500000')).toBeInTheDocument();
    expect(
      screen.getByText('Changing the name or amount also changes it for the 2 other accounts sharing this limit.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Own limit')).toBeNull();
    expect(screen.queryByText('Leave empty to let this card use the whole shared limit.')).toBeNull();
  });

  it('shows the credit limit while the card has no shared limit, and hides it for a new shared limit', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    expect(screen.getByText('Credit limit')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /Shared limit/ }));
    await user.click(screen.getByRole('option', { name: 'New shared limit…' }));
    expect(screen.queryByText('Credit limit')).toBeNull();
    expect(screen.queryByText('Own limit')).toBeNull();
  });

  it('never shows an own limit when editing a pooled card, even one that has a value', () => {
    renderDialog({ account: { ...card, creditLimit: 300000 } });
    expect(screen.queryByText('Own limit')).toBeNull();
    expect(screen.queryByText('Credit limit')).toBeNull();
  });

  it('puts the import-date helper under its own field on a new bank account', () => {
    renderDialog({ initialType: AccountType.BANK_ACCOUNT });
    const input = screen.getByLabelText('Import emails from');
    const helperId = input.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId!)?.textContent).toBe(
      'Leave empty to pause Gmail import for this account.'
    );
  });

  it('titles the identifiers field Account identifiers with the last-4 helper', () => {
    renderDialog({ initialType: AccountType.BANK_ACCOUNT });
    expect(screen.getByText('Account identifiers')).toBeInTheDocument();
    expect(
      screen.getByText('Used to match emails to this account, along with the last 4 digits above.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Email identifiers/)).toBeNull();
  });

  it('requires the name and amount of a new shared limit', async () => {
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    await user.click(screen.getByRole('combobox', { name: /Shared limit/ }));
    await user.click(screen.getByRole('option', { name: 'New shared limit…' }));
    submit('Create account');
    expect(await screen.findByText('Enter an amount above ₹0')).toBeInTheDocument();
    expect(screen.getAllByText('Name is required').length).toBeGreaterThan(0);
  });

  it('shows a failed request in a banner and keeps the dialog open', async () => {
    mutations.createAccountMutation.mutateAsync.mockRejectedValue(new Error('x'));
    renderDialog({ initialType: AccountType.GENERIC });
    fill('Account name', 'Paytm');
    submit('Create account');
    expect(await screen.findByText('Failed to create account')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('cancel closes without saving', async () => {
    renderDialog({ initialType: null });
    submit('Cancel');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Add account type switch', () => {
  it('drops identifiers typed for a card when the type becomes a broker', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({
      account: { id: 'k2', type: AccountType.BROKER, name: 'Z' },
      failedIdentifiers: [],
    });
    renderDialog({ initialType: AccountType.CREDIT_CARD });
    await user.click(screen.getAllByRole('combobox').at(-1)!);
    await user.type(screen.getByPlaceholderText('Search…'), 'XX7741');
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('radio', { name: 'Broker' }));
    fill('Account name', 'Zerodha');
    await user.click(screen.getByRole('combobox', { name: /Provider/ }));
    await user.click(screen.getByRole('option', { name: 'Zerodha' }));
    submit('Create account');
    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled());
    expect(mutations.createAccountMutation.mutateAsync.mock.calls[0][0].identifiers).toEqual([]);
  }, 20000);
});

describe('Bank field', () => {
  const bankBox = () => screen.getByRole('combobox', { name: /^Bank/ });

  it('shows for a bank account and a card only, and keeps the pick when switching back', async () => {
    renderDialog({ initialType: AccountType.BANK_ACCOUNT });
    await user.click(bankBox());
    await user.type(screen.getByPlaceholderText('Search banks…'), 'sbi');
    await user.click(screen.getByRole('option', { name: /State Bank of India/ }));
    expect(bankBox()).toHaveTextContent('State Bank of India');
    await user.click(screen.getByRole('radio', { name: 'Wallet / cash' }));
    expect(screen.queryByRole('combobox', { name: /^Bank/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Broker' }));
    expect(screen.queryByRole('combobox', { name: /^Bank/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Credit card' }));
    expect(bankBox()).toHaveTextContent('State Bank of India');
  });

  it('is required on Add', async () => {
    renderDialog({ initialType: AccountType.BANK_ACCOUNT });
    fill('Account name', 'HDFC Savings');
    submit('Create account');
    expect(await screen.findByText('Select a bank.')).toBeInTheDocument();
    expect(mutations.createAccountMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('is prefilled on Edit, and an old account without one must pick before saving', async () => {
    const { unmount } = renderDialog({ account: card });
    expect(bankBox()).toHaveTextContent('HDFC Bank');
    unmount();
    renderDialog({ account: { ...card, bank: null } });
    submit('Save changes');
    expect(await screen.findByText('Select a bank.')).toBeInTheDocument();
    expect(mutations.updateAccountMutation.mutateAsync).not.toHaveBeenCalled();
    await user.click(bankBox());
    await user.click(screen.getByRole('option', { name: /Axis Bank/ }));
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue(card);
    submit('Save changes');
    await waitFor(() => expect(mutations.updateAccountMutation.mutateAsync).toHaveBeenCalled());
    expect(mutations.updateAccountMutation.mutateAsync.mock.calls[0][0].body).toMatchObject({ bank: 'axis' });
  });
});

describe('Edit account', () => {
  it('prefills the account and names it with its type', () => {
    renderDialog({ account: card });
    expect(screen.getByText('Edit account')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia · Credit card')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByDisplayValue('HDFC Regalia')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7741')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15/03/2024')).toBeInTheDocument();
    expect(screen.getByDisplayValue('01/04/2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HDFC cards')).toBeInTheDocument();
    expect(screen.getByText('Leave the date empty to pause Gmail import for this card.')).toBeInTheDocument();
    expect(screen.getByText('Close account', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Delete account', { selector: 'h3' })).toBeInTheDocument();
  });

  it('saves the changes, refreshes and closes', async () => {
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue(card);
    renderDialog({ account: card });
    const name = field('Account name');
    await user.clear(name);
    await user.type(name, 'HDFC Regalia Gold');
    submit('Save changes');
    await waitFor(() => expect(mutations.updateAccountMutation.mutateAsync).toHaveBeenCalled());
    const arg = mutations.updateAccountMutation.mutateAsync.mock.calls[0][0];
    expect(arg.id).toBe('c1');
    expect(arg.body).toMatchObject({
      name: 'HDFC Regalia Gold',
      last4: '7741',
      limitPool: { id: 'p1', name: 'HDFC cards', creditLimit: 500000 },
      ingestFromDate: '2026-04-01',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(router.refresh).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Account updated successfully!');
    expect(mutations.previewGmailCleanupMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('adds and removes identifiers with the save', async () => {
    idApi.identifiers = [
      { id: 'i1', value: '7741' },
      { id: 'i2', value: 'XX7741' },
    ];
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue(card);
    renderDialog({ account: card });
    await user.click(screen.getAllByRole('combobox').at(-1)!);
    await user.click(screen.getByRole('option', { name: '7741' }));
    await user.type(screen.getByPlaceholderText('Search…'), 'CRN1');
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    submit('Save changes');
    await waitFor(() => expect(idApi.createIdentifier).toHaveBeenCalledWith({ value: 'CRN1' }));
    expect(idApi.deleteIdentifier).toHaveBeenCalledWith('i1');
  });

  it('asks before deleting Gmail rows when the import date moves later, then deletes and saves', async () => {
    mutations.previewGmailCleanupMutation.mutateAsync.mockResolvedValue({ count: 23 });
    mutations.executeGmailCleanupMutation.mutateAsync.mockResolvedValue({});
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue(card);
    renderDialog({ account: card });
    const date = screen.getByDisplayValue('01/04/2026');
    await user.clear(date);
    await user.type(date, '01082026');
    submit('Save changes');

    expect(await screen.findByText('Delete earlier Gmail transactions?')).toBeInTheDocument();
    expect(screen.getByText('You moved "Import emails from" to 01/08/2026.')).toBeInTheDocument();
    expect(mutations.previewGmailCleanupMutation.mutateAsync).toHaveBeenCalledWith({
      accountId: 'c1',
      before: '2026-08-01',
    });
    expect(mutations.updateAccountMutation.mutateAsync).not.toHaveBeenCalled();

    submit('Delete & save');
    await waitFor(() => expect(mutations.updateAccountMutation.mutateAsync).toHaveBeenCalled());
    expect(mutations.executeGmailCleanupMutation.mutateAsync).toHaveBeenCalledWith({
      accountId: 'c1',
      before: '2026-08-01',
    });
    expect(toast).toHaveBeenCalledWith('Account updated and transactions cleaned up successfully!');
  });

  it('saves straight away when moving the date later removes nothing', async () => {
    mutations.previewGmailCleanupMutation.mutateAsync.mockResolvedValue({ count: 0 });
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue(card);
    renderDialog({ account: card });
    const date = screen.getByDisplayValue('01/04/2026');
    await user.clear(date);
    await user.type(date, '01082026');
    submit('Save changes');
    await waitFor(() => expect(mutations.updateAccountMutation.mutateAsync).toHaveBeenCalled());
    expect(mutations.executeGmailCleanupMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('closes the account on the chosen date', async () => {
    mutations.closeAccountMutation.mutateAsync.mockResolvedValue({ ...card, closedOn: '2026-10-31' });
    renderDialog({ account: card });
    await user.type(screen.getByRole('textbox', { name: /Closed on/ }), '31102026');
    submit('Close account');
    await waitFor(() =>
      expect(mutations.closeAccountMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'c1',
        body: { closedOn: '2026-10-31' },
      })
    );
    expect(toast).toHaveBeenCalledWith('Account closed successfully');
    expect(onClose).toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('shows the server warnings after closing', async () => {
    mutations.closeAccountMutation.mutateAsync.mockResolvedValue({ ...card, warnings: ['2 transactions are dated after the closing date.'] });
    renderDialog({ account: card });
    submit('Close account');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('2 transactions are dated after the closing date.', { tone: 'warning' })
    );
    expect(mutations.closeAccountMutation.mutateAsync).toHaveBeenCalledWith({ id: 'c1', body: { closedOn: undefined } });
  });

  it('reopens a closed account instead of offering to close it', async () => {
    const closed: Account = { ...card, closedOn: '2026-06-30' };
    mutations.reopenAccountMutation.mutateAsync.mockResolvedValue(card);
    renderDialog({ account: closed });
    expect(screen.getByText('Closed on 30 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('All transactions and statements are kept.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close account' })).toBeNull();
    submit('Reopen account');
    await waitFor(() => expect(mutations.reopenAccountMutation.mutateAsync).toHaveBeenCalledWith('c1'));
    expect(toast).toHaveBeenCalledWith('Account reopened successfully');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('confirms before deleting, with the wording from the board, then returns to the list', async () => {
    mutations.deleteAccountMutation.mutateAsync.mockResolvedValue(undefined);
    renderDialog({ account: card });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete account' })[0]);

    expect(await screen.findByText('Delete HDFC Regalia?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This permanently removes the account with all its transactions, statements, cards, reward rules and Gmail history. It cannot be undone.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Not using this account any more?')).toBeInTheDocument();
    expect(mutations.deleteAccountMutation.mutateAsync).not.toHaveBeenCalled();

    const confirm = screen.getAllByRole('button', { name: 'Delete account' }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(mutations.deleteAccountMutation.mutateAsync).toHaveBeenCalledWith('c1'));
    expect(toast).toHaveBeenCalledWith('Account deleted!');
    expect(router.push).toHaveBeenCalledWith('/ds/accounts');
  });

  it('leaves the close-instead note out of the delete confirm for a closed account', async () => {
    renderDialog({ account: { ...card, closedOn: '2026-06-30' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete account' })[0]);
    expect(await screen.findByText('Delete HDFC Regalia?')).toBeInTheDocument();
    expect(screen.queryByText('Not using this account any more?')).toBeNull();
  });

  it('prefills a broker provider and shows no email fields', () => {
    renderDialog({
      account: { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', provider: 'Zerodha', clientId: 'ZQ4471', cashBalance: 12500 },
    });
    expect(screen.getByDisplayValue('ZQ4471')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12500')).toBeInTheDocument();
    expect(screen.queryByText('Import emails from')).toBeNull();
    expect(screen.getByText('Zerodha · Broker')).toBeInTheDocument();
  });
});
