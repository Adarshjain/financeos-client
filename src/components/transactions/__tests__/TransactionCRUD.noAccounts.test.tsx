import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const bank: Account = { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT };
const broker = { id: 'brk1', name: 'Zerodha', type: AccountType.BROKER } as unknown as Account;
const closedBank: Account = {
  id: 'acc-old',
  name: 'Old Bank',
  type: AccountType.BANK_ACCOUNT,
  closedOn: '2020-01-01',
};

const mockCategories: Category[] = [{ id: 'cat1', name: 'Food' }];

const mockTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Test Dinner',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 10000,
  createdAt: '2026-07-25T00:00:00Z',
};

const CALLOUT = 'No account to record this against yet';

function renderCRUD(accounts: Account[], transaction?: Transaction) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  queryClient.setQueryData(keys.categories.list(), mockCategories);
  return renderWithQuery(<TransactionCRUD transaction={transaction} />, { queryClient });
}

/** jsdom does not expose named form controls as form properties; the submit
 * handler reads `form.description.value`, so give it one. */
function ensureDescription(container: HTMLElement, value: string) {
  const form = container.querySelector('form#transaction-form')!;
  if (!('description' in form)) {
    Object.defineProperty(form, 'description', { value: { value }, configurable: true });
  }
}

function mockCreateFlow(created: Account) {
  (api.POST as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
    if (path === '/api/v1/accounts') return { data: created };
    if (path === '/api/v1/transactions') return { data: { id: 't-new' } };
    return { data: undefined };
  });
  // The create mutation invalidates the accounts list; the refetch must agree.
  (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [created] });
}

describe('TransactionCRUD without a usable account', () => {
  beforeEach(() => {
    // Reset, not clear: `mockCreateFlow` installs a GET implementation, and
    // useAccounts refetches on mount, so a leaked one would overwrite the
    // accounts seeded by the next test.
    vi.resetAllMocks();
  });

  it('replaces the account picker with an add-account callout when there are no accounts', () => {
    renderCRUD([]);

    expect(screen.getByText(CALLOUT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('treats broker-only and closed-only accounts as having no usable account', () => {
    renderCRUD([broker, closedBank]);

    expect(screen.getByText(CALLOUT)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('explains that an account is needed when saving without one', async () => {
    renderCRUD([]);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Add an account to save this transaction');
    });
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('swaps to an account form without the broker type, and Cancel returns to the untouched draft', () => {
    renderCRUD([]);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '-250' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect(screen.getByRole('heading', { name: /Create Account/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credit Card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wallet/Cash' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Broker' })).not.toBeInTheDocument();
    // The transaction form (and its footer) has given way to the account form.
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByPlaceholderText('0.00')).toHaveValue('-250');
    expect(screen.getByText(CALLOUT)).toBeInTheDocument();
  });

  it('creating a bank account inline selects it, keeps the draft, and the save targets it', async () => {
    const created: Account = { id: 'acc-new', name: 'Inline Bank', type: AccountType.BANK_ACCOUNT };
    mockCreateFlow(created);

    const { container } = renderCRUD([]);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '-250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Inline Bank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    const picker = await screen.findByRole('combobox', { name: 'Account' });
    expect(picker).toHaveTextContent('Inline Bank');
    expect(screen.queryByText(CALLOUT)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toHaveValue('-250');

    ensureDescription(container, 'Lunch');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/transactions',
        expect.objectContaining({ body: expect.objectContaining({ accountId: 'acc-new' }) }),
      );
    });
  });

  it('creating a credit card inline selects it together with its primary card', async () => {
    const created = {
      id: 'cc-new',
      name: 'Inline Card',
      type: AccountType.CREDIT_CARD,
      cardholders: [
        { id: 'ch1', role: 'PRIMARY', personName: '', cards: [{ id: 'card1', last4: '1111' }] },
      ],
    } as unknown as Account;
    mockCreateFlow(created);

    renderCRUD([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Credit Card' }));
    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Inline Card' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits'), { target: { value: '1111' } });
    fireEvent.change(screen.getByLabelText('Credit Limit'), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('Card Anniversary Date'), { target: { value: '01/04/2024' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    const picker = await screen.findByRole('combobox', { name: 'Account' });
    expect(picker).toHaveTextContent('Inline Card');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Card' })).toHaveTextContent('You (•••• 1111)');
    });
  });

  it('offers "Add account" at the end of a populated picker without disturbing the selection', async () => {
    renderCRUD([bank]);

    const picker = screen.getByRole('combobox', { name: 'Account' });
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: 'HDFC Savings' }));
    await waitFor(() => expect(picker).toHaveTextContent('HDFC Savings'));

    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: 'Add account' }));
    expect(screen.getByRole('heading', { name: /Create Account/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Account' })).toHaveTextContent('HDFC Savings');
    });
    expect(screen.queryByText(CALLOUT)).not.toBeInTheDocument();
  });

  it('keeps the account locked, with no add entry, while editing an existing transaction', () => {
    renderCRUD([bank], mockTxn);

    const picker = screen.getByRole('combobox', { name: 'Account' });
    expect(picker).toBeDisabled();
    expect(picker).toHaveTextContent('HDFC Savings');
    expect(screen.queryByText(CALLOUT)).not.toBeInTheDocument();
  });
});
