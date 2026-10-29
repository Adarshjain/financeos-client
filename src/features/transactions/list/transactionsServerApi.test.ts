import { beforeEach, describe, expect, it, vi } from 'vitest';

const count = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: vi.fn() },
  categoriesApi: { list: vi.fn() },
  transactionsApi: { count, search },
}));

import { buildSearchBody, NEEDS_REVIEW_BODY } from './transactionsRequest';
import { fetchMatchingCount, fetchNeedsReviewCount } from './transactionsServerApi';
import { parseTransactionsUrl } from './transactionsUrl';

describe('transactionsServerApi counts', () => {
  beforeEach(() => {
    count.mockReset();
    search.mockReset();
  });

  it('counts the needs-review body through /transactions/count, not a one-row search', async () => {
    count.mockResolvedValue(7);
    expect(await fetchNeedsReviewCount()).toBe(7);
    expect(count).toHaveBeenCalledWith(NEEDS_REVIEW_BODY);
    expect(search).not.toHaveBeenCalled();
  });

  it('counts the matching body of a query', async () => {
    const query = parseTransactionsUrl({ q: 'rent', type: 'debit' });
    count.mockResolvedValue(12);
    expect(await fetchMatchingCount(query)).toBe(12);
    expect(count).toHaveBeenCalledWith(buildSearchBody(query));
    expect(search).not.toHaveBeenCalled();
  });

  it('lets a failure through for the caller to handle', async () => {
    count.mockRejectedValue(new Error('down'));
    await expect(fetchNeedsReviewCount()).rejects.toThrow('down');
  });
});
