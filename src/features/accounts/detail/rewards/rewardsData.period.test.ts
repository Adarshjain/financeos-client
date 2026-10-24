import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loadRewardsTabData } from './rewardsData';

const GET = vi.fn();
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: (...a: unknown[]) => GET(...a) } }));

const getReport = vi.fn();
const getRewardLines = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  rewardsApi: {
    listRules: vi.fn().mockResolvedValue([]),
    getReport: (...a: unknown[]) => getReport(...a),
    getRewardLines: (p: unknown) => getRewardLines(p),
  },
}));

const account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Card', creditLimit: 1, balance: 0, anniversaryDate: '2024-03-15' } as Account;
const year = { accountId: 'c1', from: '2026-03-15', to: '2027-03-14', calendarYearFallback: false, points: 0 };

describe('loadRewardsTabData period', () => {
  beforeEach(() => {
    GET.mockReset().mockResolvedValue({ data: [year] });
    getReport.mockReset().mockResolvedValue({ summary: {}, rules: [], milestones: [] });
    getRewardLines.mockReset().mockResolvedValue({ content: [], totalElements: 0 });
  });

  it('opens on the reward year from the totals', async () => {
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(data.window).toEqual({ from: '2026-03-15', to: '2027-03-14', calendarYear: false });
    expect(getReport).toHaveBeenCalledWith('c1', '2026-03-15', '2027-03-14');
  });

  it('reads the period from the address before the first fetch: one report, one lines call', async () => {
    const data = await loadRewardsTabData(account, '2026-10-13', { period: 'LAST_MONTH' });
    expect(data.window).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    expect(data.query.period).toBe('LAST_MONTH');
    expect(getReport).toHaveBeenCalledTimes(1);
    expect(getReport).toHaveBeenCalledWith('c1', '2026-09-01', '2026-09-30');
    expect(getRewardLines).toHaveBeenCalledTimes(1);
    expect(getRewardLines).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-09-01', to: '2026-09-30' }));
  });

  it('reads a custom range from the address', async () => {
    const data = await loadRewardsTabData(account, '2026-10-13', { period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' });
    expect(data.window).toMatchObject({ from: '2026-05-01', to: '2026-06-30' });
    expect(getReport).toHaveBeenCalledWith('c1', '2026-05-01', '2026-06-30');
  });

  it('puts the previous anniversary year before the reward year', async () => {
    const data = await loadRewardsTabData(account, '2026-10-13', { period: 'LAST_ANNIVERSARY_YEAR' });
    expect(data.window).toMatchObject({ from: '2025-03-15', to: '2026-03-14' });
  });

  it('falls back to the anniversary computation when the totals failed', async () => {
    GET.mockRejectedValue(new Error('down'));
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(data.window).toEqual({ from: '2026-03-15', to: '2027-03-14', calendarYear: false });
  });
});
