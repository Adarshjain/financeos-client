import { describe, expect, it } from 'vitest';

import type { Cardholder } from '@/lib/account.types';

import {
  buildAddCard,
  buildAddHolder,
  buildClose,
  buildEditHolder,
  buildReassign,
  buildReplaceCard,
  futureDateError,
  reassignSources,
  UNATTRIBUTED,
} from './cardsForms';

const TODAY = '2026-10-13';

const holder = (over: Partial<Cardholder> & { id: string }): Cardholder => ({
  accountId: 'c1',
  role: 'ADDON',
  cards: [],
  ...over,
});

describe('futureDateError', () => {
  it('flags only dates after today', () => {
    expect(futureDateError('issued', '2026-10-14', TODAY)).toBe("Pick the issued date on or before today.");
    expect(futureDateError('issued', TODAY, TODAY)).toBeNull();
    expect(futureDateError('issued', '', TODAY)).toBeNull();
  });
});

describe('buildAddCard', () => {
  it('needs exactly 4 digits', () => {
    expect(buildAddCard({ last4: '12', issuedOn: TODAY }, TODAY)).toEqual({
      ok: false,
      errors: { last4: 'Last 4 digits must be exactly 4 digits.' },
    });
  });

  it('uses the message of the flow it is called from', () => {
    const r = buildAddCard({ last4: '', issuedOn: TODAY }, TODAY, 'Card last 4 digits must be exactly 4 digits.');
    expect(r).toMatchObject({ errors: { last4: 'Card last 4 digits must be exactly 4 digits.' } });
  });

  it('refuses a future issue date and builds the body otherwise', () => {
    expect(buildAddCard({ last4: '1234', issuedOn: '2026-12-01' }, TODAY)).toMatchObject({
      ok: false,
      errors: { issuedOn: "Pick the issued date on or before today." },
    });
    expect(buildAddCard({ last4: '1234', issuedOn: '2026-10-01' }, TODAY)).toEqual({
      ok: true,
      body: { last4: '1234', issuedOn: '2026-10-01' },
    });
  });
});

describe('buildAddHolder', () => {
  const base = {
    name: ' Meera Mehta ',
    relationship: 'SPOUSE' as const,
    spendLimit: '75000',
    openedOn: '2024-06-01',
    last4: '7742',
    issuedOn: '2024-06-02',
  };

  it('keeps an evaluated spend limit and rejects an invalid expression instead of truncating it', () => {
    expect(buildAddHolder({ ...base, spendLimit: '50000+25000' }, TODAY)).toMatchObject({
      ok: true,
      body: { spendLimit: 75000 },
    });
    for (const bad of ['5+', '100/0', '100-200']) {
      expect(buildAddHolder({ ...base, spendLimit: bad }, TODAY)).toEqual({
        ok: false,
        errors: { spendLimit: 'Enter the limit as a number, like 50,000.' },
      });
    }
  });

  it('requires a name', () => {
    expect(buildAddHolder({ ...base, name: '  ' }, TODAY)).toMatchObject({
      ok: false,
      errors: { name: 'Cardholder name is required.' },
    });
  });

  it('allows no first card, but a partial last 4 is refused', () => {
    expect(buildAddHolder({ ...base, last4: '77' }, TODAY)).toMatchObject({
      errors: { last4: 'Card last 4 digits must be exactly 4 digits.' },
    });
    expect(buildAddHolder({ ...base, last4: '', spendLimit: '' }, TODAY)).toEqual({
      ok: true,
      body: {
        personName: 'Meera Mehta',
        relationship: 'SPOUSE',
        spendLimit: null,
        last4: undefined,
        openedOn: '2024-06-01',
        issuedOn: undefined,
      },
    });
  });

  it('sends the card and falls back to the opened date for the issue date', () => {
    expect(buildAddHolder(base, TODAY)).toMatchObject({
      ok: true,
      body: { spendLimit: 75000, last4: '7742', issuedOn: '2024-06-02' },
    });
    expect(buildAddHolder({ ...base, issuedOn: '' }, TODAY)).toMatchObject({
      body: { issuedOn: '2024-06-01' },
    });
  });

  it('refuses a future opened date', () => {
    expect(buildAddHolder({ ...base, openedOn: '2027-01-01' }, TODAY)).toMatchObject({
      errors: { openedOn: "Pick the opened date on or before today." },
    });
  });
});

describe('buildEditHolder', () => {
  const v = { name: ' Meera ', relationship: 'CHILD' as const, spendLimit: '', openedOn: '2024-06-01' };

  it('sends the relationship of an add-on, and clears an empty limit', () => {
    expect(buildEditHolder(holder({ id: 'h2' }), v, TODAY)).toEqual({
      ok: true,
      body: { personName: 'Meera', relationship: 'CHILD', spendLimit: null, openedOn: '2024-06-01' },
    });
  });

  it('evaluates the spend limit and blocks an invalid expression', () => {
    expect(buildEditHolder(holder({ id: 'h2' }), { ...v, spendLimit: '1000*3' }, TODAY)).toMatchObject({
      ok: true,
      body: { spendLimit: 3000 },
    });
    expect(buildEditHolder(holder({ id: 'h2' }), { ...v, spendLimit: '100/0' }, TODAY)).toEqual({
      ok: false,
      errors: { spendLimit: 'Enter the limit as a number, like 50,000.' },
    });
  });

  it('keeps the primary on SELF', () => {
    expect(buildEditHolder(holder({ id: 'h1', role: 'PRIMARY' }), v, TODAY)).toMatchObject({
      body: { relationship: 'SELF' },
    });
  });

  it('refuses a future opened date', () => {
    expect(buildEditHolder(holder({ id: 'h2' }), { ...v, openedOn: '2027-01-01' }, TODAY)).toMatchObject({
      ok: false,
      errors: { openedOn: "Pick the opened date on or before today." },
    });
  });
});

describe('buildReplaceCard', () => {
  it('needs exactly 4 new digits and a date that is not in the future', () => {
    expect(buildReplaceCard({ newLast4: '88', issuedOn: '2027-01-01' }, TODAY)).toEqual({
      ok: false,
      errors: {
        newLast4: 'New last 4 digits must be exactly 4 digits.',
        issuedOn: "Pick the issued date on or before today.",
      },
    });
    expect(buildReplaceCard({ newLast4: '8820', issuedOn: TODAY }, TODAY)).toEqual({
      ok: true,
      body: { newLast4: '8820', issuedOn: TODAY },
    });
  });
});

describe('buildClose', () => {
  it('refuses a future date, and leaves an empty date out', () => {
    expect(buildClose('2026-10-20', TODAY)).toMatchObject({
      ok: false,
      errors: { closedOn: "Pick the closed date on or before today." },
    });
    expect(buildClose('', TODAY)).toEqual({ ok: true, body: { closedOn: undefined } });
    expect(buildClose(TODAY, TODAY)).toEqual({ ok: true, body: { closedOn: TODAY } });
  });
});

describe('buildReassign', () => {
  const target = holder({
    id: 'h2',
    cards: [
      { id: 'old', cardholderId: 'h2', last4: '1111', closedOn: '2025-01-01' },
      { id: 'k3', cardholderId: 'h2', last4: '7742', closedOn: null },
    ],
  });

  it('targets the active card and takes unattributed rows by sending no current card', () => {
    expect(buildReassign('c1', target, undefined, { source: UNATTRIBUTED, from: '2026-06-01', to: '' })).toEqual({
      ok: true,
      body: { accountId: 'c1', from: '2026-06-01', to: undefined, currentCardId: null, cardId: 'k3' },
    });
  });

  it('restricts to the chosen source card', () => {
    expect(buildReassign('c1', target, undefined, { source: 'k9', from: '', to: '' })).toMatchObject({
      body: { currentCardId: 'k9' },
    });
  });

  it('refuses a holder with no card to move transactions to', () => {
    expect(buildReassign('c1', holder({ id: 'h5' }), undefined, { source: UNATTRIBUTED, from: '', to: '' })).toEqual({
      ok: false,
      errors: { form: 'Target cardholder has no valid card to reassign transactions to.' },
    });
  });
});

describe('reassignSources', () => {
  it('lists unattributed rows, then every card of the other holders', () => {
    const a = holder({ id: 'a', personName: 'Arjun', cards: [{ id: 'k1', cardholderId: 'a', last4: '7741' }] });
    const b = holder({ id: 'b', personName: 'Meera', cards: [{ id: 'k2', cardholderId: 'b', last4: '7742' }] });
    expect(reassignSources(b, [a, b], (h) => h.personName ?? '')).toEqual([
      { value: UNATTRIBUTED, label: 'Not attributed to a cardholder' },
      { value: 'k1', label: '••7741 · Arjun' },
    ]);
  });
});
