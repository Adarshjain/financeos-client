import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SuggestionItem } from '@/features/accounts/list/suggestionsModel';
import type { CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/accounts',
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



const suggestion = (over: Partial<SuggestionItem> = {}): SuggestionItem => ({
  id: 'sug-1',
  kind: 'CREDIT_CARD',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4321',
  variant: 'Regalia',
  variantConf: 'HIGH',
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});

const fieldHasCaption = (label: RegExp) => {
  const input = screen.getByRole(label.source.includes('Bank') ? 'combobox' : 'textbox', { name: label });
  return Boolean(input.getAttribute('aria-describedby'));
};

describe('Add account from a suggestion', () => {
  it('says where the values came from and starts on the suggested type', () => {
    renderDialog({ fromSuggestion: suggestion() });
    expect(screen.getByText('Filled in from your email. Check it, then create.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Credit card' })).toBeChecked();
    expect(field('Account name')).toHaveValue('HDFC Bank Regalia');
    expect(field('Last 4 digits')).toHaveValue('4321');
  });

  it('captions only the fields that were filled in', () => {
    renderDialog({ fromSuggestion: suggestion({ bank: { id: 'mystery', name: 'Mystery' } }) });
    // name + last4 are filled; the unknown bank is not.
    expect(screen.getAllByText('From your email')).toHaveLength(2);
    expect(fieldHasCaption(/^Account name/)).toBe(true);
    expect(fieldHasCaption(/^Last 4 digits/)).toBe(true);
    expect(fieldHasCaption(/^Bank/)).toBe(false);
  });

  it('captions the bank, name and number when all are known', () => {
    renderDialog({ fromSuggestion: suggestion() });
    expect(screen.getAllByText('From your email')).toHaveLength(3);
  });

  it('captions the debit card number on a bank account, and no account number it does not have', () => {
    renderDialog({
      fromSuggestion: suggestion({ kind: 'BANK_ACCOUNT', variant: null, last4: '', children: [{ id: 'c1', kind: 'DEBIT_CARD', band: 'FOUND', last4: '9911', evidenceMails: 2 }] }),
    });
    expect(screen.getByRole('textbox', { name: /^Debit card last 4 digits/ })).toHaveValue('9911');
    expect(screen.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('');
    // name, bank and debit card are filled; the account number is not.
    expect(screen.getAllByText('From your email')).toHaveLength(3);
  });

  it('sends fromSuggestionId with the create', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: { ...card, id: 'new1' }, failedIdentifiers: [] });
    renderDialog({ fromSuggestion: suggestion() });
    fill('Card anniversary', '15032024');
    fill('Credit limit', '3,00,000');
    submit('Add account');
    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled(), { timeout: 4000 });
    expect(mutations.createAccountMutation.mutateAsync.mock.calls[0][0].body).toMatchObject({
      type: AccountType.CREDIT_CARD,
      name: 'HDFC Bank Regalia',
      bank: 'hdfc',
      last4: '4321',
      fromSuggestionId: 'sug-1',
    });
  }, 20000);

  it('blocks Create on an add-on card until its relationship is picked, then sends it', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: { ...card, id: 'new1' }, failedIdentifiers: [] });
    renderDialog({ fromSuggestion: suggestion({ children: [{ id: 'c1', kind: 'ADDON_CARD', band: 'FOUND', last4: '0082', evidenceMails: 2 }] }) });
    expect(screen.getByText('Add-on card')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: /^Last 4 digits/ })[1]).toHaveValue('0082');
    fill('Card anniversary', '15032024');
    fill('Credit limit', '300000');
    submit('Add account');
    expect(await screen.findByText('Pick who the holder is.')).toBeInTheDocument();
    expect(mutations.createAccountMutation.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole('combobox', { name: /^Holder is your/ }));
    await user.click(screen.getByRole('option', { name: 'Spouse' }));
    submit('Add account');
    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled(), { timeout: 4000 });
    expect(mutations.createAccountMutation.mutateAsync.mock.calls[0][0].body).toMatchObject({
      addonCards: [{ last4: '0082', relationship: 'SPOUSE' }],
      fromSuggestionId: 'sug-1',
    });
  }, 20000);

  it('offers the candidate names and a tapped one becomes the name', async () => {
    renderDialog({ fromSuggestion: suggestion({ variantConf: 'LOW', variantCandidates: ['Regalia', 'Millennia', 'Moneyback'] }) });
    expect(screen.getByText(/Your emails mention/).textContent).toBe('Your emails mention Regalia, Millennia and Moneyback. Tap one to use it.');
    await user.click(screen.getByRole('button', { name: 'Millennia' }));
    expect(field('Account name')).toHaveValue('HDFC Bank Millennia');
  });

  it('writes two candidates as "A and B"', () => {
    renderDialog({ fromSuggestion: suggestion({ variantConf: 'LOW', variantCandidates: ['Regalia', 'Millennia'] }) });
    expect(screen.getByText(/Your emails mention/).textContent).toBe('Your emails mention Regalia and Millennia. Tap one to use it.');
  });

  it('writes one LOW-confidence candidate as "Maybe X" and a tap uses it', async () => {
    renderDialog({ fromSuggestion: suggestion({ variantConf: 'LOW', variantCandidates: ['Regalia'] }) });
    expect(screen.getByText(/Maybe/).textContent).toBe('Maybe Regalia. Tap it to use it.');
    await user.click(screen.getByRole('button', { name: 'Regalia' }));
    expect(field('Account name')).toHaveValue('HDFC Bank Regalia');
  });

  it('drops a caption once its field no longer holds the filled-in value', async () => {
    renderDialog({ fromSuggestion: suggestion() });
    expect(screen.getAllByText('From your email')).toHaveLength(3);
    fill('Account name', 'My own name');
    fill('Last 4 digits', '9999');
    expect(screen.getAllByText('From your email')).toHaveLength(1);
    expect(fieldHasCaption(/^Account name/)).toBe(false);
    expect(fieldHasCaption(/^Last 4 digits/)).toBe(false);
    expect(fieldHasCaption(/^Bank/)).toBe(true);
  });

  it('shows no hint line without candidates', () => {
    renderDialog({ fromSuggestion: suggestion() });
    expect(screen.queryByText(/Your emails mention/)).toBeNull();
  });

  it('shows the server message when the suggestion was already handled', async () => {
    const { ApiError } = await import('@/lib/api/client');
    mutations.createAccountMutation.mutateAsync.mockRejectedValue(
      new ApiError(400, { code: 'BAD_REQUEST', message: 'This suggestion was already handled' } as never),
    );
    renderDialog({ fromSuggestion: suggestion() });
    fill('Card anniversary', '15032024');
    fill('Credit limit', '300000');
    submit('Add account');
    expect(await screen.findByText('This suggestion was already handled')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  }, 20000);

  it('runs onCreated and closes on success', async () => {
    const created = { ...card, id: 'n9' };
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: created, failedIdentifiers: [] });
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderDialog({ fromSuggestion: suggestion(), onCreated, onClose });
    fill('Card anniversary', '15032024');
    fill('Credit limit', '300000');
    submit('Add account');
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created), { timeout: 4000 });
    expect(onClose).toHaveBeenCalled();
  }, 20000);
});

describe('Add account without a suggestion', () => {
  it('has no subtitle or captions and sends the same body as before, with no fromSuggestionId', async () => {
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: { id: 'n9', type: AccountType.GENERIC, name: 'Cash' }, failedIdentifiers: [] });
    renderDialog({ initialType: AccountType.GENERIC });
    expect(screen.queryByText('Filled in from your email. Check it, then create.')).toBeNull();
    expect(screen.queryByText('From your email')).toBeNull();
    fill('Account name', 'Cash');
    submit('Add account');
    await waitFor(() => expect(mutations.createAccountMutation.mutateAsync).toHaveBeenCalled());
    const { body } = mutations.createAccountMutation.mutateAsync.mock.calls[0][0];
    expect(body).toEqual({ type: AccountType.GENERIC, name: 'Cash', excludeFromNetAsset: false, financialPosition: 'asset', description: '' });
    expect('fromSuggestionId' in body).toBe(false);
  });
});
