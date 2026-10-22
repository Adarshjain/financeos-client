import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { TransactionFormDialog, type TransactionFormDialogProps } from './TransactionFormDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const openAccountDialog = vi.fn();
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  useAccountDialogs: () => ({ open: openAccountDialog, openEdit: vi.fn() }),
}));

const create = vi.fn();
const update = vi.fn();
vi.mock('./useTransactionMutations', () => ({
  useTransactionMutations: () => ({
    createMutation: { mutateAsync: create, isPending: false },
    updateMutation: { mutateAsync: update, isPending: false },
  }),
}));

let accountList: Account[] = [];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accountList }) }));
const categories = vi.hoisted(() => [
  { id: 'c1', name: 'Groceries' },
  { id: 'c2', name: 'Transport' },
]);
// Stable, like the query's own data: a fresh array per render would re-fire the category sync effect forever.
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: categories }) }));
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  api: { GET: vi.fn(), POST: vi.fn(async () => ({ data: undefined })), PUT: vi.fn(), DELETE: vi.fn() },
}));

const bank = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 0, cardholders: [] } as unknown as Account;
const card = {
  id: 'cc1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia Gold',
  balance: 0,
  cardholders: [{ id: 'h1', role: 'PRIMARY', personName: 'Meera', cards: [{ id: 'k1', last4: '7742' }] }],
} as unknown as Account;

const stored = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    accountId: 'b1',
    date: '2026-10-12',
    amount: -3600,
    description: 'BigBasket',
    sourcedDescription: 'UPI/DR/4278/BIGBASKET',
    source: 'gmail_transaction_alert',
    reviewType: 'MANUALLY_REVIEWED',
    categories: [{ id: 'c1', name: 'Groceries' }],
    createdAt: '',
    ...over,
  }) as Transaction;

const onClose = vi.fn();
const user = userEvent.setup({ pointerEventsCheck: 0 });

function setup(over: Partial<TransactionFormDialogProps> = {}) {
  return renderWithQuery(<TransactionFormDialog today="2026-10-13" accounts={accountList} onClose={onClose} {...over} />);
}
const amount = () => screen.getByLabelText('Amount');
const save = (name = 'Save transaction') => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  accountList = [bank, card];
  create.mockResolvedValue({});
  update.mockResolvedValue({});
});

describe('Add transaction', () => {
  it('opens as a debit dated today with every field and the Add footer', () => {
    setup();
    expect(screen.getByText('Add transaction')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Debit' })).toBeChecked();
    expect(amount()).toHaveAttribute('placeholder', '0.00');
    expect(screen.getByLabelText('Date')).toHaveValue('13/10/2026');
    expect(screen.getByText('Rules and the categoriser suggest a category as you type')).toBeInTheDocument();
    for (const label of ['Account', 'Description', 'Categories', 'MCC code', 'Settlement date', 'Channel', 'Instant discount', 'Convenience fee']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Exclude transaction')).toBeInTheDocument();
    expect(screen.getByText('Monitor transaction')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByText(/save and add another/i)).toBeNull();
  });

  it('has no Review status: a new transaction has none to set', () => {
    setup();
    expect(screen.queryByText('Review status')).toBeNull();
  });

  it('asks for an account until one is picked', () => {
    setup();
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('Select account');
  });

  it('starts on the account the list was filtered to', () => {
    setup({ defaultAccountId: 'b1' });
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('HDFC Savings');
  });

  it('starts on a filtered credit card with its default card, and sends it', async () => {
    setup({ defaultAccountId: 'cc1' });
    expect(screen.getByRole('combobox', { name: /^Card/ })).toHaveTextContent('Meera (•••• 7742)');
    fireEvent.change(amount(), { target: { value: '99' } });
    save();
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ accountId: 'cc1', cardId: 'k1' });
  });

  it('ignores a filtered account that cannot take a transaction (closed, or not in the list)', () => {
    accountList = [bank, { ...card, closedOn: '2025-01-01' } as Account];
    setup({ defaultAccountId: 'cc1', accounts: accountList });
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('Select account');
    expect(screen.queryByRole('combobox', { name: /^Card/ })).toBeNull();
  });

  it('ignores a filtered account that does not exist', () => {
    setup({ defaultAccountId: 'gone' });
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('Select account');
  });

  it('shows each error under its field and does not save an empty form', async () => {
    setup();
    save();
    expect(await screen.findByText('Enter an amount greater than zero')).toBeInTheDocument();
    expect(screen.getByText('Please select an account')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(amount(), { target: { value: '250' } });
    expect(screen.queryByText('Enter an amount greater than zero')).toBeNull();
  });

  it('tints the amount green for a credit and leaves it neutral for a debit', async () => {
    setup();
    expect(amount()).not.toHaveClass('text-positive');
    await user.click(screen.getByRole('radio', { name: 'Credit' }));
    expect(amount()).toHaveClass('text-positive');
    await user.click(screen.getByRole('radio', { name: 'Debit' }));
    expect(amount()).not.toHaveClass('text-positive');
  });

  it('puts Debit/Credit and the amount, and Date and Account, side by side', () => {
    setup();
    expect(screen.getByRole('radiogroup', { name: 'Debit or credit' }).parentElement).toBe(amount().closest('div[class*="flex-1"]')?.parentElement);
    expect(screen.getByLabelText('Date').closest('.grid')).toHaveClass('grid-cols-5');
    expect(screen.getByLabelText('Date').closest('.col-span-2')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: /^Account/ }).closest('.col-span-3')).not.toBeNull();
  });

  it('shows the bank logo in the Account options and in the closed trigger', async () => {
    accountList = [{ ...bank, bank: 'hdfc' } as unknown as Account, card];
    setup({ defaultAccountId: 'b1' });
    const trigger = screen.getByRole('combobox', { name: /^Account/ });
    expect(trigger.querySelector('[data-sprite-cell]')).not.toBeNull();
    await user.click(trigger);
    const option = screen.getByRole('option', { name: /HDFC Savings/ });
    expect(option.querySelector('[data-sprite-cell]')).not.toBeNull();
  });

  it('takes the description in a text area', () => {
    setup();
    expect(screen.getByRole('textbox', { name: /^Description/ }).tagName).toBe('TEXTAREA');
  });

  it('keeps only a decimal number in the amount', () => {
    setup();
    fireEvent.change(amount(), { target: { value: '1a2,5.5' } });
    expect(amount()).toHaveValue('125.5');
  });

  it('rejects an MCC that is not four digits with the Legacy wording', async () => {
    setup({ defaultAccountId: 'b1' });
    fireEvent.change(amount(), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^MCC code/ }), { target: { value: '54' } });
    save();
    expect(await screen.findByText('MCC code must be exactly 4 digits (or left empty).')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('saves a debit as a negative amount, then closes, refreshes and says so', async () => {
    setup({ defaultAccountId: 'b1' });
    fireEvent.change(amount(), { target: { value: '250.50' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Description/ }), { target: { value: 'Chai' } });
    save();
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({
      accountId: 'b1',
      amount: -250.5,
      date: '2026-10-13',
      description: 'Chai',
      categoryIds: [],
      isTransactionExcluded: false,
      isTransactionUnderMonitoring: false,
    });
    expect(create.mock.calls[0][0]).not.toHaveProperty('reviewType');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Transaction saved!');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('saves a credit as a positive amount', async () => {
    setup({ defaultAccountId: 'b1' });
    await user.click(screen.getByRole('radio', { name: 'Credit' }));
    fireEvent.change(amount(), { target: { value: '18500' } });
    save();
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].amount).toBe(18500);
  });

  it('picks the card holder default when a credit card is chosen, and sends it', async () => {
    setup();
    await user.click(screen.getByRole('combobox', { name: /^Account/ }));
    await user.click(screen.getByRole('option', { name: /HDFC Regalia Gold/ }));
    expect(screen.getByRole('combobox', { name: /^Card/ })).toHaveTextContent('Meera (•••• 7742)');
    fireEvent.change(amount(), { target: { value: '99' } });
    save();
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ accountId: 'cc1', cardId: 'k1' });
  });

  it('sends the picked categories, reward details and flags', async () => {
    setup({ defaultAccountId: 'b1' });
    fireEvent.change(amount(), { target: { value: '10' } });
    await user.click(screen.getByRole('combobox', { name: /^Categories/ }));
    await user.click(screen.getByRole('option', { name: 'Transport' }));
    await user.click(screen.getByRole('button', { name: /Done/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Instant discount/ }), { target: { value: '12.5' } });
    await user.click(screen.getByLabelText('Monitor transaction'));
    fireEvent.change(screen.getByPlaceholderText(/Explain why this transaction is being monitored/), { target: { value: 'refund?' } });
    save();
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      categoryIds: ['c2'],
      isTransactionUnderMonitoring: true,
      monitoringReason: 'refund?',
      rewardDetails: { instantDiscount: 12.5 },
    });
  });

  it('keeps the dialog open and toasts the server message when saving fails', async () => {
    setup({ defaultAccountId: 'b1' });
    fireEvent.change(amount(), { target: { value: '10' } });
    create.mockRejectedValueOnce(new Error('boom'));
    save();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('An unexpected error occurred', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without saving', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  describe('accounts', () => {
    it('opens Add account from the Account dropdown', async () => {
      setup();
      await user.click(screen.getByRole('combobox', { name: /^Account/ }));
      await user.click(screen.getByRole('button', { name: 'Add account' }));
      expect(openAccountDialog).toHaveBeenCalled();
    });

    it('shows the no-account state in place of the field, with Add account', async () => {
      accountList = [];
      setup({ accounts: [] });
      expect(screen.getByText('No account to record this against yet')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /^Account/ })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
      expect(openAccountDialog).toHaveBeenCalled();
    });

    it('selects the account that appears while Add account is open', async () => {
      const view = setup();
      await user.click(screen.getByRole('combobox', { name: /^Account/ }));
      await user.click(screen.getByRole('button', { name: 'Add account' }));
      accountList = [bank, card, { ...bank, id: 'b2', name: 'New Bank' } as Account];
      view.rerender(<TransactionFormDialog today="2026-10-13" accounts={accountList} onClose={onClose} />);
      await waitFor(() => expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('New Bank'));
    });
  });
});

describe('Edit transaction', () => {
  it('opens with every stored field, the account disabled and the Edit footer', () => {
    setup({ transaction: stored({ mcc: '5411' }) });
    expect(screen.getByText('Edit transaction')).toBeInTheDocument();
    expect(amount()).toHaveValue('3600.00');
    expect(screen.getByRole('radio', { name: 'Debit' })).toBeChecked();
    expect(screen.getByLabelText('Date')).toHaveValue('12/10/2026');
    expect(screen.getByRole('textbox', { name: /^Description/ })).toHaveValue('BigBasket');
    expect(screen.getByText('UPI/DR/4278/BIGBASKET')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^MCC code/ })).toHaveValue('5411');
    expect(screen.getByRole('combobox', { name: /^Account/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Categories/ })).toHaveTextContent('Groceries');
    expect(screen.getByRole('combobox', { name: /^Review status/ })).toHaveTextContent('Manually reviewed');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('opens a transaction with no review type as Manually reviewed', () => {
    setup({ transaction: stored({ reviewType: null }) });
    expect(screen.getByRole('combobox', { name: /^Review status/ })).toHaveTextContent('Manually reviewed');
  });

  it('shows a credit as Credit', () => {
    setup({ transaction: stored({ amount: 18500 }) });
    expect(screen.getByRole('radio', { name: 'Credit' })).toBeChecked();
  });

  it('saves the changes against the transaction, keeping its source', async () => {
    setup({ transaction: stored() });
    fireEvent.change(amount(), { target: { value: '4000' } });
    save('Save');
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0].id).toBe('t1');
    expect(update.mock.calls[0][0].body).toMatchObject({
      amount: -4000,
      date: '2026-10-12',
      source: 'gmail_transaction_alert',
      reviewType: 'MANUALLY_REVIEWED',
      categoryIds: ['c1'],
    });
    expect(update.mock.calls[0][0].body).not.toHaveProperty('reviewReasons');
    expect(create).not.toHaveBeenCalled();
  });

  it('disables "Auto reviewed" with a reason', async () => {
    setup({ transaction: stored() });
    await user.click(screen.getByRole('combobox', { name: /^Review status/ }));
    const option = screen.getByRole('option', { name: /Auto reviewed/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveTextContent('Set by imports and rules');
  });

  it('puts Review status in its error state when Needs review has no reason, and blocks Save until one is ticked', async () => {
    setup({ transaction: stored() });
    expect(screen.queryByText('Why it needs review')).toBeNull();
    await user.click(screen.getByRole('combobox', { name: /^Review status/ }));
    await user.click(screen.getByRole('option', { name: 'Needs review' }));
    expect(screen.getByText('Pick at least one reason it needs review')).toBeInTheDocument();
    expect(screen.getByText('Why it needs review')).toBeInTheDocument();
    save('Save');
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole('combobox', { name: /^Why it needs review/ }));
    await user.click(screen.getByRole('option', { name: 'Duplicate' }));
    await user.click(screen.getByRole('option', { name: 'Date corrected' }));
    await user.click(screen.getByRole('button', { name: /Done/ }));
    expect(screen.queryByText('Pick at least one reason it needs review')).toBeNull();

    save('Save');
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toMatchObject({
      reviewType: 'NEEDS_REVIEW',
      reviewReasons: ['DUPLICATE_SUSPECT', 'DATE_CORRECTED'],
    });
  });

  it('offers the four server reasons, and shows the stored reasons ticked', async () => {
    setup({ transaction: stored({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED'] }) });
    expect(screen.getByRole('combobox', { name: /^Why it needs review/ })).toHaveTextContent('Unreconciled');
    await user.click(screen.getByRole('combobox', { name: /^Why it needs review/ }));
    expect(screen.queryByRole('option', { name: 'Other' })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('leaves the reasons out when the review status moves away from Needs review', async () => {
    setup({ transaction: stored({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED'] }) });
    await user.click(screen.getByRole('combobox', { name: /^Review status/ }));
    await user.click(screen.getByRole('option', { name: 'Manually reviewed' }));
    save('Save');
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body.reviewType).toBe('MANUALLY_REVIEWED');
    expect(update.mock.calls[0][0].body).not.toHaveProperty('reviewReasons');
  });

  it('does not force a reason on a Needs review that never had one', async () => {
    setup({ transaction: stored({ reviewType: 'NEEDS_REVIEW', reviewReasons: [] }) });
    expect(screen.queryByText('Pick at least one reason it needs review')).toBeNull();
    save('Save');
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).not.toHaveProperty('reviewReasons');
  });
});
