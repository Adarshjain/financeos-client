import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loadRewardsOverviewData } from './overviewData';

const GET = vi.fn();
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: (...a: unknown[]) => GET(...a) } }));
const list = vi.fn();
const getConfig = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: () => list() },
  rewardsApi: { getConfig: (id: string) => getConfig(id) },
}));
vi.mock('@/features/shell/loadHelpers', () => ({ signInIfSessionEnded: vi.fn() }));

const card = (id: string, name: string, extra: Partial<Account> = {}) =>
  ({ id, type: AccountType.CREDIT_CARD, name, balance: 0, creditLimit: 1, ...extra }) as Account;
const total = (accountId: string, points: number, grossValueInr: number) => ({
  accountId,
  from: '2026-03-15',
  to: '2027-03-14',
  calendarYearFallback: false,
  points,
  grossValueInr,
});

describe('loadRewardsOverviewData', () => {
  beforeEach(() => {
    GET.mockReset();
    list.mockReset();
    getConfig.mockReset();
  });

  it('asks the totals once and the point value only of cards that earned points', async () => {
    list.mockResolvedValue([
      card('a', 'HDFC'),
      card('b', 'Amex'),
      card('c', 'SBI'),
      { id: 'w', type: AccountType.GENERIC, name: 'Wallet', balance: 0 },
      card('x', 'Old', { closedOn: '2020-01-01' } as Partial<Account>),
    ]);
    GET.mockResolvedValue({ data: [total('a', 100, 50), total('b', 40, 0), total('c', 0, 12), total('x', 0, 99)] });
    getConfig.mockImplementation(async (id: string) => ({ accountId: id, pointValueInr: id === 'a' ? 0.5 : null }));

    const { model } = await loadRewardsOverviewData();

    expect(GET).toHaveBeenCalledTimes(1);
    expect(GET).toHaveBeenCalledWith('/api/v1/rewards/totals');
    expect(getConfig.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b']);
    expect(model?.cards.map((c) => c.id)).toEqual(['a', 'c', 'b']);
    expect(model?.total).toBe('₹62 + 40 pts');
    expect(model?.cards.find((c) => c.id === 'b')).toMatchObject({ earned: '40 pts', needsPointValue: true });
  });

  it('does not call points unvalued when their point value could not be read', async () => {
    list.mockResolvedValue([card('a', 'HDFC')]);
    GET.mockResolvedValue({ data: [total('a', 100, 50)] });
    getConfig.mockRejectedValue(new Error('down'));
    const { model } = await loadRewardsOverviewData();
    expect(model?.cards[0]).toMatchObject({ earned: '₹50', needsPointValue: false });
  });

  it('has no model when the accounts or the totals failed', async () => {
    list.mockRejectedValue(new Error('down'));
    GET.mockResolvedValue({ data: [] });
    expect((await loadRewardsOverviewData()).model).toBeNull();

    list.mockResolvedValue([card('a', 'HDFC')]);
    GET.mockRejectedValue(new Error('down'));
    expect((await loadRewardsOverviewData()).model).toBeNull();
  });
});
