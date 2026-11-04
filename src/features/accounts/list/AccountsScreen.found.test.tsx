import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { openScreen, resolveDeep, toStreams } from '@/app/(ds)/(app)/accounts/(list)/streamedTestUtils';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

import { AccountsScreen } from './AccountsScreen';
import { type AccountSuggestions, FOUND_NOTE_COPY, type ScanState, type SuggestionItem } from './suggestionsModel';

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000, bank: 'hdfc' },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', last4: '9911', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -20000 },
];

const item = (over: Partial<SuggestionItem>): SuggestionItem => ({
  id: 's1',
  kind: 'BANK_ACCOUNT',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4821',
  variant: null,
  variantConf: null,
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});

const scan: ScanState = {
  status: 'IDLE',
  firstScanDone: true,
  gmailConnected: true,
  mailsSeen: 0,
  mailsTotal: 0,
} as ScanState;

const suggestions: AccountSuggestions = {
  scan,
  items: [
    item({}),
    item({ id: 's2', kind: 'CREDIT_CARD', bank: { id: 'axis', name: 'Axis Bank' }, variant: 'Flipkart', variantConf: 'HIGH', last4: '7310' }),
  ],
};

async function renderScreen(list: Account[], found: AccountSuggestions | null) {
  const streams = toStreams({ accounts: list, bills: [], rewards: [], netWorth: 0, dayChangePct: null });
  const ui = <AccountsScreen streams={streams} data={{ accounts: list }} suggestions={found} today="2026-11-04" />;
  return render((await resolveDeep(openScreen(ui))) as React.ReactElement);
}

const sectionCard = (title: string) => screen.getByText(title).closest('[class*="rounded-ds-lg"]') as HTMLElement;

describe('Found in your email card', () => {
  it('lists every suggestion in its own card with the note line, below the hero', async () => {
    await renderScreen(accounts, suggestions);
    const card = screen.getByTestId('found-in-email');
    expect(within(card).getByText('Found in your email · 2')).toBeDefined();
    expect(within(card).getByText(FOUND_NOTE_COPY)).toBeDefined();
    expect(within(card).getAllByText('HDFC Bank account').length).toBeGreaterThan(0);
    expect(within(card).getAllByText('From your HDFC Bank emails · ••4821').length).toBeGreaterThan(0);
    expect(within(card).getAllByText('Axis Bank Flipkart').length).toBeGreaterThan(0);
    expect(screen.getByText('Net worth').compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps found rows out of the Bank accounts and Credit cards sections', async () => {
    await renderScreen(accounts, suggestions);
    const bank = sectionCard('Bank accounts');
    const cards = sectionCard('Credit cards');
    expect(within(bank).getAllByText('HDFC Savings').length).toBeGreaterThan(0);
    expect(within(bank).queryByText('HDFC Bank account')).toBeNull();
    expect(within(bank).queryByRole('button', { name: 'Not mine' })).toBeNull();
    expect(within(cards).queryByText('Axis Bank Flipkart')).toBeNull();
    expect(within(cards).queryByText(/Found in your email/)).toBeNull();
  });

  it('shows the card without the hero when the user has no accounts yet', async () => {
    await renderScreen([], suggestions);
    expect(screen.getByTestId('found-in-email')).toBeDefined();
    expect(screen.queryByText('Net worth')).toBeNull();
  });

  it('is absent when there is nothing to suggest', async () => {
    await renderScreen(accounts, { scan, items: [] });
    expect(screen.queryByTestId('found-in-email')).toBeNull();
  });
});
