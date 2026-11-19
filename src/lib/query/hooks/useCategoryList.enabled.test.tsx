import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCategoryList = vi.hoisted(() => vi.fn());
vi.mock('@/lib/query/actions/categoryListActions', () => ({ loadCategoryList }));

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useCategoryList } from './useCategoryList';

const wrap = () => {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

beforeEach(() => {
  loadCategoryList.mockReset();
  loadCategoryList.mockResolvedValue({ success: true, data: CATEGORY_LIST_FIXTURE });
});

describe('useCategoryList enabled', () => {
  it('fetches the list by default', async () => {
    const { result } = renderHook(() => useCategoryList(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.list).toHaveLength(CATEGORY_LIST_FIXTURE.length));
    expect(loadCategoryList).toHaveBeenCalledTimes(1);
  });

  it('holds the fetch back while disabled and returns the empty list', async () => {
    const { result } = renderHook(() => useCategoryList(undefined, { enabled: false }), { wrapper: wrap() });
    await new Promise((r) => setTimeout(r, 20));
    expect(loadCategoryList).not.toHaveBeenCalled();
    expect(result.current.list).toEqual([]);
  });

  it('fetches once it is enabled', async () => {
    const { result, rerender } = renderHook(({ on }) => useCategoryList(undefined, { enabled: on }), { wrapper: wrap(), initialProps: { on: false } });
    expect(loadCategoryList).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.list).toHaveLength(CATEGORY_LIST_FIXTURE.length));
  });
});
