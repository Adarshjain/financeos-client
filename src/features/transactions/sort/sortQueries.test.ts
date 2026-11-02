import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

import { prefetchSort } from './sortQueries';

const mocks = vi.hoisted(() => ({ groups: vi.fn(), summary: vi.fn() }));
vi.mock('@/lib/query/actions/uncategorizedActions', () => ({
  loadUncategorizedGroups: mocks.groups,
  loadUncategorizedSummary: mocks.summary,
}));

describe('prefetchSort', () => {
  it('starts the first groups page (10 a page) and the summary together, and fills the cache the dialog reads', async () => {
    mocks.groups.mockResolvedValue({ success: true, data: { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 } });
    mocks.summary.mockResolvedValue({ success: true, data: { count: 3, groupCount: 1 } });
    const client = new QueryClient();
    prefetchSort(client);
    expect(mocks.groups).toHaveBeenCalledWith(0, 10);
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(client.getQueryData(keys.transactions.uncategorizedGroups(0, 10))).toBeDefined());
  });
});
