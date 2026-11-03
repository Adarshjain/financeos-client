import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ saveBelongs: vi.fn() }));
vi.mock('./suggestionActions', () => actions);

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { SuggestionBelongsDialog } from './SuggestionBelongsDialog';
import { fittingAccounts, type SuggestionItem, suggestionRow } from './suggestionsModel';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const acct = (id: string, name: string, bank: string, type: AccountType): Account => ({ id, name, bank, type }) as unknown as Account;
const accounts = [
  acct('c1', 'HDFC Regalia', 'hdfc', AccountType.CREDIT_CARD),
  acct('c2', 'Axis Magnus', 'axis', AccountType.CREDIT_CARD),
  acct('b1', 'HDFC Savings', 'hdfc', AccountType.BANK_ACCOUNT),
];

const row = (over: Partial<SuggestionItem> = {}) =>
  suggestionRow({
    id: 's1',
    kind: 'CREDIT_CARD',
    band: 'FOUND',
    kindConf: 'HIGH',
    bank: { id: 'hdfc', name: 'HDFC Bank' },
    last4: '4321',
    caption: '38 emails since Jan 2022',
    parentAccount: null,
    candidateAccount: null,
    ...over,
  } as unknown as SuggestionItem);

const open = (r = row(), onSaved = vi.fn(), onClose = vi.fn()) => {
  render(<SuggestionBelongsDialog row={r} accounts={accounts} onClose={onClose} onSaved={onSaved} />);
  return { onSaved, onClose };
};

const pick = async (label: RegExp, option: RegExp | string) => {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(screen.getByRole('option', { name: option }));
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.saveBelongs.mockResolvedValue({ success: true, data: undefined });
});

describe('fittingAccounts', () => {
  it('keeps the accounts at the bank of the right type', () => {
    expect(fittingAccounts(row(), accounts).map((a) => a.id)).toEqual(['c1']);
    expect(fittingAccounts(row({ kind: 'DEBIT_CARD' }), accounts).map((a) => a.id)).toEqual(['b1']);
    expect(fittingAccounts(row({ bank: { id: 'icici', name: 'ICICI' } } as Partial<SuggestionItem>), accounts)).toEqual([]);
  });
});

describe('SuggestionBelongsDialog', () => {
  it('titles with the number, shows the subtitle and lists only same-bank cards', async () => {
    open();
    expect(screen.getByText('Where does ••4321 belong?')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank card · 38 emails since Jan 2022')).toBeInTheDocument();
    expect(screen.getByText('Only accounts at HDFC Bank are listed.')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /^Account/ }));
    expect(screen.getByRole('option', { name: 'HDFC Regalia' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Axis Magnus' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'HDFC Savings' })).toBeNull();
  });

  it('offers the three card choices', async () => {
    open();
    await user.click(screen.getByRole('combobox', { name: /^It's/ }));
    expect(screen.getByRole('option', { name: /An older number of this card/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /An add-on card/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Another card of mine on this account/ })).toBeInTheDocument();
  });

  it('offers the two bank choices and lists bank accounts', async () => {
    open(row({ kind: 'DEBIT_CARD' }));
    await user.click(screen.getByRole('combobox', { name: /^Account/ }));
    expect(screen.getByRole('option', { name: 'HDFC Savings' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('combobox', { name: /^It's/ }));
    expect(screen.getByRole('option', { name: 'A debit card on this account' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'The same account (another number for it)' })).toBeInTheDocument();
  });

  it('preselects the suggestion\'s parent when it fits, and keeps Save off until both are set', async () => {
    open(row({ parentAccount: { id: 'c1', name: 'HDFC Regalia' } } as Partial<SuggestionItem>));
    expect(screen.getByRole('combobox', { name: /^Account/ })).toHaveTextContent('HDFC Regalia');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await pick(/^It's/, /An older number/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('sends an older number and reports the account', async () => {
    const { onSaved } = open();
    await pick(/^Account/, 'HDFC Regalia');
    await pick(/^It's/, /An older number/);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.saveBelongs).toHaveBeenCalledWith('s1', { accountId: 'c1', as: 'OLDER_NUMBER' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(accounts[0]));
  });

  it('needs a relationship for an add-on and sends it with the holder name', async () => {
    open();
    await pick(/^Account/, 'HDFC Regalia');
    await pick(/^It's/, /An add-on card/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await pick(/^Relationship/, 'Spouse');
    await user.type(screen.getByRole('textbox', { name: /^Holder name/ }), 'Asha');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(actions.saveBelongs).toHaveBeenCalledWith('s1', { accountId: 'c1', as: 'ADDON', relationship: 'SPOUSE', holderName: 'Asha' }),
    );
  });

  it('shows the server message and stays open', async () => {
    actions.saveBelongs.mockResolvedValue({ success: false, error: { message: 'That card already has 4321.' } });
    const { onClose } = open();
    await pick(/^Account/, 'HDFC Regalia');
    await pick(/^It's/, /Another card of mine/);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('That card already has 4321.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
