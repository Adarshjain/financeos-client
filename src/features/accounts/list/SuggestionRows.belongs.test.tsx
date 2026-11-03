import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/accounts' }));
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  useAccountDialogs: () => ({ open: vi.fn(), preload: vi.fn(), loading: false }),
  loadAccountForm: () => Promise.resolve(() => null),
}));
const actions = vi.hoisted(() => ({
  hideSuggestion: vi.fn(),
  undoHideSuggestion: vi.fn(),
  answerIsThis: vi.fn(),
  saveBelongs: vi.fn(),
  declineOlderNumber: vi.fn(),
}));
vi.mock('./suggestionActions', () => actions);
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({ ...(await orig<typeof import('@/components/ds/Toast/Toast')>()), showToast: toast }));

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { CardsSection } from './AccountsSections';
import { type SectionSuggestions, type SuggestionItem, suggestionRow } from './suggestionsModel';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const regalia = { id: 'c1', name: 'HDFC Regalia', bank: 'hdfc', type: AccountType.CREDIT_CARD } as unknown as Account;

const item = (over: Partial<SuggestionItem> = {}) =>
  ({
    id: 's1',
    kind: 'CREDIT_CARD',
    band: 'FOUND',
    kindConf: 'HIGH',
    bank: { id: 'hdfc', name: 'HDFC Bank' },
    last4: '4321',
    caption: 'Seen in 6 emails',
    parentAccount: null,
    candidateAccount: null,
    ...over,
  }) as unknown as SuggestionItem;

const sugg = (band: 'found' | 'older' | 'maybe', i: SuggestionItem, accounts: Account[] = [regalia]): SectionSuggestions => ({
  bands: { found: [], older: [], maybe: [], [band]: [suggestionRow(i)] },
  parents: [],
  accounts,
});
const props = { rows: [], closedRows: [], closedLine: null, subtitle: '' };

beforeEach(() => {
  vi.clearAllMocks();
  actions.saveBelongs.mockResolvedValue({ success: true, data: undefined });
  actions.declineOlderNumber.mockResolvedValue({ success: true, data: undefined });
});

/** Older and Maybe start collapsed. */
const showBand = async (band: string) => {
  if (band !== 'found') await user.click(screen.getByRole('button', { name: 'Show' }));
};

describe('Part of another account', () => {
  it.each([['found'], ['older'], ['maybe']] as const)('shows in the %s band next to Not mine', async (band) => {
    render(<CardsSection {...props} suggestions={sugg(band, item({ band: band.toUpperCase() as SuggestionItem['band'] }))} />);
    await showBand(band);
    expect(screen.getAllByRole('button', { name: 'Part of another account' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Not mine' }).length).toBeGreaterThan(0);
  });

  it('is hidden when no account of that type sits at the bank', () => {
    render(<CardsSection {...props} suggestions={sugg('found', item(), [{ ...regalia, bank: 'axis' } as Account])} />);
    expect(screen.queryByRole('button', { name: 'Part of another account' })).toBeNull();
  });

  it('opens the Where does it belong dialog', async () => {
    render(<CardsSection {...props} suggestions={sugg('found', item())} />);
    await user.click(screen.getAllByRole('button', { name: 'Part of another account' })[0]);
    expect(await screen.findByText('Where does ••4321 belong?')).toBeInTheDocument();
  });
});

describe('Older number question', () => {
  const older = () => item({ band: 'OLDER', parentAccount: { id: 'c1', name: 'HDFC Regalia', last4: '1111' } });

  it('asks "Older number on {account}?" with No and Yes instead of the buttons', async () => {
    render(<CardsSection {...props} suggestions={sugg('older', older())} />);
    await showBand('older');
    expect(screen.getAllByText('Older number on HDFC Regalia?').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Not mine' })).toBeNull();
  });

  it('Yes files it as an older number, refreshes and toasts', async () => {
    render(<CardsSection {...props} suggestions={sugg('older', older())} />);
    await showBand('older');
    await user.click(screen.getAllByRole('button', { name: 'Yes' })[0]);
    await waitFor(() => expect(actions.saveBelongs).toHaveBeenCalledWith('s1', { accountId: 'c1', as: 'OLDER_NUMBER' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Saved ••4321 on HDFC Regalia');
  });

  it('No declines the link and refreshes without a toast', async () => {
    render(<CardsSection {...props} suggestions={sugg('older', older())} />);
    await showBand('older');
    await user.click(screen.getAllByRole('button', { name: 'No' })[0]);
    await waitFor(() => expect(actions.declineOlderNumber).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).not.toHaveBeenCalled();
  });

  it('a Found card with a parent keeps its normal row', () => {
    render(<CardsSection {...props} suggestions={sugg('found', item({ parentAccount: { id: 'c1', name: 'HDFC Regalia' } } as Partial<SuggestionItem>))} />);
    expect(screen.queryByText(/Older number on/)).toBeNull();
  });
});
