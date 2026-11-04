import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/accounts' }));
const dialogs = vi.hoisted(() => ({ open: vi.fn(), preload: vi.fn() }));
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  useAccountDialogs: () => ({ open: dialogs.open, preload: dialogs.preload, loading: false }),
  loadAccountForm: () => Promise.resolve(({ account }: { account: { id: string } }) => <div role="dialog">Edit {account.id}</div>),
}));
const api = vi.hoisted(() => ({ loadCardholders: vi.fn() }));
vi.mock('@/features/accounts/accountActions', () => api);
const mutations = vi.hoisted(() => ({
  addHolder: vi.fn(),
  addCard: vi.fn(),
  addPrimaryCard: vi.fn(),
  replaceCard: vi.fn(),
}));
vi.mock('@/features/accounts/detail/cards/useCardholderMutations', () => ({ useCardholderMutations: () => mutations }));
vi.mock('./suggestionActions', () => ({ hideSuggestion: vi.fn(), undoHideSuggestion: vi.fn(), answerIsThis: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({ ...(await orig<typeof import('@/components/ds/Toast/Toast')>()), showToast: toast }));

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { FoundInEmailCard } from './FoundInEmailCard';
import { type SuggestionItem, suggestionRow } from './suggestionsModel';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const bankParent = { id: 'b1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT } as Account;
const cardParent = { id: 'c1', name: 'HDFC Regalia', type: AccountType.CREDIT_CARD } as Account;

const item = (over: Partial<SuggestionItem>): SuggestionItem => ({
  id: 's1',
  kind: 'CREDIT_CARD',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4321',
  variant: null,
  variantConf: null,
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});
const found = (i: SuggestionItem, parents: Account[]) => ({ bands: { found: [suggestionRow(i)], older: [], maybe: [] }, parents });
const holder = { id: 'h1', accountId: 'b1', role: 'PRIMARY', cards: [{ id: 'k1', cardholderId: 'h1', last4: '1111' }] };
const parentRef = (a: Account, last4: string) => ({ id: a.id, name: a.name, last4 });

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(mutations).forEach((m) => m.mockResolvedValue(null));
  api.loadCardholders.mockResolvedValue({ success: true, data: [holder] });
});

const pressAdd = () => user.click(screen.getAllByRole('button', { name: 'Add' })[0]);

describe('Add on a card of an account we have', () => {
  it('opens the add-on dialog for that account with the number filled and the relationship unpicked', async () => {
    const i = item({ kind: 'ADDON_CARD', last4: '0082', parentAccount: parentRef(cardParent, '4321') });
    render(<FoundInEmailCard suggestions={found(i, [cardParent])} />);
    await pressAdd();
    expect(await screen.findByText('Add add-on cardholder')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('0082');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Relationship/ })).toHaveTextContent('Pick one');
    expect(api.loadCardholders).not.toHaveBeenCalled();
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('adds the debit card to the primary holder with fromSuggestionId', async () => {
    const i = item({ kind: 'DEBIT_CARD', last4: '9911', parentAccount: parentRef(bankParent, '2222') });
    render(<FoundInEmailCard suggestions={found(i, [bankParent])} />);
    await pressAdd();
    expect(await screen.findByText('Add a card')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('9911');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    await waitFor(() => expect(mutations.addCard).toHaveBeenCalledWith(holder, expect.objectContaining({ last4: '9911', fromSuggestionId: 's1' })));
  });

  it('adds the debit card as the primary card when the account has no holder yet', async () => {
    api.loadCardholders.mockResolvedValue({ success: true, data: [] });
    const i = item({ kind: 'DEBIT_CARD', last4: '9911', parentAccount: parentRef(bankParent, '2222') });
    render(<FoundInEmailCard suggestions={found(i, [bankParent])} />);
    await pressAdd();
    await user.click(await screen.findByRole('button', { name: 'Add debit card' }));
    await waitFor(() => expect(mutations.addPrimaryCard).toHaveBeenCalledWith(expect.objectContaining({ last4: '9911', fromSuggestionId: 's1' })));
  });

  it('replaces the active primary card with the new number and fromSuggestionId', async () => {
    api.loadCardholders.mockResolvedValue({ success: true, data: [{ ...holder, accountId: 'c1' }] });
    const i = item({ kind: 'REPLACEMENT_CARD', last4: '5678', parentAccount: parentRef(cardParent, '1111') });
    render(<FoundInEmailCard suggestions={found(i, [cardParent])} />);
    await pressAdd();
    expect(await screen.findByText('Replace card ••1111')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^New last 4 digits/ })).toHaveValue('5678');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Replace card' }));
    await waitFor(() =>
      expect(mutations.replaceCard).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'h1' }),
        expect.objectContaining({ id: 'k1' }),
        expect.objectContaining({ newLast4: '5678', fromSuggestionId: 's1' }),
      ),
    );
  });

  it('falls back to Edit on the account when there is no active card to replace', async () => {
    api.loadCardholders.mockResolvedValue({ success: true, data: [{ ...holder, cards: [{ id: 'k1', last4: '1111', closedOn: '2026-01-01' }] }] });
    const i = item({ kind: 'REPLACEMENT_CARD', last4: '5678', parentAccount: parentRef(cardParent, '1111') });
    render(<FoundInEmailCard suggestions={found(i, [cardParent])} />);
    await pressAdd();
    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit c1');
  });

  it('shows the error and opens nothing when the cards can not be loaded', async () => {
    api.loadCardholders.mockResolvedValue({ success: false, error: { message: "Couldn't load the cardholders. Try again." } });
    const i = item({ kind: 'DEBIT_CARD', last4: '9911', parentAccount: parentRef(bankParent, '2222') });
    render(<FoundInEmailCard suggestions={found(i, [bankParent])} />);
    await pressAdd();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't load the cardholders. Try again.", { tone: 'danger' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Add on an account or a card without its account', () => {
  it('passes the whole suggestion to the Add account dialog', async () => {
    const i = item({ kind: 'CREDIT_CARD' });
    render(<FoundInEmailCard suggestions={found(i, [])} />);
    await pressAdd();
    expect(dialogs.open).toHaveBeenCalledWith('credit_card', { fromSuggestion: i, onCreated: expect.any(Function) });
    // Once created the page refreshes in place, so the row goes.
    dialogs.open.mock.calls[0][1].onCreated();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('opens Add DEBIT_CARD with the suggestion when it has no parent', async () => {
    const i = item({ kind: 'DEBIT_CARD' });
    render(<FoundInEmailCard suggestions={found(i, [])} />);
    await pressAdd();
    expect(dialogs.open).toHaveBeenCalledWith('bank_account', { fromSuggestion: i, onCreated: expect.any(Function) });
  });

  it.each(['ADDON_CARD', 'REPLACEMENT_CARD'] as const)('opens the plain Add dialog, claiming nothing, for a %s without its account', async (kind) => {
    render(<FoundInEmailCard suggestions={found(item({ kind }), [])} />);
    await pressAdd();
    expect(dialogs.open).toHaveBeenCalledWith('credit_card');
  });

  it('shows the error toast when loading the cardholders throws', async () => {
    api.loadCardholders.mockRejectedValue(new Error('boom'));
    const i = item({ kind: 'DEBIT_CARD', last4: '9911', parentAccount: parentRef(bankParent, '2222') });
    render(<FoundInEmailCard suggestions={found(i, [bankParent])} />);
    await pressAdd();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't load the cardholders. Try again.", { tone: 'danger' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
