import { describe, expect, it } from 'vitest';

import type { SuggestionChild, SuggestionItem } from '@/features/accounts/list/suggestionsModel';
import { AccountType } from '@/lib/types';

import { buildSuggestionPrefill, joinCandidates, limitHintOf } from './suggestionPrefill';

const item = (over: Partial<SuggestionItem> = {}): SuggestionItem => ({
  id: 's1',
  kind: 'CREDIT_CARD',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4321',
  variant: 'Regalia',
  variantConf: 'HIGH',
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});
const child = (over: Partial<SuggestionChild> = {}): SuggestionChild => ({
  id: 'c1',
  kind: 'ADDON_CARD',
  band: 'FOUND',
  last4: '0082',
  evidenceMails: 3,
  ...over,
});

describe('buildSuggestionPrefill', () => {
  it('fills a credit card: type, bank, the row title, the primary number', () => {
    const { values, filled } = buildSuggestionPrefill(item());
    expect(values).toMatchObject({ type: AccountType.CREDIT_CARD, bank: 'hdfc', name: 'HDFC Bank Regalia', last4: '4321' });
    expect(values.financialPosition).toBe('liability');
    expect(filled).toEqual({ name: true, bank: true, last4: true, debitCardLast4: false, addonCards: [], creditLimit: false });
  });

  it('never fills the limit, password, anniversary or earlier numbers', () => {
    const { values } = buildSuggestionPrefill(item());
    expect(values).toMatchObject({ creditLimit: '', statementPassword: '', anniversaryDate: '', earlierCards: [] });
  });

  it('names an unsure card after its bank, like the row', () => {
    expect(buildSuggestionPrefill(item({ variant: 'Regalia', variantConf: 'LOW' })).values.name).toBe('HDFC Bank card');
  });

  it('fills a bank account with its debit card from the first debit child', () => {
    const { values, filled } = buildSuggestionPrefill(
      item({ kind: 'BANK_ACCOUNT', variant: null, children: [child({ kind: 'DEBIT_CARD', last4: '9911' }), child({ id: 'c2', kind: 'DEBIT_CARD', last4: '1234' })] }),
    );
    expect(values).toMatchObject({ type: AccountType.BANK_ACCOUNT, name: 'HDFC Bank account', last4: '4321', debitCardLast4: '9911' });
    expect(filled.debitCardLast4).toBe(true);
  });

  it('leaves the account number empty when the suggestion has none', () => {
    const { values, filled } = buildSuggestionPrefill(item({ kind: 'BANK_ACCOUNT', last4: '' }));
    expect(values.last4).toBe('');
    expect(filled.last4).toBe(false);
  });

  it('maps add-on children to cards with the relationship unpicked', () => {
    const { values, filled } = buildSuggestionPrefill(
      item({ children: [child(), child({ id: 'c2', kind: 'DEBIT_CARD', last4: '7777' }), child({ id: 'c3', last4: '0090' })] }),
    );
    expect(values.addonCards).toEqual([
      { last4: '0082', relationship: '', holderName: '' },
      { last4: '0090', relationship: '', holderName: '' },
    ]);
    expect(filled.addonCards).toEqual(['0082', '0090']);
  });

  it('leaves the bank empty when the form has no such bank', () => {
    const { values, filled } = buildSuggestionPrefill(item({ bank: { id: 'mystery', name: 'Mystery Bank' } }));
    expect(values.bank).toBe('');
    expect(filled.bank).toBe(false);
  });

  it('opens Add bank account with only the debit number for a debit card without its account', () => {
    const { values, filled } = buildSuggestionPrefill(item({ kind: 'DEBIT_CARD', last4: '5555' }));
    expect(values).toMatchObject({ type: AccountType.BANK_ACCOUNT, bank: 'hdfc', name: '', last4: '', debitCardLast4: '5555' });
    expect(filled).toMatchObject({ name: false, last4: false, debitCardLast4: true });
  });

  it.each(['ADDON_CARD', 'REPLACEMENT_CARD'] as const)('opens Add credit card with the primary number for a %s without its account', (kind) => {
    const { values } = buildSuggestionPrefill(item({ kind, last4: '6666' }));
    expect(values).toMatchObject({ type: AccountType.CREDIT_CARD, bank: 'hdfc', name: '', last4: '6666', addonCards: [] });
  });
});

describe('name hints', () => {
  it('offers each candidate with the bank in front, like the row title', () => {
    const { nameHints } = buildSuggestionPrefill(item({ variantConf: 'LOW', variantCandidates: ['Regalia', 'HDFC Bank Millennia'] }));
    expect(nameHints).toEqual([
      { candidate: 'Regalia', name: 'HDFC Bank Regalia' },
      { candidate: 'HDFC Bank Millennia', name: 'HDFC Bank Millennia' },
    ]);
  });

  it('offers a single candidate only when the server is unsure (LOW)', () => {
    expect(buildSuggestionPrefill(item({ variantConf: 'LOW', variantCandidates: ['Regalia'] })).nameHints).toEqual([
      { candidate: 'Regalia', name: 'HDFC Bank Regalia' },
    ]);
    expect(buildSuggestionPrefill(item({ variantConf: 'HIGH', variantCandidates: ['Regalia'] })).nameHints).toEqual([]);
  });

  it('offers none for fewer than two sure candidates, or for anything but a credit card', () => {
    expect(buildSuggestionPrefill(item({ variantCandidates: ['Regalia'] })).nameHints).toEqual([]);
    expect(buildSuggestionPrefill(item({ variantCandidates: null })).nameHints).toEqual([]);
    expect(buildSuggestionPrefill(item({ kind: 'BANK_ACCOUNT', variantCandidates: ['A', 'B'] })).nameHints).toEqual([]);
  });
});

describe('limit and password from the suggestion', () => {
  it('fills the exact limit of a credit card', () => {
    const { values, filled, limitHint } = buildSuggestionPrefill(item({ limitAmount: 350000, limitBucket: '3-5L' }));
    expect(values.creditLimit).toBe('350000');
    expect(filled.creditLimit).toBe(true);
    expect(limitHint).toBeNull();
  });

  it('turns a bucket into a hint and leaves the limit empty', () => {
    const r = buildSuggestionPrefill(item({ limitBucket: '3-5L' }));
    expect(r.values.creditLimit).toBe('');
    expect(r.filled.creditLimit).toBe(false);
    expect(r.limitHint).toBe('Your statements show a limit of ₹3L–₹5L.');
  });

  it('words open-ended buckets and ignores unknown ones', () => {
    expect(limitHintOf('<1L')).toBe('Your statements show a limit under ₹1L.');
    expect(limitHintOf('>10L')).toBe('Your statements show a limit over ₹10L.');
    expect(limitHintOf('weird')).toBeNull();
    expect(limitHintOf(null)).toBeNull();
  });

  it('gives a bank account no limit or hint', () => {
    const r = buildSuggestionPrefill(item({ kind: 'BANK_ACCOUNT', limitAmount: 100000, limitBucket: '1-3L' }));
    expect(r.values.creditLimit).toBe('');
    expect(r.limitHint).toBeNull();
  });

  it('captions the password from the profile and keeps the field empty', () => {
    const r = buildSuggestionPrefill(item({ passwordFromProfile: true }));
    expect(r.values.statementPassword).toBe('');
    expect(r.passwordCaption).toBe('From your name and birth date (HDFC Bank rule). Type one to use a different password.');
    expect(buildSuggestionPrefill(item()).passwordCaption).toBeNull();
  });
});

describe('joinCandidates', () => {
  it('joins two with and, three with a comma and and', () => {
    expect(joinCandidates(['A', 'B'])).toBe('A and B');
    expect(joinCandidates(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
