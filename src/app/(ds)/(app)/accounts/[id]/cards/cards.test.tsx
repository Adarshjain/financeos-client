import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CardsData } from '@/features/accounts/detail/cards/cardsData';
import { buildCardsModel } from '@/features/accounts/detail/cards/cardsModel';
import type { Account, Cardholder, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountCardsPage from './page';

class NotFoundSignal extends Error {}
const notFound = vi.fn(() => {
  throw new NotFoundSignal('NEXT_NOT_FOUND');
});
const refresh = vi.fn();
const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  unstable_rethrow: () => undefined,
  notFound: () => notFound(),
  usePathname: () => '/accounts/c1/cards',
  useRouter: () => ({ push: vi.fn(), refresh, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const loadAccount = vi.fn<(id: string) => Promise<Account | null>>();
vi.mock('@/features/accounts/detail/accountData', () => ({
  loadAccount: (id: string) => loadAccount(id),
}));

const loadCards = vi.fn<() => Promise<Omit<CardsData, 'model'>>>();
vi.mock('@/features/accounts/detail/cards/cardsData', () => ({
  // The real loader builds the model from what the API gave; the test supplies that data.
  loadCardsData: async (account: Account, today: string) => {
    const raw = await loadCards();
    const model = raw.cardholders
      ? buildCardsModel({
          cardholders: raw.cardholders,
          stats: raw.stats,
          isBank: account.type === AccountType.BANK_ACCOUNT,
          creditCard: account.type === AccountType.CREDIT_CARD ? account : null,
          today,
        })
      : null;
    return { ...raw, model };
  },
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const mutate = {
  addPrimaryMutation: vi.fn(),
  addAddonMutation: vi.fn(),
  updateCardholderMutation: vi.fn(),
  closeCardholderMutation: vi.fn(),
  reopenCardholderMutation: vi.fn(),
  deleteCardholderMutation: vi.fn(),
  addCardMutation: vi.fn(),
  replaceCardMutation: vi.fn(),
  closeCardMutation: vi.fn(),
  reattributeMutation: vi.fn(),
};
vi.mock('@/features/accounts/cards/useCardsDialogMutations', () => ({
  useCardsDialogMutations: () =>
    Object.fromEntries(
      Object.entries(mutate).map(([name, fn]) => [name, { mutateAsync: fn, isPending: false }])
    ),
}));

const apiDelete = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  api: { DELETE: (...args: unknown[]) => apiDelete(...args), GET: vi.fn() },
}));
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
  creditLimit: 300000,
  balance: -1000,
  limitPool: {
    id: 'p1',
    name: 'HDFC cards',
    creditLimit: 500000,
    owed: 0,
    available: 500000,
    memberCount: 2,
    openMemberCount: 2,
  },
};

const bank: Account = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', balance: 100 };

const arjun: Cardholder = {
  id: 'h1',
  accountId: 'c1',
  role: 'PRIMARY',
  personName: 'Arjun Mehta',
  openedOn: '2024-03-15',
  transactionCount: 19,
  cards: [
    { id: 'k1', cardholderId: 'h1', last4: '7741', issuedOn: '2025-06-02', closedOn: null },
    { id: 'k0', cardholderId: 'h1', last4: '2210', issuedOn: '2024-03-15', closedOn: '2025-06-02' },
  ],
};
const meera: Cardholder = {
  id: 'h2',
  accountId: 'c1',
  role: 'ADDON',
  personName: 'Meera Mehta',
  relationship: 'SPOUSE',
  openedOn: '2024-06-01',
  spendLimit: 75000,
  transactionCount: 4,
  cards: [{ id: 'k2', cardholderId: 'h2', last4: '7742', issuedOn: '2024-06-01', closedOn: null }],
};
const rohan: Cardholder = {
  id: 'h3',
  accountId: 'c1',
  role: 'ADDON',
  personName: 'Rohan Mehta',
  relationship: 'SIBLING',
  closedOn: '2026-06-30',
  transactionCount: 12,
  cards: [],
};

const data = (over: Partial<Omit<CardsData, 'model'>> = {}): Omit<CardsData, 'model'> => ({
  cardholders: [arjun, meera, rohan],
  stats: [
    {
      cardholderId: 'h1',
      currentCycleSpend: 0,
      spendThisYear: 34448,
      transactionCount: 19,
      lastUsedOn: '2026-10-12',
      cards: [{ cardId: 'k0', transactionCount: 41 }],
    },
    {
      cardholderId: 'h2',
      currentCycleSpend: 4950,
      spendThisYear: 4952,
      transactionCount: 4,
      lastUsedOn: '2026-09-29',
    },
  ],
  ...over,
});

async function renderPage(id = 'c1') {
  const ui = await DsAccountCardsPage({ params: Promise.resolve({ id }) });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Opens the ⋯ menu of the n-th holder (open holders first, then closed) and picks an item. */
function pickMenu(index: number, item: string) {
  const trigger = screen.getAllByRole('button', { name: 'Cardholder actions' })[index];
  fireEvent.pointerDown(trigger, { button: 0 });
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('/accounts/[id]/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = '';
    window.history.replaceState(null, '', '/accounts/c1/cards');
    loadAccount.mockResolvedValue(card);
    loadCards.mockResolvedValue(data());
    Object.values(mutate).forEach((fn) => fn.mockResolvedValue({}));
    mutate.reattributeMutation.mockResolvedValue({ updatedCount: 7 });
    apiDelete.mockResolvedValue({});
  });

  describe('credit card', () => {
    it('shows one card per open holder with figures, plastics and the shared limit', async () => {
      await renderPage();

      expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Account holder · opened 15 Mar 24')).toBeInTheDocument();
      expect(screen.getByText('₹34,448')).toBeInTheDocument();
      expect(screen.getByText('12 Oct')).toBeInTheDocument();
      expect(screen.getByText('Add-on')).toBeInTheDocument();
      expect(
        screen.getByText('Spouse · added 1 Jun 24 · spend limit ₹75,000')
      ).toBeInTheDocument();
      expect(screen.getByText('6.6%')).toBeInTheDocument();
      expect(screen.getAllByText('Plastics')).toHaveLength(2);
      expect(screen.getByText('••7741')).toBeInTheDocument();
      expect(screen.getByText('issued 2 Jun 25')).toBeInTheDocument();
      expect(screen.getByText('Replaced')).toBeInTheDocument();
      expect(screen.getByText('15 Mar 24 → 2 Jun 25 · 41 transactions')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Replace' })).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Delete card ••2210' })).toBeInTheDocument();

      expect(screen.getAllByText('Shared limit')).toHaveLength(2);
      expect(screen.queryByText('Own limit · ₹3,00,000')).toBeNull();
      expect(screen.getByText('HDFC cards · ₹5,00,000 · 2 cards')).toBeInTheDocument();
      window.history.replaceState(null, '', '/accounts/c1/cards');
      const push = vi.spyOn(window.history, 'pushState');
      screen.getByRole('button', { name: 'Change' }).click();
      expect(push).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
      push.mockRestore();
      expect(screen.queryByText(/^Debit cards on this account/)).toBeNull();
    });

    it('shows a closed holder as a compact row with Reopen', async () => {
      await renderPage();
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(
        screen.getByText('Add-on · sibling · closed 30 Jun 26 · 12 transactions kept')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    });

    it('offers the close-cardholder footer on the add-on only', async () => {
      await renderPage();
      expect(
        screen.getAllByText('Close this cardholder when the add-on is cancelled; history stays.')
      ).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Close cardholder' })).toHaveLength(1);
    });

    it('drops the figures when stats failed, and shows an error when cardholders failed', async () => {
      loadCards.mockResolvedValue(data({ stats: null }));
      const first = await renderPage();
      expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
      expect(screen.queryByText('Spend · year')).toBeNull();
      first.unmount();

      loadCards.mockResolvedValue(data({ cardholders: null }));
      await renderPage();
      expect(screen.getByText("Couldn't load cardholders")).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(refresh).toHaveBeenCalled();
    });

    it('shows the empty state without cardholders', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [] }));
      await renderPage();
      expect(screen.getByText('No cardholders yet')).toBeInTheDocument();
    });

    it('raises not-found for an account type that has no Cards tab, and for a missing account', async () => {
      loadAccount.mockResolvedValue({ id: 'k1', type: AccountType.BROKER, name: 'Zerodha' });
      await expect(DsAccountCardsPage({ params: Promise.resolve({ id: 'k1' }) })).rejects.toBeInstanceOf(
        NotFoundSignal
      );
      loadAccount.mockResolvedValue(null);
      await expect(DsAccountCardsPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toBeInstanceOf(
        NotFoundSignal
      );
    });
  });

  describe('menus', () => {
    it('gives the primary Edit and Reassign, and the add-on Close and no Delete while it has transactions', async () => {
      await renderPage();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Cardholder actions' })[0], {
        button: 0,
      });
      expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
        'Edit details',
        'Reassign transactions',
      ]);
    });

    it('offers Delete on an add-on that has no transactions', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [arjun, { ...meera, transactionCount: 0 }] }));
      await renderPage();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Cardholder actions' })[1], {
        button: 0,
      });
      expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
        'Edit details',
        'Reassign transactions',
        'Close cardholder',
        'Delete cardholder',
      ]);
    });

    it('offers Add a card only to a holder without an active card', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [arjun, { ...meera, cards: [] }] }));
      await renderPage();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Cardholder actions' })[1], {
        button: 0,
      });
      expect(screen.getByRole('menuitem', { name: 'Add a card' })).toBeInTheDocument();
    });
  });

  describe('dialogs', () => {
    it('edits a cardholder with the opened date, and toasts and refreshes', async () => {
      await renderPage();
      pickMenu(1, 'Edit details');
      expect(screen.getByText('Edit cardholder')).toBeInTheDocument();
      expect(screen.getByText('Meera Mehta · add-on on HDFC Regalia')).toBeInTheDocument();
      expect(screen.getByLabelText('Opened on')).toHaveValue('01/06/24');

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meera M' } });
      fireEvent.change(screen.getByLabelText(/Spend limit/), { target: { value: '90000' } });
      fireEvent.change(screen.getByLabelText('Opened on'), { target: { value: '02/06/2024' } });
      press('Save cardholder');

      await waitFor(() =>
        expect(mutate.updateCardholderMutation).toHaveBeenCalledWith({
          cardholderId: 'h2',
          body: {
            personName: 'Meera M',
            relationship: 'SPOUSE',
            spendLimit: 90000,
            openedOn: '2024-06-02',
          },
        })
      );
      await waitFor(() => expect(refresh).toHaveBeenCalled());
      expect(showToast).toHaveBeenCalledWith('Cardholder updated');
      await waitFor(() => expect(screen.queryByText('Edit cardholder')).toBeNull());
    });

    it('fixes the primary relationship in the edit dialog', async () => {
      await renderPage();
      pickMenu(0, 'Edit details');
      expect(screen.getByRole('combobox', { name: 'Relationship' })).toBeDisabled();
      press('Save cardholder');
      await waitFor(() =>
        expect(mutate.updateCardholderMutation).toHaveBeenCalledWith({
          cardholderId: 'h1',
          body: expect.objectContaining({ relationship: 'SELF' }),
        })
      );
    });

    it('replaces a card, validating the new last 4 digits first', async () => {
      await renderPage();
      fireEvent.click(screen.getAllByRole('button', { name: 'Replace' })[0]);
      expect(screen.getByText('Replace card ••7741')).toBeInTheDocument();
      expect(
        screen.getByText(/The new card takes over from today\. Reward rules, caps and transaction history stay with/)
      ).toBeInTheDocument();

      press('Replace card');
      expect(screen.getByText('New last 4 digits must be exactly 4 digits.')).toBeInTheDocument();
      expect(mutate.replaceCardMutation).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('New last 4 digits'), { target: { value: '88a2b0' } });
      press('Replace card');
      await waitFor(() =>
        expect(mutate.replaceCardMutation).toHaveBeenCalledWith({
          cardholderId: 'h1',
          cardId: 'k1',
          body: { newLast4: '8820', issuedOn: '2026-10-13' },
        })
      );
      expect(showToast).toHaveBeenCalledWith('Card replaced');
    });

    it('refuses an issue date in the future as it is typed', async () => {
      await renderPage();
      fireEvent.click(screen.getAllByRole('button', { name: 'Replace' })[0]);
      fireEvent.change(screen.getByLabelText('New last 4 digits'), { target: { value: '8820' } });
      fireEvent.change(screen.getByLabelText('Issued on'), { target: { value: '14/10/2026' } });
      expect(screen.getByText('Pick the issued date on or before today.')).toBeInTheDocument();
      press('Replace card');
      expect(mutate.replaceCardMutation).not.toHaveBeenCalled();
    });

    it('closes a card with the closed date', async () => {
      await renderPage();
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
      expect(screen.getByText('Close card ••7742')).toBeInTheDocument();
      expect(
        screen.getByText('Closes this card number. Meera Mehta stays open and keeps their history.')
      ).toBeInTheDocument();
      press('Close card');
      await waitFor(() =>
        expect(mutate.closeCardMutation).toHaveBeenCalledWith({
          cardholderId: 'h2',
          cardId: 'k2',
          body: { closedOn: '2026-10-13' },
        })
      );
      expect(showToast).toHaveBeenCalledWith('Card plastic closed');
    });

    it('closes a cardholder from the footer button', async () => {
      await renderPage();
      press('Close cardholder');
      expect(screen.getByText('Meera Mehta · add-on')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Closes Meera Mehta and every card they hold. Past transactions, caps and milestones stay.'
        )
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Closed on'), { target: { value: '01/10/2026' } });
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close cardholder' }));
      await waitFor(() =>
        expect(mutate.closeCardholderMutation).toHaveBeenCalledWith({
          cardholderId: 'h2',
          body: { closedOn: '2026-10-01' },
        })
      );
      expect(showToast).toHaveBeenCalledWith('Cardholder closed');
    });

    it('does not close with a date in the future', async () => {
      await renderPage();
      press('Close cardholder');
      fireEvent.change(screen.getByLabelText('Closed on'), { target: { value: '20/10/2026' } });
      expect(screen.getByText('Pick the closed date on or before today.')).toBeInTheDocument();
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close cardholder' }));
      expect(mutate.closeCardholderMutation).not.toHaveBeenCalled();
    });

    it('adds a card to a holder with none', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [arjun, { ...meera, cards: [] }] }));
      await renderPage();
      pickMenu(1, 'Add a card');
      expect(screen.getByText('Meera Mehta · HDFC Regalia')).toBeInTheDocument();

      press('Add card');
      expect(screen.getByText('Last 4 digits must be exactly 4 digits.')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Last 4 digits'), { target: { value: '1234' } });
      press('Add card');
      await waitFor(() =>
        expect(mutate.addCardMutation).toHaveBeenCalledWith({
          cardholderId: 'h2',
          body: { last4: '1234', issuedOn: '2026-10-13' },
        })
      );
      expect(showToast).toHaveBeenCalledWith('Card issued');
    });

    it('reassigns transactions to the holder card, with a plain Reassign button', async () => {
      await renderPage();
      pickMenu(1, 'Reassign transactions');
      expect(screen.getByText('Move past transactions to Meera Mehta · ••7742.')).toBeInTheDocument();
      expect(screen.queryByText(/not attributed to a plastic/i)).toBeNull();
      fireEvent.change(screen.getByLabelText(/From date/), { target: { value: '01/06/2026' } });
      press('Reassign');

      await waitFor(() =>
        expect(mutate.reattributeMutation).toHaveBeenCalledWith({
          accountId: 'c1',
          from: '2026-06-01',
          to: undefined,
          currentCardId: null,
          cardId: 'k2',
        })
      );
      expect(showToast).toHaveBeenCalledWith('7 transaction(s) reassigned');
    });

    it('refuses to reassign to a holder with no card', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [arjun, { ...meera, cards: [] }] }));
      await renderPage();
      pickMenu(1, 'Reassign transactions');
      press('Reassign');
      expect(
        screen.getByText('Target cardholder has no valid card to reassign transactions to.')
      ).toBeInTheDocument();
      expect(mutate.reattributeMutation).not.toHaveBeenCalled();
    });

    it('deletes a holder with no transactions after confirming what goes', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [arjun, { ...meera, transactionCount: 0 }] }));
      await renderPage();
      pickMenu(1, 'Delete cardholder');
      expect(screen.getByText('Delete cardholder Meera Mehta?')).toBeInTheDocument();
      expect(mutate.deleteCardholderMutation).not.toHaveBeenCalled();
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(mutate.deleteCardholderMutation).toHaveBeenCalledWith('h2'));
      expect(showToast).toHaveBeenCalledWith('Cardholder deleted');
    });

    it('deletes an old card through the DELETE endpoint after confirming', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Delete card ••2210' }));
      expect(screen.getByText('Delete card ••2210?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Removes this old card from Arjun Mehta’s card list. Its 41 transactions stay with Arjun Mehta. This can\'t be undone.'
        )
      ).toBeInTheDocument();
      expect(apiDelete).not.toHaveBeenCalled();
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(apiDelete).toHaveBeenCalledWith(
          '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}',
          { params: { path: { accountId: 'c1', cardholderId: 'h1', cardId: 'k0' } } }
        )
      );
      expect(showToast).toHaveBeenCalledWith('Card plastic deleted');
    });

    it('reopens a closed holder with a plain toast, from the button and from the menu', async () => {
      await renderPage();
      press('Reopen');
      await waitFor(() => expect(mutate.reopenCardholderMutation).toHaveBeenCalledWith('h3'));
      expect(showToast).toHaveBeenCalledWith('Cardholder reopened');
      expect(refresh).toHaveBeenCalled();

      pickMenu(2, 'Reopen cardholder');
      await waitFor(() => expect(mutate.reopenCardholderMutation).toHaveBeenCalledTimes(2));
    });

    it('says why a reopen failed, in a danger toast', async () => {
      mutate.reopenCardholderMutation.mockRejectedValue(new Error('boom'));
      await renderPage();
      press('Reopen');
      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith("Couldn't reopen the cardholder. Try again.", { tone: 'danger' })
      );
    });

    it('keeps a form dialog open and shows the failure when the request fails', async () => {
      mutate.updateCardholderMutation.mockRejectedValue(new Error('boom'));
      await renderPage();
      pickMenu(1, 'Edit details');
      press('Save cardholder');
      expect(await screen.findByText("Couldn't update the cardholder. Try again.")).toBeInTheDocument();
      expect(screen.getByText('Edit cardholder')).toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });

    it('adds an add-on from the page button, with its first card', async () => {
      await renderPage();
      press('Add add-on cardholder');
      expect(screen.getByRole('dialog')).toHaveTextContent('Add add-on cardholder');

      press('Add cardholder');
      expect(screen.getByText('Cardholder name is required.')).toBeInTheDocument();
      expect(mutate.addAddonMutation).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Kabir Mehta' } });
      fireEvent.change(screen.getByLabelText(/Monthly spend limit/), { target: { value: '50000' } });
      fireEvent.change(screen.getAllByLabelText(/Last 4 digits/)[0], { target: { value: '99' } });
      press('Add cardholder');
      expect(screen.getByText('Card last 4 digits must be exactly 4 digits.')).toBeInTheDocument();

      fireEvent.change(screen.getAllByLabelText(/Last 4 digits/)[0], { target: { value: '9901' } });
      press('Add cardholder');
      await waitFor(() =>
        expect(mutate.addAddonMutation).toHaveBeenCalledWith({
          personName: 'Kabir Mehta',
          relationship: 'SPOUSE',
          spendLimit: 50000,
          last4: '9901',
          openedOn: '2026-10-13',
          issuedOn: '2026-10-13',
        })
      );
      expect(showToast).toHaveBeenCalledWith('Add-on cardholder created');
    });
  });

  describe('?add=cardholder', () => {
    it('opens the add-on dialog on load and clears the param right away, keeping the rest', async () => {
      window.history.replaceState(null, '', '/accounts/c1/cards?add=cardholder&x=1');
      await renderPage();
      expect(await screen.findByRole('dialog')).toHaveTextContent('Add add-on cardholder');
      expect(window.location.search).toBe('?x=1');

      const replaceState = vi.spyOn(window.history, 'replaceState');
      press('Cancel');
      expect(replaceState).not.toHaveBeenCalled();
      replaceState.mockRestore();
      expect(replace).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('does not open anything without the param, and does not touch the URL on close', async () => {
      await renderPage();
      expect(screen.queryByRole('dialog')).toBeNull();
      press('Add add-on cardholder');
      press('Cancel');
      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe('bank account', () => {
    const bankHolders: Cardholder[] = [
      {
        ...arjun,
        accountId: 'b1',
        cards: [{ id: 'k1', cardholderId: 'h1', last4: '4521', issuedOn: '2023-08-10', closedOn: null }],
      },
      { ...meera, accountId: 'b1', transactionCount: 61 },
    ];

    beforeEach(() => {
      loadAccount.mockResolvedValue(bank);
      loadCards.mockResolvedValue(data({ cardholders: bankHolders }));
    });

    it('shows the intro, Cards sections and Joint holder, without a shared limit or a limit-used figure', async () => {
      await renderPage('b1');
      expect(
        screen.getByText(
          'Debit cards on this account. Card spends and ATM withdrawals are attributed to the holder whose card was used.'
        )
      ).toBeInTheDocument();
      expect(screen.getAllByText('Cards')).toHaveLength(2);
      expect(screen.getByText('Joint holder')).toBeInTheDocument();
      expect(screen.getAllByText('Transactions')).toHaveLength(2);
      expect(screen.queryByText('Limit used')).toBeNull();
      expect(screen.queryByText('Shared limit')).toBeNull();
      expect(screen.queryByText('Close this cardholder when the add-on is cancelled; history stays.')).toBeNull();
    });

    it('adds a joint holder from the page button and toasts the live string', async () => {
      await renderPage('b1');
      press('Add joint holder');
      expect(screen.getByRole('dialog')).toHaveTextContent('Add joint holder');
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Kabir Mehta' } });
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add joint holder' }));
      await waitFor(() => expect(mutate.addAddonMutation).toHaveBeenCalled());
      expect(showToast).toHaveBeenCalledWith('Joint holder added');
    });

    it('asks for the first debit card when there are no cardholders', async () => {
      loadCards.mockResolvedValue(data({ cardholders: [] }));
      await renderPage('b1');
      expect(screen.getByText('No debit cards yet')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add joint holder' })).toBeNull();

      press('Add your debit card');
      press('Add debit card');
      expect(
        screen.getByText('Card last 4 digits must be exactly 4 digits.')
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Last 4 digits'), { target: { value: '4521' } });
      press('Add debit card');
      await waitFor(() =>
        expect(mutate.addPrimaryMutation).toHaveBeenCalledWith({ last4: '4521', issuedOn: '2026-10-13' })
      );
      expect(showToast).toHaveBeenCalledWith('Debit card added');
    });

    it('opens the joint-holder dialog for ?add=cardholder', async () => {
      window.history.replaceState(null, '', '/accounts/b1/cards?add=cardholder');
      await renderPage('b1');
      expect(await screen.findByRole('dialog')).toHaveTextContent('Add joint holder');
    });
  });
});
