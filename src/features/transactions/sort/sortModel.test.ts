import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

import { groupLine, groupRow, pickWords, reasonChips, rulePattern, savedWords, saveLabel, tickedCount } from './sortModel';

describe('reasonChips', () => {
  it('offers the money-out reasons for a person you paid, as real picks', () => {
    const chips = reasonChips(LIST, 'OUT');
    expect(chips.map((c) => c.label)).toEqual(['Lent', 'Gifts', 'Family', 'Bills · House help', 'Bills · Rent', 'Repaid']);
    expect(chips[3].pick).toEqual({ categoryKey: 'bills', subcategoryKey: 'bills.house_help' });
    expect(chips[0].pick).toEqual({ categoryKey: 'lent', subcategoryKey: null });
  });

  it('offers the money-in reasons for a person who paid you', () => {
    expect(reasonChips(LIST, 'IN').map((c) => c.label)).toEqual(['Borrowed', 'Repaid', 'Gifts', 'Earnings']);
  });

  it('leaves out a reason the list does not have', () => {
    const without = LIST.filter((c) => c.key !== 'lent');
    expect(reasonChips(without, 'OUT').map((c) => c.label)).not.toContain('Lent');
  });
});

describe('group words', () => {
  const base = { person: false, oneOff: false, count: 4, total: -2140, lastDate: '2026-10-28' };
  it('words a shop, a person and a one-off', () => {
    expect(groupLine(base)).toBe('4 transactions · ₹2,140');
    expect(groupLine({ ...base, person: true, count: 6, total: -18000 })).toBe('Person · 6 payments · ₹18,000');
    expect(groupLine({ ...base, oneOff: true, count: 1, total: -740 })).toBe('28 Oct · ₹740');
  });

  it('the rule text is the group name as the descriptions show it', () => {
    expect(rulePattern({ label: 'Sharma Medicals' })).toBe('SHARMA MEDICALS');
  });

  it('counts ticked transactions from the unticked ids', () => {
    expect(tickedCount({ count: 4 }, ['a'])).toBe(3);
    expect(tickedCount({ count: 1 }, ['a', 'b'])).toBe(0);
  });

  it('words Save and the saved toast', () => {
    expect(saveLabel(1)).toBe('Save 1 group');
    expect(saveLabel(2)).toBe('Save 2 groups');
    expect(savedWords(5, 0)).toBe('Set the category of 5 transactions');
    expect(savedWords(1, 2)).toBe('Set the category of 1 transaction · 2 left as they were');
  });

  it('labels a pick with its icon, and nothing for an unknown category', () => {
    expect(pickWords(LIST, { categoryKey: 'food', subcategoryKey: 'food.delivery' })).toMatchObject({ label: 'Food · Delivery' });
    expect(pickWords(LIST, { categoryKey: 'nope', subcategoryKey: null })).toBeNull();
  });
});

describe('groupRow', () => {
  it('shows the card and its last digits, and signs a credit', () => {
    const row = groupRow({
      id: 't1', date: '2026-10-29', description: 'SHARMA MEDICALS', accountId: 'a', accountName: 'HDFC Savings', accountLast4: '1234',
      cardLabel: 'HDFC Regalia', cardLast4: '7741', source: 'gmail_transaction_alert', channel: 'POS', amount: -820, type: 'DEBIT',
    } as never);
    expect(row).toMatchObject({ account: 'HDFC Regalia', plastic: '••7741', amount: '820.00', isCredit: false, date: '29 Oct' });
    const upi = groupRow({
      id: 't2', date: '2026-10-02', description: null, sourcedDescription: 'UPI/RAVI', accountId: 'a', accountName: 'HDFC Savings',
      source: 'gmail_statement', channel: 'UPI', amount: 600, type: 'CREDIT',
    } as never);
    expect(upi).toMatchObject({ account: 'HDFC Savings · UPI', plastic: undefined, amount: '+600.00', isCredit: true, description: 'UPI/RAVI' });
  });
});
