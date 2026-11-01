import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  show: vi.fn(() => 'toast'),
  dismiss: vi.fn(),
  set: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: mocks.show, dismissToast: mocks.dismiss }));
vi.mock('../transactionActions', () => ({ setTransactionCategory: mocks.set }));

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';
import { keys } from '@/lib/query/keys';

import { useSetCategory } from './useSetCategory';

const response = (categoryKey: string | null) => ({
  success: true,
  data: { previous: { categoryKey, subcategoryKey: null, source: 'AUTO', ruleId: null, setAt: null } },
});


beforeEach(() => {
  vi.clearAllMocks();
  mocks.set.mockResolvedValue(response(null));
});

describe('useSetCategory', () => {
  it('a new set on a row closes that row\'s earlier Undo before it sends, and reuses one toast id per row', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSetCategory(CATEGORY_LIST_FIXTURE), { wrapper });
    await result.current.setCategory({ id: 't1' }, { categoryKey: 'food', subcategoryKey: null });
    await result.current.setCategory({ id: 't1' }, { categoryKey: 'groceries', subcategoryKey: null });
    await result.current.setCategory({ id: 't2' }, { categoryKey: 'food', subcategoryKey: null });
    const dismissed = mocks.dismiss.mock.calls.map((c) => c[0]);
    expect(dismissed).toEqual(['set-category-undo-t1', 'set-category-undo-t1', 'set-category-undo-t2']);
    const shown = (mocks.show.mock.calls as unknown as [string, { id: string }][]).map((c) => c[1].id);
    expect(shown).toEqual(['set-category-undo-t1', 'set-category-undo-t1', 'set-category-undo-t2']);
    // The dismissal comes before the request of the newer set.
    expect(mocks.dismiss.mock.invocationCallOrder[1]).toBeLessThan(mocks.set.mock.invocationCallOrder[1]);
  });

  it('refreshes Sort them after a set', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const qc = new QueryClient();
    qc.setQueryData(keys.transactions.uncategorizedSummary(), { count: 5 });
    qc.setQueryData(keys.transactions.uncategorizedGroups(0, 25), {});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSetCategory(CATEGORY_LIST_FIXTURE), { wrapper });
    await result.current.setCategory({ id: 't1' }, { categoryKey: 'food', subcategoryKey: null });
    expect(qc.getQueryState(keys.transactions.uncategorizedSummary())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(keys.transactions.uncategorizedGroups(0, 25))?.isInvalidated).toBe(true);
  });
});
