import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getTrades: vi.fn(), jobsList: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ investmentsApi: { getTrades: api.getTrades }, jobsApi: { list: api.jobsList } }));

import { job } from './tradebook.fixtures';
import { fetchLastImportJob, fetchLastReconcileJob, fetchTradebookPage } from './tradebookServerApi';

beforeEach(() => vi.clearAllMocks());

describe('tradebook fetchers', () => {
  it('passes the query through to the trades endpoint', async () => {
    api.getTrades.mockResolvedValue({ content: [] });
    await fetchTradebookPage({ type: 'buy', fy: 2026, brokerAccountId: 'b1', sort: 'tradeDate,desc', page: 1, size: 25 });
    expect(api.getTrades).toHaveBeenCalledWith({ type: 'buy', fy: 2026, brokerAccountId: 'b1', sort: 'tradeDate,desc', page: 1, size: 25 });
  });

  it('reads the newest import commit job', async () => {
    api.jobsList.mockResolvedValue({ content: [job()] });
    expect((await fetchLastImportJob())?.id).toBe('job-1');
    expect(api.jobsList).toHaveBeenCalledWith({ type: 'INVESTMENT_IMPORT_COMMIT', page: 0, size: 1 });
  });

  it('reads the newest reconcile commit job', async () => {
    api.jobsList.mockResolvedValue({ content: [job({ id: 'job-2' })] });
    expect((await fetchLastReconcileJob())?.id).toBe('job-2');
    expect(api.jobsList).toHaveBeenCalledWith({ type: 'BROKER_RECONCILE_COMMIT', page: 0, size: 1 });
  });

  it('answers null when no job ran', async () => {
    api.jobsList.mockResolvedValue({ content: [] });
    expect(await fetchLastImportJob()).toBeNull();
  });
});
