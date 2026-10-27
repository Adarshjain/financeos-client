import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: vi.fn() },
  categoriesApi: { list: vi.fn() },
  rewardsApi: {
    listRules: vi.fn().mockResolvedValue([]),
    listCapBuckets: vi.fn().mockResolvedValue([]),
    getAccountConfig: vi.fn().mockResolvedValue({}),
    listMilestones: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/components/rewards/RewardRulesManager', () => ({ default: () => null }));

import { accountsApi, categoriesApi } from '@/lib/apiClient';

import RewardRulesPage from '../page';

const accounts = [
  { id: 'bank', name: 'B', type: 'bank_account', warnings: [] },
  { id: 'card-a', name: 'A', type: 'credit_card', warnings: [] },
  { id: 'card-b', name: 'C', type: 'credit_card', warnings: [] },
  { id: 'broker', name: 'Br', type: 'broker', warnings: [] },
  { id: 'closed', name: 'Cl', type: 'credit_card', closedOn: '2020-01-01', warnings: [] },
];

function findManagerId(el: any): string | undefined {
  const stack = [el];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== 'object') continue;
    if (n.props && 'initialAccountId' in n.props) return n.props.initialAccountId;
    const c = n.props?.children;
    if (Array.isArray(c)) stack.push(...c);
    else if (c) stack.push(c);
  }
}

beforeEach(() => {
  vi.mocked(accountsApi.list).mockResolvedValue(accounts as never);
  vi.mocked(categoriesApi.list).mockResolvedValue([] as never);
});

describe('/rewards/rules ?account= preselect', () => {
  const run = async (account?: string | string[]) =>
    findManagerId(await RewardRulesPage({ searchParams: Promise.resolve({ account }) }));

  it('preselects the requested eligible account', async () => {
    expect(await run('bank')).toBe('bank');
    expect(await run('card-b')).toBe('card-b');
  });
  it('first of repeated params wins', async () => {
    expect(await run(['card-b', 'card-a'])).toBe('card-b');
  });
  it('falls back to the first eligible account (cards first) for missing, unknown, broker or closed ids', async () => {
    expect(await run(undefined)).toBe('card-a');
    expect(await run('nope')).toBe('card-a');
    expect(await run('broker')).toBe('card-a');
    expect(await run('closed')).toBe('card-a');
  });
  it('works without searchParams at all', async () => {
    expect(findManagerId(await RewardRulesPage({}))).toBe('card-a');
  });
  it('empty id when no account is eligible', async () => {
    vi.mocked(accountsApi.list).mockResolvedValue([] as never);
    expect(await run('card-a')).toBe('');
  });
});
