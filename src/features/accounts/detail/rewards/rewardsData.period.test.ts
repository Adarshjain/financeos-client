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

  it('opens on the reward year the dateless report answers with, in one report call and without the totals', async () => {
    getReport.mockResolvedValue({ summary: {}, rules: [], milestones: [], windowFrom: '2026-03-15', windowTo: '2027-03-14', defaultedWindow: true, calendarYearFallback: false });
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(data.window).toEqual({ from: '2026-03-15', to: '2027-03-14', calendarYear: false });
    expect(getReport).toHaveBeenCalledTimes(1);
    expect(getReport).toHaveBeenCalledWith('c1');
    expect(data.report).toMatchObject({ defaultedWindow: true });
    expect(GET).not.toHaveBeenCalled();
    expect(getRewardLines).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-03-15', to: '2027-03-14' }));
  });

  it('marks a calendar-year window from calendarYearFallback', async () => {
    getReport.mockResolvedValue({ summary: {}, rules: [], milestones: [], windowFrom: '2026-01-01', windowTo: '2026-12-31', defaultedWindow: true, calendarYearFallback: true });
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(data.window).toEqual({ from: '2026-01-01', to: '2026-12-31', calendarYear: true });
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

  it('falls back to the anniversary computation, and asks for the report with it, when the dateless report failed', async () => {
    getReport.mockRejectedValueOnce(new Error('down'));
    const data = await loadRewardsTabData(account, '2026-10-13', undefined);
    expect(data.window).toEqual({ from: '2026-03-15', to: '2027-03-14', calendarYear: false });
    expect(getReport).toHaveBeenLastCalledWith('c1', '2026-03-15', '2027-03-14');
  });

  it('falls back to the anniversary computation when the totals failed for the previous reward year', async () => {
    GET.mockRejectedValue(new Error('down'));
    const data = await loadRewardsTabData(account, '2026-10-13', { period: 'LAST_ANNIVERSARY_YEAR' });
    expect(data.window).toEqual({ from: '2025-03-15', to: '2026-03-14', calendarYear: false });
  });

  it('does not wait for the totals for a period computed from today', async () => {
    GET.mockReturnValue(new Promise(() => undefined));
    const data = await loadRewardsTabData(account, '2026-10-13', { period: 'THIS_MONTH' });
    expect(data.window).toMatchObject({ from: '2026-10-01', to: '2026-10-13', calendarYear: false });
    expect(GET).not.toHaveBeenCalled();
    expect(getReport).toHaveBeenCalledWith('c1', '2026-10-01', '2026-10-13');
  });

  it('still waits for the totals when the previous reward year or an open custom range hangs on them', async () => {
    await loadRewardsTabData(account, '2026-10-13', { period: 'LAST_ANNIVERSARY_YEAR' });
    await loadRewardsTabData(account, '2026-10-13', { period: 'CUSTOM', from: '2026-05-01' });
    expect(GET).toHaveBeenCalledTimes(2);
  });
});
