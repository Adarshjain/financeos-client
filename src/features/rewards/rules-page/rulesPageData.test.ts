import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { loadRulesPageData } from './rulesPageData';

const GET = vi.fn();
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: (...a: unknown[]) => GET(...a) } }));
const api = vi.hoisted(() => ({
  accounts: vi.fn(),
  categories: vi.fn(),
  rules: vi.fn(),
  caps: vi.fn(),
  milestones: vi.fn(),
  config: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: () => api.accounts() },
  categoriesApi: { list: () => api.categories() },
  rewardsApi: {
    listRules: (id: string) => api.rules(id),
    listCapBuckets: (id: string) => api.caps(id),
    listMilestones: (id: string) => api.milestones(id),
    getAccountConfig: (id: string) => api.config(id),
    getReport: (id: string, from: string, to: string) => api.report(id, from, to),
  },
}));
let qc: QueryClient;
vi.mock('@/lib/query', async (orig) => ({ ...(await orig<typeof import('@/lib/query')>()), getQueryClient: () => qc }));
vi.mock('@/features/shell/loadHelpers', () => ({
  orNull: (p: Promise<unknown>) => p.catch(() => null),
  signInIfPrefetchFailed: vi.fn(),
}));

const card = (id: string, name: string, extra: Partial<Account> = {}) =>
  ({ id, type: AccountType.CREDIT_CARD, name, balance: 0, creditLimit: 1, ...extra }) as Account;
const emptyReport = { summary: {}, rules: [], milestones: [], cycleFallback: false, anniversaryFallback: false };

beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient();
  api.accounts.mockResolvedValue([card('a', 'HDFC', { anniversaryDate: '2024-03-15' } as Partial<Account>), card('b', 'Amex')]);
  api.categories.mockResolvedValue([{ id: 'k', name: 'Dining' }]);
  api.rules.mockResolvedValue([]);
  api.caps.mockResolvedValue([]);
  api.milestones.mockResolvedValue([]);
  api.config.mockResolvedValue({ accountId: 'a' });
  api.report.mockResolvedValue(emptyReport);
  GET.mockResolvedValue({ data: [] });
});

describe('loadRulesPageData', () => {
  it('shows the first card by default and hydrates what the page reads, so nothing loads twice', async () => {
    const data = await loadRulesPageData(undefined, '2026-10-24');
    expect(data?.accountId).toBe('a');
    for (const key of [
      keys.accounts.list(),
      keys.categories.list(),
      keys.rewards.rules('a'),
      keys.rewards.capBuckets('a'),
      keys.rewards.milestones('a'),
      keys.rewards.config('a'),
    ]) {
      expect(qc.getQueryData(key)).toBeDefined();
    }
    expect(data?.state.queries.length).toBeGreaterThanOrEqual(6);
  });

  it('picks the card the address asks for, and falls back when it is not one of them', async () => {
    expect((await loadRulesPageData('b', '2026-10-24'))?.accountId).toBe('b');
    expect((await loadRulesPageData(['b', 'a'], '2026-10-24'))?.accountId).toBe('b');
    expect((await loadRulesPageData('nope', '2026-10-24'))?.accountId).toBe('a');
    expect(api.rules).toHaveBeenCalledWith('b');
  });

  it('reports over the card’s own reward year from the totals', async () => {
    GET.mockResolvedValue({ data: [{ accountId: 'a', from: '2026-03-15', to: '2027-03-14' }] });
    await loadRulesPageData('a', '2026-10-24');
    expect(api.report).toHaveBeenCalledWith('a', '2026-03-15', '2027-03-14');
  });

  it('falls back to the anniversary year, then the calendar year, when the totals have no row', async () => {
    await loadRulesPageData('a', '2026-10-24');
    expect(api.report).toHaveBeenLastCalledWith('a', '2026-03-15', '2027-03-14');
    await loadRulesPageData('b', '2026-10-24');
    expect(api.report).toHaveBeenLastCalledWith('b', '2026-01-01', '2026-12-31');
  });

  it('has no usage, but still loads the page, when the report fails', async () => {
    api.report.mockRejectedValue(new Error('down'));
    const data = await loadRulesPageData('a', '2026-10-24');
    expect(data?.usage).toBeNull();
    expect(data?.accountId).toBe('a');
  });

  it('builds usage from the report, keyed by the rules listed', async () => {
    api.rules.mockResolvedValue([{ id: 'r1', rewardType: 'POINTS' }]);
    api.report.mockResolvedValue({ ...emptyReport, rules: [{ ruleId: 'r1', name: 'Base', earned: 2180, earnedUnit: 'POINTS' }] });
    const data = await loadRulesPageData('a', '2026-10-24');
    expect(data?.usage?.earned.r1).toEqual({ text: '2,180 pts', zero: false });
  });

  it('is null when the accounts cannot load, and empty when none can earn', async () => {
    api.accounts.mockRejectedValue(new Error('down'));
    expect(await loadRulesPageData(undefined, '2026-10-24')).toBeNull();
    api.accounts.mockResolvedValue([{ id: 'x', type: AccountType.BROKER, name: 'Zerodha', balance: 0 }]);
    const none = await loadRulesPageData(undefined, '2026-10-24');
    expect(none).toMatchObject({ accountId: '', usage: null });
    expect(api.report).not.toHaveBeenCalled();
  });
});
