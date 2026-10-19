import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BankAccount } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

const GET = vi.fn();
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: (...a: unknown[]) => GET(...a) } }));
vi.mock('@/lib/apiClient', () => ({
  transactionsApi: { search: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }) },
}));

import { loadBankOverviewData } from './accountOverviewData';

const bank: BankAccount = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC' };

describe('loadBankOverviewData', () => {
  beforeEach(() => GET.mockReset());

  it('hides the statements and identifiers blocks when their requests fail, not just when they throw', async () => {
    GET.mockImplementation(async (url = '') => {
      if (url.endsWith('/statements') || url.endsWith('/identifiers')) {
        return { data: undefined, error: { status: 500 } };
      }
      return { data: { lastAlert: null, unmatchedCount: 0, emis: [], cardBills: [] } };
    });
    const data = await loadBankOverviewData(bank);
    expect(data.statements).toBeNull();
    expect(data.identifiers).toBeNull();
    expect(data.gmail).toEqual({ lastAlert: null, unmatchedCount: 0 });
    expect(data.recent).toEqual({ items: [], total: 0 });
  });

  it('keeps an empty statements list as empty, not failed', async () => {
    GET.mockImplementation(async (url = '') =>
      url.endsWith('/statements') || url.endsWith('/identifiers')
        ? { data: [] }
        : { data: { lastAlert: null, unmatchedCount: 0, emis: [], cardBills: [] } },
    );
    const data = await loadBankOverviewData(bank);
    expect(data.statements).toEqual([]);
    expect(data.identifiers).toEqual([]);
  });
});
