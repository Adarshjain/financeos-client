import { render, screen, waitFor, within } from '@testing-library/react';
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
const actions = vi.hoisted(() => ({ hideSuggestion: vi.fn(), undoHideSuggestion: vi.fn(), answerIsThis: vi.fn() }));
vi.mock('./suggestionActions', () => actions);
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({ ...(await orig<typeof import('@/components/ds/Toast/Toast')>()), showToast: toast }));

import type { Account } from '@/lib/account.types';

import { BankSection, CardsSection } from './AccountsSections';
import { addTarget } from './SuggestionRows';
import type { SectionSuggestions, SuggestionRow } from './suggestionsModel';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const row = (over: Partial<SuggestionRow> = {}): SuggestionRow => ({
  suggestion: true,
  id: 's1',
  closed: false,
  band: 'FOUND',
  kind: 'CREDIT_CARD',
  bankId: 'hdfc',
  name: 'HDFC Bank Regalia',
  last4: '4321',
  sub: 'Seen in 6 emails',
  parentAccountId: null,
  isThis: null,
  ...over,
});
const sugg = (over: Partial<SectionSuggestions['bands']> = {}, parents: Account[] = []): SectionSuggestions => ({
  bands: { found: [], older: [], maybe: [], ...over },
  parents,
});
const cardProps = { rows: [], closedRows: [], closedLine: null, subtitle: '' };
const bankProps = { rows: [], closedRows: [], closedLine: null };

beforeEach(() => {
  vi.clearAllMocks();
  actions.hideSuggestion.mockResolvedValue({ success: true, data: undefined });
  actions.undoHideSuggestion.mockResolvedValue({ success: true, data: undefined });
  actions.answerIsThis.mockResolvedValue({ success: true, data: undefined });
});

describe('addTarget', () => {
  it('opens Add bank account for a bank account and a parentless debit card', () => {
    expect(addTarget({ kind: 'BANK_ACCOUNT', parentAccountId: null }, new Set())).toEqual({ open: 'bank_account' });
    expect(addTarget({ kind: 'DEBIT_CARD', parentAccountId: null }, new Set())).toEqual({ open: 'bank_account' });
  });

  it('opens Add credit card for a credit card and a parentless add-on or replacement', () => {
    expect(addTarget({ kind: 'CREDIT_CARD', parentAccountId: null }, new Set())).toEqual({ open: 'credit_card' });
    expect(addTarget({ kind: 'ADDON_CARD', parentAccountId: null }, new Set())).toEqual({ open: 'credit_card' });
    expect(addTarget({ kind: 'REPLACEMENT_CARD', parentAccountId: null }, new Set())).toEqual({ open: 'credit_card' });
  });

  it('opens Edit on the parent account for a card that belongs to one', () => {
    expect(addTarget({ kind: 'DEBIT_CARD', parentAccountId: 'a1' }, new Set(['a1']))).toEqual({ edit: 'a1' });
    expect(addTarget({ kind: 'ADDON_CARD', parentAccountId: 'a1' }, new Set(['a1']))).toEqual({ edit: 'a1' });
  });

  it('falls back to Add when the parent is not in the list', () => {
    expect(addTarget({ kind: 'DEBIT_CARD', parentAccountId: 'gone' }, new Set())).toEqual({ open: 'bank_account' });
  });
});

describe('suggestion rows in a section', () => {
  it('draws Found rows under their band, with name, number and caption', () => {
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    expect(screen.getByText('Found in your email · 1')).toBeInTheDocument();
    expect(screen.getAllByText('HDFC Bank Regalia').length).toBeGreaterThan(0);
    expect(screen.getAllByText('••4321').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seen in 6 emails').length).toBeGreaterThan(0);
  });

  it('draws no band that has no rows', () => {
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    expect(screen.queryByText(/Older cards/)).toBeNull();
    expect(screen.queryByText(/Maybe yours/)).toBeNull();
  });

  it('keeps Older and Maybe rows collapsed until Show', async () => {
    render(
      <BankSection
        {...bankProps}
        suggestions={sugg({ older: [row({ id: 'o', kind: 'BANK_ACCOUNT', name: 'Old Bank account' })], maybe: [row({ id: 'm', kind: 'BANK_ACCOUNT', name: 'Maybe Bank account' })] })}
      />,
    );
    expect(screen.getByText('Older accounts · 1')).toBeInTheDocument();
    expect(screen.getByText('Maybe yours · 1')).toBeInTheDocument();
    expect(screen.queryByText('Old Bank account')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Show' })[0]);
    expect(screen.getAllByText('Old Bank account').length).toBeGreaterThan(0);
    expect(screen.queryByText('Maybe Bank account')).toBeNull();
  });

  it('Not mine hides the row, refreshes and offers Undo', async () => {
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    await user.click(screen.getAllByRole('button', { name: 'Not mine' })[0]);
    await waitFor(() => expect(actions.hideSuggestion).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    const [message, options] = toast.mock.calls[0];
    expect(message).toBe('Hidden HDFC Bank Regalia ••4321');
    options.action.onSelect();
    await waitFor(() => expect(actions.undoHideSuggestion).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(2));
  });

  it('shows an error toast and does not refresh when hiding fails', async () => {
    actions.hideSuggestion.mockResolvedValue({ success: false, error: { message: "Couldn't hide this. Try again." } });
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    await user.click(screen.getAllByRole('button', { name: 'Not mine' })[0]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't hide this. Try again.", { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('Add opens the Add account dialog for the section type', async () => {
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(dialogs.open).toHaveBeenCalledWith('credit_card');
  });

  it('Add on a debit card with a parent opens Edit for that account', async () => {
    const parent = { id: 'a1' } as Account;
    render(
      <BankSection
        {...bankProps}
        suggestions={sugg({ found: [row({ kind: 'DEBIT_CARD', name: 'Debit card', parentAccountId: 'a1' })] }, [parent])}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit a1');
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('asks "Is this your …?" with No and Yes, and sends the answer', async () => {
    render(
      <CardsSection
        {...cardProps}
        suggestions={sugg({ found: [row({ sub: 'Is this your Axis Magnus?', isThis: { accountId: 'a2', accountName: 'Axis Magnus' } })] })}
      />,
    );
    expect(screen.getAllByText('Is this your Axis Magnus?').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Yes' })[0]);
    await waitFor(() => expect(actions.answerIsThis).toHaveBeenCalledWith('s1', 'a2', true));
    await user.click(screen.getAllByRole('button', { name: 'No' })[0]);
    await waitFor(() => expect(actions.answerIsThis).toHaveBeenCalledWith('s1', 'a2', false));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it('a suggestion row opens no account page', async () => {
    render(<CardsSection {...cardProps} suggestions={sugg({ found: [row()] })} />);
    await user.click(screen.getAllByText('HDFC Bank Regalia')[0]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows the section empty copy when nothing is listed', () => {
    render(<CardsSection {...cardProps} emptyText="Cards we find in your email show up here." />);
    expect(screen.getByText('Cards we find in your email show up here.')).toBeInTheDocument();
  });
});
