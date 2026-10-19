import { describe, expect, it } from 'vitest';

import type { Card, Cardholder, CreditCard } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import {
  buildCardsModel,
  formatShortDate,
  holderMenu,
  type HolderStats,
  limitUsedTone,
  plasticModel,
  plasticStatus,
  sharedLimitModel,
} from './cardsModel';

const TODAY = '2026-10-13';

const card = (over: Partial<Card> & { id: string; last4: string }): Card => ({
  cardholderId: 'h1',
  closedOn: null,
  ...over,
});

const holder = (over: Partial<Cardholder> & { id: string }): Cardholder => ({
  accountId: 'c1',
  role: 'ADDON',
  cards: [],
  ...over,
});

const primary = holder({
  id: 'h1',
  role: 'PRIMARY',
  personName: 'Arjun Mehta',
  openedOn: '2024-03-15',
  cards: [
    card({ id: 'k2', last4: '7741', issuedOn: '2025-06-02' }),
    card({ id: 'k1', last4: '2210', issuedOn: '2024-03-15', closedOn: '2025-06-02' }),
  ],
});

const addon = holder({
  id: 'h2',
  personName: 'Meera Mehta',
  relationship: 'SPOUSE',
  openedOn: '2024-06-01',
  spendLimit: 75000,
  transactionCount: 4,
  cards: [card({ id: 'k3', cardholderId: 'h2', last4: '7742', issuedOn: '2024-06-01' })],
});

const stats: HolderStats[] = [
  {
    cardholderId: 'h1',
    currentCycleSpend: 0,
    spendThisYear: 34448,
    transactionCount: 19,
    lastUsedOn: '2026-10-12',
    cards: [{ cardId: 'k1', transactionCount: 41 }],
  },
  {
    cardholderId: 'h2',
    currentCycleSpend: 4950,
    spendThisYear: 4952,
    transactionCount: 4,
    lastUsedOn: '2026-09-29',
  },
];

describe('formatShortDate', () => {
  it('shows day, month and a two-digit year', () => {
    expect(formatShortDate('2024-03-15')).toBe('15 Mar 24');
  });
});

describe('limitUsedTone', () => {
  it('is plain under 30%, amber from 30%, rose from 70%', () => {
    expect(limitUsedTone(6.6)).toBe('ink');
    expect(limitUsedTone(29.9)).toBe('ink');
    expect(limitUsedTone(30)).toBe('warning');
    expect(limitUsedTone(69.9)).toBe('warning');
    expect(limitUsedTone(70)).toBe('danger');
  });
});

describe('plastic status and caption', () => {
  const all = primary.cards;

  it('calls a card Active while open, with its issue date', () => {
    expect(plasticModel(all[0], all, stats[0])).toMatchObject({
      mask: '••7741',
      status: 'Active',
      caption: 'issued 2 Jun 25',
    });
  });

  it('calls a card Replaced when another was issued the day it closed, with its range and transactions', () => {
    expect(plasticStatus(all[1], all)).toBe('Replaced');
    expect(plasticModel(all[1], all, stats[0])).toMatchObject({
      status: 'Replaced',
      caption: '15 Mar 24 → 2 Jun 25 · 41 transactions',
    });
  });

  it('calls a closed card with no successor Closed, and leaves the count out without stats', () => {
    const lone = [card({ id: 'k9', last4: '1111', issuedOn: '2024-01-05', closedOn: '2025-02-01' })];
    expect(plasticModel(lone[0], lone, undefined)).toMatchObject({
      status: 'Closed',
      caption: '5 Jan 24 → 1 Feb 25',
    });
  });

  it('says 1 transaction in the singular', () => {
    const lone = [card({ id: 'k9', last4: '1111', issuedOn: '2024-01-05', closedOn: '2025-02-01' })];
    const s: HolderStats = { ...stats[0], cards: [{ cardId: 'k9', transactionCount: 1 }] };
    expect(plasticModel(lone[0], lone, s).caption).toBe('5 Jan 24 → 1 Feb 25 · 1 transaction');
  });
});

describe('deletable plastics', () => {
  it('lets only a replaced or closed card be deleted, and only beside another card', () => {
    const all = primary.cards;
    expect(plasticModel(all[0], all, undefined).deletable).toBe(false);
    expect(plasticModel(all[1], all, undefined).deletable).toBe(true);
    const lone = [card({ id: 'k9', last4: '1111', issuedOn: '2024-01-05', closedOn: '2025-02-01' })];
    expect(plasticModel(lone[0], lone, undefined).deletable).toBe(false);
  });

  it('gives a bank three stat columns and a credit card four', () => {
    const m = (isBank: boolean) =>
      buildCardsModel({ cardholders: [primary], stats, isBank, creditCard: null, today: TODAY }).open[0];
    expect(m(true).statColumns).toBe(3);
    expect(m(false).statColumns).toBe(4);
  });
});

describe('holderMenu', () => {
  const ids = (h: Cardholder) => holderMenu(h, TODAY).map((i) => i.id);

  it('gives the primary Edit and Reassign only', () => {
    expect(ids(primary)).toEqual(['edit', 'reassign']);
  });

  it('adds Close for an add-on with an active card, and Delete only once it has no transactions', () => {
    expect(ids(addon)).toEqual(['edit', 'reassign', 'close']);
    const fresh = { ...addon, transactionCount: 0 };
    const menu = holderMenu(fresh, TODAY);
    expect(menu.map((i) => i.id)).toEqual(['edit', 'reassign', 'close', 'delete']);
    expect(menu[3]).toMatchObject({ destructive: true, separatorBefore: true });
  });

  it('offers Add a card only when the holder has no active card', () => {
    const noCard = { ...addon, cards: [card({ id: 'k', last4: '1', closedOn: '2025-01-01' })] };
    expect(ids(noCard)).toEqual(['edit', 'reassign', 'addCard', 'close']);
    expect(ids({ ...primary, cards: [] })).toEqual(['edit', 'reassign', 'addCard']);
  });

  it('offers Reopen first on a closed add-on, with no Add a card or Close', () => {
    const closed = { ...addon, cards: [], closedOn: '2026-06-30' };
    expect(ids(closed)).toEqual(['reopen', 'edit', 'reassign']);
    expect(ids({ ...closed, transactionCount: 0 })).toEqual(['reopen', 'edit', 'reassign', 'delete']);
  });

  it('never offers close, reopen or delete on a primary', () => {
    expect(ids({ ...primary, closedOn: '2026-06-30', transactionCount: 0 })).toEqual(['edit', 'reassign']);
  });
});

describe('buildCardsModel', () => {
  const closedHolder = holder({
    id: 'h3',
    personName: 'Rohan Mehta',
    relationship: 'SIBLING',
    closedOn: '2026-06-30',
    transactionCount: 12,
  });
  const credit = { id: 'c1', type: AccountType.CREDIT_CARD, creditLimit: 300000 } as CreditCard;

  const build = (isBank = false, s: HolderStats[] | null = stats) =>
    buildCardsModel({
      cardholders: [addon, closedHolder, primary],
      stats: s,
      isBank,
      creditCard: isBank ? null : credit,
      today: TODAY,
    });

  it('puts the primary first and splits open from closed holders', () => {
    const m = build();
    expect(m.open.map((h) => h.name)).toEqual(['Arjun Mehta', 'Meera Mehta']);
    expect(m.closed).toHaveLength(1);
  });

  it('describes a primary and an add-on', () => {
    const [p, a] = build().open;
    expect(p).toMatchObject({
      roleLabel: 'Primary',
      initials: 'AM',
      caption: 'Account holder · opened 15 Mar 2024',
      plasticsLabel: 'Plastics',
      closeFooter: false,
    });
    expect(a).toMatchObject({
      roleLabel: 'Add-on',
      caption: 'Spouse · added 1 Jun 2024 · spend limit ₹75,000',
      closeFooter: true,
    });
  });

  it('lists the active plastic before the closed ones', () => {
    expect(build().open[0].plastics.map((x) => x.mask)).toEqual(['••7741', '••2210']);
  });

  it('shows credit-card figures with limit used for an add-on and a dash for the primary', () => {
    const [p, a] = build().open;
    expect(p.stats).toEqual([
      { label: 'Spend · year', value: '₹34,448' },
      { label: 'Txns', value: '19' },
      { label: 'Last used', value: '12 Oct' },
      { label: 'Limit used', value: '—', muted: true },
    ]);
    expect(a.stats[3]).toEqual({ label: 'Limit used', value: '6.6%', tone: 'ink' });
  });

  it('colours limit used amber at 30% and rose at 70%', () => {
    const at = (spent: number) =>
      build(false, [{ ...stats[1], currentCycleSpend: spent }]).open[1].stats[3];
    expect(at(22500).tone).toBe('warning');
    expect(at(52500).tone).toBe('danger');
  });

  it('gives a bank three figures, spelled Transactions, and no close footer', () => {
    const [p, a] = build(true).open;
    expect(p.stats.map((s) => s.label)).toEqual(['Spend · year', 'Transactions', 'Last used']);
    expect(p.plasticsLabel).toBe('Cards');
    expect(a.roleLabel).toBe('Joint holder');
    expect(a.closeFooter).toBe(false);
    expect(build(true).intro).toMatch(/^Debit cards on this account/);
    expect(build(false).intro).toBeNull();
  });

  it('leaves the figures out when stats did not load', () => {
    expect(build(false, null).open[0].stats).toEqual([]);
  });

  it('describes a closed holder with its transactions kept', () => {
    expect(build().closed[0]).toMatchObject({
      name: 'Rohan Mehta',
      initials: 'RM',
      caption: 'Add-on · sibling · closed 30 Jun 2026 · 12 transactions kept',
    });
  });

  it('has the shared-limit model only for a credit card', () => {
    expect(build().sharedLimit).toEqual({ thisCard: 'Own limit · ₹3,00,000', shared: 'None' });
    expect(build(true).sharedLimit).toBeNull();
  });
});

describe('sharedLimitModel', () => {
  const base = { id: 'c1', type: AccountType.CREDIT_CARD } as CreditCard;

  it('names the pool, its limit and its cards', () => {
    const m = sharedLimitModel({
      ...base,
      creditLimit: 300000,
      limitPool: { id: 'p', name: 'HDFC cards', creditLimit: 500000, memberCount: 2 },
    } as CreditCard);
    expect(m).toEqual({
      thisCard: 'Own limit · ₹3,00,000',
      shared: 'HDFC cards · ₹5,00,000 · 2 cards',
    });
  });

  it('says Not set for a pooled card with no limit of its own', () => {
    const m = sharedLimitModel({
      ...base,
      creditLimit: null,
      limitPool: { id: 'p', name: 'Pool', creditLimit: 100000, memberCount: 1 },
    } as CreditCard);
    expect(m).toEqual({ thisCard: 'Not set', shared: 'Pool · ₹1,00,000 · 1 card' });
  });
});
