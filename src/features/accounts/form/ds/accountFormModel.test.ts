import { describe, expect, it } from 'vitest';

import type { Account, CreditCard, CreditLimitPool } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import {
  addIdentifier,
  buildAccountRequest,
  defaultFinancialPosition,
  diffIdentifiers,
  emptyValues,
  fieldsFor,
  formatDmy,
  LIMIT_POOL_NEW,
  LIMIT_POOL_NONE,
  movesIngestLater,
  otherPoolMembers,
  otherPoolMembersNote,
  parseAddType,
  parseAmount,
  validateAccountForm,
  valuesFromAccount,
  withLimitPoolChoice,
} from './accountFormModel';

const pool: CreditLimitPool = {
  id: 'p1',
  name: 'HDFC cards',
  creditLimit: 500000,
  owed: 0,
  available: 500000,
  memberCount: 2,
  openMemberCount: 2,
};

function card(over: Partial<ReturnType<typeof emptyValues>> = {}) {
  return {
    ...emptyValues(AccountType.CREDIT_CARD),
    name: 'HDFC Regalia',
    bank: 'hdfc',
    last4: '7741',
    anniversaryDate: '2024-03-15',
    creditLimit: '300000',
    ...over,
  };
}

describe('parseAddType', () => {
  it('reads a type slug and treats 1 or junk as nothing picked', () => {
    expect(parseAddType('credit_card')).toBe(AccountType.CREDIT_CARD);
    expect(parseAddType('generic')).toBe(AccountType.GENERIC);
    expect(parseAddType('1')).toBeNull();
    expect(parseAddType(null)).toBeNull();
  });
});

describe('fieldsFor', () => {
  it('shows nothing until a type is picked', () => {
    expect(fieldsFor(null)).toEqual([]);
  });

  it('gives each type its own fields', () => {
    const bank = fieldsFor(AccountType.BANK_ACCOUNT);
    expect(bank).toContain('openingBalance');
    expect(bank).toContain('identifiers');
    expect(bank).not.toContain('anniversaryDate');
    const broker = fieldsFor(AccountType.BROKER);
    expect(broker).toEqual(expect.arrayContaining(['provider', 'clientId', 'cashBalance']));
    expect(broker).not.toContain('ingestFromDate');
    expect(fieldsFor(AccountType.GENERIC)).toEqual(['name', 'description', 'financialPosition', 'excludeFromNetAsset']);
  });

  it('shows the pool name and amount only once a shared limit is picked', () => {
    expect(fieldsFor(AccountType.CREDIT_CARD)).not.toContain('limitPoolName');
    const pooled = fieldsFor(AccountType.CREDIT_CARD, 'p1');
    expect(pooled).toEqual(expect.arrayContaining(['limitPoolName', 'limitPoolLimit']));
  });
});

describe('defaults', () => {
  it('starts a card as a liability and the rest as assets', () => {
    expect(defaultFinancialPosition(AccountType.CREDIT_CARD)).toBe('liability');
    expect(defaultFinancialPosition(AccountType.BANK_ACCOUNT)).toBe('asset');
    expect(emptyValues(AccountType.CREDIT_CARD).financialPosition).toBe('liability');
  });
});

describe('parseAmount', () => {
  it('handles blank, commas and garbage', () => {
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount(' 5,00,000 ')).toBe(500000);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('12abc')).toBeNaN();
  });
});

describe('validateAccountForm', () => {
  it('has nothing to check before a type is picked', () => {
    expect(validateAccountForm(emptyValues(null))).toEqual({});
  });

  it('requires a name', () => {
    expect(validateAccountForm({ ...emptyValues(AccountType.GENERIC) }).name).toBe('Name is required');
    expect(validateAccountForm({ ...emptyValues(AccountType.GENERIC), name: 'Paytm' })).toEqual({});
  });

  it('checks bank last 4 only when typed', () => {
    const base = { ...emptyValues(AccountType.BANK_ACCOUNT), name: 'HDFC', bank: 'hdfc' };
    expect(validateAccountForm(base)).toEqual({});
    expect(validateAccountForm({ ...base, last4: '77' }).last4).toBe('Enter the last 4 digits.');
    expect(validateAccountForm({ ...base, last4: '4521' })).toEqual({});
  });

  it('flags a bad opening balance', () => {
    const v = { ...emptyValues(AccountType.BANK_ACCOUNT), name: 'HDFC', openingBalance: 'abc' };
    expect(validateAccountForm(v).openingBalance).toBe('Enter a valid amount.');
  });

  it('requires card last 4, anniversary and a credit limit', () => {
    const errors = validateAccountForm({ ...emptyValues(AccountType.CREDIT_CARD), name: 'X', bank: 'hdfc' });
    expect(errors.last4).toBe('Enter the last 4 digits of the card.');
    expect(errors.anniversaryDate).toBe('Enter the card anniversary.');
    expect(errors.creditLimit).toBe('Enter a credit limit.');
    expect(validateAccountForm(card())).toEqual({});
  });

  it('makes the own limit optional inside a pool and requires pool name and amount', () => {
    const empty = validateAccountForm(card({ creditLimit: '', limitPoolChoice: LIMIT_POOL_NEW }));
    expect(empty.creditLimit).toBeUndefined();
    expect(empty.limitPoolName).toBe('Name is required');
    expect(empty.limitPoolLimit).toBe('Enter an amount above ₹0');
    const zero = validateAccountForm(card({ limitPoolChoice: LIMIT_POOL_NEW, limitPoolName: 'A', limitPoolLimit: '0' }));
    expect(zero.limitPoolLimit).toBe('Enter an amount above ₹0');
    const long = validateAccountForm(
      card({ limitPoolChoice: LIMIT_POOL_NEW, limitPoolName: 'x'.repeat(151), limitPoolLimit: '100' })
    );
    expect(long.limitPoolName).toBe('Use 150 characters or fewer.');
    expect(
      validateAccountForm(card({ limitPoolChoice: LIMIT_POOL_NEW, limitPoolName: 'A', limitPoolLimit: '100' }))
    ).toEqual({});
  });

  it('requires a bank for a bank account and a card, and for nothing else', () => {
    const bank = { ...emptyValues(AccountType.BANK_ACCOUNT), name: 'HDFC' };
    expect(validateAccountForm(bank).bank).toBe('Select a bank.');
    expect(validateAccountForm({ ...bank, bank: 'hdfc' }).bank).toBeUndefined();
    expect(validateAccountForm(card({ bank: '' })).bank).toBe('Select a bank.');
    expect(validateAccountForm({ ...emptyValues(AccountType.GENERIC), name: 'P' })).toEqual({});
    expect(validateAccountForm({ ...emptyValues(AccountType.BROKER), name: 'Z', provider: 'Zerodha' })).toEqual({});
  });

  it('requires a broker provider', () => {
    const v = { ...emptyValues(AccountType.BROKER), name: 'Z' };
    expect(validateAccountForm(v).provider).toBe('Provider is required.');
    expect(validateAccountForm({ ...v, provider: 'Zerodha' })).toEqual({});
  });
});

describe('buildAccountRequest', () => {
  it('sends ingestFromDate null for a cleared date on create and on edit (null clears it on the server)', () => {
    const bank: Account = { id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', ingestFromDate: '2026-04-01T00:00:00Z' };
    const prefilled = valuesFromAccount(bank);
    expect(prefilled.ingestFromDate).toBe('2026-04-01');
    const edit = buildAccountRequest({ ...prefilled, ingestFromDate: '' });
    expect(edit).toHaveProperty('ingestFromDate', null);
    const create = buildAccountRequest({ ...emptyValues(AccountType.BANK_ACCOUNT), name: 'A', ingestFromDate: '' });
    expect(create).toHaveProperty('ingestFromDate', null);
  });

  it('builds a bank body with the optional pieces dropped', () => {
    const body = buildAccountRequest({
      ...emptyValues(AccountType.BANK_ACCOUNT),
      name: ' HDFC Savings ',
      bank: 'hdfc',
      openingBalance: '1,20,000',
      last4: '4521',
      ingestFromDate: '2026-04-01',
      statementPassword: 'abc',
    });
    expect(body).toEqual({
      name: 'HDFC Savings',
      excludeFromNetAsset: false,
      financialPosition: 'asset',
      description: '',
      type: AccountType.BANK_ACCOUNT,
      bank: 'hdfc',
      ingestFromDate: '2026-04-01',
      last4: '4521',
      openingBalance: 120000,
      statementPassword: 'abc',
    });
    const bare = buildAccountRequest({ ...emptyValues(AccountType.BANK_ACCOUNT), name: 'A' });
    expect(bare).toMatchObject({ ingestFromDate: null, openingBalance: undefined });
    expect(bare).not.toHaveProperty('statementPassword');
  });

  it('sends the bank for bank accounts and cards, and drops it for other types', () => {
    expect(buildAccountRequest(card({ bank: 'icici' }))).toMatchObject({ bank: 'icici' });
    expect(buildAccountRequest({ ...emptyValues(AccountType.BANK_ACCOUNT), name: 'A', bank: 'sbi' })).toMatchObject({ bank: 'sbi' });
    // Picked, then switched to a wallet or broker: the choice stays in the form but not in the request.
    const wallet = buildAccountRequest({ ...emptyValues(AccountType.GENERIC), name: 'P', bank: 'sbi' });
    expect(wallet).not.toHaveProperty('bank');
    const broker = buildAccountRequest({ ...emptyValues(AccountType.BROKER), name: 'Z', provider: 'Z', bank: 'sbi' });
    expect(broker).not.toHaveProperty('bank');
  });

  it('builds a card with its own limit and no pool', () => {
    expect(buildAccountRequest(card())).toMatchObject({
      type: AccountType.CREDIT_CARD,
      creditLimit: 300000,
      limitPool: null,
      anniversaryDate: '2024-03-15',
      last4: '7741',
      financialPosition: 'liability',
    });
  });

  it('builds a card joining an existing pool, dropping any own limit', () => {
    const body = buildAccountRequest(
      card({ limitPoolChoice: 'p1', limitPoolName: 'HDFC cards', limitPoolLimit: '500000' })
    );
    expect(body).toMatchObject({
      creditLimit: null,
      limitPool: { id: 'p1', name: 'HDFC cards', creditLimit: 500000 },
    });
  });

  it('ignores an invalid own limit once a pool is picked', () => {
    expect(validateAccountForm(card({ creditLimit: 'abc', limitPoolChoice: 'p1', limitPoolName: 'X', limitPoolLimit: '5' })).creditLimit).toBeUndefined();
  });

  it('builds a card creating a pool with no own limit', () => {
    const body = buildAccountRequest(
      card({ creditLimit: '', limitPoolChoice: LIMIT_POOL_NEW, limitPoolName: 'Axis', limitPoolLimit: '2,00,000' })
    );
    expect(body).toMatchObject({ creditLimit: null, limitPool: { id: null, name: 'Axis', creditLimit: 200000 } });
  });

  it('builds a broker with cash defaulting to zero', () => {
    const body = buildAccountRequest({
      ...emptyValues(AccountType.BROKER),
      name: 'Zerodha',
      provider: 'Zerodha',
      clientId: ' ',
    });
    expect(body).toMatchObject({ type: AccountType.BROKER, provider: 'Zerodha', clientId: undefined, cashBalance: 0 });
    expect(body).not.toHaveProperty('ingestFromDate');
  });

  it('builds a wallet with only the common fields', () => {
    const body = buildAccountRequest({
      ...emptyValues(AccountType.GENERIC),
      name: 'Paytm',
      description: 'UPI wallet',
      excludeFromNetAsset: true,
    });
    expect(body).toEqual({
      name: 'Paytm',
      description: 'UPI wallet',
      excludeFromNetAsset: true,
      financialPosition: 'asset',
      type: AccountType.GENERIC,
    });
  });

  it('refuses to build without a type', () => {
    expect(() => buildAccountRequest(emptyValues(null))).toThrow();
  });
});

describe('valuesFromAccount', () => {
  it('prefills a pooled card', () => {
    const account: CreditCard = {
      id: 'c1',
      type: AccountType.CREDIT_CARD,
      name: 'HDFC Regalia',
      last4: '7741',
      creditLimit: 300000,
      anniversaryDate: '2024-03-15',
      ingestFromDate: '2026-09-01T00:00:00Z',
      financialPosition: 'liability',
      limitPool: pool,
    };
    expect(valuesFromAccount(account)).toMatchObject({
      type: AccountType.CREDIT_CARD,
      name: 'HDFC Regalia',
      last4: '7741',
      creditLimit: '300000',
      anniversaryDate: '2024-03-15',
      ingestFromDate: '2026-09-01',
      limitPoolChoice: 'p1',
      limitPoolName: 'HDFC cards',
      limitPoolLimit: '500000',
    });
  });

  it('prefills the stored bank, and leaves it empty for an old account without one', () => {
    expect(valuesFromAccount({ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', bank: 'hdfc' }).bank).toBe('hdfc');
    expect(valuesFromAccount({ id: 'c', type: AccountType.CREDIT_CARD, name: 'C', last4: '1', creditLimit: 1, bank: 'axis' }).bank).toBe('axis');
    expect(valuesFromAccount({ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', bank: null }).bank).toBe('');
    expect(valuesFromAccount({ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B' }).bank).toBe('');
  });

  it('keeps the stored financial position on edit and defaults by type on add', () => {
    expect(valuesFromAccount({ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', financialPosition: 'liability' }).financialPosition).toBe('liability');
    expect(defaultFinancialPosition(AccountType.CREDIT_CARD)).toBe('liability');
    for (const t of [AccountType.BANK_ACCOUNT, AccountType.BROKER, AccountType.GENERIC]) {
      expect(defaultFinancialPosition(t)).toBe('asset');
    }
  });

  it('prefills a broker and a bank', () => {
    expect(
      valuesFromAccount({ id: 'k', type: AccountType.BROKER, name: 'Z', provider: 'Zerodha', clientId: 'Q1', cashBalance: 12500 })
    ).toMatchObject({ provider: 'Zerodha', clientId: 'Q1', cashBalance: '12500' });
    expect(
      valuesFromAccount({ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', openingBalance: '100', last4: '1234' })
    ).toMatchObject({ openingBalance: '100', last4: '1234', limitPoolChoice: LIMIT_POOL_NONE });
  });
});

describe('shared limit helpers', () => {
  it('refills name and amount from the picked pool and blanks them for a new one', () => {
    const picked = withLimitPoolChoice(card(), 'p1', [pool]);
    expect(picked).toMatchObject({ limitPoolChoice: 'p1', limitPoolName: 'HDFC cards', limitPoolLimit: '500000' });
    const fresh = withLimitPoolChoice(picked, LIMIT_POOL_NEW, [pool]);
    expect(fresh).toMatchObject({ limitPoolName: '', limitPoolLimit: '' });
  });

  it('leaves out the edited card from the other-accounts count', () => {
    expect(otherPoolMembers([pool], 'p1')).toBe(2);
    expect(otherPoolMembers([pool], 'p1', 'p1')).toBe(1);
    expect(otherPoolMembers([pool], LIMIT_POOL_NEW)).toBe(0);
    expect(otherPoolMembersNote(1)).toBe(
      'Changing the name or amount also changes it for the 1 other account sharing this limit.'
    );
    expect(otherPoolMembersNote(2)).toContain('2 other accounts');
  });
});

describe('movesIngestLater', () => {
  const bank: Account = { id: 'b', type: AccountType.BANK_ACCOUNT, name: 'B', ingestFromDate: '2026-04-01T00:00:00Z' };
  it('is true only for a later date on an account that already had one', () => {
    expect(movesIngestLater(bank, '2026-08-01')).toBe(true);
    expect(movesIngestLater(bank, '2026-04-01')).toBe(false);
    expect(movesIngestLater(bank, '2026-01-01')).toBe(false);
    expect(movesIngestLater(bank, '')).toBe(false);
    expect(movesIngestLater({ ...bank, ingestFromDate: null }, '2026-08-01')).toBe(false);
    expect(movesIngestLater({ id: 'k', type: AccountType.BROKER, name: 'K' }, '2026-08-01')).toBe(false);
  });
});

describe('identifiers', () => {
  it('strips spaces, enforces 2 to 32 characters and rejects repeats', () => {
    expect(addIdentifier(['XX7741'], ' CRN 88213 ')).toEqual({ ok: true, list: ['XX7741', 'CRN88213'] });
    expect(addIdentifier([], 'X')).toEqual({ ok: false, error: 'Identifiers are 2 to 32 characters.' });
    expect(addIdentifier([], 'x'.repeat(33))).toMatchObject({ ok: false });
    expect(addIdentifier(['XX7741'], 'XX 7741')).toEqual({ ok: false, error: 'XX7741 is already added.' });
  });

  it('diffs against the stored identifiers', () => {
    const stored = [
      { id: 'i1', value: '7741' },
      { id: 'i2', value: 'XX7741' },
    ];
    expect(diffIdentifiers(stored, ['XX7741', 'CRN1'])).toEqual({
      add: ['CRN1'],
      remove: [{ id: 'i1', value: '7741' }],
    });
    expect(diffIdentifiers([], ['A1'])).toEqual({ add: ['A1'], remove: [] });
  });
});

describe('dates', () => {
  it('writes an ISO date as dd/mm/yyyy', () => {
    expect(formatDmy('2026-08-01')).toBe('01/08/2026');
    expect(formatDmy('2026-08-01T00:00:00Z')).toBe('01/08/2026');
  });
});
