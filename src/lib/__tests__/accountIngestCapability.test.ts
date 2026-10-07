import { describe, expect, it } from 'vitest';

import {
  type Account,
  getIngestFromDate,
  INGEST_CAPABLE_ACCOUNT_TYPES,
  supportsIngestion,
} from '@/lib/account.types';
import { AccountType } from '@/lib/types';

const base = { id: 'a', name: 'A', warnings: [] as string[] };

describe('ingest capability by account type', () => {
  it('only bank and credit card accounts can receive statements / Gmail alerts', () => {
    expect(supportsIngestion(AccountType.BANK_ACCOUNT)).toBe(true);
    expect(supportsIngestion(AccountType.CREDIT_CARD)).toBe(true);
    expect(supportsIngestion(AccountType.BROKER)).toBe(false);
    expect(supportsIngestion(AccountType.GENERIC)).toBe(false);
    expect([...INGEST_CAPABLE_ACCOUNT_TYPES].sort()).toEqual(
      [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD].sort()
    );
  });

  it('getIngestFromDate passes the watermark through for bank and card accounts (null included)', () => {
    const bank: Account = { ...base, type: AccountType.BANK_ACCOUNT, ingestFromDate: '2026-01-15' };
    const card: Account = { ...base, type: AccountType.CREDIT_CARD, last4: '0001', creditLimit: 1, ingestFromDate: null };
    expect(getIngestFromDate(bank)).toBe('2026-01-15');
    expect(getIngestFromDate(card)).toBeNull();
  });

  it('getIngestFromDate is undefined for brokers and Wallet/Cash accounts, even if a stale value rides along', () => {
    const broker = { ...base, type: AccountType.BROKER, ingestFromDate: '2025-03-01' } as unknown as Account;
    const wallet = { ...base, type: AccountType.GENERIC, ingestFromDate: '2025-03-01' } as unknown as Account;
    expect(getIngestFromDate(broker)).toBeUndefined();
    expect(getIngestFromDate(wallet)).toBeUndefined();
  });
});
