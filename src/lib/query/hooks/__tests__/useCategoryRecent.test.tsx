import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ recent: vi.fn() }));
vi.mock('@/lib/query/actions/uncategorizedActions', () => ({ loadCategoryRecent: mocks.recent }));

import { useCategoryRecent } from '../useCategoryRecent';

const p = (categoryKey: string, subcategoryKey: string | null = null) => ({ categoryKey, subcategoryKey });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => {
  mocks.recent.mockReset();
  mocks.recent.mockImplementation(async (direction: string) => ({
    success: true,
    data: direction === 'OUT' ? [p('food'), p('gifts')] : [p('salary'), p('gifts')],
  }));
});

describe('useCategoryRecent', () => {
  it('reads one direction on its own', async () => {
    const { result } = renderHook(() => useCategoryRecent('IN'), { wrapper });
    await waitFor(() => expect(result.current).toEqual([p('salary'), p('gifts')]));
    expect(mocks.recent).toHaveBeenCalledTimes(1);
    expect(mocks.recent).toHaveBeenCalledWith('IN');
  });

  it('ANY (the rule form) merges both: alternating, each pick once, at most four', async () => {
    const { result } = renderHook(() => useCategoryRecent('ANY'), { wrapper });
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current).toEqual([p('food'), p('salary'), p('gifts')]);
    expect(mocks.recent).toHaveBeenCalledWith('OUT');
    expect(mocks.recent).toHaveBeenCalledWith('IN');
  });

  it('reads nothing while it is off', () => {
    renderHook(() => useCategoryRecent('ANY', false), { wrapper });
    expect(mocks.recent).not.toHaveBeenCalled();
  });
});
