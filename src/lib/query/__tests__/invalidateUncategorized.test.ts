import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateUncategorizedQueries } from '../invalidate';
import { keys } from '../keys';

describe('invalidateUncategorizedQueries', () => {
  it('marks the Sort them summary, every groups page, every group page and the recent picks stale', async () => {
    const qc = new QueryClient();
    qc.setQueryData(keys.transactions.uncategorizedSummary(), { count: 3 });
    qc.setQueryData(keys.transactions.uncategorizedGroups(0, 25), {});
    qc.setQueryData(keys.transactions.uncategorizedGroups(2, 25), {});
    qc.setQueryData(keys.transactions.uncategorizedGroup('sharma', 1, 25), {});
    qc.setQueryData(keys.transactions.categoryRecent('OUT'), []);
    qc.setQueryData(keys.tags.list(), []);
    await invalidateUncategorizedQueries(qc);
    const stale = (key: readonly unknown[]) => qc.getQueryState(key)?.isInvalidated;
    expect(stale(keys.transactions.uncategorizedSummary())).toBe(true);
    expect(stale(keys.transactions.uncategorizedGroups(0, 25))).toBe(true);
    expect(stale(keys.transactions.uncategorizedGroups(2, 25))).toBe(true);
    expect(stale(keys.transactions.uncategorizedGroup('sharma', 1, 25))).toBe(true);
    expect(stale(keys.transactions.categoryRecent('OUT'))).toBe(true);
    expect(stale(keys.tags.list())).toBe(false);
  });

  it('every one of those keys sits under the transactions prefix, so a list-wide invalidation covers them too', () => {
    const spy = vi.fn();
    const qc = new QueryClient();
    qc.invalidateQueries = spy as never;
    void invalidateUncategorizedQueries(qc);
    for (const call of spy.mock.calls) expect((call[0] as { queryKey: string[] }).queryKey.slice(0, 1)).toEqual(keys.transactions.all);
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
