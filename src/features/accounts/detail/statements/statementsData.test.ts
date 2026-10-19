import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';

import { loadStatementsData } from './statementsData';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('@/lib/apiClient', () => ({ billsApi: { list: vi.fn().mockResolvedValue([]) } }));

const card = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis' } as unknown as Account;
const bank = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'Savings' } as unknown as Account;

describe('loadStatementsData', () => {
  beforeEach(() => get.mockReset());

  it('reports a failed statements request as null, not as an empty list', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'boom' } });
    const data = await loadStatementsData(bank, {}, '2026-10-13');
    expect(data.statements).toBeNull();
    expect(data.view).toBeNull();
  });

  it('keeps a real empty list empty', async () => {
    get.mockResolvedValue({ data: [] });
    const data = await loadStatementsData(bank, {}, '2026-10-13');
    expect(data.statements).toEqual([]);
    expect(data.view?.selectedId).toBeNull();
  });

  it('loads the bills of a card year in one history request over the year bounds and maps them by statement', async () => {
    const stmt = (id: string, periodEnd: string) => ({ id, periodEnd, createdAt: `${periodEnd}T00:00:00Z` });
    get.mockImplementation(async (path: string) => {
      if (path === '/api/v1/accounts/{accountId}/statements') {
        return { data: [stmt('s1', '2026-06-10'), stmt('s2', '2026-05-10'), stmt('old', '2025-12-10')] };
      }
      if (path === '/api/v1/statements/{statementId}') return { data: { id: 's1' } };
      if (path === '/api/v1/bills/history') {
        return { data: [{ statementId: 's1' }, { statementId: 's2' }] as CardBillResponse[] };
      }
      return { data: undefined };
    });
    const data = await loadStatementsData(card, { fy: '26-27' }, '2026-10-13');
    const historyCalls = get.mock.calls.filter(([p]) => p === '/api/v1/bills/history');
    expect(historyCalls).toHaveLength(1);
    expect(historyCalls[0][1]).toEqual({
      params: { query: { accountId: 'c1', from: '2026-04-01', to: '2027-03-31' } },
    });
    expect(get.mock.calls.some(([p]) => p === '/api/v1/bills/{statementId}')).toBe(false);
    expect(Object.keys(data.bills).sort()).toEqual(['s1', 's2']);
  });

  it('leaves bills empty when the history request throws, and skips it for bank accounts', async () => {
    get.mockImplementation(async (path: string) => {
      if (path === '/api/v1/accounts/{accountId}/statements') {
        return { data: [{ id: 's1', periodEnd: '2026-06-10', createdAt: '2026-06-11T00:00:00Z' }] };
      }
      if (path === '/api/v1/bills/history') throw new Error('boom');
      return { data: { id: 's1' } };
    });
    expect((await loadStatementsData(card, { fy: '26-27' }, '2026-10-13')).bills).toEqual({});
    get.mockClear();
    await loadStatementsData(bank, { fy: '26-27' }, '2026-10-13');
    expect(get.mock.calls.some(([p]) => p === '/api/v1/bills/history')).toBe(false);
  });
});
