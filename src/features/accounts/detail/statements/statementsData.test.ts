import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { loadStatementsData } from './statementsData';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('@/lib/apiClient', () => ({ billsApi: { list: vi.fn().mockResolvedValue([]) } }));

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
});
