import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds';

import { EMPTY_SEARCH_RESULT, type GlobalSearchResult } from './searchApi';
import { buildSearchGroups, type SearchAction, type SearchPage } from './searchItems';

const pages: SearchPage[] = [
  { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
  { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/reports' },
];
const quick = vi.fn();
const actions: SearchAction[] = [
  { id: 'transaction', label: 'Transaction', icon: 'add', onSelect: quick },
  { id: 'import', label: 'Import', icon: 'upload', onSelect: vi.fn() },
];

const result: GlobalSearchResult = {
  accounts: [
    { id: 'a1', name: 'HDFC Regalia Gold', bank: 'HDFC', type: 'CREDIT_CARD', last4: '7741' },
    { id: 'a2', name: 'Cash wallet', bank: null, type: 'CASH', last4: null },
  ],
  transactions: [
    { id: 't1', date: '2026-09-09', description: 'Croma Electronics', accountId: 'a1', accountName: 'HDFC', amount: -24990 },
    { id: 't2', date: '2026-09-18', description: 'Croma refund', accountId: 'a1', accountName: 'HDFC', amount: 46800 },
  ],
  holdings: [
    { instrumentId: 'i1', name: 'Infosys', symbol: 'INFY' },
    { instrumentId: 'i2', name: 'Gold fund', symbol: null },
  ],
  people: [{ id: 'p1', name: 'Rahul' }],
  loans: [
    { id: 'l1', name: 'Home loan', lender: 'SBI' },
    { id: 'l2', name: 'Car loan', lender: null },
  ],
  reports: [{ id: 'r1', name: 'PhonePe 10%', type: 'KPI' }],
  dashboards: [{ id: 'd1', name: 'Home', isDefault: true }],
};

const build = (query: string, res: GlobalSearchResult | null = result, go = vi.fn()) => ({
  groups: buildSearchGroups({ query, result: res, pages, actions, go }),
  go,
});
const ids = (groups: ReturnType<typeof build>['groups']) => groups.filter((g) => g.items.length).map((g) => g.id);
const group = (groups: ReturnType<typeof build>['groups'], id: string) => groups.find((g) => g.id === id)!;

describe('buildSearchGroups', () => {
  it('orders the groups Accounts, Actions, Transactions, Holdings, Lending, Loans, Reports, Dashboards, Pages, Ask', () => {
    const { groups } = build('Transaction');
    expect(groups.map((g) => g.id)).toEqual([
      'accounts', 'actions', 'transactions', 'holdings', 'lending', 'loans', 'reports', 'dashboards', 'pages', 'ask',
    ]);
    expect(ids(groups)).toEqual([
      'accounts', 'actions', 'transactions', 'holdings', 'lending', 'loans', 'reports', 'dashboards', 'ask',
    ]);
  });

  it('shows every page and action for empty text, and no Ask row', () => {
    const { groups } = build('');
    expect(ids(groups)).toEqual(['actions', 'pages']);
    expect(group(groups, 'pages').items).toHaveLength(2);
  });

  it('filters Pages and Actions from the first character, case-insensitively', () => {
    const { groups } = build('Rep');
    expect(group(groups, 'pages').items.map((i) => i.title)).toEqual(['Reports']);
    expect(group(groups, 'actions').items.map((i) => i.title)).toEqual([]);
    expect(group(build('i').groups, 'actions').items.map((i) => i.title)).toEqual(['Transaction', 'Import']);
    expect(group(build('p').groups, 'actions').items.map((i) => i.title)).toEqual(['Import']);
    const two = build('im').groups;
    expect(group(two, 'actions').items.map((i) => i.title)).toEqual(['Import']);
  });

  it('shows server groups only from 3 characters', () => {
    expect(ids(build('cr').groups)).not.toContain('accounts');
    expect(ids(build('cr').groups)).not.toContain('transactions');
    expect(ids(build('cro').groups)).toContain('accounts');
  });

  it('shows no server group before an answer arrives, but keeps Pages, Actions and Ask', () => {
    const { groups } = build('acc', null);
    expect(ids(groups)).toEqual(['pages', 'ask']);
    expect(build('acc', EMPTY_SEARCH_RESULT).groups.filter((g) => g.items.length).map((g) => g.id)).toEqual(['pages', 'ask']);
  });

  it('writes the row titles like the board, leaving out a null last4, lender or symbol', () => {
    const { groups } = build('Home');
    expect(group(groups, 'accounts').items.map((i) => i.title)).toEqual(['HDFC Regalia Gold · ••7741', 'Cash wallet']);
    expect(group(groups, 'transactions').items.slice(0, 2).map((i) => i.title)).toEqual([
      'Croma Electronics · 9 Sep',
      'Croma refund · 18 Sep',
    ]);
    expect(group(groups, 'holdings').items.map((i) => i.title)).toEqual(['Infosys · INFY', 'Gold fund']);
    expect(group(groups, 'lending').items.map((i) => i.title)).toEqual(['Rahul']);
    expect(group(groups, 'loans').items.map((i) => i.title)).toEqual(['Home loan · SBI', 'Car loan']);
    expect(group(groups, 'reports').items.map((i) => i.title)).toEqual(['PhonePe 10%']);
    expect(group(groups, 'dashboards').items.map((i) => i.title)).toEqual(['Home']);
    expect(group(groups, 'ask').items.map((i) => i.title)).toEqual(['Ask the data: Home']);
  });

  it('opens each result on its own page', () => {
    const { groups, go } = build('Acc');
    const pick = (g: string, n = 0) => group(groups, g).items[n].onSelect();
    pick('accounts');
    pick('holdings');
    pick('lending');
    pick('loans');
    pick('reports');
    pick('dashboards');
    pick('pages', 0);
    pick('ask');
    expect(go.mock.calls.map((c) => c[0])).toEqual([
      '/ds/accounts/a1',
      '/ds/investments/i1',
      '/ds/loans/lendings/p1',
      '/ds/loans/l1',
      '/ds/reports/r1',
      '/ds/dashboards/d1',
      '/ds/accounts',
      '/chat',
    ]);
  });

  it('opens a transaction on the Transactions page searched for its description over all time', () => {
    const { groups, go } = build('Croma');
    group(groups, 'transactions').items[0].onSelect();
    expect(go).toHaveBeenCalledWith('/ds/transactions?q=Croma+Electronics');
  });

  it('ends the transactions with "See all matching transactions" for the typed text', () => {
    const { groups, go } = build('  Croma ');
    const items = group(groups, 'transactions').items;
    expect(items).toHaveLength(3);
    expect(items[2].title).toBe('See all matching transactions');
    items[2].onSelect();
    expect(go).toHaveBeenCalledWith('/ds/transactions?q=Croma');
  });

  it('has no See all row when no transaction matches', () => {
    const { groups } = build('Croma', { ...result, transactions: [] });
    expect(group(groups, 'transactions').items).toEqual([]);
  });

  it('does not run a disabled action', () => {
    const groups = buildSearchGroups({
      query: 'imp',
      result: null,
      pages,
      actions: [{ id: 'import', label: 'Import', icon: 'upload', disabled: true, onSelect: vi.fn() }],
      go: vi.fn(),
    });
    expect(group(groups, 'actions').items[0].disabled).toBe(true);
  });

  it('runs an action instead of navigating', () => {
    const { groups, go } = build('Transaction');
    group(groups, 'actions').items[0].onSelect();
    expect(quick).toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  describe('transaction amounts', () => {
    const amounts = (concealed: boolean) => {
      const items = group(build('Croma').groups, 'transactions').items;
      render(
        <ConcealProvider concealed={concealed}>
          {items.slice(0, 2).map((i) => (
            <p key={i.id}>{i.trailing}</p>
          ))}
        </ConcealProvider>,
      );
    };

    it('shows a debit as ₹24,990 and a credit as +₹46,800 in the money-in tone', () => {
      amounts(false);
      expect(screen.getByText('₹24,990')).toHaveClass('text-ink');
      expect(screen.getByText('+₹46,800')).toHaveClass('text-positive');
    });

    it('shows ₹ — in ink for both while amounts are hidden', () => {
      amounts(true);
      const hidden = screen.getAllByText('₹ —');
      expect(hidden).toHaveLength(2);
      hidden.forEach((h) => expect(h).toHaveClass('text-ink'));
      expect(screen.queryByText('₹24,990')).toBeNull();
    });
  });
});
