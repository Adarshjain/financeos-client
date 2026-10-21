import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('@/lib/apiClient', () => ({ accountsApi: { list: vi.fn().mockResolvedValue([{ id: 'a1' }]) } }));

import {
  fetchAccounts,
  fetchLoanMatches,
  fetchLoans,
  fetchLoansSummary,
  fetchPeople,
  fetchPeopleMatches,
  fetchPeopleSummary,
} from './loansServerApi';

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { ok: true } });
});

describe('loansServerApi', () => {
  it('lists loans by status with the search, page and size', async () => {
    await expect(fetchLoans({ status: 'active', q: 'sbi', page: 2, size: 10 })).resolves.toEqual({ ok: true });
    expect(get).toHaveBeenCalledWith('/api/v1/loans', { params: { query: { status: 'active', q: 'sbi', page: 2, size: 10 } } });
  });

  it('leaves an empty search out and defaults to the first page of 25', async () => {
    await fetchLoans({ status: 'closed', q: '' });
    expect(get).toHaveBeenCalledWith('/api/v1/loans', { params: { query: { status: 'closed', q: undefined, page: 0, size: 25 } } });
  });

  it('lists people with search, direction, page and size', async () => {
    await fetchPeople({ q: 'pri', direction: 'YOU_OWE', page: 1, size: 50 });
    expect(get).toHaveBeenCalledWith('/api/v1/counterparties', {
      params: { query: { q: 'pri', direction: 'YOU_OWE', page: 1, size: 50 } },
    });
    await fetchPeople({});
    expect(get).toHaveBeenLastCalledWith('/api/v1/counterparties', {
      params: { query: { q: undefined, direction: undefined, page: 0, size: 25 } },
    });
  });

  it('reads the summaries and the match suggestions from their endpoints', async () => {
    await fetchLoansSummary();
    expect(get).toHaveBeenLastCalledWith('/api/v1/loans/summary', undefined);
    await fetchLoanMatches();
    expect(get).toHaveBeenLastCalledWith('/api/v1/loans/match-suggestions', undefined);
    await fetchPeopleSummary();
    expect(get).toHaveBeenLastCalledWith('/api/v1/counterparties/summary', undefined);
    await fetchPeopleMatches();
    expect(get).toHaveBeenLastCalledWith('/api/v1/counterparties/match-suggestions', undefined);
  });

  it('reads the accounts through the accounts API', async () => {
    await expect(fetchAccounts()).resolves.toEqual([{ id: 'a1' }]);
  });

  it('lets a failed request reject', async () => {
    get.mockRejectedValue(new Error('down'));
    await expect(fetchLoansSummary()).rejects.toThrow('down');
  });
});
