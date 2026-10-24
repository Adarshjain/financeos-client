import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loadWhichCardData } from './whichCardData';

const accounts = vi.fn();
const categories = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: () => accounts() },
  categoriesApi: { list: () => categories() },
}));
vi.mock('@/features/shell/loadHelpers', async (orig) => ({
  ...(await orig<typeof import('@/features/shell/loadHelpers')>()),
  signInIfSessionEnded: vi.fn(),
}));

const acct = (id: string, name: string, type: AccountType, extra: Partial<Account> = {}) =>
  ({ id, name, type, balance: 0, ...extra }) as Account;

describe('loadWhichCardData', () => {
  beforeEach(() => {
    accounts.mockReset();
    categories.mockReset();
  });

  it('keeps the open credit cards and the categories by name', async () => {
    accounts.mockResolvedValue([
      acct('a', 'HDFC', AccountType.CREDIT_CARD),
      acct('w', 'Wallet', AccountType.GENERIC),
      acct('x', 'Old', AccountType.CREDIT_CARD, { closedOn: '2020-01-01' } as Partial<Account>),
    ]);
    categories.mockResolvedValue([{ id: 'c2', name: 'Fuel' }, { id: 'c1', name: 'Dining' }]);
    expect(await loadWhichCardData()).toEqual({
      cards: [{ id: 'a', name: 'HDFC' }],
      categories: [{ id: 'c1', name: 'Dining' }, { id: 'c2', name: 'Fuel' }],
    });
  });

  it('is null when either request fails', async () => {
    accounts.mockRejectedValue(new Error('boom'));
    categories.mockResolvedValue([]);
    expect(await loadWhichCardData()).toBeNull();
    accounts.mockResolvedValue([]);
    categories.mockRejectedValue(new Error('boom'));
    expect(await loadWhichCardData()).toBeNull();
  });
});
