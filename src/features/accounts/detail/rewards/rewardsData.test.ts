import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loadRewardsTabData } from './rewardsData';

vi.mock('@/lib/api/server', () => ({
  serverApi: { GET: vi.fn().mockResolvedValue({ data: [] }) },
}));

const getRewardLines = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  rewardsApi: {
    listRules: vi.fn().mockResolvedValue([]),
    getReport: vi.fn().mockResolvedValue({ summary: {}, rules: [], milestones: [] }),
    getRewardLines: (p: unknown) => getRewardLines(p),
  },
}));

const account: Account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Card', creditLimit: 1, balance: 0 } as Account;
const page = (number: number, content: unknown[]) => ({ content, totalElements: 30, totalPages: 2, size: 25, number });

describe('loadRewardsTabData', () => {
  beforeEach(() => getRewardLines.mockReset());

  it('refetches the last page when the requested page is past the end', async () => {
    getRewardLines.mockResolvedValueOnce(page(4, [])).mockResolvedValueOnce(page(1, [{}]));
    const data = await loadRewardsTabData(account, '2026-10-13', { page: '5', size: '25' });
    expect(getRewardLines).toHaveBeenCalledTimes(2);
    expect(getRewardLines.mock.calls[0][0]).toMatchObject({ page: 4 });
    expect(getRewardLines.mock.calls[1][0]).toMatchObject({ page: 1 });
    expect(data.query.page).toBe(1);
    expect(data.lines?.content).toHaveLength(1);
  });

  it('fetches once when the page exists', async () => {
    getRewardLines.mockResolvedValue(page(0, [{}]));
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(getRewardLines).toHaveBeenCalledTimes(1);
    expect(data.query.page).toBe(0);
  });
});
