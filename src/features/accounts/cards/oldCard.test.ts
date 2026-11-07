import { describe, expect, it } from 'vitest';

import type { Card } from '@/lib/account.types';

import { buildOldCard, dayOf, holderOptions, primaryHolderId, suggestOldCard } from './oldCard';

const card = (over: Partial<Card> & { id: string; last4: string }): Card => ({ cardholderId: 'h1', ...over });
const TODAY = '2026-11-07';

describe('suggestOldCard', () => {
  const active = card({ id: 'a', last4: '1111', issuedOn: '2025-05-01' });

  it('says old card when the number was last seen before the active card was issued', () => {
    expect(suggestOldCard({ cards: [active], last4: '3003', lastSeenOn: '2025-04-20', today: '2025-05-10' })).toBe(true);
  });

  it('says old card when the number was last seen more than 60 days ago', () => {
    expect(suggestOldCard({ cards: [active], last4: '3003', lastSeenOn: '2026-08-01', today: TODAY })).toBe(true);
  });

  it('says another number when it was seen recently, after the active card was issued', () => {
    expect(suggestOldCard({ cards: [active], last4: '3003', lastSeenOn: '2026-10-20', today: TODAY })).toBe(false);
    expect(suggestOldCard({ cards: [active], last4: '3003', lastSeenOn: '2026-09-08', today: TODAY })).toBe(false); // exactly 60 days
  });

  it('looks at every active card with other digits and compares with the latest issued', () => {
    const older = card({ id: 'o', last4: '2222', issuedOn: '2020-01-01' });
    const newer = card({ id: 'n', last4: '1111', issuedOn: '2025-05-01' });
    // seen after the older card was issued but before the newer one: old
    expect(suggestOldCard({ cards: [older, newer], last4: '3003', lastSeenOn: '2024-03-01', today: '2025-04-01' })).toBe(true);
    expect(suggestOldCard({ cards: [newer, older], last4: '3003', lastSeenOn: '2024-03-01', today: '2025-04-01' })).toBe(true);
    // a card with the number's own digits is not "another" card
    expect(suggestOldCard({ cards: [older, card({ id: 'same', last4: '3003', issuedOn: '2026-01-01' })], last4: '3003', lastSeenOn: '2025-04-01', today: '2025-04-10' })).toBe(false);
  });

  it('says another number without an active card with other digits, or without a last-seen date', () => {
    expect(suggestOldCard({ cards: [], last4: '3003', lastSeenOn: '2021-01-01', today: TODAY })).toBe(false);
    expect(suggestOldCard({ cards: [card({ id: 'c', last4: '2222', closedOn: '2024-01-01' })], last4: '3003', lastSeenOn: '2021-01-01', today: TODAY })).toBe(false);
    expect(suggestOldCard({ cards: [card({ id: 'a2', last4: '3003' })], last4: '3003', lastSeenOn: '2021-01-01', today: TODAY })).toBe(false);
    expect(suggestOldCard({ cards: [active], last4: '3003', lastSeenOn: null, today: TODAY })).toBe(false);
  });
});

describe('buildOldCard', () => {
  it('names the holder only when one was picked', () => {
    expect(buildOldCard({ cardholderId: '', issuedOn: '2021-05-01', closedOn: '2025-04-30' }, '3003', TODAY)).toEqual({
      ok: true,
      body: { issuedOn: '2021-05-01', closedOn: '2025-04-30' },
    });
    expect(buildOldCard({ cardholderId: 'h2', issuedOn: '2021-05-01', closedOn: '2025-04-30' }, '3003', TODAY)).toEqual({
      ok: true,
      body: { cardholderId: 'h2', issuedOn: '2021-05-01', closedOn: '2025-04-30' },
    });
  });

  it('needs both dates, closed not before opened, nothing in the future', () => {
    expect(buildOldCard({ cardholderId: '', issuedOn: '', closedOn: '' }, '3003', TODAY)).toMatchObject({
      ok: false,
      errors: { issuedOn: expect.any(String), closedOn: expect.any(String) },
    });
    expect(buildOldCard({ cardholderId: '', issuedOn: '2025-05-01', closedOn: '2025-04-30' }, '3003', TODAY)).toMatchObject({ ok: false, errors: { closedOn: expect.any(String) } });
    expect(buildOldCard({ cardholderId: '', issuedOn: '2025-05-01', closedOn: '2026-12-01' }, '3003', TODAY)).toMatchObject({ ok: false });
  });
});

describe('dayOf and holders', () => {
  it('turns a server instant into its app-zone day, and nothing into null', () => {
    expect(dayOf('2025-04-20T10:00:00Z')).toBe('2025-04-20');
    expect(dayOf('2025-04-20T20:00:00Z')).toBe('2025-04-21'); // already the next day in IST
    expect(dayOf(null)).toBeNull();
  });

  it('defaults to the primary holder and names holders by role when they have no name', () => {
    const holders = [
      { id: 'h2', role: 'ADDON', personName: 'Asha', cards: [] },
      { id: 'h1', role: 'PRIMARY', cards: [] },
    ] as never;
    expect(primaryHolderId(holders)).toBe('h1');
    expect(primaryHolderId([])).toBe('');
    expect(holderOptions(holders, false)).toEqual([
      { value: 'h2', label: 'Asha' },
      { value: 'h1', label: 'Primary' },
    ]);
  });
});
